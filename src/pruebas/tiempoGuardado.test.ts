// TAREA 87, E2 -04-10-2026-: el tiempo estimado antes de guardar, puro.
import { describe, test, expect } from 'vitest'
import { segundosEstimados, textoTiempo, MS_GUARDADO_POR_MINUTO, UMBRAL_TIEMPO_ESTIMADO_MS } from '../lib/tiempoGuardado'

describe('El tiempo estimado de guardado', () => {
  test('UNA TOMA DE 1 MIN ESTIMA 15 S', () => {
    expect(segundosEstimados(60_000)).toBe(15)
  })
  test('UNA DE 5 MIN ESTIMA 60 S', () => {
    expect(segundosEstimados(300_000)).toBe(60)
  })
  test('UNA DE 20 MIN ESTIMA 225 S', () => {
    expect(segundosEstimados(1_200_000)).toBe(225)
  })
  test('BAJO EL UMBRAL NO HAY ESTIMADO', () => {
    expect(UMBRAL_TIEMPO_ESTIMADO_MS).toBe(60_000)
    expect(segundosEstimados(59_999)).toBeNull()
    expect(segundosEstimados(60_000)).toBe(15)
    expect(segundosEstimados(Number.NaN)).toBeNull()
  })
  // GUARDIANA: lo medido en el moto g86 -paso 0: 12,2 s en 1 min y 58,7 s en 5 min- queda dentro,
  // y ninguno pasa en más de 5 s lo medido.
  test('LO MEDIDO EN EL MOTO G86 QUEDA DENTRO', () => {
    expect(MS_GUARDADO_POR_MINUTO).toBe(11200)
    const uno = segundosEstimados(60_000)!
    const cinco = segundosEstimados(300_000)!
    expect(uno).toBeGreaterThanOrEqual(12.2)
    expect(cinco).toBeGreaterThanOrEqual(58.7)
    expect(uno - 12.2).toBeLessThanOrEqual(5)
    expect(cinco - 58.7).toBeLessThanOrEqual(5)
  })
  test('textoTiempo: 15 s, 1 min y 3 min 45 s', () => {
    expect(textoTiempo(15)).toBe('15 s')
    expect(textoTiempo(60)).toBe('1 min')
    expect(textoTiempo(225)).toBe('3 min 45 s')
  })
})
