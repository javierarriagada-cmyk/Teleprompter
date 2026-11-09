// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: la sesión la manda Android. Esta rama no va a main ni a Play.

// LA VENTANA COMPLETA, SIN DEPENDER DE QUE SIGO ESTÉ DESPIERTO. Lo de Android -la pausa, la cuenta 3-2-1, el límite- se
// prueba en SesionVentanaTest -JUnit-. Aquí lo de la web, cada mecanismo comprobado rompiéndolo a propósito -la
// evidencia va en el informe de la vuelta-:
// 1. con la ventana abierta, la página de Sigo no hace caso a 'pausa' ni 'seguir' de la ventana;
// 2. al volver toma el estado de Android -la palabra y el límite, que abre la oferta-;
// 3. el selector está en el LISTO de Leer y en el de Grabar, y desde Grabar abre la ventana con la cámara de Sigo
//    apagada y sin toma;
// 4. la ventana muestra el aviso y el límite con sus claves, en es, en y pt.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({
  oyente: null as null | ((a: { tipo: string; sesion: number; token?: number }) => void),
  encendida: false,
  camaraAlAbrir: null as null | boolean,
  orden: [] as string[],
  estadoSesion: { hay: false } as Record<string, unknown>
}))

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))
vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('../lib/camara', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    camaraEncendida: () => h.encendida,
    ladoActual: () => 'frontal',
    encenderCamara: vi.fn(async () => { h.encendida = true; h.orden.push('encender') }),
    apagarCamara: vi.fn(async () => { h.encendida = false; h.orden.push('apagar') }),
    empezarGrabacionVideo: vi.fn(async () => { h.orden.push('grabar') }),
    grabacionNativaEnCurso: () => false,
    cortarGrabacionVideo: async () => null,
    errorDelUltimoCorte: () => null
  }
})
vi.mock('../lib/oferta', async (importOriginal) => {
  const actual: any = await importOriginal()
  return { ...actual, abrirOferta: vi.fn(async () => {}) }
})
vi.mock('../lib/flotante', async (importOriginal) => {
  const actual: any = await importOriginal()
  return { ...actual, tokenAlVolver: vi.fn(actual.tokenAlVolver) }
})
vi.mock('../lib/ventanaDePrueba', () => ({
  VentanaDePrueba: {
    addListener: vi.fn(async (_e: string, f: any) => { h.oyente = f; return { remove: async () => {} } }),
    estado: vi.fn(async () => ({ accesibilidad: true })),
    preferencias: vi.fn(async () => ({ transparencia: 16, fontSize: 24, anchoVentana: 358 })),
    guardarPreferencias: vi.fn(async () => {}),
    abrirAjustesAccesibilidad: vi.fn(async () => ({ pagina: 'accesibilidad' })),
    abrir: vi.fn(async () => { h.camaraAlAbrir = h.encendida; h.orden.push('abrir'); return { sesion: 1 } }),
    enviar: vi.fn(async () => {}),
    cerrar: vi.fn(async () => {}),
    estadoSesion: vi.fn(async () => h.estadoSesion)
  }
}))

import App from '../App'
import { PaginaFlotante } from '../flotante/PaginaFlotante'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion } from '../datos/modelo'
import { VentanaDePrueba } from '../lib/ventanaDePrueba'
import { abrirOferta } from '../lib/oferta'
import { tokenAlVolver } from '../lib/flotante'
import { empezarGrabacionVideo, apagarCamara } from '../lib/camara'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

const guion: Guion = {
  id: 'g-v', titulo: 'Ventana', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'hola lee esto en voz alta con calma como si se lo contaras a alguien que te escucha' }]
}

class MotorEspia extends MotorFake {
  iniciados = 0
  detenidos = 0
  async iniciar(o: { lang: string }) { this.iniciados++; return super.iniciar(o) }
  async detener() { this.detenidos++ }
}

async function abrirListo(tarjeta: 'btn-leer-tarjeta' | 'btn-grabar-tarjeta', motor = new MotorEspia()) {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  render(<App repoOverride={repo} motor={motor} />)
  fireEvent.click(await screen.findByTestId(tarjeta))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(80)
  return motor
}

// Elegir la ventana, Empezar -abre la preparación- y el Empezar de la preparación; después la cuenta de Sigo.
async function abrirLaVentana() {
  fireEvent.click(await screen.findByTestId('selector-flotante'))
  await esperar(30)
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await esperar(80)
  const hoja = document.querySelector('.hoja-flotante-preparacion') as HTMLElement
  expect(hoja).not.toBeNull()
  fireEvent.click(within(hoja).getByRole('button', { name: es.empezar }))
  // La cuenta de Empezar, de a pasos: un solo act largo juntaría el 3, 2, 1 en un solo dibujo.
  for (let i = 0; i < 8; i++) await esperar(450)
}

function enviados(tipo: string) {
  return vi.mocked(VentanaDePrueba.enviar).mock.calls.map((c) => c[0] as Record<string, unknown>).filter((m) => m.tipo === tipo)
}

