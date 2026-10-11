// EL ATRÁS PREDICTIVO -rama atras-predictivo, 11-10-2026-. Pruebas solo de lógica, a través de <App>.
//
// El gesto llega por el plugin AtrasPredictivo -lib/atrasPredictivo.ts-, fingido acá: se capturan los
// oyentes que App registra de verdad -inicio, avance, cancelado, confirmado- y cada hayAdondeVolver que la
// web le manda al nativo. Lo que se ve -cómo se achica, las esquinas, el corrimiento- no se prueba: lo mide
// Claude en el teléfono.
import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({
  oyentes: {} as Record<string, Array<(d?: unknown) => void>>,
  hay: [] as boolean[],
  eventosCapacitor: [] as string[],
  exitApp: null as null | ((...a: unknown[]) => void),
  toggle: null as null | ((...a: unknown[]) => unknown)
}))

vi.mock('@capacitor/app', () => {
  const exitApp = vi.fn()
  const toggleBackButtonHandler = vi.fn().mockResolvedValue(undefined)
  h.exitApp = exitApp
  h.toggle = toggleBackButtonHandler
  return {
    App: {
      addListener: (evento: string) => {
        h.eventosCapacitor.push(evento)
        return Promise.resolve({ remove: () => {} })
      },
      exitApp,
      toggleBackButtonHandler
    }
  }
})

vi.mock('../lib/atrasPredictivo', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/atrasPredictivo')>()
  const plugin = {
    hayAdondeVolver: async ({ hay }: { hay: boolean }) => { h.hay.push(hay) },
    addListener: async (evento: string, cb: (d?: unknown) => void) => {
      ;(h.oyentes[evento] = h.oyentes[evento] || []).push(cb)
      return { remove: async () => {} }
    }
  }
  return { ...real, pluginAtras: () => plugin }
})

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'
import { conAnimacionAtras, hayAdondeVolver } from '../lib/atrasPredictivo'

// Lo que manda el nativo, por el último oyente registrado de cada evento.
async function nativo(evento: 'inicio' | 'avance' | 'cancelado' | 'confirmado', datos?: unknown) {
  const lista = h.oyentes[evento] || []
  expect(lista.length).toBeGreaterThan(0)
  await act(async () => {
    lista[lista.length - 1](datos)
    await Promise.resolve()
  })
}

async function esperar(ms: number) {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)) })
}

const GUION: Guion = {
  id: 'g-atras',
  titulo: 'Guion atrás',
  idioma: 'es',
  creado: Date.now(),
  modificado: Date.now(),
  bloques: [{ id: 'b1', nombre: '', texto: 'Uno dos tres cuatro cinco seis siete ocho nueve diez' }]
}

async function abrirApp(motor?: MotorFake) {
  const repo = new RepositorioMemoria()
  await repo.guardar(GUION)
  render(React.createElement(App, motor ? { motor, repoOverride: repo } : { repoOverride: repo }))
  await esperar(200)
}

async function entrarAlEditor() {
  await act(async () => { fireEvent.click(screen.getByTestId('fila-guion-g-atras')) })
  expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
}

const enElEditor = () => screen.queryByTestId('input-titulo-guion') !== null
const ultimoHay = () => h.hay[h.hay.length - 1]
// ¿La pantalla que contiene a este elemento se está achicando? Se sube por sus ancestros buscando la escala
// del gesto en el estilo: es el marco del editor o la lectura. Solo los ancestros: otros controles de la
// pantalla pueden tener su propio scale. Se lee el atributo a mano: el selector [style*="scale("] no
// encuentra nada en jsdom aunque el atributo lo tenga.
function seAchica(testid: string): boolean {
  let el = screen.getByTestId(testid).parentElement
  while (el) {
    if ((el.getAttribute('style') || '').includes('scale(')) return true
    el = el.parentElement
  }
  return false
}

