import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { bloqueDeBienvenida, tituloDeBienvenida } from '../App'

// EL GUION "HOLA" MUESTRA LO QUE EXPLICA -24-09-2026-: la negrita, los tres colores y el
// destacado caen sobre las mismas palabras que los nombran.
describe('Guion de bienvenida', () => {
  test('B1 Cada formato cae sobre la palabra que lo nombra, y estan los cinco.', () => {
    const b = bloqueDeBienvenida('es')
    const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])
    // Desde el 26-09-2026 el Hola lleva mas formatos -para la grabacion de prueba-: los cinco
    // que nombran su formato tienen que seguir estando, entre los demas.
    expect(pintado).toEqual(expect.arrayContaining([
      ['negrita', 'negrita'],
      ['ámbar', 'ambar'],
      ['celeste', 'celeste'],
      ['verde', 'salvia'],
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
    expect(b.texto).toContain('Escríbenos a hola@sigoteleprompter.com')
  })
})

// EL HOLA EN INGLES -tarea 75, 27-09-2026-: las mismas comprobaciones, mas una: el texto es
// el de docs/ingles.txt, seccion 5, letra por letra.
describe('Guion de bienvenida en ingles', () => {
  const b = bloqueDeBienvenida('en')
  const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])

  test('B1en Cada formato cae sobre la palabra que lo nombra, y estan los cinco.', () => {
    expect(pintado).toEqual(expect.arrayContaining([
      ['bold', 'negrita'],
      ['amber', 'ambar'],
      ['light blue', 'celeste'],
      ['green', 'salvia'],
      ['yellow highlight', 'destacado']
    ]))
  })

  test('B4en Estan tambien los formatos de la grabacion de prueba que lista docs/ingles.txt.', () => {
    expect(pintado).toEqual(expect.arrayContaining([
      ['without you touching anything', 'negrita'],
      ['the text waits for you', 'celeste'],
      ['so your eyes go to the camera', 'ambar'],
      ['just as you see it', 'salvia'],
      ["You don't have to memorize anything.", 'negrita'],
      ['whenever you want', 'destacado'],
      ['hello@sigoteleprompter.com', 'celeste']
    ]))
    // Doce en espanol, doce en ingles: ninguno se cayo por no encontrar su frase.
    expect(pintado.length).toBe((bloqueDeBienvenida('es').tramos || []).length)
  })

  test('B3en Los tramos van en orden y ninguno pisa al siguiente.', () => {
    const t = b.tramos || []
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeGreaterThanOrEqual(t[i - 1].hasta)
  })

  test('B2en Se llama Hi, empieza por el saludo y lleva el correo en ingles.', () => {
    expect(tituloDeBienvenida('en')).toBe('Hi')
    expect(b.texto.startsWith('Hi. Read this out loud')).toBe(true)
    expect(b.texto).toContain('Write to hello@sigoteleprompter.com.')
    expect(b.texto).not.toContain('hola@')
  })

  test('B5en Es el texto de docs/ingles.txt, seccion 5, letra por letra.', () => {
    const doc = readFileSync(resolve(__dirname, '../../docs/ingles.txt'), 'utf8')
    const desde = doc.indexOf('Hi. Read this out loud')
    const fin = 'All the best.'
    const hasta = doc.indexOf(fin, desde) + fin.length
    expect(desde).toBeGreaterThan(0)
    const delDocumento = doc.slice(desde, hasta).replace(/\r\n/g, '\n')
    expect(b.texto).toBe(delDocumento)
  })
})
