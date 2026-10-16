// EL RECUADRO NO SE GUARDA EN UNA POSICIÓN INVÁLIDA, Y EL 0,0 DE LA 0.9.1 SE CORRIGE UNA SOLA VEZ
// -recuadro-arrastre, 15-10-2026-. Pruebas de lógica.
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { aceptarPosicionRecuadro } from '../components/RecuadroCamara'
import { corregirRecuadroEnCero, MARCA_RECUADRO_CORREGIDO } from '../app/ajustesIniciales'

describe('aceptarPosicionRecuadro', () => {
  test('NaN, negativo, más de 1 o infinito: no guarda y avisa por qué', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const guardar = vi.fn()
    for (const [x, y] of [[NaN, 0.5], [0.5, NaN], [-0.01, 0.5], [0.5, -1], [1.01, 0.5], [0.5, 2], [Infinity, 0.5]]) {
      expect(aceptarPosicionRecuadro(x, y, guardar)).toBe(false)
    }
    expect(guardar).not.toHaveBeenCalled()
    expect(aviso).toHaveBeenCalledTimes(7)
    expect(String(aviso.mock.calls[0][0])).toContain('entre 0 y 1')
    aviso.mockRestore()
  })
  test('fracciones entre 0 y 1, bordes incluidos: guarda', () => {
    const guardar = vi.fn()
    expect(aceptarPosicionRecuadro(0.64, 0.52, guardar)).toBe(true)
    expect(aceptarPosicionRecuadro(0, 1, guardar)).toBe(true)
    expect(guardar.mock.calls).toEqual([[0.64, 0.52], [0, 1]])
  })
})

describe('corregirRecuadroEnCero', () => {
  beforeEach(() => localStorage.clear())
  test('la primera vez, 0,0 vuelve a 0.64 y 0.52 y queda guardado; la segunda, un 0,0 elegido se respeta', () => {
    expect(corregirRecuadroEnCero({ recuadroX: 0, recuadroY: 0, tema: 'oscuro' })).toEqual({ recuadroX: 0.64, recuadroY: 0.52, tema: 'oscuro' })
    expect(JSON.parse(localStorage.getItem('teleprompter_ajustes')!)).toMatchObject({ recuadroX: 0.64, recuadroY: 0.52 })
    expect(localStorage.getItem(MARCA_RECUADRO_CORREGIDO)).toBe('1')
    expect(corregirRecuadroEnCero({ recuadroX: 0, recuadroY: 0 })).toEqual({ recuadroX: 0, recuadroY: 0 })
  })
  test('otra posición no se toca, y la marca queda puesta igual', () => {
    expect(corregirRecuadroEnCero({ recuadroX: 0, recuadroY: 0.3 })).toEqual({ recuadroX: 0, recuadroY: 0.3 })
    expect(localStorage.getItem(MARCA_RECUADRO_CORREGIDO)).toBe('1')
    expect(corregirRecuadroEnCero({ recuadroX: 0, recuadroY: 0 })).toEqual({ recuadroX: 0, recuadroY: 0 })
  })
})
