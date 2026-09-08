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
