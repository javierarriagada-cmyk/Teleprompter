// AJUSTES DE PANTALLAS -10-10-2026-: EL DOCK DE LISTO EN GRABAR, a través de <App>. Solo lógica: qué se
// abre, qué ajuste cambia, qué empieza. Sin posiciones ni medidas -jsdom no mide-. De pie en el
// teléfono -el layout de jsdom es tel-v-.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({
  lado: 'frontal' as 'frontal' | 'trasera',
  encendida: false,
  calidades: ['1080p', '720p', '480p'] as string[]
}))

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))
vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('../lib/camara', async (importOriginal) => {
  const actual: any = await importOriginal()
  // El plugin fingido, como en tarea93-flecha-fichas.
  const CamaraNativa = new Proxy({} as any, {
    get(_o, nombre: string) {
      if (nombre === 'then') return undefined
      if (nombre === 'addListener') return async () => ({ remove: async () => {} })
      if (nombre === 'vigilarRecursos') return async () => ({ camara: true, microfono: true })
      return async () => ({})
    }
  })
  return {
    ...actual,
    CamaraNativa,
    camaraEncendida: () => h.encendida,
    ladoActual: () => h.lado,
    encenderCamara: async (lado: 'frontal' | 'trasera') => { h.lado = lado; h.encendida = true },
    apagarCamara: async () => { h.encendida = false },
    empezarGrabacionVideo: async () => {},
    grabacionNativaEnCurso: () => true,
    cortarGrabacionVideo: async () => 'file:///plugin/video_1.mp4',
    errorDelUltimoCorte: () => null,
    obtenerCalidadesSoportadas: async () => h.calidades
  }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    juntos: (a: string, b: string) => `${a}/${b}`,
    escribirTexto: async () => {},
    leerTexto: async () => { throw new Error('no existe') },
    listarDirectorio: async () => [],
    borrarArchivo: async () => {},
    buscarMp4Recientes: async () => [],
    moverArchivo: async (_de: string, a: string) => a,
    analizarVideo: async () => ({ duracionMs: 20_000, bytes: 5_000_000, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1080, altoPx: 1920, rotacion: 0 }),
    bytesDe: async () => 5_000_000,
    extraerMiniatura: async (_r: string, destino: string) => destino,
    obtenerEspacioLibre: async () => null
  }
})
vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return { ...actual, recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar() }
})

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion, contarPalabras, duracionDeLectura, duracionDeLecturaReloj } from '../datos/modelo'
import { hayCalidad } from '../components/FichasListo'
import { es } from '../textos/es'
import { fijarIdioma } from '../lib/idioma'

// 425 palabras: 170 s a 150 por minuto, el «2:50» del boceto.
const guion: Guion = {
  id: 'g-ap', titulo: 'Ajustes', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: Array.from({ length: 425 }, () => 'palabra').join(' ') }]
}

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
const ajustesGuardados = () => JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}')
const estadoToma = () => screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')

async function sembrar() {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  return repo
}

async function abrirGrabar() {
  render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(80)
}

