import { describe, test, expect, vi, beforeEach } from 'vitest'

// EL VIDEO QUE EL CORTE NO DEVOLVIO -tomaVideo.ts, 24-09-2026-. La camara rechaza
// stopRecordVideo pero el archivo queda entero en su carpeta. Antes la toma se guardaba
// "lista" con 0 bytes; ahora se busca el video por la hora y la toma queda incompleta, con
// su video.

const estado = { rechazaCorte: true, hayHuerfano: true, creadoAprox: 0 }
const movidos: Array<[string, string]> = []

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})

vi.mock('../lib/camara', () => ({
  camaraEncendida: () => true,
  empezarGrabacionVideo: async () => {},
  grabacionNativaEnCurso: () => true,
  cortarGrabacionVideo: async () => (estado.rechazaCorte ? null : 'file:///plugin/video_1.mp4'),
  errorDelUltimoCorte: () => (estado.rechazaCorte ? 'Failed to stop video recording: Video recording failed: 4' : null)
}))

vi.mock('../lib/archivosNativos', () => ({
  directorioGrabaciones: async () => '/grabaciones',
  juntos: (a: string, b: string) => `${a}/${b}`,
  escribirTexto: async () => {},
  leerTexto: async () => '',
  listarDirectorio: async () => [],
  borrarArchivo: async () => {},
  buscarMp4Recientes: async () =>
    estado.hayHuerfano ? [`file:///plugin/video_${estado.creadoAprox + 120}.mp4`, 'file:///plugin/video_1000.mp4'] : [],
  moverArchivo: async (de: string, a: string) => {
    movidos.push([de, a])
    if (de.endsWith('.part')) throw new Error('no existe')
    return a
  },
  analizarVideo: async (ruta: string) => {
    if (ruta.endsWith('.part') && !movidos.some(([, a]) => a === ruta)) throw new Error('no existe')
    return { duracionMs: 46000, bytes: 96000000, tienePistaAudio: true, nivelRmsDb: -20 }
  },
  bytesDe: async () => 0,
  extraerMiniatura: async (_r: string, destino: string) => destino
}))

describe('Corte de la toma sin la ruta del video', () => {
  beforeEach(() => {
    movidos.length = 0
    estado.rechazaCorte = true
    estado.hayHuerfano = true
  })

  test('C1 Si la camara no devuelve la ruta, se busca el video por la hora y la toma queda incompleta CON su video.', async () => {
    const { iniciarTomaVideo, cortarTomaVideo } = await import('../lib/tomaVideo')
    estado.creadoAprox = Date.now()
    expect(await iniciarTomaVideo({ id: 't1', tituloGuion: 'x' })).toBe(true)
    const r = await cortarTomaVideo()
    expect(r).not.toBeNull()
    expect(r!.incompleta).toBe(true)
    expect(r!.bytes).toBe(96000000)
    expect(movidos.some(([de]) => de.includes(`video_${estado.creadoAprox + 120}`))).toBe(true)
  })

  test('C2 Si tampoco se encuentra, la toma queda incompleta -para que el arranque la reintente-, no "lista" con 0 bytes.', async () => {
    estado.hayHuerfano = false
    const { iniciarTomaVideo, cortarTomaVideo } = await import('../lib/tomaVideo')
    expect(await iniciarTomaVideo({ id: 't2', tituloGuion: 'x' })).toBe(true)
    const r = await cortarTomaVideo()
    expect(r!.incompleta).toBe(true)
  })

  test('C3 Con el corte normal, la toma queda lista.', async () => {
    estado.rechazaCorte = false
    const { iniciarTomaVideo, cortarTomaVideo } = await import('../lib/tomaVideo')
    expect(await iniciarTomaVideo({ id: 't3', tituloGuion: 'x' })).toBe(true)
    const r = await cortarTomaVideo()
    expect(r!.incompleta).toBe(false)
  })
})
