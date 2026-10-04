// TAREA 87, PASO 0 -03-10-2026-: el panel "Medición / Exportación". Se abre desde las herramientas
// de diagnóstico -los cinco toques a la marca, como T84a- y mide sin tocar las tomas.
import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import fs from 'fs'
import path from 'path'

const TOMA_REGISTRO = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const llamadas: any[] = []
let fallanBorrar: string[] = []

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 })
  }
}))

vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    listarDirectorio: async () => ['008a7133.mp4', '008a7133.motor.txt', 'sinreg01.mp4'],
    leerTexto: async () => TOMA_REGISTRO,
    borrarArchivo: async (ruta: string) => { llamadas.push(['borrarArchivo', ruta]) },
    guardarEnGaleria: async (ruta: string) => { llamadas.push(['tal cual', ruta]); return { ok: true, uri: 'content://media/9' } },
    guardarEnGaleriaConSubtitulos: async (ruta: string, subs: any[], estilo: string) => {
      llamadas.push(['quemada', ruta, subs.length, estilo])
      return { ok: true, uri: 'content://media/77' }
    },
    medirToma: async (ruta: string) => {
      llamadas.push(['medirToma', ruta])
      return { existe: true, bytes: 1000, duracionMs: 10000, anchoPx: 1920, altoPx: 1080, rotacion: 90, fps: 30, bitrateBps: 20000000, mimeVideo: 'video/avc', mimeAudio: 'audio/mp4a-latm', audioHz: 48000, audioCanales: 1 }
    },
    anotarMedicion: async (linea: string) => { llamadas.push(['logcat', linea]); return true },
    equipoMedicion: async () => ({ modelo: 'moto g86', android: '15', app: '0.2.0', depurable: true }),
    borrarCopiasDeMedicion: async (uris: string[]) => {
      llamadas.push(['borrarCopias', uris])
      return { borradas: uris.filter((u) => !fallanBorrar.includes(u)), fallidas: uris.filter((u) => fallanBorrar.includes(u)) }
    },
    escucharMediciones: async () => async () => {}
  }
})

import App from '../App'
import { PanelMediciones } from '../components/PanelMediciones'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { grabacionNueva } from '../datos/modelo'
import { copiasDeMedicion, anotarCopiaDeMedicion, registroGuardado, leerLineaSigoExport } from '../lib/medicionesExport'

const toma = grabacionNueva({ id: '008a7133', tituloGuion: 'Hola', duracionMs: 66000, ruta: '/grabaciones/008a7133.mp4', calidad: '1080p', creado: 2000 } as any)
const sinRegistro = grabacionNueva({ id: 'sinreg01', tituloGuion: 'Otra', duracionMs: 10000, ruta: '/grabaciones/sinreg01.mp4', creado: 1000 } as any)

async function esperar(ms = 30) {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)) })
}

function lineas(evento: string) {
  return registroGuardado().map(leerLineaSigoExport).filter((d) => d.evento === evento)
}

