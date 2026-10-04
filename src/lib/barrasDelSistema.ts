// LAS BARRAS DE ANDROID, ENTRE LA APP Y EL VISOR DE LADO -tarea 90, 04-10-2026-.
//
// Hasta la 89 solo App.tsx tocaba las barras: el estilo según el tema -App.tsx, «LAS BARRAS DE ANDROID
// SIGUEN A SIGO»-. El visor de lado también las toca: al abrirse esconde la barra de estado -como
// cualquier reproductor de video de lado- y pone el estilo oscuro, porque el visor de lado es siempre
// oscuro y con la app en claro los íconos de la barra de tres botones saldrían oscuros sobre él. Al
// cerrarse, al volver de pie o al desmontarse, la muestra otra vez y devuelve el estilo de la app.
//
// Este módulo es el único que llama a SystemBars, para que las dos cosas no se pisen: mientras el visor
// de lado tiene las barras, el estilo que pide App se guarda y se aplica al soltarlas.
//
// La API es la de @capacitor/core 8 que Sigo ya usa -SystemBars, core-plugins.d.ts: setStyle :342,
// show :348, hide :354, bar?: SystemBarType :304-312-. En Android hide({ bar: StatusBar }) hace
// WindowInsetsControllerCompat.hide(statusBars()) -SystemBars.java:302-324-. Sin plugin nuevo. Se
// muestra con bar StatusBar y no con show() a secas, que mostraría también la de navegación: el visor
// solo deshace lo que hizo.
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core'
import { anotarVisorLado } from './registroVisorLado'

let estiloDeLaApp: SystemBarsStyle | null = null
let visorLasTiene = false
let msDelHide = 0

function nativo(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch (e) {
    return false
  }
}

function aplicarEstilo(estilo: SystemBarsStyle) {
  SystemBars.setStyle({ style: estilo }).catch(() => {
    // sin el plugin -WebView muy viejo- quedan las barras del teléfono, como antes
  })
}

// App pide su estilo -oscuro con el tema oscuro o en la lectura-. Si el visor de lado tiene las barras,
// se guarda y espera.
export function fijarEstiloDeLaApp(oscuro: boolean) {
  estiloDeLaApp = oscuro ? SystemBarsStyle.Dark : SystemBarsStyle.Light
  if (!nativo() || visorLasTiene) return
  aplicarEstilo(estiloDeLaApp)
}

export function visorDeLadoTieneLasBarras(): boolean {
  return visorLasTiene
}

export function msDesdeQueSeOculto(): number | null {
  return visorLasTiene ? Math.round(performance.now() - msDelHide) : null
}

export function tomarBarrasParaElVisor() {
  if (visorLasTiene) return
  visorLasTiene = true
  msDelHide = performance.now()
  anotarVisorLado('barras', { accion: 'hide', bar: 'StatusBar', estilo: 'Dark', nativo: nativo() })
  if (!nativo()) return
  SystemBars.hide({ bar: SystemBarType.StatusBar }).catch(() => {})
  aplicarEstilo(SystemBarsStyle.Dark)
}

export function soltarBarrasDelVisor() {
  if (!visorLasTiene) return
  visorLasTiene = false
  const estilo = estiloDeLaApp ?? SystemBarsStyle.Dark
  anotarVisorLado('barras', { accion: 'show', bar: 'StatusBar', estilo: estilo === SystemBarsStyle.Dark ? 'Dark' : 'Light', nativo: nativo() })
  if (!nativo()) return
  SystemBars.show({ bar: SystemBarType.StatusBar }).catch(() => {})
  aplicarEstilo(estilo)
}
