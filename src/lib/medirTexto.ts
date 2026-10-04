// EL ANCHO DE UN RENGLÓN DE SUBTÍTULO, MEDIDO CON LA LETRA DE VERDAD -tarea 87, 04-10-2026, aprobado
// por Javier-. El visor achica la letra de un subtítulo cuyo renglón más ancho pasa del 88 % de la
// imagen, como el archivo -UbicacionSubtitulos.letraQueCabe, que mide con Paint.measureText-. Aquí se
// mide con un canvas -measureText- con la misma letra del sistema que usa la capa: Roboto, 700 en
// amarillo y rojo y 400 en formal. Sin dependencias nuevas.
// Devuelve null si no se puede medir -sin canvas, o en jsdom, que no lo implementa-: entonces el visor
// deja la letra sin ajuste, como antes.
let ctx: CanvasRenderingContext2D | null | undefined
function contexto(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx
  try {
    if (typeof document === 'undefined' || (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))) ctx = null
    else ctx = document.createElement('canvas').getContext('2d')
  } catch {
    ctx = null
  }
  return ctx
}

// El ancho, en px, del renglón más ancho a la letra "letra". Los renglones van con sus palabras
// unidas por un espacio, como los dibuja la capa y como los suma anchoDe en CapaDeSubtitulos.java.
export function anchoDelRenglonMasAncho(renglones: string[], letra: number, negrita: boolean): number | null {
  const c = contexto()
  if (!c) return null
  c.font = `${negrita ? 700 : 400} ${letra}px Roboto, sans-serif`
  let max = 0
  for (const r of renglones) max = Math.max(max, c.measureText(r).width)
  return max
}
