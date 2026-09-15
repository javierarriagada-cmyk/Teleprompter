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

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // 1. Comprobar que en la biblioteca, el checkbox "Ver transcripción en vivo" está desmarcado por omisión
    const btnMenuBiblio = screen.getByTestId('btn-menu-superior-biblioteca')
    await act(async () => {
      fireEvent.click(btnMenuBiblio)
    })

    const checkbox = screen.getByLabelText(/Ver transcripción en vivo/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    // Cerrar menú biblioteca tocando afuera
    await act(async () => {
      fireEvent.pointerDown(document.body)
    })

    // Abrir guion en editor y entrar a modo lectura
    const itemGuion = screen.getByText('Guion T58')
    await act(async () => {
      fireEvent.click(itemGuion)
    })

    // Entrar a lectura
    const botonLectura = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(botonLectura)
    })

    await act(async () => {
      motorFake.emitirParcial('Hola mundo')
    })

    // Sigue sin mostrarse la transcripción en vivo en la toma de lectura
    expect(screen.queryByText('Transcripción (en vivo):')).toBeNull()

    await act(async () => {
      motorFake.emitirSiguiente()
    })

    // 2. Traer controles mínimos en lectura y volver al editor
    const prompterView = container.querySelector('[data-testid="teleprompter-view-container"]')!
    await act(async () => {
      fireEvent.click(prompterView)
    })

    const btnVolver = screen.getByText('← Salir')
    await act(async () => {
      fireEvent.click(btnVolver)
    })

    // 3. Activar el checkbox en la Biblioteca
    const btnSalir = screen.getByText('‹ Guiones')
    await act(async () => {
      fireEvent.click(btnSalir)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    })

    const checkboxActual = screen.getByLabelText(/Ver transcripción en vivo/i)
    await act(async () => {
      fireEvent.click(checkboxActual)
    })

    // Volver a abrir el guion
    const itemGuion2 = screen.getByText('Guion T58')
    await act(async () => {
      fireEvent.click(itemGuion2)
    })

    // Volver a lectura
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))
    })

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

    // 4. Franja de estado en App muestra el mensaje de error cuando falla el motor (activando primero el diagnóstico)
    const repo = new RepositorioMemoria()
    render(React.createElement(App, { repoOverride: repo }))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // La franja de diagnóstico se activa tocando/haciendo clic en el resumen del encabezado
    const resumen = screen.getByTestId('resumen-encabezado-biblioteca')
    await act(async () => {
      fireEvent.click(resumen)
    })

    expect(screen.getByText(/Franja de Estado:/i)).not.toBeNull()
    expect(screen.getByText(/Último Error Motor:/i)).not.toBeNull()
  })

  test('T134: GUARDIANA DEL MOTOR POR OMISION. Sin permiso de microfono todavia, Web Speech SIGUE estando disponible y no se arranca ninguna sesion para averiguarlo.', async () => {
    // Se simula el navegador de alguien que entra por primera vez: la interfaz existe,
    // pero el permiso no se dio, asi que cualquier intento de arrancar contesta
    // 'not-allowed'. Es exactamente el estado de un telefono al abrir el sitio publicado.
    const arranques: string[] = []

    class ReconocedorSinPermiso {
      lang = ''
      onerror: ((e: any) => void) | null = null
      onstart: (() => void) | null = null
      start() {
        arranques.push('start')
        setTimeout(() => {
          if (this.onerror) this.onerror({ error: 'not-allowed' })
        }, 0)
      }
      stop() {}
      abort() {}
    }

    const previo = (window as any).SpeechRecognition
    ;(window as any).SpeechRecognition = ReconocedorSinPermiso as any

    try {
      const motor = new MotorWebSpeech()

      // 1. Se considera DISPONIBLE: el navegador sabe hacerlo. Que no haya permiso todavia
      //    no es lo mismo que que no se pueda.
      expect(await motor.disponible()).toBe(true)

      // 2. Y no se arranco ninguna sesion para averiguarlo. Esto es lo que evitaba que el
      //    cartel del microfono saltara al cargar la pagina, antes de que la persona
      //    apretara nada.
      expect(arranques).toEqual([])

      // 3. La consecuencia que importa: elegirMotor se queda en Web Speech y NO cae en
      //    Whisper Local, que se baja el modelo entero desde Hugging Face.
      vi.spyOn(MotorWhisperLocal.prototype, 'disponible').mockResolvedValue(true)
      const elegido = await elegirMotor()
      expect(elegido.id).toBe('webspeech')
    } finally {
      ;(window as any).SpeechRecognition = previo
    }
  })
})
