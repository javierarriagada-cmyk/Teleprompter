import React from 'react'
import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import { aDocumento, deDocumento } from '../datos/docEditor'
import { renderFormattedLine } from '../components/renglones'
import { COLORES_TRAMO, COLORES_TRAMO_SOBRE_CLARO, DESTACADO, TramoFormato } from '../datos/modelo'

// TAREA 73: EL EDITOR CON FORMATO DE VERDAD -Tiptap-, EL DESTACADO Y LOS
// COLORES SOBRE BLANCO. 24-09-2026.

// jsdom puede devolver un color como hex o como rgb(); se comparan los dos.
function mismoColor(css: string, hex: string): boolean {
  const n = css.replace(/\s/g, '').toLowerCase()
  const h = hex.toLowerCase()
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
  return n === h || n === `rgb(${r},${g},${b})`
}

// Como pinta la lectura cada caracter: se compara el efecto, no la lista de
// tramos, porque la vuelta los normaliza.
function pinta(tramos: TramoFormato[], i: number): string {
  let n = false, d = false
  let c: string | undefined
  for (const t of tramos) {
    if (i >= t.desde && i < t.hasta) {
      if (t.negrita) n = true
      if (t.destacado) d = true
      if (t.color) c = t.color
    }
  }
  return `${n}|${d}|${c}`
}

describe('Tarea 73 - editor con formato', () => {
  // T288 - GUARDIANA DE LO GUARDADO. El editor trabaja con parrafos y marcas,
  // pero el guion se sigue guardando como texto + tramos, que es lo que lee el
  // motor. Si la traduccion pierde un caracter, un salto de linea o una
  // marca, la lectura deja de coincidir con lo que se escribio.
  test('T288 - ida y vuelta: el texto vuelve identico y cada caracter conserva negrita, color y destacado', () => {
    const texto = 'Hola [pausa] mundo\n\nSegunda  linea con  dobles espacios\n(respira) fin'
    const tramos: TramoFormato[] = [
      { desde: 0, hasta: 4, negrita: true },
      { desde: 13, hasta: 18, color: 'ambar' },
      { desde: 15, hasta: 25, negrita: true },
      { desde: 20, hasta: 27, destacado: true }
    ]
    const vuelta = deDocumento(aDocumento(texto, tramos))
    expect(vuelta.texto).toBe(texto)
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] === '\n') continue
      expect(pinta(vuelta.tramos, i), `caracter ${i} -${texto[i]}-`).toBe(pinta(tramos, i))
    }
    for (const t of ['', '\n', 'a\n\n\nb', '\n\nfin\n']) {
      expect(deDocumento(aDocumento(t, [])).texto).toBe(t)
    }
  })

  // T289 - GUARDIANA DEL DESTACADO EN LA LECTURA. Marcarlo en el editor no
  // sirve si la lectura no lo dibuja.
  test('T289 - la lectura dibuja el destacado con fondo amarillo y letra negra', () => {
    const { container } = render(<div>{renderFormattedLine('hola mundo', 0, [], [{ desde: 5, hasta: 10, destacado: true }])}</div>)
    const spans = Array.from(container.querySelectorAll('span')) as HTMLElement[]
    const marcado = spans.find((s) => s.textContent === 'mundo')
    expect(marcado, 'el tramo destacado no tiene su propio span').toBeDefined()
    expect(mismoColor(marcado!.style.backgroundColor, DESTACADO.fondo)).toBe(true)
    expect(mismoColor(marcado!.style.color, DESTACADO.letra)).toBe(true)
    expect(container.textContent).toBe('hola mundo')
  })

  // T290 - GUARDIANA DE LOS COLORES SOBRE BLANCO. Los tres colores claros no
  // se leen sobre la pareja blanca; ahi van los oscuros.
  test('T290 - sobre fondo blanco la lectura usa los colores oscuros, y sobre negro los claros', () => {
    const tramo: TramoFormato[] = [{ desde: 0, hasta: 4, color: 'ambar' }]
    const colorEn = (fondo: string) => {
      const { container, unmount } = render(<div>{renderFormattedLine('hola', 0, [], tramo, fondo)}</div>)
      const c = (container.querySelector('span') as HTMLElement).style.color
      unmount()
      return c
    }
    expect(mismoColor(colorEn('#FFFFFF'), COLORES_TRAMO_SOBRE_CLARO.ambar)).toBe(true)
    expect(mismoColor(colorEn('#000000'), COLORES_TRAMO.ambar)).toBe(true)
  })
})
