// TAREA 87 DE LADO -04-10-2026, pedido de Javier en el #71-: «Guardar y compartir» va también en el
// visor de lado de la 90 -caso 1 en la columna, caso 2 en la tarjeta-, con la misma acción y el mismo
// comportamiento que de pie: mientras se guarda, solo el botón apretado muestra el avance y los demás
// -el otro de guardar, Subtítulos, Repetir y Borrar- quedan desactivados; la X sigue activa. La
// columna de la 90 no cambia: el rótulo de 12 y el toque de 48.
// Andamiaje de mezcla-87-90-91.test.tsx -de lado- y lo nativo de tarea87-compartir.test.tsx.
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
const m = vi.hoisted(() => ({
  registro: '' as string,
  llamadas: [] as any[],
  retener: false,
  soltar: [] as Array<() => void>,
  avanzar: null as null | ((n: number) => void)
}))
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
  const responder = (uri: string) => {
    const res = { ok: true, uri }
    if (!m.retener) return Promise.resolve(res)
    return new Promise((r) => m.soltar.push(() => r(res)))
  }
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async (ruta: string) => {
      if (ruta.endsWith('.motor.txt')) return m.registro
      throw new Error('no existe ' + ruta)
    },
    escribirTexto: async () => {},
    analizarVideo: async () => { throw new Error('sin análisis') },
    guardarEnGaleria: async (ruta: string) => { m.llamadas.push(['tal cual', ruta]); return responder('content://media/1') },
    guardarEnGaleriaConSubtitulos: async (ruta: string, subs: any[], estilo: string, alAvanzar?: (n: number) => void) => {
      m.llamadas.push(['quemada', ruta, subs.length, estilo])
      m.avanzar = alAvanzar || null
      return responder('content://media/2')
    },
    borrarArchivo: async (ruta: string) => { m.llamadas.push(['borrar', ruta]) },
    compartirDeGaleria: async (uri: string) => { m.llamadas.push(['compartir', uri]) }
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva } from '../datos/modelo'
import { es } from '../textos/es'

const REGISTRO = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')

let deLado = true
function ponerVentana(ancho: number, alto: number) {
  deLado = true
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: ancho })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: alto })
  const s = document.documentElement.style
  s.setProperty('--safe-area-inset-top', '0px')
  s.setProperty('--safe-area-inset-bottom', '0px')
  s.setProperty('--safe-area-inset-left', '44px')
  s.setProperty('--safe-area-inset-right', '48px')
  ;(window as any).matchMedia = (q: string) => ({
    get matches() { return q.includes('max-height: 479.98px') ? deLado : false },
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {}
  })
}
function cargarVideo(ancho: number, alto: number) {
  const v = document.querySelector('video') as HTMLVideoElement
  Object.defineProperty(v, 'videoWidth', { configurable: true, value: ancho })
  Object.defineProperty(v, 'videoHeight', { configurable: true, value: alto })
  fireEvent(v, new Event('loadedmetadata'))
}
const esperar = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
const q = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null
const raiz = () => q('reproductor-grabacion') as unknown as HTMLElement
async function abrirDeLado(caso: '1' | '2') {
  ponerVentana(915, 411)
  const onCambio = vi.fn()
  const onGuardadoEnGaleria = vi.fn()
  const g = grabacionNueva({ id: '008a7133', tituloGuion: 'Larralde', duracionMs: 66000, ruta: '/grabaciones/008a7133.mp4' })
  render(<ReproductorGrabacion grabacion={g} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} onCambio={onCambio} onGuardadoEnGaleria={onGuardadoEnGaleria} />)
  await esperar()
  if (caso === '1') cargarVideo(1920, 1080)
  else cargarVideo(1080, 1920)
  await esperar()
  expect(raiz().getAttribute('data-caso')).toBe(caso)
  return { onCambio, onGuardadoEnGaleria }
}
async function tocar(id: string) {
  await act(async () => {
    fireEvent.click(q(id)!)
    await new Promise((r) => setTimeout(r, 20))
  })
}

beforeEach(() => {
  m.registro = REGISTRO
  m.llamadas.length = 0
  m.retener = false
  m.soltar.length = 0
  m.avanzar = null
  localStorage.clear()
  localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
})
afterEach(() => cleanup())

