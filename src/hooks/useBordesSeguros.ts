import { useEffect, useRef, useState } from 'react'
import { Bordes } from '../lib/visorDeLado'

// LOS BORDES SEGUROS, EN NÚMEROS -tarea 90, 04-10-2026-.
//
// El visor de lado se arma en dp exactos -lib/visorDeLado.ts- y necesita saber cuánto mide cada borde:
// el recorte de la cámara -44 en el moto g86- y la barra de tres botones -48-, cada uno del lado que le
// toca según el giro, y arriba 0 con la barra de estado oculta. CSS los da como env(safe-area-inset-*),
// que no se puede leer directo desde JavaScript: se mide un elemento invisible con esos padding.
//
// Capacitor 8 además escribe --safe-area-inset-* en el documento -SystemBars.java, injectSafeAreaCSS-.
// Manda env(): es lo que usa el resto de Sigo. Las variables se usan solo si el navegador no entiende
// env() -el padding medido sale vacío-, y las dos se anotan en el registro para compararlas -(d)-.
//
// Se vuelve a medir al girar, al cambiar el tamaño, cuando Capacitor reescribe sus variables y, mientras
// el visor de lado está abierto, cada medio segundo: deslizar desde arriba con la barra de estado oculta
// la muestra un rato sin cambiar el tamaño de la ventana, y eso solo se ve en los bordes -(a)-.

export interface LecturaBordes {
  env: Bordes
  capacitor: Bordes
  usados: Bordes
  fuente: 'env' | 'capacitor'
  ancho: number
  alto: number
  visual: string
  dpr: number
  giro: number | null
  tipo: string
}

const CERO: Bordes = { arriba: 0, derecha: 0, abajo: 0, izquierda: 0 }
const LADOS: Array<[keyof Bordes, string]> = [['arriba', 'top'], ['derecha', 'right'], ['abajo', 'bottom'], ['izquierda', 'left']]

let sonda: HTMLDivElement | null = null
function sondaEnv(): HTMLDivElement | null {
  if (typeof document === 'undefined' || !document.body) return null
  if (sonda && sonda.isConnected) return sonda
  sonda = document.createElement('div')
  sonda.setAttribute('aria-hidden', 'true')
  sonda.setAttribute('data-sonda', 'bordes-seguros')
  sonda.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none'
  for (const [, css] of LADOS) sonda.style.setProperty(`padding-${css}`, `env(safe-area-inset-${css}, 0px)`)
  document.body.appendChild(sonda)
  return sonda
}

function px(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export function leerBordesSeguros(): LecturaBordes {
  const env: Bordes = { ...CERO }
  const capacitor: Bordes = { ...CERO }
  let envLeido = false
  const s = sondaEnv()
  if (s && typeof getComputedStyle === 'function') {
    const cs = getComputedStyle(s)
    for (const [k, css] of LADOS) {
      const n = px(cs.getPropertyValue(`padding-${css}`))
      if (n !== null) {
        env[k] = Math.round(n)
        envLeido = true
      }
    }
  }
  if (typeof document !== 'undefined') {
    const raiz = document.documentElement
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(raiz) : null
    for (const [k, css] of LADOS) {
      const n = px(raiz.style.getPropertyValue(`--safe-area-inset-${css}`)) ?? px(cs?.getPropertyValue(`--safe-area-inset-${css}`))
      if (n !== null) capacitor[k] = Math.round(n)
    }
  }
  // Si el navegador no entiende env() -la sonda queda sin padding- se usan las de Capacitor. Si env()
  // da todo 0 y Capacitor no, también: la WebView vieja -antes de la 140, SystemBars.java- no pasa los
  // bordes a env() y Capacitor los escribe en sus variables.
  const envEnCero = env.arriba + env.derecha + env.abajo + env.izquierda === 0
  const capEnCero = capacitor.arriba + capacitor.derecha + capacitor.abajo + capacitor.izquierda === 0
  const fuente: 'env' | 'capacitor' = !envLeido || (envEnCero && !capEnCero) ? 'capacitor' : 'env'
  const or: any = typeof screen !== 'undefined' ? (screen as any).orientation : null
  const vv: any = typeof window !== 'undefined' ? (window as any).visualViewport : null
  return {
    env,
    capacitor,
    usados: fuente === 'env' ? env : capacitor,
    fuente,
    ancho: typeof window !== 'undefined' ? window.innerWidth : 0,
    alto: typeof window !== 'undefined' ? window.innerHeight : 0,
    visual: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}` : '-',
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    giro: or && typeof or.angle === 'number' ? or.angle : typeof window !== 'undefined' && typeof (window as any).orientation === 'number' ? (window as any).orientation : null,
    tipo: or && or.type ? String(or.type) : '-'
  }
}

export function claveDeBordes(l: LecturaBordes): string {
  const b = (x: Bordes) => `${x.izquierda},${x.derecha},${x.arriba},${x.abajo}`
  return `${b(l.env)}|${b(l.capacitor)}|${l.ancho}x${l.alto}|${l.giro}|${l.tipo}`
}

export default function useBordesSeguros(activo: boolean, alCambiar?: (l: LecturaBordes, motivo: string) => void): LecturaBordes {
  const [lectura, setLectura] = useState<LecturaBordes>(() => leerBordesSeguros())
  const clave = useRef(claveDeBordes(lectura))
  const aviso = useRef(alCambiar)
  aviso.current = alCambiar

  useEffect(() => {
    if (!activo) return
    const medir = (motivo: string) => {
      const l = leerBordesSeguros()
      const k = claveDeBordes(l)
      if (k === clave.current && motivo === 'sondeo') return
      const cambio = k !== clave.current
      clave.current = k
      if (cambio) setLectura(l)
      aviso.current?.(l, motivo)
    }
    medir('apertura')
    const alResize = () => medir('resize')
    const alGirar = () => medir('orientacion')
    window.addEventListener('resize', alResize)
    window.addEventListener('orientationchange', alGirar)
    const or: any = typeof screen !== 'undefined' ? (screen as any).orientation : null
    or?.addEventListener?.('change', alGirar)
    const vv: any = (window as any).visualViewport
    vv?.addEventListener?.('resize', alResize)
    let obs: MutationObserver | null = null
    if (typeof MutationObserver !== 'undefined') {
      obs = new MutationObserver(() => medir('capacitor'))
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    }
    const id = setInterval(() => medir('sondeo'), 500)
    return () => {
      clearInterval(id)
      obs?.disconnect()
      window.removeEventListener('resize', alResize)
      window.removeEventListener('orientationchange', alGirar)
      or?.removeEventListener?.('change', alGirar)
      vv?.removeEventListener?.('resize', alResize)
    }
  }, [activo])

  return lectura
}
