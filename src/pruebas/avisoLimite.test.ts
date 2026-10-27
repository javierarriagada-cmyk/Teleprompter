// -corrección teléfono PR 157, 2026-10-27-
import { describe, it, expect } from 'vitest'
import { opcionesAvisoQuedaMinuto, modoTextoPastillaLimite } from '../lib/avisoLimite'

describe('avisoLimite', () => {
  it('la pastilla ya no muestra la frase; el aviso propio dura 8 s', () => {
    // Sin el cambio (modoTextoPastillaLimite('aviso') → 'fraseAviso') esta prueba falla.
    expect(modoTextoPastillaLimite('aviso')).toBe('tiempo')
    expect(modoTextoPastillaLimite('queda')).toBe('tiempo')
    expect(modoTextoPastillaLimite(null)).toBe('tiempo')
    const o = opcionesAvisoQuedaMinuto()
    expect(o.duracionMs).toBe(8000)
    expect(o.colocacion).toBe('limite')
    expect(o.contrasteGrabacion).toBe(true)
  })
})
