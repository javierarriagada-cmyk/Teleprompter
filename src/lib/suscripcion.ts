import { Capacitor } from '@capacitor/core'
import type { CustomerInfo, PurchasesPlugin } from '@revenuecat/purchases-capacitor'
import { CLAVE_REVENUECAT_PLAY, ID_DERECHO } from './revenuecatConfig'
import { estadoCuenta, sesionActual, suscribirCuenta, type EstadoCuenta } from './cuenta'
import { idiomaApp, suscribirIdioma, type IdiomaApp } from './idioma'

// LA SUSCRIPCIÓN DE SIGO -orden 1 «Los cimientos del cobro», 26-10-2026-. El único lugar del código que
// dice si la persona tiene la suscripción. Todavía no hay pantallas, avisos, topes ni botones: en esta
// orden nadie lee el estado.
//
// RevenueCat va encima de Google Play Billing. El plugin -@revenuecat/purchases-capacitor- se carga con
// import() la primera vez que hace falta, como firebase en cuenta.ts, y solo en el teléfono: sin plataforma
// nativa o sin el plugin «Purchases» no se hace nada y la persona queda sin suscripción.
//
// Un fallo de RevenueCat nunca rompe ni bloquea Sigo: todo error se registra con console.warn y el estado
// queda como estaba.

export type EstadoSuscripcion =
  | { tipo: 'sinDatos' }
  | { tipo: 'sinSuscripcion' }
  // -orden 2, punto 8- periodo: periodType del derecho -TRIAL, NORMAL…-; pedidoEn: requestDate
  // de customerInfo, para el aviso sin conexión. Antes: { tipo: 'conSuscripcion'; vence: string | null }
  | { tipo: 'conSuscripcion'; vence: string | null; periodo: string | null; pedidoEn: string | null }

// EL ESTADO, para useSyncExternalStore -como estadoCuenta y suscribirCuenta en cuenta.ts-.
// 'sinDatos' mientras RevenueCat no responde.
let estado: EstadoSuscripcion = { tipo: 'sinDatos' }
const oyentes = new Set<() => void>()
function fijarEstado(e: EstadoSuscripcion) {
  estado = e
  oyentes.forEach((f) => f())
}
export function estadoSuscripcion(): EstadoSuscripcion {
  return estado
}
export function suscribirSuscripcion(f: () => void): () => void {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}
// true solo con 'conSuscripcion': 'sinDatos' cuenta como sin suscripción.
export function tieneSuscripcion(): boolean {
  return estado.tipo === 'conSuscripcion'
}

// -arreglo PR 157, 26-10-2026- ¿La fila «Sigo+ activo» va dentro de TarjetaCuenta?
// Antes: TarjetaCuenta llamaba tieneSuscripcion() sin suscribirse y no se redibujaba al comprar.
export function mostrarFilaSigoActivoEnCuenta(
  tipoCuenta: EstadoCuenta['tipo'],
  tipoSub: EstadoSuscripcion['tipo']
): boolean {
  return tipoCuenta === 'conSesion' && tipoSub === 'conSuscripcion'
}

/** Solo pruebas: fija el estado y avisa a los oyentes -useSyncExternalStore-. */
export function fijarSuscripcionParaPruebas(e: EstadoSuscripcion) {
  fijarEstado(e)
}

// Cada respuesta de RevenueCat trae customerInfo: con ID_DERECHO entre los derechos activos hay
// suscripción, y vence es su expirationDate -null si no tiene-.
function leerRespuesta(info: CustomerInfo | undefined) {
  if (!info) return
  const derecho = info.entitlements?.active?.[ID_DERECHO]
  // -orden 2, punto 8- Guarda periodType y requestDate. Antes: fijarEstado(derecho ? { tipo: 'conSuscripcion', vence: derecho.expirationDate ?? null } : { tipo: 'sinSuscripcion' })
  fijarEstado(derecho
    ? {
        tipo: 'conSuscripcion',
        vence: derecho.expirationDate ?? null,
        periodo: derecho.periodType ?? null,
        pedidoEn: info.requestDate ?? null
      }
    : { tipo: 'sinSuscripcion' })
  // También sin derecho: el requestDate sirve para saber cuándo fue la última respuesta.
  if (!derecho && info.requestDate) ultimoPedidoEn = info.requestDate
  else if (derecho) ultimoPedidoEn = info.requestDate ?? null
}

// Último requestDate visto, con o sin derecho. Para el aviso sin conexión cuando hay Sigo+.
let ultimoPedidoEn: string | null = null
export function fechaUltimoPedido(): string | null {
  const e = estado
  if (e.tipo === 'conSuscripcion') return e.pedidoEn
  return ultimoPedidoEn
}

