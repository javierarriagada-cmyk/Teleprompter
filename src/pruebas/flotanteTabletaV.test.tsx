// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: corrección de la banda A. Esta rama no va a main ni a Play.

// «VENTANA FLOTANTE» EN LA TABLETA VERTICAL. El dock de la tableta vertical -tab-dock- dibujaba las fichas y Empezar
// pero no el selector. El recorrido entero a través de <App>: Leer → LISTO → Con la voz, el selector en el dock junto a
// las fichas y Empezar, y Empezar abre la preparación si Accesibilidad está activa o el aviso si falta. Si se retira el
// selector del dock de la tableta, esta prueba falla -la evidencia va en el informe de la corrección-. Nada de posiciones
// en pantalla: eso se mira en el navegador.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({ accesibilidad: false }))

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('../lib/ventanaDePrueba', () => ({
  VentanaDePrueba: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
    estado: vi.fn(async () => ({ accesibilidad: h.accesibilidad })),
    preferencias: vi.fn(async () => ({ transparencia: 16, fontSize: 24, anchoVentana: 358 })),
    guardarPreferencias: vi.fn(async () => {}),
    abrirAjustesAccesibilidad: vi.fn(async () => ({ pagina: 'accesibilidad' })),
    abrir: vi.fn(async () => ({ sesion: 1 })),
    enviar: vi.fn(async () => {}),
    cerrar: vi.fn(async () => {})
  }
}))

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { olvidarEstadoVelocidad } from '../lib/velocidadFija'

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

// La tableta vertical de la hoja de la tarea 83 -820 x 1180-: se finge matchMedia con ese tamaño, como en tarea83.test.
const matchMediaOriginal = window.matchMedia
function fingirTabletaVertical(ancho = 820, alto = 1180) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query.split(' and ').every((parte) => {
        const m = parte.trim().match(/^\(([a-z-]+):\s*([a-z0-9.]+?)(px)?\)$/)
        if (!m) return false
        const n = parseFloat(m[2])
        if (m[1] === 'min-width') return ancho >= n
        if (m[1] === 'max-width') return ancho <= n
        if (m[1] === 'min-height') return alto >= n
        if (m[1] === 'max-height') return alto <= n
        if (m[1] === 'orientation') return m[2] === (alto >= ancho ? 'portrait' : 'landscape')
        return false
      })
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any
}

async function abrirLeerEnLaTableta() {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-tv', titulo: 'Tableta', idioma: 'es', creado: 0, modificado: 0, archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'hola lee esto en voz alta con calma sobre la cámara de la tableta' }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(50)
  expect(document.querySelector('.layout-tab-v')).not.toBeNull()
}

// LISTO con «Velocidad fija» guardada: el selector no está -su condición de siempre-. Con la voz aparece en el dock.
async function elegirConLaVoz() {
  const dock = screen.getByTestId('tab-dock')
  expect(screen.queryByTestId('selector-flotante')).toBeNull()
  fireEvent.click(within(dock).getByTestId('ficha-modo-lectura'))
  fireEvent.click(await screen.findByTestId('btn-menu-modo-voz'))
  await esperar(30)
  // Cerrar el panel de la ficha, como un toque fuera.
  const capa = screen.queryByTestId('capa-panel-ficha')
  if (capa) fireEvent.click(capa)
  await esperar(30)
  const selector = within(screen.getByTestId('tab-dock')).getByTestId('selector-flotante')
  // Una sola vez, y las fichas y Empezar siguen en el dock.
  expect(screen.getAllByTestId('selector-flotante')).toHaveLength(1)
  expect(within(screen.getByTestId('tab-dock')).getByTestId('ficha-modo-lectura')).toBeTruthy()
  expect(within(screen.getByTestId('tab-dock')).getByTestId('btn-empezar-toma')).toBeTruthy()
  return selector
}

describe('«Ventana flotante» en la tableta vertical', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('sigo_modo_lectura', 'fija')
    olvidarEstadoVelocidad()
    fingirTabletaVertical()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    window.matchMedia = matchMediaOriginal
    vi.restoreAllMocks()
    localStorage.clear()
    olvidarEstadoVelocidad()
  })

  test('con Accesibilidad activa, elegirla y Empezar abre la preparación', async () => {
    h.accesibilidad = true
    await abrirLeerEnLaTableta()
    const selector = await elegirConLaVoz()
    fireEvent.click(selector)
    await esperar(30)
    expect(screen.getByTestId('selector-flotante').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(80)
    expect(document.querySelector('.hoja-flotante-preparacion')).not.toBeNull()
    expect(document.querySelector('.hoja-flotante-autorizacion')).toBeNull()
  }, 20000)

  test('sin Accesibilidad, elegirla y Empezar abre el aviso', async () => {
    h.accesibilidad = false
    await abrirLeerEnLaTableta()
    const selector = await elegirConLaVoz()
    fireEvent.click(selector)
    await esperar(30)
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(80)
    expect(document.querySelector('.hoja-flotante-autorizacion')).not.toBeNull()
    expect(document.querySelector('.hoja-flotante-preparacion')).toBeNull()
  }, 20000)
})
