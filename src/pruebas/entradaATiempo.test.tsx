import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'

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

describe('Entrada a tiempo: Pruebas de lógica (ArranquePlugin y Relevo)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockIsNative = false
    mockListoFn = () => Promise.resolve()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Si el plugin ya terminó y listo() llega después, la promesa se resuelve en el acto', async () => {
    // Simulación de la lógica del plugin ArranquePlugin (ArranquePlugin.java):
    // Cuando resolverListo() ocurre antes de que la web llame a listo(),
    // yaTermino pasa a true y cuando listo() llega después, resuelve en el acto.
    let ultimoCall: { resolve: () => void } | null = null
    let yaTermino = false

    const reiniciarEstado = () => {
      yaTermino = false
      ultimoCall = null
    }

    const resolverListo = () => {
      yaTermino = true
      if (ultimoCall) {
        ultimoCall.resolve()
        ultimoCall = null
      }
    }

    const listo = () => {
      if (yaTermino) {
        return Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        ultimoCall = { resolve }
      })
    }

    reiniciarEstado()
    // 1. El plugin termina primero (resolverListo)
    resolverListo()
    expect(yaTermino).toBe(true)

    // 2. La llamada listo() llega después y se resuelve inmediatamente
    let resuelto = false
    const promesa = listo().then(() => {
      resuelto = true
    })

    await promesa
    expect(resuelto).toBe(true)
  })

  test('Si al dispararse la vista NO es la portada, la entrada no se muestra', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      let resolverPromesa: () => void = () => {}

      mockIsNative = true
      mockListoFn = () => {
        return new Promise<void>((resolve) => {
          resolverPromesa = resolve
        })
      }

      render(<App repoOverride={repo} />)

      // Permitir que inicializar() complete y setCargado(true) se llame
      await act(async () => {
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(200)
      })

      // La entrada aún no se muestra porque listo() no ha resuelto
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()

      // La persona abre los ajustes desde el menú superior de la portada antes de que listo() resuelva
      const btnAjustes = screen.getByTestId('btn-menu-superior-biblioteca')
      await act(async () => {
        fireEvent.click(btnAjustes)
      })

      // Ahora la vista ya no es sólo la portada (se abrió Ajustes)
      // Resolver listo() de Arranque
      await act(async () => {
        resolverPromesa()
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(100)
      })

      // Como ya no es la portada libre, la entrada NO se muestra
      expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test('Si al dispararse la vista ES la portada, la entrada se muestra como hoy', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      let resolverPromesa: () => void = () => {}

      mockIsNative = true
      mockListoFn = () => {
        return new Promise<void>((resolve) => {
          resolverPromesa = resolve
        })
      }

      render(<App repoOverride={repo} />)

      // Permitir que inicializar() complete y setCargado(true)
      await act(async () => {
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(200)
      })

      // Permitir que las rAF del efecto de Arranque se ejecuten
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      // La persona se queda en la portada (vista === 'biblioteca' y !ajustesAbiertos)
      // Se resuelve listo() de Arranque
      await act(async () => {
        resolverPromesa()
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(100)
      })

      // Como sigue en la portada, la entrada SI se muestra como hoy
      expect(screen.queryByTestId('capa-entrada-espejo')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
