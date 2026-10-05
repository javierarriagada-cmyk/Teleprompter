// TAREA 96 -05-10-2026-: LOS FILTROS, PUROS -src/lib/filtros.ts- Y EN LA RECETA. Solo lógica: las
// matrices, su paso al visor y a Media3, lo que se recuerda y la receta. Nada de posiciones.
import { describe, test, expect, beforeEach } from 'vitest'
import {
  IDENTIDAD,
  TONOS,
  componer,
  esNeutro,
  filtroGuardado,
  guardarFiltro,
  matrizDeTono,
  matrizParaMedia3,
  valoresFeColorMatrix,
  type Matriz4x5
} from '../lib/filtros'
import { recetaDe, esCopia, validarReceta, type RecetaExportacion } from '../lib/recetaExportacion'

// Aplica una 4x5 a un color (r, g, b) como feColorMatrix, sin recortar.
function aplicar(m: Matriz4x5, [r, g, b]: number[]): number[] {
  return [0, 1, 2].map((f) => m[f * 5] * r + m[f * 5 + 1] * g + m[f * 5 + 2] * b + m[f * 5 + 3] * 1 + m[f * 5 + 4])
}
// Aplica los 16 de Media3 como el shader de Media3 1.9.0 -uRgbMatrix * vec4(rgb, 1), por columnas-.
function aplicarMedia3(m: number[], [r, g, b]: number[]): number[] {
  const v = [r, g, b, 1]
  return [0, 1, 2].map((fila) => [0, 1, 2, 3].reduce((s, col) => s + m[col * 4 + fila] * v[col], 0))
}
const DIEZ_COLORES = [
  [0, 0, 0], [1, 1, 1], [0.5, 0.5, 0.5], [1, 0, 0], [0, 1, 0],
  [0, 0, 1], [0.9, 0.7, 0.55], [0.2, 0.4, 0.8], [0.35, 0.1, 0.6], [0.75, 0.8, 0.1]
]

describe('Tarea 96: las matrices de los filtros', () => {
  test('Natural es la identidad exacta', () => {
    expect(matrizDeTono('natural')).toEqual(IDENTIDAD)
    expect(matrizParaMedia3(matrizDeTono('natural'))).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  })

  test('B/N usa la luma 0.2126 / 0.7152 / 0.0722 y deja r = g = b en diez colores', () => {
    const m = matrizDeTono('bn')
    for (let f = 0; f < 3; f++) expect(m.slice(f * 5, f * 5 + 5)).toEqual([0.2126, 0.7152, 0.0722, 0, 0])
    for (const c of DIEZ_COLORES) {
      const [r, g, b] = aplicar(m, c)
      expect(r).toBeCloseTo(g, 12)
      expect(g).toBeCloseTo(b, 12)
      expect(r).toBeCloseTo(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], 12)
    }
  })

  test('Cálido sube el rojo y baja el azul de un gris; Frío al revés', () => {
    const [r, g, b] = aplicar(matrizDeTono('calido'), [0.5, 0.5, 0.5])
    expect(r).toBeGreaterThan(0.5)
    expect(g).toBeCloseTo(0.5, 12)
    expect(b).toBeLessThan(0.5)
    const [r2, , b2] = aplicar(matrizDeTono('frio'), [0.5, 0.5, 0.5])
    expect(r2).toBeLessThan(0.5)
    expect(b2).toBeGreaterThan(0.5)
  })

  test('componer con la identidad no cambia nada, y el orden es primero b y después a', () => {
    for (const t of TONOS) {
      const m = matrizDeTono(t.valor)
      expect(componer(IDENTIDAD, m)).toEqual(m)
      expect(componer(m, IDENTIDAD)).toEqual(m)
    }
    // Primero sumar 0,1 y después duplicar: (0,2 + 0,1)·2 = 0,6. Al revés sería 0,5.
    const sumar: Matriz4x5 = [1, 0, 0, 0, 0.1, 0, 1, 0, 0, 0.1, 0, 0, 1, 0, 0.1, 0, 0, 0, 1, 0]
    const doblar: Matriz4x5 = [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0]
    expect(aplicar(componer(doblar, sumar), [0.2, 0.2, 0.2])[0]).toBeCloseTo(0.6, 12)
    expect(aplicar(componer(sumar, doblar), [0.2, 0.2, 0.2])[0]).toBeCloseTo(0.5, 12)
  })

  test('Vivo deja un gris como gris y aleja del gris un color; Suave acerca al gris y aclara', () => {
    const gris = aplicar(matrizDeTono('vivo'), [0.5, 0.5, 0.5])
    for (const v of gris) expect(v).toBeCloseTo(0.5, 12)
    const [r, g] = aplicar(matrizDeTono('vivo'), [0.8, 0.4, 0.4])
    expect(r - g).toBeGreaterThan(0.4)
    // Suave: contraste 0,92 y +0,03. El negro sube a 0,5 - 0,46 + 0,03 = 0,07.
    const [n] = aplicar(matrizDeTono('suave'), [0, 0, 0])
    expect(n).toBeCloseTo(0.07, 12)
  })

  test('valoresFeColorMatrix da 20 números en orden de filas', () => {
    const v = valoresFeColorMatrix(matrizDeTono('calido')).split(' ').map(Number)
    expect(v).toHaveLength(20)
    expect(v).toEqual([1.06, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.92, 0, 0, 0, 0, 0, 1, 0])
    // Sin el ruido del punto flotante.
    expect(valoresFeColorMatrix(matrizDeTono('vivo'))).not.toMatch(/\d{8,}/)
  })

  test('matrizParaMedia3 da 16 números por columnas, con el desplazamiento en 12, 13 y 14', () => {
    const m = matrizParaMedia3(matrizDeTono('calido'))
    expect(m).toEqual([1.06, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.92, 0, 0, 0, 0, 1])
    // El gris de B/N, como RgbFilter de Media3 1.9.0 -RgbFilter.java:39-41-.
    const bn = matrizParaMedia3(matrizDeTono('bn'))
    expect(bn.slice(0, 4)).toEqual([0.2126, 0.2126, 0.2126, 0])
    expect(bn.slice(4, 8)).toEqual([0.7152, 0.7152, 0.7152, 0])
    expect(bn.slice(8, 12)).toEqual([0.0722, 0.0722, 0.0722, 0])
    expect(bn.slice(12)).toEqual([0, 0, 0, 1])
    // Suave lleva desplazamiento: va en 12, 13 y 14.
    const suave = matrizParaMedia3(matrizDeTono('suave'))
    expect(suave[12]).toBeCloseTo(0.07, 12)
    expect(suave[13]).toBeCloseTo(0.07, 12)
    expect(suave[14]).toBeCloseTo(0.07, 12)
  })

  test('el visor y Media3 dan el mismo color con los seis filtros', () => {
    for (const t of TONOS) {
      const m = matrizDeTono(t.valor)
      const m16 = matrizParaMedia3(m)
      for (const c of DIEZ_COLORES) {
        const a = aplicar(m, c)
        const b = aplicarMedia3(m16, c)
        for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(a[i], 12)
      }
    }
  })

  test('esNeutro: Natural o nada', () => {
    expect(esNeutro(null)).toBe(true)
    expect(esNeutro(undefined)).toBe(true)
    expect(esNeutro({ version: 1, tono: 'natural' })).toBe(true)
    expect(esNeutro({ version: 1, tono: 'bn' })).toBe(false)
  })
})

