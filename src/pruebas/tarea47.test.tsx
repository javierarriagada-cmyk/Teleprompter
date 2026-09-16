import React from 'react'
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'
import App from '../App'
import { resetearPrimerMontajeBiblioteca } from '../components/BibliotecaView'
import { CURVA_RESORTE } from '../components/movimiento'

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
  const rLin = canalLineal(r)
  const gLin = canalLineal(g)
  const bLin = canalLineal(b)
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

function relacionContraste(hex1: string, hex2: string): number {
  const l1 = luminanciaRelativa(hex1)
  const l2 = luminanciaRelativa(hex2)
  const masClaro = Math.max(l1, l2)
  const masOscuro = Math.min(l1, l2)
  return (masClaro + 0.05) / (masOscuro + 0.05)
}

describe('Pruebas TAREA 47 (T213-T217)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-tema')
    resetearPrimerMontajeBiblioteca()
  })

  test('T213 - LAS FICHAS NUEVAS EXISTEN Y LA VIEJA ROTA NO.', () => {
    const cssPath = path.resolve(process.cwd(), 'src/styles.css')
    const contenidoCSS = fs.readFileSync(cssPath, 'utf8')

    const matchOscuro = contenidoCSS.match(/\[data-tema="oscuro"\]\s*\{([^}]+)\}/)
    if (!matchOscuro) {
      throw new Error('No se encontró el bloque [data-tema="oscuro"] en src/styles.css')
    }

    const bloqueOscuro = matchOscuro[1]
    const fichasEsperadas: Record<string, string> = {
      '--bg-suelo': '#151312',
      '--bg-fila': '#1E1B19',
      '--bg-superficie': '#221F1D',
      '--bg-panel': '#2D2927',
      '--bg-menu': '#383432',
      '--color-separador': '#4B4643',
      '--color-borde': '#968F8B',
      '--color-apagado': '#CAC5C2',
      '--color-texto': '#E7E1DE'
    }

    for (const [ficha, hexEsperado] of Object.entries(fichasEsperadas)) {
      const regExp = new RegExp(`${ficha}:\\s*(${hexEsperado})\\b`, 'i')
      if (!regExp.test(bloqueOscuro)) {
        throw new Error(`Ficha ${ficha} no encontrada o valor incorrecto en [data-tema="oscuro"]. Esperado: ${hexEsperado}`)
      }
    }

    const matchBorde = bloqueOscuro.match(/--color-borde:\s*(#[0-9a-fA-F]{6})\b/i)
    const matchSuperficie = bloqueOscuro.match(/--bg-superficie:\s*(#[0-9a-fA-F]{6})\b/i)

    if (matchBorde && matchSuperficie && matchBorde[1].toUpperCase() === matchSuperficie[1].toUpperCase()) {
      throw new Error(`--color-borde (${matchBorde[1]}) es idéntico a --bg-superficie (${matchSuperficie[1]}) en el tema oscuro`)
    }
  })

  test('T214 - EL CONTRASTE SE CUMPLE.', () => {
    const cssPath = path.resolve(process.cwd(), 'src/styles.css')
    const contenidoCSS = fs.readFileSync(cssPath, 'utf8')

    const matchOscuro = contenidoCSS.match(/\[data-tema="oscuro"\]\s*\{([^}]+)\}/)
    if (!matchOscuro) throw new Error('No se encontró el bloque oscuro')
    const bloqueOscuro = matchOscuro[1]

    const obtenerValorHex = (varName: string): string => {
      const m = bloqueOscuro.match(new RegExp(`${varName}:\\s*(#[0-9a-fA-F]{6})\\b`, 'i'))
      if (!m) throw new Error(`No se encontró la variable ${varName}`)
      return m[1]
    }

    const bgSuelo = obtenerValorHex('--bg-suelo')
    const bgSuperficie = obtenerValorHex('--bg-superficie')
    const colorTexto = obtenerValorHex('--color-texto')
    const colorApagado = obtenerValorHex('--color-apagado')
    const colorBorde = obtenerValorHex('--color-borde')
    const colorGrabandoTexto = obtenerValorHex('--color-grabando-texto')

    const cTextoSuelo = relacionContraste(colorTexto, bgSuelo)
    const cTextoTarjeta = relacionContraste(colorTexto, bgSuperficie)
    const cApagadoTarjeta = relacionContraste(colorApagado, bgSuperficie)
    const cContornoSuelo = relacionContraste(colorBorde, bgSuelo)
    const cRojoTextoSuelo = relacionContraste(colorGrabandoTexto, bgSuelo)

    expect(cTextoSuelo).toBeGreaterThanOrEqual(4.5)
    expect(cTextoTarjeta).toBeGreaterThanOrEqual(4.5)
    expect(cApagadoTarjeta).toBeGreaterThanOrEqual(4.5)
    expect(cContornoSuelo).toBeGreaterThanOrEqual(3.0)
    expect(cRojoTextoSuelo).toBeGreaterThanOrEqual(4.5)
  })

  test('T215 - EL RESORTE NO TOCA EL TEXTO.', () => {
    expect(CURVA_RESORTE).toBe('cubic-bezier(.34, 1.3, .64, 1)')

    const cssPath = path.resolve(process.cwd(), 'src/styles.css')
    const contenidoCSS = fs.readFileSync(cssPath, 'utf8')

    // Verificar que los keyframes de objetos usen CURVA_RESORTE
    const keyframesObjetos = ['panelSube', 'cuentaRegresivaEntra', 'menuCreceEsquina']
    for (const keyframe of keyframesObjetos) {
      const regexKeyframe = new RegExp(`@keyframes\\s+${keyframe}\\s*\\{([^}]+)\\}`, 'm')
      const matchKeyframe = contenidoCSS.match(regexKeyframe)
      const usaResorteKeyframe = matchKeyframe ? matchKeyframe[1].includes('cubic-bezier(.34, 1.3, .64, 1)') : false

      // Tambien revisar el uso en JSX / componentes
      let usaResorteEnComponente = false
      if (keyframe === 'panelSube') {
        const fileContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BibliotecaView.tsx'), 'utf8')
        usaResorteEnComponente = fileContent.includes(`panelSube \${MS_PANEL}ms \${CURVA_RESORTE}`)
      } else if (keyframe === 'cuentaRegresivaEntra') {
        const fileContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/CuentaRegresiva.tsx'), 'utf8')
        usaResorteEnComponente = fileContent.includes(`cuentaRegresivaEntra \${MS_CHICO}ms \${CURVA_RESORTE}`)
      } else if (keyframe === 'menuCreceEsquina') {
        const fileContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BibliotecaView.tsx'), 'utf8')
        usaResorteEnComponente = fileContent.includes(`menuCreceEsquina \${MS_CHICO}ms \${CURVA_RESORTE}`)
      }

      if (!usaResorteKeyframe && !usaResorteEnComponente) {
        throw new Error(`El objeto o animación ${keyframe} no utiliza CURVA_RESORTE`)
      }
    }

    // Verificar que panelControlesEntra NO use resorte (solo opacidad)
    const matchControles = contenidoCSS.match(/@keyframes\s+panelControlesEntra\s*\{([^}]+)\}/)
    if (matchControles) {
      expect(matchControles[1].includes('transform')).toBe(false)
      expect(matchControles[1].includes('cubic-bezier(.34, 1.3, .64, 1)')).toBe(false)
    }
  })

  test('T216 - EL BOTON SE DEFORMA.', () => {
    const cssPath = path.resolve(process.cwd(), 'src/styles.css')
    const contenidoCSS = fs.readFileSync(cssPath, 'utf8')

    expect(contenidoCSS).toContain('.btn-deformable')
    expect(contenidoCSS).toContain('border-radius: 14px')
    expect(contenidoCSS).toContain('scaleY(0.94)')
    expect(contenidoCSS).toContain('cubic-bezier(.34, 1.3, .64, 1)')
  })

  test('T217 - EL TEMA SIGUE AL SISTEMA POR OMISION.', async () => {
    // Sin nada guardado, el tema vale 'sistema' y documentElement NO tiene el atributo data-tema
    render(<App />)

    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)

    // Abrir menu superior ⋯ de biblioteca
    const btnMenu = screen.getByTestId('btn-menu-superior-biblioteca')
    fireEvent.click(btnMenu)

    // Elegir "Oscuro"
    const btnOscuro = screen.getByRole('button', { name: /Oscuro/i })
    fireEvent.click(btnOscuro)

    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro')

    // Elegir "Sistema" de nuevo
    const btnSistema = screen.getByRole('button', { name: /Sistema/i })
    fireEvent.click(btnSistema)

    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  // T218 - LA BARRA "Leer" DEL EDITOR DESCUENTA EL AREA SEGURA.
  //
  // Este boton se quedo afuera de la tarea 43 por un olvido en el encargo: ahi se
  // arreglaron el relleno de la raiz de App y la barra de controles de la lectura,
  // y este siguio con bottom fijo en 24. En un telefono con barra de navegacion la
  // pildora se mete debajo del sistema, que es el mismo sintoma que hacia que un
  // toque en Leer cayera en el boton de Inicio.
  //
  // jsdom borra env() a secas pero lo conserva adentro de calc(), que es por lo que
  // la tarea 35 lo escribio asi. Igual que T194.
  test('T218 - LA BARRA "Leer" DEL EDITOR DESCUENTA EL AREA SEGURA DE ABAJO, y el hueco del contenedor tambien.', () => {
    const fuente = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/EditorView.tsx'),
      'utf8'
    )

    // el boton fijo
    expect(fuente).toContain("bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))'")
    expect(fuente).not.toContain('bottom: 24,')

    // y el hueco de abajo del contenedor, para que el ultimo renglon no quede tapado
    expect(fuente).toContain('calc(100px + env(safe-area-inset-bottom, 0px))')
  })
})
