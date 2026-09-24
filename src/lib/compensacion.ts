// LA COMPENSACION DEL RENGLON -24-09-2026, medida-.
//
// El renglon vivo se ancla en la ultima palabra que el reconocedor entrego -TeleprompterView,
// anclaRenglon-. Con el oido propio y el relevo del microfono, esa palabra llega 0,35 s despues
// de dicha: en el telefono de Javier, contra 0,28 a 0,32 s del mismo modelo en el PC. Y el
// motor no agrega nada encima -scratchpad motorlag.mjs: el calce es la ultima palabra
// entregada, con mediana 0 de diferencia-. Lo que queda de atraso es solo ese: 1 a 2 palabras.
//
// Aca se compensa: mientras el motor esta SIGUIENDO, el ancla se corre hacia adelante lo que la
// persona alcanza a decir en MS_COMPENSACION_RENGLON, a su ritmo medido -cuanto avanzo el calce
// en los ultimos MS_VENTANA_RITMO-. El tiempo cuenta desde que el calce cambio por ultima vez, y
// nunca pasa de MS_COMPENSACION_RENGLON: cuando la persona se calla, el ancla se corre a lo sumo
// eso y se queda.
//
// POR QUE 400, Y POR QUE NUNCA RETROCEDE. Repetido sobre seis tomas reales -scratchpad
// simcomp2.mjs, que parte de los cuadros grabados-:
//
//                           renglon 2 (el objetivo)     saltos hacia atras
//   sin compensar           25% a 73%                   0
//   300 ms                  +1 a +2 puntos              0
//   400 ms                  +4 a +6 puntos              2 en seis tomas
//   500 / 600 ms            +5 a +9 puntos              1 a 3 por toma
//   400 ms, sin retroceder  +4 a +6 puntos              0
//
// Los saltos hacia atras salen de que la compensacion cruza al renglon siguiente y el proximo
// calce, que llega sin compensar, cae todavia en el anterior. Como el ancla no baja mientras el
// calce no baje, eso no pasa: la pantalla se queda en el renglon nuevo, que la persona alcanza en
// menos de una palabra. Si el calce SI baja -volvio a leer, o se movio el texto a mano- el ancla
// baja con el.
//
// Es la unica excepcion a "el renglon mostrado es el de la evidencia". Y no contradice lo que
// Sigo dice ser -va atras de la voz, no adelante-: compensa como maximo la demora medida del
// reconocedor, no mas. En las seis tomas la pantalla quedo delante de la voz el 0 a 2% del tiempo.

export const MS_COMPENSACION_RENGLON = 400
export const MS_VENTANA_RITMO = 4000
export const TOPE_COMPENSACION_PALABRAS = 3
// El ritmo no pasa de 6 palabras por segundo. Al empezar el historial tiene dos o tres cambios
// de calce muy juntos -el reconocedor entrega de a rafagas- y la cuenta daria un ritmo absurdo.
// Con el tope, las seis tomas dan lo mismo que sin el.
export const RITMO_MAXIMO_PALABRAS_POR_MS = 0.006

export type EstadoCompensacion = {
  historial: Array<{ ms: number; calce: number }>  // solo los cambios de calce
  anclaPrevia: number
  calcePrevio: number
}

export function crearCompensacion(): EstadoCompensacion {
  return { historial: [], anclaPrevia: -1, calcePrevio: -1 }
}

// Devuelve el ancla del renglon vivo, en tokens. base es la de siempre: min(posicion, calce).
export function anclaCompensada(
  e: EstadoCompensacion,
  entrada: { posicion: number; ultimoCalce: number; siguiendo: boolean; tMs: number },
  msCompensacion = MS_COMPENSACION_RENGLON
): number {
  const { posicion, ultimoCalce, siguiendo, tMs } = entrada
  const h = e.historial
  if (h.length === 0 || h[h.length - 1].calce !== ultimoCalce) h.push({ ms: tMs, calce: ultimoCalce })
  while (h.length > 1 && h[0].ms < tMs - MS_VENTANA_RITMO) h.shift()

  const base = Math.min(posicion, ultimoCalce)
  let ancla = base
  if (siguiendo && ultimoCalce > 0 && h.length > 1) {
    const primero = h[0]
    const ultimo = h[h.length - 1]
    const ritmo = ultimo.ms > primero.ms
      ? Math.min(RITMO_MAXIMO_PALABRAS_POR_MS, Math.max(0, (ultimo.calce - primero.calce) / (ultimo.ms - primero.ms)))
      : 0
    const adelanto = Math.min(TOPE_COMPENSACION_PALABRAS, ritmo * Math.min(msCompensacion, tMs - ultimo.ms))
    ancla = Math.max(base, ultimoCalce + adelanto)
  }

  if (ultimoCalce < e.calcePrevio) e.anclaPrevia = -1
  e.calcePrevio = ultimoCalce
  ancla = Math.max(ancla, e.anclaPrevia)
  e.anclaPrevia = ancla
  return ancla
}
