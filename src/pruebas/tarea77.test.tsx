import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

async function abrirListo(repo: RepositorioMemoria) {
  const { unmount } = render(<App repoOverride={repo} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId('fila-guion-g-77'))
  fireEvent.click(await screen.findByTestId('btn-leer-guion-fijo'))
  await waitFor(() => {
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
  })
  return unmount
}

describe('Tarea 77: fichas de LISTO y pantalla de Ajustes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  async function sembrar() {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-77',
      titulo: 'Guion ajustes',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto para las fichas de listo' }]
    })
    return repo
  }

  test('T77a La ficha de letra muestra el valor y el panel lo cambia.', async () => {
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ fontSize: 24 }))
    const unmount = await abrirListo(await sembrar())
    const ficha = screen.getByTestId('ficha-letra')
    expect(ficha.textContent).toMatch(/24/)
    fireEvent.click(ficha)
    expect(screen.getByTestId('panel-ficha-letra')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Aumentar letra panel'))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').fontSize).toBe(32)
    })
    unmount()
  })

  test('T77b Un solo panel a la vez.', async () => {
    const unmount = await abrirListo(await sembrar())
    fireEvent.click(screen.getByTestId('ficha-letra'))
    expect(screen.getByTestId('panel-ficha-letra')).toBeTruthy()
    fireEvent.click(screen.getByTestId('ficha-anclaje'))
    expect(screen.queryByTestId('panel-ficha-letra')).toBeNull()
    expect(screen.getByTestId('panel-ficha-anclaje')).toBeTruthy()
    unmount()
  })

  test('T77c Mas abre Ajustes y al cerrar la lectura sigue en LISTO.', async () => {
    const unmount = await abrirListo(await sembrar())
    fireEvent.click(screen.getByTestId('ficha-mas'))
    expect(screen.getByTestId('pantalla-ajustes')).toBeTruthy()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    unmount()
  })

  test('T77d El engranaje de la portada abre la misma pantalla de Ajustes.', async () => {
    render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-menu-superior-biblioteca'))
    expect(await screen.findByTestId('pantalla-ajustes')).toBeTruthy()
    expect(screen.queryByTestId('menu-superior-biblioteca')).toBeNull()
  })

  test('T77e Una fila de Ajustes abre su dialogo y aplicar cierra.', async () => {
    render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-menu-superior-biblioteca'))
    fireEvent.click(await screen.findByTestId('fila-tipo-letra'))
    expect(screen.getByTestId('dialogo-tipo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Serif' }))
    await waitFor(() => {
      expect(screen.queryByTestId('dialogo-tipo')).toBeNull()
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').tipoFuente).toBe('serif')
    })
  })

  test('T77f Los interruptores cambian y se guardan.', async () => {
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ mirror: false, mostrarTiempo: true }))
    render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-menu-superior-biblioteca'))
    fireEvent.click(screen.getByTestId('switch-espejo'))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').mirror).toBe(true)
    })
    fireEvent.click(screen.getByTestId('switch-mostrar-tiempo'))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').mostrarTiempo).toBe(false)
    })
  })
})

// 28-09-2026: migrada de letraEnLaToma.test.tsx. El cajon y el engranaje de LISTO
// se fueron; la letra se cambia en la ficha Aa y el ancho en Ajustes.
describe('Letra y ancho, migrados a fichas y Ajustes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('L1 En LISTO, la ficha Aa sube la letra un paso y el ancho angosto se guarda en Ajustes.', async () => {
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ fontSize: 24, modoCamara: 'frontal', fondoToma: 'detras' }))
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-letra',
      titulo: 'Guion letra',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto para probar la letra en la toma' }]
    })
    const { unmount } = render(<App repoOverride={repo} motor={new MotorFake()} />)

    fireEvent.click(await screen.findByTestId('fila-guion-g-letra'))
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })

    fireEvent.click(screen.getByTestId('ficha-letra'))
    fireEvent.click(screen.getByLabelText('Aumentar letra panel'))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').fontSize).toBe(32)
    })

    fireEvent.click(screen.getByTestId('ficha-mas'))
    fireEvent.click(screen.getByTestId('fila-ancho-texto'))
    fireEvent.click(within(screen.getByTestId('dialogo-ancho')).getByRole('button', { name: 'Angosto' }))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}').columnaAngosta).toBe(true)
    })

    unmount()
  })
  // 28-09-2026: la seccion Video salio de Ajustes. Los subtitulos tienen su ficha en Grabar, con la
  // misma clave que el reproductor; en Leer no hay ficha porque no hay video. Y Ajustes ya no muestra
  // calidad ni subtitulos en ninguna puerta.
  test('T77g Subtitulos: ficha en Grabar que guarda el estilo; no en Leer; fuera de Ajustes.', async () => {
    const sembrar = async () => {
      const r = new RepositorioMemoria()
      await r.guardar({ id: 'g-77', titulo: 'Guion ajustes', idioma: 'es', creado: Date.now(), modificado: Date.now(), archivado: false, bloques: [{ id: 'b1', nombre: '', texto: 'Texto para las fichas de listo' }] })
      return r
    }
    const repo = await sembrar()
    const { unmount } = render(<App repoOverride={repo} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('fila-guion-g-77'))
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))
    fireEvent.click(await screen.findByTestId('ficha-subtitulos'))
    fireEvent.click(screen.getByTestId('btn-subtitulo-formal'))
    expect(localStorage.getItem('sigo_subtitulos_estilo')).toBe('formal')
    expect(screen.getByTestId('ficha-subtitulos').textContent).toContain('Formal')
    fireEvent.click(screen.getByTestId('ficha-mas'))
    expect(screen.queryByTestId('fila-subtitulos')).toBeNull()
    expect(screen.queryByTestId('fila-calidad')).toBeNull()
    unmount()
    const u2 = await abrirListo(await sembrar())
    expect(screen.queryByTestId('ficha-subtitulos')).toBeNull()
    u2()
  })

})
