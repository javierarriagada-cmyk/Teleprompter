import fs from 'fs'
import path from 'path'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { elegirMotor } from '../motor/elegirMotor'
import { MotorVosk } from '../motor/MotorVosk'
import { MotorWebSpeech } from '../motor/MotorWebSpeech'
import { MotorWhisperLocal } from '../motor/MotorWhisperLocal'
import { usePrecargaModelo } from '../hooks/usePrecargaModelo'

describe('Pruebas T60-T63, T69-T71 y T76 (Motor Vosk y Precarga)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T60: elegirMotor prioriza vosk sobre webspeech y whisper-local por omision (cuando esta listo) y permite seleccion explicita', async () => {
    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(true)
    vi.spyOn(MotorVosk.prototype, 'listo').mockResolvedValue(true)
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

  test('T63: GUARDIANA DEL BUILD: ningun archivo en src/motor/ instancia un Worker usando new URL(..., import.meta.url)', () => {
    const motorDir = path.resolve(__dirname, '../motor')
    const archivos = fs.readdirSync(motorDir)

    for (const archivo of archivos) {
      if (archivo.endsWith('.ts') || archivo.endsWith('.tsx')) {
        const rutaCompleta = path.join(motorDir, archivo)
        const contenido = fs.readFileSync(rutaCompleta, 'utf-8')

        expect(contenido).not.toMatch(/new\s+URL\s*\(\s*['"][^'"]*worker[^'"]*['"]\s*,\s*import\.meta\.url\s*\)/i)
      }
    }
  })

  test('T76: GUARDIANA DEL BUILD: ningun archivo fuera de src/workers/ importa valores desde un modulo worker', () => {
    // Un worker importa vosk-browser -5,8 MB de WASM- e instala su self.onmessage al
    // cargarse, asi que el empaquetador no lo puede podar. Traer aunque sea una constante
    // desde ahi al hilo principal arrastra el modulo entero al paquete que se baja todo
    // el mundo al abrir la aplicacion. Medido cuando paso: 204 kB -> 5.995 kB.
    //
    // El import con sufijo ?worker es el correcto y no cuenta: ese no trae el modulo,
    // devuelve el constructor y deja el worker en su propio archivo.
    const carpetas = ['../motor', '../hooks', '../lib', '../datos', '../components']

    for (const carpeta of carpetas) {
      const dir = path.resolve(__dirname, carpeta)
      if (!fs.existsSync(dir)) continue

      for (const archivo of fs.readdirSync(dir)) {
        if (!archivo.endsWith('.ts') && !archivo.endsWith('.tsx')) continue
        const contenido = fs.readFileSync(path.join(dir, archivo), 'utf-8')

        const importaDesdeWorker = /from\s+['"][^'"]*\.worker(\.ts)?['"]/i.test(contenido)
        expect(
          importaDesdeWorker,
          `${carpeta}/${archivo} importa desde un modulo worker sin el sufijo ?worker`
        ).toBe(false)
      }
    }
  })

  test('T69: usePrecargaModelo con un motor falso que responde "precargado" de inmediato termina en estado "listo", con progreso 1, y sin haber pedido ninguna descarga', async () => {
    vi.spyOn(MotorVosk.prototype, 'precargarModelo').mockImplementation(async function (this: MotorVosk) {
      this.progresoDescarga = 1
      return Promise.resolve()
    })

    const { result } = renderHook(() => usePrecargaModelo())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.estado).toBe('listo')
    expect(result.current.progreso).toBe(1)
    expect(result.current.error).toBeNull()
  })

  test('T70: MotorVosk.listo() devuelve false cuando CacheStorage no tiene el modelo, y true cuando si lo tiene', async () => {
    const motor = new MotorVosk()

    const matchMock = vi.fn()
    const openMock = vi.fn().mockResolvedValue({
      match: matchMock
    })

    const originalCaches = (globalThis as any).caches
    ;(globalThis as any).caches = { open: openMock }

    try {
      matchMock.mockResolvedValue(undefined)
      const listoSinModelo = await motor.listo()
      expect(listoSinModelo).toBe(false)
      expect(openMock).toHaveBeenCalledWith('vosk-model-v1')
      expect(matchMock).toHaveBeenCalledWith('https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.tar.gz')

      matchMock.mockResolvedValue(new Response('dummy'))
      const listoConModelo = await motor.listo()
      expect(listoConModelo).toBe(true)
    } finally {
      ;(globalThis as any).caches = originalCaches
    }
  })

  test('T71: GUARDIANA: a) elegirMotor sin preferido, con vosk disponible pero no listo y webspeech disponible, devuelve webspeech. b) elegirMotor("vosk") con preferido explicito devuelve vosk aunque listo() de false', async () => {
    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(true)
    vi.spyOn(MotorVosk.prototype, 'listo').mockResolvedValue(false)
    vi.spyOn(MotorWebSpeech.prototype, 'disponible').mockResolvedValue(true)

    const motorFallback = await elegirMotor()
    expect(motorFallback.id).toBe('webspeech')

    const motorExplicito = await elegirMotor('vosk')
    expect(motorExplicito.id).toBe('vosk')
  })
})
