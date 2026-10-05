// TAREA 87, PARTE C -04-10-2026-: cortarTomaVideo y recuperarTomasPendientes anotan la orientación,
// con lo nativo fingido como en corteVideo.test.ts.
import { describe, test, expect, vi, beforeEach } from 'vitest'

const estado = vi.hoisted(() => ({
  analisis: { duracionMs: 46000, bytes: 96000000, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1920, altoPx: 1080, rotacion: 90 } as Record<string, unknown>,
  escritos: new Map<string, string>(),
  nombres: [] as string[]
}))

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})

vi.mock('../lib/camara', () => ({
  camaraEncendida: () => true,
  empezarGrabacionVideo: async () => {},
  grabacionNativaEnCurso: () => true,
  cortarGrabacionVideo: async () => 'file:///plugin/video_1.mp4',
  errorDelUltimoCorte: () => null
}))

vi.mock('../lib/archivosNativos', () => ({
  directorioGrabaciones: async () => '/grabaciones',
  juntos: (a: string, b: string) => `${a}/${b}`,
  escribirTexto: async (ruta: string, contenido: string) => { estado.escritos.set(ruta, contenido) },
  leerTexto: async (ruta: string) => {
    const t = estado.escritos.get(ruta)
    if (t === undefined) throw new Error('no existe ' + ruta)
    return t
  },
  listarDirectorio: async () => estado.nombres,
  borrarArchivo: async () => {},
  buscarMp4Recientes: async () => [],
  moverArchivo: async (_de: string, a: string) => a,
  analizarVideo: async () => {
    // Como archivosNativos.analizarVideo de verdad: sin ancho y alto, no los pasa.
    const a = { ...estado.analisis }
    if (!(Number(a.anchoPx) > 0)) { delete a.anchoPx; delete a.altoPx; delete a.rotacion }
    return a
  },
  bytesDe: async () => 0,
  extraerMiniatura: async (_r: string, destino: string) => destino,
  existeEnGaleria: async () => true,
  anotarMedicion: async () => false
}))

import { RepositorioGrabacionesMemoria } from '../datos/RepositorioGrabacionesMemoria'

describe('Tarea 87, parte C: la orientación se anota', () => {
  beforeEach(() => {
    estado.escritos.clear()
    estado.nombres = []
    estado.analisis = { duracionMs: 46000, bytes: 96000000, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1920, altoPx: 1080, rotacion: 90 }
  })

  test('cortarTomaVideo anota la orientación en el resumen y en el sidecar', async () => {
    const { iniciarTomaVideo, cortarTomaVideo } = await import('../lib/tomaVideo')
    expect(await iniciarTomaVideo({ id: 'f1', tituloGuion: 'x' })).toBe(true)
    const r = await cortarTomaVideo()
    expect(r!.orientacion).toBe('vertical')
    const sidecar = JSON.parse(estado.escritos.get('/grabaciones/f1.json')!)
    expect(sidecar.orientacion).toBe('vertical')
  })

  test('recuperarTomasPendientes también la anota', async () => {
    const { recuperarTomasPendientes } = await import('../lib/tomaVideo')
    estado.analisis = { ...estado.analisis, anchoPx: 1920, altoPx: 1080, rotacion: 0 }
    estado.escritos.set('/grabaciones/f2.json', JSON.stringify({ id: 'f2', tituloGuion: 'x', creado: 1, milisegundos: 46000, bytes: 0, frasesOidas: 3, estado: 'grabando', rutaPart: '/grabaciones/f2.mp4.part' }))
    estado.nombres = ['f2.json', 'f2.mp4.part']
    const repo = new RepositorioGrabacionesMemoria()
    const lista = await recuperarTomasPendientes(repo)
    const f2 = lista.find((g) => g.id === 'f2')!
    expect(f2.orientacion).toBe('horizontal')
    expect(JSON.parse(estado.escritos.get('/grabaciones/f2.json')!).orientacion).toBe('horizontal')
  })

  test('APK VIEJO SIN anchoPx: orientacion queda sin dato y nada se rompe', async () => {
    estado.analisis = { duracionMs: 46000, bytes: 96000000, tienePistaAudio: true, nivelRmsDb: -20 }
    const { iniciarTomaVideo, cortarTomaVideo } = await import('../lib/tomaVideo')
    expect(await iniciarTomaVideo({ id: 'f3', tituloGuion: 'x' })).toBe(true)
    const r = await cortarTomaVideo()
    expect(r).not.toBeNull()
    expect(r!.orientacion).toBeUndefined()
    expect(r!.bytes).toBe(96000000)
    expect(JSON.parse(estado.escritos.get('/grabaciones/f3.json')!).orientacion).toBeUndefined()
  })
})
