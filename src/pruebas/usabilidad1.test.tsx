import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { BarraEditorVacio } from '../components/BarraEditorVacio'
import TarjetaLectura from '../components/TarjetaLectura'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'
import { t } from '../textos'
import { hayAdondeVolver, EstadoAtras } from '../lib/atrasPredictivo'
import './ayudaEditor'

describe('Arreglos chicos de uso - Usabilidad 1', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
    else delete (navigator as any).clipboard
  })

  // 1. PEGAR SIN TEXTO
  describe('1. Pegar sin texto', () => {
    test('Pegar con texto vacío llama al aviso y con texto no', async () => {
      let textoRetornado = ''
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { readText: async () => textoRetornado }
      })

      const mostrarAvisoFn = vi.fn()
      const fakeEditor = {
        commands: {
          focus: vi.fn(),
          insertContent: vi.fn()
        },
        view: {
          someProp: vi.fn().mockReturnValue(null),
          state: { selection: { $from: {} }, tr: {} },
          dispatch: vi.fn()
        }
      } as any

      const guionVacio: Guion = { id: 'g1', titulo: 'Guion prueba', bloques: [{ id: 'b1', nombre: '', texto: '' }] } as Guion
      const fileInputRef = { current: null }

      const { rerender } = render(
        <BarraEditorVacio
          guion={guionVacio}
          editorRef={{ current: fakeEditor }}
          fileInputRef={fileInputRef}
          cargandoArchivo={false}
          mostrarAviso={mostrarAvisoFn}
        />
      )

      // A) Clipboard vacío
      textoRetornado = ''
      fireEvent.click(screen.getByTestId('btn-pegar-texto'))
      await waitFor(() => {
        expect(mostrarAvisoFn).toHaveBeenCalledWith(t('nadaCopiado'))
      })

      // B) Clipboard con texto
      mostrarAvisoFn.mockClear()
      textoRetornado = 'Texto copiado con contenido'
      rerender(
        <BarraEditorVacio
          guion={guionVacio}
          editorRef={{ current: fakeEditor }}
          fileInputRef={fileInputRef}
          cargandoArchivo={false}
          mostrarAviso={mostrarAvisoFn}
        />
      )
      fireEvent.click(screen.getByTestId('btn-pegar-texto'))
      await waitFor(() => {
        expect(fakeEditor.commands.focus).toHaveBeenCalled()
      })
      expect(mostrarAvisoFn).not.toHaveBeenCalled()
    })
  })

  // 2. TOCAR LA TARJETA DE PORTADA ABRE EL GUION EN EL EDITOR
  describe('2. Tocar la tarjeta de portada abre el guion en el editor', () => {
    test('Tocar la tarjeta llama a abrir el editor y tocar Leer no', () => {
      const onAbrirFn = vi.fn()
      const onLeerFn = vi.fn()
      const onGrabarFn = vi.fn()

      const resumen = {
        id: 'g-1',
        titulo: 'Guion portada',
        idioma: 'es',
        palabras: 15,
        modificado: Date.now()
      }

      render(
        <TarjetaLectura
          guionResumen={resumen}
          onAbrir={onAbrirFn}
          onLeer={onLeerFn}
          onGrabar={onGrabarFn}
          onCrearNuevo={() => {}}
        />
      )

      const tarjeta = screen.getByTestId('tarjeta-lectura-portada')
      expect(tarjeta.getAttribute('aria-label')).toBe(t('abrirEnEditor'))

      // Tocar Leer: llama a onLeer, NO llama a onAbrir (stopPropagation)
      fireEvent.click(screen.getByTestId('btn-leer-tarjeta'))
      expect(onLeerFn).toHaveBeenCalled()
      expect(onAbrirFn).not.toHaveBeenCalled()

      // Tocar la tarjeta fuera de los botones: llama a onAbrir
      fireEvent.click(tarjeta)
      expect(onAbrirFn).toHaveBeenCalledTimes(1)
    })

    test('Sin guion, tocar la tarjeta no hace nada', () => {
      const onAbrirFn = vi.fn()
      render(
        <TarjetaLectura
          guionResumen={undefined}
          onAbrir={onAbrirFn}
          onLeer={() => {}}
          onGrabar={() => {}}
          onCrearNuevo={() => {}}
        />
      )

      const tarjeta = screen.getByTestId('tarjeta-lectura-portada')
      expect(tarjeta.getAttribute('aria-label')).toBeNull()

      fireEvent.click(tarjeta)
      expect(onAbrirFn).not.toHaveBeenCalled()
    })
  })

  // 3. SALIR DE LA SELECCIÓN
  describe('3. Salir de la selección', () => {
    test('En el editor con texto seleccionado, la barra de formato muestra ✕ (Cerrar selección) de 48 dp, quita la selección y registra el modal abierto', async () => {
      const editorRefObj: { current: any } = { current: null }
      let regFn: (() => boolean) | null = null
      let regAbierto: boolean | undefined = undefined

      const GUION: Guion = {
        id: 'g-sel-2',
        titulo: 'Guion sel',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba con seleccion' }]
      }

      render(
        <EditorView
          guion={GUION}
          onChangeGuion={() => {}}
          onVolverBiblioteca={() => {}}
          onEntrarLectura={() => {}}
          editorRef={editorRefObj as any}
          onRegistrarCerrarModal={(fn, hayAbierto) => {
            regFn = fn
            regAbierto = hayAbierto
          }}
        />
      )

      await waitFor(() => {
        expect(editorRefObj.current).not.toBeNull()
      })

      const editorInstance = editorRefObj.current

      // Sin selección, no hay modal de selección registrado
      expect(regAbierto).toBe(false)
      expect(screen.queryByTestId('btn-cerrar-seleccion')).toBeNull()

      // Activar selección en el editor
      await act(async () => {
        editorInstance.chain().focus().setTextSelection({ from: 1, to: 8 }).run()
      })

      // Ahora regAbierto debe ser true y el botón ✕ de cerrar selección debe estar en pantalla
      await waitFor(() => {
        expect(regAbierto).toBe(true)
        expect(typeof regFn).toBe('function')
        const btnCerrar = screen.queryByTestId('btn-cerrar-seleccion')
        expect(btnCerrar).not.toBeNull()
        expect(btnCerrar?.getAttribute('aria-label')).toBe(t('cerrarSeleccion'))
        expect(btnCerrar?.style.width).toBe('48px')
        expect(btnCerrar?.style.height).toBe('48px')
      })

      // Probar hacer clic en el botón ✕
      const btnCerrar = screen.getByTestId('btn-cerrar-seleccion')
      await act(async () => {
        fireEvent.click(btnCerrar)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('btn-cerrar-seleccion')).toBeNull()
        expect(regAbierto).toBe(false)
      })

      // Activar selección de nuevo y probar llamar a regFn() (lo que hace el atrás de Android)
      await act(async () => {
        editorInstance.chain().focus().setTextSelection({ from: 1, to: 8 }).run()
      })

      await waitFor(() => {
        expect(regAbierto).toBe(true)
      })

      let resultadoAtras = false
      await act(async () => {
        if (regFn) resultadoAtras = regFn()
      })

      expect(resultadoAtras).toBe(true)
      await waitFor(() => {
        expect(screen.queryByTestId('btn-cerrar-seleccion')).toBeNull()
        expect(regAbierto).toBe(false)
      })
    })

    test('Lógica de atrás: con selección en el editor, algoAbierto es true y hayAdondeVolver es true', () => {
      const estadoEnEditorConSeleccion: EstadoAtras = {
        vista: 'editor',
        algoAbierto: true, // seleccionEditorAbierta = true
        tomaAndando: false,
        movimientoApagado: false
      }

      expect(hayAdondeVolver(estadoEnEditorConSeleccion)).toBe(true)

      const estadoEnEditorSinSeleccion: EstadoAtras = {
        vista: 'editor',
        algoAbierto: false,
        tomaAndando: false,
        movimientoApagado: false
      }

      expect(hayAdondeVolver(estadoEnEditorSinSeleccion)).toBe(true)
    })
  })
})
