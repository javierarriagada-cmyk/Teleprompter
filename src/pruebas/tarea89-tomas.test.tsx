// TAREA 89, CUARTA VUELTA -04-10-2026-: EL ESTADO HEREDADO ENTRE TOMAS ES UN DEFECTO.
//
// Javier y Claude lo definen así: Parar termina la toma, y la siguiente lectura o grabación parte desde
// el principio del guion -o desde donde quedó el texto en LISTO, si se movió antes de Empezar-, como en
// cualquier grabadora. Sin calces, frenos, seguidor, motor ni reloj de la toma anterior. Pausa → Seguir
// sí continúa donde quedó.
//
// Hasta hoy nada se reiniciaba al Parar -App.tsx handleStop y handleDescartarToma-: el seguidor y el
// motor de useSeguidor solo se creaban de nuevo si cambiaba el objeto guion. Ver docs/tarea89.txt,
// "CUARTA VUELTA".
//
// (a) y (c-motor) fallan sin el arreglo; (b) y (c) en la App son guardianas -pasan hoy y tienen que
// seguir pasando-. Lo que cada una prueba está dicho en su comentario.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, renderHook, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion } from '../datos/modelo'
import { activarDiagnostico, comoTexto } from '../lib/diagnostico'
import { useSeguidor } from '../hooks/useSeguidor'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return {
    ...actual,
    recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar()
  }
})

// Seis renglones de diez palabras, sin repetir ninguna: el renglón k termina en el token 10k + 9.
const RENGLONES = [
  'si me vieras por dentro sabrías que no duermo nunca',
  'la casa vieja del puerto tenía ventanas azules y rotas',
  'mi abuelo pescaba congrios grandes cuando el mar estaba tranquilo',
  'los domingos subíamos al cerro alto a mirar los barcos',
  'después bajábamos muy cansados con hambre de pan amasado caliente',
  'ahora vuelvo cada verano para escuchar otra vez las olas'
]
const guion: Guion = {
  id: 'g-89-tomas', titulo: 'Tomas', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: RENGLONES.join('\n') }]
}

// MotorFake vuelve a la frase 0 en cada iniciar -Empezar y Seguir-; para decir una frase cualquiera
// se le habla directo a sus oyentes.
class MotorDeTomas extends MotorFake {
  decir(texto: string) {
    ;(this as any).listenersFinal.forEach((cb: any) => cb({ texto, inicioMs: 0, finMs: 0 }))
  }
}

async function abrirLeer(motor: MotorDeTomas) {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  render(<App repoOverride={repo} motor={motor} />)
  fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
}

async function empezar() {
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await act(async () => { await new Promise((r) => setTimeout(r, 3100)) })
}

async function mostrarControles() {
  fireEvent.click(screen.getByTestId('teleprompter-view-container'))
  await screen.findByTestId('btn-pausa-lectura')
}

async function decir(motor: MotorDeTomas, texto: string) {
  await act(async () => { motor.decir(texto); await new Promise((r) => setTimeout(r, 20)) })
}

// Los calces anotados desde la última vez que se encendió el registro.
const calces = () => comoTexto().split('\n').filter((l) => l.includes('\tcalce\t')).map((l) => l.split('\t')[2])

describe('Tarea 89, cuarta vuelta: Parar termina la toma; Pausa la deja seguir', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })
  afterEach(() => {
    activarDiagnostico(false)
    cleanup()
  })

  // (a) FALLA HOY. La toma 1 lee los seis renglones y se para. La toma 2 empieza por el renglón 1:
  // sin el arreglo el seguidor sigue en el 59 -donde dejó la 1- y busca desde el 44, así que el
  // renglón 1 da NO CALZO -como la toma 2 de Javier, que empezó en pos=25.87-.
  test('(a) tras Parar, la toma nueva parte del principio: el renglón 1 calza en el token 9', async () => {
    const motor = new MotorDeTomas()
    await abrirLeer(motor)
    await empezar()
    for (const r of RENGLONES) await decir(motor, r)
    await mostrarControles()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
    await screen.findByTestId('btn-empezar-toma')

    activarDiagnostico(true)
    await empezar()
    await decir(motor, RENGLONES[0])
    expect(calces()[0]).toBe(`token 9: ${RENGLONES[0]}`)
  }, 20000)

  test('(a) Parar deja anotado el reinicio en 0', async () => {
    const motor = new MotorDeTomas()
    await abrirLeer(motor)
    await empezar()
    await decir(motor, RENGLONES[0])
    await mostrarControles()
    activarDiagnostico(true)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
    expect(comoTexto()).toMatch(/seguidor\treiniciado token=0/)
  }, 20000)

  // (b) GUARDIANA -pasa hoy-. Pausa → Seguir no reinicia: después de los renglones 1 a 3, el 4
  // calza en el 39 y no hay ningún reinicio anotado.
  test('(b) Pausa → Seguir sigue donde quedó: el renglón 4 calza en el 39, sin reinicio', async () => {
    const motor = new MotorDeTomas()
    await abrirLeer(motor)
    await empezar()
    for (const r of RENGLONES.slice(0, 3)) await decir(motor, r)
    await mostrarControles()
    activarDiagnostico(true)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    await decir(motor, RENGLONES[3])
    expect(calces()[0]).toBe(`token 39: ${RENGLONES[3]}`)
    expect(comoTexto()).not.toMatch(/seguidor\t(reiniciado|creado)/)
  }, 20000)

  // (c) GUARDIANA EN LA APP, más el cableado. Después de una toma, Parar, y mover el texto en LISTO
  // hasta el renglón 4 -la rueda; en jsdom no hay medidas, así que cada renglón se finge a 1000 px-.
  // La toma parte desde ahí: el renglón 4 calza en el 39. Sin el arreglo el renglón 4 también calza
  // -irAToken ya ponía al seguidor en 30-, así que esa parte pasa hoy; lo que falta hoy es el
  // reinicio -ppm y reloj, ver (c) de useSeguidor abajo- y su línea 'seguidor reiniciado token=30'.
  test('(c) si el texto se movió en LISTO, la toma parte desde ahí', async () => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        const tk = this.dataset?.token
        return tk === undefined ? 0 : Math.floor(Number(tk) / 10) * 1000
      }
    })
    try {
      const motor = new MotorDeTomas()
      await abrirLeer(motor)
      await empezar()
      for (const r of RENGLONES) await decir(motor, r)
      await mostrarControles()
      await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
      await screen.findByTestId('btn-empezar-toma')

      activarDiagnostico(true)
      const cont = screen.getByTestId('contenedor-lectura')
      cont.scrollTop = 3000
      fireEvent.wheel(cont)
      await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
      expect(comoTexto()).toMatch(/seguidor	reiniciado token=30/)

      await empezar()
      await decir(motor, RENGLONES[3])
      expect(calces()[0]).toBe(`token 39: ${RENGLONES[3]}`)
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', original)
    }
  }, 20000)
})

