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

describe('Pruebas TAREA 59 - LOS OTROS DOS FONDOS (T277)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('T277: con la camara en frontal, en la pantalla de preparar: a) con fondoToma en "detras", CameraPreview.start se inicio con dimensiones completas (x: 0, y: 0) y NO hay recuadro en el DOM. b) al elegir "recuadro", el recuadro SI esta en el DOM (y su posicion Y corresponde a las fracciones sobre la VISTA, no sobre el body) y CameraPreview.setPreviewSize se llamo con las coordenadas del recuadro (x > 0, y > 0). c) al elegir "oculta", el recuadro YA NO esta en el DOM, Y LA PISTA DE LA CAMARA NO SE APAGO: stop() no fue llamado y se aplico setOpacity(0).', async () => {
    // Simular que el contenedor de la vista mide 800px de alto
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        if (this.getAttribute?.('data-testid') === 'teleprompter-view-container') return 800
        return 800
      }
    })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 400
      }
    })

    localStorage.setItem(
      'teleprompter_ajustes',
      JSON.stringify({ modoCamara: 'frontal', fondoToma: 'detras' })
    )

    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-t277',
      titulo: 'Guion T277',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba T277' }]
    })

    const motorFake = new MotorFake()
    const { unmount } = render(<App repoOverride={repo} motor={motorFake} />)

    // Abrir guion
    const filaGuion = await screen.findByTestId('fila-guion-g-t277')
    fireEvent.click(filaGuion)

    const btnGrabar = await screen.findByTestId('btn-grabar-guion-fijo')
    fireEvent.click(btnGrabar)

    await waitFor(() => {
      const lienzo = screen.getByTestId('teleprompter-view-container')
      expect(lienzo.getAttribute('data-estado-toma')).toBe('listo')
      expect(lienzo.getAttribute('data-con-camara')).toBe('si')
    })

    // a. Con fondoToma en 'detras', CameraPreview.start se inicio a pantalla completa (x: 0, y: 0) y NO hay recuadro en el DOM
    await waitFor(() => {
      expect(CameraPreview.start).toHaveBeenCalled()
    })
    const startArgs = (CameraPreview.start as any).mock.calls[0][0]
    expect(startArgs.x).toBe(0)
    expect(startArgs.y).toBe(0)
    expect(screen.queryByTestId('recuadro-camara')).toBeNull()

    // 28-09-2026: los fondos viven en la ficha de camara, no en el cajon.
    fireEvent.click(screen.getByTestId('ficha-camara'))

    // b. Al elegir 'recuadro', el recuadro SI esta en el DOM y se notifica la posicion a CameraPreview
    const btnRecuadro = screen.getByTestId('btn-fondo-recuadro')
    fireEvent.click(btnRecuadro)

    let recuadroEl: HTMLElement | null = null
    await waitFor(() => {
      recuadroEl = screen.getByTestId('recuadro-camara')
      expect(recuadroEl).toBeDefined()
    })

    // Comprobar que recien montado, la posicion Y (top) corresponde a 0.52 x 800 = 416px (alto de la vista), y NO a una vista colapsada
    const topPx = parseFloat(recuadroEl!.style.top)
    expect(topPx).toBeGreaterThan(300) // ~416px con vista de 800px

    // Verificar que CameraPreview.setPreviewSize fue llamado con coordenadas de recuadro (x > 0, y > 0)
    expect(CameraPreview.setPreviewSize).toHaveBeenCalled()
    const resizeArgs = (CameraPreview.setPreviewSize as any).mock.calls[(CameraPreview.setPreviewSize as any).mock.calls.length - 1][0]
    expect(resizeArgs.x).toBeGreaterThan(0)
    expect(resizeArgs.y).toBeGreaterThan(0)

    // c. Al elegir 'oculta', el recuadro no esta en el DOM, Y LA PISTA DE LA CAMARA NO SE APAGO: stop() no fue llamado
    const btnOculta = screen.getByTestId('btn-fondo-oculta')
    fireEvent.click(btnOculta)

    await waitFor(() => {
      expect(screen.queryByTestId('recuadro-camara')).toBeNull()
    })

    // El cartelito de aviso de camara encendida debe estar en el documento
    expect(screen.getByTestId('aviso-camara-encendida')).toBeDefined()

    // LA GUARDIANA DE VERDAD: CameraPreview.stop() NO fue llamado al cambiar a modo oculta
    expect(CameraPreview.stop).not.toHaveBeenCalled()
    // En su lugar, se invocó setOpacity({ opacity: 0 })
    expect(CameraPreview.setOpacity).toHaveBeenCalledWith({ opacity: 0 })

    unmount()
  })
})
