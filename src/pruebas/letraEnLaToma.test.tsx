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
// 28-09-2026: el cajon y el engranaje de LISTO se fueron. La letra se cambia en la ficha
// Aa; el ancho vive en la pantalla de Ajustes, abierta con Mas.
// 05-10-2026, tarea 93: en Grabar la pantalla de Ajustes se abre con la ficha Ajustes de la
// segunda fila -la flecha la muestra-; Más ya no está en Grabar.
describe('Letra y ancho en el cajon de la toma', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('L1 En LISTO, la ficha Aa sube la letra un paso y el ancho angosto se guarda en Ajustes.', async () => {
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

    fireEvent.click(screen.getByTestId('ficha-letra'))
    fireEvent.click(screen.getByLabelText('Aumentar letra panel'))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').fontSize).toBe(32)
    })

    // Antes (2026-10-05): fireEvent.click(screen.getByTestId('ficha-mas'))
    // Tarea 93: en Grabar ya no hay Más; Ajustes está en la segunda fila, detrás de la flecha.
    // -ajustes de pantallas, 10-10-2026- De pie Ajustes es el botón del dock y abre el panel ahí mismo,
    // con la misma fila de ancho. Antes:
    // fireEvent.click(screen.getByTestId('ficha-flecha'))
    // fireEvent.click(screen.getByTestId('ficha-ajustes'))
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    fireEvent.click(screen.getByTestId('fila-ancho-texto'))
    fireEvent.click(within(screen.getByTestId('dialogo-ancho')).getByRole('menuitemradio', { name: 'Angosto' }))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').columnaAngosta).toBe(true)
    })

    unmount()
  })
})
