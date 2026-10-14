import { describe, it, expect } from 'vitest'
import { msDeMiniatura, MS_MINIATURA } from '../lib/tomaVideo'

// -15-10-2026- La foto de la toma, a los 3 s y no al 1: al segundo 1 la persona recien parte.
describe('La miniatura de la toma', () => {
  it('sin pausas, a los 3 s', () => {
    expect(MS_MINIATURA).toBe(3000)
    expect(msDeMiniatura(undefined, 30_000)).toBe(3000)
  })
  it('una toma corta, en su medio', () => {
    expect(msDeMiniatura(undefined, 4000)).toBe(2000)
    expect(msDeMiniatura([], 1000)).toBe(500)
  })
})
