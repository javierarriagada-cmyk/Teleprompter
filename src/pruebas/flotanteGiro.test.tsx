// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t164u: el giro automático visto desde la página de la banda. Esta rama no va a main ni a Play.

// EL GIRO, DESDE LA PÁGINA. La banda se gira en Android -OrientacionDeVentana, BandaGirada, sus pruebas JUnit-: la
// WebView gira con la banda y la página no se recarga. Lo que la página ve es lo mismo que cuando Chrome gira la
// pantalla: Aa se cierra -'aaCerrado'-, llega la geometría nueva en el marco de quien sostiene el teléfono y cambia el
// ancho. Aquí se comprueba, por el camino de la página, que con eso:
// 1. la palabra activa y el tiempo de la pastilla siguen donde estaban, y la voz sigue desde ahí;
// 2. al reabrir Aa, el menú sale en fila de lado, pegado a Aa y fuera de la banda, con las medidas de la persona.
// Nada de posiciones en pantalla: el giro de verdad se mira en el g86.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({ vistas: [] as { palabra: number }[] }))

vi.mock('../components/TeleprompterView', async (importOriginal) => {
  const actual: any = await importOriginal()
  const Real = actual.default
  function Espia(p: any) {
    if (p.sobreImagenAjena && p.anclajeZona === 'arriba' && p.margenBandaArribaPx === 52) {
      h.vistas.push({ palabra: p.currentWordIndex })
      return null
    }
    return <Real {...p} />
  }
  return { ...actual, default: Espia }
})
vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})

import { PaginaFlotante } from '../flotante/PaginaFlotante'
import { es } from '../textos/es'

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

function aLaPagina(m: Record<string, unknown>) {
  act(() => { window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(m) })) })
}

// Lo que manda VentanaDePrueba al girar el teléfono de lado sobre una Cámara de pie del g86 -BandaGiradaTest-: con el
// lado izquierdo arriba la banda de la persona es 412 × 220 en (367, 8) y el área segura (42, 0, 835, 390).
const DE_PIE = { tipo: 'geometria', sesion: 1, x: 16, y: 104, w: 358, h: 224, seguro: { l: 0, t: 32, r: 390, b: 825 } }
const GIRADA = { tipo: 'geometria', sesion: 1, x: 367, y: 8, w: 412, h: 220, seguro: { l: 42, t: 0, r: 835, b: 390 } }

function cambiarAncho(w: number, alto: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: alto })
    window.dispatchEvent(new Event('resize'))
  })
}

