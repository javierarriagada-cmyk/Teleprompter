import { describe, it, expect } from 'vitest'
import { moverResorte, OMEGA_RESORTE, VELOCIDAD_QUIETO, omegaParaAsentar, EstadoResorte } from './deslizar'

// El resorte sin rebote -13-10-2026-, todo en UNA prueba: secuencias al azar con semilla, dt
// variados y objetivos que solo avanzan, como al leer.
describe('moverResorte', () => {
  it('no se pasa, no salta la velocidad al cambiar el objetivo y termina clavado y quieto', () => {
    let semilla = 12345
    const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648)
    for (const omega of [omegaParaAsentar(250), omegaParaAsentar(300), omegaParaAsentar(350), OMEGA_RESORTE]) {
      for (let sec = 0; sec < 50; sec++) {
        let e: EstadoResorte = { posicion: 0, velocidad: 0 }
        let objetivo = 0
        for (let paso = 0; paso < 400; paso++) {
          if (azar() < 0.08) objetivo += 10 + azar() * 60 // un renglon, a veces a medio camino
          const dt = 4 + azar() * 60
          const antes = e
          e = moverResorte(e, objetivo, dt, omega)
          // Nunca se pasa ni retrocede.
          expect(e.posicion).toBeLessThanOrEqual(objetivo)
          expect(e.velocidad).toBeGreaterThanOrEqual(0)
          // La velocidad sigue: el cambio en un cuadro no pasa de lo que tira el resorte en ese dt -mas
          // lo que se descarta al clavarse, que es menos que VELOCIDAD_QUIETO-.
          const clavado = e.posicion === objetivo && e.velocidad === 0 ? VELOCIDAD_QUIETO : 0
          const x = antes.posicion - objetivo
          expect(Math.abs(e.velocidad - antes.velocidad)).toBeLessThanOrEqual(omega * omega * Math.abs(x) * dt + 2 * omega * antes.velocidad * dt + clavado + 1e-9)
        }
        let t = 0
        while ((e.posicion !== objetivo || e.velocidad !== 0) && t < 5000) {
          const dt = 4 + azar() * 60
          e = moverResorte(e, objetivo, dt, omega)
          t += dt
        }
        expect(e.posicion).toBe(objetivo)
        expect(e.velocidad).toBe(0)
      }
    }

    // -14-10-2026, resorte-de-fabrica-: con el TOPE, objetivos que avanzan Y RETROCEDEN -semilla fija,
    // dt variados-. Nunca cruza el objetivo, y el corte de llegada mueve menos de medio pixel.
    for (const omega of [omegaParaAsentar(250), omegaParaAsentar(350)]) {
      for (let sec = 0; sec < 50; sec++) {
        let e: EstadoResorte = { posicion: 0, velocidad: 0 }
        let objetivo = 0
        for (let paso = 0; paso < 400; paso++) {
          if (azar() < 0.1) objetivo += (azar() < 0.35 ? -1 : 1) * (5 + azar() * 60)
          const dt = 4 + azar() * 60
          const x = e.posicion - objetivo
          // lo que daria el resorte sin corte ni tope, para medir el corte
          const xLibre = (x + (e.velocidad + omega * x) * dt) * Math.exp(-omega * dt)
          e = moverResorte(e, objetivo, dt, omega)
          const x2 = e.posicion - objetivo
          // nunca del otro lado
          expect(x2 * x).toBeGreaterThanOrEqual(0)
          if (x === 0) expect(x2).toBe(0)
          // el corte de llegada -no el tope- salta menos de medio pixel
          if (x2 === 0 && !e.tope && x !== 0) expect(Math.abs(xLibre)).toBeLessThan(0.5)
        }
      }
    }
  })
})
