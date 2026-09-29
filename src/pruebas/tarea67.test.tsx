import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import fs from 'fs'
import path from 'path'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import TiraGrabaciones from '../components/TiraGrabaciones'
import { grabacionNueva } from '../datos/modelo'
import { MS_AVISO_MANTENER, MS_MANTENER_APRETADO } from '../components/mantenerApretado'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

const recuperarMock = vi.fn()
vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return {
    ...actual,
    recuperarTomasPendientes: (...args: unknown[]) => recuperarMock(...args)
  }
})

async function portadaConGuion() {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-67',
    titulo: 'Guion 67',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto para las dos puertas' }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  await screen.findByTestId('btn-leer-tarjeta')
  return repo
}

describe('Tarea 67 - la casa de cada ajuste y el gesto que se siente', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    recuperarMock.mockImplementation(async (repo: { listar: () => Promise<unknown[]> }) => repo.listar())
  })

  test('la PORTADA ofrece las DOS puertas visibles, y Grabar entra con camara sin gesto', async () => {
    await portadaConGuion()
    expect(screen.getByTestId('btn-leer-tarjeta')).toBeDefined()
    expect(screen.getByTestId('btn-grabar-tarjeta')).toBeDefined()
    expect(screen.getByTestId('btn-grabar-tarjeta').textContent).toMatch(/Grabar/)
    fireEvent.click(screen.getByTestId('btn-grabar-tarjeta'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-con-camara')).toBe('si')
    })
  })

  test('los tres instrumentos NO estan en el menu de la portada; viven en la franja de diagnostico', async () => {
    await portadaConGuion()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    // 28-09-2026: el cajon se fue. El engranaje abre Ajustes; ahi esta Tema
    // y no estan los tres instrumentos.
    const ajustes = await screen.findByTestId('pantalla-ajustes')
    expect(screen.getByTestId('fila-tema')).not.toBeNull()
    expect(ajustes.textContent).not.toContain('Motor de voz')
    expect(ajustes.textContent).not.toContain('Ver transcripción en vivo')
    expect(ajustes.textContent).not.toContain('Medición / Panel Corpus')
    const marca = document.querySelector('.portada-marca') as HTMLElement
    for (let i = 0; i < 5; i++) {
      fireEvent.click(marca)
    }
    const nuestro = await screen.findByTestId('apartado-nuestro')
    expect(nuestro.textContent).toContain('Motor de voz')
    expect(nuestro.textContent).toContain('Ver transcripción en vivo')
    expect(nuestro.textContent).toContain('Medición / Panel Corpus')
  })

  test('los tres tiempos del gesto salen de UN archivo, no hay 500 ni 300 de mantener escritos a mano', () => {
    expect(MS_MANTENER_APRETADO).toBe(500)
    expect(MS_AVISO_MANTENER).toBe(300)
    const raiz = path.resolve(process.cwd(), 'src/components')
    const sucios: string[] = []
    function andar(dir: string) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name)
        if (item.isDirectory()) { andar(full); continue }
        if (!/\.(tsx|ts)$/.test(item.name)) continue
        if (item.name === 'mantenerApretado.ts' || item.name === 'movimiento.tsx' || item.name === 'EditorView.tsx' || item.name === 'Entrada.tsx') continue
        const txt = fs.readFileSync(full, 'utf-8')
        if (/setTimeout\(\s*[^,]+,\s*500\s*\)/.test(txt) || /setTimeout\(\s*[^,]+,\s*300\s*\)/.test(txt)) {
          sucios.push(path.relative(raiz, full))
        }
      }
    }
    andar(raiz)
    expect(sucios).toEqual([])
  })

  test('soltar entre los 300 y los 500 no abre el menu', async () => {
    vi.useFakeTimers()
    try {
      const toma = grabacionNueva({ id: 'toma-67', tituloGuion: 'Ensayo', ruta: '/x.mp4', duracionMs: 4000 })
      render(<TiraGrabaciones grabaciones={[toma]} onAbrir={() => {}} onBorrar={() => {}} />)
      const boton = screen.getByTestId('tarjeta-grabacion-toma-67').querySelector('button') as HTMLElement
      await act(async () => {
        fireEvent.mouseDown(boton)
        await vi.advanceTimersByTimeAsync(350)
        fireEvent.mouseUp(boton)
      })
      expect(screen.queryByTestId('menu-toma-toma-67')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  // Hasta la Tarea 72 este test cuidaba que "Idioma del guion" viviera en el
  // editor y no en la portada. En la 72 el selector se quito: en el APK el
  // motor ignora el idioma y el control no hacia nada. Ahora cuida que no
  // vuelva a aparecer en ninguno de los dos lados.
  test('"Idioma del guion" no existe ni en el menu de la portada ni en el panel del editor', async () => {
    await portadaConGuion()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    expect(screen.queryByText('Idioma del guion')).toBeNull()
    fireEvent.click(await screen.findByTestId('fila-guion-g-67'))
    fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
    // Se busca SOLO adentro de Ajustes: el diagnostico de la portada tiene
    // su propio <select> -el del motor, App.tsx- y no tiene que ver con esto.
    // 28-09-2026: el Aa abre la pantalla de Ajustes, no el cajon.
    const panel = await screen.findByTestId('pantalla-ajustes')
    expect(panel.textContent).not.toContain('Idioma del guion')
    expect(panel.querySelector('select')).toBeNull()
  })

  test('si recuperarTomasPendientes devuelve una toma, aparece el aviso con su accion', async () => {
    recuperarMock.mockImplementation(async (repo: { guardar: (g: unknown) => Promise<void>; listar: () => Promise<unknown[]> }) => {
      const toma = grabacionNueva({
        id: 'rescate-1', tituloGuion: 'Rescatada', ruta: '/x.mp4', duracionMs: 8000, incompleta: true
      })
      await repo.guardar(toma)
      return repo.listar()
    })
    await portadaConGuion()
    const aviso = await screen.findByTestId('aviso-flotante')
    expect(aviso.textContent).toMatch(/recuper/)
    expect(aviso.textContent).toContain('Verla')
    fireEvent.click(screen.getByText('Verla'))
    expect(await screen.findByTestId('reproductor-grabacion')).toBeDefined()
  })
})
