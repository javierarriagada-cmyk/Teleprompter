import React from 'react'
import { elegirEstiloEnVisor } from './ayudaEstiloVisor'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
let registroDisponible = true
const llamadas: any[] = []
let compartirFalla: string | null = null

vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async (ruta: string) => {
      if (!registroDisponible) throw new Error('no existe ' + ruta)
      return TOMA
    },
    guardarEnGaleria: async (ruta: string) => { llamadas.push(['tal cual', ruta]); return { ok: true, uri: 'content://media/1' } },
    guardarEnGaleriaConSubtitulos: async (ruta: string, subs: any[], estilo: string) => { llamadas.push(['quemada', ruta, subs.length, estilo]); return { ok: true, uri: 'content://media/2' } },
    borrarArchivo: async (ruta: string) => { llamadas.push(['borrar', ruta]) },
    compartirDeGaleria: async (uri: string) => { llamadas.push(['compartir', uri]); if (compartirFalla) throw new Error(compartirFalla) }
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva } from '../datos/modelo'

const toma = grabacionNueva({ id: '008a7133', tituloGuion: 'Hola', duracionMs: 66000, ruta: '/grabaciones/008a7133.mp4' })

async function abrirVisor() {
  render(<ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} />)
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
}

// El video de jsdom no tiene imagen: se le da el tamano de una toma vertical
// y una hora, para que la capa sepa donde y que dibujar.
function darImagenAlVideo(ms: number) {
  const v = screen.getByTestId('video-grabacion') as HTMLVideoElement
  Object.defineProperty(v, 'videoWidth', { value: 1080, configurable: true })
  Object.defineProperty(v, 'videoHeight', { value: 1920, configurable: true })
  Object.defineProperty(v, 'clientWidth', { value: 360, configurable: true })
  Object.defineProperty(v, 'clientHeight', { value: 640, configurable: true })
  Object.defineProperty(v, 'currentTime', { value: ms / 1000, configurable: true, writable: true })
  fireEvent(v, new Event('loadedmetadata'))
  fireEvent(v, new Event('seeked'))
}

