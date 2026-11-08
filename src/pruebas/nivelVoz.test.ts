// -proxima-version, 2026-11-08- Las pruebas de lógica del nivel del micrófono -lib/nivelVoz.ts-: el paso del
// rms a 0..1, el suavizado, la vuelta a 0 sin eventos y el canal. Cómo se ve el disco lo juzga Javier.
import { describe, expect, test } from 'vitest'
import { rmsANivel, suavizarNivel, objetivoNivel, publicarNivelVoz, suscribirNivelVoz, SIN_EVENTOS_MS } from '../lib/nivelVoz'

const rmsDeDb = (db: number) => Math.pow(10, db / 20)

describe('nivelVoz - el rms a 0..1', () => {
  test('rms 0 da 0', () => {
    expect(rmsANivel(0)).toBe(0)
  })
  test('-60 dB da 0 y menos también', () => {
    expect(rmsANivel(rmsDeDb(-60))).toBeCloseTo(0, 9)
    expect(rmsANivel(rmsDeDb(-80))).toBe(0)
  })
  test('-20 dB da 1 y más también', () => {
    expect(rmsANivel(rmsDeDb(-20))).toBeCloseTo(1, 9)
    expect(rmsANivel(rmsDeDb(-5))).toBe(1)
  })
  test('lo de en medio crece parejo en dB', () => {
    expect(rmsANivel(rmsDeDb(-50))).toBeCloseTo(0.25, 9)
    expect(rmsANivel(rmsDeDb(-40))).toBeCloseTo(0.5, 9)
    expect(rmsANivel(rmsDeDb(-30))).toBeCloseTo(0.75, 9)
  })
})

describe('nivelVoz - el suavizado', () => {
  test('sube más rápido de lo que baja', () => {
    const subida = suavizarNivel(0, 1, 50)
    const bajada = 1 - suavizarNivel(1, 0, 50)
    expect(subida).toBeGreaterThan(0)
    expect(bajada).toBeGreaterThan(0)
    expect(subida).toBeGreaterThan(bajada * 2)
  })
  test('sin eventos por más de medio segundo, vuelve a 0', () => {
    const rms = rmsDeDb(-30)
    expect(objetivoNivel(rms, 1000, 1000 + SIN_EVENTOS_MS - 1)).toBeCloseTo(0.75, 9)
    expect(objetivoNivel(rms, 1000, 1000 + SIN_EVENTOS_MS + 1)).toBe(0)
    expect(objetivoNivel(rms, null, 0)).toBe(0)
    // Y el nivel suavizado llega a 0 andando cuadro a cuadro.
    let nivel = 1
    for (let t = 0; t < 5000; t += 16) nivel = suavizarNivel(nivel, objetivoNivel(rms, 0, 600 + t), 16)
    expect(nivel).toBeLessThan(0.001)
  })
})

describe('nivelVoz - el canal', () => {
  test('quien se suscribe recibe lo publicado; al desuscribirse deja de recibir', () => {
    const recibidos: number[] = []
    const salir = suscribirNivelVoz((rms) => recibidos.push(rms))
    publicarNivelVoz(0.1, 1)
    publicarNivelVoz(0.2, 2)
    salir()
    publicarNivelVoz(0.3, 3)
    expect(recibidos).toEqual([0.1, 0.2])
  })
})
