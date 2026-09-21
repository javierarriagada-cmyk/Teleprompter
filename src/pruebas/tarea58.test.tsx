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

describe('Pruebas TAREA 58 - UN LIENZO DE TOMA (T276)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('T276: Grabar entra al lienzo en LISTO con camara. Empezar pasa a LEYENDO. CameraPreview.start una sola vez. Leer entra al mismo lienzo SIN encender la camara.', async () => {
    const repoFrontal = new RepositorioMemoria()
    await repoFrontal.guardar({
      id: 'g-t276-frontal',
      titulo: 'Guion Frontal T276',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba frontal' }]
    })

    const motorFake = new MotorFake()
    const { unmount } = render(<App repoOverride={repoFrontal} motor={motorFake} />)

    const filaGuionFrontal = await screen.findByTestId('fila-guion-g-t276-frontal')
    fireEvent.click(filaGuionFrontal)

    const btnGrabar = await screen.findByTestId('btn-grabar-guion-fijo')
    fireEvent.click(btnGrabar)

    await waitFor(() => {
      const lienzo = screen.getByTestId('teleprompter-view-container')
      expect(lienzo.getAttribute('data-estado-toma')).toBe('listo')
      expect(lienzo.getAttribute('data-con-camara')).toBe('si')
    })
    expect(screen.queryByTestId('preparar-view-container')).toBeNull()

    await waitFor(() => {
      expect(CameraPreview.start).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByTestId('btn-empezar-toma'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    })
    expect(CameraPreview.start).toHaveBeenCalledTimes(1)

    unmount()

    const repoLeer = new RepositorioMemoria()
    await repoLeer.guardar({
      id: 'g-t276-apagada',
      titulo: 'Guion Apagada T276',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba apagada' }]
    })

    render(<App repoOverride={repoLeer} motor={motorFake} />)

    fireEvent.click(await screen.findByTestId('fila-guion-g-t276-apagada'))
    fireEvent.click(await screen.findByTestId('btn-leer-guion-fijo'))

    await waitFor(() => {
      const lienzo = screen.getByTestId('teleprompter-view-container')
      expect(lienzo.getAttribute('data-estado-toma')).toBe('listo')
      expect(lienzo.getAttribute('data-con-camara')).toBe('no')
    })
    expect(screen.queryByTestId('preparar-view-container')).toBeNull()
    expect(CameraPreview.start).toHaveBeenCalledTimes(1)
  })
})
