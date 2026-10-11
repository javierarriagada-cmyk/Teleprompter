// TAREA 93 -05-10-2026-: LA FLECHA Y LA SEGUNDA FILA DE FICHAS EN GRABAR, a través de <App>.
// Solo en Grabar, en Listo: la primera fila queda con Aa, Cámara, Posición, Brillo y una flecha;
// la flecha abre Calidad, Subtítulos y Ajustes. De pie encima; de lado, columna al costado.
// Leer no cambia. jsdom no mide: el orden se mira en el DOM y las reglas CSS en el archivo.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import 'fake-indexeddb/auto'
import fs from 'node:fs'
import path from 'node:path'

const h = vi.hoisted(() => ({
  lado: 'frontal' as 'frontal' | 'trasera',
  encendida: false
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
  // El plugin fingido, como en tarea83-controles: addListener devuelve un manejador con remove
  // -si no, al desmontar falla h.remove-; lo que no se nombra responde con una promesa vacía.
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
    // Sin calidades reales el carril no dibuja Calidad; las pruebas de la flecha no la necesitan.
    // Con calidades, Ajustes y Subtítulos siguen ahí y Calidad también.
    obtenerCalidadesSoportadas: async () => ['1080p', '720p', '480p']
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
import { Guion } from '../datos/modelo'
import { es } from '../textos/es'
import { fijarIdioma } from '../lib/idioma'
import { CONSULTA_TEL_H, CONSULTA_TAB_H } from '../hooks/useLayout'

const guion: Guion = {
  id: 'g-93', titulo: 'Flecha', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'si me vieras por dentro sabrías que no duermo nunca' }]
}

const matchMediaOriginal = window.matchMedia
function fingirDeLado(consulta: string) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === consulta,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any
}

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

async function abrirGrabar() {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  // Esperar a que lleguen las calidades -así aparece ficha-calidad en la segunda fila-.
  await esperar(80)
}

function testidsDelCarril(nodo: HTMLElement): string[] {
  return Array.from(nodo.querySelectorAll('[data-testid]'))
    .map((e) => e.getAttribute('data-testid') || '')
    .filter(Boolean)
}

const CSS_AJUSTES = fs.readFileSync(path.resolve(__dirname, '../styles-ajustes.css'), 'utf8')
const CSS_H = fs.readFileSync(path.resolve(__dirname, '../styles-horizontal.css'), 'utf8')
const CSS_TAB = fs.readFileSync(path.resolve(__dirname, '../styles-tableta.css'), 'utf8')

