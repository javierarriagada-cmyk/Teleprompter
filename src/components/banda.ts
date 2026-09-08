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
  const altoViva = altoLineaViva !== undefined ? altoLineaViva : filaPx * Math.max(1, lineasZona - 2)
  const altoBanda = altoViva + 2 * filaPx

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
