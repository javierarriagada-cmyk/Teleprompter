export type AnclajeZona = 'arriba' | 'medio' | 'abajo'

export interface ResultadoBanda {
  topBanda: number
  altoBanda: number
}

export function calcularBanda(
  alturaVista: number,
  alturaLinea: number,
  lineasZona: number,
  anclajeZona: AnclajeZona,
  paddingSuperior = 0,
  paddingInferior = 0,
  altoLineaViva?: number
): ResultadoBanda {
  const filaPx = alturaLinea

  // LA BANDA MIDE TRES RENGLONES, SIEMPRE. El de arriba, el que se esta leyendo y el de
  // abajo.
  //
  // Antes media el alto de la LINEA viva mas un renglon a cada lado, y eso lo especifique
  // yo suponiendo que una linea del guion ocupa uno o dos renglones. Con la columna
  // angosta una linea ocupa tres o cuatro, asi que la banda llegaba a CINCO renglones: una
  // mancha gris enorme que marcaba un parrafo entero en vez del renglon que se esta
  // leyendo. Javier lo vio al primer intento -"el remarcado esta pesimo"-.
  //
  // Se lee RENGLON POR RENGLON, no parrafo por parrafo. La banda marca donde esta el ojo,
  // y el ojo esta en un renglon. El parametro altoLineaViva queda sin uso a proposito.
  void altoLineaViva
  const altoBanda = 3 * filaPx

  let topBanda = 0
  if (anclajeZona === 'arriba') {
    topBanda = paddingSuperior
  } else if (anclajeZona === 'medio') {
    topBanda = (alturaVista - altoBanda) / 2
  } else if (anclajeZona === 'abajo') {
    topBanda = alturaVista - altoBanda - paddingInferior
  }

  return { topBanda, altoBanda }
}

// LA FRANJA CLARA CUBRE DONDE ESTA EL OJO, NO DONDE ESTA LA VOZ.
//
// Al leer en voz alta, el ojo va una o dos palabras POR DELANTE de lo que se esta diciendo.
// No es un defecto de nadie: es como funciona leer, y por eso se puede leer de corrido.
//
// El motor sigue la VOZ -es lo unico que puede oir-, asi que el renglon que el motor marca
// como vivo es donde esta la voz. Con cuatro palabras por renglon, el ojo esta casi siempre
// en el RENGLON SIGUIENTE. Ese renglon estaba en 0.60, atenuado.
//
// Javier lo reporto asi el 13 de septiembre de 2026, despues de que el motor dejara de
// adelantarse -adelanto medio 0.17 palabras, ya no era eso-: "sigo teniendo que leer en la
// linea que se esta borrando, asi que no pude leer mas".
//
// Por eso el renglon siguiente pasa a estar TAN CLARO COMO EL VIVO. La franja clara son dos
// renglones: donde esta la voz y donde esta el ojo. Lo que viene despues se atenua, y lo ya
// leido queda legible pero apagado, para poder volver la vista sin que compita.
//
// ESTO NO SE ARREGLA EN EL MOTOR. Adelantar la posicion para "mostrar antes" fue el error
// que costo dos semanas: corre el ancla y se pierde de vista donde estas. Mostrar por
// delante es de la pantalla.
export function opacidadDeLinea(distanciaLineas: number): number {
  if (distanciaLineas === 0) return 1.0
  if (distanciaLineas === 1) return 1.0
  if (distanciaLineas === 2) return 0.55
  if (distanciaLineas > 2) return 0.28
  if (distanciaLineas === -1) return 0.40
  return 0.12
}

export interface TramoVelo {
  desdePx: number
  hastaPx: number
  alpha: number
}

export function calcularTramosVelo(topBanda: number, filaPx: number, lineasZona = 3): TramoVelo[] {
  const altoZona = lineasZona * filaPx
  return [
    { desdePx: 0, hastaPx: topBanda, alpha: 0.88 },
    { desdePx: topBanda, hastaPx: topBanda + altoZona, alpha: 0.00 },
    { desdePx: topBanda + altoZona, hastaPx: Infinity, alpha: 0.68 }
  ]
}

export function calcularBgVelo(
  topBanda: number,
  filaPx: number,
  lineasZona: number,
  rgbFondo: { r: number; g: number; b: number }
): string {
  const cVelo = (alpha: number) => `rgba(${rgbFondo.r}, ${rgbFondo.g}, ${rgbFondo.b}, ${alpha})`
  const altoZona = lineasZona * filaPx
  return `linear-gradient(to bottom, ${cVelo(0.88)} 0px, ${cVelo(0.88)} ${topBanda}px, ${cVelo(0.00)} ${topBanda}px, ${cVelo(0.00)} ${topBanda + altoZona}px, ${cVelo(0.68)} ${topBanda + altoZona}px, ${cVelo(0.68)} 100%)`
}