describe('Tarea 96: el filtro se recuerda en sigo_filtro', () => {
  beforeEach(() => localStorage.clear())

  test('sin nada guardado es Natural', () => {
    expect(filtroGuardado()).toEqual({ version: 1, tono: 'natural' })
  })

  test('con basura es Natural', () => {
    for (const basura of ['{', 'null', '"calido"', '{"version":2,"tono":"calido"}', '{"version":1,"tono":"sepia"}', '{"version":1}', '[]']) {
      localStorage.setItem('sigo_filtro', basura)
      expect(filtroGuardado()).toEqual({ version: 1, tono: 'natural' })
    }
  })

  test('lo que se guarda vuelve', () => {
    guardarFiltro({ version: 1, tono: 'frio' })
    expect(JSON.parse(localStorage.getItem('sigo_filtro')!)).toEqual({ version: 1, tono: 'frio' })
    expect(filtroGuardado()).toEqual({ version: 1, tono: 'frio' })
  })
})

describe('Tarea 96: el filtro en la receta', () => {
  test('con Natural la receta es la de hoy: filtro null y, sin subtítulos ni pausas, copia', () => {
    const r = recetaDe({ estilo: 'no', subtitulos: [], filtro: { version: 1, tono: 'natural' } })
    expect(r.filtro).toBeNull()
    expect(esCopia(r)).toBe(true)
    expect(validarReceta(r)).toBeNull()
  })

  test('con B/N la receta NO es copia aunque no haya subtítulos, y lleva los 16 números', () => {
    const r = recetaDe({ estilo: 'no', subtitulos: [], filtro: { version: 1, tono: 'bn' } })
    expect(r.filtro).not.toBeNull()
    expect(r.filtro!.tono).toBe('bn')
    expect(r.filtro!.matriz).toEqual(matrizParaMedia3(matrizDeTono('bn')))
    expect(esCopia(r)).toBe(false)
    expect(validarReceta(r)).toBeNull()
  })

  test('validarReceta rechaza un filtro sin tono, sin 16 números o con NaN', () => {
    const base = recetaDe({ estilo: 'no', subtitulos: [], filtro: { version: 1, tono: 'calido' } })
    const con = (filtro: unknown): RecetaExportacion => ({ ...base, filtro: filtro as any })
    expect(validarReceta(con({ tono: '', matriz: base.filtro!.matriz }))).toBe('filtro sin tono')
    expect(validarReceta(con({ matriz: base.filtro!.matriz }))).toBe('filtro sin tono')
    expect(validarReceta(con({ tono: 'calido', matriz: [1, 0, 0] }))).toBe('matriz de filtro sin 16 números')
    expect(validarReceta(con({ tono: 'calido' }))).toBe('matriz de filtro sin 16 números')
    const conNaN = base.filtro!.matriz.slice()
    conNaN[5] = NaN
    expect(validarReceta(con({ tono: 'calido', matriz: conNaN }))).toBe('matriz de filtro sin cifras')
    expect(validarReceta(con('calido'))).toBe('filtro no es un objeto')
  })
})
