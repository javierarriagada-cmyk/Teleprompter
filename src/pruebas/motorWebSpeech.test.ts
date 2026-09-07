import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { MotorWebSpeech } from '../motor/MotorWebSpeech'

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []
  static startCalls = 0

  lang = ''
  continuous = false
  interimResults = false

  onresult: ((e: any) => void) | null = null
  onerror: ((e: any) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  start() {
    MockSpeechRecognition.startCalls++
    if (this.onstart) {
      this.onstart()
    }
  }

  stop() {}
  abort() {}
}

describe('Pruebas T72-T74 (Reconexión y manejo de errores en MotorWebSpeech)', () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = []
    MockSpeechRecognition.startCalls = 0
    ;(window as any).SpeechRecognition = MockSpeechRecognition
    ;(window as any).webkitSpeechRecognition = MockSpeechRecognition
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('T72: Se llama iniciar(). Se dispara onend sin haber llamado detener(). Despues de la espera, start() se llamo una segunda vez.', async () => {
    vi.useFakeTimers()
    const motor = new MotorWebSpeech()
    await motor.iniciar({ lang: 'es-ES' })

    expect(MockSpeechRecognition.startCalls).toBe(1)
    const instance = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]

    // Se dispara onend inesperadamente (Chrome corto la sesión)
    instance.onend?.()

    // Aún no han pasado los 250 ms
    expect(MockSpeechRecognition.startCalls).toBe(1)

    // Avanzamos los 250 ms
    vi.advanceTimersByTime(250)

    // start() debe haberse llamado por segunda vez
    expect(MockSpeechRecognition.startCalls).toBe(2)
  })

  test('T73: GUARDIANA. Se llama iniciar(), despues detener(), y recien ahi se dispara onend. start() NO se vuelve a llamar.', async () => {
    vi.useFakeTimers()
    const motor = new MotorWebSpeech()
    await motor.iniciar({ lang: 'es-ES' })

    expect(MockSpeechRecognition.startCalls).toBe(1)
    const instance = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]

    // El usuario presiona detener
    await motor.detener()

    // Chrome dispara onend tras ser detenido
    instance.onend?.()

    vi.advanceTimersByTime(1000)

    // start() NUNCA debe volver a llamarse
    expect(MockSpeechRecognition.startCalls).toBe(1)
  })

  test('T74: Se llama iniciar() y se dispara onend seis veces seguidas sin que llegue ningun resultado. En la sexta deja de reintentar y llega un aviso por onError. Y si entre medio llega un onresult, la cuenta se reinicia.', async () => {
    vi.useFakeTimers()
    const motor = new MotorWebSpeech()
    let errorRecibido: Error | null = null
    motor.onError((err) => {
      errorRecibido = err
    })

    await motor.iniciar({ lang: 'es-ES' })

    // Simular 5 reconexiones seguidas sin ningún resultado
    for (let i = 1; i <= 5; i++) {
      const currentInst = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
      currentInst.onend?.()
      vi.advanceTimersByTime(250)
      expect(MockSpeechRecognition.startCalls).toBe(i + 1)
      expect(errorRecibido).toBeNull()
    }

    // Llega un resultado (onresult) entre medio
    const instConResultado = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
    instConResultado.onresult?.({
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'texto reconocido' }], { isFinal: false })
      ]
    })

    // La cuenta debe haberse reiniciado a 0. Simulamos 5 reconexiones más
    for (let i = 1; i <= 5; i++) {
      const currentInst = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
      currentInst.onend?.()
      vi.advanceTimersByTime(250)
      expect(errorRecibido).toBeNull()
    }

    // En la 6ta reconexión consecutiva sin resultados:
    const instSexta = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
    instSexta.onend?.()

    // Debe dejar de reintentar y emitir el aviso por onError
    expect(errorRecibido).not.toBeNull()
    expect((errorRecibido as any).message).toMatch(/detuvo tras varios intentos/i)

    const totalCallsAtStop = MockSpeechRecognition.startCalls
    vi.advanceTimersByTime(1000)
    expect(MockSpeechRecognition.startCalls).toBe(totalCallsAtStop)
  })

  // T74b: la otra mitad de la T74. Sin esta, el tope de seis no distingue entre un
  // microfono roto y alguien que se quedo callado, y las dos cosas matan el motor.
  test('T74b: un cierre despues de un rato normal es silencio, no fallo: no consume el tope', async () => {
    vi.useFakeTimers()
    const motor = new MotorWebSpeech()
    let errorRecibido: Error | null = null
    motor.onError((err) => {
      errorRecibido = err
    })

    await motor.iniciar({ lang: 'es-ES' })

    // Diez pausas seguidas, cada una despues de que el reconocedor estuvo vivo ocho
    // segundos: es Chrome cerrando por silencio, que es lo que hace siempre. El motor
    // tiene que seguir reconectando, sin quejarse, mas alla del tope de seis.
    for (let i = 1; i <= 10; i++) {
      vi.advanceTimersByTime(8000)
      const inst = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
      inst.onend?.()
      vi.advanceTimersByTime(250)
      expect(errorRecibido).toBeNull()
      expect(MockSpeechRecognition.startCalls).toBe(i + 1)
    }

    // Y en cambio seis cierres inmediatos seguidos si son un fallo y cortan.
    for (let i = 1; i <= 6; i++) {
      const inst = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
      inst.onend?.()
      vi.advanceTimersByTime(250)
    }
    expect(errorRecibido).not.toBeNull()
  })

  test('Error not-allowed: emite el error de inmediato y no reintenta ni una vez', async () => {
    vi.useFakeTimers()
    const motor = new MotorWebSpeech()
    let errorRecibido: Error | null = null
    motor.onError((err) => {
      errorRecibido = err
    })

    await motor.iniciar({ lang: 'es-ES' })
    const startCount = MockSpeechRecognition.startCalls

    const instance = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
    instance.onerror?.({ error: 'not-allowed' })

    expect(errorRecibido).not.toBeNull()
    expect((errorRecibido as any).message).toContain('not-allowed')

    // Si posteriormente Chrome dispara onend, no debe reintentar
    instance.onend?.()
    vi.advanceTimersByTime(1000)

    expect(MockSpeechRecognition.startCalls).toBe(startCount)
  })
})
