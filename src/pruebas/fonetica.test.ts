import { describe, test, expect } from 'vitest'
import { metaphone, suenanParecido } from '../lib/fonetica'
import { tokenizarGuion, crearSeguidor } from '../lib/seguidor'

// LA COMPARACION POR SONIDO DEL INGLES -28-09-2026, docs/ingles.txt-. Los pares salen de las
// lecturas de la traductora: lo que dijo el guion y lo que oyo Vosk.
describe('Como suena una palabra en ingles', () => {
  test('F1 Las confusiones reales del reconocedor suenan parecido', () => {
    for (const [a, b] of [['words', 'wars'], ['shows', 'chose'], ['this', 'these'], ['read', 'write'], ['text', 'decks'], ['script', 'scrape']]) {
      expect(suenanParecido(a, b), `${a}/${b}`).toBe(true)
    }
  })

  test('F2 Palabras distintas no se confunden, y las cortas nunca calzan por sonido', () => {
    for (const [a, b] of [['loud', 'allowed'], ['soft', 'supply'], ['camera', 'comma'], ['the', 'a'], ['you', 'your'], ['to', 'two'], ['it', 'at']]) {
      expect(suenanParecido(a, b), `${a}/${b}`).toBe(false)
    }
  })

  test('F3 Claves de referencia de Metaphone', () => {
    expect(metaphone('words')).toBe('WRTS')
    expect(metaphone('thought')).toBe('0T')
    expect(metaphone('knight')).toBe('NT')
    expect(metaphone('highlight')).toBe('HLT')
  })
})

// EL SEGUIDOR CON EL IDIOMA DEL GUION. Una frase hecha solo con confusiones reales de las
// lecturas de la traductora: el guion dice "read this text, the words" y Vosk oye "write these
// decks the wars". Por letras calza una sola palabra -"the"- y el seguidor no se mueve; por
// sonido calzan las cinco. En espanol -o sin idioma- la comparacion es la de siempre.
describe('El seguidor compara por sonido solo en ingles', () => {
  const texto = 'Please read this text, the words matter more than you think today.'
  const guion = (idioma: string) => ({ id: 'g', titulo: 'g', idioma, creado: 0, modificado: 0, bloques: [{ id: 'b', nombre: '', texto }] })
  const oido = 'write these decks the wars'

  test('S1 En ingles, lo que suena igual calza y el seguidor avanza', () => {
    const p = crearSeguidor(tokenizarGuion(guion('en')), { idioma: 'en' }).avanzar(oido, 1000)
    expect(p.movio).toBe(true)
    expect(p.hastaToken).toBeGreaterThanOrEqual(5)
  })

  test('S2 Sin ingles, la misma frase se compara solo por letras, como siempre', () => {
    const soloLetras = crearSeguidor(tokenizarGuion(guion('es')), { idioma: 'es' }).avanzar(oido, 1000)
    const sinOpcion = crearSeguidor(tokenizarGuion(guion('es'))).avanzar(oido, 1000)
    expect(soloLetras).toEqual(sinOpcion)
    expect(soloLetras.movio).toBe(false)
  })
})
