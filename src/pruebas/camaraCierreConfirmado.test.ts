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

test('revisión: una apertura pendiente no puede revivir la cámara tras un cierre confirmado', async () => {
  await apagarCamara()
  let terminar!: (v: any) => void
  vi.mocked(CameraPreview.start).mockImplementationOnce(() => new Promise(r => { terminar = r }))
  const apertura = encenderCamara('frontal')
  const cierre = apagarCamara({ conservarSiFalla: true })
  terminar({ width: 360, height: 640, x: 0, y: 0 })
  await Promise.all([apertura, cierre])
  expect(await cierre).toBe(true)
  expect(camaraEncendida()).toBe(false)
})

// -9-nov-2026, orden t160u, punto 2- Lo que la prueba «revisión:» no mira: el cierre espera también un arranque que
// falla, y cambiar de cámara con la cámara encendida -encenderCamara cierra la anterior- no se espera a sí mismo.
describe('el cierre espera al arranque pendiente', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stop.impl = async () => {}
    await apagarCamara()
    vi.mocked(CameraPreview.stop).mockClear()
  })

  test('con start() pendiente, stop() no se llama hasta que start() termina, y se llama después', async () => {
    let terminar!: (v: any) => void
    vi.mocked(CameraPreview.start).mockImplementationOnce(() => new Promise(r => { terminar = r }))
    const apertura = encenderCamara('frontal')
    const cierre = apagarCamara({ conservarSiFalla: true })
    await new Promise((r) => setTimeout(r, 20))
    expect(CameraPreview.stop).not.toHaveBeenCalled()
    terminar({ width: 360, height: 640, x: 0, y: 0 })
    await apertura
    expect(await cierre).toBe(true)
    expect(CameraPreview.stop).toHaveBeenCalledTimes(1)
    expect(camaraEncendida()).toBe(false)
  })

  test('con start() pendiente que falla: el cierre espera, no hay nada que cerrar y da true', async () => {
    let fallar!: (e: unknown) => void
    vi.mocked(CameraPreview.start).mockImplementationOnce(() => new Promise((_r, rej) => { fallar = rej }))
    const apertura = encenderCamara('frontal')
    const cierre = apagarCamara({ conservarSiFalla: true })
    fallar(new Error('cámara ocupada'))
    await apertura
    expect(await cierre).toBe(true)
    expect(CameraPreview.stop).not.toHaveBeenCalled()
    expect(camaraEncendida()).toBe(false)
  })

  test('encender con la cámara ya encendida termina: cierra la anterior sin esperarse a sí mismo', async () => {
    await encenderCamara('frontal')
    const otra = encenderCamara('trasera')
    const resultado = await Promise.race([otra.then(() => 'terminó'), new Promise((r) => setTimeout(() => r('colgada'), 500))])
    expect(resultado).toBe('terminó')
    expect(CameraPreview.stop).toHaveBeenCalledTimes(1)
    expect(camaraEncendida()).toBe(true)
  })
})
