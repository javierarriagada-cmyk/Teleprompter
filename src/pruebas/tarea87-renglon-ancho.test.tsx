// EL RENGLÓN ANCHO EN EL VISOR Y LA LETRA MENOR -tarea 87, 04-10-2026, aprobado por Javier en el #71-:
//   (1) el visor achica como el archivo: si el renglón más ancho pasa del 88 % de la imagen, la letra de
//       ese subtítulo baja con la misma cuenta que UbicacionSubtitulos.letraQueCabe;
//   (2) la letra es el menor entre lado corto / 18 y lado largo / 32: en 16:9 lo mismo que antes y
//       ninguna vertical cambia -480×640 da 20-.
// jsdom no tiene canvas: la medida -lib/medirTexto.ts- se reemplaza por los avances de Roboto Bold, los
// mismos de UbicacionSubtitulosTest.java -M 1793, W 1792, espacio 509 de 2048 por em-; el resto de las
// letras, 0,55 em.
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi, afterEach } from 'vitest'
import { render, act, fireEvent, cleanup } from '@testing-library/react'

const EM: Record<string, number> = { M: 1793 / 2048, W: 1792 / 2048, ' ': 509 / 2048 }
const enEm = (t: string) => [...t].reduce((s, c) => s + (EM[c] ?? 0.55), 0)
vi.mock('../lib/medirTexto', () => ({
  anchoDelRenglonMasAncho: (renglones: string[], letra: number) => Math.max(...renglones.map((r) => enEm(r) * letra))
}))

import * as S from '../lib/subtitulos'
import { CapaSubtitulos } from '../components/SubtitulosVisor'

const JAVA = fs.readFileSync(path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'java', 'com', 'sigoteleprompter', 'app', 'UbicacionSubtitulos.java'), 'utf8')
const MW47 = 'MW'.repeat(24).slice(0, 47)
const sub = (renglones: string[]): S.Subtitulo => ({ desdeMs: 0, hastaMs: 5000, renglones: renglones.map((r) => r.split(' ').map((t) => ({ texto: t, desdeMs: 0, hastaMs: 100 }))) })

// Un <video> con la forma del archivo y la caja que le da el visor.
function capa(subs: S.Subtitulo[], ancho: number, alto: number, cajaAncho: number, cajaAlto: number) {
  const v = document.createElement('video')
  Object.defineProperty(v, 'videoWidth', { configurable: true, value: ancho })
  Object.defineProperty(v, 'videoHeight', { configurable: true, value: alto })
  Object.defineProperty(v, 'clientWidth', { configurable: true, value: cajaAncho })
  Object.defineProperty(v, 'clientHeight', { configurable: true, value: cajaAlto })
  Object.defineProperty(v, 'currentTime', { configurable: true, writable: true, value: 1 })
  document.body.appendChild(v)
  render(<CapaSubtitulos video={v} subtitulos={subs} estilo="amarillo" />)
  return v
}
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 20)) })
afterEach(() => { cleanup(); document.body.innerHTML = '' })

describe('(2) La letra: el menor entre lado corto / 18 y lado largo / 32', () => {
  test('480×640 -vertical 3:4- da 20, como antes -640 / 32-; 640×480 también', () => {
    expect(S.letraSubtitulo(480, 640)).toBe(20)
    expect(S.letraSubtitulo(640, 480)).toBe(20)
  })
  test('GUARDIANA: en 16:9 lo de ahora -60 en 1080, 40 en 720-, de pie y acostado', () => {
    expect(S.letraSubtitulo(1920, 1080)).toBe(60)
    expect(S.letraSubtitulo(1080, 1920)).toBe(60)
    expect(S.letraSubtitulo(1280, 720)).toBe(40)
    expect(S.letraSubtitulo(720, 1280)).toBe(40)
  })
})

describe('(1) El visor achica el renglón ancho como el archivo', () => {
  test('la cuenta: 47 MW a 60 px en 1920 -2468 px- bajan a ~41,07 y caben en el 88 %', () => {
    const ancho = enEm(MW47) * 60
    expect(ancho).toBeGreaterThan(1920 * 0.88)
    const l = S.letraQueCabe(60, ancho, 1920)
    expect(l).toBeCloseTo(41.07, 1)
    expect(enEm(MW47) * l).toBeLessThanOrEqual(1920 * S.ANCHO_UTIL_SUBTITULOS + 1e-6)
    // Si cabe, no cambia.
    expect(S.letraQueCabe(60, 1000, 1920)).toBe(60)
  })

  for (const [donde, cw, ch] of [['de pie', 372, 209.25], ['de lado, caso 1', 638, 358.875]] as const) {
    test(`47 MW ${donde}: el renglón queda dentro del 88 % de la imagen, y la letra es la del archivo`, async () => {
      capa([sub([MW47])], 1920, 1080, cw, ch)
      await esperar()
      const c = document.querySelector('[data-testid="capa-subtitulos"]') as HTMLElement
      const letra = parseFloat(c.style.fontSize)
      const w = parseFloat(c.style.width)
      expect(enEm(MW47) * letra).toBeLessThanOrEqual(w * 0.88 + 1e-6)
      expect(letra).toBeLessThan(S.letraSubtitulo(w, parseFloat(c.style.height)))
      // La misma letra que el archivo de 1920×1080, en proporción a la imagen.
      const archivo = S.letraQueCabe(60, enEm(MW47) * 60, 1920)
      expect(letra * (1920 / w)).toBeCloseTo(archivo, 3)
    })
  }

  test('GUARDIANA: un renglón que cabe no cambia la letra', async () => {
    capa([sub(['que podríamos llamar la concepción', 'trágica de la naturaleza humana.'])], 1920, 1080, 372, 209.25)
    await esperar()
    const c = document.querySelector('[data-testid="capa-subtitulos"]') as HTMLElement
    expect(parseFloat(c.style.fontSize)).toBeCloseTo(209.25 / 18, 6)
  })

  test('GUARDIANA: las cifras de TS y de Java son las mismas', () => {
    expect(JAVA).toMatch(new RegExp(`ANCHO_UTIL = ${S.ANCHO_UTIL_SUBTITULOS}f;`))
    expect(JAVA).toMatch(new RegExp(`LADO_LARGO_EN_LETRAS = ${S.LADO_LARGO_EN_LETRAS}f;`))
  })
})
