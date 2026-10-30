import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { bloqueDeBienvenida, tituloDeBienvenida } from '../App'

// EL GUION "HOLA" MUESTRA LO QUE EXPLICA -24-09-2026-: la negrita, los tres colores y el
// destacado caen sobre las mismas palabras que los nombran.
// -bienvenida-nueva, 2026-10-29- El texto ya no nombra ámbar/celeste/verde uno a uno:
// negrita (y bold/negrito) sobre la palabra; colores y destacado sobre frases relevantes.
describe('Guion de bienvenida', () => {
  test('B1 Cada formato cae sobre su muestra, y estan los cinco.', () => {
    const b = bloqueDeBienvenida('es')
    const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])
    expect(pintado).toEqual(expect.arrayContaining([
      ['negrita', 'negrita'],
      ['al ritmo en que hablas', 'ambar'],
      ['el texto te espera', 'celeste'],
      ['colores', 'salvia'],
      ['destacado amarillo', 'destacado']
    ]))
    expect(pintado.length).toBeGreaterThan(5)
  })

  test('B3 Los tramos van en orden y ninguno pisa al siguiente.', () => {
    const t = bloqueDeBienvenida('es').tramos || []
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeGreaterThanOrEqual(t[i - 1].hasta)
  })

  test('B2 Empieza igual que siempre y termina invitando a escribir.', () => {
    const b = bloqueDeBienvenida('es')
    expect(tituloDeBienvenida('es')).toBe('Hola')
    expect(b.texto.startsWith('Hola. Lee esto en voz alta')).toBe(true)
    // Antes: 'Escríbenos a hola@sigoteleprompter.com'
    expect(b.texto).toContain('cuéntanos en hola@sigoteleprompter.com')
    expect(b.texto).toContain('[Respira y sonríe.]')
    expect(b.texto).toContain('Tú hablas. Sigo te sigue.')
  })
})

// EL HOLA EN INGLES -tarea 75, 27-09-2026-: las mismas comprobaciones, mas una: el texto es
// el de docs/ingles.txt, seccion 5, letra por letra.
describe('Guion de bienvenida en ingles', () => {
  const b = bloqueDeBienvenida('en')
  const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])

  test('B1en Cada formato cae sobre su muestra, y estan los cinco.', () => {
    expect(pintado).toEqual(expect.arrayContaining([
      ['bold', 'negrita'],
      ['at the pace you speak', 'ambar'],
      ['the text waits for you', 'celeste'],
      ['colors', 'salvia'],
      ['yellow highlight', 'destacado']
    ]))
  })

  test('B4en Estan tambien los formatos de la grabacion de prueba que lista docs/ingles.txt.', () => {
    // -bienvenida-nueva, 2026-10-29- Antes: without you touching anything, so your eyes…,
    // stays out of the video, What you see…, memorize, whenever you want.
    expect(pintado).toEqual(expect.arrayContaining([
      ['Gesture control', 'ambar'],
      ['That time stays out of the video', 'negrita'],
      ['in time with your voice', 'celeste'],
      ['without a time limit', 'salvia'],
      ['without a watermark', 'destacado'],
      ['hello@sigoteleprompter.com', 'celeste'],
      ['Sigo follows', 'negrita']
    ]))
    expect(pintado.length).toBe((bloqueDeBienvenida('es').tramos || []).length)
  })

  test('B3en Los tramos van en orden y ninguno pisa al siguiente.', () => {
    const t = b.tramos || []
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeGreaterThanOrEqual(t[i - 1].hasta)
  })

  test('B2en Se llama Hi, empieza por el saludo y lleva el correo en ingles.', () => {
    expect(tituloDeBienvenida('en')).toBe('Hi')
    expect(b.texto.startsWith('Hi. Read this out loud')).toBe(true)
    // Antes: 'Write to hello@sigoteleprompter.com.'
    expect(b.texto).toContain('let us know at hello@sigoteleprompter.com.')
    expect(b.texto).toContain('[Breathe and smile.]')
    expect(b.texto).not.toContain('hola@')
  })

  test('B5en Es el texto de docs/ingles.txt, seccion 5, letra por letra.', () => {
    const doc = readFileSync(resolve(__dirname, '../../docs/ingles.txt'), 'utf8')
    const desde = doc.indexOf('Hi. Read this out loud')
    // Antes: fin = 'All the best.'
    const fin = 'You speak. Sigo follows.'
    const hasta = doc.indexOf(fin, desde) + fin.length
    expect(desde).toBeGreaterThan(0)
    const delDocumento = doc.slice(desde, hasta).replace(/\r\n/g, '\n')
    expect(b.texto).toBe(delDocumento)
  })
})
