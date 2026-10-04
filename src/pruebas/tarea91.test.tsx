// TAREA 91 -04-10-2026-: LA ORIENTACIÓN QUEDA FIJA MIENTRAS DURA LA TOMA.
//
// Javier: mientras dura una toma, de Empezar a Parar y tanto en Leer como en Grabar, la orientación de la
// pantalla queda bloqueada en la que tenía al empezar, como la cámara del teléfono. En LISTO y en el visor
// se gira libremente. Del lado nativo es CamaraNativa.fijarOrientacion / soltarOrientacion
// -Activity.setRequestedOrientation-; aquí se espía esa llamada, que es lo que llega al teléfono.
//
// Fallan hoy -sin el arreglo nadie llama a fijarOrientacion-: Empezar en Leer y en Grabar fija; Parar,
// un error al empezar, desmontar y el segundo plano sueltan; Pausa → Seguir mantiene. Guardianas -pasan
// hoy y tienen que seguir pasando-: en LISTO y en el visor no se fija nada.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

const nativo = vi.hoisted(() => ({
  fijar: vi.fn(async (_o?: any) => ({ rotacion: 270, orientacion: 'REVERSE_LANDSCAPE', valor: 8, anterior: 'UNSPECIFIED', natural: 'vertical' })),
  soltar: vi.fn(async (_o?: any) => ({ orientacion: 'UNSPECIFIED', rotacion: 270 }))
}))
const wake = vi.hoisted(() => ({ fallar: false }))

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))
// El plugin de verdad -registerPlugin- con las dos llamadas nuevas espiadas. Lo demás sigue igual.
vi.mock('../lib/camara', async (importOriginal) => {
  const actual: any = await importOriginal()
  const CamaraNativa = new Proxy(actual.CamaraNativa, {
    get(t: any, p: string | symbol) {
      if (p === 'fijarOrientacion') return nativo.fijar
      if (p === 'soltarOrientacion') return nativo.soltar
      return t[p]
    }
  })
  return { ...actual, CamaraNativa }
})
// Para el error al empezar: el pedido de pantalla encendida -lo primero de handleStart- falla.
vi.mock('../hooks/useWakeLock', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    useWakeLock: () => {
      const w = actual.useWakeLock()
      return {
        ...w,
        solicitar: async () => {
          if (wake.fallar) throw new Error('la pantalla no quiso quedarse encendida')
          return w.solicitar()
        }
      }
    }
  }
})
vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return {
    ...actual,
    recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar()
  }
})

import App from '../App'
import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion, grabacionNueva } from '../datos/modelo'

const guion: Guion = {
  id: 'g-91', titulo: 'Orientación', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'si me vieras por dentro sabrías que no duermo nunca' }]
}

