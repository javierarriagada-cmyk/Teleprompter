import type { FirebaseApp } from 'firebase/app'
import type { Firestore } from 'firebase/firestore'
import { RepositorioGuiones, RepositorioLocal } from '../datos/RepositorioGuiones'
import { DocumentoGuion, EstadoRespaldo, NubeGuiones, RepositorioSincronizado } from '../datos/RepositorioSincronizado'
import { estadoCuenta, registrarAntesDeBorrar, sesionActual, suscribirCuenta } from './cuenta'

// EL RESPALDO DE LOS GUIONES EN FIRESTORE -orden B, 20-10-2026-. firebase/firestore con caché local
// persistente -initializeFirestore con persistentLocalCache-: guarda sin conexión y sube al volver.
// Ruta: usuarios/{uid}/guiones/{id del guion}. Las reglas, en firestore.rules: cada usuario lee y escribe
// solo lo suyo. Firestore se carga con import() solo cuando hay sesión.

const COLECCION = (uid: string) => `usuarios/${uid}/guiones`
// Firestore permite como máximo 500 escrituras por lote.
export const LOTE = 500

// LA NUBE DE VERDAD: Firestore detrás de NubeGuiones -src/datos/RepositorioSincronizado.ts-.
export async function nubeFirestore(app: FirebaseApp, uid: string): Promise<NubeGuiones & { db: Firestore }> {
  const fs = await import('firebase/firestore')
  const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() })
  const col = fs.collection(db, COLECCION(uid))
  return {
    db,
    subir: (doc: DocumentoGuion) => fs.setDoc(fs.doc(col, doc.id), doc),
    escuchar(alCambiar) {
      let primera = true
      return fs.onSnapshot(col, (foto) => {
        // La primera vez se espera la respuesta del servidor: con la caché todavía vacía -aparato nuevo-
        // parecería que la nube no tiene nada, y se subirían guiones viejos encima de los nuevos. Sin red al
        // entrar, el respaldo espera a que vuelva.
        if (primera && foto.metadata.fromCache) return
        const docs = primera
          ? foto.docs.map((d) => d.data() as DocumentoGuion)
          // Después, solo lo que cambió. Un documento que desaparece -«removed»- es el borrado de toda la
          // cuenta: no se toca el teléfono.
          : foto.docChanges().filter((c) => c.type !== 'removed').map((c) => c.doc.data() as DocumentoGuion)
        alCambiar(docs, primera)
        primera = false
      })
    }
  }
}

// BORRAR LA CUENTA: TODOS los documentos de usuarios/{uid}/guiones, en lotes de hasta 500. Se registra con
// registrarAntesDeBorrar -src/lib/cuenta.ts-: corre antes de que se borre el usuario, y si falla, el
// usuario no se borra.
export async function borrarGuionesDeLaNube(db: Firestore, uid: string): Promise<void> {
  const fs = await import('firebase/firestore')
  const todos = await fs.getDocs(fs.collection(db, COLECCION(uid)))
  for (let i = 0; i < todos.docs.length; i += LOTE) {
    const lote = fs.writeBatch(db)
    for (const d of todos.docs.slice(i, i + LOTE)) lote.delete(d.ref)
    await lote.commit()
  }
}

// EL ESTADO PARA LA SECCIÓN CUENTA, como suscribirCuenta.
export type FaseRespaldo = 'completa' | 'subiendo' | 'esperando'
export interface VistaRespaldo { fase: FaseRespaldo; demasiadoLargo: boolean }
let vista: VistaRespaldo = { fase: 'completa', demasiadoLargo: false }
const oyentes = new Set<() => void>()
function enLinea(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}
let ultimoEstado: EstadoRespaldo = { pendientes: 0, demasiadoLargos: [] }
function recalcular() {
  const fase: FaseRespaldo = ultimoEstado.pendientes === 0 ? 'completa' : enLinea() ? 'subiendo' : 'esperando'
  const nueva = { fase, demasiadoLargo: ultimoEstado.demasiadoLargos.length > 0 }
  if (nueva.fase === vista.fase && nueva.demasiadoLargo === vista.demasiadoLargo) return
  vista = nueva
  oyentes.forEach((f) => f())
}
export function estadoRespaldo(): VistaRespaldo {
  return vista
}
export function suscribirRespaldo(f: () => void): () => void {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}

// EL CICLO: con sesión, App usa el repositorio sincronizado; sin sesión, el del teléfono.
//   leer / fijar: el repositorio que usa App -repoRef.current-.
//   alCambiarLocal: algo bajó de la nube; App vuelve a leer la biblioteca.
// Devuelve con qué dejar de vigilar.
export function vigilarRespaldo(
  leer: () => RepositorioGuiones,
  fijar: (r: RepositorioGuiones) => void,
  alCambiarLocal: () => void
): () => void {
  let activo: { sync: RepositorioSincronizado; db: Firestore; uid: string } | null = null
  let ocupado: Promise<void> = Promise.resolve()

  async function encender() {
    if (activo) return
    const sesion = await sesionActual().catch(() => null)
    const actual = leer()
    if (!sesion || activo) return
    // Solo los repositorios del teléfono saben guardarTal: IndexedDB y Memoria.
    const local = actual as RepositorioLocal
    if (typeof local.guardarTal !== 'function') return
    const nube = await nubeFirestore(sesion.app, sesion.uid)
    const sync = new RepositorioSincronizado(local, nube, alCambiarLocal, (e) => {
      ultimoEstado = e
      recalcular()
    })
    activo = { sync, db: nube.db, uid: sesion.uid }
    fijar(sync)
    sync.iniciar()
  }

  // CERRAR SESIÓN: se deja de escuchar, se termina Firestore y se borra su caché local -terminate y
  // clearIndexedDbPersistence-, para que el próximo que entre en este teléfono no vea nada de esta cuenta.
  // Los guiones del teléfono quedan.
  async function apagar() {
    if (!activo) return
    const { sync, db } = activo
    activo = null
    sync.detener()
    fijar(sync.local)
    ultimoEstado = { pendientes: 0, demasiadoLargos: [] }
    recalcular()
    const fs = await import('firebase/firestore')
    await fs.terminate(db)
    await fs.clearIndexedDbPersistence(db).catch((e) => console.warn('[respaldo] no se pudo borrar la caché:', e))
  }

  function revisar() {
    const conSesion = estadoCuenta().tipo === 'conSesion'
    ocupado = ocupado.then(() => (conSesion ? encender() : estadoCuenta().tipo === 'sinSesion' ? apagar() : undefined))
      .catch((e) => console.warn('[respaldo]', e))
  }

  const quitarPaso = registrarAntesDeBorrar(async () => {
    if (activo) await borrarGuionesDeLaNube(activo.db, activo.uid)
    else {
      // Sin respaldo encendido -no debería pasar con sesión-, se borra igual con una instancia nueva.
      const sesion = await sesionActual()
      if (!sesion) return
      const fs = await import('firebase/firestore')
      await borrarGuionesDeLaNube(fs.getFirestore(sesion.app), sesion.uid)
    }
  })
  const red = () => recalcular()
  if (typeof window !== 'undefined') {
    window.addEventListener('online', red)
    window.addEventListener('offline', red)
  }
  const quitarCuenta = suscribirCuenta(revisar)
  revisar()
  return () => {
    quitarCuenta()
    quitarPaso()
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', red)
      window.removeEventListener('offline', red)
    }
    void apagar()
  }
}
