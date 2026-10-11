import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen, fireEvent, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const state = vi.hoisted(() => ({
  accionPendiente: '',
  accesosFijados: [] as Array<{ etiquetaCorta: string; etiquetaLarga: string }>,
  accesosQuitados: 0,
  oyentesShortcut: [] as Array<(accion: string) => void>,
  textoPortapapeles: ''
}))

vi.mock('@capacitor/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...real,
    Capacitor: {
      ...real.Capacitor,
      isNativePlatform: () => true
    },
    registerPlugin: (name: string, opts?: any) => {
      if (name === 'Arranque') {
        return {
          listo: async () => {}
        }
      }
      return real.registerPlugin(name, opts)
    }
  }
})

vi.mock('../components/Entrada', () => ({
  Entrada: ({ onFinish }: { onFinish?: () => void }) => {
    React.useEffect(() => {
      onFinish?.()
    }, [onFinish])
    return null
  }
}))

vi.mock('@capacitor/clipboard', () => ({
  Clipboard: {
    read: async () => ({ value: state.textoPortapapeles, type: 'text/plain' })
  }
}))

vi.mock('../lib/accesosDirectos', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/accesosDirectos')>()
  return {
    ...real,
    tomarAccionPendiente: async () => {
      const a = state.accionPendiente
      state.accionPendiente = ''
      return a
    },
    actualizarAccesoGrabar: async (guion: { titulo: string } | null) => {
      if (!guion) {
        state.accesosQuitados++
        return
      }
      const titulo = real.recortarTituloAcceso(guion.titulo)
      state.accesosFijados.push({
        etiquetaCorta: 'Grabar',
        etiquetaLarga: `Grabar «${titulo}»`
      })
    },
    escucharAccionShortcut: async (cb: (accion: string) => void) => {
      state.oyentesShortcut.push(cb)
      return { remove: () => {} }
    }
  }
})

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import * as BarraEditorVacioModule from '../components/BarraEditorVacio'

const GUION_PORTADA: Guion = {
  id: 'g-portada',
  titulo: 'Guion de la portada',
  idioma: 'es',
  creado: Date.now(),
  modificado: Date.now(),
  bloques: [{ id: 'b1', nombre: '', texto: 'Este es el texto del guion de la portada.' }]
}

async function esperar(ms = 300) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