describe('Ajustes de pantallas: el dock de LISTO en Grabar', () => {
  beforeEach(() => {
    localStorage.clear()
    h.encendida = false
    h.lado = 'frontal'
    h.calidades = ['1080p', '720p', '480p']
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    fijarIdioma('es')
  })

  test('AJUSTES ABRE EL PANEL SIN CAMBIAR DE PANTALLA', async () => {
    await abrirGrabar()
    const ajustes = screen.getByTestId('btn-ajustes-toma')
    expect(ajustes.getAttribute('aria-label')).toBe(es.tituloAjustes)
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    fireEvent.click(ajustes)
    const panel = await screen.findByTestId('panel-ajustes-toma')
    expect(within(panel).getByText(es.tituloAjustesToma)).toBeTruthy()
    expect(screen.getByTestId('dock-listo').getAttribute('data-abierto')).toBe('si')
    // Sigue en LISTO de Grabar: no se abre la pantalla Ajustes.
    expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
    expect(estadoToma()).toBe('listo')
    expect(screen.getByTestId('btn-empezar-toma')).toBeTruthy()
    // La X lo cierra y se queda en LISTO.
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    expect(estadoToma()).toBe('listo')
  })

  test('UN CAMBIO EN EL PANEL ES EL MISMO AJUSTE QUE EN LA PANTALLA AJUSTES', async () => {
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    fireEvent.click(await screen.findByTestId('fila-ancho-texto'))
    fireEvent.click(within(screen.getByTestId('dialogo-ancho')).getByRole('menuitemradio', { name: es.angosto }))
    await waitFor(() => expect(ajustesGuardados().columnaAngosta).toBe(true))
    fireEvent.click(screen.getByTestId('switch-espejo'))
    await waitFor(() => expect(ajustesGuardados().mirror).toBe(true))
    cleanup()

    // La pantalla Ajustes de la biblioteca muestra lo elegido en el panel, en las mismas filas.
    render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-menu-superior-biblioteca'))
    await screen.findByTestId('pantalla-ajustes')
    expect(screen.getByTestId('fila-ancho-texto').textContent).toContain(es.angosto)
    expect(screen.getByTestId('switch-espejo').getAttribute('aria-checked')).toBe('true')
  })

  test('GRABAR CON EL PANEL ABIERTO LO CIERRA Y EMPIEZA', async () => {
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    await screen.findByTestId('panel-ajustes-toma')
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    await esperar(3200)
    expect(estadoToma()).toBe('leyendo')
  })

  test('VOLTEAR DE LA FILA HACE LO MISMO QUE EL DEL PANEL DE LA CÁMARA', async () => {
    await abrirGrabar()
    const voltear = screen.getByTestId('btn-voltear-listo')
    expect(voltear.getAttribute('aria-label')).toBe(es.voltearCamara)
    expect(voltear.textContent).toContain(es.voltear)
    fireEvent.click(voltear)
    await waitFor(() => expect(ajustesGuardados().ladoCamara).toBe('trasera'))
    await waitFor(() => expect(h.lado).toBe('trasera'))
    // El de siempre sigue en el panel de la ficha Cámara y vuelve a la frontal.
    fireEvent.click(screen.getByTestId('ficha-camara'))
    fireEvent.click(await screen.findByTestId('btn-voltear-camara'))
    await waitFor(() => expect(ajustesGuardados().ladoCamara).toBe('frontal'))
    await waitFor(() => expect(h.lado).toBe('frontal'))
  })

  test('LA DURACIÓN DE LISTO ES LA DEL EDITOR Y AL GRABAR VUELVE EL CONTADOR', async () => {
    const palabras = contarPalabras(guion)
    expect(duracionDeLecturaReloj(palabras)).toBe('2:50')
    expect(duracionDeLectura(palabras)).toBe('2:50 min')
    await abrirGrabar()
    expect(screen.getByTestId('dock-duracion-valor').textContent).toBe(duracionDeLecturaReloj(palabras))
    expect(screen.getByTestId('dock-duracion').textContent).toContain(es.duraAprox)
    // En LISTO la duración está en el dock, no en la pastilla de siempre.
    expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(3200)
    expect(estadoToma()).toBe('leyendo')
    expect(screen.queryByTestId('dock-listo')).toBeNull()
    expect(screen.getByLabelText(es.tiempoTranscurrido)).toBeTruthy()
  })

  test('CALIDAD APARECE CON LA MISMA CONDICIÓN DE HOY', async () => {
    // La condición, la misma de la ficha de hoy: Grabar y calidades reportadas.
    expect(hayCalidad(true, ['1080p'])).toBe(true)
    expect(hayCalidad(true, [])).toBe(false)
    expect(hayCalidad(false, ['1080p'])).toBe(false)

    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    expect(await screen.findByTestId('fila-calidad')).toBeTruthy()
    fireEvent.click(screen.getByTestId('fila-calidad'))
    fireEvent.click(await screen.findByTestId('btn-calidad-720p'))
    await waitFor(() => expect(ajustesGuardados().calidadVideo).toBe('720p'))
    cleanup()

    h.calidades = []
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    await screen.findByTestId('panel-ajustes-toma')
    expect(screen.queryByTestId('fila-calidad')).toBeNull()
    expect(screen.getByTestId('fila-subtitulos')).toBeTruthy()
  })
})
