// TAREA 88 -04-10-2026-: el visor de una toma con pausas. <ReproductorGrabacion> solo, con vi.mock de
// '../lib/archivosNativos' como en tarea87-compartir.test.tsx. La toma del corpus dura 66 s y tiene
// una pausa por botón de 10 s a 20 s: queda un corte [10000, 20000] y la toma final dura 56 s.
import React from 'react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, act, fireEvent, screen, cleanup } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const m = vi.hoisted(() => ({ llamadas: [] as any[] }))

vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async () => TOMA,
    analizarVideo: async () => { throw new Error('sin análisis') },
    guardarEnGaleria: async (ruta: string) => { m.llamadas.push(['tal cual', ruta]); return { ok: true, uri: 'content://media/1' } },
    guardarEnGaleriaConSubtitulos: async (ruta: string) => { m.llamadas.push(['quemada', ruta]); return { ok: true, uri: 'content://media/2' } },
    exportarAGaleria: async (ruta: string, receta: any) => { m.llamadas.push(['receta', ruta, receta]); return { ok: true, uri: 'content://media/3' } },
    borrarArchivo: async (ruta: string) => { m.llamadas.push(['borrar', ruta]) },
    compartirDeGaleria: async () => {}
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva, ResumenGrabacion } from '../datos/modelo'
import { subtitulosConCortes } from '../lib/subtitulos'

const toma = (extra: Partial<ResumenGrabacion> = {}) =>
  grabacionNueva({
    id: '008a7133', tituloGuion: 'Hola', duracionMs: 66000, ruta: '/grabaciones/008a7133.mp4', orientacion: 'vertical',
    pausas: [{ desdeMs: 10000, hastaMs: 20000, origen: 'boton' }],
    ...extra
  })

async function abrir(g: ResumenGrabacion) {
  const onCambio = vi.fn()
  render(<ReproductorGrabacion grabacion={g} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} onCambio={onCambio} onGuardadoEnGaleria={() => {}} />)
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
  return { onCambio }
}

// La hora del <video> de jsdom no avanza sola: se finge con un getter y un setter espiado.
function fingirHora(video: HTMLVideoElement, inicial: number) {
  let hora = inicial
  const puestas: number[] = []
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => hora,
    set: (v: number) => { puestas.push(v); hora = v }
  })
  return { puestas, mover: (v: number) => { hora = v } }
}

describe('Tarea 88: el visor de una toma con pausas', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
    m.llamadas.length = 0
  })

  test('salta el corte una sola vez', async () => {
    await abrir(toma())
    const video = screen.getByTestId('video-grabacion') as HTMLVideoElement
    const hora = fingirHora(video, 10.2)
    await act(async () => {
      fireEvent.timeUpdate(video)
      fireEvent.timeUpdate(video)
    })
    // Dos timeupdate antes de seeked: un solo salto, al final del corte.
    expect(hora.puestas).toEqual([20])
    await act(async () => { fireEvent(video, new Event('seeked')) })
    hora.mover(25)
    await act(async () => { fireEvent.timeUpdate(video) })
    expect(hora.puestas).toEqual([20])
    // La barra va en el reloj de la salida: 25 s del archivo son 15 s de la toma final.
    expect(Number((screen.getByTestId('avance-toma') as HTMLInputElement).value)).toBe(15)
  })

  test('la barra muestra la duración final', async () => {
    await abrir(toma())
    const barra = screen.getByTestId('avance-toma') as HTMLInputElement
    expect(Number(barra.max)).toBe(56)
    expect(document.body.textContent).toContain('0:56')
    expect(document.body.textContent).not.toContain('1:06')
    // Al arrastrar a los 12 s de la salida, el video va a los 22 s del archivo.
    const video = screen.getByTestId('video-grabacion') as HTMLVideoElement
    const hora = fingirHora(video, 0)
    await act(async () => { fireEvent.change(barra, { target: { value: '12' } }) })
    expect(hora.puestas).toEqual([22])
  })

  test('los subtítulos del visor son los de la receta', async () => {
    const { onCambio } = await abrir(toma())
    await act(async () => {
      fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor'))
      await new Promise((r) => setTimeout(r, 20))
    })
    const receta = m.llamadas.find((l) => l[0] === 'receta')?.[2]
    expect(receta).toBeTruthy()
    expect(receta.tramos).toEqual([{ desdeMs: 0, hastaMs: 10000 }, { desdeMs: 20000, hastaMs: 66000 }])
    expect(receta.subtitulos).toEqual(subtitulosConCortes(TOMA, 'vertical', [{ desdeMs: 10000, hastaMs: 20000 }]))
    expect(receta.subtitulos.length).toBeGreaterThan(0)
    // Ninguno cae en el corte llevado a la salida: todos terminan antes de los 56 s.
    expect(receta.subtitulos.every((s: any) => s.hastaMs <= 56000)).toBe(true)
    // La copia ya va cortada: sin pausas y con la duración final.
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ galeriaUri: 'content://media/3', duracionMs: 56000, pausas: undefined }))
  })

  test('con estilo No y cortes también va por la receta, con los tramos y sin subtítulos', async () => {
    localStorage.setItem('sigo_subtitulos_estilo', 'no')
    await abrir(toma())
    await act(async () => {
      fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor'))
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(m.llamadas.some((l) => l[0] === 'tal cual')).toBe(false)
    const receta = m.llamadas.find((l) => l[0] === 'receta')?.[2]
    expect(receta.estilo).toBe('no')
    expect(receta.subtitulos).toEqual([])
    expect(receta.tramos).toHaveLength(2)
  })

  test('sin pausas, el guardado es el de siempre', async () => {
    await abrir(toma({ pausas: undefined }))
    await act(async () => {
      fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor'))
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(m.llamadas[0][0]).toBe('quemada')
    expect(m.llamadas.some((l) => l[0] === 'receta')).toBe(false)
  })
})
