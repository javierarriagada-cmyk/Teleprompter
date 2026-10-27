// -orden 2, punto 11- avisos de prueba y sin conexión.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sim = vi.hoisted(() => ({
  prueba: null as null | { vence: string },
  sinVerificar: false
}))

vi.mock('../lib/suscripcion', () => ({
  pruebaPorTerminar: () => sim.prueba,
  suscripcionSinVerificar: () => sim.sinVerificar
}))

import {
  tocaAvisoFinPrueba, marcarAvisoFinPrueba, tocaAvisoSinConexion,
  marcarAvisoSinConexionHoy, olvidarAvisosPortada
} from '../lib/avisosPortada'

beforeEach(() => {
  localStorage.clear()
  olvidarAvisosPortada()
  sim.prueba = null
  sim.sinVerificar = false
})

describe('avisosPortada', () => {
  it('aviso de prueba: una vez por vencimiento, no sin prueba', () => {
    expect(tocaAvisoFinPrueba()).toBeNull()
    sim.prueba = { vence: '2026-10-28T00:00:00Z' }
    expect(tocaAvisoFinPrueba()).toEqual({ vence: '2026-10-28T00:00:00Z' })
    marcarAvisoFinPrueba('2026-10-28T00:00:00Z')
    expect(tocaAvisoFinPrueba()).toBeNull()
    sim.prueba = { vence: '2026-11-01T00:00:00Z' }
    expect(tocaAvisoFinPrueba()).toEqual({ vence: '2026-11-01T00:00:00Z' })
  })

  it('sin conexión: una vez al día; deja de salir si ya no aplica', () => {
    const ahora = Date.parse('2026-10-26T15:00:00-03:00')
    expect(tocaAvisoSinConexion(ahora)).toBe(false)
    sim.sinVerificar = true
    expect(tocaAvisoSinConexion(ahora)).toBe(true)
    marcarAvisoSinConexionHoy(ahora)
    expect(tocaAvisoSinConexion(ahora)).toBe(false)
    sim.sinVerificar = false
    expect(tocaAvisoSinConexion(ahora + 86_400_000)).toBe(false)
  })
})
