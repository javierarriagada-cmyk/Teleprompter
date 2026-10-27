// Antes: pausaUsaMotorFijo y tokenSeguidorAlVolverAVoz (lectura forzada a fija).
// 27-10-2026: esa vía salió; al límite se pausa — accionAlLimiteLectura en limites.ts.
import { describe, it, expect } from 'vitest'
import { accionAlLimiteLectura } from '../lib/limites'

describe('accionAlLimiteLectura — pasada teléfono PR 157', () => {
  it('al límite de lectura sin Sigo+ se pausa, no se fuerza fija', () => {
    // Sin el arreglo / con la vía vieja el camino era forzar velocidad fija.
    expect(accionAlLimiteLectura()).toBe('pausar')
    expect(accionAlLimiteLectura()).not.toBe('forzarFija')
  })
})
