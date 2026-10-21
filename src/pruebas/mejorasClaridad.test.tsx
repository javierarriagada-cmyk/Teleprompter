// MEJORAS DE CLARIDAD -21-10-2026, PR #148-. Solo lógica: nada de posiciones, orden ni medidas.
// - La duración aproximada: «≈18 min», minutos redondeados de la misma estimación, y «≈1 min» bajo un minuto.
// - Borrar un guion: 6 s con Deshacer; Deshacer lo recupera; a los 6 s se borra.
import React from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render, act, screen, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion, duracionAproximada, duracionDeLectura } from '../datos/modelo'

describe('Mejoras de claridad: la duración aproximada', () => {
  test('MC1 2631 palabras son «≈18 min»: la misma estimación de 17:32, redondeada', () => {
    expect(duracionDeLectura(2631)).toBe('17:32 min')
    expect(duracionAproximada(2631)).toBe('≈18 min')
  })
  test('MC2 bajo un minuto dice «≈1 min» y no «48 s»', () => {
    expect(duracionDeLectura(120)).toBe('48 s')
    expect(duracionAproximada(120)).toBe('≈1 min')
    expect(duracionAproximada(1)).toBe('≈1 min')
  })
  test('MC3 redondea al minuto más cercano y sin palabras dice vacío, como antes', () => {
    expect(duracionAproximada(150 * 2 + 70)).toBe('≈2 min')
    expect(duracionAproximada(150 * 2 + 80)).toBe('≈3 min')
    expect(duracionAproximada(0)).toBe(duracionDeLectura(0))
  })
})

describe('Mejoras de claridad: borrar un guion', () => {
  async function borrar(id: string) {
    const fila = screen.getByTestId(`fila-guion-${id}`)
    await act(async () => {
      fireEvent(fila, new MouseEvent('pointerdown', { clientX: 200, clientY: 100, bubbles: true }))
      fireEvent(fila, new MouseEvent('pointermove', { clientX: 100, clientY: 100, bubbles: true }))
      fireEvent(fila, new MouseEvent('pointerup', { clientX: 100, clientY: 100, bubbles: true }))
    })
  }
  test('MC4 el guion se queda 6 s con Deshacer, Deshacer lo recupera, y si nadie lo toca se borra a los 6 s', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      const guion: Guion = { id: 'g-mc4', titulo: 'Guion MC4', idioma: 'es', creado: Date.now(), modificado: Date.now(), archivado: false, bloques: [{ id: 'b1', nombre: '', texto: 'Texto MC4' }] }
      await repo.guardar(guion)
      render(<App repoOverride={repo} />)
      await act(async () => { await vi.advanceTimersByTimeAsync(200) })

      // 1. Borrado: a los 5,5 s sigue guardado y el aviso con Deshacer sigue ahí.
      await borrar('g-mc4')
      await act(async () => { await vi.advanceTimersByTimeAsync(5500) })
      expect((await repo.listar()).some((g) => g.id === 'g-mc4')).toBe(true)
      const deshacer = screen.getByText('Deshacer')

      // 2. Deshacer lo recupera: pasados otros 6 s sigue guardado y vuelve a la lista.
      await act(async () => {
        fireEvent.click(deshacer)
        await vi.advanceTimersByTimeAsync(6500)
      })
      expect((await repo.listar()).some((g) => g.id === 'g-mc4')).toBe(true)
      expect(screen.getByTestId('fila-guion-g-mc4')).not.toBeNull()

      // 3. Sin tocar Deshacer: a los 5,9 s todavía está; a los 6,1 s ya no.
      await borrar('g-mc4')
      await act(async () => { await vi.advanceTimersByTimeAsync(5900) })
      expect((await repo.listar()).some((g) => g.id === 'g-mc4')).toBe(true)
      await act(async () => { await vi.advanceTimersByTimeAsync(200) })
      expect((await repo.listar()).some((g) => g.id === 'g-mc4')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
