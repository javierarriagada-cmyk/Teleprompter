import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  MS_DEDO,
  MS_CHICO,
  MS_PANEL,
  MS_PANTALLA,
  CURVA_ENTRA,
  CURVA_SALE,
  CURVA_NORMAL,
  CURVA_RESORTE
} from '../components/movimiento'

describe('Espejo de duraciones y curvas CSS vs movimiento.tsx', () => {
  it('las variables de src/styles.css coinciden exactamente con las constantes de movimiento.tsx', () => {
    const cssPath = path.resolve(__dirname, '../styles.css')
    const cssContent = fs.readFileSync(cssPath, 'utf-8')

    function obtenerVariableCss(nombreVar: string): string {
      const regex = new RegExp(`${nombreVar}\\s*:\\s*([^;]+);`)
      const match = cssContent.match(regex)
      if (!match) {
        throw new Error(`No se encontró la variable CSS ${nombreVar} en src/styles.css`)
      }
      return match[1].trim()
    }

    expect(obtenerVariableCss('--ms-dedo')).toBe(`${MS_DEDO}ms`)
    expect(obtenerVariableCss('--ms-chico')).toBe(`${MS_CHICO}ms`)
    expect(obtenerVariableCss('--ms-panel')).toBe(`${MS_PANEL}ms`)
    expect(obtenerVariableCss('--ms-pantalla')).toBe(`${MS_PANTALLA}ms`)

    expect(obtenerVariableCss('--curva-entra')).toBe(CURVA_ENTRA)
    expect(obtenerVariableCss('--curva-sale')).toBe(CURVA_SALE)
    expect(obtenerVariableCss('--curva-normal')).toBe(CURVA_NORMAL)
    expect(obtenerVariableCss('--curva-resorte')).toBe(CURVA_RESORTE)
  })
})
