import { describe, expect, test } from 'vitest'
import { destinoDelCuadro, elegirCuadro, msDelCuadro } from '../lib/miniaturaFiltro'

describe('miniatura del filtro', () => {
  test('pide el cuadro en currentTime, convertido a milisegundos', () => {
    expect(msDelCuadro(12.4)).toBe(12400)
    expect(msDelCuadro(0)).toBe(0)
    expect(msDelCuadro(-1)).toBe(0)
  })

  test('reutiliza el mismo destino', () => {
    expect(destinoDelCuadro('/tomas/abc.mp4')).toBe('/tomas/abc-filtro.jpg')
    expect(destinoDelCuadro('/tomas/abc.mp4')).toBe(destinoDelCuadro('/tomas/abc.mp4'))
  })

  test('si el nativo falla, se usa la miniatura guardada', () => {
    expect(elegirCuadro(null, '/tomas/abc.jpg')).toBe('/tomas/abc.jpg')
    expect(elegirCuadro('', '/tomas/abc.jpg')).toBe('/tomas/abc.jpg')
    expect(elegirCuadro('/tomas/abc-filtro.jpg', '/tomas/abc.jpg')).toBe('/tomas/abc-filtro.jpg')
  })
})
