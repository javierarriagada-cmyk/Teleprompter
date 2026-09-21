import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { CameraPreview } from '@capgo/camera-preview'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

async function abrirGuionConTexto(titulo = 'Guion 66') {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-66',
    titulo,
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto de la coherencia' }]
  })
  const motorFake = new MotorFake()
  render(<App repoOverride={repo} motor={motorFake} />)
  fireEvent.click(await screen.findByTestId('fila-guion-g-66'))
  return motorFake
}

describe('Tarea 66 - dos puertas, un lienzo', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('el editor ofrece DOS puertas, y Leer no enciende la camara', async () => {
    await abrirGuionConTexto()

    expect(await screen.findByTestId('btn-leer-guion-fijo')).toBeDefined()
    expect(screen.getByTestId('btn-grabar-guion-fijo')).toBeDefined()
    expect(screen.queryByTestId('btn-modo-camara-apagada')).toBeNull()
    expect(screen.queryByTestId('btn-modo-camara-frontal')).toBeNull()
    expect(screen.queryByTestId('btn-modo-camara-trasera')).toBeNull()

    fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container')).toBeDefined()
    })
    const lienzo = screen.getByTestId('teleprompter-view-container')
    expect(lienzo.getAttribute('data-estado-toma')).toBe('listo')
    expect(lienzo.getAttribute('data-con-camara')).toBe('no')
    expect(screen.getByTestId('btn-empezar-toma')).toBeDefined()
    expect(screen.queryByTestId('btn-fondo-detras')).toBeNull()
    expect(screen.queryByTestId('btn-voltear-camara')).toBeNull()
    expect(CameraPreview.start).not.toHaveBeenCalled()
  })

  test('Grabar entra al mismo lienzo CON camara, Empezar no vuelve a llamar start', async () => {
    await abrirGuionConTexto()
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-con-camara')).toBe('si')
    })
    await waitFor(() => {
      expect(CameraPreview.start).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    expect(screen.getByTestId('btn-fondo-detras')).toBeDefined()
    expect(screen.getByTestId('btn-voltear-camara')).toBeDefined()

    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    })
    expect(CameraPreview.start).toHaveBeenCalledTimes(1)
  })

  // GUARDIANA DEL ARRASTRE DEL RECUADRO.
  //
  // RecuadroCamara esta en zIndex 0 y la capa de texto en 1. Si en LISTO esa
  // capa recibe punteros, se traga el pointerdown y el recuadro deja de seguir
  // al dedo. Paso al mudar el chrome en la 66 y Javier lo vio en el telefono.
  //
  // No se puede comprobar arrastrando: jsdom no hace hit-testing y el arrastre
  // pasaria igual con la capa encima. Lo que de verdad falla es esto, asi que
  // esto es lo que se comprueba.
  test('en LISTO la capa de texto deja pasar el dedo al recuadro; en LEYENDO se queda el gesto', async () => {
    await abrirGuionConTexto()
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })
    expect(screen.getByTestId('contenedor-lectura').style.pointerEvents).toBe('none')

    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    })
    expect(screen.getByTestId('contenedor-lectura').style.pointerEvents).toBe('auto')
  })
})
