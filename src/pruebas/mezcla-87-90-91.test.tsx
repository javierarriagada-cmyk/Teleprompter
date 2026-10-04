// LA MEZCLA DE LA TAREA 87 SIMPLIFICADA CON LA 90 Y LA 91 -04-10-2026-. main avanzó a 900a982 con el
// visor de lado -#68- y la orientación fija mientras dura la toma -#69-, y se mezcló en
// tarea87-implementacion. Estas pruebas fijan lo que la mezcla tiene que cuidar:
//   - de pie, la tarjeta de la 87 -A4: visor-arriba y las acciones fijas fuera-; de lado, la de la 90,
//     sin A4;
//   - el subtítulo a 1/6 del alto de la imagen también de lado, en los dos casos;
//   - el panel de Subtítulos de lado, sin Posición ni tiempo estimado;
//   - la orientación de la 87 -la forma del archivo, analizarVideo- no fija ni suelta la pantalla de
//     la 91.
// Mismo andamiaje que tarea90.test.tsx: matchMedia, el tamaño de la ventana y los bordes de Capacitor.
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, cleanup } from '@testing-library/react'

const barras = vi.hoisted(() => ({
  hide: vi.fn(async (_o?: any) => {}),
  show: vi.fn(async (_o?: any) => {}),
  setStyle: vi.fn(async (_o?: any) => {})
}))
const h = vi.hoisted(() => ({ registro: null as string | null, analisis: null as any, analizadas: 0 }))
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, isNativePlatform: () => true, convertFileSrc: (r: string) => r, getPlatform: () => 'android' },
    SystemBars: barras
  }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async (ruta: string) => {
      if (ruta.endsWith('.motor.txt') && h.registro) return h.registro
      throw new Error('no existe ' + ruta)
    },
    escribirTexto: async () => {},
    analizarVideo: async () => {
      h.analizadas++
      if (!h.analisis) throw new Error('sin análisis')
      return h.analisis
    }
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva } from '../datos/modelo'
import { armarSubtitulos } from '../lib/subtitulos'
import { lineasOrientacion, limpiarRegistroOrientacion, orientacionBloqueada } from '../lib/orientacionToma'

const REGISTRO = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const SUBS = armarSubtitulos(REGISTRO)

let deLado = false
const oyentes = new Set<() => void>()
function ponerVentana(ancho: number, alto: number, lado = true) {
  deLado = lado
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: ancho })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: alto })
  const s = document.documentElement.style
  s.setProperty('--safe-area-inset-top', '0px')
  s.setProperty('--safe-area-inset-bottom', '0px')
  s.setProperty('--safe-area-inset-left', lado ? '44px' : '0px')
  s.setProperty('--safe-area-inset-right', lado ? '48px' : '0px')
  ;(window as any).matchMedia = (q: string) => ({
    get matches() { return q.includes('max-height: 479.98px') ? deLado : false },
    media: q,
    addEventListener: (_: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_: string, f: () => void) => oyentes.delete(f)
  })
}
// La forma del archivo y la caja que le da el visor -la de la imagen sale de las dos-.
function cargarVideo(ancho: number, alto: number, cajaAncho: number, cajaAlto: number) {
  const v = document.querySelector('video') as HTMLVideoElement
  Object.defineProperty(v, 'videoWidth', { configurable: true, value: ancho })
  Object.defineProperty(v, 'videoHeight', { configurable: true, value: alto })
  Object.defineProperty(v, 'clientWidth', { configurable: true, value: cajaAncho })
  Object.defineProperty(v, 'clientHeight', { configurable: true, value: cajaAlto })
  Object.defineProperty(v, 'currentTime', { configurable: true, writable: true, value: (SUBS[0].desdeMs + 10) / 1000 })
  fireEvent(v, new Event('loadedmetadata'))
  fireEvent(v, new Event('seeked'))
  return Math.min(cajaAncho / ancho, cajaAlto / alto) * alto
}
const esperar = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
const toma = (extra: any = {}) => ({ ...grabacionNueva({ id: 't87m', tituloGuion: 'Larralde', duracionMs: 300000, ruta: '/grabaciones/t87m.mp4' }), ...extra })
async function abrir(extra: any = {}, props: any = {}) {
  const r = render(<ReproductorGrabacion grabacion={toma(extra)} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} {...props} />)
  await esperar()
  return r
}
const raiz = () => document.querySelector('[data-testid="reproductor-grabacion"]') as HTMLElement
const subtitulo = () => document.querySelector('[data-testid="capa-subtitulos"] .subtitulo') as HTMLElement | null

beforeEach(() => {
  h.registro = REGISTRO
  h.analisis = null
  h.analizadas = 0
  localStorage.clear()
  localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
  oyentes.clear()
  limpiarRegistroOrientacion()
})
afterEach(() => cleanup())

