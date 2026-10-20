import { Capacitor, registerPlugin } from '@capacitor/core'
import type { Auth, User } from 'firebase/auth'
import { configuracionLista, firebaseConfig, idClienteWeb } from './firebaseConfig'

// LA CUENTA DE SIGO -orden A «Entrar con Google», 20-10-2026-. Solo entrar, salir y borrar la cuenta:
// todavía no se respalda nada -eso es la orden B-.
//
// El token de Google lo trae el plugin nativo CuentaGoogle -Credential Manager, CuentaGooglePlugin.java-
// y la sesión la abre Firebase Authentication aquí, en la web, con firebase/app y firebase/auth. Sin SDK
// nativo de Firebase y sin google-services.json.
//
// Firebase se carga con import() la primera vez que hace falta: mientras configuracionLista() dé false
// la sección Cuenta no se muestra, nadie llama aquí y la app no carga Firebase.

export type EstadoCuenta =
  | { tipo: 'sinSesion' }
  | { tipo: 'entrando' }
  | { tipo: 'conSesion'; correo: string }

// Lo que se muestra en la línea de la sección. Cancelar no es un error: no deja nada.
export type ErrorCuenta = 'sinCuenta' | 'sinRed' | 'otro'
export type ResultadoCuenta = { ok: true } | { cancelado: true } | { error: ErrorCuenta; detalle?: string }

interface RespuestaEntrar {
  idToken?: string
  correo?: string
  nombre?: string
  cancelado?: boolean
  error?: 'sinCuenta' | 'otro'
  detalle?: string
}
interface PluginCuentaGoogle {
  entrar(opciones: { idClienteWeb: string }): Promise<RespuestaEntrar>
  salir(): Promise<unknown>
}

// registerPlugin se llama UNA vez, como en idioma.ts.
let plugin: PluginCuentaGoogle | null | undefined
function pluginCuenta(): PluginCuentaGoogle | null {
  if (plugin !== undefined) return plugin
  try {
    plugin = Capacitor.isPluginAvailable('CuentaGoogle') ? registerPlugin<PluginCuentaGoogle>('CuentaGoogle') : null
  } catch (e) {
    console.warn('[cuenta] no se pudo preguntar por el plugin CuentaGoogle:', e)
    plugin = null
  }
  return plugin
}

// EL ESTADO, para useSyncExternalStore -como suscribirIdioma en idioma.ts-.
let estado: EstadoCuenta = { tipo: 'sinSesion' }
const oyentes = new Set<() => void>()
function fijarEstado(e: EstadoCuenta) {
  estado = e
  oyentes.forEach((f) => f())
}
export function estadoCuenta(): EstadoCuenta {
  return estado
}
export function suscribirCuenta(f: () => void): () => void {
  oyentes.add(f)
  // Al primer oyente se empieza a escuchar a Firebase: así la sesión guardada aparece sola.
  void cargarAuth().catch(() => {})
  return () => {
    oyentes.delete(f)
  }
}

let authPromesa: Promise<Auth> | null = null
function cargarAuth(): Promise<Auth> {
  if (!configuracionLista()) return Promise.reject(new Error('configuración de Firebase pendiente'))
  if (authPromesa) return authPromesa
  authPromesa = (async () => {
    const { initializeApp } = await import('firebase/app')
    const { getAuth, onAuthStateChanged } = await import('firebase/auth')
    const auth = getAuth(initializeApp(firebaseConfig))
    // Firebase avisa al abrir y al cerrar la sesión, y al arrancar con la sesión guardada.
    onAuthStateChanged(auth, (u: User | null) => {
      if (u) fijarEstado({ tipo: 'conSesion', correo: u.email ?? '' })
      else if (estado.tipo !== 'entrando') fijarEstado({ tipo: 'sinSesion' })
    })
    return auth
  })()
  authPromesa.catch(() => {
    authPromesa = null
  })
  return authPromesa
}

// -orden B, respaldo de los guiones, 20-10-2026- El usuario de Firebase y su app, para que
// src/lib/respaldo.ts sepa a qué colección de Firestore -usuarios/{uid}/guiones- escribir. null sin sesión.
export async function sesionActual(): Promise<{ uid: string; app: Auth['app'] } | null> {
  const auth = await cargarAuth()
  return auth.currentUser ? { uid: auth.currentUser.uid, app: auth.app } : null
}

