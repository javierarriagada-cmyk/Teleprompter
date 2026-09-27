import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { elegirMotor } from '../motor/elegirMotor'
import { MotorFake } from '../motor/MotorFake'
import { MotorVosk } from '../motor/MotorVosk'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'

describe('Pruebas T57-T59 (Motor por omisión y transcripción en vivo)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T57: elegirMotor devuelve vosk por omision', async () => {
    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(true)
    vi.spyOn(MotorVosk.prototype, 'listo').mockResolvedValue(true)

    const motor = await elegirMotor()
    expect(motor.id).toBe('vosk')
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

    // 600 y no 50: con 50 la pantalla de entrada todavia esta encima y la
    // tarjeta no ha terminado de armarse, asi que el titulo -que es la puerta
    // de diagnostico- no existe aun. El resto de las pruebas de portada usan
    // este mismo numero.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // 1. El checkbox "Ver transcripción en vivo" está desmarcado por omisión.
    //
    // Ya no vive en el menu del engranaje: es un instrumento nuestro, no una
    // preferencia, y desde la tarea 68 los tres -motor, transcripcion y
    // medicion- estan detras de la puerta de diagnostico. Se abre con 5 toques
    // en la marca (Tarea 74).
    const marca58 = document.querySelector('.portada-marca') as HTMLElement
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca58)
      }
    })

    // Por el texto y su label envolvente, no por getByLabelText: el control
    // vive ahora en la franja de diagnostico y asi no depende de como
    // testing-library resuelva el nombre accesible de un label que envuelve.
    await screen.findByTestId('franja-de-estado-diagnostico')
    const checkbox = (screen.getByText('Ver transcripción en vivo').closest('label') as HTMLLabelElement)
      .querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    // Cerrar menú biblioteca tocando afuera
    await act(async () => {
      fireEvent.pointerDown(document.body)
    })

    // Abrir guion en editor y entrar a modo lectura
    const itemGuion = screen.getByTestId('fila-guion-g-58')
    await act(async () => {
      fireEvent.click(itemGuion)
    })

    const botonLectura = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(botonLectura)
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
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

    const btnVolver = screen.getByTestId('btn-salir-lectura')
    await act(async () => {
      fireEvent.click(btnVolver)
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-volver-listo'))
    })

    // 3. Activar el checkbox en la Biblioteca
    const btnSalir = screen.getByText('Guiones')
    await act(async () => {
      fireEvent.click(btnSalir)
    })

    // NO se vuelve a tocar la marca: la puerta de diagnostico CONMUTA, no
    // abre.
    const checkboxActual = (screen.getByText('Ver transcripción en vivo').closest('label') as HTMLLabelElement)
      .querySelector('input[type="checkbox"]') as HTMLInputElement
    await act(async () => {
      fireEvent.click(checkboxActual)
    })

    // Volver a abrir el guion
    const itemGuion2 = screen.getByTestId('fila-guion-g-58')
    await act(async () => {
      fireEvent.click(itemGuion2)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    })

    await act(async () => {
      motorFake.emitirSiguiente()
    })

    expect(container.textContent).toContain('esta es una prueba.')
  })

  test('T59: casos borde: ningun motor disponible y franja de estado con error', async () => {
    // 1. Ningún motor disponible -> lanza excepcion explicativa
    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(false)

    await expect(elegirMotor()).rejects.toThrow(/Ningún motor de voz está disponible/i)

    // 2. Franja de estado en App muestra el mensaje de error cuando falla el motor (activando primero el diagnóstico)
    const repo = new RepositorioMemoria()
    render(React.createElement(App, { repoOverride: repo }))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // La franja de diagnóstico se activa con 5 toques en la marca de la portada (Tarea 74)
    const marca59 = document.querySelector('.portada-marca') as HTMLElement
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca59)
      }
    })

    expect(screen.getByText(/Franja de Estado:/i)).not.toBeNull()
    expect(screen.getByText(/Último Error Motor:/i)).not.toBeNull()
  })
})
