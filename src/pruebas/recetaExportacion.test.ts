// TAREA 87, PARTE B4 -04-10-2026-: la receta común, pura -src/lib/recetaExportacion.ts-.
import { describe, test, expect } from 'vitest'
import { recetaDe, esCopia, validarReceta, type RecetaExportacion } from '../lib/recetaExportacion'
import type { Subtitulo } from '../lib/subtitulos'

const UN_SUB: Subtitulo[] = [{ desdeMs: 0, hastaMs: 900, renglones: [[{ texto: 'hola', desdeMs: 0, hastaMs: 400 }]] } as Subtitulo]

describe('La receta de exportación', () => {
  test('recetaDe sin subtítulos es copia', () => {
    expect(esCopia(recetaDe({ estilo: 'no', subtitulos: UN_SUB }))).toBe(true)
  })
  test('recetaDe con estilo pero sin subtítulos es copia', () => {
    expect(esCopia(recetaDe({ estilo: 'amarillo', subtitulos: [] }))).toBe(true)
  })
  // -04-10-2026, Javier simplifica la 87- La receta ya no lleva margen: se sacaron "Normal / Para
  // redes" y su validación de 0 a 0,5. Antes: 'recetaDe con subtítulos lleva el margen de hoy'.
  test('recetaDe con subtítulos no es copia y no lleva margen', () => {
    const r = recetaDe({ estilo: 'amarillo', subtitulos: UN_SUB })
    expect('margenAbajo' in r).toBe(false)
    expect(validarReceta(r)).toBeNull()
    expect(esCopia(r)).toBe(false)
    expect(r.tramos).toBeNull()
    expect(r.filtro).toBeNull()
    expect(r.subtitulos).toBe(UN_SUB)
  })
  test('validarReceta rechaza tramos desordenados', () => {
    const r: RecetaExportacion = { ...recetaDe({ estilo: 'amarillo', subtitulos: UN_SUB }), tramos: [{ desdeMs: 5000, hastaMs: 9000 }, { desdeMs: 1000, hastaMs: 2000 }] }
    expect(validarReceta(r)).toBe('tramos desordenados')
    expect(validarReceta({ ...r, tramos: [{ desdeMs: 1000, hastaMs: 2000 }, { desdeMs: 5000, hastaMs: 9000 }] })).toBeNull()
  })
})
