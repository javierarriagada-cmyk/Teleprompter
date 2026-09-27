// COMO SUENA UNA PALABRA EN INGLES -28-09-2026, docs/ingles.txt-.
//
// El reconocedor ingles oye bien el sonido y se equivoca en la palabra: en las lecturas de la
// traductora oyo "wars" por "words", "chose" por "shows", "these aren't allowed" por "this out
// loud". El seguidor comparaba solo por letras -una distinta cada cuatro- y esas no calzaban.
// Medido: 5 de las 12 perdidas eran al arrancar, por "read this out loud", y las demas por
// frases con varias de estas.
//
// Metaphone -Lawrence Philips, 1990-: reduce una palabra inglesa a una clave de consonantes
// segun como suena. "words" -> WRTS y "wars" -> WRS; "shows" y "chose" -> XS; "this" y "these"
// -> 0S. Es el algoritmo clasico, escrito aca para no sumar una dependencia -AGENTS.md-.
//
// Solo para guiones en INGLES: el espanol se escribe como suena y el seguidor ya lo resolvia
// -Javier, 27-09-2026: "en espanol el asunto esta solucionado"-.

const VOCALES = 'AEIOU'
const esVocal = (c: string | undefined) => !!c && VOCALES.includes(c)

export function metaphone(palabra: string): string {
  let w = palabra.toUpperCase().replace(/[^A-Z]/g, '')
  if (!w) return ''
  // Comienzos que no suenan como se escriben.
  if (/^(AE|GN|KN|PN|WR)/.test(w)) w = w.slice(1)
  if (w[0] === 'X') w = 'S' + w.slice(1)
  if (w.startsWith('WH')) w = 'W' + w.slice(2)

  let clave = ''
  for (let i = 0; i < w.length; i++) {
    const c = w[i], ant = w[i - 1], sig = w[i + 1], sig2 = w[i + 2]
    // Letras dobles suenan una vez, salvo la C -"accept"-.
    if (c === ant && c !== 'C') continue
    switch (c) {
      case 'A': case 'E': case 'I': case 'O': case 'U':
        if (i === 0) clave += c
        break
      case 'B':
        if (!(ant === 'M' && i === w.length - 1)) clave += 'B'
        break
      case 'C':
        if (sig === 'I' && sig2 === 'A') clave += 'X'
        else if (sig === 'H') clave += ant === 'S' ? 'K' : 'X'
        else if (sig === 'I' || sig === 'E' || sig === 'Y') { if (ant !== 'S') clave += 'S' }
        else clave += 'K'
        break
      case 'D':
        clave += sig === 'G' && (sig2 === 'E' || sig2 === 'I' || sig2 === 'Y') ? 'J' : 'T'
        break
      case 'G':
        if (sig === 'H' && !(i + 2 >= w.length || esVocal(sig2))) break
        if (sig === 'N' && (i + 2 === w.length || (w.slice(i + 1) === 'NED'))) break
        if ((sig === 'I' || sig === 'E' || sig === 'Y') && ant !== 'G') clave += 'J'
        else clave += 'K'
        break
      case 'H':
        // ant puede no existir -H inicial-: 'CSPTG'.includes('') da true y la H se perdia.
        if (esVocal(sig) && !(ant !== undefined && 'CSPTG'.includes(ant))) clave += 'H'
        break
      case 'K':
        if (ant !== 'C') clave += 'K'
        break
      case 'P':
        clave += sig === 'H' ? 'F' : 'P'
        break
      case 'Q': clave += 'K'; break
      case 'S':
        if (sig === 'H') clave += 'X'
        else if (sig === 'I' && (sig2 === 'O' || sig2 === 'A')) clave += 'X'
        else clave += 'S'
        break
      case 'T':
        if (sig === 'I' && (sig2 === 'O' || sig2 === 'A')) clave += 'X'
        else if (sig === 'H') clave += '0'
        else if (!(sig === 'C' && sig2 === 'H')) clave += 'T'
        break
      case 'V': clave += 'F'; break
      case 'W': case 'Y':
        if (esVocal(sig)) clave += c
        break
      case 'X': clave += 'KS'; break
      case 'Z': clave += 'S'; break
      default: clave += c // F J L M N R
    }
  }
  return clave
}

function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    let diag = d[0]
    d[0] = j
    for (let i = 1; i <= a.length; i++) {
      const tmp = d[i]
      d[i] = Math.min(d[i] + 1, d[i - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return d[a.length]
}

// SE PARECEN POR SONIDO. Las palabras cortas -"a", "to", "it"- no entran: con una o dos letras
// casi todas suenan parecido y el seguidor calzaria donde no corresponde. Misma clave, o una
// consonante de diferencia si las claves ya dicen algo -tres o mas-: "wars"/"words".
export function suenanParecido(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false
  const ka = metaphone(a), kb = metaphone(b)
  if (!ka || !kb) return false
  if (ka === kb) return true
  return Math.min(ka.length, kb.length) >= 3 && distancia(ka, kb) <= 1
}
