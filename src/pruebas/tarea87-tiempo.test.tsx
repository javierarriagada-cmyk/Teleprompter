// TAREA 87, E2 -04-10-2026-: el tiempo estimado en el visor. <ReproductorGrabacion> como en
// tarea89.test.tsx, con vi.mock de '../lib/archivosNativos' como en subtitulosVisor.test.tsx.
import React from 'react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, act, fireEvent, screen, cleanup } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const m = vi.hoisted(() => ({ hayRegistro: true, soltar: [] as Array<() => void>, avanzar: null as null | ((n: number) => void) }))

vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async (ruta: string) => { if (!m.hayRegistro) throw new Error('no existe ' + ruta); return TOMA },
    tieneExportarToma: async () => true,
    analizarVideo: async () => { throw new Error('sin análisis') },
    guardarEnGaleriaConSubtitulos: (_r: string, _s: any[], _e: string, alAvanzar?: (n: number) => void) => {
      m.avanzar = alAvanzar || null
      return new Promise((r) => m.soltar.push(() => r({ ok: true, uri: 'content://media/2' })))
    },
    borrarArchivo: async () => {}
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva, ResumenGrabacion } from '../datos/modelo'

const toma = (extra: Partial<ResumenGrabacion> = {}) =>
  grabacionNueva({ id: '008a7133', tituloGuion: 'Hola', duracionMs: 300_000, ruta: '/grabaciones/008a7133.mp4', orientacion: 'vertical', ...extra })

async function abrir(g: ResumenGrabacion) {
  render(<ReproductorGrabacion grabacion={g} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} onCambio={() => {}} onGuardadoEnGaleria={() => {}} />)
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
}

describe('Tarea 87, E2: el tiempo estimado en el visor', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
    m.hayRegistro = true
    m.soltar.length = 0
  })

  test('TOMA DE 5 MIN CON SUBTÍTULOS: dice "Guardar tarda alrededor de 1 min"', async () => {
    await abrir(toma())
    expect(screen.getByTestId('tiempo-estimado-guardado').textContent).toBe('Guardar tarda alrededor de 1 min')
    expect(screen.getByTestId('tiempo-estimado-guardado').className).toContain('texto-meta')
  })

  test('TOMA DE 30 S: no hay tiempo-estimado-guardado', async () => {
    await abrir(toma({ duracionMs: 30_000 }))
    expect(screen.queryByTestId('tiempo-estimado-guardado')).toBeNull()
  })

  test('ESTILO NO: no hay', async () => {
    localStorage.setItem('sigo_subtitulos_estilo', 'no')
    await abrir(toma())
    expect(screen.queryByTestId('tiempo-estimado-guardado')).toBeNull()
  })

  test('SIN REGISTRO DE PALABRAS: no hay', async () => {
    m.hayRegistro = false
    await abrir(toma())
    expect(screen.queryByTestId('tiempo-estimado-guardado')).toBeNull()
  })

  test('TOMA GUARDADA: no hay', async () => {
    await abrir(toma({ galeriaUri: 'content://media/9', ruta: 'content://media/9' }))
    expect(screen.queryByTestId('tiempo-estimado-guardado')).toBeNull()
  })

  test('MIENTRAS GUARDA: no hay, y el botón muestra el avance como hoy', async () => {
    await abrir(toma())
    await act(async () => { fireEvent.click(screen.getByTestId('guardar-galeria-desde-reproductor')) })
    await act(async () => { m.avanzar?.(12) })
    expect(screen.queryByTestId('tiempo-estimado-guardado')).toBeNull()
    expect(screen.getByTestId('guardar-galeria-desde-reproductor').textContent).toContain('Guardando… 12%')
    await act(async () => { m.soltar.forEach((f) => f()); await new Promise((r) => setTimeout(r, 20)) })
  })
})
