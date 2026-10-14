// DÓNDE SE CORTA CADA RENGLÓN, EN LA LECTURA Y EN EL EDITOR -editor-ancho-texto, 11-10-2026-.
//
// El que corta los renglones de verdad es el navegador, en los dos lados. La lectura los mide
// después del DOM -offsetTop de cada palabra, lib/renglones.ts- y eso no se toca. Lo que sí se
// puede tener en un solo lugar son las reglas que deciden el corte, para que el editor y la
// lectura no se separen:
//
//   1. El espacio al final de un renglón no ocupa lugar. En la lectura los renglones son <div>
//      comunes -white-space: normal- y el espacio del final se cae. El editor -Tiptap/ProseMirror-
//      traía white-space: break-spaces, y con eso el espacio del final SÍ ocupa lugar: una palabra
//      que en la lectura entraba justa pasaba al renglón de abajo. Ahora el editor usa pre-wrap
//      -ESPACIOS_EDITOR-: el espacio del final "cuelga" fuera del renglón y no cuenta, igual que
//      en la lectura, y se pueden seguir escribiendo espacios.
//   2. Con el teléfono de pie, la primera línea con texto del guion entra SANGRIA_PRIMERA_LINEA_PX
//      hacia la derecha, en la lectura y en el editor.
//
//   3. -segunda vuelta, 11-10-2026, aprobado por Javier- Las acotaciones -[ ] y ( )- llevan
//      MARGEN_ACOTACION_PX a cada lado en los dos lados; las ligaduras de la letra van apagadas en
//      los dos -LIGADURAS_TEXTO-; y el editor guarda dos o más espacios seguidos como uno
//      -juntarEspacios-, que es lo que la lectura dibuja.
//
// cortarRenglones arma los renglones con esas reglas, con una medida de letras que se le pasa.
// La app no la usa para dibujar -eso lo hace el navegador-: sirve para probar con lógica, sin
// layout, que con las reglas de cada lado los cortes salen iguales.

import { REGEX_ACOTACION } from './acotaciones'

// LA SANGRÍA DE LA PRIMERA LÍNEA. Vivía en TeleprompterView.tsx -ajustes de pantallas, 10-10-2026-,
// donde está la explicación larga. Se mudó acá para que el editor la use sin importar la lectura
// entera: TeleprompterView importa App, y App importa el editor.
export const SANGRIA_PRIMERA_LINEA_PX = 14

// La primera línea con texto, la que lleva la sangría: se saltan las líneas en blanco del comienzo.
// -1 si no hay ninguna. Es la misma cuenta que hace la lectura en cada bloque.
export function primeraLineaConTexto(lineas: string[]): number {
  return lineas.findIndex((x) => x.trim() !== '')
}

// LOS ESPACIOS DEL USUARIO -espacios-del-usuario, 14-10-2026-. En el Redmi, un guion con 14 líneas
// vacías seguidas se veía como un solo espacio de párrafo: cada línea vacía medía 0 y sus márgenes se
// juntaban. Javier: «está bien que los párrafos no estén tan separados, pero eso no puede pasar por
// sobre la edición de un usuario que quiere darle otro espacio». La regla, igual en el editor y en Leer:
//   - un salto o UNA línea vacía entre dos párrafos: la separación compacta de hoy, sin cambios;
//   - cada línea vacía SEGUIDA de más -la 2.ª, la 3.ª...-: ocupa un renglón de lectura;
//   - las líneas vacías del principio y del final del guion: cada una ocupa un renglón.
// Devuelve, por línea, true en las vacías que ocupan renglón. Una línea con solo espacios es vacía,
// como en primeraLineaConTexto.
export function lineasDeEspacio(lineas: string[]): boolean[] {
  const vacia = lineas.map((x) => x.trim() === '')
  const primera = vacia.indexOf(false)
  const ultima = vacia.lastIndexOf(false)
  return vacia.map((v, i) => {
    if (!v) return false
    if (primera < 0 || i < primera || i > ultima) return true
    // Entre párrafos: la primera vacía de la tanda es la separación de hoy; las demás, renglones.
    return vacia[i - 1] === true
  })
}

// Cómo trata los espacios cada lado -la propiedad white-space de CSS-.
//   normal        junta los espacios seguidos y el del final del renglón se cae. Es la lectura.
//   pre-wrap      deja los espacios como se escribieron; el del final del renglón cuelga y no
//                 ocupa lugar. Es el editor desde editor-ancho-texto.
//   break-spaces  deja los espacios y el del final SÍ ocupa lugar. Era el editor, por Tiptap.
export type ModoEspacios = 'normal' | 'pre-wrap' | 'break-spaces'
export const ESPACIOS_LECTURA: ModoEspacios = 'normal'
// Por qué pre-wrap y no normal: el editor se escribe a mano, y con normal el navegador junta o
// cambia los espacios mientras se escriben -ProseMirror lo pide en pre-wrap o break-spaces-. Y no
// break-spaces, porque ahí el espacio del final ocupa lugar y corta distinto que la lectura.
export const ESPACIOS_EDITOR: ModoEspacios = 'pre-wrap'