describe('Tarea 93: la flecha y la segunda fila de fichas en Grabar', () => {
  beforeEach(() => {
    localStorage.clear()
    h.encendida = false
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.matchMedia = matchMediaOriginal
    fijarIdioma('es')
  })

  test('LA FLECHA MUESTRA Y ESCONDE LA SEGUNDA FILA', async () => {
    // -ajustes de pantallas, 10-10-2026- De pie en el teléfono la flecha ya no está -el dock de LISTO,
    // Calidad y Subtítulos van al panel de Ajustes-: la flecha se prueba de lado, donde sigue. Antes:
    // await abrirGrabar() -de pie-.
    fingirDeLado(CONSULTA_TEL_H)
    await abrirGrabar()
    const flecha = await screen.findByTestId('ficha-flecha')
    expect(flecha.getAttribute('aria-expanded')).toBe('false')
    expect(flecha.getAttribute('aria-label')).toBe(es.masOpciones)
    expect(screen.queryByTestId('segunda-fila-fichas')).toBeNull()
    // En Grabar, Más ya no está; Ajustes tampoco, hasta abrir la flecha.
    expect(screen.queryByTestId('ficha-mas')).toBeNull()
    expect(screen.queryByTestId('ficha-ajustes')).toBeNull()

    fireEvent.click(flecha)
    const segunda = await screen.findByTestId('segunda-fila-fichas')
    expect(flecha.getAttribute('aria-expanded')).toBe('true')
    expect(flecha.getAttribute('aria-label')).toBe(es.menosOpciones)
    const ids = testidsDelCarril(segunda)
    expect(ids).toContain('ficha-calidad')
    expect(ids).toContain('ficha-subtitulos')
    expect(ids).toContain('ficha-ajustes')
    expect(ids.indexOf('ficha-calidad')).toBeLessThan(ids.indexOf('ficha-subtitulos'))
    expect(ids.indexOf('ficha-subtitulos')).toBeLessThan(ids.indexOf('ficha-ajustes'))
    // Calidad y Subtítulos ya no están en la primera fila.
    const primera = screen.getByTestId('fila-fichas-listo')
      .querySelector('.carril-fichas:not(.segunda-fila-fichas)') as HTMLElement
    // -ajustes de pantallas- El orden pasa a Texto -letra, anclaje- y Cámara -cámara, brillo-. Antes:
    // ['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-flecha']
    expect(testidsDelCarril(primera)).toEqual([
      'ficha-letra', 'ficha-anclaje', 'ficha-camara', 'ficha-brillo', 'ficha-flecha'
    ])

    fireEvent.click(flecha)
    expect(screen.queryByTestId('segunda-fila-fichas')).toBeNull()
    expect(flecha.getAttribute('aria-expanded')).toBe('false')
  })

  test('DE PIE LA FILA CABE SIN DESLIZAR', async () => {
    // jsdom no mide anchos: se comprueba el orden -cinco fichas, flecha al final- y la regla CSS
    // que pone la segunda fila encima -bottom calc(100% + 8px)-. Si a 412 px no cabe, se anota
    // en el informe; no se achican las fichas.
    // -ajustes de pantallas, 10-10-2026- De pie en el teléfono la fila es la de arriba del dock de
    // LISTO: Texto -letra, anclaje-, Cámara -cámara, brillo- y Ajustes; sin flecha ni segunda fila,
    // a propósito. Antes:
    // await abrirGrabar()
    // const primera = screen.getByTestId('fila-fichas-listo')
    //   .querySelector('.carril-fichas:not(.segunda-fila-fichas)') as HTMLElement
    // expect(testidsDelCarril(primera)).toEqual([
    //   'ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-flecha'
    // ])
    // expect(CSS_AJUSTES).toMatch(/\.segunda-fila-fichas\s*\{[^}]*bottom:\s*calc\(100%\s*\+\s*8px\)/s)
    // // De pie no lleva al-costado.
    // fireEvent.click(screen.getByTestId('ficha-flecha'))
    // const segunda = await screen.findByTestId('segunda-fila-fichas')
    // expect(segunda.classList.contains('al-costado')).toBe(false)
    await abrirGrabar()
    const fila = screen.getByTestId('dock-listo').querySelector('.carril-dock') as HTMLElement
    expect(testidsDelCarril(fila).filter((id) => id.startsWith('ficha-') || id === 'btn-ajustes-toma')).toEqual([
      'ficha-letra', 'ficha-anclaje', 'ficha-camara', 'ficha-brillo', 'btn-ajustes-toma'
    ])
    expect(screen.queryByTestId('ficha-flecha')).toBeNull()
    expect(screen.queryByTestId('segunda-fila-fichas')).toBeNull()
    // La regla de la segunda fila sigue para el teléfono de lado y la tableta.
    expect(CSS_AJUSTES).toMatch(/\.segunda-fila-fichas\s*\{[^}]*bottom:\s*calc\(100%\s*\+\s*8px\)/s)
  })

  // Un solo nombre exacto (sin sufijo) para el informe: se corre de pie, que es el caso base.
  test('DE LADO LA SEGUNDA FILA ABRE AL COSTADO', async () => {
    // Teléfono y tableta: la clase al-costado y la regla left: calc(100% + 8px).
    for (const [consulta, css] of [[CONSULTA_TEL_H, CSS_H], [CONSULTA_TAB_H, CSS_TAB]] as const) {
      fingirDeLado(consulta)
      await abrirGrabar()
      fireEvent.click(await screen.findByTestId('ficha-flecha'))
      const segunda = await screen.findByTestId('segunda-fila-fichas')
      expect(segunda.classList.contains('al-costado')).toBe(true)
      expect(css).toMatch(/segunda-fila-fichas[\s\S]*?left:\s*calc\(100%\s*\+\s*8px\)/)
      cleanup()
    }
  })

  test('AJUSTES EN LA SEGUNDA FILA ABRE LA PANTALLA DE AJUSTES', async () => {
    // -ajustes de pantallas, 10-10-2026- De lado: de pie la segunda fila ya no está -Ajustes abre el
    // panel en el dock, ajustes-pantallas.test.tsx-. Antes: await abrirGrabar() -de pie-.
    fingirDeLado(CONSULTA_TEL_H)
    await abrirGrabar()
    fireEvent.click(await screen.findByTestId('ficha-flecha'))
    const ajustes = await screen.findByTestId('ficha-ajustes')
    expect(ajustes.getAttribute('aria-label')).toBe(es.tituloAjustes)
    expect(within(ajustes).getByText(es.tituloAjustes)).toBeTruthy()
    fireEvent.click(ajustes)
    await screen.findByTestId('pantalla-ajustes')
    expect(screen.getByTestId('pantalla-ajustes')).toBeTruthy()
  })
})
