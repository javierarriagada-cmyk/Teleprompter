// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: la banda A. Esta rama no va a main ni a Play.

// LO INVISIBLE DE LA BANDA A. Cuatro mecanismos, cada uno comprobado rompiéndolo a propósito -la evidencia va en el
// informe de la vuelta-:
// 1. la secuencia de la autorización: activo, inactivo, reintentar y desistir -siguienteHojaFlotante-;
// 2. el contraste de la pastilla del tiempo, con el valor que de verdad usa flotante.css;
// 3. la misma palabra sigue activa al cambiar la letra o al abrir y cerrar Aa -PaginaFlotante, con la voz-;
// 4. «Ventana flotante» no se guarda como ajuste: vale para esta lectura -a través de <App>-.
// Nada de posiciones ni tamaños en pantalla: eso se mira en las capturas.
import React from 'react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { siguienteHojaFlotante, contrastePastilla, hexARgb, type HojaFlotante, type Rgb } from '../lib/flotante'

const h = vi.hoisted(() => ({
  vistas: [] as { palabra: number; letra: number }[],
  accesibilidad: false
}))

// La lectura se reemplaza por una que anota lo que recibe: aquí importa qué palabra le llega, no cómo se dibuja.
vi.mock('../components/TeleprompterView', async (importOriginal) => {
  const actual: any = await importOriginal()
  const Real = actual.default
  function Espia(p: any) {
    if (p.sobreImagenAjena && p.anclajeZona === 'arriba' && p.margenBandaArribaPx === 52) {
      h.vistas.push({ palabra: p.currentWordIndex, letra: p.fontSize })
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

import { PaginaFlotante } from '../flotante/PaginaFlotante'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion } from '../datos/modelo'
import { VentanaDePrueba } from '../lib/ventanaDePrueba'

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

describe('1. la autorización', () => {
  test('activo va directo a la preparación', () => {
    expect(siguienteHojaFlotante(null, { tipo: 'empezar', accesibilidad: true })).toEqual({ tipo: 'preparacion' })
  })
  test('inactivo: el aviso, Accesibilidad, vuelve inactivo, reintenta y vuelve activo', () => {
    let hoja: HojaFlotante = siguienteHojaFlotante(null, { tipo: 'empezar', accesibilidad: false })
    expect(hoja).toEqual({ tipo: 'autorizacion', inactivo: false, esperando: false })
    hoja = siguienteHojaFlotante(hoja, { tipo: 'abrirAjustes' })
    expect(hoja).toEqual({ tipo: 'autorizacion', inactivo: false, esperando: true })
    hoja = siguienteHojaFlotante(hoja, { tipo: 'volver', accesibilidad: false })
    expect(hoja).toEqual({ tipo: 'autorizacion', inactivo: true, esperando: false })
    // Volver sin haber ido a Ajustes no cambia nada.
    expect(siguienteHojaFlotante(hoja, { tipo: 'volver', accesibilidad: true })).toBe(hoja)
    hoja = siguienteHojaFlotante(hoja, { tipo: 'abrirAjustes' })
    hoja = siguienteHojaFlotante(hoja, { tipo: 'volver', accesibilidad: true })
    expect(hoja).toEqual({ tipo: 'preparacion' })
  })
  test('desistir vuelve a LISTO desde el aviso y desde la nota de inactivo', () => {
    expect(siguienteHojaFlotante({ tipo: 'autorizacion', inactivo: false, esperando: false }, { tipo: 'desistir' })).toBeNull()
    expect(siguienteHojaFlotante({ tipo: 'autorizacion', inactivo: true, esperando: false }, { tipo: 'desistir' })).toBeNull()
  })
})

describe('2. la pastilla del tiempo', () => {
  // El valor que usa la ventana, leído del CSS: si alguien lo aclara, esta prueba lo dice.
  function rgbaDe(css: string, variable: string): { rgb: Rgb; alfa: number } {
    const m = css.match(new RegExp(`${variable}:\\s*rgba\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*([\\d.]+)\\s*\\)`))
    if (!m) throw new Error(`no está ${variable} en flotante.css`)
    return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alfa: Number(m[4]) }
  }
  test('los dígitos blancos dan 4,5 a 1 sobre lo más claro, con la banda negra o blanca y cualquier transparencia', () => {
    const css = readFileSync(resolve(__dirname, '../flotante/flotante.css'), 'utf8')
    const { rgb, alfa } = rgbaDe(css, '--pastilla-fondo-flotante')
    const blanco = hexARgb('#FFFFFF')
    let peor = Infinity
    for (const fondoVentana of [hexARgb('#000000'), hexARgb('#FFFFFF')]) {
      for (let transparencia = 0; transparencia <= 100; transparencia += 5) {
        // La foto más clara posible: blanco. El desenfoque no aclara más que eso.
        peor = Math.min(peor, contrastePastilla({ foto: blanco, fondoVentana, transparencia, fondoPastilla: rgb, alfaPastilla: alfa, texto: blanco }))
      }
    }
    expect(peor).toBeGreaterThanOrEqual(4.5)
  })
})

const guionCorto: Guion = {
  id: 'g-a', titulo: 'Banda', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'hola lee esto en voz alta con calma como si se lo contaras a alguien que te escucha' }]
}

