// TAREA 89, EL DETALLE MENOR -04-10-2026-: LA LÍNEA "seguidor reiniciado" NO LLEGA A LOS REGISTROS.
//
// En el teléfono el reinicio al Parar sí ocurre -la toma siguiente parte limpia-, pero ningún
// <id>.motor.txt trae la línea. La causa, en el orden de handleStop -App.tsx-:
//   1. cortarTomaSiHay → cortarTomaVideo escribe el registro de la toma -comoTexto()- y vuelve el
//      diagnóstico a como estaba antes de la toma: activarDiagnostico(s.diagnosticoAntes), o sea
//      APAGADO si no se abrieron las herramientas -tomaVideo.ts-;
//   2. recién después, reiniciarEn(0) → anotar(... 'reiniciado' ...) con el diagnóstico apagado: no
//      se guarda en ninguna parte;
//   3. la toma siguiente enciende el diagnóstico con activarDiagnostico(true), que vacía las entradas.
// Y aunque el diagnóstico hubiera estado encendido, el registro de la toma ya estaba escrito, y el de
// la siguiente empieza vacío. La prueba de tarea89-tomas.test.tsx -'(a) Parar deja anotado el
// reinicio en 0'- no lo veía porque enciende el diagnóstico a mano antes de Parar y lee la memoria,
// no el archivo.
//
// Esta prueba repite el orden de verdad -tomaVideo y useSeguidor, con la cámara fingida como en
// corteVideo.test.ts- y lee lo que se escribe al disco.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Guion } from '../datos/modelo'

const escritos: Record<string, string> = {}

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
  escribirTexto: async (ruta: string, texto: string) => { escritos[ruta] = texto },
  leerTexto: async () => '',
  listarDirectorio: async () => [],
  borrarArchivo: async () => {},
  buscarMp4Recientes: async () => [],
  moverArchivo: async (_de: string, a: string) => a,
  analizarVideo: async () => ({ duracionMs: 5000, bytes: 1000, tienePistaAudio: true, nivelRmsDb: -20 }),
  bytesDe: async () => 0,
  extraerMiniatura: async (_r: string, destino: string) => destino
}))

import { iniciarTomaVideo, cortarTomaVideo } from '../lib/tomaVideo'
import { useSeguidor } from '../hooks/useSeguidor'
import { activarDiagnostico } from '../lib/diagnostico'

const guion: Guion = {
  id: 'g-89-registro', titulo: 'Registro', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'si me vieras por dentro sabrías que no duermo nunca\nla casa vieja del puerto tenía ventanas azules y rotas' }]
}

describe('Tarea 89: el reinicio al Parar queda en el registro de la toma siguiente', () => {
  afterEach(() => activarDiagnostico(false))

  test('toma 1, Parar -corte y después reiniciarEn(0), como handleStop-, toma 2: su .motor.txt dice "seguidor reiniciado token=0"', async () => {
    activarDiagnostico(false) // sin las herramientas abiertas, como en el teléfono
    const { result } = renderHook(() => useSeguidor(guion))

    expect(await iniciarTomaVideo({ id: 'toma-1', tituloGuion: 'Registro' })).toBe(true)
    await cortarTomaVideo()
    act(() => result.current.reiniciarEn(0))

    expect(await iniciarTomaVideo({ id: 'toma-2', tituloGuion: 'Registro' })).toBe(true)
    await cortarTomaVideo()

    expect(escritos['/grabaciones/toma-2.motor.txt']).toMatch(/seguidor\treiniciado token=0/)
  })

  test('el reinicio se cuenta una sola vez: la toma 3, sin Parar de por medio -sin reinicio-, no lo repite', async () => {
    activarDiagnostico(false)
    const { result } = renderHook(() => useSeguidor(guion))
    await iniciarTomaVideo({ id: 'toma-a', tituloGuion: 'Registro' })
    await cortarTomaVideo()
    act(() => result.current.reiniciarEn(0))
    await iniciarTomaVideo({ id: 'toma-b', tituloGuion: 'Registro' })
    await cortarTomaVideo()
    await iniciarTomaVideo({ id: 'toma-c', tituloGuion: 'Registro' })
    await cortarTomaVideo()
    expect(escritos['/grabaciones/toma-b.motor.txt']).toMatch(/seguidor\treiniciado token=0/)
    expect(escritos['/grabaciones/toma-c.motor.txt']).not.toMatch(/seguidor\treiniciado/)
  })
})

describe('Tarea 89: con las herramientas abiertas el reinicio tampoco se pierde', () => {
  afterEach(() => activarDiagnostico(false))

  // Con el diagnóstico encendido antes de la toma, cortarTomaVideo lo vuelve a encender -vacío- y la
  // línea del reinicio entra en memoria; la toma 2 lo enciende de nuevo y antes la borraba.
  test('diagnóstico encendido de antes: el .motor.txt de la toma 2 también dice "seguidor reiniciado token=0"', async () => {
    activarDiagnostico(true)
    const { result } = renderHook(() => useSeguidor(guion))
    await iniciarTomaVideo({ id: 'toma-h1', tituloGuion: 'Registro' })
    await cortarTomaVideo()
    act(() => result.current.reiniciarEn(0))
    await iniciarTomaVideo({ id: 'toma-h2', tituloGuion: 'Registro' })
    await cortarTomaVideo()
    expect(escritos['/grabaciones/toma-h2.motor.txt']).toMatch(/seguidor\treiniciado token=0/)
  })
})
