import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { MotorFake } from '../motor/MotorFake'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Capacitor } from '@capacitor/core'

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: vi.fn(() => false),
      getPlatform: vi.fn(() => 'web')
    },
    registerPlugin: vi.fn(() => ({ listo: () => new Promise(() => {}) }))
  }
})

function guionSimple(texto: string) {
  return {
    id: 'g-entrada',
    titulo: 'Guion',
    idioma: 'es' as const,
    creado: Date.now(),
    modificado: Date.now(),
    bloques: [{ id: 'b1', nombre: '', texto }]
  }
}

describe('entrada a tiempo', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
  })

  test('en nativo, la capa de la entrada existe desde el primer render', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const repo = new RepositorioMemoria()
    await repo.guardar(guionSimple('Hola mundo'))

    await act(async () => {
      render(<App motor={new MotorFake()} repoOverride={repo} />)
    })

    expect(screen.getByTestId('capa-entrada-espejo')).toBeTruthy()
  })

  test('si la vista deja de ser la portada, la entrada se cancela', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const repo = new RepositorioMemoria()
    await repo.guardar(guionSimple('Hola mundo'))

    let container: HTMLElement
    await act(async () => {
      const res = render(<App motor={new MotorFake()} repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId('capa-entrada-espejo')).toBeTruthy()

    const fila = container!.querySelector('[data-testid="fila-guion-g-entrada"]') as HTMLElement
    expect(fila).not.toBeNull()

    await act(async () => {
      fireEvent.click(fila)
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.queryByTestId('capa-entrada-espejo')).toBeNull()
  })
})
