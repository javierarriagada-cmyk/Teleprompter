// TAREA 84 -29-09-2026-: la versión de Google Play, SIN las herramientas de prueba. La variable se
// fija ANTES de importar la app -vi.hoisted corre antes que los import-: src/lib/herramientas.ts la
// lee una vez, al cargarse, como la leerá el paquete armado con --mode play. Por eso va en su propio
// archivo: en el resto de las pruebas VITE_HERRAMIENTAS no existe y las herramientas siguen, como
// en la APK de prueba. El control -los mismos cinco toques SÍ abren- es T84a de tarea84.test.tsx.
import React from 'react'
import { describe, test, expect, afterAll, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubEnv('VITE_HERRAMIENTAS', '0')
})

import { render, screen, fireEvent, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { HERRAMIENTAS } from '../lib/herramientas'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 })
  }
}))

vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return {
    ...actual,
    recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar()
  }
})

describe('Tarea 84 - Play sin herramientas de prueba', () => {
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  test('T84-play Con VITE_HERRAMIENTAS=0 los cinco toques sobre la marca no abren el diagnóstico ni el corpus.', async () => {
    expect(HERRAMIENTAS).toBe(false)
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-84p',
      titulo: 'Guion Play',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion para Play' }]
    })
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    await screen.findByTestId('btn-leer-tarjeta')
    const marca = document.querySelector('.portada-marca') as HTMLElement
    expect(marca).not.toBeNull()
    for (let i = 0; i < 5; i++) fireEvent.click(marca)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.queryByTestId('franja-de-estado-diagnostico')).toBeNull()
    expect(screen.queryByText('Medición / Panel Corpus')).toBeNull()
    expect(screen.queryByText('Medición / Panel de Corpus')).toBeNull()
  })
})
