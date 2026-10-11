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
// cortarRenglones arma los renglones con esas reglas, con una medida de letras que se le pasa.
// La app no la usa para dibujar -eso lo hace el navegador-: sirve para probar con lógica, sin
// layout, que con las reglas de cada lado los cortes salen iguales.

// LA SANGRÍA DE LA PRIMERA LÍNEA. Vivía en TeleprompterView.tsx -ajustes de pantallas, 10-10-2026-,
// donde está la explicación larga. Se mudó acá para que el editor la use sin importar la lectura
// entera: TeleprompterView importa App, y App importa el editor.
export const SANGRIA_PRIMERA_LINEA_PX = 14

// La primera línea con texto, la que lleva la sangría: se saltan las líneas en blanco del comienzo.
// -1 si no hay ninguna. Es la misma cuenta que hace la lectura en cada bloque.
export function primeraLineaConTexto(lineas: string[]): number {
  return lineas.findIndex((x) => x.trim() !== '')
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

export type OpcionesCorte = {
  ancho: number              // ancho de la columna, en px
  letra: number              // tamaño de la letra, en px
  sangriaPrimeraLinea: number // px que entra la primera línea con texto; 0 sin sangría
  espacios: ModoEspacios
  medir: (trozo: string, letra: number) => number // ancho de un trozo de texto con esa letra
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
    let actual = ''
    for (const t of trozos) {
      const palabra = t.replace(/ +$/, '')
      // Lo que tiene que caber: con break-spaces, la palabra y sus espacios; si no, solo hasta el
      // final de la palabra -los espacios del final cuelgan-.
      const cabe = (o.espacios === 'break-spaces' ? actual + t : actual + palabra)
      if (actual !== '' && o.medir(cabe, o.letra) > disponible) {
        renglones.push(actual.trim())
        actual = ''
        disponible = o.ancho
      }
      actual += t
    }
    if (actual.trim() !== '') renglones.push(actual.trim())
  })
  return renglones
}
