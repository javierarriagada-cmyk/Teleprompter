// -tomas-largas, 15-10-2026- Solo lógica: por dónde se guarda una toma -caminoDeGuardado, la decisión de
// guardarToma- y su receta. Sin subtítulos, sin pausas y en Natural es copia: los mismos bytes.
import { describe, expect, test } from 'vitest'
import { caminoDeGuardado, esCopia, recetaDe } from '../lib/recetaExportacion'
import { FILTRO_NATURAL } from '../lib/filtros'

const sub = [{ texto: 'hola', inicioMs: 0, finMs: 1000 }] as any

describe('tomas largas: guardar sin elegir nada es copiar', () => {
  test('sin subtítulos, sin pausas y en Natural: copia, y su receta también es copia', () => {
    for (const o of [
      { estilo: 'no' as const, subtitulos: [], tramos: null, filtro: FILTRO_NATURAL },
      { estilo: 'amarillo' as const, subtitulos: [], tramos: [], filtro: null },
      { estilo: 'no' as const, subtitulos: sub, tramos: undefined, filtro: undefined }
    ]) {
      expect(caminoDeGuardado(o)).toBe('copia')
      expect(esCopia(recetaDe(o))).toBe(true)
    }
  })

  test('subtítulos elegidos: por subtítulos; pausas o un filtro que no es Natural: por la receta', () => {
    expect(caminoDeGuardado({ estilo: 'amarillo', subtitulos: sub })).toBe('subtitulos')
    expect(caminoDeGuardado({ estilo: 'no', subtitulos: [], tramos: [{ desdeMs: 0, hastaMs: 500 }] })).toBe('receta')
    expect(caminoDeGuardado({ estilo: 'no', subtitulos: [], filtro: { version: 1, tono: 'bn' } })).toBe('receta')
    expect(esCopia(recetaDe({ estilo: 'no', subtitulos: [], filtro: { version: 1, tono: 'bn' } }))).toBe(false)
  })
})
