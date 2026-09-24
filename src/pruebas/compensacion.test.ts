import { describe, expect, test } from 'vitest'
import { anclaCompensada, crearCompensacion, MS_COMPENSACION_RENGLON } from '../lib/compensacion'

// LA COMPENSACION DEL RENGLON -lib/compensacion.ts, 24-09-2026-.
describe('Compensacion de la demora del reconocedor', () => {
  // Calce 10 en t=0 y 12 en t=1000: 2 palabras por segundo.
  function siguiendoADosPorSegundo() {
    const e = crearCompensacion()
    anclaCompensada(e, { posicion: 10, ultimoCalce: 10, siguiendo: true, tMs: 0 })
    anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: true, tMs: 1000 })
    return e
  }

  test('C1 Sin seguir -arranque, silencio, detenido- el ancla es min(posicion, calce), como siempre.', () => {
    const e = crearCompensacion()
    anclaCompensada(e, { posicion: 3, ultimoCalce: 10, siguiendo: false, tMs: 0 })
    expect(anclaCompensada(e, { posicion: 3, ultimoCalce: 12, siguiendo: false, tMs: 1000 })).toBe(3)
  })

  test('C2 Siguiendo, el ancla se corre lo que se dice en el tiempo desde el ultimo calce, y no mas de MS_COMPENSACION_RENGLON.', () => {
    const e = siguiendoADosPorSegundo()
    expect(anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: true, tMs: 1200 })).toBeCloseTo(12.4)
    expect(anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: true, tMs: 3000 })).toBeCloseTo(12 + (2 * MS_COMPENSACION_RENGLON) / 1000)
  })

  test('C3 No retrocede mientras el calce no baje: al callarse, el ancla se queda donde llego.', () => {
    const e = siguiendoADosPorSegundo()
    const llego = anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: true, tMs: 2000 })
    expect(llego).toBeGreaterThan(12)
    expect(anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: false, tMs: 2500 })).toBe(llego)
  })

  test('C4 Si el calce baja -volvio a leer, o se movio el texto a mano- el ancla baja con el.', () => {
    const e = siguiendoADosPorSegundo()
    anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: true, tMs: 2000 })
    expect(anclaCompensada(e, { posicion: 5, ultimoCalce: 5, siguiendo: false, tMs: 2100 })).toBe(5)
  })

  test('C5 Una rafaga al empezar no da un ritmo absurdo: el adelanto queda en el tope de ritmo.', () => {
    const e = crearCompensacion()
    anclaCompensada(e, { posicion: 0, ultimoCalce: 7, siguiendo: true, tMs: 0 })
    anclaCompensada(e, { posicion: 7, ultimoCalce: 12, siguiendo: true, tMs: 50 })
    // 5 palabras en 50 ms seria 100 por segundo; con el tope, 6 por segundo por 400 ms = 2.4.
    expect(anclaCompensada(e, { posicion: 12, ultimoCalce: 12, siguiendo: true, tMs: 1000 })).toBeCloseTo(14.4)
  })
})
