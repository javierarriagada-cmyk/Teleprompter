import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAparecer } from '../hooks/useAparecer'

// controles-que-se-desvanecen: la lógica del hook, sin pantalla.
function conMovimiento(reducido: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reducido && q.includes('reduce'), media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia
}

describe('useAparecer', () => {
  const original = window.matchMedia
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); window.matchMedia = original })

  it('visible -> saliendo al apagarse, y null después de msSalida', () => {
    conMovimiento(false)
    const { result, rerender } = renderHook(({ v }) => useAparecer(v, 400), { initialProps: { v: true } })
    expect(result.current).toBe('visible')
    rerender({ v: false })
    expect(result.current).toBe('saliendo')
    act(() => { vi.advanceTimersByTime(399) })
    expect(result.current).toBe('saliendo')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe(null)
  })

  it('si vuelve mientras sale, pasa a visible y no se desmonta', () => {
    conMovimiento(false)
    const { result, rerender } = renderHook(({ v }) => useAparecer(v, 400), { initialProps: { v: true } })
    rerender({ v: false })
    act(() => { vi.advanceTimersByTime(200) })
    rerender({ v: true })
    expect(result.current).toBe('visible')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe('visible')
  })

  it('al aparecer entra y después queda visible', () => {
    conMovimiento(false)
    const { result, rerender } = renderHook(({ v }) => useAparecer(v, 400), { initialProps: { v: false } })
    expect(result.current).toBe(null)
    rerender({ v: true })
    expect(result.current).toBe('entrando')
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current).toBe('visible')
  })

  it('sin movimiento se va de una vez, a null', () => {
    conMovimiento(true)
    const { result, rerender } = renderHook(({ v }) => useAparecer(v, 400), { initialProps: { v: true } })
    rerender({ v: false })
    expect(result.current).toBe(null)
    rerender({ v: true })
    expect(result.current).toBe('visible')
  })
})
