// TAREA 88 -04-10-2026-: LA PAUSA CON CORTES Y EL CONTROL POR GESTOS, a través de <App>. La cámara está
// fingida -lib/camara-, el disco también -lib/archivosNativos, con escribirTexto espiado- y la toma
// -lib/tomaVideo- es la de verdad: lo que se mira es el sidecar que escribe. Los gestos van con
// GestosFake. Ver docs/tarea88.txt, sección 7.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({
  escritos: new Map<string, string>(),
  lado: 'frontal' as 'frontal' | 'trasera',
  encendida: false,
  grabadorFalla: false,
  duracionMs: 20_000
}))
const gestos = vi.hoisted(() => ({ fake: null as any }))

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
    ladoActual: () => h.lado,
    encenderCamara: async (lado: 'frontal' | 'trasera') => { h.lado = lado; h.encendida = true },
    apagarCamara: async () => { h.encendida = false },
    empezarGrabacionVideo: async () => { if (h.grabadorFalla) throw new Error('sin grabador') },
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
    analizarVideo: async () => ({ duracionMs: h.duracionMs, bytes: 5_000_000, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1080, altoPx: 1920, rotacion: 0 }),
    bytesDe: async () => 5_000_000,
    extraerMiniatura: async (_r: string, destino: string) => destino,
    obtenerEspacioLibre: async () => null
  }
})
// -tarea 88, segunda vuelta- Con lo puro de lib/gestos -decidirPreparar y sus constantes-. Antes:
// return { Gestos: gestos.fake }
vi.mock('../lib/gestos', async (importOriginal) => {
  const actual: any = await importOriginal()
  const { GestosFake } = await import('./GestosFake')
  gestos.fake = new GestosFake()
  return { ...actual, Gestos: gestos.fake }
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

const guion: Guion = {
  id: 'g-88', titulo: 'Pausa', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'si me vieras por dentro sabrías que no duermo nunca' }]
}

class MotorEspia extends MotorFake {
  iniciados = 0
  detenidos = 0
  async iniciar(o: { lang: string }) { this.iniciados++; return super.iniciar(o) }
  async detener() { this.detenidos++ }
}

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

async function abrirGrabar(motor = new MotorEspia(), conGestos = false) {
  if (conGestos) localStorage.setItem('teleprompter_ajustes', JSON.stringify({ gestosAlGrabar: true }))
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  render(<App repoOverride={repo} motor={motor} />)
  fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(50)
  return motor
}
async function empezar() {
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await esperar(3200)
}
async function mostrarControles() {
  fireEvent.click(screen.getByTestId('teleprompter-view-container'))
  await screen.findByTestId('btn-pausa-lectura')
}
async function tocarPausa() {
  await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
  await esperar(30)
}
// El sidecar de la toma en curso: el único <id>.json escrito.
function sidecar(): any {
  const ruta = [...h.escritos.keys()].find((k) => k.endsWith('.json'))
  return ruta ? JSON.parse(h.escritos.get(ruta)!) : null
}

