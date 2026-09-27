import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

// LA LETRA Y EL ANCHO EN EL CAJON DE LA TOMA -27-09-2026-. Javier los extrano justo antes
// de grabar. La prueba atraviesa la app entera -portada, editor, Grabar, engranaje- porque
// lo que falla es conectar: los botones podian estar dibujados y no mover el ajuste.
describe('Letra y ancho en el cajon de la toma', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('L1 En el cajon de la toma, la A grande sube la letra un paso y el ancho angosto se guarda.', async () => {
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ fontSize: 24, modoCamara: 'frontal', fondoToma: 'detras' }))
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-letra',
      titulo: 'Guion letra',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto para probar la letra en la toma' }]
    })
    const { unmount } = render(<App repoOverride={repo} motor={new MotorFake()} />)

    fireEvent.click(await screen.findByTestId('fila-guion-g-letra'))
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })

    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))
    const letra = screen.getByRole('group', { name: 'Tamaño de letra' })
    fireEvent.click(within(letra).getByRole('button', { name: 'Aumentar letra panel' }))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').fontSize).toBe(32)
    })

    const ancho = screen.getByRole('group', { name: 'Ancho del texto' })
    fireEvent.click(within(ancho).getByRole('button', { name: 'Angosto' }))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').columnaAngosta).toBe(true)
    })

    unmount()
  })
})
