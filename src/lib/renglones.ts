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

// EL PIXEL DEL RENGLON, SIN INTERPOLAR DENTRO DE EL.
//
// pixelDePosicion, aca abajo, contesta "en que pixel esta la palabra N" repartiendo el alto
// del renglon entre sus palabras. Medido sobre la lectura de Javier: su renglon tiene unas 4
// palabras y mide 33.6 px, o sea 8.2 px por palabra. Como el desplazamiento de la pantalla
// sigue esa respuesta, decir las cuatro palabras de un renglon desplaza la pantalla un
// renglon entero, repartido desde la PRIMERA palabra.
//
// El renglon que se esta leyendo arranca en el medio de la ventana clara y, al llegar a su
// ultima palabra, ya subio 33.6 px: quedo pegado al borde de arriba. Y el ojo va una o dos
// palabras por delante de la voz, asi que se mira todavia mas arriba.
//
// Javier lo describio dos veces antes de que yo lo entendiera:
//   "entiendo que se mueva desde la ultima palabra del primer renglon, no desde antes,
//    porque si es desde antes claramente voy a dejar de verlo"
//   "y no se mueve cuando finalizo ese renglon sino antes"
//
// Esta funcion contesta el pixel DEL RENGLON: las cuatro palabras dan el mismo numero, asi
// que la pantalla no se mueve mientras se lee un renglon, y cambia una sola vez al cruzar al
// siguiente. La vista amortigua ese cambio para que sea un deslizamiento y no un tiron.
//
// NO se toca pixelDePosicion: la usan las pruebas del corpus para reconstruir donde caia
// cada palabra, y ahi la interpolacion es lo correcto.
export function indiceDeRenglon(
  renglones: Renglon[],
  posicion: number
): number {
  if (renglones.length === 0) return 0

  const tokenBase = Math.floor(posicion)
  let idx = renglones.findIndex(
    r => tokenBase >= r.desdeToken && tokenBase <= r.hastaToken
  )
  if (idx === -1) {
    idx = tokenBase < renglones[0].desdeToken ? 0 : renglones.length - 1
  }
  return idx
}

export function pixelDeRenglon(
  renglones: Renglon[],
  posicion: number
): number {
  if (renglones.length === 0) return 0
  return renglones[indiceDeRenglon(renglones, posicion)].top
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
