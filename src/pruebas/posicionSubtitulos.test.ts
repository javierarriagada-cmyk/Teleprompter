// TAREA 87, PARTE D1 -04-10-2026-: la posición de los subtítulos, pura.
import { describe, test, expect, beforeEach } from 'vitest'
import { margenAbajo, posicionGuardada, guardarPosicion, MARGEN_ABAJO_NORMAL, ZONA_REDES } from '../lib/posicionSubtitulos'

describe('La posición de los subtítulos', () => {
  beforeEach(() => localStorage.clear())
  // GUARDIANA de lo aprobado: "Normal" no cambia ni un píxel.
  test('margenAbajo normal es EXACTAMENTE 0,125', () => {
    expect(margenAbajo('normal')).toBe(0.125)
    expect(MARGEN_ABAJO_NORMAL).toBe(0.125)
  })
  test('redes es 0,35', () => {
    expect(margenAbajo('redes')).toBe(0.35)
    expect(ZONA_REDES).toEqual({ arriba: 0.14, abajo: 0.35, lados: 0.06 })
  })
  test('posicionGuardada devuelve normal con basura en localStorage', () => {
    expect(posicionGuardada()).toBe('normal')
    localStorage.setItem('sigo_subtitulos_posicion', '{basura')
    expect(posicionGuardada()).toBe('normal')
    guardarPosicion('redes')
    expect(localStorage.getItem('sigo_subtitulos_posicion')).toBe('redes')
    expect(posicionGuardada()).toBe('redes')
  })
})
