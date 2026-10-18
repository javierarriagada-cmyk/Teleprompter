import { describe, test, expect, vi, afterAll } from 'vitest'

// BANCO LARGO EN PLAY -banco-largo, 17-10-2026-: sin HERRAMIENTAS la bitácora no se escribe ni se anota,
// y las palabras de la toma sí. La variable se fija antes de importar -como tarea84-play.test.tsx-:
// src/lib/herramientas.ts la lee al cargarse, como el paquete armado con --mode play.
vi.hoisted(() => {
  vi.stubEnv('VITE_HERRAMIENTAS', '0')
})

const estado = { archivos: {} as Record<string, string>, borrados: [] as string[] }

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})

vi.mock('../lib/camara', () => ({
  camaraEncendida: () => true,
  empezarGrabacionVideo: async () => {},
  grabacionNativaEnCurso: () => true,
  cortarGrabacionVideo: async () => 'file:///movies/CameraPreview/video_1.mp4',
  errorDelUltimoCorte: () => null
}))

vi.mock('../lib/archivosNativos', () => ({
  directorioGrabaciones: async () => '/grabaciones',
  juntos: (a: string, b: string) => `${a}/${b}`,
  escribirTexto: async (ruta: string, texto: string) => {
    estado.archivos[ruta] = texto
  },
  leerTexto: async (ruta: string) => {
    if (!(ruta in estado.archivos)) throw new Error('no existe')
    return estado.archivos[ruta]
  },
  listarDirectorio: async () => [],
  borrarArchivo: async (ruta: string) => {
    estado.borrados.push(ruta)
  },
  buscarMp4Recientes: async () => [],
  moverArchivo: async (_de: string, a: string) => a,
  analizarVideo: async () => ({ duracionMs: 1830000, bytes: 1000, tienePistaAudio: true, nivelRmsDb: -20 }),
  bytesDe: async () => 1000,
  extraerMiniatura: async (_r: string, destino: string) => destino,
  existeEnGaleria: async () => true
}))

import { HERRAMIENTAS } from '../lib/herramientas'
import { anotar, comoTexto, diagnosticoActivo, msDelRegistro } from '../lib/diagnostico'
import { iniciarTomaVideo, cortarTomaVideo, borrarGrabacionEnDisco } from '../lib/tomaVideo'
import { textoDeSubtitulos } from '../lib/archivosDeToma'
import { armarSubtitulos } from '../lib/subtitulos'

describe('banco-largo: Play sin bitácora', () => {
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  test('BLP1 sin HERRAMIENTAS no se escribe el .motor.txt ni se anota nada; las palabras de la toma sí', async () => {
    expect(HERRAMIENTAS).toBe(false)
    const cabeceraMotor = ['# motor de voz: nativo', '# ---------- GUION, TAL CUAL SE LEYO ----------', '# | Hola a todos.', '# ---------------------------------------------'].join('\n')
    expect(await iniciarTomaVideo({ id: 'play1', tituloGuion: 'x', cabeceraMotor })).toBe(true)
    expect(diagnosticoActivo()).toBe(false)
    const t0 = -msDelRegistro(0)
    anotar({ tipo: 'cuadro', posicion: 1, calce: 1, scroll: 0, freno: '-', trabado: 0, ms: t0 + 16 })
    anotar({ tipo: 'oyo', texto: 'hola a todos', final: true, ms: t0 + 1200 })
    anotar({ tipo: 'palabras', final: true, palabras: [{ w: 'hola', ini: 100, fin: 400 }, { w: 'a', ini: 420, fin: 500 }, { w: 'todos', ini: 520, fin: 900 }], ms: t0 + 1200 })
    anotar({ tipo: 'calce', token: 2, texto: 'hola a todos', ms: t0 + 1201 })
    anotar({ tipo: 'calce', token: null, texto: 'eh', ms: t0 + 1300 })
    // La bitácora quedó vacía: solo la línea de títulos.
    expect(comoTexto()).toBe('ms\ttipo\tdetalle')
    const r = await cortarTomaVideo()
    expect(r).not.toBeNull()
    expect(Object.keys(estado.archivos).filter((k) => k.endsWith('.motor.txt'))).toEqual([])
    const palabras = estado.archivos['/grabaciones/play1.palabras.txt']
    expect(palabras).toContain('# | Hola a todos.')
    expect(palabras).toContain('1200\tpalabras\tFINAL: hola@100-400 a@420-500 todos@520-900')
    expect(palabras).toContain('1201\tcalce\ttoken 2:')
    expect(palabras).not.toContain('NO CALZO')
    expect(palabras).not.toContain('\tcuadro\t')
    // El visor de Play saca de ahí sus subtítulos.
    const subs = armarSubtitulos((await textoDeSubtitulos('play1'))!)
    expect(subs.map((s) => s.renglones.flat().map((w) => w.texto).join(' '))).toEqual(['Hola a todos.'])
    // Borrar la toma borra también sus palabras, como al .motor.txt.
    await borrarGrabacionEnDisco(r!)
    expect(estado.borrados).toContain('/grabaciones/play1.palabras.txt')
    expect(estado.borrados).toContain('/grabaciones/play1.motor.txt')
  })
})