describe('el giro de la banda, desde la página', () => {
  const enviados: Record<string, any>[] = []
  const anchoOriginal = window.innerWidth
  const altoOriginal = window.innerHeight
  beforeEach(() => {
    h.vistas = []
    enviados.length = 0
    ;(window as any).sigo = { postMessage: (d: string) => enviados.push(JSON.parse(d)) }
  })
  afterEach(() => {
    cleanup()
    delete (window as any).sigo
    cambiarAncho(anchoOriginal, altoOriginal)
    vi.restoreAllMocks()
  })

  test('girar leyendo conserva la palabra y el tiempo; Aa reabre en fila junto a su botón', async () => {
    let reloj = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => reloj)
    cambiarAncho(358, 224)
    render(<PaginaFlotante />)
    aLaPagina({
      tipo: 'contrato', sesion: 1, guion: 'hola lee esto en voz alta con calma como si se lo contaras a alguien que te escucha',
      idioma: 'es-ES', fontSize: 24, tipoFuente: 'sans', colorFondo: '#000000', colorLetra: '#FFFFFF', marginPercent: 5,
      columnaAngosta: false, lineasZona: 3, anclajeZona: 'medio', transparencia: 16, tokenInicial: 0, mostrarTiempo: true,
      idiomaApp: 'es', limite: null, leidosSeg: 0
    })
    aLaPagina(DE_PIE)
    aLaPagina({ tipo: 'estado', sesion: 1, cuenta: null, enPausa: false, escuchando: true })
    await esperar(30)
    aLaPagina({ tipo: 'voz', sesion: 1, evento: 'parcial', json: '{"partial":"hola lee esto en voz alta con calma"}' })
    reloj = 13000
    await esperar(300)
    const antes = h.vistas[h.vistas.length - 1].palabra
    expect(antes).toBeGreaterThan(2)
    const tiempo = () => (screen.getByLabelText(es.tiempoTranscurrido).textContent || '').slice(0, 5)
    expect(tiempo()).toBe('00:12')

    // Aa abierto al girar: Android lo retira y avisa -el cierre previsto-.
    const aa = screen.getByTestId('flotante-aa')
    // La caja de Aa en la página: arriba a la derecha de la barra, 48 × 48 -BandaGiradaTest.CONTROLES-.
    vi.spyOn(aa, 'getBoundingClientRect').mockImplementation(() => {
      const w = window.innerWidth
      return { left: w - 96, top: 0, width: 48, height: 48, right: w - 48, bottom: 48, x: w - 96, y: 0, toJSON: () => ({}) } as DOMRect
    })
    fireEvent.click(aa)
    await esperar(30)
    expect(enviados.filter((m) => m.tipo === 'aa' && m.abierto === true).pop()?.forma).toBe('columna')

    // EL GIRO: lo que manda VentanaDePrueba, en este orden -BandaGirada.alCambiarPantalla y encuadrar-.
    aLaPagina({ tipo: 'aaCerrado', sesion: 1, motivo: 'giro' })
    cambiarAncho(412, 220)
    aLaPagina(GIRADA)
    reloj = 15000
    await esperar(300)
    expect(aa.getAttribute('aria-pressed')).toBe('false')
    expect(h.vistas[h.vistas.length - 1].palabra).toBe(antes)
    expect(tiempo()).toBe('00:14')

    // Aa de nuevo: fila de lado, pegada a la banda bajo Aa, dentro del área segura de la persona y fuera de la banda.
    enviados.length = 0
    fireEvent.click(aa)
    await esperar(30)
    const menu = enviados.filter((m) => m.tipo === 'aa' && m.abierto === true).pop()!
    expect(menu.forma).toBe('fila')
    expect(menu.lado).toBe('abajo')
    expect(menu.y).toBe(GIRADA.y + GIRADA.h + 6)
    expect(menu.x + menu.w).toBeGreaterThanOrEqual(GIRADA.x + 412 - 96)
    expect(menu.x).toBeLessThanOrEqual(GIRADA.x + 412 - 96)
    expect(menu.x).toBeGreaterThanOrEqual(GIRADA.seguro.l + 4)
    expect(menu.x + menu.w).toBeLessThanOrEqual(GIRADA.seguro.r - 4)

    // Y la voz sigue desde la misma palabra.
    aLaPagina({ tipo: 'voz', sesion: 1, evento: 'parcial', json: '{"partial":"hola lee esto en voz alta con calma como si se lo contaras"}' })
    await esperar(80)
    expect(h.vistas[h.vistas.length - 1].palabra).toBeGreaterThan(antes)
  })

  test('girar en pausa la deja en pausa y el tiempo no corre', async () => {
    let reloj = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => reloj)
    cambiarAncho(358, 224)
    render(<PaginaFlotante />)
    aLaPagina({
      tipo: 'contrato', sesion: 1, guion: 'hola lee esto en voz alta con calma', idioma: 'es-ES', fontSize: 24,
      tipoFuente: 'sans', colorFondo: '#000000', colorLetra: '#FFFFFF', marginPercent: 5, columnaAngosta: false,
      lineasZona: 3, anclajeZona: 'medio', transparencia: 16, tokenInicial: 0, mostrarTiempo: true, idiomaApp: 'es',
      limite: null, leidosSeg: 0
    })
    aLaPagina(DE_PIE)
    aLaPagina({ tipo: 'estado', sesion: 1, cuenta: null, enPausa: false, escuchando: true })
    reloj = 6000
    aLaPagina({ tipo: 'estado', sesion: 1, cuenta: null, enPausa: true, escuchando: false })
    await esperar(30)
    cambiarAncho(412, 220)
    aLaPagina(GIRADA)
    reloj = 20000
    await esperar(300)
    expect((screen.getByLabelText(es.tiempoTranscurrido).textContent || '').slice(0, 5)).toBe('00:05')
    expect(screen.getByRole('button', { name: es.seguir })).toBeTruthy()
  })
})
