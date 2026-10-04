// TAREA 87, PARTE C -04-10-2026-: LA TOMA SABE SU FORMA. «1080x1920 con rotación» quiere decir que el
// archivo viene en 1920x1080 con rotación 90 o 270 y se ve en 1080x1920 -respuesta de Claude-.
import { describe, test, expect } from 'vitest'
import { orientacionDeToma } from '../lib/orientacion'
import { parsearSidecar, sidecarInicial } from '../lib/sidecar'
import { grabacionNueva } from '../datos/modelo'

describe('orientacionDeToma', () => {
  test('orientacionDeToma 1920x1080 con 90 es vertical', () => {
    expect(orientacionDeToma({ anchoPx: 1920, altoPx: 1080, rotacion: 90 })).toBe('vertical')
  })
  test('con 270 es vertical', () => {
    expect(orientacionDeToma({ anchoPx: 1920, altoPx: 1080, rotacion: 270 })).toBe('vertical')
  })
  test('con 0 y con 180 es horizontal', () => {
    expect(orientacionDeToma({ anchoPx: 1920, altoPx: 1080, rotacion: 0 })).toBe('horizontal')
    expect(orientacionDeToma({ anchoPx: 1920, altoPx: 1080, rotacion: 180 })).toBe('horizontal')
  })
  test('1080x1920 con 0 es vertical', () => {
    expect(orientacionDeToma({ anchoPx: 1080, altoPx: 1920, rotacion: 0 })).toBe('vertical')
  })
  test('1080x1080 es cuadrada', () => {
    expect(orientacionDeToma({ anchoPx: 1080, altoPx: 1080, rotacion: 90 })).toBe('cuadrada')
  })
  test('sin ancho es null', () => {
    expect(orientacionDeToma({ altoPx: 1080, rotacion: 90 })).toBeNull()
    expect(orientacionDeToma({ anchoPx: 0, altoPx: 1080 })).toBeNull()
  })
  test('parsearSidecar conserva orientacion', () => {
    const s = { ...sidecarInicial({ id: 't1', tituloGuion: 'x' }), orientacion: 'vertical' as const }
    expect(parsearSidecar(JSON.stringify(s))!.orientacion).toBe('vertical')
    expect(parsearSidecar(JSON.stringify({ ...s, orientacion: 'diagonal' }))!.orientacion).toBeUndefined()
  })
  // -04-10-2026, Javier simplifica la 87- Sin posicionGaleria: se sacó con "Para redes".
  test('grabacionNueva conserva orientacion', () => {
    const g = grabacionNueva({ tituloGuion: 'x', orientacion: 'vertical' })
    expect(g.orientacion).toBe('vertical')
  })
})
