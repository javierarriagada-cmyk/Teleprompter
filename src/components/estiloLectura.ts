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
// Antes: export function columnaLectura(columnaAngosta: boolean): { maxWidth: string; textAlign: 'center' | 'left' } {
// Antes:   return columnaAngosta
// Antes:     ? { maxWidth: '22ch', textAlign: 'center' }
// Antes:     : { maxWidth: '93%', textAlign: 'left' }
// Antes: }
// Con el teléfono de pie, la columna vive dentro del relleno de 5 % por lado (rellenoLecturaDePie),
// así que el 100 % de la columna es el 90 % de la pantalla:
// - 61 %: es el 55 % de la pantalla. Las guías de teleprompter recomiendan columnas de entre el 50 y el 75 % para que el ojo no se mueva de lado a lado en cámara.
// - 22ch: el tope de hoy, para que con letra chica no se estire.
// - 14.5ch: el piso, unas 18 letras, tres palabras. Al leer en voz alta el ojo va dos o tres palabras adelante de la voz, y un renglón más corto obliga a saltar de renglón antes de terminar la frase.
// - 78.5 %: el ancho del Medio (12 % de relleno y 93 % de columna) medido dentro de la columna del Angosto. Así el Angosto nunca es más ancho que el Medio.
export function columnaLectura(columnaAngosta: boolean, telefonoDePie: boolean = false): { maxWidth: string; textAlign: 'center' | 'left' } {
  return columnaAngosta
    ? { maxWidth: telefonoDePie ? 'min(78.5%, clamp(14.5ch, 61%, 22ch))' : '22ch', textAlign: 'center' }
    : { maxWidth: '93%', textAlign: 'left' }
}

// EL RELLENO DE LA LECTURA CON EL TELÉFONO DE PIE -editor-ancho-texto, 11-10-2026-.
// La lectura de pie ocupa la pantalla entera -contenedor-lectura, TeleprompterView.tsx- y deja a
// cada lado el margen del ajuste de ancho -marginPercent, 5 en «Ancho» y «Angosto», 12 en «Medio»-.
// Adentro va la columna de columnaLectura. El editor arma las mismas dos cajas con esta función y
// con columnaLectura, así su columna tiene el mismo ancho y los mismos bordes que la de la lectura y
// corta los renglones igual, con cualquier letra y cualquier ancho. Medido en el Redmi -392 dp, Aa 32,
// «Ancho»-: la lectura iba de 32 a 361 y el editor de 63 a 330, porque su 5% y su 93% se tomaban de
// la hoja -320 dp- y no de la pantalla.
export function rellenoLecturaDePie(marginPercent: number): { paddingLeft: string; paddingRight: string } {
  return { paddingLeft: `${marginPercent}%`, paddingRight: `${marginPercent}%` }
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
