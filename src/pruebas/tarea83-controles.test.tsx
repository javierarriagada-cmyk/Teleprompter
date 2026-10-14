// TAREA 83, PARTE B -04-10-2026-: LOS CONTROLES AL LEER Y GRABAR, y LS-M2 -otra app toma la cámara o el
// micrófono-, a través de <App>. Los mocks son los de tarea88-app: la cámara y el disco fingidos, la toma
// -lib/tomaVideo- de verdad, así lo que se mira es el sidecar que escribe. El plugin CamaraNativa también
// va fingido: guarda el oyente de 'recursoPerdido' para que la prueba dispare la pérdida como lo haría el
// nativo -CamaraNativaPlugin.vigilarRecursos-.
//
// jsdom no tiene diseño: la disposición se mira por el orden en el DOM dentro de la fila de la toma
// -data-testid fila-toma- y por su clase en-columna de lado. Las medidas reales están en las láminas
// -docs/pantallas/tarea83/controles-*.png y controles-medidas.json-.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import fs from 'node:fs'
import path from 'node:path'

const h = vi.hoisted(() => ({
  escritos: new Map<string, string>(),
  lado: 'frontal' as 'frontal' | 'trasera',
  encendida: false,
  oyente: null as null | ((d: unknown) => void),
  vigilando: 0,
  soltados: 0
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
  // El plugin fingido: lo que no se nombra aquí responde con una promesa vacía.
  const CamaraNativa = new Proxy({} as any, {
    get(_o, nombre: string) {
      if (nombre === 'then') return undefined
      if (nombre === 'addListener') {
        return async (evento: string, cb: (d: unknown) => void) => {
          if (evento === 'recursoPerdido') h.oyente = cb
          return { remove: async () => { if (h.oyente === cb) h.oyente = null } }
        }
      }
      if (nombre === 'vigilarRecursos') return async () => { h.vigilando++; return { camara: true, microfono: true } }
      if (nombre === 'soltarRecursos') return async () => { h.soltados++ }
      return async () => ({})
    }
  })
  return {
    ...actual,
    CamaraNativa,
    camaraEncendida: () => h.encendida,
    ladoActual: () => h.lado,
    encenderCamara: async (lado: 'frontal' | 'trasera') => { h.lado = lado; h.encendida = true },
    apagarCamara: async () => { h.encendida = false },
    empezarGrabacionVideo: async () => {},
    grabacionNativaEnCurso: () => true,
    cortarGrabacionVideo: async () => 'file:///plugin/video_1.mp4',
    errorDelUltimoCorte: () => null
  }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    juntos: (a: string, b: string) => `${a}/${b}`,
    escribirTexto: vi.fn(async (ruta: string, texto: string) => { h.escritos.set(ruta, texto) }),
    leerTexto: async () => { throw new Error('no existe') },
    listarDirectorio: async () => [],
    borrarArchivo: async () => {},
    buscarMp4Recientes: async () => [],
    moverArchivo: async (_de: string, a: string) => a,
    analizarVideo: async () => ({ duracionMs: 20_000, bytes: 5_000_000, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1080, altoPx: 1920, rotacion: 0 }),
    bytesDe: async () => 5_000_000,
    extraerMiniatura: async (_r: string, destino: string) => destino,
    obtenerEspacioLibre: async () => null
  }
})
vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return { ...actual, recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar() }
})

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion } from '../datos/modelo'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { fijarIdioma } from '../lib/idioma'
import { CONSULTA_TEL_H, CONSULTA_TAB_H } from '../hooks/useLayout'
import { avisoDePerdida, leerPerdida } from '../lib/recursosToma'

const guion: Guion = {
  id: 'g-83b', titulo: 'Controles', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'si me vieras por dentro sabrías que no duermo nunca' }]
}

const matchMediaOriginal = window.matchMedia
// De lado: una sola consulta de useLayout responde que sí -tel-h o tab-h-.
function fingirDeLado(consulta: string) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === consulta,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any
}

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

