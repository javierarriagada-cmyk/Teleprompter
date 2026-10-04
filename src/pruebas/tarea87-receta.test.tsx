// TAREA 87, PARTE B -04-10-2026-: LA RECETA COMÚN LLEGA AL NATIVO. De trayectoria, a través de <App>:
// se abre la toma desde la banda del guion, como la persona, y se mira lo que recibe CamaraNativa
// -fingido con registerPlugin de @capacitor/core, como en corteVideo.test.ts se finge lo nativo-.
// Sin tocar ninguna prueba de hoy: el visor sigue llamando guardarEnGaleriaConSubtitulos, que por
// dentro arma la receta -docs/tarea87.txt, B2-.
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import type { ResumenGrabacion } from '../datos/modelo'
import { armarSubtitulos } from '../lib/subtitulos'
import { olvidarCapacidades } from '../lib/archivosNativos'

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

function reiniciar() {
  cleanup()
  localStorage.clear()
  olvidarCapacidades()
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

describe('Tarea 87, parte B: la receta común', () => {
  beforeEach(reiniciar)

  test('GUARDAR CON SUBTÍTULOS PASA LA RECETA AL NATIVO', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    await act(async () => {
      fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor'))
    })
    await esperar(50)
    const receta = recetaQueLlego(h.estado)
    expect(receta).not.toBeNull()
    expect(receta.version).toBe(1)
    expect(receta.estilo).toBe('amarillo')
    expect(receta.margenAbajo).toBe(0.125)
    expect(receta.tramos).toBeNull()
    expect(receta.filtro).toBeNull()
    // TODOS los subtítulos de armarSubtitulos, tal cual.
    expect(receta.subtitulos).toEqual(JSON.parse(JSON.stringify(armarSubtitulos(TOMA_REGISTRO))))
    expect(h.estado.llamadas.some(([n]: [string]) => n === 'guardarConSubtitulos')).toBe(false)
  })

  test('GUARDAR SIN SUBTÍTULOS SIGUE SIENDO COPIA', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('No')
    await act(async () => {
      fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor'))
    })
    await esperar(50)
    const nombres = h.estado.llamadas.map(([n]: [string]) => n)
    expect(nombres).toContain('guardarEnGaleria')
    expect(nombres).not.toContain('exportarToma')
  })

  test('APK VIEJO: SIN exportarToma CAE A guardarConSubtitulos', async () => {
    h.estado.apkViejo = true
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    // Con un APK viejo no se ofrece "Para redes" -ni siquiera con el panel abierto-.
    await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
    expect(screen.queryByTestId('selector-posicion-subtitulos')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
    await act(async () => {
      fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor'))
    })
    await esperar(50)
    const vieja = h.estado.llamadas.find(([n]: [string]) => n === 'guardarConSubtitulos')
    expect(vieja).toBeTruthy()
    expect(vieja[1].estilo).toBe('amarillo')
    expect(JSON.parse(vieja[1].subtitulos).length).toBe(armarSubtitulos(TOMA_REGISTRO).length)
    // La toma igual quedó guardada: el visor cambia a Compartir.
    expect(await screen.findByTestId('btn-compartir-toma')).not.toBeNull()
  })
})
