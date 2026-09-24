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

export function familiaLectura(tipoFuente: 'sans' | 'serif'): string {
  return tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'
}

// Sobre fondo blanco la letra va negra siempre, sea cual sea la elegida:
// una letra ambar o blanca sobre blanco no se lee.
export function colorLetraEfectiva(colorFondo: string, colorLetra: string): string {
  return colorFondo.toUpperCase() === '#FFFFFF' ? '#000000' : colorLetra
}

// Angosta: 22 caracteres y centrada. Completa: 90% del ancho y a la
// izquierda. El porque largo esta en TeleprompterView.tsx, arriba del
// textAlign de columna-texto.
export function columnaLectura(columnaAngosta: boolean): { maxWidth: string; textAlign: 'center' | 'left' } {
  return columnaAngosta
    ? { maxWidth: '22ch', textAlign: 'center' }
    : { maxWidth: '90%', textAlign: 'left' }
}

// El color de un tramo depende del fondo: claro sobre negro, oscuro sobre
// blanco. Lo usan la lectura -renglones.tsx- y el editor -EditorGuion.tsx-.
export function colorDeTramo(color: keyof typeof COLORES_TRAMO, colorFondo: string): string {
  return colorFondo.toUpperCase() === '#FFFFFF' ? COLORES_TRAMO_SOBRE_CLARO[color] : COLORES_TRAMO[color]
}