async function abrir(puerta: 'leer' | 'grabar') {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId(puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(50)
}
async function empezarYMostrarControles() {
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await esperar(3200)
  fireEvent.click(screen.getByTestId('teleprompter-view-container'))
  await screen.findByTestId('btn-pausa-lectura')
}
async function tocarPausa() {
  await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
  await esperar(30)
}
// Los testid de los botones de la fila, en el orden del DOM.
function ordenDeLaFila(): string[] {
  const fila = screen.getByTestId('fila-toma')
  return Array.from(fila.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid') || '')
}
function sidecar(): any {
  const ruta = [...h.escritos.keys()].find((k) => k.endsWith('.json'))
  return ruta ? JSON.parse(h.escritos.get(ruta)!) : null
}
async function perder(recurso: 'camara' | 'microfono') {
  await waitFor(() => expect(h.oyente).not.toBeNull())
  await act(async () => { h.oyente!({ recurso, motivo: 'prueba' }) })
  await esperar(100)
}

describe('Tarea 83, parte B: los controles al leer y grabar, a través de <App>', () => {
  beforeEach(() => {
    localStorage.clear()
    h.escritos.clear()
    h.encendida = false
    h.oyente = null
    h.vigilando = 0
    h.soltados = 0
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.matchMedia = matchMediaOriginal
    fijarIdioma('es')
  })

  test('PAUSA ESTÁ AL LADO DE PARAR, EN LA MISMA FILA', async () => {
    await abrir('grabar')
    await empezarYMostrarControles()
    const fila = screen.getByTestId('fila-toma')
    expect(fila.classList.contains('en-columna')).toBe(false)
    // Pausa primero -a la izquierda-, Parar después; grabando, el tacho todavía no está.
    expect(ordenDeLaFila()).toEqual(['btn-pausa-lectura', 'btn-parar-lectura'])
    expect(screen.getByTestId('btn-pausa-lectura').classList.contains('btn-flotante-56')).toBe(true)
    expect(screen.getByTestId('btn-parar-lectura').classList.contains('btn-flotante-72')).toBe(true)
    expect(screen.getByTestId('btn-pausa-lectura').getAttribute('aria-label')).toBe(es.pausa)
    expect(screen.queryByTestId('btn-descartar-toma')).toBeNull()
  })

  test('EN PAUSA, EL MISMO BOTÓN ES SEGUIR Y EL TACHO APARECE AL OTRO LADO', async () => {
    await abrir('grabar')
    await empezarYMostrarControles()
    const boton = screen.getByTestId('btn-pausa-lectura')
    await tocarPausa()
    // El mismo nodo, ahora Seguir.
    expect(screen.getByTestId('btn-pausa-lectura')).toBe(boton)
    expect(boton.getAttribute('aria-label')).toBe(es.seguir)
    // Seguir, Parar, tacho: el tacho a la derecha de Parar, en la misma fila, a 56.
    expect(ordenDeLaFila()).toEqual(['btn-pausa-lectura', 'btn-parar-lectura', 'btn-descartar-toma'])
    const tacho = screen.getByTestId('btn-descartar-toma')
    expect(tacho.classList.contains('btn-flotante-56')).toBe(true)
    // Su «¿Descartar?» de siempre sigue ahí, adaptado al 56: el primer toque pregunta, no descarta.
    /* Antes: expect(screen.getByTestId('btn-descartar-toma').textContent).toMatch(/¿Seguro\?/) */
    await act(async () => { fireEvent.click(tacho) })
    expect(screen.getByTestId('btn-descartar-toma').textContent).toMatch(/¿Descartar\?/)
  })

  test('EN LEER, LA MISMA FILA SIN TACHO NI EN PAUSA', async () => {
    await abrir('leer')
    await empezarYMostrarControles()
    await tocarPausa()
    expect(screen.getByTestId('btn-pausa-lectura').getAttribute('aria-label')).toBe(es.seguir)
    expect(ordenDeLaFila()).toEqual(['btn-pausa-lectura', 'btn-parar-lectura'])
    expect(screen.queryByTestId('btn-descartar-toma')).toBeNull()
  })

  test.each([
    ['teléfono', CONSULTA_TEL_H],
    ['tableta', CONSULTA_TAB_H]
  ])('DE LADO, PAUSA VA ENCIMA DE PARAR EN LA COLUMNA -%s-', async (_nombre, consulta) => {
    fingirDeLado(consulta)
    await abrir('grabar')
    await empezarYMostrarControles()
    expect(screen.getByTestId('fila-toma').classList.contains('en-columna')).toBe(true)
    expect(ordenDeLaFila()).toEqual(['btn-pausa-lectura', 'btn-parar-lectura'])
    await tocarPausa()
    // Arriba Seguir, al medio Parar, abajo el tacho.
    expect(ordenDeLaFila()).toEqual(['btn-pausa-lectura', 'btn-parar-lectura', 'btn-descartar-toma'])
  })
})

describe('Tarea 83, parte B: LS-M2, otra app toma la cámara o el micrófono', () => {
  beforeEach(() => {
    localStorage.clear()
    h.escritos.clear()
    h.encendida = false
    h.oyente = null
    h.vigilando = 0
    h.soltados = 0
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    fijarIdioma('es')
  })

  test('recursosToma: cada recurso tiene su aviso y lo que no es una pérdida se ignora', () => {
    expect(avisoDePerdida('camara')).toBe('tomaCortadaCamara')
    expect(avisoDePerdida('microfono')).toBe('tomaCortadaMicrofono')
    expect(leerPerdida({ recurso: 'camara', motivo: 'x' })).toEqual({ recurso: 'camara', motivo: 'x' })
    expect(leerPerdida({ recurso: 'microfono' })).toEqual({ recurso: 'microfono', motivo: '' })
    expect(leerPerdida({ recurso: 'pantalla' })).toBeNull()
    expect(leerPerdida(null)).toBeNull()
  })

  test('SE VIGILA SOLO MIENTRAS LA TOMA DE GRABAR ANDA', async () => {
    await abrir('grabar')
    expect(h.vigilando).toBe(0)
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(3200)
    expect(h.vigilando).toBe(1)
    fireEvent.click(screen.getByTestId('teleprompter-view-container'))
    await act(async () => { fireEvent.click(await screen.findByTestId('btn-parar-lectura')) })
    await esperar(200)
    expect(h.soltados).toBeGreaterThanOrEqual(1)
  })

  test('SI OTRA APP TOMA LA CÁMARA, LA TOMA SE CORTA Y VUELVE A LISTO', async () => {
    await abrir('grabar')
    await empezarYMostrarControles()
    await perder('camara')
    // Volvió a LISTO: Empezar de nuevo, sin los controles de la toma.
    expect(await screen.findByTestId('btn-empezar-toma')).toBeTruthy()
    expect(screen.queryByTestId('btn-parar-lectura')).toBeNull()
  })

  test('LA TOMA CORTADA QUEDA GUARDADA COMO INCOMPLETA Y RECUPERABLE', async () => {
    await abrir('grabar')
    await empezarYMostrarControles()
    await perder('microfono')
    const s = sidecar()
    expect(s).not.toBeNull()
    expect(s.estado).toBe('incompleta')
    // El video queda donde lo deja el corte de segundo plano -.mp4.part-, que es lo que se recupera.
    expect(String(s.rutaMp4 || '')).toMatch(/\.mp4\.part$/)
  })

  test('SALE UN AVISO QUE DICE QUÉ PASÓ -en español-', async () => {
    await abrir('grabar')
    await empezarYMostrarControles()
    await perder('camara')
    expect((await screen.findByTestId('aviso-flotante')).textContent).toContain(es.tomaCortadaCamara)
  })

  test('SALE UN AVISO QUE DICE QUÉ PASÓ -en inglés-', async () => {
    fijarIdioma('en')
    await abrir('grabar')
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(3200)
    await perder('microfono')
    expect((await screen.findByTestId('aviso-flotante')).textContent).toContain(en.tomaCortadaMicrofono)
  })

  test('SIN TOMA EN CURSO NO SE VIGILA NI PASA NADA', async () => {
    await abrir('grabar')
    await esperar(100)
    expect(h.oyente).toBeNull()
    expect(sidecar()).toBeNull()
    expect(screen.queryByTestId('aviso-flotante')).toBeNull()
  })
})

// CORRECCIONES FINALES -2026-10-05-: el halo de Grabar en LISTO y la pastilla congelada en pausa.
const CSS = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')
function regla(selector: string): string {
  const i = CSS.indexOf(`\n${selector} {`)
  return i < 0 ? '' : CSS.slice(i, CSS.indexOf('}', i))
}

describe('Tarea 83, correcciones: el halo de Grabar y la pastilla en pausa', () => {
  beforeEach(() => {
    localStorage.clear()
    h.escritos.clear()
    h.encendida = false
    h.oyente = null
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('EL BOTÓN DE GRABAR EN LISTO LATE CON HALO BLANCO Y SE APAGA AL APRETARLO', async () => {
    await abrir('grabar')
    const boton = screen.getByTestId('btn-empezar-toma')
    expect(boton.classList.contains('btn-empezar-grabar')).toBe(true)
    // El círculo del medio sigue siendo el punto rojo.
    expect(boton.querySelector('.punto-grabar')).not.toBeNull()
    // La hoja: el mismo pulso que Leer, halo blanco al 45 %, apagado al apretar y con movimiento reducido.
    const r = regla('.btn-empezar-grabar')
    expect(r).toMatch(/animation:\s*pulsoEmpezar 1\.8s ease-out 1\.5s infinite/)
    expect(r).toMatch(/--pulso-empezar:\s*#fff/)
    expect(r).toMatch(/--pulso-empezar-opacidad:\s*45%/)
    expect(regla('.btn-empezar-grabar:active')).toMatch(/animation:\s*none/)
    // 2026-10-05: sobre fondo claro, gris oscuro translúcido; nunca rojo.
    expect(CSS).toMatch(/\.btn-empezar-grabar\.halo-sobre-claro,[^{]*\{\s*--pulso-empezar:\s*#1f1f1f;/)
    expect(CSS).toMatch(/\.btn-empezar-leer,\s*\n\s*\.btn-empezar-grabar \{ animation: none; \}/)
    expect(CSS).toMatch(/@keyframes pulsoEmpezar\s*\{[^}]*box-shadow[^}]*var\(--pulso-empezar-opacidad, 55%\)/)
    // Al apretarlo se apaga: el botón deja de estar; grabando, Parar no lleva el pulso.
    await empezarYMostrarControles()
    expect(screen.queryByTestId('btn-empezar-toma')).toBeNull()
    expect(screen.getByTestId('btn-parar-lectura').classList.contains('btn-empezar-grabar')).toBe(false)
  })

  test.each([['grabar'], ['leer']])('EN PAUSA LA PASTILLA NO AVANZA -%s-', async (puerta) => {
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ mostrarTiempo: true }))
    await abrir(puerta as 'grabar' | 'leer')
    await empezarYMostrarControles()
    await esperar(1200)
    const texto = () => document.querySelector('.pastilla-tiempo')?.textContent || ''
    await tocarPausa()
    const enPausa = texto()
    expect(enPausa).toMatch(/\d\d:\d\d \/ \d\d:\d\d/)
    await esperar(2600)
    expect(texto()).toBe(enPausa)
    // 2026-10-05: lo de seguir pasó a 'AL SEGUIR, LA PASTILLA CONTINÚA DESDE DONDE SE CONGELÓ', exacta.
    // Antes, aquí, con un segundo de tolerancia:
    //   await tocarPausa(); await esperar(300)
    //   expect(seg(desp) - seg(ant)).toBeLessThanOrEqual(1)
  }, 20000)

  test.each([['grabar'], ['leer']])('AL SEGUIR, LA PASTILLA CONTINÚA DESDE DONDE SE CONGELÓ -%s-', async (puerta) => {
    // El reloj lo maneja la prueba -performance.now y Date.now-: así se pausa justo después de cruzar un
    // segundo y antes del refresco de 250 ms, que es donde la pastilla se adelantaba al seguir.
    let reloj = 1_000_000
    const base = Date.now()
    vi.spyOn(performance, 'now').mockImplementation(() => reloj)
    vi.spyOn(Date, 'now').mockImplementation(() => base + reloj)
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ mostrarTiempo: true }))
    await abrir(puerta as 'grabar' | 'leer')
    await empezarYMostrarControles()
    const inicio = reloj
    const texto = () => (document.querySelector('.pastilla-tiempo')?.textContent || '').split(' / ')[0]
    reloj = inicio + 4_900
    await esperar(300)
    expect(texto()).toBe('00:04')
    reloj = inicio + 5_100
    await tocarPausa()
    expect(texto()).toBe('00:05')
    // Diez segundos de pausa.
    reloj += 10_000
    await esperar(300)
    expect(texto()).toBe('00:05')
    await tocarPausa()
    await esperar(300)
    expect(texto()).toBe('00:05')
    // Y sigue contando desde ahí, sin la pausa.
    reloj += 1_000
    await esperar(300)
    expect(texto()).toBe('00:06')
  }, 20000)
})
