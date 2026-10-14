import { describe, it, expect, beforeEach } from 'vitest'
import {
  NIVELES_PPM, NIVEL_POR_OMISION, acotarNivel, ppmDeNivel, subirNivel, bajarNivel, segundosConNivel,
  crearMotorFijo, esMotorFijo, modoGuardado, nivelGuardado, fijarModo, fijarNivel, estadoVelocidad,
  olvidarEstadoVelocidad
} from './velocidadFija'
import { crearMotorDeAvance } from './avance'

// Tarea 106 «Velocidad fija»: la logica sola, sin pantalla.
describe('Velocidad fija', () => {
  beforeEach(() => {
    localStorage.clear()
    olvidarEstadoVelocidad()
  })

  it('siete niveles, cada uno ~14 % mas rapido; por omision el 4; los toques no salen de 1..7', () => {
    expect(NIVELES_PPM).toEqual([100, 114, 130, 148, 169, 193, 220])
    for (let i = 1; i < NIVELES_PPM.length; i++) {
      const r = NIVELES_PPM[i] / NIVELES_PPM[i - 1]
      expect(r).toBeGreaterThan(1.12)
      expect(r).toBeLessThan(1.16)
    }
    expect(NIVEL_POR_OMISION).toBe(4)
    expect(ppmDeNivel(4)).toBe(148)
    expect(subirNivel(7)).toBe(7)
    expect(bajarNivel(1)).toBe(1)
    expect(subirNivel(3)).toBe(4)
    expect(bajarNivel(3)).toBe(2)
    expect(acotarNivel(NaN)).toBe(4)
    expect(acotarNivel(99)).toBe(7)
  })

  it('la duracion es palabras ÷ palabras por minuto del nivel', () => {
    expect(segundosConNivel(421, 1)).toBe(Math.round((421 / 100) * 60))
    expect(segundosConNivel(421, 4)).toBe(Math.round((421 / 148) * 60))
    expect(segundosConNivel(421, 7)).toBe(Math.round((421 / 220) * 60))
    expect(segundosConNivel(0, 4)).toBe(0)
  })

  it('sin nada guardado es Con la voz, nivel 4; lo elegido se guarda', () => {
    expect(modoGuardado()).toBe('voz')
    expect(nivelGuardado()).toBe(4)
    fijarModo('fija')
    fijarNivel(9)
    expect(estadoVelocidad()).toEqual({ modo: 'fija', nivel: 7 })
    olvidarEstadoVelocidad()
    expect(estadoVelocidad()).toEqual({ modo: 'fija', nivel: 7 })
  })

  it('el motor fijo avanza solo mientras corre, al ritmo del nivel, y para en la ultima palabra', () => {
    const m = crearMotorFijo(1000, 4)
    expect(esMotorFijo(m)).toBe(true)
    expect(esMotorFijo(crearMotorDeAvance())).toBe(false)
    expect(m.estadoEn(0).posicion).toBe(0)
    expect(m.estadoEn(60000).posicion).toBe(0) // no corre todavia
    m.seguir(60000)
    expect(m.estadoEn(120000).posicion).toBeCloseTo(148, 6)
    expect(m.leerEstado().posicion).toBeCloseTo(148, 6) // leer no avanza
    m.pausar(150000)
    expect(m.estadoEn(500000).posicion).toBeCloseTo(148 * 1.5, 6)
    m.seguir(500000)
    m.cambiarNivel(7, 530000) // medio minuto a 148 y despues a 220
    expect(m.estadoEn(560000).posicion).toBeCloseTo(148 * 2 + 110, 6)
    m.irAToken(10, 560000)
    expect(m.estadoEn(560000).posicion).toBe(10)
    expect(m.estadoEn(10 ** 9).posicion).toBe(999)
    // La vista no adelanta nada: la ultima palabra «oida» es la que pasa.
    const e = m.leerEstado()
    expect(e.ultimoCalce).toBe(999)
    expect(e.estado).toBe('SIGUIENDO')
    m.reiniciar()
    expect(m.estadoEn(10 ** 9 + 1).posicion).toBe(0)
    expect(m.corriendo()).toBe(false)
  })
})