describe('Atrás predictivo: la lógica, a través de <App>', () => {
  beforeEach(() => {
    h.oyentes = {}
    h.hay = []
    h.eventosCapacitor = []
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('Confirmar ejecuta handleVolverAtras una sola vez, aunque el confirmado llegue repetido', async () => {
    await abrirApp()
    // Un solo camino: el 'backButton' de Capacitor no se escucha y su manejo queda apagado.
    expect(h.eventosCapacitor).not.toContain('backButton')
    expect(h.toggle).toHaveBeenCalledWith({ enabled: false })

    await entrarAlEditor()
    await nativo('inicio', { borde: 'izquierdo' })
    await nativo('avance', { avance: 0.5 })
    await nativo('confirmado')
    await nativo('confirmado')
    // Termina de irse -MS_CHICO- y recién ahí vuelve.
    await esperar(500)

    // Volvió UNA vez: está en la biblioteca. Una segunda vuelta, ya en la biblioteca, habría salido de
    // la app con exitApp.
    expect(enElEditor()).toBe(false)
    expect(screen.getByTestId('fila-guion-g-atras')).toBeTruthy()
    expect(h.exitApp).not.toHaveBeenCalled()
  })

  test('Cancelar no cambia de pantalla', async () => {
    await abrirApp()
    await entrarAlEditor()

    await nativo('inicio', { borde: 'derecho' })
    await nativo('avance', { avance: 0.7 })
    // Control: mientras el dedo desliza, el editor sí está en su marco achicándose.
    expect(seAchica('input-titulo-guion')).toBe(true)
    await nativo('cancelado')
    // Vuelve a su lugar -MS_PANTALLA- y suelta el marco.
    await esperar(600)

    expect(enElEditor()).toBe(true)
    expect(seAchica('input-titulo-guion')).toBe(false)
    expect(h.exitApp).not.toHaveBeenCalled()

    // Y el atrás sigue funcionando después: un confirmado sin deslizar vuelve a la biblioteca.
    await nativo('confirmado')
    await esperar(100)
    expect(enElEditor()).toBe(false)
  })

  test('En la biblioteca sin nada abierto la web llama a hayAdondeVolver(false); en el editor, a hayAdondeVolver(true)', async () => {
    await abrirApp()
    expect(h.hay.length).toBeGreaterThan(0)
    expect(ultimoHay()).toBe(false)

    await entrarAlEditor()
    await esperar(50)
    expect(ultimoHay()).toBe(true)

    await nativo('confirmado')
    await esperar(100)
    expect(enElEditor()).toBe(false)
    expect(ultimoHay()).toBe(false)
  })

  test('Abrir el panel de ajustes en la biblioteca llama a hayAdondeVolver(true); cerrarlo, a false', async () => {
    await abrirApp()
    expect(ultimoHay()).toBe(false)

    await act(async () => { fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca')) })
    expect(screen.getByTestId('panel-ajustes-flotante')).toBeTruthy()
    await esperar(50)
    expect(ultimoHay()).toBe(true)

    // El atrás lo cierra, como siempre, y ya no hay adónde volver.
    await nativo('confirmado')
    await esperar(50)
    expect(screen.queryByTestId('panel-ajustes-flotante')).toBeNull()
    expect(ultimoHay()).toBe(false)
    expect(h.exitApp).not.toHaveBeenCalled()
  })

  test('Durante la toma no hay animación: el gesto no achica nada y volver detiene', async () => {
    const motor = new MotorFake()
    await abrirApp(motor)
    await entrarAlEditor()
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))
      await new Promise((r) => setTimeout(r, 200))
    })
    const contenedor = () => screen.getByTestId('teleprompter-view-container')
    expect(contenedor().getAttribute('data-estado-toma')).toBe('listo')

    // Control: en LISTO el mismo gesto SÍ achica la pantalla. Se cancela y se espera que vuelva.
    await nativo('inicio', { borde: 'izquierdo' })
    await nativo('avance', { avance: 0.4 })
    expect(seAchica('teleprompter-view-container')).toBe(true)
    await nativo('cancelado')
    await esperar(600)
    expect(seAchica('teleprompter-view-container')).toBe(false)

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
      await new Promise((r) => setTimeout(r, 200))
    })
    expect(contenedor().getAttribute('data-estado-toma')).toBe('leyendo')

    await nativo('inicio', { borde: 'izquierdo' })
    await nativo('avance', { avance: 0.4 })
    expect(seAchica('teleprompter-view-container')).toBe(false)

    // Al soltar, como siempre: la toma se detiene y queda en LISTO, sin saltar al origen.
    await nativo('confirmado')
    await esperar(100)
    expect(contenedor().getAttribute('data-estado-toma')).toBe('listo')
    expect(enElEditor()).toBe(false)
  })

  test('La biblioteca está montada debajo del editor, oculta para TalkBack y sin recibir toques', async () => {
    await abrirApp()
    await entrarAlEditor()

    const fila = screen.getByTestId('fila-guion-g-atras')
    const biblioteca = fila.closest('[aria-hidden="true"]') as HTMLElement | null
    expect(biblioteca).not.toBeNull()
    expect(biblioteca!.style.pointerEvents).toBe('none')
  })

  test('La decisión, sin pantalla: hay adónde volver y cuándo se anima', () => {
    const base = { vista: 'biblioteca' as const, algoAbierto: false, tomaAndando: false, movimientoApagado: false }
    expect(hayAdondeVolver(base)).toBe(false)
    expect(hayAdondeVolver({ ...base, algoAbierto: true })).toBe(true)
    expect(hayAdondeVolver({ ...base, vista: 'editor' })).toBe(true)
    expect(hayAdondeVolver({ ...base, vista: 'lectura' })).toBe(true)

    expect(conAnimacionAtras({ ...base, vista: 'editor' })).toBe(true)
    expect(conAnimacionAtras({ ...base, vista: 'lectura' })).toBe(true)
    expect(conAnimacionAtras(base)).toBe(false)
    expect(conAnimacionAtras({ ...base, vista: 'lectura', tomaAndando: true })).toBe(false)
    expect(conAnimacionAtras({ ...base, vista: 'editor', algoAbierto: true })).toBe(false)
    expect(conAnimacionAtras({ ...base, vista: 'editor', movimientoApagado: true })).toBe(false)
  })
})