// LAS ACOTACIONES LLEVAN 2 PX A CADA LADO -segunda vuelta de editor-ancho-texto, 11-10-2026-. La
// lectura lo tenía escrito en renglones.tsx -margin: '0 2px'- y el editor no: una acotación cerca del
// borde podía caber en el editor y bajar en la lectura. Ahora los dos usan este valor.
export const MARGEN_ACOTACION_PX = 2

// LAS LIGADURAS, APAGADAS EN LOS DOS -segunda vuelta, 11-10-2026, cambio de la lectura aprobado por
// Javier-. Tiptap apaga las ligaduras en el editor -font-variant-ligatures: none, para que el cursor no
// caiga dentro de una "fi"- y la lectura las tenía prendidas: la misma palabra podía medir distinto.
// La lectura usa ahora la misma propiedad con el mismo valor, y el editor lo repite en línea.
export const LIGADURAS_TEXTO = 'none'

// DOS O MÁS ESPACIOS SEGUIDOS SON UNO -segunda vuelta, 11-10-2026-. La lectura -white-space: normal-
// los junta al dibujar; el editor -pre-wrap- los dibujaba todos. Ahora el editor los junta al
// escribir y al pegar, y lo guardado no tiene espacios repetidos. Solo el espacio común: los saltos
// de línea y los párrafos no se tocan.
export function juntarEspacios(texto: string): string {
  return texto.replace(/ {2,}/g, ' ')
}

// Dónde lleva margen cada letra de una línea: la primera y la última de cada acotación, como el
// <span> de la lectura -margen a la izquierda al abrir, a la derecha al cerrar-.
function margenesDeAcotacion(linea: string, margen: number): number[] {
  const extra = new Array<number>(linea.length).fill(0)
  if (margen <= 0) return extra
  for (const m of linea.matchAll(REGEX_ACOTACION)) {
    const i = m.index ?? 0
    extra[i] += margen
    extra[i + m[0].length - 1] += margen
  }
  return extra
}

export type OpcionesCorte = {
  ancho: number              // ancho de la columna, en px
  letra: number              // tamaño de la letra, en px
  sangriaPrimeraLinea: number // px que entra la primera línea con texto; 0 sin sangría
  espacios: ModoEspacios
  medir: (trozo: string, letra: number) => number // ancho de un trozo de texto con esa letra
  margenAcotacion?: number   // px a cada lado de cada acotación; 0 o sin poner, sin margen
}

// Los renglones de un texto: cada línea -separada por \n, un párrafo en el editor- se corta en
// renglones de a palabras, sin pasarse del ancho. Una palabra más ancha que la columna queda sola
// en su renglón. Devuelve el texto de cada renglón, sin los espacios del borde.
export function cortarRenglones(texto: string, o: OpcionesCorte): string[] {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n')
  const conSangria = o.sangriaPrimeraLinea > 0 ? primeraLineaConTexto(lineas) : -1
  const renglones: string[] = []
  lineas.forEach((linea, i) => {
    if (linea.trim() === '') return
    // Con normal, los espacios seguidos son uno y los del comienzo no cuentan.
    const limpia = o.espacios === 'normal' ? linea.replace(/ +/g, ' ').replace(/^ /, '') : linea
    // Trozos: cada palabra con los espacios que la siguen. Se corta solo después de un espacio.
    const trozos = limpia.match(/[^ ]*( +|$)/g)?.filter((t) => t !== '') ?? []
    let disponible = o.ancho - (i === conSangria ? o.sangriaPrimeraLinea : 0)
    // -segunda vuelta- El margen de las acotaciones se suma a lo que mide el trozo.
    const extra = margenesDeAcotacion(limpia, o.margenAcotacion ?? 0)
    const margenEntre = (desde: number, hasta: number) => extra.slice(desde, hasta).reduce((a, b) => a + b, 0)
    let actual = ''
    let inicio = 0 // dónde empieza el renglón actual dentro de la línea
    let fin = 0    // dónde termina lo que ya va en el renglón
    for (const t of trozos) {
      const palabra = t.replace(/ +$/, '')
      // Lo que tiene que caber: con break-spaces, la palabra y sus espacios; si no, solo hasta el
      // final de la palabra -los espacios del final cuelgan-.
      const cabe = (o.espacios === 'break-spaces' ? actual + t : actual + palabra)
      const hastaCabe = fin + (o.espacios === 'break-spaces' ? t.length : palabra.length)
      // Antes: if (actual !== '' && o.medir(cabe, o.letra) > disponible) {
      // -segunda vuelta- con el margen de las acotaciones que caen en ese tramo.
      if (actual !== '' && o.medir(cabe, o.letra) + margenEntre(inicio, hastaCabe) > disponible) {
        renglones.push(actual.trim())
        actual = ''
        inicio = fin
        disponible = o.ancho
      }
      actual += t
      fin += t.length
    }
    if (actual.trim() !== '') renglones.push(actual.trim())
  })
  return renglones
}