function avisar(e: unknown) {
  console.warn('[suscripcion]', e)
}

// El plugin, solo en el teléfono y con «Purchases» registrado por cap sync. null si no corre.
let pluginPromesa: Promise<{ plugin: PurchasesPlugin } | null> | null = null
function cargarPlugin(): Promise<{ plugin: PurchasesPlugin } | null> {
  if (pluginPromesa) return pluginPromesa
  pluginPromesa = (async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Purchases')) return null
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    // El proxy nativo expone «then»; envolverlo evita que async lo asimile como promesa.
    // Antes: return Purchases
    return { plugin: Purchases }
  })()
  pluginPromesa.catch(() => {
    pluginPromesa = null
  })
  return pluginPromesa
}

// Se configura UNA sola vez, sin appUserID: el SDK reusa el último ID que guardó.
let configurado: Promise<void> | null = null
function configurar(p: PurchasesPlugin): Promise<void> {
  if (!configurado) {
    configurado = p.configure({ apiKey: CLAVE_REVENUECAT_PLAY }).then(() => {
      console.info('[suscripcion] configurado')
    })
    configurado.catch((e) => {
      console.warn('[suscripcion]', e)
      configurado = null
    })
  }
  return configurado
}

// -pasada teléfono PR 157, 27-10-2026- La UI (paywall / Customer Center) exige Purchases.configure()
// antes; si no, presentPaywall falla con «Purchases is not configured». Misma configurar() que
// vigilarSuscripcion — sin duplicar. Devuelve si quedó listo.
export async function asegurarConfigurado(): Promise<boolean> {
  try {
    // Se extrae tras await: cargarPlugin devuelve una caja para no asimilar el proxy.
    // Antes: const p = await cargarPlugin()
    const cargado = await cargarPlugin()
    const p = cargado?.plugin ?? null
    if (!p) return false
    await configurar(p)
    return true
  } catch (e) {
    // configurar ya registró el warn; por si cargarPlugin falló sin pasar por ahí.
    console.warn('[suscripcion]', e)
    return false
  }
}


// -idioma RevenueCat UI, 2026-10-29- El idioma de la APP (idioma.ts), no el del guion.
// Purchases.overridePreferredUILocale: es→'es', en→'en', pt→'pt-BR'.
export function localeUiDeIdiomaApp(idioma: IdiomaApp): string {
  if (idioma === 'es') return 'es'
  if (idioma === 'pt') return 'pt-BR'
  return 'en'
}

// Aplica el locale a la UI de RevenueCat (paywall / Customer Center). Hay que haber
// configurado Purchases antes; si no, el SDK rechaza. Fallos: console.warn, Sigo sigue.
export async function sincronizarLocaleUiPurchases(idioma: IdiomaApp = idiomaApp()): Promise<void> {
  try {
    const cargado = await cargarPlugin()
    const p = cargado?.plugin ?? null
    if (!p) return
    await configurar(p)
    await p.overridePreferredUILocale({ locale: localeUiDeIdiomaApp(idioma) })
  } catch (e) {
    console.warn('[suscripcion]', 'overridePreferredUILocale:', e)
  }
}

// Cada cambio del idioma de la app vuelve a sincronizar. Devuelve con qué dejar de escuchar.
export function vigilarLocaleUiPurchases(): () => void {
  return suscribirIdioma(() => {
    void sincronizarLocaleUiPurchases()
  })
}