describe('Los subtitulos en el visor de la toma', () => {
  beforeEach(() => {
    localStorage.clear()
    registroDisponible = true
    llamadas.length = 0
    compartirFalla = null
  })

  test('UN BOTON QUE SE DESPLIEGA: dice lo elegido, abre cuatro opciones y se cierra solo al elegir', async () => {
    await abrirVisor()
    const boton = screen.getByTestId('btn-subtitulos')
    expect(boton.textContent).toContain('No')
    expect(screen.queryByTestId('opciones-subtitulos')).toBeNull()

    await act(async () => { fireEvent.click(boton) })
    const opciones = screen.getByTestId('opciones-subtitulos')
    expect(opciones.querySelectorAll('button').length).toBe(4)

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Rojo' })) })
    expect(screen.queryByTestId('opciones-subtitulos')).toBeNull()
    expect(screen.getByTestId('btn-subtitulos').textContent).toContain('Rojo')
  })

  // -tomas-largas, 15-10-2026, decisión de Javier- Cada toma parte en «No»; lo elegido es solo de esa toma. Antes:
  // test('SE RECUERDA LA ULTIMA ELECCION: la toma siguiente ya la trae', async () => {
  //   await abrirVisor()
  //   await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
  //   await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Formal' })) })
  //   document.body.innerHTML = ''
  //   await abrirVisor()
  //   expect(screen.getByTestId('btn-subtitulos').textContent).toContain('Formal')
  // })
  test('CADA TOMA PARTE EN «NO»: lo elegido en una no pasa a la siguiente, ni lo guardado antes con Amarillo', async () => {
    // Lo que dejaba la versión anterior -o Ajustes y LISTO, que siguen escribiendo esta clave-.
    localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
    await abrirVisor()
    expect(screen.getByTestId('btn-subtitulos').textContent).toContain('No')
    expect(screen.queryByTestId('capa-subtitulos')).toBeNull()
    await elegirEstiloEnVisor('Formal')
    expect(screen.getByTestId('btn-subtitulos').textContent).toContain('Formal')
    // Elegir en el visor ya no se recuerda.
    expect(localStorage.getItem('sigo_subtitulos_estilo')).toBe('amarillo')
    document.body.innerHTML = ''
    await abrirVisor()
    expect(screen.getByTestId('btn-subtitulos').textContent).toContain('No')
    expect(screen.getByTestId('btn-subtitulos').textContent).not.toContain('Formal')
  })

  test('SOBRE EL VIDEO se ve el subtitulo de ese instante, con la palabra en su estado; con "No", nada', async () => {
    // -tomas-largas- Cada toma parte en «No»: se elige en el visor. Antes: localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
    await abrirVisor()
    await elegirEstiloEnVisor('Amarillo')
    // A los 8,3 s dice "No dice solo que a veces / somos egoistas o crueles" y
    // va por "veces": "somos" empieza a los 8,655 s.
    await act(async () => { darImagenAlVideo(8300) })
    const capa = screen.getByTestId('capa-subtitulos')
    expect(capa.textContent).toContain('No dice solo que a veces')
    const somos = Array.from(capa.querySelectorAll('.subtitulo-palabra')).find((e) => e.textContent === 'somos')!
    const no = Array.from(capa.querySelectorAll('.subtitulo-palabra')).find((e) => e.textContent === 'No')!
    expect(no.getAttribute('data-estado')).toBe('dicha')
    expect(somos.getAttribute('data-estado')).toBe('por-decir')

    await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'No' })) })
    expect(screen.queryByTestId('capa-subtitulos')).toBeNull()
  })

  test('UNA TOMA SIN REGISTRO no ofrece el boton, y el visor funciona igual', async () => {
    registroDisponible = false
    await abrirVisor()
    expect(screen.queryByTestId('btn-subtitulos')).toBeNull()
    expect(screen.getByTestId('video-grabacion')).toBeTruthy()
  })

  test('SE GUARDA LO QUE SE VE: con un estilo elegido va la copia quemada, y la toma queda anotada como guardada con ese estilo', async () => {
    // -tomas-largas- Cada toma parte en «No»: se elige en el visor. Antes: localStorage.setItem('sigo_subtitulos_estilo', 'rojo')
    const cambios: any[] = []
    render(<ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} onCambio={(g) => cambios.push(g)} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    await elegirEstiloEnVisor('Rojo')
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    expect(llamadas[0][0]).toBe('quemada')
    expect(llamadas[0][2]).toBeGreaterThan(20)
    expect(llamadas[0][3]).toBe('rojo')
    expect(cambios[0].galeriaUri).toBe('content://media/2')
    expect(cambios[0].estiloGaleria).toBe('rojo')
    // Una sola copia: la de Sigo se borra y la toma apunta a la de la galeria.
    expect(llamadas).toContainEqual(['borrar', '/grabaciones/008a7133.mp4'])
    expect(cambios[0].ruta).toBe('content://media/2')
  })

  test('CON "No" va la toma tal cual', async () => {
    const cambios: any[] = []
    render(<ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} onCambio={(g) => cambios.push(g)} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    expect(llamadas[0][0]).toBe('tal cual')
    expect(cambios[0].estiloGaleria).toBe('no')
  })

  test('UNA TOMA YA GUARDADA ofrece Compartir y Borrar, y nada mas', async () => {
    const guardada = { ...toma, galeriaUri: 'content://media/2', estiloGaleria: 'amarillo' as const }
    render(<ReproductorGrabacion grabacion={guardada} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(screen.getByTestId('btn-compartir-toma')).toBeTruthy()
    expect(screen.getByTestId('borrar-desde-reproductor')).toBeTruthy()
    expect(screen.queryByTestId('guardar-galeria-desde-reproductor')).toBeNull()
    expect(screen.queryByTestId('btn-subtitulos')).toBeNull()
    expect(screen.queryByTestId('btn-repetir-toma')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-compartir-toma')) })
    expect(llamadas).toContainEqual(['compartir', 'content://media/2'])
  })

  test('SI LA COPIA SE BORRO DESDE LA GALERIA, la toma deja de aparecer, sin aviso', async () => {
    compartirFalla = 'no existe'
    const borradas: string[] = []
    const avisos: any[] = []
    const guardada = { ...toma, galeriaUri: 'content://media/2', estiloGaleria: 'amarillo' as const }
    render(<ReproductorGrabacion grabacion={guardada} onCerrar={() => {}} onBorrar={(id) => borradas.push(id)} onGuardadoEnGaleria={(...a) => avisos.push(a)} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-compartir-toma')) })
    expect(borradas).toEqual(['008a7133'])
    expect(avisos).toEqual([])
  })
})
