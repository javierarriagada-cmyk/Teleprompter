import { describe, expect, test } from 'vitest'
import { colocarMenu } from '../lib/bordesSeguros'

// -07-10-2026, revision de la tarea 102- En el moto g86 el menu de Idioma -la ultima fila de
// Ajustes- se abria hacia abajo y la barra de botones de Android tapaba "English".
describe('colocarMenu', () => {
  const pantalla = { alto: 915, ancho: 412 }
  const menu = { alto: 120, ancho: 200 }

  test('abre hacia abajo cuando cabe', () => {
    const c = colocarMenu({ top: 200, bottom: 248, left: 16, right: 396 }, menu, pantalla, { arriba: 24, abajo: 48 }, 'derecha')
    expect(c.arriba).toBe(false)
    expect(c.top).toBe(252)
  })

  test('abre hacia arriba cuando la barra de botones no deja espacio abajo', () => {
    // Sin descontar la barra cabria justo: 915 - 790 - 4 = 121. Con 48 de barra no cabe.
    const c = colocarMenu({ top: 742, bottom: 790, left: 16, right: 396 }, menu, pantalla, { arriba: 24, abajo: 48 }, 'derecha')
    expect(c.arriba).toBe(true)
    expect(c.top + menu.alto).toBeLessThanOrEqual(742)
  })

  test('nunca termina debajo de la barra de botones', () => {
    const c = colocarMenu({ top: 60, bottom: 860, left: 16, right: 396 }, menu, pantalla, { arriba: 24, abajo: 48 }, 'derecha')
    expect(c.top + menu.alto).toBeLessThanOrEqual(pantalla.alto - 48)
    expect(c.top).toBeGreaterThanOrEqual(24)
  })

  test('alineado a la izquierda con sangria, y dentro de la pantalla a lo ancho', () => {
    const c = colocarMenu({ top: 200, bottom: 248, left: 16, right: 396 }, menu, pantalla, { arriba: 0, abajo: 0 }, 'izquierda', 12)
    expect(c.left).toBe(28)
    const d = colocarMenu({ top: 200, bottom: 248, left: 300, right: 396 }, menu, pantalla, { arriba: 0, abajo: 0 }, 'izquierda', 12)
    expect(d.left + menu.ancho).toBeLessThanOrEqual(pantalla.ancho - 8)
  })
})