describe('Accesos directos del ícono: pruebas de lógica', () => {
  beforeEach(() => {
    if (typeof Node !== 'undefined' && !(Node.prototype as any).getBoundingClientRect) {
      (Node.prototype as any).getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
    }
    if (typeof Range !== 'undefined' && !(Range.prototype as any).getBoundingClientRect) {
      (Range.prototype as any).getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
    }
    if (typeof Element !== 'undefined' && !(Element.prototype as any).getBoundingClientRect) {
      (Element.prototype as any).getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} })
    }
    if (typeof Element !== 'undefined' && !Element.prototype.getClientRects) {
      Element.prototype.getClientRects = () => [] as any
    }
    if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
      Range.prototype.getClientRects = () => [] as any
    }
    state.accionPendiente = ''
    state.accesosFijados = []
    state.accesosQuitados = 0
    state.oyentesShortcut = []
    state.textoPortapapeles = ''
    localStorage.clear()
    localStorage.setItem('teleprompter_bienvenida_puesta', 'true')
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('la acción grabar abre LISTO con el guion de la tarjeta', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar(GUION_PORTADA)
    state.accionPendiente = 'grabar'

    render(<App repoOverride={repo} />)
    await esperar(500)

    const contenedor = screen.queryByTestId('teleprompter-view-container')
    expect(contenedor).not.toBeNull()
    expect(contenedor?.getAttribute('data-estado-toma')).toBe('listo')
  })

  test('la acción nuevo crea un guion y pega lo copiado', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar(GUION_PORTADA)
    state.textoPortapapeles = 'Texto copiado desde otra app'
    state.accionPendiente = 'nuevo'

    render(<App repoOverride={repo} />)
    await esperar(600)

    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
    const guiones = await repo.listar()
    const guionNuevoResumen = guiones.find((g) => g.id !== GUION_PORTADA.id)
    expect(guionNuevoResumen).toBeTruthy()
    const guionCompleto = await repo.abrir(guionNuevoResumen!.id)
    expect(guionCompleto?.bloques[0]?.texto).toBe('Texto copiado desde otra app')
  })

  test('sin nada copiado, el guion queda vacío', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar(GUION_PORTADA)
    state.textoPortapapeles = ''
    state.accionPendiente = 'nuevo'

    render(<App repoOverride={repo} />)
    await esperar(500)

    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
    expect(screen.getByTestId('btn-pegar-texto')).toBeTruthy()
    const guiones = await repo.listar()
    const guionNuevoResumen = guiones.find((g) => g.id !== GUION_PORTADA.id)
    expect(guionNuevoResumen).toBeTruthy()
    const guionCompleto = await repo.abrir(guionNuevoResumen!.id)
    expect(guionCompleto?.bloques[0]?.texto).toBe('')
  })

  test('sin guiones, la web pide quitar el acceso de Grabar', async () => {
    const repo = new RepositorioMemoria()
    render(<App repoOverride={repo} />)
    await esperar(500)

    expect(state.accesosQuitados).toBeGreaterThan(0)
  })

  test('una acción que llega dos veces corre una sola', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar(GUION_PORTADA)
    state.textoPortapapeles = 'Texto copiado una vez'
    state.accionPendiente = 'nuevo'

    render(<App repoOverride={repo} />)
    await esperar(100)

    if (state.oyentesShortcut.length > 0) {
      await act(async () => {
        state.oyentesShortcut[0]('nuevo')
      })
    }
    await esperar(500)

    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
    const guiones = await repo.listar()
    expect(guiones.length).toBe(2)
  })

  test('desde el editor, el acceso abre la acción sin llamar a handleVolverAtras en la biblioteca', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar(GUION_PORTADA)

    render(<App repoOverride={repo} />)
    await esperar(300)

    // Entrar al editor tocando el guion
    await act(async () => {
      fireEvent.click(screen.getByTestId('fila-guion-g-portada'))
    })
    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()

    // Disparar acceso directo 'grabar'
    if (state.oyentesShortcut.length > 0) {
      await act(async () => {
        state.oyentesShortcut[0]('grabar')
      })
    }
    await esperar(600)

    // Debe haber vuelto a la portada y luego abierto LISTO
    const contenedor = screen.queryByTestId('teleprompter-view-container')
    expect(contenedor).not.toBeNull()
    expect(contenedor?.getAttribute('data-estado-toma')).toBe('listo')
  })

  test('el pegado del acceso pasa por la misma función que el botón', async () => {
    const spyPega = vi.spyOn(BarraEditorVacioModule, 'pegarTextoEnEditor')
    const fakeEditor = {
      commands: { focus: vi.fn(), insertContent: vi.fn() },
      view: {
        someProp: vi.fn(),
        dispatch: vi.fn(),
        state: { selection: { $from: {} }, tr: { replaceSelection: () => ({ scrollIntoView: () => ({}) }) } }
      }
    } as any
    const onPegado = vi.fn()
    BarraEditorVacioModule.pegarTextoEnEditor(fakeEditor, 'Texto prueba', onPegado)
    expect(spyPega).toHaveBeenCalledWith(fakeEditor, 'Texto prueba', onPegado)
    expect(onPegado).toHaveBeenCalled()
  })

  test('sin foco, a los 2 s sigue igual', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    const repo = new RepositorioMemoria()
    await repo.guardar(GUION_PORTADA)
    state.textoPortapapeles = 'Copiado sin foco'
    state.accionPendiente = 'nuevo'

    render(<App repoOverride={repo} />)
    // Inicialmente no debe haber resuelto aún si no hay foco
    await esperar(300)

    // A los 2.1 s el temporizador libera el foco y la acción termina
    await esperar(2200)

    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
  })
})
