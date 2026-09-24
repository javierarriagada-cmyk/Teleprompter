import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import {
  Entrada,
  MS_MARCA_QUIETA,
  MS_VIAJE_MARCA,
  MS_TOPE_ENTRADA,
  CLASE_ENTRADA_EN_CURSO,
  CLASE_MARCA_VIAJANDO
} from '../components/Entrada'
import BibliotecaView from '../components/BibliotecaView'
import { MARCA_TRAZO_NOMBRE } from '../components/trazoMarca'

// La Tarea 54 cuido que "SIGO" se escribiera en la letra del sistema, revelado
// con clip-path y esperando a document.fonts. El 24-09-2026 la marca paso a ser
// "Sig" y la bola -trazoMarca.ts- y dejo de ser texto: es el contorno de la
// letra convertido a dibujo, asi que ya no espera fuentes ni se revela letra
// por letra. Estas cuatro guardianas cuidan la entrada nueva: que sea el mismo
// dibujo que la barra, que la portada espere a la marca, que los tiempos se
// lean y que nunca deje la portada escondida.
describe('Pruebas TAREA 54: La Marca de la Entrada (T272-T275)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.documentElement.classList.remove(CLASE_ENTRADA_EN_CURSO, CLASE_MARCA_VIAJANDO)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T272 - LA MARCA ES UN DIBUJO, EL MISMO EN LA ENTRADA Y EN LA BARRA. Entrada no escribe texto -ni SIGO ni Sig- y la barra de la portada dibuja el mismo trazo, donde apunta data-marca-portada.', () => {
    const fuente = fs.readFileSync(path.join(process.cwd(), 'src/components/Entrada.tsx'), 'utf8')
    expect(fuente).not.toMatch(/>\s*SIGO\s*</)
    expect(fuente).not.toContain('document.fonts')

    render(<Entrada desdeSplashNativo />)
    const marcaEntrada = screen.getByTestId('marca-entrada')
    expect(marcaEntrada.textContent).toBe('')
    expect(marcaEntrada.querySelector('path')?.getAttribute('d')).toBe(MARCA_TRAZO_NOMBRE)

    render(<BibliotecaView guiones={[]} onAbrir={() => {}} onCrearNuevo={() => {}} onBorrar={() => {}} onArchivar={() => {}} />)
    const marcaBarra = document.querySelector('[data-marca-portada]') as SVGElement
    expect(marcaBarra).not.toBeNull()
    expect(marcaBarra.querySelector('path')?.getAttribute('d')).toBe(MARCA_TRAZO_NOMBRE)
  })

  test('T273 - LA PORTADA ESPERA A LA MARCA. Mientras la marca esta quieta, <html> lleva entrada-en-curso y marca-viajando; al empezar el viaje se va la primera -la portada sube- y al llegar la segunda -la marca de la barra toma el relevo-.', async () => {
    vi.useFakeTimers()
    try {
      const raiz = document.documentElement
      render(<Entrada desdeSplashNativo />)
      expect(raiz.classList.contains(CLASE_ENTRADA_EN_CURSO)).toBe(true)
      expect(raiz.classList.contains(CLASE_MARCA_VIAJANDO)).toBe(true)

      await act(async () => { await vi.advanceTimersByTimeAsync(MS_MARCA_QUIETA + 10) })
      expect(raiz.classList.contains(CLASE_ENTRADA_EN_CURSO)).toBe(false)
      expect(raiz.classList.contains(CLASE_MARCA_VIAJANDO)).toBe(true)

      await act(async () => { await vi.advanceTimersByTimeAsync(MS_VIAJE_MARCA + 10) })
      expect(raiz.classList.contains(CLASE_MARCA_VIAJANDO)).toBe(false)
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()

      const css = fs.readFileSync(path.join(process.cwd(), 'src/styles.css'), 'utf8')
      expect(css).toContain('.entrada-en-curso .portada-cuerpo')
      expect(css).toContain('.marca-viajando [data-marca-portada]')
    } finally {
      vi.useRealTimers()
    }
  })

  test('T274 - LOS TIEMPOS SE LEEN. La marca se sostiene al menos 350 ms antes de viajar, y el tope de seguridad es mayor que la quietud mas el viaje.', () => {
    expect(MS_MARCA_QUIETA).toBeGreaterThanOrEqual(350)
    expect(MS_TOPE_ENTRADA).toBeGreaterThan(MS_MARCA_QUIETA + MS_VIAJE_MARCA)
  })

  test('T275 - NUNCA DEJA LA PORTADA ESCONDIDA. Si la entrada se desmonta a mitad de camino, las dos clases se van con ella.', () => {
    const raiz = document.documentElement
    const { unmount } = render(<Entrada desdeSplashNativo />)
    expect(raiz.classList.contains(CLASE_ENTRADA_EN_CURSO)).toBe(true)
    unmount()
    expect(raiz.classList.contains(CLASE_ENTRADA_EN_CURSO)).toBe(false)
    expect(raiz.classList.contains(CLASE_MARCA_VIAJANDO)).toBe(false)
  })
})
