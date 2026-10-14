import { describe, it, expect } from 'vitest'
import { lineasDeEspacio } from '../lib/cortesDeRenglon'
import { consolidarGuion } from '../datos/consolidar'
import type { Guion } from '../datos/modelo'

// espacios-del-usuario, 14-10-2026: las líneas vacías que el usuario escribió ocupan su lugar.
describe('Los espacios del usuario', () => {
  it('una línea vacía entre párrafos es la separación de hoy', () => {
    expect(lineasDeEspacio(['Hola', '', 'Chao'])).toEqual([false, false, false])
  })
  it('tres vacías seguidas: la primera es la de hoy, las otras ocupan renglón', () => {
    expect(lineasDeEspacio(['Hola', '', '', '', 'Chao'])).toEqual([false, false, true, true, false])
  })
  it('dos vacías al principio ocupan renglón cada una', () => {
    expect(lineasDeEspacio(['', '', 'Hola'])).toEqual([true, true, false])
  })
  it('las del final, igual', () => {
    expect(lineasDeEspacio(['Hola', '', ''])).toEqual([false, true, true])
  })
  it('texto sin vacías: nada', () => {
    expect(lineasDeEspacio(['Hola', 'Chao'])).toEqual([false, false])
    expect(lineasDeEspacio(['Hola'])).toEqual([false])
  })

  const guion = (texto: string): Guion => ({
    id: 'g', titulo: 't', idioma: 'es', creado: 1000, modificado: 1000,
    bloques: [{ id: 'b', nombre: '', texto }]
  })
  it('consolidarGuion conserva las líneas vacías del usuario', () => {
    expect(consolidarGuion(guion('\n\nHola')).bloques[0].texto).toBe('\n\nHola')
    expect(consolidarGuion(guion('Hola\n\n\nChao')).bloques[0].texto).toBe('Hola\n\n\nChao')
  })
})
