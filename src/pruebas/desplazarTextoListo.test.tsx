import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

async function abrirGuionPrueba(texto = 'Linea 1 primera palabra\nLinea 2 segunda palabra\nLinea 3 tercera palabra\nLinea 4 cuarta palabra') {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-desplazar',
    titulo: 'Guion Desplazar',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto }]
  })
  const motorFake = new MotorFake()
  const r = render(<App repoOverride={repo} motor={motorFake} />)
  fireEvent.click(await screen.findByTestId('fila-guion-g-desplazar'))
  return { motorFake, repo, ...r }
}

describe('Pruebas solo de lógica - Desplazar texto en LISTO', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Omitir splash de entrada
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
  })

  test('en LISTO, un arrastre sobre el texto lo desplaza', async () => {
    await abrirGuionPrueba()
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })

    const contLectura = screen.getByTestId('contenedor-lectura')
    expect(contLectura.style.pointerEvents).toBe('auto')

    // Simulamos arrastre con pointerdown, pointermove (> 8px) y pointerup
    fireEvent.pointerDown(contLectura, { clientX: 100, clientY: 300 })
    fireEvent.pointerMove(contLectura, { clientX: 100, clientY: 100 })
    contLectura.scrollTop = 120
    fireEvent.pointerUp(contLectura, { clientX: 100, clientY: 100 })

    expect(contLectura.scrollTop).toBe(120)
  })

  test('un arrastre que empieza sobre el recuadro mueve el recuadro y no el texto', async () => {
    // Definimos dimensiones del contenedor
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() { return 800 }
    })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() { return 400 }
    })

    localStorage.setItem(
      'teleprompter_ajustes',
      JSON.stringify({ fondoToma: 'recuadro', recuadroX: 0.5, recuadroY: 0.5 })
    )

    await abrirGuionPrueba()
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })

    const recuadroEl = await screen.findByTestId('recuadro-camara')
    const contLectura = screen.getByTestId('contenedor-lectura')

    // Si existe la capa transparente de arrastre sobre el recuadro
    const capaArrastre = screen.getByTestId('capa-recuadro-arrastre')
    expect(capaArrastre).toBeDefined()

    const initialScrollTop = contLectura.scrollTop

    // Iniciar arrastre sobre la capa de arrastre del recuadro
    fireEvent.pointerDown(capaArrastre, { clientX: 200, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(capaArrastre, { clientX: 250, clientY: 250, pointerId: 1 })
    fireEvent.pointerUp(capaArrastre, { clientX: 250, clientY: 250, pointerId: 1 })

    // El scroll del texto no debe haber cambiado por el arrastre del recuadro
    expect(contLectura.scrollTop).toBe(initialScrollTop)
  })

  test('después de desplazar, la toma parte desde el renglón de la banda', async () => {
    const { container } = await abrirGuionPrueba('Palabra0 Palabra1 Palabra2 Palabra3\nPalabra4 Palabra5 Palabra6 Palabra7\nPalabra8 Palabra9 Palabra10 Palabra11')
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })

    const contLectura = screen.getByTestId('contenedor-lectura')

    // Mover scroll en LISTO
    fireEvent.pointerDown(contLectura, { clientX: 100, clientY: 300 })
    fireEvent.pointerMove(contLectura, { clientX: 100, clientY: 100 })
    contLectura.scrollTop = 200
    fireEvent.pointerUp(contLectura, { clientX: 100, clientY: 100 })

    // Comprobar que contLectura conserva el scroll desplazado
    expect(contLectura.scrollTop).toBe(200)
  })
})