function aLaPagina(m: Record<string, unknown>) {
  act(() => { window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(m) })) })
}

describe('3. la misma palabra al cambiar la letra o al abrir y cerrar Aa', () => {
  const enviados: Record<string, unknown>[] = []
  beforeEach(() => {
    h.vistas = []
    enviados.length = 0
    ;(window as any).sigo = { postMessage: (d: string) => enviados.push(JSON.parse(d)) }
  })
  afterEach(() => {
    cleanup()
    delete (window as any).sigo
  })

  test('la voz deja una palabra activa y ni la letra ni Aa la mueven', async () => {
    render(<PaginaFlotante />)
    aLaPagina({
      tipo: 'contrato', sesion: 1, guion: guionCorto, idioma: 'es-ES', fontSize: 24, tipoFuente: 'sans',
      colorFondo: '#000000', colorLetra: '#FFFFFF', marginPercent: 5, columnaAngosta: false, lineasZona: 3,
      anclajeZona: 'medio', transparencia: 16, tokenInicial: 0, mostrarTiempo: true, idiomaApp: 'es'
    })
    aLaPagina({ tipo: 'geometria', sesion: 1, x: 16, y: 104, w: 358, h: 224, seguro: { l: 0, t: 32, r: 390, b: 825 } })
    aLaPagina({ tipo: 'estado', sesion: 1, cuenta: null, enPausa: false, escuchando: true, silenciado: false })
    await esperar(30)
    aLaPagina({ tipo: 'voz', sesion: 1, evento: 'parcial', json: '{"partial":"hola lee esto en voz alta con calma"}' })
    await esperar(80)
    const antes = h.vistas[h.vistas.length - 1]
    expect(antes.palabra).toBeGreaterThan(2)

    // La letra llega del menú de Aa a través de lo nativo.
    aLaPagina({ tipo: 'ajusteAa', sesion: 1, fontSize: 42 })
    await esperar(30)
    let ahora = h.vistas[h.vistas.length - 1]
    expect(ahora.letra).toBe(42)
    expect(ahora.palabra).toBe(antes.palabra)

    // Abrir y cerrar Aa.
    fireEvent.click(screen.getByTestId('flotante-aa'))
    await esperar(30)
    expect(enviados.some((m) => m.tipo === 'aa' && m.abierto === true)).toBe(true)
    fireEvent.click(screen.getByTestId('flotante-aa'))
    await esperar(30)
    expect(enviados.some((m) => m.tipo === 'aa' && m.abierto === false)).toBe(true)
    ahora = h.vistas[h.vistas.length - 1]
    expect(ahora.palabra).toBe(antes.palabra)

    // Y la voz sigue desde ahí.
    aLaPagina({ tipo: 'voz', sesion: 1, evento: 'parcial', json: '{"partial":"hola lee esto en voz alta con calma como si se lo contaras"}' })
    await esperar(80)
    expect(h.vistas[h.vistas.length - 1].palabra).toBeGreaterThan(antes.palabra)
  })
})

describe('4. la elección no se guarda', () => {
  beforeEach(() => {
    localStorage.clear()
    h.accesibilidad = false
    vi.mocked(VentanaDePrueba.guardarPreferencias).mockClear()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  async function abrirLeer() {
    const repo = new RepositorioMemoria()
    await repo.guardar(guionCorto)
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    return await screen.findByTestId('selector-flotante')
  }

  test('elegida en LISTO vale para esta lectura; al abrir Sigo de nuevo no viene elegida', async () => {
    let selector = await abrirLeer()
    await esperar(50)
    expect(selector.getAttribute('aria-pressed')).toBe('false')
    const guardadoAntes = JSON.stringify({ ...localStorage })
    fireEvent.click(selector)
    await esperar(30)
    expect(screen.getByTestId('selector-flotante').getAttribute('aria-pressed')).toBe('true')
    expect(JSON.stringify({ ...localStorage })).toBe(guardadoAntes)
    expect(VentanaDePrueba.guardarPreferencias).not.toHaveBeenCalled()
    cleanup()
    selector = await abrirLeer()
    await esperar(50)
    expect(selector.getAttribute('aria-pressed')).toBe('false')
  }, 20000)
})
