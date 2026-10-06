// COMO SE VE EL TEXTO DE LA LECTURA, EN UN SOLO LUGAR.
//
// Estas reglas estaban escritas en TeleprompterView.tsx -la lectura- y la
// de la tipografia ademas copiada en TarjetaLectura.tsx -la portada-. La
// Tarea 72 agrego un tercer lugar que las necesita: la muestra viva del
// panel Aa del editor. Tres copias de una regla se separan en cuanto
// alguien cambia una; por eso viven aca y los tres las importan.
// 23-09-2026.
//
// OJO, NO ES EL UNICO LUGAR DEL 1.4 Y DEL 16. TeleprompterView.tsx tiene
// su propia geometria del lienzo -filaPx = fontSize * 1.4 y
// alturaLineaPx = filaPx + 16-, que es la que usan la banda, el scroll y
// el renglon trabado. Esa quedo afuera a proposito: la logica de lectura
// esta congelada y la Tarea 72 no la toco. Si se cambia
// INTERLINEADO_LECTURA o MARGEN_RENGLON_LECTURA_PX, hay que cambiar esas
// dos cuentas en el mismo commit, o la lectura se descuadra sin que
// ninguna prueba lo vea.

import { COLORES_TRAMO, COLORES_TRAMO_SOBRE_CLARO } from '../datos/modelo'

export const INTERLINEADO_LECTURA = 1.4
export const MARGEN_RENGLON_LECTURA_PX = 16

// LOS CINCO PASOS DE LA LETRA -antes en App.tsx-. Las fichas de LISTO y el
// editor usan el mismo arreglo: dos puertas, un solo valor. 28-09-2026.
export const PASOS_LETRA = [14, 18, 24, 32, 42]

export function familiaLectura(tipoFuente: 'sans' | 'serif'): string {
  return tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'
}

// Sobre fondo blanco la letra va negra siempre, sea cual sea la elegida:
// una letra ambar o blanca sobre blanco no se lee.
export function colorLetraEfectiva(colorFondo: string, colorLetra: string): string {
  return colorFondo.toUpperCase() === '#FFFFFF' ? '#000000' : colorLetra
}

// Angosta: 22 caracteres y centrada. Completa: 93% del ancho y a la
// izquierda. El porque largo esta en TeleprompterView.tsx, arriba del
// textAlign de columna-texto.
// 90 -> 93 el 27-09-2026: Javier comparo capturas -Sigo ~80% del ancho de la pantalla,
// otra aplicacion de lectura ~86%- y pidio "el punto intermedio". Con el margen de 5%
// por lado, 93% deja el texto en ~83,5% de la pantalla.
export function columnaLectura(columnaAngosta: boolean): { maxWidth: string; textAlign: 'center' | 'left' } {
  return columnaAngosta
    ? { maxWidth: '22ch', textAlign: 'center' }
    : { maxWidth: '93%', textAlign: 'left' }
}

// El color de un tramo depende del fondo: claro sobre negro, oscuro sobre
// blanco. Lo usan la lectura -renglones.tsx- y el editor -EditorGuion.tsx-.
export function colorDeTramo(color: keyof typeof COLORES_TRAMO, colorFondo: string): string {
  return colorFondo.toUpperCase() === '#FFFFFF' ? COLORES_TRAMO_SOBRE_CLARO[color] : COLORES_TRAMO[color]
}

// COLOR DEL PLACEHOLDER DEL CUERPO DEL EDITOR -tarea 101, 06-10-2026-.
// El ::before de TipTap usaba opacity 0.45 sobre la letra: el contraste caía bajo 4,5:1
// (Test Lab A3). Aquí va un gris/tono por fondo de PAREJAS_COLOR que:
//   1) da ≥ 4,5:1 contra ese fondo (WCAG 2.x, luminancia relativa),
//   2) sigue más tenue que la letra de esa pareja (menor ratio contra el fondo).
//
// Medido con (L1+0,05)/(L2+0,05):
//   #000000 / sugerencia #7A7572 ≈ 4,62  |  letra #FFFFFF ≈ 21,00; #F5C24B ≈ 12,70; #4ADE80 ≈ 12,05
//   #121212 / sugerencia #827D7A ≈ 4,61  |  letra #EDE6D6 ≈ 15,07
//   #FFFFFF / sugerencia #6E6660 ≈ 5,63  |  letra #000000 ≈ 21,00
export function colorSugerenciaLectura(colorFondo: string): string {
  const f = colorFondo.trim().toUpperCase()
  if (f === '#FFFFFF') return '#6E6660'
  if (f === '#121212') return '#827D7A'
  // Negro y cualquier otro fondo oscuro de las parejas.
  return '#7A7572'
}
