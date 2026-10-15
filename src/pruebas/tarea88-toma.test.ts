// TAREA 88 -04-10-2026-: LAS PAUSAS EN LA TOMA -sidecar.ts, tomaVideo.ts, modelo.ts-. docs/tarea88.txt,
// sección 4. Fallaron antes de escribir abrirPausa/cerrarPausa y el campo pausas.
import { describe, test, expect, vi, beforeEach } from 'vitest'

const escritos = vi.hoisted(() => new Map<string, string>())
const estado = vi.hoisted(() => ({ duracionMs: 30_000, miniaturas: [] as number[], sidecarViejo: '' }))

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
  escribirTexto: async (ruta: string, texto: string) => { escritos.set(ruta, texto) },
  leerTexto: async (ruta: string) => {
    if (ruta.endsWith('vieja.json')) return estado.sidecarViejo
    throw new Error('no existe')
  },
  listarDirectorio: async () => ['vieja.json', 'vieja.mp4.part'],
  borrarArchivo: async () => {},
  buscarMp4Recientes: async () => [],
  moverArchivo: async (_de: string, a: string) => a,
  analizarVideo: async () => ({ duracionMs: estado.duracionMs, bytes: 5_000_000, tienePistaAudio: true, nivelRmsDb: -20 }),
  bytesDe: async () => 5_000_000,
  extraerMiniatura: async (_r: string, destino: string, atMs: number) => { estado.miniaturas.push(atMs); return destino }
}))

import { parsearSidecar } from '../lib/sidecar'
import { grabacionNueva } from '../datos/modelo'

describe('Tarea 88: las pausas en el sidecar y en la toma', () => {
  beforeEach(() => {
    escritos.clear()
    estado.miniaturas.length = 0
    estado.duracionMs = 30_000
  })
  test('parsearSidecar conserva pausas', () => {
    const pausas = [{ desdeMs: 1000, hastaMs: 4000, origen: 'boton' }, { desdeMs: 9000, hastaMs: null, origen: 'palma' }]
    const s = parsearSidecar(JSON.stringify({ id: 'a', pausas }))!
    expect(s.pausas).toEqual(pausas)
    // Y el índice la lleva: grabacionNueva la copia.
    expect(grabacionNueva({ tituloGuion: 'x', pausas: s.pausas }).pausas).toEqual(pausas)
    // Sin pausas, el sidecar de hoy no cambia.
    expect(parsearSidecar(JSON.stringify({ id: 'a' }))!.pausas).toBeUndefined()
  })
  test('descarta pausas inválidas con aviso', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const malas of ['no', [1, 2], [{ desdeMs: 'x', hastaMs: 3, origen: 'boton' }], [{ desdeMs: 1, hastaMs: 3, origen: 'pie' }], [{ desdeMs: 1, hastaMs: 3, origen: 'boton' }, null]]) {
      aviso.mockClear()
      const s = parsearSidecar(JSON.stringify({ id: 'a', pausas: malas }))!
      expect(s.pausas).toBeUndefined()
      expect(aviso).toHaveBeenCalled()
      expect(String(aviso.mock.calls[0].join(' '))).toMatch(/pausas/)
    }
    aviso.mockRestore()
  })
  test('cortarTomaVideo cierra la pausa abierta', async () => {
    const t = await import('../lib/tomaVideo')
    expect(await t.iniciarTomaVideo({ id: 't88', tituloGuion: 'x', cabeceraMotor: '# letra: 40 px' })).toBe(true)
    const cero = Date.now()
    t.abrirPausa(cero + 5000, 'boton')
    // Cada cambio se escribe al tiro en el sidecar, sin esperar el latido.
    expect(JSON.parse(escritos.get('/grabaciones/t88.json')!).pausas).toEqual([{ desdeMs: expect.any(Number), hastaMs: null, origen: 'boton' }])
    t.cerrarPausa(cero + 8000)
    t.abrirPausa(cero + 20_000, 'palma')
    const r = await t.cortarTomaVideo()
    expect(r!.pausas!.length).toBe(2)
    expect(r!.pausas![0].hastaMs! - r!.pausas![0].desdeMs).toBeGreaterThanOrEqual(2900)
    expect(r!.pausas![1].hastaMs).toBe(30_000)
    expect(JSON.parse(escritos.get('/grabaciones/t88.json')!).pausas[1].hastaMs).toBe(30_000)
    // Una línea por pausa en el registro del motor; el resto igual.
    const registro = escritos.get('/grabaciones/t88.motor.txt')!
    expect(registro.match(/^# pausa desdeMs=\d+ hastaMs=\d+ origen=(boton|palma)$/gm)!.length).toBe(2)
    expect(registro).toMatch(/# letra: 40 px/)
    // -15-10-2026- La miniatura va a los 3 s -MS_MINIATURA-, o al medio si el tramo dura menos de 6 s:
    // 0..5000 → a los 2500. Antes:
    // // La miniatura sale del primer tramo que queda: 0..~5000 → a los 1000.
    // expect(estado.miniaturas).toEqual([1000])
    // -15-10-2026, mas tarde- El tramo termina en cero + 5000, y cero se toma unos ms DESPUES de que arranca la
    // toma: el tramo dura 5000 y pico, y su medio, 2500 y pico. Con la suite entera corriendo, el pico crecio
    // y la prueba fallo una vez -con el 1000 de antes no pasaba: era el comienzo del tramo, que no se mueve-.
    // Antes: expect(estado.miniaturas).toEqual([2500])
    expect(estado.miniaturas.length).toBe(1)
    expect(estado.miniaturas[0]).toBeGreaterThanOrEqual(2500)
    expect(estado.miniaturas[0]).toBeLessThan(2600)
  })
  test('recuperarTomasPendientes cierra la pausa abierta', async () => {
    estado.duracionMs = 12_000
    estado.sidecarViejo = JSON.stringify({ id: 'vieja', tituloGuion: 'x', creado: 1, milisegundos: 11_000, estado: 'grabando', pausas: [{ desdeMs: 0, hastaMs: 3000, origen: 'boton' }, { desdeMs: 9000, hastaMs: null, origen: 'boton' }] })
    const t = await import('../lib/tomaVideo')
    const guardadas: any[] = []
    const lista = await t.recuperarTomasPendientes({ listar: async () => [], guardar: async (g: any) => { guardadas.push(g) } } as any)
    const g = lista.find((x) => x.id === 'vieja')!
    expect(g.pausas).toEqual([{ desdeMs: 0, hastaMs: 3000, origen: 'boton' }, { desdeMs: 9000, hastaMs: 12_000, origen: 'boton' }])
    expect(JSON.parse(escritos.get('/grabaciones/vieja.json')!).pausas[1].hastaMs).toBe(12_000)
    // -15-10-2026- Del primer tramo que queda -3000..9000-, a los 3 s de su comienzo: 6000. Antes:
    // // La miniatura, del primer tramo que queda -3000..9000-: 4000.
    // expect(estado.miniaturas).toEqual([4000])
    expect(estado.miniaturas).toEqual([6000])
  })
})
