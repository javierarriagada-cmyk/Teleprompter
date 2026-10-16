import { describe, test, expect, vi, beforeEach } from 'vitest'

// PARAR CON UNA TOMA LARGA -parar-largo, 15-10-2026-. Redmi de Javier, toma de 25:39 y 3,89 GB: el
// segundo Parar entró con la misma sesión mientras el video se copiaba, marcó la toma incompleta y la
// renombró a .mp4.part. Solo lógica: la guarda única, el corte sin grabación con el .mp4 ya completo, la
// guarda que se suelta si el guardado falla y la recuperación de un .mp4.part completo.

const estado = {
  enCurso: true,
  soltarCorte: null as null | (() => void),
  cortes: 0,
  fallarAnalisis: false,
  bytes: {} as Record<string, number>,
  nombres: [] as string[],
  archivos: {} as Record<string, string>
}
const movidos: Array<[string, string]> = []

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})

vi.mock('../lib/camara', () => ({
  camaraEncendida: () => true,
  empezarGrabacionVideo: async () => {},
  grabacionNativaEnCurso: () => estado.enCurso,
  cortarGrabacionVideo: () => {
    estado.cortes += 1
    estado.enCurso = false
    return new Promise<string>((ok) => {
      estado.soltarCorte = () => ok('file:///movies/CameraPreview/video_1.mp4')
    })
  },
  errorDelUltimoCorte: () => null
}))

vi.mock('../lib/archivosNativos', () => ({
  directorioGrabaciones: async () => '/grabaciones',
  juntos: (a: string, b: string) => `${a}/${b}`,
  escribirTexto: async (ruta: string, texto: string) => {
    estado.archivos[ruta] = texto
  },
  leerTexto: async (ruta: string) => estado.archivos[ruta] ?? '',
  listarDirectorio: async () => estado.nombres,
  borrarArchivo: async () => {},
  buscarMp4Recientes: async () => [],
  moverArchivo: async (de: string, a: string) => {
    movidos.push([de, a])
    return a
  },
  analizarVideo: async (ruta: string) => {
    if (estado.fallarAnalisis) throw new Error('analisis roto')
    if (!(estado.bytes[ruta] > 0)) throw new Error('no existe')
    return { duracionMs: 1539000, bytes: estado.bytes[ruta], tienePistaAudio: true, nivelRmsDb: -20 }
  },
  bytesDe: async (ruta: string) => {
    if (estado.fallarAnalisis) throw new Error('bytes roto')
    return estado.bytes[ruta] || 0
  },
  extraerMiniatura: async (_r: string, destino: string) => destino,
  existeEnGaleria: async () => true
}))

beforeEach(() => {
  estado.enCurso = true
  estado.soltarCorte = null
  estado.cortes = 0
  estado.fallarAnalisis = false
  estado.bytes = {}
  estado.nombres = []
  estado.archivos = {}
  movidos.length = 0
})

describe('Parar con una toma larga', () => {
  test('PL1 Dos Parar seguidos cortan una sola vez: el segundo no hace nada mientras se guarda.', async () => {
    const { iniciarTomaVideo, cortarTomaVideo, guardandoToma, tomaEnCurso } = await import('../lib/tomaVideo')
    expect(await iniciarTomaVideo({ id: 'pl1', tituloGuion: 'x' })).toBe(true)
    estado.bytes['file:///movies/CameraPreview/video_1.mp4'] = 3890000000
    const primero = cortarTomaVideo()
    expect(guardandoToma()).toBe(true)
    const segundo = await cortarTomaVideo()
    expect(segundo).toBeNull()
    estado.soltarCorte!()
    const r = await primero
    expect(estado.cortes).toBe(1)
    expect(r!.incompleta).toBe(false)
    expect(r!.ruta).toBe('file:///movies/CameraPreview/video_1.mp4')
    expect(movidos).toEqual([])
    expect(guardandoToma()).toBe(false)
    expect(tomaEnCurso()).toBe(false)
  })

  test('PL2 Sin grabación en curso y con el .mp4 ya completo en su lugar, no se renombra ni se marca incompleta.', async () => {
    const { iniciarTomaVideo, cortarTomaVideo } = await import('../lib/tomaVideo')
    expect(await iniciarTomaVideo({ id: 'pl2', tituloGuion: 'x' })).toBe(true)
    estado.enCurso = false
    estado.bytes['/grabaciones/pl2.mp4'] = 3890000000
    const r = await cortarTomaVideo()
    expect(estado.cortes).toBe(0)
    expect(r!.incompleta).toBe(false)
    expect(r!.ruta).toBe('/grabaciones/pl2.mp4')
    expect(movidos).toEqual([])
    expect(JSON.parse(estado.archivos['/grabaciones/pl2.json']).estado).toBe('lista')
  })

  test('PL3 Si el guardado falla, la guarda se suelta y Parar vuelve a funcionar.', async () => {
    const { iniciarTomaVideo, cortarTomaVideo, guardandoToma } = await import('../lib/tomaVideo')
    const sidecar = await import('../lib/sidecar')
    expect(await iniciarTomaVideo({ id: 'pl3', tituloGuion: 'x' })).toBe(true)
    const espia = vi.spyOn(sidecar, 'marcarLista').mockImplementationOnce(() => {
      throw new Error('guardado roto')
    })
    const corte = cortarTomaVideo()
    estado.bytes['file:///movies/CameraPreview/video_1.mp4'] = 1000
    estado.soltarCorte!()
    await expect(corte).rejects.toThrow('guardado roto')
    expect(guardandoToma()).toBe(false)
    espia.mockRestore()
    // La sesión sigue: el siguiente Parar la termina.
    const r = await cortarTomaVideo()
    expect(r).not.toBeNull()
    expect(guardandoToma()).toBe(false)
  })

  test('PL4 Un .mp4.part completo -la toma 1a6ab5e1 del Redmi- se recupera solo al abrir: vuelve a .mp4 con su video.', async () => {
    const { recuperarTomasPendientes } = await import('../lib/tomaVideo')
    const id = '1a6ab5e1-redmi'
    const json = JSON.stringify({
      version: 1, id, tituloGuion: 'x', creado: 1000, estado: 'incompleta', milisegundos: 1539000,
      bytes: 3890000000, tienePistaAudio: true, frasesOidas: 0,
      rutaPart: `/grabaciones/${id}.mp4.part`, rutaMp4: `/grabaciones/${id}.mp4.part`
    })
    estado.archivos[`/grabaciones/${id}.json`] = json
    estado.nombres = [`${id}.json`, `${id}.mp4.part`, `${id}.motor.txt`]
    estado.bytes[`/grabaciones/${id}.mp4.part`] = 3890000000
    const guardadas: any[] = []
    const repo = { listar: async () => [], guardar: async (g: any) => { guardadas.push(g) } } as any
    const lista = await recuperarTomasPendientes(repo)
    expect(lista.map((g) => g.id)).toEqual([id])
    expect(movidos).toEqual([[`/grabaciones/${id}.mp4.part`, `/grabaciones/${id}.mp4`]])
    expect(guardadas[0].ruta).toBe(`/grabaciones/${id}.mp4`)
    expect(guardadas[0].bytes).toBe(3890000000)
    expect(guardadas[0].duracionMs).toBe(1539000)
  })
})
