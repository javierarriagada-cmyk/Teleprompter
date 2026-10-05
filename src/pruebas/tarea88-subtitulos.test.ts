// TAREA 88 -04-10-2026-: LOS SUBTÍTULOS DE UNA TOMA CON CORTES -subtitulosConCortes, src/lib/subtitulos.ts-.
// docs/tarea88.txt, sección 5.1. Son los MISMOS que se queman y los que muestra el visor. Pruebas con
// lógica, menos la primera, que es guardiana del refactor -armarSubtitulos = cortarEnSubtitulos(armarPalabras)-.
import { describe, test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { armarSubtitulos, armarPalabras, subtitulosConCortes } from '../lib/subtitulos'

const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const CORTE = { desdeMs: 20_000, hastaMs: 25_000 }
const palabrasDe = (subs: { renglones: { texto: string; desdeMs: number; hastaMs: number }[][] }[]) => subs.flatMap((s) => s.renglones.flat())

describe('Tarea 88: subtítulos con cortes', () => {
  test('sin cortes, subtitulosConCortes === armarSubtitulos', () => {
    expect(subtitulosConCortes(TOMA, 'vertical', [])).toEqual(armarSubtitulos(TOMA, 'vertical'))
    expect(subtitulosConCortes(TOMA, 'horizontal', [])).toEqual(armarSubtitulos(TOMA, 'horizontal'))
    // El refactor no cambia nada: las palabras armadas son las mismas que quedan en los subtítulos.
    expect(palabrasDe(armarSubtitulos(TOMA)).map((w) => w.texto)).toEqual(armarPalabras(TOMA).map((w) => w.texto))
  })
  test('todas las palabras después de un corte se corren lo mismo', () => {
    const antes = armarPalabras(TOMA).filter((w) => (w.desdeMs + w.hastaMs) / 2 < CORTE.desdeMs || (w.desdeMs + w.hastaMs) / 2 >= CORTE.hastaMs)
    const despues = palabrasDe(subtitulosConCortes(TOMA, 'vertical', [CORTE]))
    expect(despues.map((w) => w.texto)).toEqual(antes.map((w) => w.texto))
    let vistas = 0
    antes.forEach((w, k) => {
      if (w.desdeMs < CORTE.hastaMs) return
      vistas++
      expect(despues[k].desdeMs).toBe(w.desdeMs - 5000)
      expect(despues[k].hastaMs).toBe(w.hastaMs - 5000)
    })
    expect(vistas).toBeGreaterThan(50)
  })
  test('ningún subtítulo cruza una unión', () => {
    const subs = subtitulosConCortes(TOMA, 'vertical', [CORTE, { desdeMs: 40_000, hastaMs: 41_500 }])
    const uniones = [20_000, 40_000 - 5000]
    for (const s of subs) for (const u of uniones) expect(s.hastaMs <= u || s.desdeMs >= u).toBe(true)
    // Y sin la unión, alguno la cruzaría: la prueba mira algo.
    const sinUnion = armarSubtitulos(TOMA, 'vertical')
    expect(sinUnion.some((s) => s.desdeMs < 20_000 && s.hastaMs > 20_000)).toBe(true)
  })
  test('la palabra cuyo medio cae en el corte desaparece', () => {
    const ps = armarPalabras(TOMA)
    const w = ps[40]
    const medio = (w.desdeMs + w.hastaMs) / 2
    const subs = subtitulosConCortes(TOMA, 'vertical', [{ desdeMs: medio - 10, hastaMs: medio + 10 }])
    const quedan = palabrasDe(subs)
    expect(quedan.length).toBe(ps.length - 1)
    expect(quedan.map((x) => x.texto)).toEqual(ps.filter((_, k) => k !== 40).map((x) => x.texto))
  })
  test('en horizontal sigue usando 47 letras', () => {
    const subs = subtitulosConCortes(TOMA, 'horizontal', [CORTE])
    const largos = subs.flatMap((s) => s.renglones.filter((r) => r.length > 1).map((r) => r.map((w) => w.texto).join(' ').length))
    expect(Math.max(...largos)).toBeGreaterThan(32)
    expect(Math.max(...largos)).toBeLessThanOrEqual(47)
  })
})
