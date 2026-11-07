// -proxima-version, 2026-11-07- Las pruebas de lógica de los cuatro cambios de la próxima versión: el nombre
// de cada calidad, el enlace de compartir, el formato de los números del aviso de límite y la decisión de
// mostrarlo. Solo lógica: cómo se ve lo juzga Javier en el teléfono.
import { describe, expect, test } from 'vitest'
import { etiquetaCalidad } from '../lib/camara'

describe('proxima-version punto 2 - etiquetaCalidad', () => {
  test('las tres calidades llevan su nombre, con un punto medio', () => {
    expect(etiquetaCalidad('1080p')).toBe('1080p · Full HD')
    expect(etiquetaCalidad('720p')).toBe('720p · HD')
    expect(etiquetaCalidad('480p')).toBe('480p · SD')
  })
  test('una calidad que no está en la lista se muestra tal cual', () => {
    expect(etiquetaCalidad('high')).toBe('high')
    expect(etiquetaCalidad('2160p')).toBe('2160p')
  })
})
