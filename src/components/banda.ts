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
// LA MARCA NUNCA VA A ESTAR DONDE SE ESTA MIRANDO, Y HAY QUE DISENAR CON ESO.
//
// Se suman dos retrasos y ninguno se puede eliminar:
//
//   1. El reconocedor entrega cada palabra unas decimas despues de que se dijo.
//   2. El ojo va una o dos palabras POR DELANTE de la voz. Es fisiologico y es lo que
//      permite leer de corrido.
//
// El motor solo puede oir la voz. Asi que la marca esta, siempre, dos o tres palabras
// detras de donde estan los ojos. Javier lo razono el 13 de septiembre de 2026 mejor que
// yo: si el ojo va antes, el atraso efectivo es peor que el medido.
//
// POR ESO NO PUEDE SER UNA VENTANA DE TRES RENGLONES CENTRADA EN LA VOZ: lo que se va a
// leer cae siempre fuera de ella. Lo que VIENE tiene que quedarse legible varios renglones
// hacia abajo; lo que YA PASO se apaga rapido, porque ahi no hay nada que leer.
//
// PERO LA ZONA LEGIBLE TIENE QUE SEGUIR SIENDO CHICA, Y ESO MANDA.
//
// Javier lo corrigio el mismo dia, y tiene razon: "si es varios renglones ya nos alejamos
// del ojo de la camara, yo se que es algo mas pero no varios renglones".
//
// El teleprompter existe para que la persona MIRE EL LENTE. Si la zona legible abarca
// cuatro o cinco renglones, el ojo recorre un area grande y se despega de la camara: se
// nota en el video y arruina la toma. Una version anterior de esta funcion abria la rampa a
// cinco renglones y estaba mal por eso.
//
// El arreglo del problema que reporto -leer en un renglon apagado- NO era ensanchar la
// zona: era que el renglon SIGUIENTE, que es donde caen los ojos, estuviera tan claro como
// el vivo. Dos renglones claros son unos 70 px: el ojo se mueve dentro de eso y no se va del
// lente.
//
// Asimetrica igual: hacia adelante hay algo mas de margen que hacia atras, porque atras no
// hay nada que leer.
export function opacidadDeLinea(distanciaLineas: number): number {
  if (distanciaLineas === 0) return 1.0
  if (distanciaLineas === 1) return 1.0
  if (distanciaLineas === 2) return 0.55
  if (distanciaLineas > 2) return 0.22
  if (distanciaLineas === -1) return 0.35
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
    { desdePx: 0, hastaPx: topBanda, alpha: 0.45 },
    { desdePx: topBanda, hastaPx: topBanda + altoZona, alpha: 0.00 },
    { desdePx: topBanda + altoZona, hastaPx: Infinity, alpha: 0.55 }
  ]
}

// ESTO ES LO QUE DE VERDAD SE VE. opacidadDeLinea esta importada en la vista pero NO SE
// LLAMA: el 13 de septiembre de 2026 estuve una tarde ajustando esa escala creyendo que
// controlaba la pantalla, y no controla nada. Lo unico que pinta es esta funcion.
//
// LO QUE ESTABA MAL: arriba de la ventana clara el velo saltaba a 0.88, que sobre fondo
// negro es negro. Y arriba del renglon vivo hay UN SOLO renglon claro. O sea que cualquier
// desfase de un renglon -el margen entre parrafos, o simplemente que el ojo va delante de
// la voz- dejaba a Javier leyendo en negro: "termino leyendo en la linea ennegrecida, asi
// que no pude leer mas".
//
// Medido sobre su lectura, el motor la seguia con 0.08 palabras de error medio sobre 703
// puntos. No era el motor: era que al lado de donde se lee habia negro.
//
// AHORA NO HAY NEGRO EN NINGUNA PARTE CERCA. Lo de afuera de la ventana se atenua lo
// suficiente para guiar el ojo y no tanto como para castigar estar medio renglon corrido:
//
//   arriba de la ventana   0.45   se lee, pero claramente es lo ya dicho
//   la ventana             0.00   limpia
//   abajo de la ventana    0.55   se lee, y es lo que viene
//
// La ventana sigue midiendo tres renglones: la zona clara tiene que ser CHICA para no
// despegar el ojo del lente de la camara. Lo que cambia es que afuera ya no es un pozo.
export function calcularBgVelo(
  topBanda: number,
  filaPx: number,
  lineasZona: number,
  rgbFondo: { r: number; g: number; b: number }
): string {
  const cVelo = (alpha: number) => `rgba(${rgbFondo.r}, ${rgbFondo.g}, ${rgbFondo.b}, ${alpha})`
  const altoZona = lineasZona * filaPx
  return `linear-gradient(to bottom, ${cVelo(0.45)} 0px, ${cVelo(0.45)} ${topBanda}px, ${cVelo(0.00)} ${topBanda}px, ${cVelo(0.00)} ${topBanda + altoZona}px, ${cVelo(0.55)} ${topBanda + altoZona}px, ${cVelo(0.55)} 100%)`
}
