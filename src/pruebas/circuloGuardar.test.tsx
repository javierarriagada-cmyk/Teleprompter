// Protege el indicador por el camino real de <App>, con el guardado pendiente y su avance controlado.
// No fija posiciones ni tamaños: las variantes solo ejercitan las tres puertas del visor.
import React from 'react'
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import 'fake-indexeddb/auto'
import type { ResumenGrabacion } from '../datos/modelo'

const h = vi.hoisted(() => ({
  tomas: [] as ResumenGrabacion[], layout: 'tel-v' as 'tel-v' | 'tel-h', reducido: false,
  avanzar: null as null | ((n: number) => void),
  terminar: null as null | ((ok: boolean) => void)
}))
vi.mock('../hooks/useLayout', async () => ({ ...(await vi.importActual<typeof import('../hooks/useLayout')>('../hooks/useLayout')), default: () => h.layout }))
vi.mock('@capacitor/core', async () => {
  const real = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  const ayuda = await import('./ayudaTarea87Nativo')
  const estado = ayuda.estadoNativoNuevo()
  return { ...real, registerPlugin: (nombre: string, impl?: any) => nombre === 'CamaraNativa' ? ayuda.camaraNativaFingida(estado) : (real.registerPlugin as any)(nombre, impl) }
})
vi.mock('@capgo/camera-preview', () => ({ CameraPreview: { start: vi.fn(), stop: vi.fn(), setOpacity: vi.fn(), setPreviewSize: vi.fn() } }))
vi.mock('../datos/RepositorioGrabacionesMemoria', async () => {
  const real = await vi.importActual<typeof import('../datos/RepositorioGrabacionesMemoria')>('../datos/RepositorioGrabacionesMemoria')
  class ConTomas extends real.RepositorioGrabacionesMemoria {
    constructor() { super(); for (const toma of h.tomas) void this.guardar(toma) }
  }
  return { RepositorioGrabacionesMemoria: ConTomas }
})
vi.mock('../lib/archivosNativos', async () => {
  const real = await vi.importActual<typeof import('../lib/archivosNativos')>('../lib/archivosNativos')
  const pendiente = (avanzar?: (n: number) => void) => {
    h.avanzar = avanzar ?? null
    return new Promise<{ ok: boolean; uri?: string }>(resolve => { h.terminar = ok => resolve(ok ? { ok, uri: 'content://media/circulo' } : { ok }) })
  }
  return {
    ...real,
    guardarEnGaleria: () => pendiente(),
    guardarEnGaleriaConSubtitulos: (_ruta: string, _subs: unknown, _estilo: unknown, avanzar?: (n: number) => void) => pendiente(avanzar),
    exportarAGaleria: (_ruta: string, _receta: unknown, avanzar?: (n: number) => void) => pendiente(avanzar),
    compartirDeGaleria: vi.fn(async () => {})
  }
})

import { abrirTomaEnApp, elegirEstilo, tomaDePrueba } from './ayudaTarea87'
import { IndicadorGuardado } from '../components/DockListo'
import { CURVA_RESORTE, MS_CHICO } from '../components/movimiento'

beforeEach(() => {
  cleanup(); localStorage.clear(); h.tomas.length = 0
  h.layout = 'tel-v'; h.reducido = false; h.avanzar = null; h.terminar = null
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' && h.reducido, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function abrir(variante: string, conAvance = true) {
  h.layout = variante === 'de pie' ? 'tel-v' : 'tel-h'
  h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
  await abrirTomaEnApp('008a7133')
  const v = screen.getByTestId('video-grabacion') as HTMLVideoElement
  const horizontal = variante === 'columna'
  Object.defineProperty(v, 'videoWidth', { configurable: true, value: horizontal ? 1920 : 1080 })
  Object.defineProperty(v, 'videoHeight', { configurable: true, value: horizontal ? 1080 : 1920 })
  await act(async () => { fireEvent(v, new Event('loadedmetadata')) })
  if (conAvance) await elegirEstilo('Amarillo')
}

const guardar = 'guardar-galeria-desde-reproductor'
const compartir = 'btn-compartir-nueva'
const casos = ['de pie', 'columna', 'tarjeta'].flatMap(variante => [guardar, compartir].map(boton => ({ variante, boton })))

describe('Círculo al guardar por <App>', () => {
  test.each(casos)('$variante / $boton: carga, porcentaje, solo el apretado y recuperación tras fallo', async ({ variante, boton }) => {
    await abrir(variante)
    const otro = boton === guardar ? compartir : guardar
    const antes = screen.getByTestId(boton).querySelector('svg')!.outerHTML
    await act(async () => { fireEvent.click(screen.getByTestId(boton)) })
    const pulsado = screen.getByTestId(boton)
    expect(pulsado.getAttribute('aria-busy')).toBe('true')
    expect(within(pulsado).getByTestId('indicador-carga-expressive')).toBeTruthy()
    expect(within(pulsado).getByTestId('indicador-guardado').getAttribute('aria-hidden')).toBe('true')
    expect(pulsado.textContent).toContain('Guardando…')
    expect((screen.getByTestId(otro) as HTMLButtonElement).disabled).toBe(true)
    expect(within(screen.getByTestId(otro)).queryByTestId('indicador-guardado')).toBeNull()
    expect(h.avanzar).not.toBeNull()
    for (const [entrada, numero] of [[0, 0], [37, 37], [37.6, 38], [100, 100]]) {
      await act(async () => { h.avanzar!(entrada) })
      expect(within(pulsado).queryByTestId('indicador-carga-expressive')).toBeNull()
      expect(within(pulsado).getByTestId('circulo-avance-guardado').getAttribute('data-avance')).toBe(String(numero))
      expect(pulsado.textContent).toContain(`Guardando… ${numero}%`)
    }
    await act(async () => { h.terminar!(false) })
    expect(screen.queryByTestId('indicador-guardado')).toBeNull()
    expect(screen.getByTestId(boton).getAttribute('aria-busy')).toBe('false')
    expect(screen.getByTestId(boton).querySelector('svg')!.outerHTML).toBe(antes)
  })

  test.each([guardar, compartir])('%s: sin recodificar mantiene la carga hasta completar y devuelve el ícono de Compartir', async boton => {
    await abrir('de pie', false)
    await act(async () => { fireEvent.click(screen.getByTestId(boton)) })
    expect(h.avanzar).toBeNull()
    expect(within(screen.getByTestId(boton)).getByTestId('indicador-carga-expressive')).toBeTruthy()
    await act(async () => { h.terminar!(true) })
    expect(screen.queryByTestId('indicador-guardado')).toBeNull()
    expect(screen.getByTestId('btn-compartir-toma').querySelector('svg')).not.toBeNull()
  })
})

test.each([false, true])('El indicador respeta movimientoApagado=%s en los dos estados', reducido => {
  h.reducido = reducido
  const vista = render(<IndicadorGuardado avance={null} />)
  expect(screen.getByTestId('indicador-carga-expressive').style.animation === 'none').toBe(reducido)
  vista.rerender(<IndicadorGuardado avance={37} />)
  const circulo = screen.getByTestId('circulo-avance-guardado')
  expect(circulo.style.transition).toBe(reducido ? 'none' : `opacity ${MS_CHICO}ms ${CURVA_RESORTE}`)
  const arco = circulo.querySelector('.indicador-guardado-arco') as SVGElement
  expect(arco.style.transition).toBe(reducido ? 'none' : `stroke-dashoffset ${MS_CHICO}ms ${CURVA_RESORTE}`)
})
