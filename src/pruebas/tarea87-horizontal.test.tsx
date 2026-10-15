// LOS SUBTÍTULOS EN HORIZONTAL -tarea 87, 04-10-2026, pedido de Javier en el #71-. En una toma
// horizontal el subtítulo dejaba de verse angosto y chico por usar las medidas de la vertical:
//   (1) renglones de hasta 47 letras en horizontal; en vertical siguen siendo 32;
//   (2) la letra contra el LADO CORTO del cuadro -1/18: 60 px en 1080, 40 en 720-, en las dos
//       orientaciones. La vertical queda igual al píxel.
// La posición a 1/6 no se toca. Las mismas cifras en Java -UbicacionSubtitulos-.
import React from 'react'
import { elegirEstiloEnVisor } from './ayudaEstiloVisor'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, cleanup } from '@testing-library/react'

const h = vi.hoisted(() => ({ registro: '' as string }))
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async (ruta: string) => {
      if (ruta.endsWith('.motor.txt')) return h.registro
      throw new Error('no existe ' + ruta)
    },
    analizarVideo: async () => { throw new Error('sin análisis') }
  }
})

import * as S from '../lib/subtitulos'
import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva } from '../datos/modelo'

const REGISTRO = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const FOTO = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus', 'subtitulos-verticales-d9e9c83.json'), 'utf8'))
const JAVA = fs.readFileSync(path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'java', 'com', 'sigoteleprompter', 'app', 'UbicacionSubtitulos.java'), 'utf8')
const texto = (r: S.PalabraSubtitulo[]) => r.map((w) => w.texto).join(' ')
const palabras = (frase: string) => frase.split(' ').map((t, i) => ({ texto: t, desdeMs: i * 100, hastaMs: i * 100 + 90 }))

describe('Horizontal: el largo del renglón según la forma del cuadro', () => {
  test('47 letras en horizontal y 32 en vertical; cuadrado como vertical', () => {
    expect(S.letrasPorRenglon('horizontal')).toBe(47)
    expect(S.letrasPorRenglon('vertical')).toBe(32)
    expect(S.letrasPorRenglon('cuadrada')).toBe(32)
    expect(S.formaDelCuadro(1920, 1080)).toBe('horizontal')
    expect(S.formaDelCuadro(1080, 1920)).toBe('vertical')
    expect(S.formaDelCuadro(1080, 1080)).toBe('vertical')
  })

  test('una frase de 45 letras: un renglón en horizontal, dos en vertical', () => {
    const ws = palabras('que podríamos llamar la concepción trágica de')
    expect(texto(ws).length).toBe(45)
    expect(S.partirEnRenglones(ws, S.letrasPorRenglon('horizontal')).length).toBe(1)
    expect(S.partirEnRenglones(ws, S.letrasPorRenglon('vertical')).length).toBe(2)
  })

  test('la toma del corpus en horizontal: renglones de más de 32 letras y ninguno de más de 47', () => {
    const subs = S.armarSubtitulos(REGISTRO, 'horizontal')
    const largos = subs.flatMap((s) => s.renglones.map((r) => texto(r).length))
    expect(Math.max(...largos)).toBeGreaterThan(32)
    expect(Math.max(...largos)).toBeLessThanOrEqual(47)
  })

  test('la letra contra el lado corto: 60 en 1920×1080, 40 en 1280×720', () => {
    expect(S.letraSubtitulo(1920, 1080)).toBe(60)
    expect(S.letraSubtitulo(1280, 720)).toBe(40)
  })
})

// GUARDIANAS: la vertical no cambia.
describe('Guardianas: la vertical, igual que antes al píxel', () => {
  test('1080×1920 y 720×1280: la letra de antes -alto / 32-', () => {
    expect(S.letraSubtitulo(1080, 1920)).toBe(1920 / 32)
    expect(S.letraSubtitulo(720, 1280)).toBe(1280 / 32)
  })
  test('los renglones de la toma del corpus en vertical: los mismos de d9e9c83', () => {
    const ahora = S.armarSubtitulos(REGISTRO, 'vertical').map((s) => ({ desdeMs: s.desdeMs, hastaMs: s.hastaMs, renglones: s.renglones.map(texto) }))
    expect(ahora).toEqual(FOTO['toma-008a7133-palabras.motor.txt'])
    // Sin forma, vertical.
    expect(S.armarSubtitulos(REGISTRO)).toEqual(S.armarSubtitulos(REGISTRO, 'vertical'))
    expect(S.MAX_LETRAS_RENGLON).toBe(32)
  })
  test('las cifras de TS y de Java son las mismas', () => {
    expect(JAVA).toMatch(new RegExp(`LETRAS_VERTICAL = ${S.LETRAS_POR_RENGLON.vertical};`))
    expect(JAVA).toMatch(new RegExp(`LETRAS_HORIZONTAL = ${S.LETRAS_POR_RENGLON.horizontal};`))
    expect(JAVA).toMatch(new RegExp(`LADO_CORTO_EN_LETRAS = ${S.LADO_CORTO_EN_LETRAS}f;`))
  })
})

