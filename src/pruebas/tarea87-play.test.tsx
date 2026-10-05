// TAREA 87, PASO 0 -03-10-2026-: en la versión de Play no existe el panel de mediciones. Como en
// tarea84-play.test.tsx, la variable se fija ANTES de importar la app y por eso va en su archivo.
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

describe('Tarea 87 - paso 0 en Play', () => {
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  test('EL PANEL SOLO EXISTE CON HERRAMIENTAS: con VITE_HERRAMIENTAS=0 no hay btn-abrir-mediciones', async () => {
    expect(HERRAMIENTAS).toBe(false)
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-87p', titulo: 'Guion Play', idioma: 'es', creado: Date.now(), modificado: Date.now(), archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion para Play' }]
    })
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    await screen.findByTestId('btn-leer-tarjeta')
    const marca = document.querySelector('.portada-marca') as HTMLElement
    for (let i = 0; i < 5; i++) fireEvent.click(marca)
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(screen.queryByTestId('btn-abrir-mediciones')).toBeNull()
    expect(screen.queryByTestId('panel-mediciones')).toBeNull()
    expect(screen.queryByText('Medición / Exportación')).toBeNull()
  })
})
