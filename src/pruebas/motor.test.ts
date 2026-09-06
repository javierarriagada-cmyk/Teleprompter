import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { elegirMotor } from '../motor/elegirMotor'
import { MotorFake } from '../motor/MotorFake'
import { MotorWebSpeech } from '../motor/MotorWebSpeech'
import { MotorWhisperLocal } from '../motor/MotorWhisperLocal'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'

describe('Pruebas T57-T59 (Motor por omisión y transcripción en vivo)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T57: elegirMotor prioriza webspeech sobre whisper-local por omision', async () => {
    vi.spyOn(MotorWebSpeech.prototype, 'disponible').mockResolvedValue(true)
    vi.spyOn(MotorWhisperLocal.prototype, 'disponible').mockResolvedValue(true)

    const motor = await elegirMotor()
    expect(motor.id).toBe('webspeech')
  })

  test('T58: transcripción en vivo apagada por omisión no acumula texto en estado ni muestra panel, pero el seguidor y registro funcionan', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-58',
      titulo: 'Guion T58',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [
        {
          id: 'b-58',
          nombre: 'Bloque 1',
          texto: 'Hola mundo teleprompter esta es una prueba.'
        }
      ]
    }
    await repo.guardar(guion)

    const motorFake = new MotorFake(['Hola mundo teleprompter', 'esta es una prueba.'])
    vi.spyOn(motorFake, 'disponible').mockResolvedValue(true)

    const { container } = render(React.createElement(App, { motor: motorFake, repoOverride: repo }))

    // Abrir guion en editor y entrar a modo lectura
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const itemGuion = screen.getByText('Guion T58')
    await act(async () => {
      fireEvent.click(itemGuion)
    })

    const botonLectura = screen.getByText('▶ Leer Guión')
    await act(async () => {
      fireEvent.click(botonLectura)
    })

    // 1. Confirmar que por omision NO se muestra el panel "Transcripción (en vivo)"
    expect(screen.queryByText('Transcripción (en vivo):')).toBeNull()

    // 2. Comprobar que el checkbox "Ver transcripción en vivo" esta desmarcado por omision
    const checkbox = screen.getByLabelText(/Ver transcripción en vivo/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    // 3. Iniciar reproducción en motorFake y simular voz
    const botonIniciar = screen.getByText('Iniciar')
    await act(async () => {
      fireEvent.click(botonIniciar)
    })

    await act(async () => {
      motorFake.emitirParcial('Hola mundo')
    })

    // Sigue sin mostrarse el panel
    expect(screen.queryByText('Transcripción (en vivo):')).toBeNull()

    await act(async () => {
      motorFake.emitirSiguiente()
    })

    // 4. Activar el checkbox y verificar que ahora SÍ se muestra el panel con los siguientes datos
    await act(async () => {
      fireEvent.click(checkbox)
    })

    expect(screen.getByText('Transcripción (en vivo):')).not.toBeNull()

    await act(async () => {
      motorFake.emitirSiguiente()
    })

    expect(container.textContent).toContain('esta es una prueba.')
  })

  test('T59: casos borde: fallback cuando webspeech no esta disponible, seleccion manual de whisper y franja de estado con error', async () => {
    // 1. WebSpeech no disponible -> cae en whisper-local
    vi.spyOn(MotorWebSpeech.prototype, 'disponible').mockResolvedValue(false)
    vi.spyOn(MotorWhisperLocal.prototype, 'disponible').mockResolvedValue(true)

    const motorFallback = await elegirMotor()
    expect(motorFallback.id).toBe('whisper-local')

    // 2. Eleccion explicita del usuario a Whisper (whisper-local)
    vi.spyOn(MotorWebSpeech.prototype, 'disponible').mockResolvedValue(true)
    const motorEleccionPropia = await elegirMotor('whisper-local')
    expect(motorEleccionPropia.id).toBe('whisper-local')

    // 3. Ningún motor disponible -> lanza excepcion explicativa
    vi.spyOn(MotorWebSpeech.prototype, 'disponible').mockResolvedValue(false)
    vi.spyOn(MotorWhisperLocal.prototype, 'disponible').mockResolvedValue(false)

    await expect(elegirMotor()).rejects.toThrow(/Ningún motor de voz está disponible/i)

    // 4. Franja de estado en App muestra el mensaje de error cuando falla el motor
    const repo = new RepositorioMemoria()
    render(React.createElement(App, { repoOverride: repo }))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByText(/Franja de Estado:/i)).not.toBeNull()
    expect(screen.getByText(/Último Error Motor:/i)).not.toBeNull()
  })
})