describe('Tarea 88: la pausa con cortes y los gestos, a través de <App>', () => {
  beforeEach(() => {
    localStorage.clear()
    h.escritos.clear()
    h.lado = 'frontal'
    h.encendida = false
    h.grabadorFalla = false
    h.duracionMs = 20_000
    gestos.fake?.reiniciar()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('PAUSA POR BOTÓN ESCRIBE EL TRAMO EN EL SIDECAR', async () => {
    await abrirGrabar()
    await empezar()
    await mostrarControles()
    await tocarPausa()
    const abierta = sidecar().pausas
    expect(abierta).toEqual([{ desdeMs: expect.any(Number), hastaMs: null, origen: 'boton' }])
    await esperar(400)
    await tocarPausa()
    const [p] = sidecar().pausas
    // Sin margen: lo que duró la pausa, de toque a toque.
    expect(p.hastaMs - p.desdeMs).toBeGreaterThanOrEqual(380)
    expect(p.hastaMs - p.desdeMs).toBeLessThan(1000)
  }, 20000)

  test('TRES PALMAS PAUSAN Y APAGAN LA VOZ', async () => {
    const motor = await abrirGrabar(new MotorEspia(), true)
    await empezar()
    gestos.fake.etiqueta = 'Open_Palm'
    const detenidosAntes = motor.detenidos
    // 2 s sin cambio en la voz y tres revisiones, una cada 500 ms.
    await esperar(3600)
    expect(screen.getByTestId('btn-pausa-lectura').getAttribute('aria-label')).toBe(es.seguir)
    expect(motor.detenidos).toBeGreaterThan(detenidosAntes)
    const [p] = sidecar().pausas
    expect(p.origen).toBe('palma')
    expect(gestos.fake.maxEnVuelo).toBe(1)
  }, 20000)

  test('LA V EN PAUSA ABRE LA TOMA EN EL VISOR', async () => {
    await abrirGrabar(new MotorEspia(), true)
    await empezar()
    // Más de 1 s grabado antes de pausar: si no, lo que queda es una toma sin video -punto 9-.
    await esperar(1500)
    await mostrarControles()
    await tocarPausa()
    gestos.fake.etiqueta = 'Victory'
    await esperar(2000)
    expect(await screen.findByTestId('reproductor-grabacion')).toBeTruthy()
  }, 20000)

  test('PALMA EN PAUSA: CUENTA DE 3 S Y RECIÉN AHÍ VUELVE LA VOZ', async () => {
    const motor = await abrirGrabar(new MotorEspia(), true)
    await empezar()
    await mostrarControles()
    await tocarPausa()
    const iniciadosEnPausa = motor.iniciados
    gestos.fake.etiqueta = 'Open_Palm'
    await esperar(1800)
    // La cuenta corre y la voz sigue apagada.
    expect(screen.getByTestId('velo-cuenta-regresiva')).toBeTruthy()
    expect(motor.iniciados).toBe(iniciadosEnPausa)
    await esperar(3300)
    expect(screen.queryByTestId('velo-cuenta-regresiva')).toBeNull()
    expect(motor.iniciados).toBe(iniciadosEnPausa + 1)
    const [p] = sidecar().pausas
    expect(p.hastaMs).not.toBeNull()
  }, 20000)

  test('LA PAUSA POR PALMA MUESTRA EL SÍMBOLO GRANDE Y LA DEL BOTÓN NO', async () => {
    await abrirGrabar(new MotorEspia(), true)
    await empezar()
    await mostrarControles()
    await tocarPausa()
    expect(screen.queryByTestId('simbolo-pausa-grande')).toBeNull()
    await tocarPausa()
    gestos.fake.etiqueta = 'Open_Palm'
    await esperar(3600)
    expect(screen.getByTestId('btn-pausa-lectura').getAttribute('aria-label')).toBe(es.seguir)
    expect(screen.getByTestId('simbolo-pausa-grande')).toBeTruthy()
    // 1 s a la vista y 300 ms de salida.
    await esperar(1500)
    expect(screen.queryByTestId('simbolo-pausa-grande')).toBeNull()
  }, 20000)

  test('EN PAUSA EL PUNTO PARPADEA', async () => {
    await abrirGrabar()
    await empezar()
    const punto = () => screen.getByTestId('punto-grabando')
    expect(punto().classList.contains('en-pausa')).toBe(false)
    await mostrarControles()
    await tocarPausa()
    expect(punto().classList.contains('en-pausa')).toBe(true)
    expect(punto().getAttribute('data-pausa')).toBe('si')
    await tocarPausa()
    expect(punto().classList.contains('en-pausa')).toBe(false)
  }, 20000)

  test('CON LA TRASERA LA FILA DE GESTOS SE VE DESHABILITADA Y CONSERVA SU VALOR', async () => {
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('ficha-camara'))
    const sw = () => screen.getByTestId('switch-gestos') as HTMLButtonElement
    expect(sw().getAttribute('aria-checked')).toBe('false')
    await act(async () => { fireEvent.click(sw()) })
    expect(sw().getAttribute('aria-checked')).toBe('true')
    await act(async () => { fireEvent.click(screen.getByTestId('btn-voltear-camara')) })
    await esperar(50)
    expect(sw().disabled).toBe(true)
    expect(sw().getAttribute('aria-checked')).toBe('false')
    expect(screen.getByTestId('fila-gestos').textContent).toContain(es.gestosSoloFrontal)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-voltear-camara')) })
    await esperar(50)
    expect(sw().disabled).toBe(false)
    expect(sw().getAttribute('aria-checked')).toBe('true')
    expect(JSON.parse(localStorage.getItem('teleprompter_ajustes')!).gestosAlGrabar).toBe(true)
  }, 20000)

  test('EL AVISO DE FIN MUESTRA LA DURACIÓN FINAL', async () => {
    // Sin video -el grabador no arranca-: el aviso de fin dice cuánto duró, sin lo pausado.
    h.grabadorFalla = true
    await abrirGrabar()
    let desfase = 0
    const ahora = Date.now.bind(Date)
    const perf = performance.now.bind(performance)
    vi.spyOn(Date, 'now').mockImplementation(() => ahora() + desfase)
    vi.spyOn(performance, 'now').mockImplementation(() => perf() + desfase)
    await empezar()
    await mostrarControles()
    await tocarPausa()
    // Un minuto en pausa.
    desfase = 60_000
    await tocarPausa()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
    const aviso = await screen.findByTestId('aviso-flotante')
    expect(aviso.textContent).toMatch(/0:0\d/)
    expect(aviso.textContent).not.toMatch(/1:0\d/)
  }, 20000)

  test('INTERRUPTOR APAGADO: NINGUNA LLAMADA A Gestos', async () => {
    await abrirGrabar()
    await empezar()
    await esperar(2600)
    await mostrarControles()
    await tocarPausa()
    await esperar(1200)
    expect(gestos.fake.llamadas).toEqual([])
    expect((console.info as any).mock.calls.some((c: any[]) => c[0] === 'Sigo88' && /gestos|vigia|revision/.test(String(c[1])))).toBe(false)
  }, 20000)

  // -punto 9- Pausa apenas empezó y luego Parar: lo que queda dura menos de 1 s y la toma se trata como
  // una sin video -no abre el visor y sale el aviso de fin de siempre-.
  // -tarea 88, segunda vuelta, 04-10-2026- «No disponible» falso.
  test('SIN VISTA PREVIA AL PREPARAR, SE VUELVE A INTENTAR Y LA FILA NO QUEDA NO DISPONIBLE', async () => {
    gestos.fake.prepararCola = [{ ok: false, estado: 'sinVistaPrevia' }, { ok: false, estado: 'sinVistaPrevia' }]
    gestos.fake.prepararResponde = { ok: true, estado: 'listo' }
    await abrirGrabar(new MotorEspia(), true)
    await esperar(2600)
    expect(gestos.fake.llamadas.filter((l: string) => l === 'preparar').length).toBe(3)
    // Ningún soltar entre intentos: el mismo reconocedor.
    expect(gestos.fake.llamadas).not.toContain('soltar')
    fireEvent.click(screen.getByTestId('ficha-camara'))
    const fila = await screen.findByTestId('fila-gestos')
    expect(fila.getAttribute('data-motivo')).toBe('ninguno')
    // Y graba con gestos: tres palmas pausan.
    await empezar()
    gestos.fake.etiqueta = 'Open_Palm'
    await esperar(3600)
    expect(sidecar().pausas[0].origen).toBe('palma')
  }, 20000)

  test('NO DISPONIBLE SOLO SI EL RECONOCEDOR NO ARRANCA O EL CUADRO SIGUE NEGRO', async () => {
    gestos.fake.prepararResponde = { ok: false, estado: 'negro' }
    await abrirGrabar(new MotorEspia(), true)
    fireEvent.click(screen.getByTestId('ficha-camara'))
    // Primer negro: todavía no.
    expect((await screen.findByTestId('fila-gestos')).getAttribute('data-motivo')).toBe('ninguno')
    await esperar(2300)
    expect(gestos.fake.llamadas.filter((l: string) => l === 'preparar').length).toBe(3)
    expect(screen.getByTestId('fila-gestos').getAttribute('data-motivo')).toBe('noDisponible')
  }, 20000)

  test('SI QUEDA MENOS DE 1 S, NO SE ABRE EL VISOR', async () => {
    await abrirGrabar()
    await empezar()
    await mostrarControles()
    await tocarPausa()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
    await esperar(100)
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    expect((await screen.findByTestId('aviso-flotante')).textContent).toMatch(/Grabado/)
  }, 20000)
})
