// TAREA 87, PARTE E1 -04-10-2026-: "Guardar y compartir". <ReproductorGrabacion> solo, con
// vi.mock de '../lib/archivosNativos' como en subtitulosVisor.test.tsx.
import React from 'react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, act, fireEvent, screen, cleanup } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

const TOMA = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
const m = vi.hoisted(() => ({
  llamadas: [] as any[],
  guardadoOk: true,
  compartirFalla: null as string | null,
  retener: false,
  soltar: [] as Array<() => void>,
  avanzar: null as null | ((n: number) => void)
}))

vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  const responder = (uri: string) => {
    const res = m.guardadoOk ? { ok: true, uri } : { ok: false }
    if (!m.retener) return Promise.resolve(res)
    return new Promise((r) => m.soltar.push(() => r(res)))
  }
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async () => TOMA,
    tieneExportarToma: async () => true,
    analizarVideo: async () => { throw new Error('sin análisis') },
    guardarEnGaleria: async (ruta: string) => { m.llamadas.push(['tal cual', ruta]); return responder('content://media/1') },
    guardarEnGaleriaConSubtitulos: async (ruta: string, subs: any[], estilo: string, alAvanzar?: (n: number) => void, posicion?: string) => {
      m.llamadas.push(['quemada', ruta, subs.length, estilo, posicion])
      m.avanzar = alAvanzar || null
      return responder('content://media/2')
    },
    borrarArchivo: async (ruta: string) => { m.llamadas.push(['borrar', ruta]) },
    compartirDeGaleria: async (uri: string) => { m.llamadas.push(['compartir', uri]); if (m.compartirFalla) throw new Error(m.compartirFalla) }
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva, ResumenGrabacion } from '../datos/modelo'
import { es } from '../textos/es'

const toma = (extra: Partial<ResumenGrabacion> = {}) =>
  grabacionNueva({ id: '008a7133', tituloGuion: 'Hola', duracionMs: 66000, ruta: '/grabaciones/008a7133.mp4', orientacion: 'vertical', ...extra })

async function abrir(g: ResumenGrabacion, props: Record<string, unknown> = {}) {
  const onCambio = vi.fn()
  const onGuardadoEnGaleria = vi.fn()
  render(<ReproductorGrabacion grabacion={g} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} onCambio={onCambio} onGuardadoEnGaleria={onGuardadoEnGaleria} {...props} />)
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
  return { onCambio, onGuardadoEnGaleria }
}

async function tocar(testid: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testid))
    await new Promise((r) => setTimeout(r, 20))
  })
}

describe('Tarea 87, E1: Guardar y compartir', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
    m.llamadas.length = 0
    m.guardadoOk = true
    m.compartirFalla = null
    m.retener = false
    m.soltar.length = 0
  })

  test('GUARDAR Y COMPARTIR: si el guardado sale bien, compartir recibe esa uri', async () => {
    const { onCambio } = await abrir(toma())
    await tocar('btn-compartir-nueva')
    expect(m.llamadas[0].slice(0, 4)).toEqual(['quemada', '/grabaciones/008a7133.mp4', expect.any(Number), 'amarillo'])
    expect(m.llamadas).toContainEqual(['compartir', 'content://media/2'])
    // Una sola copia: el original se borra como al guardar.
    expect(m.llamadas).toContainEqual(['borrar', '/grabaciones/008a7133.mp4'])
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ galeriaUri: 'content://media/2', posicionGaleria: 'normal' }))
  })

  test('SIN SUBTÍTULOS TAMBIÉN: va la copia tal cual y después compartir', async () => {
    localStorage.setItem('sigo_subtitulos_estilo', 'no')
    await abrir(toma())
    await tocar('btn-compartir-nueva')
    expect(m.llamadas[0]).toEqual(['tal cual', '/grabaciones/008a7133.mp4'])
    expect(m.llamadas).toContainEqual(['compartir', 'content://media/1'])
  })

  test('TOMA HORIZONTAL: está el botón', async () => {
    await abrir(toma({ orientacion: 'horizontal' }))
    expect(screen.getByTestId('btn-compartir-nueva').getAttribute('aria-label')).toBe(es.guardarYCompartir)
  })

  test('SI EL GUARDADO FALLA, NO SE ABRE COMPARTIR y hay aviso', async () => {
    m.guardadoOk = false
    const { onGuardadoEnGaleria, onCambio } = await abrir(toma())
    await tocar('btn-compartir-nueva')
    expect(m.llamadas.some((l) => l[0] === 'compartir')).toBe(false)
    expect(onGuardadoEnGaleria).toHaveBeenCalledWith(false, es.galeriaNoSeGuardo)
    expect(onCambio).not.toHaveBeenCalled()
  })

  test('SI COMPARTIR FALLA, la toma igual queda guardada -onCambio con galeriaUri- y el aviso es compartirTrasGuardar', async () => {
    m.compartirFalla = 'el menú no se abrió'
    const { onGuardadoEnGaleria, onCambio } = await abrir(toma())
    await tocar('btn-compartir-nueva')
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ galeriaUri: 'content://media/2' }))
    expect(onGuardadoEnGaleria).toHaveBeenLastCalledWith(false, es.compartirTrasGuardar)
  })

  test('MIENTRAS GUARDA, el apretado muestra el avance y los demás están desactivados', async () => {
    m.retener = true
    await abrir(toma())
    await tocar('btn-compartir-nueva')
    await act(async () => { m.avanzar?.(37) })
    const apretado = screen.getByTestId('btn-compartir-nueva') as HTMLButtonElement
    expect(apretado.textContent).toContain('Guardando… 37%')
    expect(apretado.getAttribute('aria-busy')).toBe('true')
    const guardar = screen.getByTestId('guardar-galeria-desde-reproductor') as HTMLButtonElement
    expect(guardar.disabled).toBe(true)
    expect(guardar.textContent).not.toContain('Guardando')
    expect((screen.getByTestId('btn-repetir-toma') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('borrar-desde-reproductor') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('btn-subtitulos') as HTMLButtonElement).disabled).toBe(true)
    // La X sigue activa: cerrar no cancela -respuesta de Claude del 04-10-.
    expect((screen.getByTestId('btn-cerrar-reproductor') as HTMLButtonElement).disabled).toBe(false)
    // Volver a tocar el apretado no guarda dos veces.
    await tocar('btn-compartir-nueva')
    expect(m.llamadas.filter((l) => l[0] === 'quemada').length).toBe(1)
    await act(async () => { m.soltar.forEach((f) => f()); await new Promise((r) => setTimeout(r, 20)) })
    expect(m.llamadas).toContainEqual(['compartir', 'content://media/2'])
  })

  test('TOMA YA GUARDADA: no hay btn-compartir-nueva', async () => {
    await abrir(toma({ galeriaUri: 'content://media/9', ruta: 'content://media/9' }))
    expect(screen.queryByTestId('btn-compartir-nueva')).toBeNull()
    expect(screen.getByTestId('btn-compartir-toma')).not.toBeNull()
  })
})
