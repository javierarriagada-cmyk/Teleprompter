// TAREA 104, PASO 2 -06-10-2026-: los modelos de voz y de gestos a pedido, en silencio. Solo las pruebas
// de lógica que pidió Javier. La quinta -la copia vieja del español se borra sola, y solo esa carpeta-
// es Java y está en android/app/src/test/.../CopiaViejaDelModeloTest.java.
import React from 'react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { crearVozEnSilencio, idiomaDeVoz, EstadoVozEnSilencio, IdiomaVoz } from '../lib/vozAPedido'
import { encenderGestos, EstadoModeloGestos } from '../lib/gestos'
import { MotorFake } from '../motor/MotorFake'
import { ResultadoVoz } from '../motor/MotorDeVoz'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'

vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return { ...actual, recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar() }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Tarea 104 - La voz y los gestos a pedido', () => {
  test('T104a El modelo que se pide es el del idioma de la app: español con la app en español, inglés con la app en inglés.', async () => {
    expect(idiomaDeVoz('es')).toBe('es')
    expect(idiomaDeVoz('en')).toBe('en')
    expect(idiomaDeVoz('en-US')).toBe('en')
    expect(idiomaDeVoz('es-ES')).toBe('es')
    // Un idioma que no conocemos no deja a la app sin voz.
    expect(idiomaDeVoz('pt')).toBe('es')
    const pedidos: IdiomaVoz[] = []
    const voz = crearVozEnSilencio({
      asegurar: async (idioma) => {
        pedidos.push(idioma)
        return 'lista'
      },
      alCambiar: () => {},
      escucharRed: () => () => {}
    })
    voz.pedir(idiomaDeVoz('en'))
    voz.pedir(idiomaDeVoz('en'))
    await Promise.resolve()
    // Una sola vez, aunque se pida de nuevo mientras baja, y nunca el otro idioma.
    expect(pedidos).toEqual(['en'])
  })

  test('T104b Al abrir la app se pide en silencio el modelo del idioma de la app.', async () => {
    localStorage.setItem('sigo_idioma', 'en')
    const llamadas: Array<{ lang: string; silencioso: boolean }> = []
    class MotorPlay extends MotorFake {
      async asegurarVoz(lang: string, _p: (f: number) => void, opciones?: { silencioso?: boolean }): Promise<ResultadoVoz> {
        llamadas.push({ lang, silencioso: opciones?.silencioso === true })
        return 'lista'
      }
    }
    vi.resetModules()
    const { default: App } = await import('../App')
    render(<App repoOverride={new RepositorioMemoria()} motor={new MotorPlay()} />)
    await waitFor(() => expect(llamadas.length).toBeGreaterThan(0), { timeout: 5000 })
    expect(llamadas[0]).toEqual({ lang: 'en-US', silencioso: true })
    expect(llamadas.some((l) => l.lang.startsWith('es'))).toBe(false)
  })

  test('T104c Sin conexión, la voz se vuelve a pedir sola cuando vuelve la red.', async () => {
    const respuestas: ResultadoVoz[] = ['sin-conexion', 'lista']
    const estados: EstadoVozEnSilencio['estado'][] = []
    let volverLaRed: (() => void) | null = null
    let suscripciones = 0
    const voz = crearVozEnSilencio({
      asegurar: async () => respuestas.shift()!,
      alCambiar: (_idioma, e) => estados.push(e.estado),
      escucharRed: (alVolver) => {
        suscripciones++
        volverLaRed = alVolver
        return () => {
          volverLaRed = null
        }
      }
    })
    voz.pedir('es')
    await waitFor(() => expect(estados).toEqual(['sin-conexion']))
    expect(suscripciones).toBe(1)
    volverLaRed!()
    await waitFor(() => expect(estados).toEqual(['sin-conexion', 'lista']))
    // Ya está: no se queda esperando la red.
    expect(volverLaRed).toBeNull()
    expect(suscripciones).toBe(1)
  })

  test('T104d Sin el modelo de gestos el interruptor no se enciende.', async () => {
    const estados: EstadoModeloGestos[] = []
    const encender = vi.fn()
    const encendido = await encenderGestos({
      asegurar: async () => 'sin-conexion',
      alCambiar: (e) => estados.push(e),
      encender,
      sigueQueriendo: () => true
    })
    expect(encendido).toBe(false)
    expect(encender).not.toHaveBeenCalled()
    expect(estados).toEqual([{ estado: 'sin-conexion' }])
    // Con el modelo, sí.
    const ok = await encenderGestos({ asegurar: async () => 'lista', alCambiar: () => {}, encender, sigueQueriendo: () => true })
    expect(ok).toBe(true)
    expect(encender).toHaveBeenCalledTimes(1)
  })
})
