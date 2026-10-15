import { describe, it, expect } from 'vitest'
import { tokensDeLaFranja, RENGLONES_FRANJA } from '../lib/velocidadFija'
import type { Renglon } from '../lib/renglones'

// -15-10-2026- La franja de foco de Velocidad fija enciende dos renglones: el que se lee y el que viene.
const r = (desdeToken: number, top: number) => ({ desdeToken, hastaToken: desdeToken + 3, top }) as unknown as Renglon
const renglones = [r(0, 0), r(4, 30), r(8, 60), r(12, 90)]

describe('La franja de foco', () => {
  it('enciende dos renglones', () => {
    expect(RENGLONES_FRANJA).toBe(2)
    expect(tokensDeLaFranja(1, renglones)).toEqual({ desde: 4, hasta: 12 })
  })
  it('en el penultimo y el ultimo renglon llega hasta el final', () => {
    expect(tokensDeLaFranja(2, renglones)).toEqual({ desde: 8, hasta: Infinity })
    expect(tokensDeLaFranja(3, renglones)).toEqual({ desde: 12, hasta: Infinity })
  })
})

// -15-10-2026- Con Velocidad fija los controles se van solos mientras el texto anda, aunque la voz no escuche.
import { controlesSeVanSolos } from '../lib/velocidadFija'
describe('Los controles de la lectura se van solos', () => {
  const base = { escuchando: false, cuentaRegresiva: false, fija: false, leyendo: true, enPausa: false }
  it('con la voz, mientras escucha', () => {
    expect(controlesSeVanSolos({ ...base, escuchando: true })).toBe(true)
    expect(controlesSeVanSolos(base)).toBe(false)
  })
  it('con Velocidad fija, leyendo sin pausa, aunque la voz no escuche', () => {
    expect(controlesSeVanSolos({ ...base, fija: true })).toBe(true)
    expect(controlesSeVanSolos({ ...base, fija: true, enPausa: true })).toBe(false)
    expect(controlesSeVanSolos({ ...base, fija: true, leyendo: false })).toBe(false)
  })
})