// EL CICLO, como vigilarRespaldo: pide customerInfo al arrancar, escucha los cambios y sigue a la cuenta
// de Google -con sesión, el uid de Firebase es el ID en RevenueCat; nunca el correo-. Devuelve con qué
// dejar de vigilar.
export function vigilarSuscripcion(): () => void {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Purchases')) return () => {}
  let vivo = true
  let idOyente: string | null = null
  // Una cosa a la vez: configurar, después cada cambio de cuenta en el orden en que llegó.
  let ocupado: Promise<{ plugin: PurchasesPlugin } | null> = (async () => {
    // La caja mantiene el proxy fuera de la resolución de la promesa async.
    // Antes: const p = await cargarPlugin()
    const cargado = await cargarPlugin()
    const p = cargado?.plugin ?? null
    if (!p) return null
    await configurar(p)
    // La promesa de la cola también debe conservar la caja, no resolver con el proxy.
    // Antes: return p
    return cargado
  })()

  function enCola(paso: (p: PurchasesPlugin) => Promise<void>) {
    ocupado = ocupado.then(async (cargado) => {
      const p = cargado?.plugin ?? null
      if (p && vivo) await paso(p).catch(avisar)
      // La cola retiene la caja: resolver con p volvería a asimilar el thenable.
      // Antes: return p
      return cargado
    }, (e) => {
      avisar(e)
      return null
    })
  }

  enCola(async (p) => {
    leerRespuesta((await p.getCustomerInfo()).customerInfo)
  })
  enCola(async (p) => {
    const id = await p.addCustomerInfoUpdateListener((info) => leerRespuesta(info))
    if (vivo) idOyente = id
    else await p.removeCustomerInfoUpdateListener({ listenerToRemove: id })
  })

  // LA IDENTIDAD SIGUE A LA CUENTA DE GOOGLE. Solo cuando estadoCuenta() PASA a otro tipo: el 'sinSesion'
  // con que arranca cuenta.ts no es una salida, todavía no responde Firebase.
  let anterior: EstadoCuenta['tipo'] | null = null
  function revisar() {
    const tipo = estadoCuenta().tipo
    if (tipo === anterior) return
    const primera = anterior === null
    anterior = tipo
    if (tipo === 'conSesion') {
      enCola(async (p) => {
        const sesion = await sesionActual()
        if (!sesion) return
        leerRespuesta((await p.logIn({ appUserID: sesion.uid })).customerInfo)
      })
    } else if (tipo === 'sinSesion' && !primera) {
      enCola(async (p) => {
        // logOut con un usuario anónimo es un error de RevenueCat: se pregunta antes.
        if ((await p.isAnonymous()).isAnonymous) return
        leerRespuesta((await p.logOut()).customerInfo)
      })
    }
  }
  const quitarCuenta = suscribirCuenta(revisar)
  revisar()

  return () => {
    vivo = false
    quitarCuenta()
    void ocupado.then(async (cargado) => {
      const p = cargado?.plugin ?? null
      if (p && idOyente !== null) {
        const id = idOyente
        idOyente = null
        await p.removeCustomerInfoUpdateListener({ listenerToRemove: id }).catch(avisar)
      }
    })
  }
}


// -orden 2, punto 8- ¿La prueba termina en 2 días o menos? periodType TRIAL -los tipos lo dan en
// mayúsculas- y expirationDate.
export function pruebaPorTerminar(ahoraMs: number = Date.now()): { vence: string } | null {
  const e = estado
  if (e.tipo !== 'conSuscripcion') return null
  if (!e.vence) return null
  const periodo = (e.periodo || '').toUpperCase()
  if (periodo !== 'TRIAL') return null
  const venceMs = Date.parse(e.vence)
  if (!Number.isFinite(venceMs)) return null
  const quedan = venceMs - ahoraMs
  if (quedan < 0 || quedan > 2 * 24 * 60 * 60 * 1000) return null
  return { vence: e.vence }
}

// -orden 2, punto 8- Sigo+ activo y la última respuesta tiene más de 3 días.
export function suscripcionSinVerificar(ahoraMs: number = Date.now()): boolean {
  if (!tieneSuscripcion()) return false
  const pedido = fechaUltimoPedido()
  if (!pedido) return false
  const ms = Date.parse(pedido)
  if (!Number.isFinite(ms)) return false
  return ahoraMs - ms > 3 * 24 * 60 * 60 * 1000
}

// Restaurar compras -Ajustes-. Devuelve si quedó con suscripción.
export async function restaurarCompras(): Promise<boolean> {
  try {
    // Se extrae tras await: cargarPlugin devuelve una caja para no asimilar el proxy.
    // Antes: const p = await cargarPlugin()
    const cargado = await cargarPlugin()
    const p = cargado?.plugin ?? null
    if (!p) return tieneSuscripcion()
    await configurar(p)
    leerRespuesta((await p.restorePurchases()).customerInfo)
    return tieneSuscripcion()
  } catch (e) {
    avisar(e)
    return tieneSuscripcion()
  }
}

// ¿La oferta vigente trae fase gratis? -Android: freePhase del defaultOption del producto actual-.
// null si no se pudo preguntar.
export async function ofertaTraePruebaGratis(): Promise<boolean | null> {
  try {
    // Se extrae tras await: cargarPlugin devuelve una caja para no asimilar el proxy.
    // Antes: const p = await cargarPlugin()
    const cargado = await cargarPlugin()
    const p = cargado?.plugin ?? null
    if (!p) return null
    await configurar(p)
    const offs = await p.getOfferings()
    const actual = offs.current
    if (!actual) return false
    for (const pkg of actual.availablePackages || []) {
      const opt = pkg.product?.defaultOption
      if (opt?.freePhase) return true
    }
    return false
  } catch (e) {
    avisar(e)
    return null
  }
}
