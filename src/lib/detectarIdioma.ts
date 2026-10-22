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

// -portugues-voz, 2026-10-22- EL PORTUGUÉS DE BRASIL. Comparte con el español "de", "que", "se", "por", "para", "como":
// con las dos listas de arriba salía español -86 de 96 muestras, docs/investigacion/idiomas.md 11.7-.
// Encima de la decisión de siempre, que no cambia, se desempata portugués contra español con palabras
// que existen solo en uno de los dos y con letras propias: ñ para el español; ã, õ, ç y -ção/-ções
// para el portugués. Gana el portugués con al menos 3 y el doble que el español.
const SOLO_ES = new Set([
  'el', 'los', 'las', 'la', 'en', 'con', 'lo', 'su', 'sus', 'le', 'al', 'es', 'ya', 'sin', 'porque',
  'y', 'del', 'una', 'pero', 'muy', 'hay', 'donde', 'eso', 'esto', 'cuando', 'hasta', 'él', 'ella',
  'usted', 'ustedes', 'nosotros', 'hacer', 'puede', 'tiene', 'están', 'fue', 'estos', 'estas'
])
const SOLO_PT = new Set([
  'o', 'os', 'as', 'e', 'do', 'da', 'dos', 'das', 'um', 'não', 'mas', 'muito', 'há', 'onde', 'isso',
  'isto', 'até', 'ele', 'ela', 'você', 'vocês', 'nós', 'fazer', 'pode', 'tem', 'estão', 'foi', 'é',
  'são', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'ao', 'à'
])

// -portugues-voz, 2026-10-22, revisión de Javier- LAS SEÑALES QUE EL ESPAÑOL NO TIENE. SOLO_PT trae palabras que también son españolas -o, e,
// os, as, no, nos, dos, das, da, mas, pelo, pela-, y un texto español sin artículos contaba cero en
// español: «No sé. No quiero. No puedo...» salía portugués. Ahora el portugués necesita además al
// menos 2 de estas: una palabra de FUERTES_PT, una con ã, õ o ç, o una terminada en -ção/-ções.
// El detector no quita tildes: un texto escrito sin ellas trae «voce», «nao»; por eso van también
// esas formas, solo las que no existen en español -no «e», «a», «ha» ni «nos»-.
const FUERTES_PT = new Set([
  'do', 'um', 'não', 'muito', 'há', 'onde', 'isso', 'isto', 'até', 'ele', 'ela', 'você', 'vocês',
  'nós', 'fazer', 'pode', 'tem', 'estão', 'foi', 'é', 'são', 'na', 'nas', 'ao', 'à', 'eu', 'com',
  'uma', 'meu', 'minha', 'seu', 'sua', 'mais', 'também', 'então', 'hoje', 'agora',
  'nao', 'voce', 'voces', 'estao', 'sao', 'tambem', 'entao'
])
// Las de FUERTES_PT que no estaban en SOLO_PT se suman también ahí.
for (const p of FUERTES_PT) SOLO_PT.add(p)
const SENALES_PT_MINIMAS = 2

// -portugues-voz, 2026-10-22- Suma 'pt'. La propuesta de 11.7 devolvía null -o 'es'- en casos donde hoy sale otra
// cosa; la orden pide que español e inglés no cambien NADA. Por eso la decisión de siempre queda
// entera -detectarEsEn- y el portugués solo puede ganarle cuando se cumple su regla.
// Antes: export function detectarIdioma(texto: string): 'es' | 'en' | null {
export function detectarIdioma(texto: string): 'es' | 'en' | 'pt' | null {
  const base = detectarEsEn(texto)
  if (base === 'en') return 'en'
  const palabras = (texto || '').toLowerCase().match(/[\p{L}’']+/gu) || []
  if (palabras.length < PALABRAS_MINIMAS_PARA_DETECTAR) return base
  let es = 0
  let pt = 0
  let senales = 0
  for (const bruta of palabras) {
    const p = bruta.replace(/^['’]+|['’]+$/g, '')
    if (SOLO_ES.has(p) || p.includes('ñ')) es++
    if (SOLO_PT.has(p) || /[ãõç]|ções?$/.test(p)) pt++
    if (FUERTES_PT.has(p) || /[ãõç]|ções?$/.test(p)) senales++
  }
  // -portugues-voz, 2026-10-22, revisión de Javier- Además, al menos 2 señales que el español no tiene. Antes:
  //   if (pt >= FRECUENTES_MINIMAS && pt >= es * VENTAJA_MINIMA) return 'pt'
  if (pt >= FRECUENTES_MINIMAS && pt >= es * VENTAJA_MINIMA && senales >= SENALES_PT_MINIMAS) return 'pt'
  return base
}

// La decisión de siempre entre español e inglés, sin cambios --portugues-voz, 2026-10-22- solo se renombró-.
function detectarEsEn(texto: string): 'es' | 'en' | null {
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
