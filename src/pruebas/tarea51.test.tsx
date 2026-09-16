import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'

import App from '../App'
import EditorView from '../components/EditorView'
import { Entrada, RENGLONES_ESPEJO, FACTOR_ESPEJO, COLOR_MARCA_TRAZO_APAGADO, COLOR_MARCA_TRAZO, COLOR_MARCA_PUNTO } from '../components/Entrada'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { guionNuevo, Guion } from '../datos/modelo'

describe('Pruebas TAREA 51: El Nombre Aparece (T254-T259)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T254 - EL ESPEJO CALZA CON EL ARRANQUE. Leyendo marca_arranque.xml, calcular factor = 288/432 y las cinco posiciones de renglon como (coordenada - 216) * factor. Comparar con las que usa Entrada.tsx con tolerancia <= 0.5 px.', () => {
    const xmlPath = path.join(process.cwd(), 'android/app/src/main/res/drawable/marca_arranque.xml')
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

    // Extraer paths linea1..linea5 de marca_arranque.xml
    const lineasCoordenadas: { [key: string]: { x1: number; y: number; x2: number } } = {}

    const pathRegex = /<path\s+[^>]*android:name="linea(\d)"[^>]*pathData="M(\d+),(\d+)\s+L(\d+),(\d+)"/g
    let match
    while ((match = pathRegex.exec(xmlContent)) !== null) {
      const num = match[1]
      const x1 = parseFloat(match[2])
      const y1 = parseFloat(match[3])
      const x2 = parseFloat(match[4])
      const y2 = parseFloat(match[5])
      lineasCoordenadas[`R${num}`] = { x1, y: y1, x2 }
    }

    expect(Object.keys(lineasCoordenadas).length).toBe(5)

    const factorEsperado = 288 / 432
    expect(Math.abs(FACTOR_ESPEJO - factorEsperado)).toBeLessThan(0.0001)

    // Comparar cada renglón de Entrada.tsx con lo derivado de marca_arranque.xml
    RENGLONES_ESPEJO.forEach((renglon) => {
      const orig = lineasCoordenadas[renglon.id]
      expect(orig).toBeDefined()

      const x1Esperado = (orig.x1 - 216) * factorEsperado
      const x2Esperado = (orig.x2 - 216) * factorEsperado
      const yEsperado = (orig.y - 216) * factorEsperado

      expect(Math.abs(renglon.x1 - x1Esperado)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(renglon.x2 - x2Esperado)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(renglon.y - yEsperado)).toBeLessThanOrEqual(0.5)
    })
  })

  test('T255 - EL NOMBRE SE ESCRIBE, NO APARECE. Los trazos de las letras usan stroke-dashoffset. Ningun elemento del nombre se anima solo con opacity.', () => {
    render(<Entrada />)

    const contenedorNombre = screen.getByTestId('nombre-sigo')
    expect(contenedorNombre).not.toBeNull()

    const letras = ['S', 'I', 'G', 'O']
    letras.forEach((letra) => {
      const el = screen.getByTestId(`letra-${letra}`)
      expect(el).not.toBeNull()

      const strokeDashoffset = el.getAttribute('stroke-dashoffset')
      expect(strokeDashoffset).not.toBeNull()

      // Verificar que NO usa opacity para aparecer
      const computedStyle = window.getComputedStyle(el)
      expect(computedStyle.opacity).not.toBe('0')
      expect(el.getAttribute('opacity')).toBeNull()
    })
  })

  test('T256 - EL ESPEJO SE VA. Montando App, el espejo esta al principio y NO esta en el documento despues de 1100 ms. Y con movimientoApagado() en true no se monta nunca.', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      const { unmount } = render(<App repoOverride={repo} />)

      // Al inicio está montada la capa espejo
      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()

      // A los 1100 ms (antes del tope de 2000 ms), el espejo ya se desmontó
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })

      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()
      unmount()

      // Con prefers-reduced-motion (movimientoApagado true), no se monta nunca
      const matchMediaOriginal = window.matchMedia
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      render(<App repoOverride={repo} />)
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()

      window.matchMedia = matchMediaOriginal
    } finally {
      vi.useRealTimers()
    }
  })

  test('T257 - EL EDITOR VACIO NO TIENE NI TITULO ESCRITO NI BLOQUE PUNTEADO NI PILDORA. Con un guion recien creado: el campo de titulo esta vacio, no hay boton de agregar bloque, y btn-leer-guion-fijo NO esta en el documento. Con texto, los tres vuelven.', () => {
    const guionVacio: Guion = guionNuevo('es')

    let guionState = guionVacio

    const { rerender } = render(
      <EditorView
        guion={guionState}
        onChangeGuion={(g) => { guionState = g }}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    // 1. Con el guion recién creado
    const inputTitulo = screen.getByTestId('input-titulo-guion') as HTMLInputElement
    expect(inputTitulo.value).toBe('')
    expect(inputTitulo.placeholder).toBe('Título')

    expect(screen.queryByTestId('btn-agregar-bloque')).toBeNull()
    expect(screen.queryByTestId('btn-leer-guion-fijo')).toBeNull()

    // 2. Con texto, los tres vuelven
    const guionConTexto: Guion = {
      ...guionVacio,
      titulo: 'Mi Guión',
      bloques: [{ id: 'b1', nombre: '', texto: 'Un párrafo de texto.' }]
    }

    rerender(
      <EditorView
        guion={guionConTexto}
        onChangeGuion={(g) => { guionState = g }}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    const inputTituloConTexto = screen.getByTestId('input-titulo-guion') as HTMLInputElement
    expect(inputTituloConTexto.value).toBe('Mi Guión')

    expect(screen.getByTestId('btn-agregar-bloque')).not.toBeNull()
    expect(screen.getByTestId('btn-leer-guion-fijo')).not.toBeNull()
  })

  test('T258 - RED DE SEGURIDAD. Si el timer de 1000 ms fallara, el tope de seguridad de 2000 ms desmonta el espejo.', async () => {
    vi.useFakeTimers()
    try {
      let finalizado = false
      render(<Entrada onFinish={() => { finalizado = true }} />)

      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()

      // Avanzar hasta 2100 ms (pasado el tope de seguridad)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100)
      })

      expect(finalizado).toBe(true)
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test('T259 - COLORES COINCIDEN CON LA MARCA NATIVA. Los tres colores de Entrada.tsx coinciden con marca_trazo_apagado, marca_trazo y marca_punto de values-night/colors.xml.', () => {
    const xmlPath = path.join(process.cwd(), 'android/app/src/main/res/values-night/colors.xml')
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

    const getHexColor = (name: string): string => {
      const regex = new RegExp(`<color name="${name}">([^<]+)</color>`)
      const match = xmlContent.match(regex)
      return match ? match[1].trim().toUpperCase() : ''
    }

    const marcaTrazoApagado = getHexColor('marca_trazo_apagado')
    const marcaTrazo = getHexColor('marca_trazo')
    const marcaPunto = getHexColor('marca_punto')

    expect(COLOR_MARCA_TRAZO_APAGADO.toUpperCase()).toBe(marcaTrazoApagado)
    expect(COLOR_MARCA_TRAZO.toUpperCase()).toBe(marcaTrazo)
    expect(COLOR_MARCA_PUNTO.toUpperCase()).toBe(marcaPunto)
  })
})
