// EL BANCO DEL MOTOR -13-10-2026-: solo logica. El banco entero corre con `npm run banco`.
import fs from 'fs'
import { describe, expect, test } from 'vitest'
import { medirTomaEnBanco } from './bancoMotor'
import { acercarScroll, MS_DESLIZAR } from '../lib/deslizar'

describe('Banco del motor', () => {
  test('lee una toma de ejemplo y devuelve sus cifras', () => {
    const texto = fs.readFileSync('docs/registros/motor-24-sep/tomas8/54587132-bc4f-4340-978a-44632b28b4f9.motor.txt', 'utf8')
    const { cifras, avisos } = medirTomaEnBanco(texto)
    expect(avisos).toEqual([])
    expect(cifras.muestras).toBeGreaterThan(100)
    expect(Number.isFinite(cifras.atrasoMedio)).toBe(true)
    expect(cifras.atrasoP90).toBeGreaterThanOrEqual(cifras.atrasoMedio)
    expect(cifras.renglonVivo + cifras.renglonDeAbajo + cifras.masAbajo + cifras.pantallaAdelante).toBeCloseTo(100, 6)
    expect(cifras.cambiosDeRenglon).toBeGreaterThan(0)
    // El acercamiento exponencial nunca se pasa del renglon.
    expect(cifras.pasadaMax).toBe(0)
    expect(cifras.palabrasDestacado).toBeGreaterThanOrEqual(4)
    expect(cifras.cuadroMediana).toBeGreaterThan(0)
    // Las cifras de hoy de esta toma -13-10-2026, main 97c5fc8-. Si cambian, cambio el motor.
    expect(cifras.atrasoMedio).toBeCloseTo(BASE.atrasoMedio, 6)
    expect(cifras.renglonVivo).toBeCloseTo(BASE.renglonVivo, 6)
    expect(cifras.cambiosDeRenglon).toBe(BASE.cambiosDeRenglon)
  })

  test('acercarScroll da lo mismo que la cuenta que tenia TeleprompterView', () => {
    // La cuenta de antes, copiada de la vista -ver el "Antes:" en TeleprompterView.tsx-.
    const antes = (actual: number, objetivo: number, dt: number) => {
      let v = actual
      const acercamiento = 1 - Math.exp(-dt / MS_DESLIZAR)
      v += (objetivo - v) * acercamiento
      if (Math.abs(objetivo - v) < 0.5) v = objetivo
      return v
    }
    let semilla = 7
    const azar = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296 }
    for (let i = 0; i < 2000; i++) {
      const actual = azar() * 3000
      const objetivo = azar() < 0.1 ? actual + azar() : azar() * 3000
      const dt = azar() < 0.1 ? 100 : azar() * 100
      expect(acercarScroll(actual, objetivo, dt)).toBe(antes(actual, objetivo, dt))
    }
    expect(MS_DESLIZAR).toBe(70)
  })
})

const BASE = { atrasoMedio: 1.807013325474624, renglonVivo: 84.13597733711048, cambiosDeRenglon: 9 }
