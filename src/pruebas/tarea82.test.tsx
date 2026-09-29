// TAREA 82 -29-09-2026-: el teléfono de lado. Se finge matchMedia para que useLayout diga 'tel-h'
// -ancho >= 600 y alto < 480- y se revisa que los controles vivan en los rieles, fuera del texto.
// Las pruebas de hoy no se tocan: en jsdom sin matchMedia useLayout devuelve 'tel-v'.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { CONSULTA_TEL_H } from '../hooks/useLayout'
import { CameraPreview } from '@capgo/camera-preview'
import { encenderCamara, actualizarConfigCamara, apagarCamara } from '../lib/camara'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 844, height: 390, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 844, height: 390, x: 0, y: 0 })
  }
}))

// Sin fingir lib/camara -como tarea59-: encenderCamara corre de verdad contra el CameraPreview
// fingido de arriba, y así camaraActiva queda en true y Grabar dibuja la imagen detrás.

const matchMediaOriginal = window.matchMedia

function fingirTelefonoDeLado(deLado: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: deLado && query === CONSULTA_TEL_H,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any
}

async function abrir(puerta: 'leer' | 'grabar', ajustes: Record<string, unknown> = {}) {
  localStorage.setItem('teleprompter_ajustes', JSON.stringify({ colorFondo: '#000000', colorLetra: '#FFFFFF', ...ajustes }))
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-82',
    titulo: 'Guion de lado',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto para leer con el teléfono de lado y la cámara detrás' }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId(puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
}

async function empezarYMostrarControles() {
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 3100))
  })
  fireEvent.click(screen.getByTestId('teleprompter-view-container'))
  await screen.findByTestId('btn-pausa-lectura')
}