// EL MOTOR POR DENTRO, en useSeguidor. Lo que la App no deja ver: las ppm estimadas, el último calce
// y su reloj.
describe('Tarea 89, cuarta vuelta: el reinicio de useSeguidor', () => {
  afterEach(() => activarDiagnostico(false))

  function leerToma(r: { current: ReturnType<typeof useSeguidor> }) {
    for (const texto of RENGLONES) act(() => { r.current.alRecibirFinal({ texto, inicioMs: 0, finMs: 0 } as any) })
  }

  // (a) FALLA HOY -reiniciarEn no existe; con irAToken, lo único que había, el motor se queda con las
  // ppm de la toma anterior-. Tras una toma con calces, reiniciarEn(0) deja todo como recién creado.
  test('(a) reiniciarEn(0) tras una toma: motor en 0, sin calce, ppm iniciales, sin reloj', () => {
    const { result } = renderHook(() => useSeguidor(guion))
    const nuevo = result.current.motorAvance!.estadoEn(performance.now())
    leerToma(result as any)
    expect(result.current.motorAvance!.estadoEn(performance.now()).ultimoCalce).toBeGreaterThan(9)
    act(() => { (result.current as any).reiniciarEn(0) })
    const st = result.current.motorAvance!.estadoEn(performance.now())
    expect(Math.round(st.posicion)).toBe(0)
    expect(st.ultimoCalce).toBe(0)
    expect(st.tUltimoCalceMs).toBe(0)
    expect(st.ppmEstimadas).toBe(nuevo.ppmEstimadas)
    expect(st.motivoFreno).toBe(nuevo.motivoFreno)
    // Y el seguidor también: el renglón 1 vuelve a calzar.
    activarDiagnostico(true)
    act(() => { result.current.alRecibirFinal({ texto: RENGLONES[0], inicioMs: 0, finMs: 0 } as any) })
    expect(calces()[0]).toBe(`token 9: ${RENGLONES[0]}`)
  })

  // (c-motor) FALLA HOY. Mover el texto en LISTO usaba irAToken, que pone el motor en el destino pero
  // con las ppm de la toma anterior y el reloj del último calce en la hora del gesto -desde ahí el
  // seguidor predice ppm/60 tokens por segundo hasta que se empiece-. reiniciarEn(30) lo pone en 30
  // como recién creado.
  test('(c) reiniciarEn(30) tras una toma: motor en 30, ppm iniciales, sin reloj, y el renglón 4 calza en 39', () => {
    const { result } = renderHook(() => useSeguidor(guion))
    const nuevo = result.current.motorAvance!.estadoEn(performance.now())
    leerToma(result as any)
    act(() => { (result.current as any).reiniciarEn(30) })
    const st = result.current.motorAvance!.estadoEn(performance.now())
    expect(Math.round(st.posicion)).toBe(30)
    expect(st.ultimoCalce).toBe(30)
    expect(st.tUltimoCalceMs).toBe(0)
    expect(st.ppmEstimadas).toBe(nuevo.ppmEstimadas)
    activarDiagnostico(true)
    act(() => { result.current.alRecibirFinal({ texto: RENGLONES[3], inicioMs: 0, finMs: 0 } as any) })
    expect(calces()[0]).toBe(`token 39: ${RENGLONES[3]}`)
  })
})
