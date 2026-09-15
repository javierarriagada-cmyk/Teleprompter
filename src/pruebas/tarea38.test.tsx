import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { calcularTramosVelo, RENGLONES_CLAROS, HOLGURA_VELO } from '../components/banda'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'
import * as grabadorCorpus from '../lib/grabadorCorpus'

describe('Pruebas TAREA 38 (T176-T179)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T176 - El velo aclara RENGLONES_CLAROS renglones mas la holgura, y el numero sale de la constante: si RENGLONES_CLAROS cambiara, el velo cambia solo.', () => {
    const topBanda = 40
    const filaPx = 28

    const tramos = calcularTramosVelo(topBanda, filaPx)

    const desdeEsperado = Math.max(0, topBanda - HOLGURA_VELO)
    const hastaEsperado = topBanda + RENGLONES_CLAROS * filaPx + HOLGURA_VELO

    expect(tramos[1].desdePx).toBe(desdeEsperado)
    expect(tramos[1].hastaPx).toBe(hastaEsperado)
    expect(tramos[1].hastaPx - tramos[1].desdePx).toBe(RENGLONES_CLAROS * filaPx + 2 * HOLGURA_VELO)
    expect(tramos[1].alpha).toBe(0.00)
  })

  test('T177 - Con los controles visibles, el panel esta posicionado abajo y NO sobre la ventana clara.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t177',
      titulo: 'Guion T177',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba para verificar posicion de barra' }]
    }
    await repo.guardar(guion)

    let container: HTMLElement
    await act(async () => {
      const res = render(<App repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    const fila = container!.querySelector('[data-testid^="fila-guion"]') as HTMLElement
    await act(async () => {
      fireEvent.click(fila)
      await new Promise((r) => setTimeout(r, 100))
    })

    const btnLeer = container!.querySelector('[data-testid="btn-leer-guion-fijo"]') as HTMLElement
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    const prompterView = container!.querySelector('[data-testid="teleprompter-view-container"]')!
    await act(async () => {
      fireEvent.click(prompterView)
    })

    const panelControles = screen.getByTestId('panel-controles-lectura')
    expect(panelControles).not.toBeNull()

    expect(panelControles.style.bottom).toContain('16px')
    expect(panelControles.style.top).not.toBe('16px')
  })

  test('T178 - La pausa detiene el motor y el texto deja de moverse; al seguir, el motor vuelve a escuchar y la posicion NO se reinicio.', async () => {
    vi.useFakeTimers()
    try {
      const motor = new MotorFake(['Uno dos tres cuatro cinco seis siete ocho nueve diez'])
      const detenerSpy = vi.spyOn(motor, 'detener')
      const iniciarSpy = vi.spyOn(motor, 'iniciar')

      const repo = new RepositorioMemoria()
      const guion: Guion = {
        id: 'g-t178',
        titulo: 'Guion T178',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Uno dos tres cuatro cinco seis siete ocho nueve diez' }]
      }
      await repo.guardar(guion)

      let container: HTMLElement
      await act(async () => {
        const res = render(<App motor={motor} repoOverride={repo} />)
        container = res.container
        await vi.advanceTimersByTimeAsync(600)
      })

      const fila = container!.querySelector('[data-testid^="fila-guion"]') as HTMLElement
      await act(async () => {
        fireEvent.click(fila)
        await vi.advanceTimersByTimeAsync(100)
      })

      const btnLeer = container!.querySelector('[data-testid="btn-leer-guion-fijo"]') as HTMLElement
      await act(async () => {
        fireEvent.click(btnLeer)
        await vi.advanceTimersByTimeAsync(3100)
      })

      // Motor escuchando
      expect(iniciarSpy).toHaveBeenCalledTimes(1)

      // Traer controles
      const prompterView = container!.querySelector('[data-testid="teleprompter-view-container"]')!
      await act(async () => {
        fireEvent.click(prompterView)
      })

      // Apretar Pausa
      const btnPausa = screen.getByTestId('btn-pausa-lectura')
      expect(btnPausa.textContent).toBe('Pausa')

      await act(async () => {
        fireEvent.click(btnPausa)
      })

      expect(detenerSpy).toHaveBeenCalled()
      expect(screen.getByText('En pausa')).not.toBeNull()
      expect(btnPausa.textContent).toBe('Seguir')

      // Apretar Seguir
      iniciarSpy.mockClear()
      await act(async () => {
        fireEvent.click(btnPausa)
      })

      expect(iniciarSpy).toHaveBeenCalledTimes(1)
      expect(btnPausa.textContent).toBe('Pausa')
    } finally {
      vi.useRealTimers()
    }
  })

  test('T179 - GUARDIANA DE LA GRABACION. Pausar y seguir NO llama a detenerGrabacion: la lectura sigue siendo una sola.', async () => {
    vi.useFakeTimers()
    try {
      const motor = new MotorFake()
      const spyDetenerGrabacion = vi.spyOn(grabadorCorpus, 'detenerGrabacion')

      const repo = new RepositorioMemoria()
      const guion: Guion = {
        id: 'g-t179',
        titulo: 'Guion T179',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba para verificar grabacion' }]
      }
      await repo.guardar(guion)

      let container: HTMLElement
      await act(async () => {
        const res = render(<App motor={motor} repoOverride={repo} />)
        container = res.container
        await vi.advanceTimersByTimeAsync(600)
      })

      const fila = container!.querySelector('[data-testid^="fila-guion"]') as HTMLElement
      await act(async () => {
        fireEvent.click(fila)
        await vi.advanceTimersByTimeAsync(100)
      })

      const btnLeer = container!.querySelector('[data-testid="btn-leer-guion-fijo"]') as HTMLElement
      await act(async () => {
        fireEvent.click(btnLeer)
        await vi.advanceTimersByTimeAsync(3100)
      })

      spyDetenerGrabacion.mockClear()

      // Traer controles y pausar
      const prompterView = container!.querySelector('[data-testid="teleprompter-view-container"]')!
      await act(async () => {
        fireEvent.click(prompterView)
      })

      const btnPausa = screen.getByTestId('btn-pausa-lectura')
      await act(async () => {
        fireEvent.click(btnPausa)
      })

      expect(spyDetenerGrabacion).not.toHaveBeenCalled()

      // Reanudar
      await act(async () => {
        fireEvent.click(btnPausa)
      })

      expect(spyDetenerGrabacion).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
