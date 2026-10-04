// LA FORMA DE LA TOMA -tarea 87, parte C, 04-10-2026-. Con lo que lee analizarVideo -ancho, alto y
// rotación del archivo-, cómo se VE: capgo graba de pie un 1920x1080 con rotación 90 o 270, que se
// ve como 1080x1920 -respuesta de Claude del 04-10-. Por eso con 90 o 270 se dan vuelta los lados.
export type OrientacionToma = 'vertical' | 'horizontal' | 'cuadrada'

export function orientacionDeToma(o: { anchoPx?: number | null; altoPx?: number | null; rotacion?: number | null }): OrientacionToma | null {
  const ancho = Number(o?.anchoPx)
  const alto = Number(o?.altoPx)
  if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) return null
  const giro = ((Math.round(Number(o?.rotacion) || 0) % 360) + 360) % 360
  const deLado = giro === 90 || giro === 270
  const w = deLado ? alto : ancho
  const h = deLado ? ancho : alto
  if (w === h) return 'cuadrada'
  return h > w ? 'vertical' : 'horizontal'
}
