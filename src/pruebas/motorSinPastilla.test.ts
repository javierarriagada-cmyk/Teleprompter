// EL MOTOR TIENE UN SOLO DUEÑO -motor sin pastilla, 13-10-2026-: lo avanza el cuadro de la vista. Una
// hora vieja -la de la pastilla del tiempo- no lo mueve, y leerEstado no lo avanza. Solo logica.
import { describe, expect, test } from 'vitest'
import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'

// Una lectura corta: calces cada 400 ms y cuadros cada 16 ms, con `entreCuadros` llamado entre dos
// cuadros. Devuelve las posiciones de cada cuadro.
function leer(entreCuadros: (m: MotorDeAvance, t: number, ultimoCuadro: number) => void): number[] {
  const m = crearMotorDeAvance()
  const pos: number[] = []
  let token = 0
  let ultimo = 0
  for (let t = 1000; t <= 6000; t += 16) {
    if (t % 400 < 16) { token += 2; m.voz(true, t); m.tentativo(token, t) }
    entreCuadros(m, t, ultimo)
    pos.push(m.estadoEn(t).posicion)
    ultimo = t
  }
  return pos
}

describe('Motor sin pastilla', () => {
  test('estadoEn con una hora vieja entre dos cuadros no cambia la posicion del cuadro siguiente', () => {
    const sola = leer(() => {})
    const conHoraVieja = leer((m, _t, ultimo) => { if (ultimo > 0) m.estadoEn(ultimo - 200) })
    expect(sola[sola.length - 1]).toBeGreaterThan(10)
    expect(conHoraVieja).toEqual(sola)
  })

  test('leerEstado no avanza el motor y devuelve la posicion del ultimo cuadro', () => {
    const sola = leer(() => {})
    const leyendo = leer((m, _t, ultimo) => {
      if (ultimo > 0) expect(m.leerEstado().posicion).toBe(m.estadoEn(ultimo - 1).posicion)
      m.leerEstado()
    })
    expect(leyendo).toEqual(sola)
  })
})
