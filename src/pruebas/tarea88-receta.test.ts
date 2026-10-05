// TAREA 88 -04-10-2026-: la receta lleva los tramos que QUEDAN de una toma con pausas.
import { describe, expect, test } from 'vitest'
import { recetaDe, esCopia, validarReceta } from '../lib/recetaExportacion'
import { tramosACortar, tramosQueQuedan } from '../lib/tramos'

describe('Tarea 88: la receta con tramos', () => {
  test('con pausas, tramos = los que quedan', () => {
    const cortes = tramosACortar([{ desdeMs: 4000, hastaMs: 9000, origen: 'palma' }], 30000)
    const r = recetaDe({ estilo: 'amarillo', subtitulos: [], tramos: tramosQueQuedan(cortes, 30000) })
    expect(r.tramos).toEqual([{ desdeMs: 0, hastaMs: 4000 }, { desdeMs: 9000, hastaMs: 30000 }])
    expect(validarReceta(r)).toBeNull()
  })

  test('sin pausas, tramos null', () => {
    expect(recetaDe({ estilo: 'amarillo', subtitulos: [] }).tramos).toBeNull()
    expect(recetaDe({ estilo: 'amarillo', subtitulos: [], tramos: [] }).tramos).toBeNull()
  })

  test('con tramos y estilo No no es copia', () => {
    const r = recetaDe({ estilo: 'no', subtitulos: [], tramos: [{ desdeMs: 0, hastaMs: 5000 }] })
    expect(esCopia(r)).toBe(false)
    expect(esCopia(recetaDe({ estilo: 'no', subtitulos: [] }))).toBe(true)
  })
})
