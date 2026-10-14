import { describe, it, expect, beforeEach } from 'vitest'
import {
  NIVELES_PPM, NIVEL_POR_OMISION, acotarNivel, ppmDeNivel, subirNivel, bajarNivel, segundosConNivel,
  crearMotorFijo, esMotorFijo, modoGuardado, nivelGuardado, fijarModo, fijarNivel, estadoVelocidad,
  olvidarEstadoVelocidad, pxPorPalabra, pxDePosicion, posicionDePx, renglonDePx
} from './velocidadFija'
import type { Renglon } from './renglones'
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

  // Correccion 1: el texto sube a pixeles constantes, no a escalones por renglon.
  const r = (top: number, desde: number, hasta: number): Renglon => ({ top, alto: 0, desdeToken: desde, hastaToken: hasta })
  // Renglones de largo distinto: 3, 7, 5 y 2 palabras, 40 px cada uno.
  const desparejos = [r(20, 0, 2), r(60, 3, 9), r(100, 10, 14), r(140, 15, 16)]

  it('pxPorPalabra: un solo factor para todo el texto, con renglones de largo distinto', () => {
    expect(pxPorPalabra(desparejos)).toBeCloseTo(120 / 15, 10)
  })

  it('pxDePosicion avanza los mismos pixeles en tiempos iguales', () => {
    const m = crearMotorFijo(17, 4)
    m.seguir(0)
    const px = [0, 250, 500, 750, 1000, 1250].map((t) => pxDePosicion(m.estadoEn(t).posicion, desparejos))
    const pasos = px.slice(1).map((v, i) => v - px[i])
    pasos.forEach((p) => expect(p).toBeCloseTo(pasos[0], 9))
    expect(pasos[0]).toBeGreaterThan(0)
  })

  it('ida y vuelta: posicionDePx(pxDePosicion(p)) = p', () => {
    for (const p of [0, 0.37, 2.5, 9.99, 15]) expect(posicionDePx(pxDePosicion(p, desparejos), desparejos)).toBeCloseTo(p, 9)
  })

  it('con 0 o 1 renglon, sin NaN ni division por cero', () => {
    expect(pxPorPalabra([])).toBe(0)
    expect(pxDePosicion(5, [])).toBe(0)
    expect(posicionDePx(100, [])).toBe(0)
    expect(renglonDePx(100, [])).toBe(0)
    const uno = [r(20, 0, 6)]
    expect(pxPorPalabra(uno)).toBe(0)
    expect(pxDePosicion(5, uno)).toBe(20)
    expect(posicionDePx(100, uno)).toBe(0)
    expect(renglonDePx(100, uno)).toBe(0)
  })

  it('la franja de foco en el borde exacto de un renglon ya es el renglon nuevo', () => {
    expect(renglonDePx(59.999, desparejos)).toBe(0)
    expect(renglonDePx(60, desparejos)).toBe(1)
    expect(renglonDePx(140, desparejos)).toBe(3)
    expect(renglonDePx(5, desparejos)).toBe(0)
    expect(renglonDePx(9999, desparejos)).toBe(3)
  })
})