describe('Tarea 82 - El teléfono de lado', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
    window.matchMedia = matchMediaOriginal
  })

  test('T82a Leer de lado: el riel izquierdo tiene el ‹ y Aa, Dónde lees y Brillo; Más va en el riel derecho; no hay velo.', async () => {
    fingirTelefonoDeLado(true)
    await abrir('leer')
    const izq = screen.getByTestId('riel-izquierdo')
    const der = screen.getByTestId('riel-derecho')
    expect(within(izq).getByTestId('btn-volver-listo')).toBeTruthy()
    const fichas = Array.from(izq.querySelectorAll('[data-testid^="ficha-"]')).map((el) => el.getAttribute('data-testid'))
    expect(fichas).toEqual(['ficha-letra', 'ficha-anclaje', 'ficha-brillo'])
    expect(within(der).getByTestId('ficha-mas')).toBeTruthy()
    expect(within(izq).queryByTestId('ficha-mas')).toBeNull()
    expect(screen.getAllByTestId('ficha-mas')).toHaveLength(1)
    expect(within(der).getByTestId('btn-empezar-toma')).toBeTruthy()
    expect(screen.queryByTestId('velo-controles')).toBeNull()
    expect(document.querySelector('.layout-tel-h')).not.toBeNull()
  })

  test('T82b Grabar de lado: las seis fichas en el riel izquierdo, en orden, y Más a la derecha.', async () => {
    fingirTelefonoDeLado(true)
    await abrir('grabar')
    const izq = screen.getByTestId('riel-izquierdo')
    const der = screen.getByTestId('riel-derecho')
    const fichas = Array.from(izq.querySelectorAll('[data-testid^="ficha-"]')).map((el) => el.getAttribute('data-testid'))
    expect(fichas).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-calidad', 'ficha-subtitulos'])
    expect(within(der).getByTestId('ficha-mas')).toBeTruthy()
    expect(within(izq).queryByTestId('ficha-mas')).toBeNull()
    expect(screen.queryByTestId('velo-controles')).toBeNull()
  })

  test('T82c Leer leyendo con controles: salir a la izquierda; pausa y parar a la derecha.', async () => {
    fingirTelefonoDeLado(true)
    await abrir('leer')
    await empezarYMostrarControles()
    const izq = screen.getByTestId('riel-izquierdo')
    const der = screen.getByTestId('riel-derecho')
    expect(within(izq).getByTestId('btn-salir-lectura')).toBeTruthy()
    expect(within(der).getByTestId('btn-pausa-lectura')).toBeTruthy()
    expect(within(der).getByTestId('btn-parar-lectura')).toBeTruthy()
    expect(within(izq).queryByTestId('btn-pausa-lectura')).toBeNull()
    expect(screen.queryByTestId('velo-controles')).toBeNull()
  })

  test('T82d Grabar en pausa con controles: el tacho a la izquierda; pausa y parar a la derecha.', async () => {
    fingirTelefonoDeLado(true)
    await abrir('grabar')
    await empezarYMostrarControles()
    // Grabando, sin pausa: el riel izquierdo no tiene botón y no se dibuja.
    expect(screen.queryByTestId('riel-izquierdo')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-pausa-lectura'))
    const izq = await screen.findByTestId('riel-izquierdo')
    const der = screen.getByTestId('riel-derecho')
    expect(within(izq).getByTestId('btn-descartar-toma')).toBeTruthy()
    expect(within(der).getByTestId('btn-pausa-lectura')).toBeTruthy()
    expect(within(der).getByTestId('btn-parar-lectura')).toBeTruthy()
  })

  test.each([
    ['vertical', false],
    ['horizontal', true]
  ])('T82e Con la cámara detrás, en %s, contenedor-lectura lleva lectura-sobre-imagen y --fondo-lectura con el fondo de la pareja.', async (_nombre, deLado) => {
    fingirTelefonoDeLado(deLado as boolean)
    await abrir('grabar', { fondoToma: 'detras', colorFondo: '#FFFFFF', colorLetra: '#000000' })
    const contenedor = await screen.findByTestId('contenedor-lectura')
    // La cámara se enciende después de abrir Grabar -encenderCamara es asíncrona-.
    await waitFor(() => {
      expect(contenedor.classList.contains('lectura-sobre-imagen')).toBe(true)
    })
    expect(contenedor.style.getPropertyValue('--fondo-lectura').toUpperCase()).toBe('#FFFFFF')
    expect(!!document.querySelector('.layout-tel-h')).toBe(deLado)
  })

  test('T82f Al girar con la cámara detrás, si window.screen sigue en vertical, la vista previa usa la vista medida.', async () => {
    const pantalla = window.screen as any
    const anchoOriginal = Object.getOwnPropertyDescriptor(pantalla, 'width')
    const altoOriginal = Object.getOwnPropertyDescriptor(pantalla, 'height')
    const fijarPantalla = (w: number, h: number) => {
      Object.defineProperty(pantalla, 'width', { configurable: true, get: () => w })
      Object.defineProperty(pantalla, 'height', { configurable: true, get: () => h })
    }
    try {
      fijarPantalla(390, 844)
      await encenderCamara('frontal', { fondoToma: 'detras', vistaW: 390, vistaH: 844 })
      // Vertical: screen y la vista coinciden, queda screen como siempre.
      await actualizarConfigCamara({ fondoToma: 'detras', vistaW: 390, vistaH: 800 })
      expect((CameraPreview.setPreviewSize as any).mock.calls.at(-1)[0]).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })
      // Girado, con screen todavía en vertical: manda lo medido.
      await actualizarConfigCamara({ fondoToma: 'detras', vistaW: 844, vistaH: 390 })
      expect((CameraPreview.setPreviewSize as any).mock.calls.at(-1)[0]).toMatchObject({ x: 0, y: 0, width: 844, height: 390 })
      // Girado y con screen ya dado vuelta: screen, de borde a borde.
      fijarPantalla(844, 390)
      await actualizarConfigCamara({ fondoToma: 'detras', vistaW: 800, vistaH: 390 })
      expect((CameraPreview.setPreviewSize as any).mock.calls.at(-1)[0]).toMatchObject({ x: 0, y: 0, width: 844, height: 390 })
    } finally {
      await apagarCamara()
      if (anchoOriginal) Object.defineProperty(pantalla, 'width', anchoOriginal)
      else delete pantalla.width
      if (altoOriginal) Object.defineProperty(pantalla, 'height', altoOriginal)
      else delete pantalla.height
    }
  })
})
