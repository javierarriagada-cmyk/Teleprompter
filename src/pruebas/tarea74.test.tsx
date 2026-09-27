import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

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

async function montarAppConGuion() {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-74',
    titulo: 'Guion 74',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion 74' }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  await screen.findByTestId('btn-leer-tarjeta')
  return repo
}

describe('Tarea 74 - El diagnóstico se abre con un gesto que nadie hace sin querer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('T74a: un clic en el titulo de la tarjeta NO abre la franja -no aparece "Medición / Panel Corpus"-', async () => {
    await montarAppConGuion()
    const portada = screen.getByTestId('tarjeta-lectura-portada')
    const titulo = portada.querySelector('[data-testid="titulo-tarjeta-lectura"]') as HTMLElement
    expect(titulo).not.toBeNull()

    fireEvent.click(titulo)

    expect(screen.queryByTestId('franja-de-estado-diagnostico')).toBeNull()
    expect(screen.queryByText('Medición / Panel Corpus')).toBeNull()
  })

  test('T74b: cinco clics seguidos en la marca la abren; otros cinco la cierran', async () => {
    await montarAppConGuion()
    const marca = document.querySelector('.portada-marca') as HTMLElement
    expect(marca).not.toBeNull()

    // 5 clics abren la franja
    for (let i = 0; i < 5; i++) {
      fireEvent.click(marca)
    }

    const franja = await screen.findByTestId('franja-de-estado-diagnostico')
    expect(franja).toBeDefined()
    expect(franja.textContent).toContain('Medición / Panel Corpus')

    // Otros 5 clics la cierran
    for (let i = 0; i < 5; i++) {
      fireEvent.click(marca)
    }

    expect(screen.queryByTestId('franja-de-estado-diagnostico')).toBeNull()
  })

  test('T74c: cuatro clics, esperar 700 ms, un clic mas: NO se abre', async () => {
    let ahoraFalso = 1000000
    const originalNow = Date.now
    Date.now = vi.fn(() => ahoraFalso)

    try {
      await montarAppConGuion()
      const marca = document.querySelector('.portada-marca') as HTMLElement
      expect(marca).not.toBeNull()

      // 4 clics en t = 1000000
      for (let i = 0; i < 4; i++) {
        ahoraFalso += 100
        fireEvent.click(marca)
      }

      // Esperar 700 ms
      ahoraFalso += 700

      // 1 clic mas
      fireEvent.click(marca)

      expect(screen.queryByTestId('franja-de-estado-diagnostico')).toBeNull()
    } finally {
      Date.now = originalNow
    }
  })
})
