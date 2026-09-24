// EL DESTACADO DE LECTURA: "AQUI ESTAS LEYENDO" -24-09-2026-.
//
// No es el destacado amarillo del editor -un formato que el autor le pone al texto-. Es una
// capsula suave detras de las palabras que se estan leyendo, y se desliza con la voz.
//
// -24-09-2026, despues de probarla: UNA LINEA, NO UNA CAPSULA. Javier: "me impresiono
// bastante, es muy certero", pero "cuando se topan en dos renglones se marca mas": al pasar
// al renglon siguiente quedaban dos cajas una encima de la otra y pesaban el doble. Una linea
// fina bajo las palabras -como subrayar con un lapiz- en dos renglones sigue siendo liviana.
//
// POR QUE UNA VENTANA QUE ARRANCA EN EL MOTOR Y VA HACIA ADELANTE. Hubo un resaltado por
// palabra -amarillo- y se saco en la Tarea 5: iba siempre corrido de lo que se decia y
// distraia. El motor va detras de la voz, y lo medido en las tomas de Javier del 24-09
// -teleprom/02-lecturas/motor-24-sep, destacado.mjs- lo dice en palabras:
//
//   voz - posicion del motor   0: 14%   1: 27%   2: 32%   3: 17%   4 o mas: 9%
//
// Una ventana de N palabras desde la posicion del motor hacia adelante tiene la voz adentro:
//
//   3: 73%   4: 91%   5: 95%   6: 96%   7: 97%     y nunca por delante de la voz: 0%
//
// Y como el ojo va delante de la voz, la parte de adelante de la ventana cubre donde se mira.
//
// CUANTAS PALABRAS: una regla sola para cualquier letra y columna -Javier no quiere reglas
// por version, y pidio que nunca pase de dos renglones-: vez y media las palabras de un
// renglon, entre 4 y 6. Letra chica -6 a 9 por renglon-: 6, casi siempre en un renglon.
// Letra 42 -2,5 por renglon-: 4, menos de dos renglones.
export const PALABRAS_DESTACADO_MIN = 4
export const PALABRAS_DESTACADO_MAX = 6

export function palabrasDelDestacado(palabrasPorRenglon: number): number {
  if (!Number.isFinite(palabrasPorRenglon) || palabrasPorRenglon <= 0) return PALABRAS_DESTACADO_MIN
  return Math.max(PALABRAS_DESTACADO_MIN, Math.min(PALABRAS_DESTACADO_MAX, Math.round(1.5 * palabrasPorRenglon)))
}

export type CajaPalabra = { izquierda: number; arriba: number; ancho: number; alto: number }
export type Segmento = { izquierda: number; arriba: number; ancho: number; alto: number }

// Las palabras de la ventana, agrupadas por renglon: una capsula por renglon. Dos palabras
// estan en el mismo renglon si su borde de arriba difiere en menos de media altura.
export function segmentosDelDestacado(cajas: CajaPalabra[]): Segmento[] {
  const segs: Segmento[] = []
  for (const c of cajas) {
    const ult = segs[segs.length - 1]
    if (ult && Math.abs(c.arriba - ult.arriba) < c.alto / 2) {
      const der = Math.max(ult.izquierda + ult.ancho, c.izquierda + c.ancho)
      ult.izquierda = Math.min(ult.izquierda, c.izquierda)
      ult.ancho = der - ult.izquierda
      ult.alto = Math.max(ult.alto, c.alto)
    } else {
      segs.push({ ...c })
    }
  }
  return segs
}