describe('la página de Sigo con la ventana abierta', () => {
  beforeEach(() => {
    localStorage.clear()
    h.oyente = null
    h.encendida = false
    h.camaraAlAbrir = null
    h.orden = []
    h.estadoSesion = { hay: false }
    vi.mocked(VentanaDePrueba.enviar).mockClear()
    vi.mocked(VentanaDePrueba.abrir).mockClear()
    vi.mocked(VentanaDePrueba.estadoSesion).mockClear()
    vi.mocked(abrirOferta).mockClear()
    vi.mocked(tokenAlVolver).mockClear()
    vi.mocked(empezarGrabacionVideo).mockClear()
    vi.mocked(apagarCamara).mockClear()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('1. no hace caso a pausa ni seguir de la ventana; el contrato lleva el límite de lectura', async () => {
    const motor = await abrirListo('btn-leer-tarjeta')
    await abrirLaVentana()
    expect(VentanaDePrueba.abrir).toHaveBeenCalledTimes(1)
    const [contrato] = enviados('contrato')
    expect(contrato.limite).toEqual({ lecturaSeg: 240, avisoAntesSeg: 60 })
    expect(contrato.leidosSeg).toBe(0)
    const iniciados = motor.iniciados
    const detenidos = motor.detenidos
    const estados = enviados('estado').length
    act(() => { h.oyente!({ tipo: 'pausa', sesion: 1, token: 2 }) })
    await esperar(200)
    act(() => { h.oyente!({ tipo: 'seguir', sesion: 1, token: 2 }) })
    await esperar(3600)
    act(() => { h.oyente!({ tipo: 'alternar', sesion: 1, token: 2 }) })
    await esperar(200)
    expect(motor.detenidos).toBe(detenidos)
    expect(motor.iniciados).toBe(iniciados)
    // Y después de la cuenta de Empezar, Sigo no le manda estados a la ventana.
    expect(enviados('estado').length).toBe(estados)
  }, 30000)

  test('1b. después de la cuenta de Empezar, Sigo no le manda estados a la ventana aunque cambie el suyo', async () => {
    await abrirListo('btn-leer-tarjeta')
    await abrirLaVentana()
    const estados = enviados('estado')
    // Los de la cuenta de Empezar sí pasaron, y el último es el fin de la cuenta.
    expect(estados.some((m) => m.cuenta === 3)).toBe(true)
    expect(estados.at(-1)?.cuenta).toBeNull()
    // La pausa propia de Sigo -su botón, detrás de la ventana- cambia su estado: a la ventana no le llega.
    fireEvent.click(screen.getByTestId('teleprompter-view-container'))
    await act(async () => { fireEvent.click(await screen.findByTestId('btn-pausa-lectura')) })
    await esperar(200)
    expect(enviados('estado').length).toBe(estados.length)
  }, 30000)

  test('2. al volver toma el estado de Android: la palabra y, con el límite, la oferta', async () => {
    await abrirListo('btn-leer-tarjeta')
    await abrirLaVentana()
    h.estadoSesion = { hay: true, sesion: 1, abierta: false, enPausa: true, leidosSeg: 240, llegoAlLimite: true, token: 7 }
    act(() => { h.oyente!({ tipo: 'volver', sesion: 1, token: 2 }) })
    await esperar(300)
    expect(VentanaDePrueba.estadoSesion).toHaveBeenCalledTimes(1)
    expect(vi.mocked(tokenAlVolver).mock.calls.at(-1)?.[0]).toBe(7)
    expect(abrirOferta).toHaveBeenCalledWith('limiteLectura')
    // En LISTO de Leer.
    expect(screen.getByTestId('btn-empezar-toma')).toBeTruthy()
    expect(document.querySelector('.punto-grabar')).toBeNull()
  }, 30000)

  test('2b. sin límite, la vuelta no abre la oferta', async () => {
    await abrirListo('btn-leer-tarjeta')
    await abrirLaVentana()
    h.estadoSesion = { hay: true, sesion: 1, abierta: false, enPausa: false, leidosSeg: 30, llegoAlLimite: false, token: 4 }
    act(() => { h.oyente!({ tipo: 'volver', sesion: 1, token: 2 }) })
    await esperar(300)
    expect(vi.mocked(tokenAlVolver).mock.calls.at(-1)?.[0]).toBe(4)
    expect(abrirOferta).not.toHaveBeenCalled()
  }, 30000)

  test('3. el selector está en Leer y en Grabar; desde Grabar abre la ventana sin la cámara de Sigo ni toma', async () => {
    await abrirListo('btn-leer-tarjeta')
    expect(screen.getAllByTestId('selector-flotante')).toHaveLength(1)
    cleanup()
    await abrirListo('btn-grabar-tarjeta')
    expect(h.encendida).toBe(true)
    expect(document.querySelector('.punto-grabar')).not.toBeNull()
    expect(screen.getAllByTestId('selector-flotante')).toHaveLength(1)
    await abrirLaVentana()
    expect(VentanaDePrueba.abrir).toHaveBeenCalledTimes(1)
    // La cámara se apagó antes de abrir la ventana, y no hubo toma.
    expect(h.camaraAlAbrir).toBe(false)
    expect(h.orden.indexOf('apagar')).toBeLessThan(h.orden.indexOf('abrir'))
    expect(empezarGrabacionVideo).not.toHaveBeenCalled()
    // Lleva el límite de lectura, no el de grabación.
    expect(enviados('contrato')[0].limite).toEqual({ lecturaSeg: 240, avisoAntesSeg: 60 })
    // Al volver, el LISTO de Grabar con su cámara.
    h.estadoSesion = { hay: true, sesion: 1, abierta: false, enPausa: false, leidosSeg: 5, llegoAlLimite: false, token: 1 }
    act(() => { h.oyente!({ tipo: 'volver', sesion: 1, token: 1 }) })
    await esperar(300)
    expect(screen.getByTestId('btn-empezar-toma')).toBeTruthy()
    expect(document.querySelector('.punto-grabar')).not.toBeNull()
    expect(h.encendida).toBe(true)
    expect(empezarGrabacionVideo).not.toHaveBeenCalled()
  }, 30000)
})

describe('4. la ventana muestra el aviso y el límite con sus claves', () => {
  const salientes: Record<string, unknown>[] = []
  function aLaPagina(m: Record<string, unknown>) {
    act(() => { window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(m) })) })
  }
  beforeEach(() => {
    salientes.length = 0
    ;(window as any).sigo = { postMessage: (d: string) => salientes.push(JSON.parse(d)) }
  })
  afterEach(() => {
    cleanup()
    delete (window as any).sigo
  })

  for (const [idioma, textos] of [['es', es], ['en', en], ['pt', pt]] as const) {
    test(`en ${idioma}`, async () => {
      render(<PaginaFlotante />)
      aLaPagina({
        tipo: 'contrato', sesion: 1, guion, idioma: 'es-ES', fontSize: 24, tipoFuente: 'sans',
        colorFondo: '#000000', colorLetra: '#FFFFFF', marginPercent: 5, columnaAngosta: false, lineasZona: 3,
        anclajeZona: 'medio', transparencia: 16, tokenInicial: 0, mostrarTiempo: true, idiomaApp: idioma,
        limite: { lecturaSeg: 240, avisoAntesSeg: 60 }, leidosSeg: 0
      })
      aLaPagina({ tipo: 'estado', sesion: 1, cuenta: null, enPausa: false, escuchando: true })
      await esperar(30)
      expect(screen.queryByTestId('flotante-aviso-limite')).toBeNull()
      aLaPagina({ tipo: 'limite', sesion: 1, fase: 'aviso' })
      await esperar(30)
      const aviso = screen.getByTestId('flotante-aviso-limite')
      expect(aviso.textContent).toContain(textos.avisoQuedaMinutoVoz)
      expect(aviso.textContent).toContain(textos.avisoQuedaMinutoVozNota)

      aLaPagina({ tipo: 'limite', sesion: 1, fase: 'limite' })
      aLaPagina({ tipo: 'estado', sesion: 1, cuenta: null, enPausa: true, escuchando: false })
      await esperar(30)
      expect(screen.queryByTestId('flotante-aviso-limite')).toBeNull()
      const limite = screen.getByTestId('flotante-limite')
      expect(limite.textContent).toContain(textos.limiteLectura)
      fireEvent.click(within(limite).getByRole('button', { name: textos.avisoLimiteVerSigoMas }))
      expect(salientes.some((m) => m.tipo === 'verSigoMas' && m.sesion === 1)).toBe(true)

      // Seguir: Android lo quita al empezar la cuenta.
      aLaPagina({ tipo: 'limite', sesion: 1, fase: 'ninguno' })
      await esperar(30)
      expect(screen.queryByTestId('flotante-limite')).toBeNull()
    })
  }

  test('el aviso se va solo a los 8 s, como en Leer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<PaginaFlotante />)
      aLaPagina({
        tipo: 'contrato', sesion: 1, guion, idioma: 'es-ES', fontSize: 24, tipoFuente: 'sans',
        colorFondo: '#000000', colorLetra: '#FFFFFF', marginPercent: 5, columnaAngosta: false, lineasZona: 3,
        anclajeZona: 'medio', transparencia: 16, tokenInicial: 0, mostrarTiempo: true, idiomaApp: 'es'
      })
      aLaPagina({ tipo: 'limite', sesion: 1, fase: 'aviso' })
      await act(async () => { vi.advanceTimersByTime(7900) })
      expect(screen.getByTestId('flotante-aviso-limite')).toBeTruthy()
      await act(async () => { vi.advanceTimersByTime(200) })
      expect(screen.queryByTestId('flotante-aviso-limite')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