describe('Mezcla 87 + 90: A4 solo de pie', () => {
  test('DE PIE: la tarjeta de la 87 -visor-arriba y las acciones fijas fuera-, sin disposición de lado', async () => {
    ponerVentana(412, 915, false)
    await abrir()
    expect(raiz().getAttribute('data-visor')).toBeNull()
    const tarjeta = raiz().firstElementChild as HTMLElement
    const arriba = tarjeta.querySelector('[data-testid="visor-arriba"]') as HTMLElement
    expect(arriba).not.toBeNull()
    const acciones = tarjeta.querySelector('.acciones-toma') as HTMLElement
    expect(arriba.contains(acciones)).toBe(false)
    expect(acciones.style.flexShrink).toBe('0')
    expect(tarjeta.style.maxHeight).toBe('100%')
    expect(document.querySelector('[data-testid="btn-compartir-nueva"]')).not.toBeNull()
  })

  test('DE LADO, CASO 1: la columna de la 90, sin visor-arriba ni la tarjeta de pie', async () => {
    ponerVentana(915, 411)
    await abrir()
    cargarVideo(1920, 1080, 548, 308)
    await esperar()
    expect(raiz().getAttribute('data-caso')).toBe('1')
    expect(document.querySelector('[data-testid="visor-arriba"]')).toBeNull()
    const columna = document.querySelector('[data-testid="visor-lado-columna"]') as HTMLElement
    expect(columna.querySelector('[data-testid="visor-lado-acciones"]')).not.toBeNull()
    expect(columna.querySelectorAll('[data-fila-accion]').length).toBeGreaterThan(0)
  })
})

describe('Mezcla 87 + 90: el subtítulo a 1/6 también de lado', () => {
  test('DE LADO, CASO 1 -16:9-: marginBottom = alto de la imagen / 6', async () => {
    ponerVentana(915, 411)
    await abrir()
    cargarVideo(1920, 1080, 548, 308)
    await esperar()
    expect(raiz().getAttribute('data-caso')).toBe('1')
    // Al pasar al caso 1 el <video> es otro elemento -el de la columna-: se le da la forma de nuevo.
    const alto = cargarVideo(1920, 1080, 548, 308)
    await esperar()
    const s = subtitulo()
    expect(s).not.toBeNull()
    expect(parseFloat(s!.style.marginBottom)).toBeCloseTo(alto / 6, 3)
  })

  test('DE LADO, CASO 2 -9:16-: marginBottom = alto de la imagen / 6', async () => {
    ponerVentana(915, 411)
    await abrir()
    const alto = cargarVideo(1080, 1920, 203, 411)
    await esperar()
    expect(raiz().getAttribute('data-caso')).toBe('2')
    const s = subtitulo()
    expect(s).not.toBeNull()
    expect(parseFloat(s!.style.marginBottom)).toBeCloseTo(alto / 6, 3)
  })
})

describe('Mezcla 87 + 90: el panel de Subtítulos de lado, sin Posición ni tiempo estimado', () => {
  for (const [caso, w, hh] of [['1', 1920, 1080], ['2', 1080, 1920]] as const) {
    test(`DE LADO, CASO ${caso}: el panel abre con los estilos y sin Posición`, async () => {
      ponerVentana(915, 411)
      await abrir()
      cargarVideo(w, hh, 300, 300)
      await esperar()
      expect(raiz().getAttribute('data-caso')).toBe(caso)
      await act(async () => { fireEvent.click(document.querySelector('[data-testid="btn-subtitulos"]') as HTMLElement) })
      expect(document.querySelector('[data-testid="opciones-subtitulos"]')).not.toBeNull()
      expect(document.querySelector('[data-testid="selector-posicion-subtitulos"]')).toBeNull()
      expect(document.querySelector('[data-testid="tiempo-estimado-guardado"]')).toBeNull()
      expect(raiz().textContent).not.toMatch(/Para redes|Guardar tarda/)
    })
  }
})

describe('Mezcla 87 + 91: la orientación del archivo no toca la de la pantalla', () => {
  test('ABRIR UNA TOMA VIEJA LA ANALIZA -87- SIN FIJAR NI SOLTAR LA PANTALLA -91-, de pie y de lado', async () => {
    h.analisis = { duracionMs: 300000, bytes: 1, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1920, altoPx: 1080, rotacion: 90 }
    const onCambio = vi.fn()
    ponerVentana(412, 915, false)
    await abrir({}, { onCambio })
    await esperar(50)
    expect(h.analizadas).toBe(1)
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ orientacion: 'vertical' }))
    act(() => { deLado = true; oyentes.forEach((f) => f()) })
    await esperar()
    expect(raiz().getAttribute('data-visor')).toBe('lado')
    expect(orientacionBloqueada()).toBe(false)
    expect(lineasOrientacion()).toEqual([])
  })
})