async function abrir(puerta: 'leer' | 'grabar') {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  const r = render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId(puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(50)
  return r
}
// El módulo nuevo se carga dentro de la prueba: contra main, donde no existe, falla esa prueba por su
// nombre y no el archivo entero.
const cargar = (rel: string): Promise<any> => import(/* @vite-ignore */ rel)
const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
async function empezar() {
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await esperar(3100)
}
async function mostrarControles() {
  fireEvent.click(screen.getByTestId('teleprompter-view-container'))
  await screen.findByTestId('btn-pausa-lectura')
}
function segundoPlano(oculto: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculto })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (oculto ? 'hidden' : 'visible') })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('Tarea 91: la orientación queda fija mientras dura la toma', () => {
  beforeEach(() => {
    localStorage.clear()
    nativo.fijar.mockClear()
    nativo.soltar.mockClear()
    wake.fallar = false
  })
  afterEach(() => {
    cleanup()
    segundoPlano(false)
  })

  test('Empezar en Leer fija la orientación, una vez', async () => {
    await abrir('leer')
    expect(nativo.fijar).not.toHaveBeenCalled()
    await empezar()
    expect(nativo.fijar).toHaveBeenCalledTimes(1)
    expect(nativo.soltar).not.toHaveBeenCalled()
  }, 20000)

  test('Empezar en Grabar fija la orientación, una vez', async () => {
    await abrir('grabar')
    expect(nativo.fijar).not.toHaveBeenCalled()
    await empezar()
    expect(nativo.fijar).toHaveBeenCalledTimes(1)
    expect(nativo.soltar).not.toHaveBeenCalled()
  }, 20000)

  test('la orientación queda fija desde Empezar, ya durante la cuenta de tres', async () => {
    await abrir('leer')
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(200)
    expect(screen.queryByTestId('velo-cuenta-regresiva')).not.toBeNull()
    expect(nativo.fijar).toHaveBeenCalledTimes(1)
  }, 20000)

  test('Parar la suelta y en LISTO no se vuelve a fijar', async () => {
    await abrir('leer')
    await empezar()
    await mostrarControles()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
    await screen.findByTestId('btn-empezar-toma')
    await esperar(100)
    expect(nativo.soltar).toHaveBeenCalledTimes(1)
    expect(nativo.soltar.mock.calls[0][0]).toEqual({ olvidar: true })
    expect(nativo.fijar).toHaveBeenCalledTimes(1)
  }, 20000)

  test('Pausa → Seguir mantiene la orientación fija: no se suelta ni se vuelve a fijar', async () => {
    await abrir('grabar')
    await empezar()
    await mostrarControles()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
    await esperar(50)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
    await esperar(50)
    expect(nativo.fijar).toHaveBeenCalledTimes(1)
    expect(nativo.soltar).not.toHaveBeenCalled()
  }, 20000)

  test('si la toma no logra empezar -un error al empezar-, vuelve a LISTO y la orientación se suelta', async () => {
    await abrir('leer')
    wake.fallar = true
    await act(async () => { fireEvent.click(screen.getByTestId('btn-empezar-toma')) })
    await esperar(200)
    expect(nativo.fijar).toHaveBeenCalledTimes(1)
    expect(nativo.soltar).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('btn-empezar-toma')).toBeTruthy()
    expect(screen.queryByTestId('velo-cuenta-regresiva')).toBeNull()
  }, 20000)

  test('si la app se desmonta con la toma andando, la orientación se suelta', async () => {
    const r = await abrir('leer')
    await empezar()
    r.unmount()
    await esperar(50)
    expect(nativo.soltar).toHaveBeenCalledTimes(1)
  }, 20000)

  test('al ir a segundo plano se suelta; al volver con la toma andando se fija la misma -repetir-', async () => {
    await abrir('leer')
    await empezar()
    await act(async () => { segundoPlano(true) })
    await esperar(50)
    expect(nativo.soltar).toHaveBeenCalledTimes(1)
    expect(nativo.soltar.mock.calls[0][0]).toEqual({ olvidar: false })
    await act(async () => { segundoPlano(false) })
    await esperar(50)
    expect(nativo.fijar).toHaveBeenCalledTimes(2)
    expect(nativo.fijar.mock.calls[1][0]).toEqual({ repetir: true })
  }, 20000)

  test('el registro para el moto g86: la rotación al empezar, la orientación fijada y la soltada', async () => {
    const m: any = await cargar('../lib/orientacionToma')
    m.limpiarRegistroOrientacion()
    await abrir('leer')
    await empezar()
    await mostrarControles()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-parar-lectura')) })
    await esperar(100)
    const l: string[] = m.lineasOrientacion()
    expect(l.find((x) => x.startsWith('fijada '))).toMatch(/^fijada motivo=empezar rotacion=270 orientacion=REVERSE_LANDSCAPE anterior=UNSPECIFIED natural=vertical anguloWeb=\S+ tipoWeb=\S+ ventana=\d+x\d+$/)
    expect(l.find((x) => x.startsWith('soltada '))).toMatch(/^soltada motivo=fin-de-toma orientacion=UNSPECIFIED rotacion=270 /)
  }, 20000)

  // GUARDIANAS: pasan hoy y tienen que seguir pasando.
  test('guardiana: en LISTO, en Leer y en Grabar, no se fija nada', async () => {
    await abrir('leer')
    await esperar(200)
    cleanup()
    await abrir('grabar')
    await esperar(200)
    expect(nativo.fijar).not.toHaveBeenCalled()
  }, 20000)

  test('guardiana: el visor de una toma no fija la orientación', async () => {
    render(<ReproductorGrabacion grabacion={grabacionNueva({ id: 't91', tituloGuion: 'Orientación', duracionMs: 5000, ruta: '/grabaciones/t91.mp4' })} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />)
    await esperar(100)
    expect(nativo.fijar).not.toHaveBeenCalled()
  })
})
