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
  paddingInferior = 0
): ResultadoBanda {
  const altoBanda = lineasZona * alturaLinea

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
  const dist = Math.abs(distanciaLineas)
  if (dist === 0) return 1.0
  if (dist === 1) return 0.5
  return 0.2
}
