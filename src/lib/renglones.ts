export type MedidaToken = { token: number; top: number }

export type Renglon = {
  top: number          // pixel donde empieza el renglon
  alto: number         // alto de ESE renglon
  desdeToken: number   // primer token del renglon
  hastaToken: number   // ultimo token del renglon, inclusive
}

export function agruparEnRenglones(
  medidas: MedidaToken[],
  altoDeRenglon: number
): Renglon[] {
  if (medidas.length === 0) return []

  const renglones: Renglon[] = []
  let grupoActual: MedidaToken[] = [medidas[0]]

  for (let i = 1; i < medidas.length; i++) {
    const m = medidas[i]
    if (Math.abs(m.top - grupoActual[0].top) < altoDeRenglon / 2) {
      grupoActual.push(m)
    } else {
      renglones.push({
        top: grupoActual[0].top,
        alto: 0,
        desdeToken: grupoActual[0].token,
        hastaToken: grupoActual[grupoActual.length - 1].token
      })
      grupoActual = [m]
    }
  }

  if (grupoActual.length > 0) {
    renglones.push({
      top: grupoActual[0].top,
      alto: 0,
      desdeToken: grupoActual[0].token,
      hastaToken: grupoActual[grupoActual.length - 1].token
    })
  }

  for (let k = 0; k < renglones.length; k++) {
    if (k < renglones.length - 1) {
      renglones[k].alto = renglones[k + 1].top - renglones[k].top
    } else {
      renglones[k].alto = altoDeRenglon
    }
  }

  return renglones
}

export function pixelDePosicion(
  renglones: Renglon[],
  posicion: number
): number {
  if (renglones.length === 0) return 0

  if (posicion <= renglones[0].desdeToken) {
    return renglones[0].top
  }

  const tokenBase = Math.floor(posicion)

  let idxRenglon = renglones.findIndex(
    r => tokenBase >= r.desdeToken && tokenBase <= r.hastaToken
  )

  if (idxRenglon === -1) {
    if (tokenBase < renglones[0].desdeToken) {
      idxRenglon = 0
    } else {
      idxRenglon = renglones.length - 1
    }
  }

  const renglon = renglones[idxRenglon]
  const esUltimo = idxRenglon === renglones.length - 1
  const siguienteTop = esUltimo
    ? renglon.top + renglon.alto
    : renglones[idxRenglon + 1].top

  const cantidad = renglon.hastaToken + 1 - renglon.desdeToken
  const fraccion = (posicion - renglon.desdeToken) / cantidad

  return renglon.top + fraccion * (siguienteTop - renglon.top)
}
