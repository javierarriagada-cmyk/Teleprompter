// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

import { describe, expect, it } from 'vitest'
import { PASOS_LETRA } from '../components/estiloLectura'
import { limitarTamanoLetra, limitarTransparencia, tokenAlVolver } from '../lib/flotante'
import { MotorFlotante } from '../motor/MotorFlotante'
import { textoDe } from '../motor/textoDeVosk'

describe('MotorFlotante y el JSON de Vosk', () => {
  it('parsea un parcial real {"partial" : "uno el perro"} con saltos y espacios', async () => {
    const motor = new MotorFlotante()
    motor.fijarSesion(3)
    await motor.iniciar({ lang: 'es-ES' })
    const oidos: string[] = []
    motor.onParcial((e) => oidos.push(e.texto))
    motor.recibir({
      sesion: 3,
      evento: 'parcial',
      json: '{\n  "partial" : "uno el perro"\n}'
    })
    expect(textoDe('{\n  "partial" : "uno el perro"\n}', 'partial')).toBe('uno el perro')
    expect(oidos).toEqual(['uno el perro'])
  })

  it('un evento vacío no llega a onParcial ni a onFinal', async () => {
    const motor = new MotorFlotante()
    motor.fijarSesion(1)
    await motor.iniciar({ lang: 'es-ES' })
    const oidos: string[] = []
    motor.onParcial((e) => oidos.push(e.texto))
    motor.onFinal((e) => oidos.push(e.texto))
    motor.recibir({ sesion: 1, evento: 'parcial', json: '{ "partial" : "" }' })
    motor.recibir({ sesion: 1, evento: 'final', json: '{ "text" : "   " }' })
    motor.recibir({ sesion: 1, evento: 'parcial', json: '{}' })
    expect(oidos).toEqual([])
  })

  it('descarta un número de sesión viejo', async () => {
    const motor = new MotorFlotante()
    motor.fijarSesion(8)
    await motor.iniciar({ lang: 'es-ES' })
    const oidos: string[] = []
    motor.onParcial((e) => oidos.push(e.texto))
    motor.recibir({ sesion: 7, evento: 'parcial', json: '{"partial":"vieja"}' })
    motor.recibir({ sesion: 8, evento: 'parcial', json: '{"partial":"nueva"}' })
    expect(oidos).toEqual(['nueva'])
  })
})

describe('el token que devuelve la ventana', () => {
  it('deja Leer en esa palabra', () => {
    expect(tokenAlVolver(4, 10)).toBe(4)
    expect(tokenAlVolver(0, 10)).toBe(0)
    expect(tokenAlVolver(9.8, 10)).toBe(9)
    expect(tokenAlVolver(-3, 10)).toBe(0)
    expect(tokenAlVolver(99, 10)).toBe(9)
    expect(tokenAlVolver('4', 10)).toBe(0)
    expect(tokenAlVolver(2, 0)).toBe(0)
  })
})

describe('límites de transparencia y letra', () => {
  it('deja la transparencia entre 0 y 100', () => {
    expect(limitarTransparencia(0)).toBe(0)
    expect(limitarTransparencia(40.4)).toBe(40)
    expect(limitarTransparencia(100)).toBe(100)
    expect(limitarTransparencia(-8)).toBe(0)
    expect(limitarTransparencia(140)).toBe(100)
    expect(limitarTransparencia('40')).toBe(0)
  })

  it('ajusta el tamaño de letra a un paso de Aa', () => {
    expect(limitarTamanoLetra(24, PASOS_LETRA)).toBe(24)
    expect(limitarTamanoLetra(20, PASOS_LETRA)).toBe(18)
    expect(limitarTamanoLetra(100, PASOS_LETRA)).toBe(42)
    expect(limitarTamanoLetra(undefined, PASOS_LETRA)).toBe(PASOS_LETRA[0])
  })
})
