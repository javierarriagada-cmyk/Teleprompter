import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen, cleanup } from '@testing-library/react'
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
    await esperar(500)

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
})