describe('Tarea 87 - paso 0: el panel de mediciones', () => {
  beforeEach(() => {
    localStorage.clear()
    llamadas.length = 0
    fallanBorrar = []
  })

  test('SE ABRE DESDE LAS HERRAMIENTAS DE DIAGNÓSTICO, debajo de "Medición / Panel Corpus"', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-87', titulo: 'Guion', idioma: 'es', creado: Date.now(), modificado: Date.now(), archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion' }]
    })
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    await screen.findByTestId('btn-leer-tarjeta')
    const marca = document.querySelector('.portada-marca') as HTMLElement
    for (let i = 0; i < 5; i++) fireEvent.click(marca)
    await esperar(50)
    const corpus = screen.getByTestId('btn-abrir-corpus')
    const mediciones = screen.getByTestId('btn-abrir-mediciones')
    expect(mediciones.textContent).toBe('Medición / Exportación')
    // Debajo: viene después en el documento.
    expect(corpus.compareDocumentPosition(mediciones) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(mediciones)
    await esperar()
    expect(screen.getByTestId('panel-mediciones')).toBeTruthy()
    // Al abrir se anota el equipo.
    expect(lineas('equipo')[0]?.modelo).toBe('moto g86')
  })

  test('MEDIR GUARDADO NO BORRA LA TOMA NI TOCA EL ÍNDICE, y anota la copia para borrarla después', async () => {
    render(<PanelMediciones grabaciones={[toma, sinRegistro]} calidadPedida="1080p" camaraActiva={false} />)
    await esperar()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-medir-guardado-008a7133')) })
    await esperar()
    const quemada = llamadas.find((l) => l[0] === 'quemada')
    expect(quemada).toBeTruthy()
    expect(quemada[1]).toBe('/grabaciones/008a7133.mp4')
    expect(quemada[2]).toBeGreaterThan(20)
    expect(quemada[3]).toBe('amarillo')
    expect(llamadas.some((l) => l[0] === 'borrarArchivo')).toBe(false)
    expect(copiasDeMedicion().map((c) => c.uri)).toEqual(['content://media/77'])
  })

  test('UNA TOMA SIN REGISTRO DE PALABRAS no ofrece medir el guardado, y dice por qué', async () => {
    render(<PanelMediciones grabaciones={[toma, sinRegistro]} calidadPedida="1080p" camaraActiva={false} />)
    await esperar()
    expect((screen.getByTestId('btn-medir-guardado-sinreg01') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('sin-registro-sinreg01')).toBeTruthy()
    expect((screen.getByTestId('btn-medir-guardado-008a7133') as HTMLButtonElement).disabled).toBe(false)
  })

  test('MEDIR FORMA escribe evento=forma con la forma del archivo y la calidad del índice', async () => {
    // La calidad pedida hoy -720p- no es la de la toma -1080p-: la línea lleva la de la toma.
    render(<PanelMediciones grabaciones={[toma]} calidadPedida="720p" camaraActiva={false} />)
    await esperar()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-medir-forma-008a7133')) })
    await esperar()
    const f = lineas('forma')[0]
    expect(f).toMatchObject({ id: '008a7133', ancho_px: '1920', alto_px: '1080', rot_grados: '90', fps: '30.00', calidad_toma: '1080p' })
    // Y la misma línea, sin la etiqueta, fue al logcat.
    expect(llamadas.some((l) => l[0] === 'logcat' && l[1].startsWith('v=1 evento=forma '))).toBe(true)
  })

  test('BORRAR COPIAS DE MEDICIÓN BORRA SOLO LAS QUE ANOTÓ EL PANEL, y deja las que no se pudieron', async () => {
    anotarCopiaDeMedicion({ uri: 'content://media/77', id: '008a7133', tMs: 1 })
    anotarCopiaDeMedicion({ uri: 'content://media/78', id: '008a7133', tMs: 2 })
    fallanBorrar = ['content://media/78']
    render(<PanelMediciones grabaciones={[toma]} calidadPedida="1080p" camaraActiva={false} />)
    await esperar()
    await act(async () => { fireEvent.click(screen.getByTestId('btn-borrar-copias-medicion')) })
    await esperar()
    const pedido = llamadas.find((l) => l[0] === 'borrarCopias')
    expect(pedido[1]).toEqual(['content://media/77', 'content://media/78'])
    expect(copiasDeMedicion().map((c) => c.uri)).toEqual(['content://media/78'])
    expect(lineas('copias_borradas')[0]).toMatchObject({ pedidas: '2', borradas: '1', fallidas: '1' })
    // Nunca se borra una toma de Sigo.
    expect(llamadas.some((l) => l[0] === 'borrarArchivo')).toBe(false)
  })

  test('EL ENSAYO SE MARCA ANTES: la toma creada después queda anotada con evento=ensayo', async () => {
    const { rerender } = render(<PanelMediciones grabaciones={[]} calidadPedida="1080p" camaraActiva={false} />)
    await esperar()
    fireEvent.click(screen.getByTestId('btn-ensayo-t20min'))
    expect(screen.getByTestId('ensayo-pendiente').textContent).toContain('t20min')
    const nueva = { ...toma, creado: Date.now() + 1000 }
    rerender(<PanelMediciones grabaciones={[nueva]} calidadPedida="1080p" camaraActiva={false} />)
    await esperar()
    expect(lineas('ensayo')[0]).toMatchObject({ id: '008a7133', ensayo: 't20min' })
    expect(screen.getByTestId('ensayo-pendiente').textContent).toBe('Sin ensayo pendiente.')
  })
})
