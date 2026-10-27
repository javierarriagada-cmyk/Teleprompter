import { describe, it, expect } from 'vitest'
import { pausaUsaMotorFijo, tokenSeguidorAlVolverAVoz } from '../lib/lecturaForzada'

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

describe('tokenSeguidorAlVolverAVoz — arreglo al suscribirse desde el límite', () => {
  it('lleva el seguidor a la posición del motor fijo (entera), no a la del corte de voz', () => {
    const tokenAlLimite = 50
    const posicionMotorFijo = 100.7
    // Sin el arreglo no se llamaba irATokenSeguidor y la voz volvía desde tokenAlLimite.
    expect(tokenSeguidorAlVolverAVoz(posicionMotorFijo)).toBe(100)
    expect(tokenSeguidorAlVolverAVoz(posicionMotorFijo)).not.toBe(tokenAlLimite)
  })

  it('con posición entera no retrocede', () => {
    expect(tokenSeguidorAlVolverAVoz(42)).toBe(42)
  })
})
