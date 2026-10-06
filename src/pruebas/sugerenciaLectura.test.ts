import { describe, test, expect } from 'vitest'
import { PAREJAS_COLOR } from '../datos/modelo'
import { colorSugerenciaLectura, colorLetraEfectiva } from '../components/estiloLectura'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

function canalLineal(c255: number): number {
  const s = c255 / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b)
}

function relacionContraste(hex1: string, hex2: string): number {
  const l1 = luminanciaRelativa(hex1)
  const l2 = luminanciaRelativa(hex2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

describe('colorSugerenciaLectura - tarea 101', () => {
  test('en cada pareja de PAREJAS_COLOR la sugerencia da ≥4,5:1 contra el fondo y es más tenue que la letra', () => {
    for (const pareja of PAREJAS_COLOR) {
      const sugerencia = colorSugerenciaLectura(pareja.fondo)
      const letra = colorLetraEfectiva(pareja.fondo, pareja.letra)
      const ratioSug = relacionContraste(sugerencia, pareja.fondo)
      const ratioLetra = relacionContraste(letra, pareja.fondo)
      expect(ratioSug, `${pareja.fondo} sugerencia ${sugerencia}`).toBeGreaterThanOrEqual(4.5)
      expect(ratioSug, `${pareja.fondo}: sugerencia debe ser más tenue que la letra`).toBeLessThan(ratioLetra)
    }
  })
})
