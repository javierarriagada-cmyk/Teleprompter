import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen, fireEvent } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'

import App from '../App'
import EditorView from '../components/EditorView'
import { Entrada, RENGLONES_ESPEJO, FACTOR_ESPEJO, COLOR_MARCA_TRAZO_APAGADO, COLOR_MARCA_TRAZO, COLOR_MARCA_PUNTO } from '../components/Entrada'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { guionNuevo, Guion } from '../datos/modelo'

let mockIsNative = false
let mockListoFn = () => Promise.resolve()

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => mockIsNative
    },
    registerPlugin: (name: string, options?: any) => {
      if (name === 'Arranque') {
        return {
          listo: () => mockListoFn()
        }
      }
      return actual.registerPlugin(name, options)
    }
  }
})

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

  test('T256 - EL ESPEJO SE VA. Montando App, el espejo esta al principio y NO esta en el documento despues de 1500 ms. Y con movimientoApagado() en true no se monta nunca.', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      const { unmount } = render(<App repoOverride={repo} />)

      // Al inicio está montada la capa espejo
      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()

      // Pasado el tiempo de timeline (1400 ms), el espejo ya se desmontó
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500)
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
    expect(inputTitulo.placeholder).toBe('Sin título')

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

  test('T258 - RED DE SEGURIDAD. Si el timer de 1400 ms fallara, el tope de seguridad de 2400 ms desmonta el espejo.', async () => {
    vi.useFakeTimers()
    try {
      let finalizado = false
      render(<Entrada onFinish={() => { finalizado = true }} />)

      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()

      // Avanzar hasta 2500 ms (pasado el tope de seguridad)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500)
      })

      expect(finalizado).toBe(true)
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test('T266 - EL ESPEJO ESPERA A QUE EL ARRANQUE SE VAYA. Con el plugin fingido y su promesa sin resolver, el espejo NO esta en el documento. Al resolverla, aparece. Y en el navegador -sin plataforma nativa- aparece de inmediato. Si la promesa RECHAZA: aparece igual.', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()

      // 1. Caso plataforma nativa con promesa sin resolver
      let resolverPromesa: () => void = () => {}
      mockIsNative = true
      mockListoFn = () => {
        console.log('MOCK: listo() called')
        return new Promise<void>((resolve) => {
          resolverPromesa = () => {
            console.log('MOCK: resolverPromesa called!')
            resolve()
          }
        })
      }

      const { unmount } = render(<App repoOverride={repo} />)

      // 1. Permitir que inicializar() complete y setCargado(true) dispare el useEffect
      await act(async () => {
        await Promise.resolve()
      })
      // 2. Permitir que las dos requestAnimationFrame se ejecuten
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      console.log('TEST: checking null')
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()

      console.log('TEST: calling resolverPromesa')
      await act(async () => {
        resolverPromesa()
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(50)
      })
      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()

      unmount()

      // 2. Sin plataforma nativa (navegador web)
      mockIsNative = false
      mockListoFn = () => Promise.resolve()
      const { unmount: unmount2 } = render(<App repoOverride={repo} />)
      await act(async () => {
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(50)
      })
      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()
      unmount2()

      // 3. Caso plataforma nativa con promesa que RECHAZA
      mockIsNative = true
      mockListoFn = () => Promise.reject(new Error('error en plugin'))

      const { unmount: unmount3 } = render(<App repoOverride={repo} />)
      await act(async () => {
        await Promise.resolve()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()
      unmount3()
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

  test('T268 - HOJA DE AJUSTES SE CIERRA ARRASTRANDOLA. Con la hoja abierta, un arrastre de 120 px hacia abajo la saca del documento; uno de 40 px la deja.', async () => {
    const guion = guionNuevo('es')
    render(
      <EditorView
        guion={guion}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    // Abrir hoja con Aa
    const btnAa = screen.getByTestId('btn-menu-opciones-editor')
    await act(async () => {
      btnAa.click()
    })

    const panel = screen.getByTestId('panel-ajustes')
    expect(panel).not.toBeNull()

    // 1. Arrastre de 40 px hacia abajo (menos de 96 px): la hoja se queda
    await act(async () => {
      fireEvent(panel, new MouseEvent('pointerdown', { clientY: 100, bubbles: true }))
      fireEvent(panel, new MouseEvent('pointermove', { clientY: 140, bubbles: true }))
      fireEvent(panel, new MouseEvent('pointerup', { clientY: 140, bubbles: true }))
    })

    expect(screen.queryByTestId('panel-ajustes')).not.toBeNull()

    // 2. Arrastre de 120 px hacia abajo (más de 96 px): la hoja se cierra y sale del documento
    const panelActual = screen.getByTestId('panel-ajustes')
    await act(async () => {
      fireEvent(panelActual, new MouseEvent('pointerdown', { clientY: 100, bubbles: true }))
      fireEvent(panelActual, new MouseEvent('pointermove', { clientY: 220, bubbles: true }))
      fireEvent(panelActual, new MouseEvent('pointerup', { clientY: 220, bubbles: true }))
    })

    expect(screen.queryByTestId('panel-ajustes')).toBeNull()
  })

  test('T269 - DESLIZAR FILA PARA BORRAR O ARCHIVAR. 100 px a la izquierda revela borrar; 40 px no hace nada; a la derecha revela archivar.', async () => {
    const guion1: Guion = {
      id: 'g1-t269',
      titulo: 'Guion 1 T269',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto 1 T269' }]
    }
    const guion2: Guion = {
      id: 'g2-t269',
      titulo: 'Guion 2 T269',
      idioma: 'es',
      creado: Date.now() - 1000,
      modificado: Date.now() - 1000,
      archivado: false,
      bloques: [{ id: 'b2', nombre: '', texto: 'Texto 2 T269' }]
    }

    render(
      <App
        repoOverride={
          {
            listar: () => Promise.resolve([guion1, guion2]),
            abrir: (id: string) => Promise.resolve(id === 'g1-t269' ? guion1 : guion2),
            guardar: () => Promise.resolve(),
            borrar: () => Promise.resolve()
          } as any
        }
      />
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const fila1 = screen.getByTestId('fila-guion-g1-t269')
    const fila2 = screen.getByTestId('fila-guion-g2-t269')

    // 1. Arrastre de 40 px a la izquierda (umbral 88 no superado): no revela nada
    await act(async () => {
      fireEvent(fila1, new MouseEvent('pointerdown', { clientX: 200, clientY: 100, bubbles: true }))
      fireEvent(fila1, new MouseEvent('pointermove', { clientX: 160, clientY: 100, bubbles: true }))
    })
    expect(screen.queryByTestId('accion-revelada-borrar-g1-t269')).toBeNull()

    await act(async () => {
      fireEvent(fila1, new MouseEvent('pointerup', { clientX: 160, clientY: 100, bubbles: true }))
    })
    expect(screen.queryByTestId('aviso-flotante')).toBeNull()

    // 2. Arrastre de 100 px a la derecha en fila1: revela archivar
    await act(async () => {
      fireEvent(fila1, new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
      fireEvent(fila1, new MouseEvent('pointermove', { clientX: 200, clientY: 100, bubbles: true }))
    })
    expect(screen.getByTestId('accion-revelada-archivar-g1-t269')).not.toBeNull()

    await act(async () => {
      fireEvent(fila1, new MouseEvent('pointerup', { clientX: 200, clientY: 100, bubbles: true }))
    })

    // 3. Arrastre de 100 px a la izquierda en fila2: revela borrar y al soltar activa borrado con aviso
    await act(async () => {
      fireEvent(fila2, new MouseEvent('pointerdown', { clientX: 200, clientY: 100, bubbles: true }))
      fireEvent(fila2, new MouseEvent('pointermove', { clientX: 100, clientY: 100, bubbles: true }))
    })
    expect(screen.getByTestId('accion-revelada-borrar-g2-t269')).not.toBeNull()

    await act(async () => {
      fireEvent(fila2, new MouseEvent('pointerup', { clientX: 100, clientY: 100, bubbles: true }))
    })

    const aviso = screen.getByTestId('aviso-flotante')
    expect(aviso.textContent).toContain('Guion borrado')
  })

  test('T270 - BORRADO CON DESHACER (5 SEGUNDOS). Tras borrar, el guion NO esta en el repositorio pasados los 5 segundos; tocando Deshacer antes, SI sigue estando.', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      const guion: Guion = {
        id: 'g-t270',
        titulo: 'Guion T270',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        archivado: false,
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto T270' }]
      }
      await repo.guardar(guion)

      render(<App repoOverride={repo} />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })

      const fila = screen.getByTestId('fila-guion-g-t270')

      // Deslizar 100 px a la izquierda para borrar
      await act(async () => {
        fireEvent(fila, new MouseEvent('pointerdown', { clientX: 200, clientY: 100, bubbles: true }))
        fireEvent(fila, new MouseEvent('pointermove', { clientX: 100, clientY: 100, bubbles: true }))
        fireEvent(fila, new MouseEvent('pointerup', { clientX: 100, clientY: 100, bubbles: true }))
      })

      // 1. Inmediatamente o a los 2 segundos, el guion SI sigue en el repositorio (está en espera)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      let guardados = await repo.listar()
      expect(guardados.some((g) => g.id === 'g-t270')).toBe(true)

      // 2. Tocando Deshacer antes de los 5s, el guion NO se borra
      const btnDeshacer = screen.getByText('Deshacer')
      await act(async () => {
        fireEvent.click(btnDeshacer)
        await vi.advanceTimersByTimeAsync(3500)
      })

      guardados = await repo.listar()
      expect(guardados.some((g) => g.id === 'g-t270')).toBe(true)

      // 3. Volver a borrar y dejar pasar los 5 segundos completos
      const filaDeNuevo = screen.getByTestId('fila-guion-g-t270')
      await act(async () => {
        fireEvent(filaDeNuevo, new MouseEvent('pointerdown', { clientX: 200, clientY: 100, bubbles: true }))
        fireEvent(filaDeNuevo, new MouseEvent('pointermove', { clientX: 100, clientY: 100, bubbles: true }))
        fireEvent(filaDeNuevo, new MouseEvent('pointerup', { clientX: 100, clientY: 100, bubbles: true }))
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5100)
      })

      guardados = await repo.listar()
      expect(guardados.some((g) => g.id === 'g-t270')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  test('T271 - EL VERTICAL GANA. Con 10 px horizontales y 40 verticales, la fila no se desplaza.', async () => {
    const guion: Guion = {
      id: 'g-t271',
      titulo: 'Guion T271',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T271' }]
    }

    render(
      <App
        repoOverride={
          {
            listar: () => Promise.resolve([guion]),
            abrir: () => Promise.resolve(guion),
            guardar: () => Promise.resolve(),
            borrar: () => Promise.resolve()
          } as any
        }
      />
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const fila = screen.getByTestId('fila-guion-g-t271')

    // Arrastre con 10px X y 40px Y (movimiento vertical predominante)
    await act(async () => {
      fireEvent(fila, new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
      fireEvent(fila, new MouseEvent('pointermove', { clientX: 110, clientY: 140, bubbles: true }))
    })

    // La fila no debe mostrar acciones de deslizamiento horizontal
    expect(screen.queryByTestId('accion-revelada-archivar-g-t271')).toBeNull()
    expect(screen.queryByTestId('accion-revelada-borrar-g-t271')).toBeNull()
  })
})
