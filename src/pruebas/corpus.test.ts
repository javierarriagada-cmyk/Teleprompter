import { describe, expect, test, vi, afterEach } from 'vitest'
import { iniciarGrabacion, detenerGrabacion, estadoGrabador, registroComoTexto } from '../lib/grabadorCorpus'
import { anotar, cantidadEntradas, activarDiagnostico } from '../lib/diagnostico'

// Un grabador de mentira que NO dispara onstart solo. Asi se puede mirar el rato que hay
// entre "pedi grabar" y "empezo a grabar", que es justo donde vive el defecto que esta
// prueba protege.
class GrabadorFalso {
  static ultimo: GrabadorFalso | null = null
  state = 'inactive'
  ondataavailable: ((e: any) => void) | null = null
  onstart: (() => void) | null = null
  onstop: ((e: any) => void) | null = null
  onerror: ((e: any) => void) | null = null
  mimeType = 'audio/webm'

  constructor(_stream: any, _opts?: any) {
    GrabadorFalso.ultimo = this
  }
  static isTypeSupported(_t: string) {
    return true
  }
  start(_ms?: number) {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    if (this.ondataavailable) this.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    if (this.onstop) this.onstop({} as any)
  }
  // Lo dispara la prueba a mano, para simular la demora del navegador.
  dispararOnstart() {
    if (this.onstart) this.onstart()
  }
}

function prepararNavegador() {
  const pista = { stop: vi.fn() }
  ;(globalThis as any).MediaRecorder = GrabadorFalso as any
  ;(globalThis as any).Blob = Blob
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [pista] })
    }
  })
  return pista
}

describe('Corpus de medicion del motor (paso 1 del plan)', () => {
  afterEach(() => {
    activarDiagnostico(false)
    vi.restoreAllMocks()
  })

  test('T135: GUARDIANA DEL RELOJ. El milisegundo cero del registro es el instante en que ARRANCA EL AUDIO, no el instante en que se pidio grabar.', async () => {
    prepararNavegador()

    await iniciarGrabacion({
      guionTitulo: 'Guion de prueba',
      guionTexto: 'una dos tres',
      motor: 'Motor Fake para Pruebas'
    })

    // Entre pedir permiso y que el navegador confirme que empezo a grabar puede pasar un
    // rato. Lo que ocurra en ese rato NO pertenece a la grabacion: si se anotara, quedaria
    // con un milisegundo que no corresponde a ningun sonido del archivo de audio.
    anotar({ tipo: 'oyo', texto: 'esto pasa ANTES de que arranque el audio', final: false })
    expect(cantidadEntradas()).toBe(0)

    // Ahora si: el navegador confirma que empezo a grabar. Aca, y solo aca, arranca el reloj.
    GrabadorFalso.ultimo!.dispararOnstart()
    expect(estadoGrabador()).toBe('grabando')

    anotar({ tipo: 'oyo', texto: 'esto ya es parte de la grabacion', final: false })
    expect(cantidadEntradas()).toBe(1)

    // Y su marca de tiempo arranca cerca de cero, porque el origen se acaba de fijar.
    const texto = registroComoTexto()
    const linea = texto.split('\n').find((l) => l.includes('esto ya es parte de la grabacion'))
    expect(linea).toBeDefined()
    const ms = Number(linea!.split('\t')[0])
    expect(ms).toBeGreaterThanOrEqual(0)
    expect(ms).toBeLessThan(200)

    await detenerGrabacion()
    expect(estadoGrabador()).toBe('listo')
  })

  test('T136: El registro que se descarga lleva el guion y el motor adentro, para que el audio no quede huerfano.', async () => {
    prepararNavegador()

    await iniciarGrabacion({
      guionTitulo: 'Prueba de cabecera',
      guionTexto: 'primera linea\nsegunda linea',
      motor: 'Web Speech API (Navegador)'
    })
    GrabadorFalso.ultimo!.dispararOnstart()
    anotar({ tipo: 'cuadro', posicion: 12.5, calce: 12, scroll: 340, freno: '-' })
    await detenerGrabacion()

    const texto = registroComoTexto()

    // Sin el guion, el audio no se puede alinear: el alineador necesita las palabras.
    expect(texto).toContain('primera linea')
    expect(texto).toContain('segunda linea')
    // Sin saber que motor se uso, la medicion no se puede atribuir a nada.
    expect(texto).toContain('Web Speech API (Navegador)')
    // Y la capa que faltaba: lo que la pantalla estaba mostrando.
    expect(texto).toContain('pos=12.50')
  })
})