// EN EL VISOR, de pie, con una toma horizontal: la letra y los renglones.
let deLado = false
function dePie() {
  deLado = false
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 412 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 915 })
  ;(window as any).matchMedia = (q: string) => ({ get matches() { return q.includes('max-height: 479.98px') ? deLado : false }, media: q, addEventListener: () => {}, removeEventListener: () => {} })
}
function cargarVideo(ancho: number, alto: number, cajaAncho: number, cajaAlto: number, ms: number) {
  const v = document.querySelector('video') as HTMLVideoElement
  Object.defineProperty(v, 'videoWidth', { configurable: true, value: ancho })
  Object.defineProperty(v, 'videoHeight', { configurable: true, value: alto })
  Object.defineProperty(v, 'clientWidth', { configurable: true, value: cajaAncho })
  Object.defineProperty(v, 'clientHeight', { configurable: true, value: cajaAlto })
  Object.defineProperty(v, 'currentTime', { configurable: true, writable: true, value: ms / 1000 })
  fireEvent(v, new Event('loadedmetadata'))
  fireEvent(v, new Event('seeked'))
}
const esperar = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
beforeEach(() => {
  h.registro = REGISTRO
  localStorage.clear()
  // -tomas-largas- Cada toma parte en «No»: el estilo se elige en el visor. Antes: localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
  dePie()
})
afterEach(() => cleanup())

// El subtítulo del corpus que, en horizontal, junta en un renglón lo que en vertical son dos.
const H = S.armarSubtitulos(REGISTRO, 'horizontal')
const largo = H.find((s) => s.renglones.some((r) => texto(r).length > 32))!

describe('El visor de pie con una toma horizontal', () => {
  test('la letra es la del lado corto de la imagen -alto / 18- y los renglones son los de 47', async () => {
    render(<ReproductorGrabacion grabacion={grabacionNueva({ id: 'h87', tituloGuion: 'Larralde', duracionMs: 60000, ruta: '/grabaciones/h87.mp4', orientacion: 'horizontal' })} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />)
    await esperar()
    // -tomas-largas- La toma parte en «No»: se elige Amarillo en el visor.
    await elegirEstiloEnVisor('Amarillo')
    cargarVideo(1920, 1080, 372, 209.25, largo.desdeMs + 10)
    await esperar()
    const capa = document.querySelector('[data-testid="capa-subtitulos"]') as HTMLElement
    expect(capa).not.toBeNull()
    expect(parseFloat(capa.style.fontSize)).toBeCloseTo(209.25 / 18, 3)
    const renglones = Array.from(capa.querySelectorAll('.subtitulo-renglon')).map((r) => r.textContent || '')
    expect(renglones).toEqual(largo.renglones.map(texto))
    expect(Math.max(...renglones.map((r) => r.length))).toBeGreaterThan(32)
  })

  test('GUARDIANA: con una toma vertical, la letra de antes -alto / 32- y los renglones de 32', async () => {
    render(<ReproductorGrabacion grabacion={grabacionNueva({ id: 'v87', tituloGuion: 'Larralde', duracionMs: 60000, ruta: '/grabaciones/v87.mp4', orientacion: 'vertical' })} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />)
    await esperar()
    // -tomas-largas- La toma parte en «No»: se elige Amarillo en el visor.
    await elegirEstiloEnVisor('Amarillo')
    const V = S.armarSubtitulos(REGISTRO, 'vertical')
    const s = V.find((x) => x.renglones.length === 2)!
    cargarVideo(1080, 1920, 307.125, 546, s.desdeMs + 10)
    await esperar()
    const capa = document.querySelector('[data-testid="capa-subtitulos"]') as HTMLElement
    expect(parseFloat(capa.style.fontSize)).toBeCloseTo(546 / 32, 6)
    expect(Array.from(capa.querySelectorAll('.subtitulo-renglon')).map((r) => r.textContent)).toEqual(s.renglones.map(texto))
  })
})
