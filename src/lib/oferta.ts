import { Capacitor } from '@capacitor/core'
import { tieneSuscripcion, asegurarConfigurado } from './suscripcion'

// LA PANTALLA DE OFERTA -orden 2 «Sigo+ en la app», punto 5, 26-10-2026-. Abre el paywall de
// RevenueCat -RevenueCatUI.presentPaywall- con la oferta vigente. Si ya hay suscripción, no hace nada.
// Antes: nunca sola encima de una lectura o grabación — solo al tocar. 27-10-2026 pasada teléfono:
// al llegar al límite de lectura o de grabación se abre sola UNA vez (limiteLectura / limiteGrabacion);
// marca, Ajustes e 'inicial' siguen como antes.
//
// El plugin -@revenuecat/purchases-capacitor-ui- se carga con import() la primera vez, y solo si
// Capacitor.isNativePlatform() y Capacitor.isPluginAvailable('RevenueCatUI'), como Purchases en
// suscripcion.ts. Un fallo se registra con console.warn('[oferta]', ...) y Sigo sigue igual.

export type LugarOferta = 'inicial' | 'limiteLectura' | 'limiteGrabacion' | 'marca' | 'ajustes'

// -pasada teléfono PR 157, 27-10-2026- Al llegar al límite, la oferta se pide SOLA una vez.
// Antes: aviso tocable (limiteLectura / limiteGrabacion) y abrirOferta solo al tocar.
// Devuelve el lugar a abrir, o null si ya se pidió en este alcance del límite.
export function decidirOfertaAlLimite(
  tipo: 'lectura' | 'grabacion',
  yaPedidaEnEsteLimite: boolean
): 'limiteLectura' | 'limiteGrabacion' | null {
  if (yaPedidaEnEsteLimite) return null
  return tipo === 'lectura' ? 'limiteLectura' : 'limiteGrabacion'
}

const CLAVE_INICIAL = 'sigo_oferta_inicial_vista'

export function yaSalioOfertaInicial(): boolean {
  try { return localStorage.getItem(CLAVE_INICIAL) === '1' } catch { return false }
}
export function marcarOfertaInicialVista() {
  try { localStorage.setItem(CLAVE_INICIAL, '1') } catch { /* sin guardado */ }
}
// Para las pruebas.
export function olvidarOfertaInicial() {
  try { localStorage.removeItem(CLAVE_INICIAL) } catch { /* */ }
}

type PluginUI = {
  presentPaywall: (options?: { offering?: unknown }) => Promise<{ result: string }>
  presentCustomerCenter: () => Promise<void>
}

let pluginPromesa: Promise<PluginUI | null> | null = null
function cargarPluginUI(): Promise<PluginUI | null> {
  if (pluginPromesa) return pluginPromesa
  pluginPromesa = (async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('RevenueCatUI')) return null
    const mod = await import('@revenuecat/purchases-capacitor-ui')
    return mod.RevenueCatUI as PluginUI
  })()
  pluginPromesa.catch(() => { pluginPromesa = null })
  return pluginPromesa
}

function avisar(e: unknown) {
  console.warn('[oferta]', e)
}

// Abre la oferta. Devuelve true si se presentó; false si no -con suscripción, sin plugin, o error-.
export async function abrirOferta(lugar: LugarOferta): Promise<boolean> {
  console.info('[oferta]', lugar)
  if (tieneSuscripcion()) return false
  try {
    // Antes: presentPaywall sin esperar Purchases.configure() — en el teléfono:
    // «Purchases is not configured» y {"result":"ERROR"}. 27-10-2026: asegurar primero.
    const listo = await asegurarConfigurado()
    if (!listo) {
      console.warn('[oferta]', 'Purchases no configurado; no se abre la oferta')
      return false
    }
    const ui = await cargarPluginUI()
    if (!ui) return false
    // presentPaywall sin offering: la oferta vigente -current- del panel de RevenueCat.
    await ui.presentPaywall()
    return true
  } catch (e) {
    avisar(e)
    return false
  }
}

// 'inicial': UNA sola vez en la instalación, al terminar la primera lectura o toma, ya de vuelta
// en la pantalla de antes. Nunca al abrir la app. Si ya salió, no hace nada.
export async function abrirOfertaInicialSiCorresponde(): Promise<boolean> {
  if (yaSalioOfertaInicial()) return false
  if (tieneSuscripcion()) {
    marcarOfertaInicialVista()
    return false
  }
  const ok = await abrirOferta('inicial')
  // Antes: marcarOfertaInicialVista() siempre — se perdía si presentPaywall fallaba
  // o la oferta aún no estaba publicada. 26-10-2026, arreglo PR 157: solo si ok.
  if (ok) marcarOfertaInicialVista()
  return ok
}

// El Customer Center -quien paga o está en prueba, Ajustes-.
export async function abrirCentroDeCliente(): Promise<void> {
  try {
    // Antes: presentCustomerCenter sin Purchases.configure(). 27-10-2026: asegurar primero.
    const listo = await asegurarConfigurado()
    if (!listo) {
      console.warn('[oferta]', 'Purchases no configurado; no se abre el centro de cliente')
      return
    }
    const ui = await cargarPluginUI()
    if (!ui) return
    await ui.presentCustomerCenter()
  } catch (e) {
    avisar(e)
  }
}
