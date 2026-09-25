import { describe, expect, test } from 'vitest'
import fs from 'fs'
import path from 'path'
import { armarSubtitulos, subtituloEn, MAX_LETRAS_RENGLON } from '../lib/subtitulos'

// La toma 008a7133 de Javier -24-09-2026, 66 s-, reducida a la cabecera y a las
// palabras con hora: es lo unico que usa el armado. El prototipo del PC saco de
// ella 24 subtitulos con 157 palabras, y Javier los vio quemados en el video:
// "los subtitulos estan muy bien".
const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')

function registro(guion: string, lineas: string[]): string {
  return [
    '# REGISTRO DEL MOTOR DE UNA TOMA',
    '# ---------- GUION, TAL CUAL SE LEYO ----------',
    ...guion.split('\n').map((l) => `# | ${l}`),
    '# ---------------------------------------------',
    '',
    'ms\ttipo\tdetalle',
    ...lineas
  ].join('\n')
}

const texto = (s: { renglones: { texto: string }[][] }) => s.renglones.map((r) => r.map((w) => w.texto).join(' ')).join(' / ')

describe('Subtitulos armados con el guion y la hora de cada palabra', () => {
  test('LA TOMA REAL: el texto es el del guion, en orden, y cada subtitulo cabe en dos renglones', () => {
    const subs = armarSubtitulos(TOMA)
    const palabras = subs.flatMap((s) => s.renglones.flat())
    expect(palabras.length).toBe(157)
    expect(texto(subs[0])).toBe('Hay una idea antigua')
    // Vosk oyo "diga" por "dice": el subtitulo dice lo que dice el guion.
    expect(palabras.map((w) => w.texto)).not.toContain('diga')
    for (let q = 0; q < subs.length; q++) {
      const s = subs[q]
      expect(s.renglones.length).toBeGreaterThanOrEqual(1)
      expect(s.renglones.length).toBeLessThanOrEqual(2)
      for (const r of s.renglones) {
        const letras = r.map((w) => w.texto).join(' ').length
        if (r.length > 1) expect(letras).toBeLessThanOrEqual(MAX_LETRAS_RENGLON)
      }
      expect(s.hastaMs).toBeGreaterThan(s.desdeMs)
      if (q > 0) expect(s.desdeMs).toBeGreaterThanOrEqual(subs[q - 1].hastaMs)
    }
    // Las horas de las palabras avanzan: ninguna va antes que la anterior.
    for (let k = 1; k < palabras.length; k++) expect(palabras[k].desdeMs).toBeGreaterThanOrEqual(palabras[k - 1].desdeMs)
    // La toma termina a los 66 s: el ultimo subtitulo no puede caer despues.
    expect(subs[subs.length - 1].hastaMs).toBeLessThanOrEqual(66000)
  })

  test('UN SUBTITULO NO TERMINA EN "de la": cuando se corta por espacio, esas palabras pasan al siguiente', () => {
    const subs = armarSubtitulos(TOMA)
    const atadas = new Set(['de', 'la', 'que', 'y', 'el', 'en', 'o', 'a', 'las', 'los', 'un', 'una'])
    for (const s of subs) {
      const ultima = s.renglones[s.renglones.length - 1]
      const w = ultima[ultima.length - 1].texto.toLowerCase()
      if (!/[.?!:;,]$/.test(w)) expect(atadas.has(w)).toBe(false)
    }
  })

  test('LA PALABRA QUE NO SE OYO toma su hora repartida por letras entre las vecinas', () => {
    // "Hola mundo querido amigo": el reconocedor no oyo "querido".
    const r = registro('Hola mundo querido amigo.', [
      '100\tpalabras\tFINAL: hola@0-400 mundo@400-800 amigo@1500-1900'
    ])
    const [s] = armarSubtitulos(r)
    const ws = s.renglones.flat()
    expect(ws.map((w) => w.texto)).toEqual(['Hola', 'mundo', 'querido', 'amigo.'])
    expect(ws[2].desdeMs).toBe(800)
    expect(ws[2].hastaMs).toBe(1500)
    expect(ws[3].desdeMs).toBe(1500)
  })

  test('LAS ACOTACIONES entre corchetes no van al subtitulo', () => {
    const r = registro('Buenas tardes [sonreir] a todos.', [
      '100\tpalabras\tFINAL: buenas@0-300 tardes@300-700 a@900-1000 todos@1000-1400'
    ])
    const ws = armarSubtitulos(r).flatMap((s) => s.renglones.flat())
    expect(ws.map((w) => w.texto)).toEqual(['Buenas', 'tardes', 'a', 'todos.'])
  })

  test('SI SE CORTA HABLANDO, lo dicho despues de la ultima frase cerrada toma la hora del seguidor', () => {
    const r = registro('uno dos tres cuatro cinco', [
      '100\tpalabras\tFINAL: uno@0-300 dos@300-600',
      '1500\tcalce\ttoken 4: tres cuatro cinco'
    ])
    const ws = armarSubtitulos(r).flatMap((s) => s.renglones.flat())
    expect(ws.map((w) => w.texto)).toEqual(['uno', 'dos', 'tres', 'cuatro', 'cinco'])
    expect(ws[4].hastaMs).toBe(1200)
  })

  test('subtituloEn devuelve el que corresponde a cada instante, y ninguno en los huecos', () => {
    const subs = armarSubtitulos(TOMA)
    expect(subtituloEn(subs, subs[0].desdeMs + 10)).toBe(subs[0])
    expect(subtituloEn(subs, subs[1].desdeMs + 10)).toBe(subs[1])
    expect(subtituloEn(subs, 999999)).toBeNull()
    expect(armarSubtitulos('')).toEqual([])
  })
})