// Firebase marca así la falta de red; el resto de sus errores es «otro».
function errorDeFirebase(e: unknown): ResultadoCuenta {
  const codigo = (e as { code?: string } | null)?.code
  if (codigo === 'auth/network-request-failed') return { error: 'sinRed' }
  return { error: 'otro', detalle: String((e as Error | null)?.message ?? e) }
}

// Pide un token nuevo al plugin. Devuelve el token o el resultado que corta el camino.
async function pedirToken(): Promise<{ idToken: string } | ResultadoCuenta> {
  const p = pluginCuenta()
  if (!p) return { error: 'otro', detalle: 'sin plugin CuentaGoogle' }
  let r: RespuestaEntrar
  try {
    r = await p.entrar({ idClienteWeb })
  } catch (e) {
    return { error: 'otro', detalle: String((e as Error | null)?.message ?? e) }
  }
  if (r.cancelado) return { cancelado: true }
  if (r.error === 'sinCuenta') return { error: 'sinCuenta' }
  if (r.error || !r.idToken) return { error: 'otro', detalle: r.detalle }
  return { idToken: r.idToken }
}

export async function entrar(): Promise<ResultadoCuenta> {
  const antes = estado
  fijarEstado({ tipo: 'entrando' })
  // Si no entra, vuelve a como estaba: cancelar no deja rastro.
  const volver = (r: ResultadoCuenta) => {
    if (estado.tipo === 'entrando') fijarEstado(antes.tipo === 'entrando' ? { tipo: 'sinSesion' } : antes)
    return r
  }
  try {
    const auth = await cargarAuth()
    const token = await pedirToken()
    if (!('idToken' in token)) return volver(token)
    const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth')
    const r = await signInWithCredential(auth, GoogleAuthProvider.credential(token.idToken))
    fijarEstado({ tipo: 'conSesion', correo: r.user.email ?? '' })
    return { ok: true }
  } catch (e) {
    return volver(errorDeFirebase(e))
  }
}

// Cierra la sesión de Firebase y la de Credential Manager. No pregunta y no toca nada del teléfono.
export async function salir(): Promise<ResultadoCuenta> {
  try {
    const auth = await cargarAuth()
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
    // El plugin nunca rechaza; si falla, la sesión de Firebase ya está cerrada igual.
    await pluginCuenta()?.salir().catch(() => {})
    fijarEstado({ tipo: 'sinSesion' })
    return { ok: true }
  } catch (e) {
    return errorDeFirebase(e)
  }
}

// LOS PASOS ANTES DE BORRAR. En esta orden no hay ninguno; la orden B registra el borrado de los guiones
// en la nube. Se corren en el orden en que se registraron. Devuelve con qué quitarlo.
type PasoAntesDeBorrar = () => Promise<void> | void
const pasosAntesDeBorrar: PasoAntesDeBorrar[] = []
export function registrarAntesDeBorrar(fn: PasoAntesDeBorrar): () => void {
  pasosAntesDeBorrar.push(fn)
  return () => {
    const i = pasosAntesDeBorrar.indexOf(fn)
    if (i >= 0) pasosAntesDeBorrar.splice(i, 1)
  }
}

// BORRAR LA CUENTA. Firebase exige una entrada reciente para borrar: primero un token nuevo y
// reauthenticateWithCredential. Después los pasos registrados, después user.delete() y por último
// salir(). Si un paso falla, el usuario NO se borra y se devuelve el error. Nunca se borra nada del
// teléfono: los guiones de aquí se quedan.
export async function borrarCuenta(): Promise<ResultadoCuenta> {
  try {
    const auth = await cargarAuth()
    const usuario = auth.currentUser
    if (!usuario) return { error: 'otro', detalle: 'sin sesión' }
    const token = await pedirToken()
    if (!('idToken' in token)) return token
    const { GoogleAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
    await reauthenticateWithCredential(usuario, GoogleAuthProvider.credential(token.idToken))
    for (const paso of [...pasosAntesDeBorrar]) await paso()
    await usuario.delete()
    await salir()
    return { ok: true }
  } catch (e) {
    return errorDeFirebase(e)
  }
}