for (const caso of ['1', '2'] as const) {
  const donde = caso === '1' ? 'visor-lado-columna' : 'visor-lado-tarjeta'
  describe(`Tarea 87 de lado, caso ${caso} -${caso === '1' ? 'la columna' : 'la tarjeta'}-: Guardar y compartir`, () => {
    test('ESTÁ en la toma recién grabada, con su rótulo, y GUARDA UNA VEZ Y ABRE COMPARTIR', async () => {
      const { onCambio, onGuardadoEnGaleria } = await abrirDeLado(caso)
      const boton = q('btn-compartir-nueva')
      expect(boton).not.toBeNull()
      expect(q(donde)!.contains(boton)).toBe(true)
      expect(boton!.getAttribute('aria-label')).toBe(es.guardarYCompartir)
      expect(boton!.textContent).toContain(es.guardarYCompartir)
      await tocar('btn-compartir-nueva')
      expect(m.llamadas.filter((l) => l[0] === 'quemada').length).toBe(1)
      expect(m.llamadas).toContainEqual(['compartir', 'content://media/2'])
      expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ galeriaUri: 'content://media/2', estiloGaleria: 'amarillo' }))
      expect(onGuardadoEnGaleria).toHaveBeenCalledWith(true, es.galeriaGuardada)
    })

    test('MIENTRAS GUARDA CON «GUARDAR Y COMPARTIR»: solo el apretado muestra el avance; Guardar, Subtítulos, Repetir y Borrar desactivados; la X activa', async () => {
      m.retener = true
      await abrirDeLado(caso)
      await tocar('btn-compartir-nueva')
      await act(async () => { m.avanzar?.(37) })
      const apretado = q('btn-compartir-nueva')!
      expect(apretado.textContent).toContain('Guardando… 37%')
      expect(apretado.getAttribute('aria-busy')).toBe('true')
      const guardar = q('guardar-galeria-desde-reproductor')!
      expect(guardar.disabled).toBe(true)
      expect(guardar.textContent).not.toContain('Guardando')
      expect(q('btn-repetir-toma')!.disabled).toBe(true)
      expect(q('borrar-desde-reproductor')!.disabled).toBe(true)
      expect(q('btn-subtitulos')!.disabled).toBe(true)
      expect(q('btn-cerrar-reproductor')!.disabled).toBe(false)
      await tocar('btn-compartir-nueva')
      expect(m.llamadas.filter((l) => l[0] === 'quemada').length).toBe(1)
      await act(async () => { m.soltar.forEach((f) => f()); await new Promise((r) => setTimeout(r, 20)) })
      expect(m.llamadas).toContainEqual(['compartir', 'content://media/2'])
    })

    test('MIENTRAS GUARDA CON «GUARDAR»: el avance va en Guardar y no en Guardar y compartir, que queda desactivado', async () => {
      m.retener = true
      await abrirDeLado(caso)
      await tocar('guardar-galeria-desde-reproductor')
      await act(async () => { m.avanzar?.(12) })
      const guardar = q('guardar-galeria-desde-reproductor')!
      expect(guardar.textContent).toContain('Guardando… 12%')
      expect(guardar.getAttribute('aria-busy')).toBe('true')
      const otro = q('btn-compartir-nueva')!
      expect(otro.disabled).toBe(true)
      expect(otro.textContent).not.toContain('Guardando')
      expect(q('btn-repetir-toma')!.disabled).toBe(true)
      expect(q('borrar-desde-reproductor')!.disabled).toBe(true)
      await act(async () => { m.soltar.forEach((f) => f()); await new Promise((r) => setTimeout(r, 20)) })
      expect(m.llamadas.filter((l) => l[0] === 'compartir').length).toBe(0)
    })
  })
}

describe('Tarea 87 de lado, caso 1: la fila nueva entra en la columna de la 90 sin cambiarla', () => {
  test('el orden de las filas, el rótulo de 12 y el toque de 48', async () => {
    await abrirDeLado('1')
    // -tarea 96, 05-10-2026- Se borra el orden de las filas -regla del comienzo de
    // docs/lo-que-hay-que-saber.txt-: con el Filtro hay una más. Antes:
    // const filas = Array.from(document.querySelectorAll('[data-testid="visor-lado-acciones"] > [data-fila-accion]')) as HTMLElement[]
    // expect(filas.map((f) => f.getAttribute('data-testid'))).toEqual([
    //   'guardar-galeria-desde-reproductor', 'btn-compartir-nueva', 'visor-lado-subtitulos', 'btn-repetir-toma', 'borrar-desde-reproductor'
    // ])
    const nueva = q('btn-compartir-nueva')!
    expect(nueva.style.fontSize).toBe('12px')
    expect(nueva.style.minHeight).toBe('48px')
    expect(nueva.style.minWidth).toBe('48px')
    expect((nueva.querySelector('[data-rotulo="compartir"]') as HTMLElement).style.fontSize).toBe('12px')
  })
})
