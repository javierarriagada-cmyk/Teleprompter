// TAREA 87, A4 -04-10-2026-: las acciones fijas abajo, el panel de Subtítulos y el subtítulo a 1/6 del
// alto de la imagen. De trayectoria a través de <App> -como tarea87-receta.test.tsx-, salvo las de
// CapaSubtitulos sola, con el tamaño de la imagen fingido como en subtitulosVisor.test.tsx.
// -04-10-2026, Javier simplifica la 87- Se sacaron "Normal / Para redes" y el tiempo estimado: sus
// pruebas se fueron con ellos y quedó una guardiana de que ya no están.
import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import 'fake-indexeddb/auto'
import type { ResumenGrabacion } from '../datos/modelo'
import { armarSubtitulos, MARGEN_ABAJO_SUBTITULOS } from '../lib/subtitulos'
import { CapaSubtitulos } from '../components/SubtitulosVisor'

const h = vi.hoisted(() => ({ tomas: [] as ResumenGrabacion[], estado: null as any }))

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  const ayuda = await import('./ayudaTarea87Nativo')
  h.estado = ayuda.estadoNativoNuevo()
  return {
    ...actual,
    registerPlugin: (nombre: string, impl?: any) =>
      nombre === 'CamaraNativa' ? ayuda.camaraNativaFingida(h.estado) : (actual.registerPlugin as any)(nombre, impl)
  }
})
vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: { start: vi.fn(), stop: vi.fn(), setOpacity: vi.fn(), setPreviewSize: vi.fn() }
}))
vi.mock('../datos/RepositorioGrabacionesMemoria', async () => {
  const real = await vi.importActual<typeof import('../datos/RepositorioGrabacionesMemoria')>('../datos/RepositorioGrabacionesMemoria')
  class ConTomas extends real.RepositorioGrabacionesMemoria {
    constructor() {
      super()
      for (const g of h.tomas) void this.guardar(g)
    }
  }
  return { RepositorioGrabacionesMemoria: ConTomas }
})

import { abrirTomaEnApp, elegirEstilo, esperar, recetaQueLlego, tomaDePrueba, TOMA_REGISTRO } from './ayudaTarea87'

const SUBS = armarSubtitulos(TOMA_REGISTRO)

// El video de jsdom no tiene imagen: el tamaño de una toma vertical, como en subtitulosVisor.test.tsx.
// Con horizontal, un 1920x1080 en la misma caja de 360x640: la imagen queda de 360x202,5.
function darImagen(v: HTMLVideoElement, ms: number, horizontal = false) {
  Object.defineProperty(v, 'videoWidth', { value: horizontal ? 1920 : 1080, configurable: true })
  Object.defineProperty(v, 'videoHeight', { value: horizontal ? 1080 : 1920, configurable: true })
  Object.defineProperty(v, 'clientWidth', { value: 360, configurable: true })
  Object.defineProperty(v, 'clientHeight', { value: 640, configurable: true })
  Object.defineProperty(v, 'currentTime', { value: ms / 1000, configurable: true, writable: true })
  fireEvent(v, new Event('loadedmetadata'))
  fireEvent(v, new Event('seeked'))
}

function reiniciar() {
  cleanup()
  localStorage.clear()
  const e = h.estado
  if (e) {
    e.llamadas.length = 0
    e.apkViejo = false
    e.analisis = null
    e.retenerGuardado = false
    e.soltar.length = 0
    e.guardadoFalla = null
    e.compartirFalla = null
  }
  h.tomas.length = 0
}

async function abrirPanel() {
  await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
}

describe('Tarea 87: el subtítulo del visor a 1/6 del alto de la imagen', () => {
  beforeEach(reiniciar)

  function montarCapa(horizontal: boolean) {
    const v = document.createElement('video')
    document.body.appendChild(v)
    darImagen(v, SUBS[0].desdeMs + 10, horizontal)
    render(<CapaSubtitulos video={v} subtitulos={SUBS} estilo="amarillo" />)
    return screen.getByTestId('capa-subtitulos').querySelector('.subtitulo') as HTMLElement
  }

  test('LA CONSTANTE COMPARTIDA ES 1/6', () => {
    expect(MARGEN_ABAJO_SUBTITULOS).toBeCloseTo(1 / 6, 12)
  })

  test('VERTICAL: marginBottom = alto de la imagen / 6 -640 / 6-', () => {
    const sub = montarCapa(false)
    expect(parseFloat(sub.style.marginBottom)).toBeCloseTo(640 / 6, 3)
    // La letra no cambia: 1/32 del alto de la imagen.
    expect(parseFloat((sub.parentElement as HTMLElement).style.fontSize)).toBeCloseTo(20, 5)
  })

  test('HORIZONTAL: marginBottom = alto de la imagen / 6 -202,5 / 6-', () => {
    const sub = montarCapa(true)
    expect(parseFloat(sub.style.marginBottom)).toBeCloseTo(202.5 / 6, 3)
  })
})

