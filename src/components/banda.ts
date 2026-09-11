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

export function opacidadDeLinea(distanciaLineas: number): number {
  if (distanciaLineas === 0) return 1.0
  if (distanciaLineas === 1) return 0.60
  if (distanciaLineas > 1) return 0.32
  if (distanciaLineas === -1) return 0.30
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
