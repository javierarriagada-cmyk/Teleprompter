import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import {
  Entrada,
  MS_SOSTENIDO_MARCA,
  MS_ESCRIBIR_NOMBRE,
  MS_NOMBRE_QUIETO,
  MS_SALIDA_ENTRADA
} from '../components/Entrada'

describe('Pruebas TAREA 54: Tipografía del Sistema para SIGO (T272-T275)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T272 - Entrada.tsx no contiene stroke-dashoffset, ni pathLength, ni stroke-dasharray. La palabra SIGO esta como texto y su familia es "Source Serif 4".', () => {
    const filePath = path.join(process.cwd(), 'src/components/Entrada.tsx')
    const fileContent = fs.readFileSync(filePath, 'utf-8')

    expect(fileContent).not.toContain('stroke-dashoffset')
    expect(fileContent).not.toContain('pathLength')
    expect(fileContent).not.toContain('stroke-dasharray')

    render(<Entrada />)

    const elNombre = screen.getByTestId('nombre-sigo')
    expect(elNombre).not.toBeNull()
    expect(elNombre.tagName.toLowerCase()).toBe('text')
    expect(elNombre.textContent).toBe('SIGO')

    const styleAttr = elNombre.getAttribute('style') || ''
    expect(styleAttr).toContain('"Source Serif 4"')
  })

  test('T273 - El nombre se revela con clip-path en keyframes. Ningun elemento del nombre se anima con opacity.', () => {
    const filePath = path.join(process.cwd(), 'src/components/Entrada.tsx')
    const fileContent = fs.readFileSync(filePath, 'utf-8')

    expect(fileContent).toContain('clip-path: inset(0 100% 0 0)')
    expect(fileContent).toContain('clip-path: inset(0 0 0 0)')

    render(<Entrada />)

    const elNombre = screen.getByTestId('nombre-sigo')
    expect(elNombre).not.toBeNull()

    const styleAttr = elNombre.getAttribute('style') || ''
    expect(styleAttr).not.toContain('opacity')
    expect(elNombre.getAttribute('opacity')).toBeNull()
  })

  test('T274 - Leyendo las constantes de Entrada.tsx: MS_NOMBRE_QUIETO es mayor o igual a 350, y el tope de seguridad es mayor que MS_SOSTENIDO_MARCA + MS_ESCRIBIR_NOMBRE + MS_NOMBRE_QUIETO + MS_SALIDA_ENTRADA.', () => {
    expect(MS_NOMBRE_QUIETO).toBeGreaterThanOrEqual(350)

    const sumaTiempos = MS_SOSTENIDO_MARCA + MS_ESCRIBIR_NOMBRE + MS_NOMBRE_QUIETO + MS_SALIDA_ENTRADA // 1400 ms
    const TOPE_SEGURIDAD = 2400 // Constante interna en Entrada.tsx

    const filePath = path.join(process.cwd(), 'src/components/Entrada.tsx')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const matchTope = fileContent.match(/timerTope\s*=\s*setTimeout\(\(\)\s*=>\s*\{[\s\S]*?\},\s*(\d+)\)/)

    expect(matchTope).not.toBeNull()
    const topeLeido = parseInt(matchTope![1], 10)

    expect(topeLeido).toBeGreaterThan(sumaTiempos)
  })

  test('T275 - Entrada.tsx mira document.fonts.ready y tiene un tope de 1200 ms. Con la promesa de las fuentes sin resolver, pasado el tope la entrada arranca igual.', async () => {
    vi.useFakeTimers()
    try {
      const originalFonts = document.fonts
      let resolverFuente: () => void = () => {}

      // Mock document.fonts with unresolved promise
      const promesaInterminable = new Promise<void>((resolve) => {
        resolverFuente = resolve
      })

      Object.defineProperty(document, 'fonts', {
        value: {
          ready: promesaInterminable
        },
        configurable: true,
        writable: true
      })

      let finalizado = false
      render(<Entrada onFinish={() => { finalizado = true }} />)

      // A los 100 ms no ha finalizado
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      expect(finalizado).toBe(false)

      // Pasar los 1200 ms del tope de fuente + 1400 ms del timeline (total 2600 ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2600)
      })

      expect(finalizado).toBe(true)

      // Clean up mock
      resolverFuente()
      Object.defineProperty(document, 'fonts', {
        value: originalFonts,
        configurable: true,
        writable: true
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