describe('Tarea 87, A4: el visor', () => {
  beforeEach(reiniciar)

  test('EN EL VISOR, POR <App>: el subtítulo queda a 1/6 en una toma vertical', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    const v = screen.getByTestId('video-grabacion') as HTMLVideoElement
    await act(async () => { darImagen(v, SUBS[0].desdeMs + 10) })
    const sub = screen.getByTestId('capa-subtitulos').querySelector('.subtitulo') as HTMLElement
    expect(parseFloat(sub.style.marginBottom)).toBeCloseTo(640 / 6, 3)
  })

  test('EN EL VISOR, POR <App>: el subtítulo queda a 1/6 en una toma horizontal', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'horizontal' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    const v = screen.getByTestId('video-grabacion') as HTMLVideoElement
    await act(async () => { darImagen(v, SUBS[0].desdeMs + 10, true) })
    const sub = screen.getByTestId('capa-subtitulos').querySelector('.subtitulo') as HTMLElement
    expect(parseFloat(sub.style.marginBottom)).toBeCloseTo(202.5 / 6, 3)
  })

  test('TOMA VIEJA SIN EL DATO: el visor la analiza una vez al abrirla y se puede guardar', async () => {
    h.estado.analisis = { duracionMs: 50000, bytes: 1, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1920, altoPx: 1080, rotacion: 90 }
    h.tomas.push(tomaDePrueba())
    await abrirTomaEnApp('008a7133')
    await esperar(50)
    expect(h.estado.llamadas.filter(([n]: [string]) => n === 'analizarVideo').length).toBe(1)
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    await esperar(50)
    expect(h.estado.llamadas.some(([n]: [string]) => n === 'exportarToma' || n === 'guardarEnGaleria')).toBe(true)
  })

  test('ELEGIR UN ESTILO CIERRA EL PANEL, COMO ANTES; CON EL PANEL ABIERTO EL NOMBRE SE ESCONDE', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    const visor = screen.getByTestId('reproductor-grabacion')
    expect(within(visor).getByText('Larralde')).not.toBeNull()
    await abrirPanel()
    expect(within(visor).queryByText('Larralde')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByLabelText('Rojo')) })
    expect(screen.queryByTestId('opciones-subtitulos')).toBeNull()
    expect(within(visor).getByText('Larralde')).not.toBeNull()
  })

  // A4 (1): jsdom no mide, así que se mira la estructura.
  test('LAS ACCIONES NO SE DESPLAZAN', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    const visor = screen.getByTestId('reproductor-grabacion')
    const arriba = within(visor).getByTestId('visor-arriba')
    const acciones = visor.querySelector('.acciones-toma') as HTMLElement
    expect(arriba.contains(acciones)).toBe(false)
    expect(arriba.style.overflowY).toBe('auto')
    expect(parseFloat(arriba.style.minHeight)).toBe(0)
    expect(acciones.style.flexShrink).toBe('0')
    const tarjeta = visor.firstElementChild as HTMLElement
    expect(tarjeta.style.display).toBe('flex')
    expect(tarjeta.style.flexDirection).toBe('column')
    expect(tarjeta.style.maxHeight).toBe('100%')
    // Lo de la 89 se conserva.
    expect(visor.style.overflowY).toBe('auto')
    expect(tarjeta.style.margin).toBe('auto')
    expect(arriba.contains(within(visor).getByTestId('video-grabacion'))).toBe(true)
  })
})

// GUARDIANA -04-10-2026, Javier simplifica la 87-: ya no existen "Normal / Para redes" ni el tiempo
// estimado de guardado. Una toma vertical de 5 minutos con subtítulos -donde estaban los dos-.
describe('Tarea 87: GUARDIANA, ya no hay Posición ni tiempo estimado', () => {
  beforeEach(reiniciar)

  test('NI POSICIÓN NI TIEMPO ESTIMADO en el visor, en la receta, en los textos ni en los registros', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical', duracionMs: 300_000 }))
    localStorage.setItem('sigo_subtitulos_posicion', 'redes')
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    const visor = screen.getByTestId('reproductor-grabacion')
    expect(screen.queryByTestId('tiempo-estimado-guardado')).toBeNull()
    expect(visor.textContent).not.toMatch(/Guardar tarda|alrededor de/)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
    expect(screen.getByTestId('opciones-subtitulos')).not.toBeNull()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).toBeNull()
    expect(screen.queryByTestId('btn-posicion-normal')).toBeNull()
    expect(screen.queryByTestId('btn-posicion-redes')).toBeNull()
    expect(visor.textContent).not.toMatch(/Para redes|Posición|TikTok/)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
    expect(screen.getByTestId('btn-subtitulos').textContent).not.toContain('·')
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    await esperar(50)
    const receta = recetaQueLlego(h.estado)
    expect(receta).not.toBeNull()
    expect('margenAbajo' in receta).toBe(false)
    // Los textos, los módulos y los registros.
    const { es } = await import('../textos/es')
    const { en } = await import('../textos/en')
    for (const clave of ['posicionSubtitulos', 'posicionNormal', 'posicionRedes', 'posicionRedesExplicacion', 'tiempoEstimadoGuardado']) {
      expect(clave in es).toBe(false)
      expect(clave in en).toBe(false)
    }
    const modulos = import.meta.glob(['../lib/posicionSubtitulos.ts', '../lib/tiempoGuardado.ts', '../components/SelectorPosicion.tsx'])
    expect(Object.keys(modulos)).toEqual([])
    const { EVENTOS_87 } = await import('../lib/medicionesTarea87')
    expect('tiempo_guardado' in EVENTOS_87).toBe(false)
    expect((EVENTOS_87.visor as readonly string[]).includes('posicion')).toBe(false)
  })
})
