// TAREA 87 -04-10-2026-: LA X MIENTRAS SE GUARDA NO CANCELA, y los registros para el moto g86. A
// través de <App>, como tarea87-receta.test.tsx. Respuesta de Claude del 04-10: el guardado sigue y
// al terminar aparece el aviso de guardado, aunque el visor esté cerrado. Antes del arreglo, onCambio
// -App.tsx- volvía a abrir el visor al terminar: setGrabacionAbierta(g).
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import type { ResumenGrabacion } from '../datos/modelo'
import { registroGuardado, leerLineaSigoExport, vaciarRegistro } from '../lib/medicionesExport'
import { lineaEvento87, EVENTOS_87 } from '../lib/medicionesTarea87'
import { es } from '../textos/es'

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

import { abrirTomaEnApp, elegirEstilo, esperar, tomaDePrueba } from './ayudaTarea87'

function reiniciar() {
  cleanup()
  localStorage.clear()
  vaciarRegistro()
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

const lineas = (evento: string) => registroGuardado().map(leerLineaSigoExport).filter((l) => l.evento === evento)

describe('Tarea 87: cerrar mientras se guarda', () => {
  beforeEach(reiniciar)

  test('LA X NO CANCELA: el guardado sigue, el visor no vuelve a abrirse y al terminar sale el aviso', async () => {
    h.estado.retenerGuardado = true
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    await act(async () => { fireEvent.click(screen.getByTestId('btn-compartir-nueva')) })
    await esperar(30)
    expect(h.estado.soltar.length).toBe(1)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-cerrar-reproductor')) })
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    await act(async () => {
      h.estado.soltar.forEach((f: () => void) => f())
      await new Promise((r) => setTimeout(r, 80))
    })
    // El guardado terminó: aviso, el visor sigue cerrado y no se abrió el menú de compartir.
    expect(screen.getByText(es.galeriaGuardada)).not.toBeNull()
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    expect(h.estado.llamadas.some(([n]: [string]) => n === 'compartir')).toBe(false)
    // La toma quedó como guardada: al abrirla de nuevo ofrece Compartir.
    await act(async () => {
      fireEvent.click(screen.getByTestId('toma-banda-008a7133'))
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.getByTestId('btn-compartir-toma')).not.toBeNull()
  })
})

describe('Tarea 87: los registros para Claude', () => {
  beforeEach(reiniciar)

  test('LAS LÍNEAS NUEVAS TIENEN EL FORMATO DEL PASO 0, con las claves en su orden fijo', () => {
    const l = lineaEvento87('bordes', { arriba_dp: 45, abajo_dp: 48 }, 1000)
    expect(l.startsWith('v=1 evento=bordes t_ms=1000 arriba_dp=45 abajo_dp=48 izquierda_dp=NA')).toBe(true)
    // -04-10-2026, Javier simplifica la 87- Sin tiempo_guardado. Antes: [..., 'visor', 'tiempo_guardado'].
    expect(Object.keys(EVENTOS_87)).toEqual(['orientacion', 'bordes', 'visor'])
  })

  // -04-10-2026, Javier simplifica la 87- Sin la línea tiempo_guardado: se sacó con el tiempo estimado.
  test('AL ABRIR EL VISOR SE ANOTAN LOS BORDES SEGUROS', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical', duracionMs: 300_000 }))
    await abrirTomaEnApp('008a7133')
    const bordes = lineas('bordes')
    expect(bordes.length).toBe(1)
    // En jsdom env() no existe: dan 0. En el moto g86, la barra de estado y la de abajo de verdad.
    expect(bordes[0].arriba_dp).toBe('0')
  })

  test('UNA TOMA VIEJA QUE SE ANALIZA EN EL VISOR ANOTA SU FORMA: 1920x1080 con 90 se ve vertical', async () => {
    h.estado.analisis = { duracionMs: 50000, bytes: 1, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1920, altoPx: 1080, rotacion: 90 }
    h.tomas.push(tomaDePrueba({ calidad: '480p' }))
    await abrirTomaEnApp('008a7133')
    await esperar(50)
    const o = lineas('orientacion')
    expect(o.length).toBe(1)
    expect(o[0]).toMatchObject({ id: '008a7133', ancho_px: '1920', alto_px: '1080', rot_grados: '90', orientacion: 'vertical', calidad_toma: '480p', origen: 'visor' })
  })
})
