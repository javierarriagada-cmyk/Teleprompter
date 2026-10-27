// -orden 2, punto 11, 26-10-2026- Solo lógica de limites.ts.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  LIMITES_POR_OMISION, armarLimites, limiteValido,
  limiteDe, segundosQueQuedan, hayQueAvisar, llegoAlLimite, transcurridoSinPausas, olvidarLimites,
  accionAlLimiteLectura
} from '../lib/limites'

describe('limites', () => {
  beforeEach(() => { olvidarLimites() })

  it('valores por omisión', () => {
    // Antes: lecturaSeg: 300 (5 min). 27-10-2026 pasada teléfono: 240 (4 min); aviso 60 → a los 180.
    expect(LIMITES_POR_OMISION).toEqual({ lecturaSeg: 240, grabacionSeg: 180, avisoAntesSeg: 60 })
  })

  it('un valor remoto que no sirve cae al de siempre', () => {
    expect(limiteValido(29)).toBe(false)
    expect(limiteValido(7201)).toBe(false)
    expect(limiteValido(30.5)).toBe(false)
    expect(armarLimites({ lectura: 10, grabacion: null, aviso: null })).toEqual(LIMITES_POR_OMISION)
    expect(armarLimites({ lectura: 600, grabacion: 240, aviso: 30 })).toEqual({
      lecturaSeg: 600, grabacionSeg: 240, avisoAntesSeg: 30
    })
    expect(armarLimites({ lectura: 40, grabacion: 40, aviso: 60 }).avisoAntesSeg).toBe(30)
  })

  it('con suscripción no hay límite', () => {
    const l = LIMITES_POR_OMISION
    expect(limiteDe('lectura', l, true)).toBeNull()
    expect(segundosQueQuedan('grabacion', 10, l, true)).toBeNull()
    expect(hayQueAvisar('lectura', 250, l, true)).toBe(false)
    expect(llegoAlLimite('grabacion', 9999, l, true)).toBe(false)
  })

  it('el aviso y el límite llegan al segundo justo', () => {
    // Con omisión 240 / aviso 60: avisa desde 180; límite a los 240.
    const l = LIMITES_POR_OMISION
    expect(hayQueAvisar('lectura', 179, l, false)).toBe(false)
    expect(hayQueAvisar('lectura', 180, l, false)).toBe(true)
    expect(hayQueAvisar('lectura', 239, l, false)).toBe(true)
    expect(hayQueAvisar('lectura', 240, l, false)).toBe(false)
    expect(llegoAlLimite('lectura', 239, l, false)).toBe(false)
    expect(llegoAlLimite('lectura', 240, l, false)).toBe(true)
    expect(segundosQueQuedan('grabacion', 100, l, false)).toBe(80)
    expect(segundosQueQuedan('grabacion', 200, l, false)).toBe(0)
  })

  it('al límite de lectura se pausa (no se fuerza velocidad fija)', () => {
    // Sin el arreglo esto sería 'forzarFija'. 27-10-2026 pasada teléfono PR 157.
    expect(accionAlLimiteLectura()).toBe('pausar')
  })

  it('las pausas no cuentan', () => {
    expect(transcurridoSinPausas(10_000, 0, 4_000)).toBe(6)
    expect(transcurridoSinPausas(5_000, 0, 8_000)).toBe(0)
  })
})
