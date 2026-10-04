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
  test('recetaDe con subtítulos lleva el margen de hoy', () => {
    const r = recetaDe({ estilo: 'amarillo', subtitulos: UN_SUB })
    expect(r.margenAbajo).toBe(0.125)
    expect(esCopia(r)).toBe(false)
    expect(r.tramos).toBeNull()
    expect(r.filtro).toBeNull()
    expect(r.subtitulos).toBe(UN_SUB)
    expect(recetaDe({ estilo: 'formal', subtitulos: UN_SUB, posicion: 'redes' }).margenAbajo).toBe(0.35)
  })
  test('validarReceta rechaza margen fuera de 0 a 0,5', () => {
    const r = recetaDe({ estilo: 'amarillo', subtitulos: UN_SUB })
    expect(validarReceta(r)).toBeNull()
    expect(validarReceta({ ...r, margenAbajo: -0.01 })).toBe('margen fuera de 0 a 0,5')
    expect(validarReceta({ ...r, margenAbajo: 0.51 })).toBe('margen fuera de 0 a 0,5')
    expect(validarReceta({ ...r, margenAbajo: Number.NaN })).toBe('margen fuera de 0 a 0,5')
  })
  test('validarReceta rechaza tramos desordenados', () => {
    const r: RecetaExportacion = { ...recetaDe({ estilo: 'amarillo', subtitulos: UN_SUB }), tramos: [{ desdeMs: 5000, hastaMs: 9000 }, { desdeMs: 1000, hastaMs: 2000 }] }
    expect(validarReceta(r)).toBe('tramos desordenados')
    expect(validarReceta({ ...r, tramos: [{ desdeMs: 1000, hastaMs: 2000 }, { desdeMs: 5000, hastaMs: 9000 }] })).toBeNull()
  })
})
