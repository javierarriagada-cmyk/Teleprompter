// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026, orden «Tres correcciones», fallo 1. Esta rama no va a main ni a Play.
//
// lib/camara.ts, apagarCamara: distingue un cierre hecho de uno fallido. La prueba de App -flotanteSesionAndroid,
// 5a y 5b- comprueba que la ventana espera esta respuesta; aquí, que la respuesta sea la verdad de CameraPreview.stop().
import { describe, test, expect, vi, beforeEach } from 'vitest'

const stop = vi.hoisted(() => ({ impl: async () => {} }))
vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn(() => stop.impl()),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

import { CameraPreview } from '@capgo/camera-preview'
import { encenderCamara, apagarCamara, camaraEncendida, errorDelUltimoApagado } from '../lib/camara'

describe('apagarCamara dice si la cámara se cerró', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stop.impl = async () => {}
    await apagarCamara()
    await encenderCamara('frontal')
    expect(camaraEncendida()).toBe(true)
    vi.mocked(CameraPreview.stop).mockClear()
  })

  test('stop() hecho: true, apagada y sin error', async () => {
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(true)
    expect(camaraEncendida()).toBe(false)
    expect(errorDelUltimoApagado()).toBeNull()
    expect(CameraPreview.stop).toHaveBeenCalledTimes(1)
  })

  test('stop() fallido con conservarSiFalla: false, sigue encendida y con el motivo', async () => {
    stop.impl = async () => { throw new Error('la cámara no respondió') }
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(false)
    expect(camaraEncendida()).toBe(true)
    expect(errorDelUltimoApagado()).toBe('la cámara no respondió')
    // Y el próximo cierre se vuelve a pedir: la cámara sigue siendo de Grabar.
    stop.impl = async () => {}
    expect(await apagarCamara()).toBe(true)
    expect(CameraPreview.stop).toHaveBeenCalledTimes(2)
    expect(camaraEncendida()).toBe(false)
    expect(errorDelUltimoApagado()).toBeNull()
  })

  test('stop() fallido sin la opción: false, pero marcada como apagada, como antes', async () => {
    stop.impl = async () => { throw new Error('ocupada') }
    expect(await apagarCamara()).toBe(false)
    expect(camaraEncendida()).toBe(false)
    expect(errorDelUltimoApagado()).toBe('ocupada')
  })

  test('sin cámara encendida no hay nada que cerrar: true sin llamar a stop()', async () => {
    await apagarCamara()
    vi.mocked(CameraPreview.stop).mockClear()
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(true)
    expect(CameraPreview.stop).not.toHaveBeenCalled()
  })
})
