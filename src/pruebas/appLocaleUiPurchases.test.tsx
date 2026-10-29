// -corrección pruebas, 2026-10-29- Integración: App sincroniza el locale de RevenueCat tras
// leer el idioma inicial y al cambiar el idioma de la app. Sin posiciones, tamaños ni controles.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { MotorFake } from '../motor/MotorFake'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'

const sim = vi.hoisted(() => ({
  sync: vi.fn(async (_idioma?: 'es' | 'en' | 'pt') => {}),
  locales: [] as string[]
}))

function localeDe(idioma: 'es' | 'en' | 'pt'): string {
  if (idioma === 'es') return 'es'
  if (idioma === 'pt') return 'pt-BR'
  return 'en'
}

vi.mock('../lib/suscripcion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/suscripcion')>()
  const { suscribirIdioma, idiomaApp } = await import('../lib/idioma')
  return {
    ...actual,
    sincronizarLocaleUiPurchases: async (idioma?: 'es' | 'en' | 'pt') => {
      const id = idioma ?? idiomaApp()
      sim.locales.push(localeDe(id))
      await sim.sync(id)
    },
    vigilarLocaleUiPurchases: () =>
      suscribirIdioma(() => {
        const id = idiomaApp()
        sim.locales.push(localeDe(id))
        void sim.sync(id)
      }),
    // Sin SDK nativo en jsdom: no arrancar el ciclo real de Purchases.
    vigilarSuscripcion: () => () => {},
    tieneSuscripcion: () => false
  }
})

vi.mock('../lib/idioma', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/idioma')>()
  return {
    ...actual,
    // Simula el plugin de Android: el idioma efectivo al arrancar es portugués.
    leerIdiomaDelTelefono: async () => {
      actual.fijarIdioma('pt')
    }
  }
})

vi.mock('../lib/firebaseConfig', () => ({
  PENDIENTE: 'PENDIENTE',
  firebaseConfig: {
    apiKey: 'x',
    authDomain: 'x',
    projectId: 'x',
    appId: 'x'
  },
  idClienteWeb: 'x.apps.googleusercontent.com',
  configuracionLista: () => false
}))

vi.mock('../lib/limites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/limites')>()
  return {
    ...actual,
    cargarLimites: async () => {}
  }
})

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => false,
      isPluginAvailable: () => false
    }
  }
})

import App from '../App'
import { fijarIdioma } from '../lib/idioma'

beforeEach(() => {
  localStorage.clear()
  sim.sync.mockReset().mockResolvedValue(undefined)
  sim.locales = []
  fijarIdioma('es')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('App: sincronización del locale de RevenueCat con el idioma', () => {
  // Con repoOverride el vigilarLocaleUiPurchases no se enciende: solo cuenta el
  // void sincronizarLocaleUiPurchases tras leerIdiomaDelTelefono.
  it('tras leer el idioma inicial, sincroniza con el locale correcto', async () => {
    render(<App motor={new MotorFake()} repoOverride={new RepositorioMemoria()} />)
    await act(async () => {
      await vi.waitFor(() => {
        expect(sim.locales).toContain('pt-BR')
      })
    })
    expect(sim.locales[0]).toBe('pt-BR')
    expect(sim.sync).toHaveBeenCalled()
  })

  // Sin repoOverride: el useEffect de vigilarLocaleUiPurchases sí se enciende.
  it('al cambiar el idioma de la app, sincroniza otra vez con el nuevo locale', async () => {
    render(<App motor={new MotorFake()} />)
    await act(async () => {
      await vi.waitFor(() => {
        expect(sim.locales).toContain('pt-BR')
      })
    })
    const antes = sim.locales.length
    await act(async () => {
      fijarIdioma('en')
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(sim.locales.length).toBeGreaterThan(antes)
      })
    })
    expect(sim.locales[sim.locales.length - 1]).toBe('en')
  })
})
