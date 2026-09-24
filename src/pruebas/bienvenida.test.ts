import { describe, test, expect } from 'vitest'
import { bloqueDeBienvenida } from '../App'

// EL GUION "HOLA" MUESTRA LO QUE EXPLICA -24-09-2026-: la negrita, los tres colores y el
// destacado caen sobre las mismas palabras que los nombran.
describe('Guion de bienvenida', () => {
  test('B1 Cada formato cae sobre la palabra que lo nombra, y estan los cinco.', () => {
    const b = bloqueDeBienvenida()
    const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])
    expect(pintado).toEqual([
      ['negrita', 'negrita'],
      ['ámbar', 'ambar'],
      ['celeste', 'celeste'],
      ['verde salvia', 'salvia'],
      ['destacado amarillo', 'destacado']
    ])
  })

  test('B2 Empieza igual que siempre y termina invitando a escribir.', () => {
    const b = bloqueDeBienvenida()
    expect(b.texto.startsWith('Hola. Lee esto en voz alta')).toBe(true)
    expect(b.texto).toContain('Escríbenos a')
  })
})
