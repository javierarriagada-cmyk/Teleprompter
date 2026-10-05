// TAREA 88 -04-10-2026-: LOS TRAMOS DE UNA TOMA CON PAUSAS -src/lib/tramos.ts, puro-. docs/tarea88.txt,
// sección 4. Pruebas con lógica: se rompieron a propósito contra funciones vacías antes de escribirlas.
import { describe, test, expect } from 'vitest'
import { tramosACortar, tramosQueQuedan, aSalida, aArchivo, duracionFinal } from '../lib/tramos'

describe('Tarea 88: los tramos', () => {
  test('acota a 0 y a la duración', () => {
    expect(tramosACortar([{ desdeMs: -800, hastaMs: 2000, origen: 'palma' }, { desdeMs: 9000, hastaMs: null, origen: 'boton' }], 10_000))
      .toEqual([{ desdeMs: 0, hastaMs: 2000 }, { desdeMs: 9000, hastaMs: 10_000 }])
    expect(tramosACortar([{ desdeMs: 9500, hastaMs: 14_000, origen: 'boton' }], 10_000)).toEqual([{ desdeMs: 9500, hastaMs: 10_000 }])
  })
  test('junta cortes que se pisan', () => {
    expect(tramosACortar([
      { desdeMs: 5000, hastaMs: 7000, origen: 'boton' },
      { desdeMs: 1000, hastaMs: 3000, origen: 'boton' },
      { desdeMs: 2500, hastaMs: 4000, origen: 'palma' },
      { desdeMs: 7000, hastaMs: 8000, origen: 'boton' }
    ], 20_000)).toEqual([{ desdeMs: 1000, hastaMs: 4000 }, { desdeMs: 5000, hastaMs: 8000 }])
  })
  test('pausa de 0 ms no corta', () => {
    expect(tramosACortar([{ desdeMs: 3000, hastaMs: 3000, origen: 'boton' }], 10_000)).toEqual([])
    expect(tramosQueQuedan([], 10_000)).toEqual([{ desdeMs: 0, hastaMs: 10_000 }])
  })
  test('aSalida en un corte es null', () => {
    const cortes = [{ desdeMs: 2000, hastaMs: 5000 }]
    expect(aSalida(2000, cortes)).toBeNull()
    expect(aSalida(4999, cortes)).toBeNull()
    expect(aSalida(5000, cortes)).toBe(2000)
    expect(aSalida(1999, cortes)).toBe(1999)
  })
  test('aSalida después de dos cortes resta los dos', () => {
    const cortes = [{ desdeMs: 2000, hastaMs: 5000 }, { desdeMs: 8000, hastaMs: 9000 }]
    expect(aSalida(10_000, cortes)).toBe(10_000 - 3000 - 1000)
    expect(aSalida(6000, cortes)).toBe(3000)
    expect(tramosQueQuedan(cortes, 12_000)).toEqual([{ desdeMs: 0, hastaMs: 2000 }, { desdeMs: 5000, hastaMs: 8000 }, { desdeMs: 9000, hastaMs: 12_000 }])
  })
  test('aArchivo es la inversa fuera de los cortes', () => {
    const cortes = [{ desdeMs: 2000, hastaMs: 5000 }, { desdeMs: 8000, hastaMs: 9000 }]
    for (const t of [0, 1999, 5000, 6500, 7999, 9000, 11_000]) expect(aArchivo(aSalida(t, cortes)!, cortes)).toBe(t)
    // El borde de una unión cae en lo que sigue al corte, no en el corte.
    expect(aArchivo(2000, cortes)).toBe(5000)
  })
  test('duracionFinal', () => {
    expect(duracionFinal([{ desdeMs: 2000, hastaMs: 5000 }, { desdeMs: 8000, hastaMs: 9000 }], 12_000)).toBe(8000)
    expect(duracionFinal([], 12_000)).toBe(12_000)
  })
})
