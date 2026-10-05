import { describe, expect, test } from 'vitest'
import {
  MS_DESHACER_TOMA,
  alternarSeleccion,
  debeBorrarArchivos,
  entrarSeleccion,
  loteNuevo,
  seleccionarTodas,
  trasAlternar
} from '../lib/seleccionTomas'

describe('selección de tomas', () => {
  test('entrar y salir del modo', () => {
    expect(entrarSeleccion('a')).toEqual(['a'])
    expect(trasAlternar(['a'], 'a')).toBeNull()
  })

  test('agregar y quitar', () => {
    expect(alternarSeleccion(['a'], 'b')).toEqual(['a', 'b'])
    expect(alternarSeleccion(['a', 'b'], 'a')).toEqual(['b'])
  })

  test('seleccionar todo', () => {
    expect(seleccionarTodas(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  test('borrar y deshacer: el lote espera 5 s', () => {
    const lote = loteNuevo(['a', 'b'], 1000)
    expect(lote.ids).toEqual(['a', 'b'])
    expect(lote.venceEn).toBe(1000 + MS_DESHACER_TOMA)
    expect(debeBorrarArchivos(lote, 1000 + MS_DESHACER_TOMA - 1, false)).toBe(false)
    expect(debeBorrarArchivos(lote, 1000 + MS_DESHACER_TOMA, false)).toBe(true)
  })

  test('los archivos no se borran antes de que se vaya el aviso', () => {
    const lote = loteNuevo(['a'], 0)
    expect(debeBorrarArchivos(lote, 4999, false)).toBe(false)
  })

  test('a segundo plano los archivos se borran al tiro', () => {
    const lote = loteNuevo(['a'], 0)
    expect(debeBorrarArchivos(lote, 10, true)).toBe(true)
  })

  test('sale solo con cero seleccionadas', () => {
    expect(trasAlternar(['a', 'b'], 'a')).toEqual(['b'])
    expect(trasAlternar(['a'], 'a')).toBeNull()
  })
})
