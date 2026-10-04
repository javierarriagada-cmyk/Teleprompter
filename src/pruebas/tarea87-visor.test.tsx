// TAREA 87, PARTE D y A4 -04-10-2026-: "Para redes" en el visor, dentro del panel de Subtítulos, y las
// acciones fijas abajo. De trayectoria a través de <App> -como tarea87-receta.test.tsx-, salvo las dos
// primeras, que montan CapaSubtitulos sola con el tamaño de la imagen fingido como en
// subtitulosVisor.test.tsx.
import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import 'fake-indexeddb/auto'
import type { ResumenGrabacion } from '../datos/modelo'
import { armarSubtitulos } from '../lib/subtitulos'
import { olvidarCapacidades } from '../lib/archivosNativos'
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
function darImagen(v: HTMLVideoElement, ms: number) {
  Object.defineProperty(v, 'videoWidth', { value: 1080, configurable: true })
  Object.defineProperty(v, 'videoHeight', { value: 1920, configurable: true })
  Object.defineProperty(v, 'clientWidth', { value: 360, configurable: true })
  Object.defineProperty(v, 'clientHeight', { value: 640, configurable: true })
  Object.defineProperty(v, 'currentTime', { value: ms / 1000, configurable: true, writable: true })
  fireEvent(v, new Event('loadedmetadata'))
  fireEvent(v, new Event('seeked'))
}

function reiniciar() {
  cleanup()
  localStorage.clear()
  olvidarCapacidades()
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

describe('Tarea 87, parte D: CapaSubtitulos con margenAbajo', () => {
  beforeEach(reiniciar)

  function montarCapa(margen?: number) {
    const v = document.createElement('video')
    document.body.appendChild(v)
    darImagen(v, SUBS[0].desdeMs + 10)
    render(<CapaSubtitulos video={v} subtitulos={SUBS} estilo="amarillo" {...(margen !== undefined ? { margenAbajo: margen } : {})} />)
    return screen.getByTestId('capa-subtitulos').querySelector('.subtitulo') as HTMLElement
  }

  test('CapaSubtitulos con margenAbajo 0,35 pone marginBottom = alto de la imagen * 0,35', () => {
    const sub = montarCapa(0.35)
    expect(parseFloat(sub.style.marginBottom)).toBeCloseTo(640 * 0.35, 5)
    // La letra no cambia: 1/32 del alto de la imagen.
    expect(parseFloat((sub.parentElement as HTMLElement).style.fontSize)).toBeCloseTo(20, 5)
  })

  test('CapaSubtitulos sin la prop sigue en 0,125', () => {
    const sub = montarCapa()
    expect(parseFloat(sub.style.marginBottom)).toBeCloseTo(640 * 0.125, 5)
  })
})

describe('Tarea 87, parte D y A4: el visor', () => {
  beforeEach(reiniciar)

  test('TOMA VERTICAL: se elige Para redes, el subtítulo del visor sube y al guardar la receta lleva 0,35', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    const v = screen.getByTestId('video-grabacion') as HTMLVideoElement
    await act(async () => { darImagen(v, SUBS[0].desdeMs + 10) })
    const sub = () => screen.getByTestId('capa-subtitulos').querySelector('.subtitulo') as HTMLElement
    expect(parseFloat(sub().style.marginBottom)).toBeCloseTo(80, 5)
    await abrirPanel()
    // Posición va DENTRO del panel, debajo de los cuatro estilos.
    const sel = screen.getByTestId('selector-posicion-subtitulos')
    expect(sel.closest('.selector-subtitulos')).not.toBeNull()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-posicion-redes')) })
    expect(screen.getByTestId('btn-posicion-redes').getAttribute('aria-pressed')).toBe('true')
    expect(parseFloat(sub().style.marginBottom)).toBeCloseTo(640 * 0.35, 5)
    // Elegir la posición NO cierra el panel -respuesta de Claude del 04-10-.
    expect(screen.getByTestId('opciones-subtitulos')).not.toBeNull()
    await abrirPanel() // lo cierra
    expect(screen.getByTestId('btn-subtitulos').textContent).toContain('Amarillo · Para redes')
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    await esperar(50)
    expect(recetaQueLlego(h.estado).margenAbajo).toBe(0.35)
  })

  test('TOMA HORIZONTAL: no hay selector-posicion-subtitulos', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'horizontal' }))
    localStorage.setItem('sigo_subtitulos_posicion', 'redes')
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    await abrirPanel()
    expect(screen.getByTestId('opciones-subtitulos')).not.toBeNull()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).toBeNull()
    // Lo recordado no vale aquí: se guarda en "Normal".
    await abrirPanel()
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    await esperar(50)
    expect(recetaQueLlego(h.estado).margenAbajo).toBe(0.125)
  })

  test('ESTILO NO: no hay selector', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('No')
    await abrirPanel()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).toBeNull()
  })

  test('TOMA GUARDADA: no hay selector', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical', galeriaUri: 'content://media/1', ruta: 'content://media/1' }))
    await abrirTomaEnApp('008a7133', false)
    await esperar(50)
    expect(screen.queryByTestId('btn-subtitulos')).toBeNull()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).toBeNull()
  })

  // El paso 0 no midió que el 480p no salga 9:16 -nadie lo midió todavía en el moto g86-: por eso
  // hoy NO se oculta en 480p. Si Claude mide que no sale 9:16, esta prueba cambia con esa cifra.
  test('TOMA 480P VERTICAL: hoy sí hay selector, porque el paso 0 no mostró que no salga 9:16', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical', calidad: '480p' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    await abrirPanel()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).not.toBeNull()
  })

  test('TOMA SIN ORIENTACIÓN -APK viejo-: no hay selector', async () => {
    h.tomas.push(tomaDePrueba())
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    await abrirPanel()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).toBeNull()
  })

  test('TOMA VIEJA SIN EL DATO: el visor la analiza al abrirla, la guarda y ofrece Posición', async () => {
    h.estado.analisis = { duracionMs: 50000, bytes: 1, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1920, altoPx: 1080, rotacion: 90 }
    h.tomas.push(tomaDePrueba())
    await abrirTomaEnApp('008a7133')
    await esperar(50)
    expect(h.estado.llamadas.filter(([n]: [string]) => n === 'analizarVideo').length).toBe(1)
    await elegirEstilo('Amarillo')
    await abrirPanel()
    expect(screen.queryByTestId('selector-posicion-subtitulos')).not.toBeNull()
  })

  test('LA ELECCIÓN SE RECUERDA', async () => {
    h.tomas.push(tomaDePrueba({ orientacion: 'vertical' }))
    h.tomas.push(tomaDePrueba({ id: 'otra-vertical', creado: 1_500_000, orientacion: 'vertical' }))
    await abrirTomaEnApp('008a7133')
    await elegirEstilo('Amarillo')
    await abrirPanel()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-posicion-redes')) })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-cerrar-reproductor')) })
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByTestId('toma-banda-otra-vertical'))
      await new Promise((r) => setTimeout(r, 50))
    })
    await screen.findByTestId('btn-subtitulos')
    expect(screen.getByTestId('btn-subtitulos').textContent).toContain('Para redes')
    await abrirPanel()
    expect(screen.getByTestId('btn-posicion-redes').getAttribute('aria-pressed')).toBe('true')
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
