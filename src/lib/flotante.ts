// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

export function limitarTransparencia(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function limitarTamanoLetra(n: unknown, pasos: readonly number[]): number {
  if (pasos.length === 0) return 24
  if (typeof n !== 'number' || !Number.isFinite(n)) return pasos[0]
  if (pasos.includes(n)) return n
  return pasos.reduce((mejor, p) => Math.abs(p - n) < Math.abs(mejor - n) ? p : mejor)
}

export function tokenAlVolver(token: unknown, totalTokens: number): number {
  if (typeof token !== 'number' || !Number.isFinite(token) || totalTokens <= 0) return 0
  return Math.max(0, Math.min(Math.floor(token), totalTokens - 1))
}

export function colorConAlfa(hex: string, alfa: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alfa))})`
}

// ---------------------------------------------------------------------------------------------------------------
// LA BANDA A -09-11-2026, la que eligió Javier-. Lo que sigue es lógica pura de la ventana: sin DOM ni Android.
// ---------------------------------------------------------------------------------------------------------------

// LA ENTRADA: AUTORIZACIÓN Y PREPARACIÓN -09-11-2026-. Empezar con «Ventana flotante» elegida abre la preparación si
// el servicio ya está activo, o el aviso de autorización si falta. «Abrir Accesibilidad» deja la hoja esperando; al
// volver a Sigo se consulta el estado real: activo, preparación; inactivo, el mismo aviso con la nota de que sigue
// desactivado, para reintentar o desistir. Desistir -«Ahora no» o tocar afuera- vuelve a LISTO.
export type HojaFlotante =
  | null
  | { tipo: 'autorizacion'; inactivo: boolean; esperando: boolean }
  | { tipo: 'preparacion' }

export type EventoHojaFlotante =
  | { tipo: 'empezar'; accesibilidad: boolean }
  | { tipo: 'abrirAjustes' }
  | { tipo: 'volver'; accesibilidad: boolean }
  | { tipo: 'desistir' }

export function siguienteHojaFlotante(hoja: HojaFlotante, evento: EventoHojaFlotante): HojaFlotante {
  switch (evento.tipo) {
    case 'empezar':
      return evento.accesibilidad ? { tipo: 'preparacion' } : { tipo: 'autorizacion', inactivo: false, esperando: false }
    case 'abrirAjustes':
      if (hoja?.tipo !== 'autorizacion') return hoja
      return { ...hoja, esperando: true }
    case 'volver':
      // Volver a Sigo sin haber ido a Ajustes -por ejemplo, desde recientes- no cambia nada.
      if (hoja?.tipo !== 'autorizacion' || !hoja.esperando) return hoja
      return evento.accesibilidad ? { tipo: 'preparacion' } : { tipo: 'autorizacion', inactivo: true, esperando: false }
    case 'desistir':
      return null
  }
}

// LOS CONTROLES SEGÚN EL ANCHO -NOTA.md de los bocetos, punto 3-. Amplia desde 320: la pastilla entera y Pausa con
// su nombre. Media hasta el mínimo de 240: la pastilla compacta y la pausa solo con el ícono. La angosta del boceto
// -menos de 236- no existe en A, porque el mínimo es 240.
export type DisenoVentana = 'amplia' | 'media'
export function disenoVentana(ancho: number): DisenoVentana {
  return ancho >= 320 ? 'amplia' : 'media'
}

// El borde superior del renglón que se lee, a esta distancia del borde de la ventana: la cabecera de 48 más 4. No se
// mueve con los controles, con Aa abierto ni con la letra -NOTA.md, punto 2-.
export const ALTO_CABECERA_VENTANA = 48
export const ALTO_PIE_VENTANA = 48
export const ANCLA_RENGLON_VENTANA = ALTO_CABECERA_VENTANA + 4

export interface Caja { x: number; y: number; w: number; h: number }
export interface AreaSegura { l: number; t: number; r: number; b: number }
export interface LugarMenuAa extends Caja { forma: 'columna' | 'fila'; lado: 'abajo' | 'arriba' | 'derecha' | 'izquierda' | 'dentro' }

// Las dos formas del menú de Aa del boceto A: en columna, 280 -el máximo del menú de Material 3- por 172; en fila,
// los dos controles lado a lado, 476 por 96. Relleno 12; separación de la ventana 6; margen al borde seguro 4.
export const MENU_AA_COLUMNA = { w: 280, h: 172 }
export const MENU_AA_FILA = { w: 476, h: 96 }
const SEPARACION_MENU = 6
const MARGEN_MENU = 4

const cruza = (a: Caja, b: Caja) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const cabe = (c: Caja, s: AreaSegura) =>
  c.x >= s.l + MARGEN_MENU - 0.5 && c.y >= s.t + MARGEN_MENU - 0.5 &&
  c.x + c.w <= s.r - MARGEN_MENU + 0.5 && c.y + c.h <= s.b - MARGEN_MENU + 0.5

// DÓNDE VA EL MENÚ DE Aa -09-11-2026, boceto A, colocarMenu de telefono.js-. Pegado a la ventana y alineado con Aa,
// fuera de la lectura. En el boceto se esquivaban los controles de la Cámara medidos en las fotos; aquí Sigo no sabe
// qué hay debajo, así que la preferencia es la de esas fotos: de pie, la columna debajo de la banda -la Cámara
// tiene sus controles abajo, a partir de y 519-; de lado, la fila debajo -la columna ahí caía sobre los modos-.
// Si no cabe, se prueban las otras formas y lados, y al acercar la ventana a un borde el menú se pasa al otro.
// Sin lugar afuera, entra en la ventana por abajo: tapa parte de la lectura, pero no otra app.
export function colocarMenuAa(ventana: Caja, aa: Caja, seguro: AreaSegura): LugarMenuAa {
  const deLado = seguro.r - seguro.l > seguro.b - seguro.t
  const formas = deLado
    ? [{ forma: 'fila' as const, ...MENU_AA_FILA }, { forma: 'columna' as const, ...MENU_AA_COLUMNA }]
    : [{ forma: 'columna' as const, ...MENU_AA_COLUMNA }, { forma: 'fila' as const, ...MENU_AA_FILA }]
  const limitarX = (x: number, w: number) => Math.min(Math.max(x, seguro.l + MARGEN_MENU), seguro.r - MARGEN_MENU - w)
  for (const F of formas) {
    // La columna se alinea con el borde derecho de Aa; la fila, con el borde izquierdo de la ventana, que de lado ya
    // está corrido a la derecha de la columna de controles de la Cámara -GeometriaVentana.java-.
    const xs = (F.forma === 'columna' ? [aa.x + aa.w - F.w, ventana.x] : [ventana.x, aa.x + aa.w - F.w]).map((x) => limitarX(x, F.w))
    const candidatos: LugarMenuAa[] = []
    for (const x of xs) candidatos.push({ forma: F.forma, lado: 'abajo', x, y: ventana.y + ventana.h + SEPARACION_MENU, w: F.w, h: F.h })
    for (const x of xs) candidatos.push({ forma: F.forma, lado: 'arriba', x, y: ventana.y - SEPARACION_MENU - F.h, w: F.w, h: F.h })
    const y = Math.min(Math.max(aa.y, seguro.t + MARGEN_MENU), seguro.b - MARGEN_MENU - F.h)
    candidatos.push({ forma: F.forma, lado: 'derecha', x: ventana.x + ventana.w + SEPARACION_MENU, y, w: F.w, h: F.h })
    candidatos.push({ forma: F.forma, lado: 'izquierda', x: ventana.x - SEPARACION_MENU - F.w, y, w: F.w, h: F.h })
    for (const c of candidatos) {
      if (cabe(c, seguro) && !cruza(c, ventana)) return c
    }
  }
  const w = Math.min(MENU_AA_COLUMNA.w, ventana.w)
  return {
    forma: 'columna', lado: 'dentro', x: ventana.x + ventana.w - w,
    y: Math.max(ventana.y + ALTO_CABECERA_VENTANA, ventana.y + ventana.h - MENU_AA_COLUMNA.h), w, h: MENU_AA_COLUMNA.h
  }
}

// EL CONTRASTE DE LA PASTILLA DEL TIEMPO -09-11-2026-. WCAG 2: luminancia relativa de sRGB y (L1 + 0,05) / (L2 + 0,05).
// El fondo de la pastilla es compuesto: la foto de la otra app, encima el fondo de la ventana con su opacidad
// -1 menos la transparencia- y encima el fondo translúcido de la pastilla.
export type Rgb = [number, number, number]

export function hexARgb(hex: string): Rgb {
  let limpio = hex.replace('#', '').trim()
  if (limpio.length === 3) limpio = limpio.split('').map((c) => c + c).join('')
  const n = parseInt(limpio, 16)
  if (Number.isNaN(n) || limpio.length !== 6) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function componer(abajo: Rgb, arriba: Rgb, alfa: number): Rgb {
  const a = Math.max(0, Math.min(1, alfa))
  return [0, 1, 2].map((i) => arriba[i] * a + abajo[i] * (1 - a)) as Rgb
}

export function luminancia([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contraste(a: Rgb, b: Rgb): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function contrastePastilla(opciones: {
  foto: Rgb
  fondoVentana: Rgb
  transparencia: number
  fondoPastilla: Rgb
  alfaPastilla: number
  texto: Rgb
}): number {
  const conVentana = componer(opciones.foto, opciones.fondoVentana, 1 - limitarTransparencia(opciones.transparencia) / 100)
  const conPastilla = componer(conVentana, opciones.fondoPastilla, opciones.alfaPastilla)
  return contraste(conPastilla, opciones.texto)
}
