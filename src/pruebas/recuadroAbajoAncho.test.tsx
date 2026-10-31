// 31-10-2026, recuadro-abajo-ancho: con el recuadro abajo en teléfono de lado no hay carril
// y el texto lleva lectura-sobre-imagen. Lógica acotada; no toca el motor ni la tableta.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { CONSULTA_TEL_H } from '../hooks/useLayout'
import { sinCarrilRecuadroTelH, ladosCarrilAviso } from '../lib/recuadroAbajoTelH'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 844, height: 390, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 844, height: 390, x: 0, y: 0 })
  }
}))

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

async function abrirGrabar(ajustes: Record<string, unknown> = {}, esquina?: string) {
  localStorage.setItem(
    'teleprompter_ajustes',
    JSON.stringify({ colorFondo: '#000000', colorLetra: '#FFFFFF', fondoToma: 'recuadro', ...ajustes })
  )
  if (esquina) localStorage.setItem('sigo_recuadro_esquina_h', esquina)
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-abajo',
    titulo: 'Guion',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto de lado con el recuadro' }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
}

describe('recuadroAbajoTelH — lógica del carril', () => {
  test('sinCarril: solo teléfono de lado con recuadro en esquina de abajo', () => {
    expect(sinCarrilRecuadroTelH('tel-h', true, 'der-abajo')).toBe(true)
    expect(sinCarrilRecuadroTelH('tel-h', true, 'izq-abajo')).toBe(true)
    expect(sinCarrilRecuadroTelH('tel-h', true, 'der-arriba')).toBe(false)
    expect(sinCarrilRecuadroTelH('tel-h', true, 'izq-arriba')).toBe(false)
    expect(sinCarrilRecuadroTelH('tel-h', false, 'der-abajo')).toBe(false)
    expect(sinCarrilRecuadroTelH('tel-v', true, 'der-abajo')).toBe(false)
    expect(sinCarrilRecuadroTelH('tab-h', true, 'der-abajo')).toBe(false)
  })

  test('ladosCarrilAviso: suma el carril solo con recuadro arriba (o fuera de tel-h abajo)', () => {
    expect(ladosCarrilAviso({ layout: 'tel-h', conRecuadro: true, esquina: 'der-abajo' })).toEqual({
      izquierda: false,
      derecha: false
    })
    expect(ladosCarrilAviso({ layout: 'tel-h', conRecuadro: true, esquina: 'izq-abajo' })).toEqual({
      izquierda: false,
      derecha: false
    })
    expect(ladosCarrilAviso({ layout: 'tel-h', conRecuadro: true, esquina: 'der-arriba' })).toEqual({
      izquierda: false,
      derecha: true
    })
    expect(ladosCarrilAviso({ layout: 'tel-h', conRecuadro: true, esquina: 'izq-arriba' })).toEqual({
      izquierda: true,
      derecha: false
    })
    expect(ladosCarrilAviso({ layout: 'tel-h', conRecuadro: false, esquina: 'der-arriba' })).toEqual({
      izquierda: false,
      derecha: false
    })
    // Tableta de lado: el carril CSS ya es 0, pero la lógica del aviso sigue sumando
    // cuando hay recuadro (como hoy); no es el caso «abajo sin carril» del teléfono.
    expect(ladosCarrilAviso({ layout: 'tab-h', conRecuadro: true, esquina: 'der-abajo' })).toEqual({
      izquierda: false,
      derecha: true
    })
  })
})

describe('recuadro abajo — contenedor-lectura', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
    window.matchMedia = matchMediaOriginal
  })

  test('Con recuadro abajo de lado, contenedor-lectura lleva lectura-sobre-imagen', async () => {
    fingirTelefonoDeLado(true)
    await abrirGrabar({ fondoToma: 'recuadro', colorFondo: '#FFFFFF', colorLetra: '#000000' }, 'der-abajo')
    const contenedor = await screen.findByTestId('contenedor-lectura')
    await waitFor(() => {
      expect(contenedor.classList.contains('lectura-sobre-imagen')).toBe(true)
    })
    expect(contenedor.classList.contains('letra-oscura')).toBe(true)
    expect(document.querySelector('[data-recuadro="abajo"]')).not.toBeNull()
  })

  test('Con recuadro arriba de lado, contenedor-lectura NO lleva lectura-sobre-imagen', async () => {
    fingirTelefonoDeLado(true)
    await abrirGrabar({ fondoToma: 'recuadro' }, 'der-arriba')
    const contenedor = await screen.findByTestId('contenedor-lectura')
    await waitFor(() => {
      expect(document.querySelector('[data-recuadro="arriba"]')).not.toBeNull()
    })
    expect(contenedor.classList.contains('lectura-sobre-imagen')).toBe(false)
  })

  test('Sin recuadro de lado, contenedor-lectura no lleva lectura-sobre-imagen', async () => {
    fingirTelefonoDeLado(true)
    await abrirGrabar({ fondoToma: 'oculta' }, 'der-abajo')
    const contenedor = await screen.findByTestId('contenedor-lectura')
    await waitFor(() => {
      expect(document.querySelector('[data-recuadro="no"]')).not.toBeNull()
    })
    expect(contenedor.classList.contains('lectura-sobre-imagen')).toBe(false)
  })

  test('Con cámara detrás de lado, contenedor-lectura lleva lectura-sobre-imagen como hoy', async () => {
    fingirTelefonoDeLado(true)
    await abrirGrabar({ fondoToma: 'detras', colorFondo: '#FFFFFF', colorLetra: '#000000' })
    const contenedor = await screen.findByTestId('contenedor-lectura')
    await waitFor(() => {
      expect(contenedor.classList.contains('lectura-sobre-imagen')).toBe(true)
    })
  })
})
