// TAREA 96 -05-10-2026-: EL FILTRO VIAJA AL GUARDAR. De trayectoria, a través de <App>, con el mismo
// nativo fingido de la tarea 87 -ayudaTarea87Nativo.ts-: se abre la toma, se elige el filtro como la
// persona y se mira la receta que recibe CamaraNativa. Solo lógica: qué se manda y qué se recuerda; ni
// posiciones ni presencia de controles -docs/lo-que-hay-que-saber.txt, regla del comienzo-.
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import type { ResumenGrabacion } from '../datos/modelo'
import { matrizDeTono, matrizParaMedia3, valoresFeColorMatrix } from '../lib/filtros'

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

import { abrirTomaEnApp, elegirEstilo, esperar, recetaQueLlego, tomaDePrueba } from './ayudaTarea87'

function reiniciar() {
  cleanup()
  localStorage.clear()
  const e = h.estado
  e.llamadas.length = 0
  e.apkViejo = false
  e.analisis = null
  e.retenerGuardado = false
  e.soltar.length = 0
  e.guardadoFalla = null
  e.compartirFalla = null
  h.tomas.length = 0
}

async function elegirFiltro(tono: string) {
  await act(async () => { fireEvent.click(screen.getByTestId('btn-filtro')) })
  await act(async () => { fireEvent.click(screen.getByTestId(`filtro-${tono}`)) })
}

async function guardar() {
  await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
  await esperar(50)
}

describe('Tarea 96: el filtro de la toma', () => {
  beforeEach(reiniciar)

  test('ELEGIR CÁLIDO Y GUARDAR MANDA LA MATRIZ DE CÁLIDO, aunque no haya subtítulos', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('No')
    await elegirFiltro('calido')
    await guardar()
    const receta = recetaQueLlego(h.estado)
    expect(receta).not.toBeNull()
    expect(receta.estilo).toBe('no')
    expect(receta.filtro.tono).toBe('calido')
    // Los 16 números, no solo el tono.
    expect(receta.filtro.matriz).toEqual(matrizParaMedia3(matrizDeTono('calido')))
    const nombres = h.estado.llamadas.map(([n]: [string]) => n)
    expect(nombres).not.toContain('guardarEnGaleria')
  })

  test('CON NATURAL Y SIN SUBTÍTULOS SIGUE SIENDO COPIA', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('No')
    await elegirFiltro('natural')
    await guardar()
    const nombres = h.estado.llamadas.map(([n]: [string]) => n)
    expect(nombres).toContain('guardarEnGaleria')
    expect(nombres).not.toContain('exportarToma')
  })

  test('el filtro elegido se recuerda en sigo_filtro y el video lo lleva con la matriz de B/N', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirFiltro('bn')
    expect(JSON.parse(localStorage.getItem('sigo_filtro')!)).toEqual({ version: 1, tono: 'bn' })
    const raiz = screen.getByTestId('reproductor-grabacion')
    const video = raiz.querySelector('[data-testid="video-grabacion"]') as HTMLVideoElement
    expect(video.style.filter).toBe('url(#filtro-sigo-bn)')
    const fe = raiz.querySelector('#filtro-sigo-bn feColorMatrix')
    expect(fe?.getAttribute('values')).toBe(valoresFeColorMatrix(matrizDeTono('bn')))
    expect(raiz.querySelector('#filtro-sigo-bn')?.getAttribute('color-interpolation-filters')).toBe('sRGB')
  })

  test('una toma guardada no lleva filtro encima: la copia de la galería ya lo trae', async () => {
    localStorage.setItem('sigo_filtro', JSON.stringify({ version: 1, tono: 'bn' }))
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical', galeriaUri: 'content://media/1', ruta: 'content://media/1' }))
    // Guardada: sin ficha de Subtítulos que esperar.
    await abrirTomaEnApp('008a7133', false)
    const raiz = await screen.findByTestId('reproductor-grabacion')
    const video = raiz.querySelector('[data-testid="video-grabacion"]') as HTMLVideoElement
    expect(video.style.filter).toBe('')
  })
})
