// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026, orden «Tres correcciones», fallo 1. Esta rama no va a main ni a Play.
//
// lib/camara.ts, apagarCamara: distingue un cierre hecho de uno fallido. La prueba de App -flotanteSesionAndroid,
// 5a y 5b- comprueba que la ventana espera esta respuesta; aquí, que la respuesta sea la verdad de CameraPreview.stop().
// Antes -9-nov-2026, orden t162u, punto 3-: import { describe, test, expect, vi, beforeEach } from 'vitest'
// Razón: el grupo nuevo suelta en afterEach los arranques que una prueba en rojo deje colgados.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

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

// -9-nov-2026, orden t162u, punto 3- UN CIERRE CONFIRMADO CUBRE TODOS LOS ARRANQUES ANTERIORES. arranqueEnCurso guardaba
// una sola promesa: un segundo encenderCamara reemplazaba la del primero, el cierre esperaba solo al segundo y el primero,
// al terminar después, dejaba la cámara encendida con el cierre ya confirmado. Los start() quedan en las manos de la
// prueba -promesas controladas-, y se resuelven en el orden más adverso.
describe('un cierre confirmado cubre todos los arranques anteriores', () => {
  type Arranque = { pos: string; listo: boolean; terminar: () => void }
  let arranques: Arranque[] = []
  const ok = { width: 360, height: 640, x: 0, y: 0 }
  const pausa = (ms = 20) => new Promise((r) => setTimeout(r, ms))

  beforeEach(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stop.impl = async () => {}
    vi.mocked(CameraPreview.start).mockImplementation(async () => ok)
    await apagarCamara()
    expect(camaraEncendida()).toBe(false)
    arranques = []
    vi.mocked(CameraPreview.start).mockImplementation((o: any) => new Promise((r) => {
      const a: Arranque = { pos: o.position, listo: false, terminar: () => { a.listo = true; r(ok) } }
      arranques.push(a)
    }) as any)
    vi.mocked(CameraPreview.stop).mockClear()
    vi.mocked(CameraPreview.start).mockClear()
  })
  const pendiente = (pos: string) => arranques.find((a) => a.pos === pos && !a.listo)
  // Un arranque que una prueba en rojo dejó colgado no puede trabar las siguientes.
  afterEach(async () => {
    arranques.forEach((a) => { if (!a.listo) a.terminar() })
    vi.mocked(CameraPreview.start).mockImplementation(async () => ok)
    await pausa(40)
  })

  test('frontal pendiente, trasera y cierre: resuelta la trasera primero y la frontal al final, la cámara queda apagada', async () => {
    const frontal = encenderCamara('frontal')
    await pausa()
    const trasera = encenderCamara('trasera')
    let confirmado: boolean | undefined
    const cierre = apagarCamara({ conservarSiFalla: true }).then((v) => { confirmado = v; return v })
    await pausa()
    // Primero la trasera, si ya se pidió, y que se procese su cierre.
    pendiente('rear')?.terminar()
    await pausa(40)
    // Al final la frontal.
    pendiente('front')?.terminar()
    await pausa(40)
    // Lo que haya quedado en espera.
    for (let i = 0; i < 4; i++) { arranques.filter((a) => !a.listo).forEach((a) => a.terminar()); await pausa() }
    await Promise.all([frontal, trasera, cierre])
    expect(confirmado).toBe(true)
    expect(camaraEncendida()).toBe(false)
    // Restaurar el start de siempre para las pruebas siguientes.
    vi.mocked(CameraPreview.start).mockImplementation(async () => ok)
  })

  test('en serie: la trasera espera a la frontal y el cierre se confirma recién con la cámara liberada', async () => {
    const frontal = encenderCamara('frontal')
    const trasera = encenderCamara('trasera')
    let confirmado: boolean | undefined
    const cierre = apagarCamara({ conservarSiFalla: true }).then((v) => { confirmado = v; return v })
    await pausa()
    // El segundo arranque queda en espera: un solo start() pedido.
    expect(CameraPreview.start).toHaveBeenCalledTimes(1)
    expect(arranques.map((a) => a.pos)).toEqual(['front'])
    expect(confirmado).toBeUndefined()
    pendiente('front')!.terminar()
    await pausa()
    // Ahora la trasera -cierra la frontal antes-; el cierre sigue sin confirmar.
    expect(arranques.map((a) => a.pos)).toEqual(['front', 'rear'])
    expect(CameraPreview.stop).toHaveBeenCalledTimes(1)
    expect(confirmado).toBeUndefined()
    pendiente('rear')!.terminar()
    await Promise.all([frontal, trasera, cierre])
    expect(CameraPreview.stop).toHaveBeenCalledTimes(2)
    expect(confirmado).toBe(true)
    expect(camaraEncendida()).toBe(false)
    vi.mocked(CameraPreview.start).mockImplementation(async () => ok)
  })

  test('caso normal: una petición deliberada después del cierre enciende la cámara', async () => {
    vi.mocked(CameraPreview.start).mockImplementation(async () => ok)
    await encenderCamara('frontal')
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(true)
    expect(camaraEncendida()).toBe(false)
    await encenderCamara('trasera')
    expect(camaraEncendida()).toBe(true)
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(true)
    expect(camaraEncendida()).toBe(false)
  })

  test('el fallo de stop() sigue igual en la cola: false, la cámara sigue encendida y el siguiente cierre se pide', async () => {
    vi.mocked(CameraPreview.start).mockImplementation(async () => ok)
    await encenderCamara('frontal')
    stop.impl = async () => { throw new Error('la cámara no respondió') }
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(false)
    expect(camaraEncendida()).toBe(true)
    stop.impl = async () => {}
    expect(await apagarCamara({ conservarSiFalla: true })).toBe(true)
    expect(camaraEncendida()).toBe(false)
  })
})
