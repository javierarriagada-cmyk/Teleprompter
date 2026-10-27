import { describe, it, expect } from 'vitest'
import { pausaUsaMotorFijo } from '../lib/lecturaForzada'

describe('pausaUsaMotorFijo — arreglo pausa con lectura forzada', () => {
  it('con preferencia por voz pero lectura forzada a fija, la pausa va al motor fijo', () => {
    // Sin el arreglo (solo `fija`) esto sería false y ejecutarAccionPausa llamaría stop/start.
    expect(pausaUsaMotorFijo(false, true)).toBe(true)
  })

  it('con preferencia fija, sigue yendo al motor fijo', () => {
    expect(pausaUsaMotorFijo(true, false)).toBe(true)
  })

  it('con voz y sin forzar, no usa el motor fijo', () => {
    expect(pausaUsaMotorFijo(false, false)).toBe(false)
  })
})
