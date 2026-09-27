// EN QUE IDIOMA ESTA UN GUION -D2 de docs/ingles.txt, 27-09-2026-. Decide que reconocedor
// escucha al leerlo. Se detecta solo al escribir o pegar, y la persona lo puede cambiar con
// un toque en el editor; si lo elige a mano, ya no se cambia solo -Guion.idiomaElegido-.
//
// Cuenta palabras frecuentes de cada idioma. No hace falta mas: un guion es texto corrido,
// y en cualquier parrafo de espanol aparecen "de", "que", "el"; en uno de ingles, "the",
// "and", "of". Con menos de 12 palabras no decide: el titulo o una frase suelta no alcanzan
// y el guion se queda con el idioma que tenia.

// Las dos listas NO comparten palabras, ni palabras que el otro idioma use seguido: "a",
// "no" y "me" se escriben igual en los dos y quedaron afuera; "he" tambien -en espanol es
// "he visto"-. Una palabra en las dos listas empata sola cualquier texto mezclado.
const FRECUENTES_ES = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'los', 'se', 'del', 'las', 'un', 'por', 'con', 'una',
  'su', 'para', 'es', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'este', 'porque',
  'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'hasta', 'hay', 'donde',
  'desde', 'todo', 'nos', 'eso', 'esto', 'tu', 'te', 'qué'
])

const FRECUENTES_EN = new Set([
  'the', 'and', 'of', 'to', 'in', 'is', 'you', 'that', 'it', 'was', 'for', 'on', 'are', 'as',
  'with', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'had', 'by', 'but', 'not',
  'what', 'all', 'were', 'we', 'when', 'your', 'can', 'there', 'an', 'which', 'their', 'if',
  'will', 'my', 'it’s', "it's", 'don’t', "don't"
])

// Con menos palabras que esto, no se decide.
export const PALABRAS_MINIMAS_PARA_DETECTAR = 12
// Y ademas el que gana tiene que tener al menos el doble de frecuentes que el otro, y al
// menos tres: un texto mitad y mitad, o uno sin ninguna palabra comun, se queda como estaba.
const VENTAJA_MINIMA = 2
const FRECUENTES_MINIMAS = 3

export function detectarIdioma(texto: string): 'es' | 'en' | null {
  if (!texto) return null
  // Las acotaciones -entre corchetes- son notas para quien lee, no lo que se dice; igual
  // estan en el idioma del guion, asi que cuentan. Solo se sacan los signos.
  const palabras = texto.toLowerCase().match(/[\p{L}’']+/gu) || []
  if (palabras.length < PALABRAS_MINIMAS_PARA_DETECTAR) return null
  let es = 0
  let en = 0
  for (const bruta of palabras) {
    const p = bruta.replace(/^['’]+|['’]+$/g, '')
    if (FRECUENTES_ES.has(p)) es++
    else if (FRECUENTES_EN.has(p)) en++
  }
  if (es >= FRECUENTES_MINIMAS && es >= en * VENTAJA_MINIMA && es > en) return 'es'
  if (en >= FRECUENTES_MINIMAS && en >= es * VENTAJA_MINIMA && en > es) return 'en'
  return null
}
