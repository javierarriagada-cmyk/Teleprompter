// TAREA 88, SEGUNDA VUELTA -04-10-2026-: EL FIN DE LA ÚLTIMA PALABRA, DEL REGISTRO A Date.now().
// lib/diagnostico.ts, tomarFinUltimaPalabraEpochMs: MotorNativo anota las palabras del FINAL en el reloj
// del registro -performance.now() - t0-; aquí se vuelven a Date.now() una sola vez. Con lógica: se rompió
// a propósito -devolviendo el fin sin convertir- antes de dejarla como está.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { activarDiagnostico, anotar, msDelRegistro, tomarFinUltimaPalabraEpochMs } from '../lib/diagnostico'

afterEach(() => {
  vi.restoreAllMocks()
  activarDiagnostico(false)
})

describe('Tarea 88, segunda vuelta: el fin de la última palabra', () => {
  test('pasa el fin de la última palabra del FINAL a Date.now(), una vez', () => {
    // performance.now() = 1 000 y Date.now() = 1 700 000 000 000: la diferencia es la del teléfono.
    vi.spyOn(performance, 'now').mockReturnValue(1_000)
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    activarDiagnostico(true) // t0 = 1 000
    // El audio empezó en performance 500 -ceroAudioPerf-; «ellos» terminó a los 14,6 s del audio.
    const cero = 500
    anotar({ tipo: 'palabras', final: true, palabras: [
      { w: 'para', ini: msDelRegistro(cero + 13_900), fin: msDelRegistro(cero + 14_200) },
      { w: 'ellos', ini: msDelRegistro(cero + 14_250), fin: msDelRegistro(cero + 14_608) }
    ] })
    // perf del fin = 500 + 14 608 = 15 108 -> Date.now() = 15 108 + (1 700 000 000 000 - 1 000).
    expect(tomarFinUltimaPalabraEpochMs()).toBe(1_700_000_000_000 - 1_000 + 15_108)
    // Una sola vez: el siguiente FINAL sin palabras con hora da null.
    expect(tomarFinUltimaPalabraEpochMs()).toBeNull()
  })

  test('los parciales no cuentan', () => {
    activarDiagnostico(true)
    anotar({ tipo: 'palabras', final: false, palabras: [{ w: 'hola', ini: 0, fin: 300 }] })
    expect(tomarFinUltimaPalabraEpochMs()).toBeNull()
  })
})
