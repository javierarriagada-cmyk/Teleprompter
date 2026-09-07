import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { elegirMotor } from '../motor/elegirMotor'
import { MotorVosk } from '../motor/MotorVosk'
import { MotorWebSpeech } from '../motor/MotorWebSpeech'
import { MotorWhisperLocal } from '../motor/MotorWhisperLocal'

describe('Pruebas T60-T62 (Motor Vosk)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T60: elegirMotor prioriza vosk sobre webspeech y whisper-local por omision y permite seleccion explicita', async () => {
    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(true)
    vi.spyOn(MotorWebSpeech.prototype, 'disponible').mockResolvedValue(true)
    vi.spyOn(MotorWhisperLocal.prototype, 'disponible').mockResolvedValue(true)

    const motorOmision = await elegirMotor()
    expect(motorOmision.id).toBe('vosk')

    const motorExplicito = await elegirMotor('vosk')
    expect(motorExplicito.id).toBe('vosk')

    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(false)
    const motorFallbackWebspeech = await elegirMotor()
    expect(motorFallbackWebspeech.id).toBe('webspeech')
  })

  test('T61: MotorVosk implementa la interfaz MotorDeVoz, comprueba disponibilidad y suscribe onProgreso', async () => {
    const motor = new MotorVosk()
    expect(motor.id).toBe('vosk')
    expect(motor.nombre).toContain('Vosk')

    const estaDisponible = await motor.disponible()
    expect(typeof estaDisponible).toBe('boolean')

    let progresoRecibido = -1
    const unsub = motor.onProgreso((pct) => {
      progresoRecibido = pct
    })

    expect(typeof unsub).toBe('function')
    unsub()
  })

  test('T62: MotorVosk no falla en silencio al fallar la inicializacion o no tener audio disponible', async () => {
    const motor = new MotorVosk()

    vi.spyOn(motor, 'disponible').mockResolvedValue(false)

    await expect(motor.iniciar({ lang: 'es-ES' })).rejects.toThrow(/no está disponible/i)
  })
})
