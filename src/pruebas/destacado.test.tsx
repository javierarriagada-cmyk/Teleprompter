import React from 'react'
import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import TeleprompterView from '../components/TeleprompterView'
import { palabrasDelDestacado, segmentosDelDestacado } from '../lib/destacado'

// EL DESTACADO DE LECTURA -lib/destacado.ts, 24-09-2026-.
describe('Destacado de lectura', () => {
  test('D1 Cuantas palabras: vez y media las de un renglon, entre 4 y 6.', () => {
    expect(palabrasDelDestacado(8.3)).toBe(6)   // letra 14
    expect(palabrasDelDestacado(3.5)).toBe(5)   // columna angosta
    expect(palabrasDelDestacado(2.5)).toBe(4)   // letra 42
    expect(palabrasDelDestacado(0)).toBe(4)
  })

  test('D2 Una capsula por renglon: las palabras de un mismo renglon se juntan en una sola.', () => {
    const segs = segmentosDelDestacado([
      { izquierda: 200, arriba: 0, ancho: 40, alto: 20 },
      { izquierda: 250, arriba: 0, ancho: 30, alto: 20 },
      { izquierda: 0, arriba: 28, ancho: 50, alto: 20 },
      { izquierda: 60, arriba: 28, ancho: 20, alto: 20 }
    ])
    expect(segs).toEqual([
      { izquierda: 200, arriba: 0, ancho: 80, alto: 20 },
      { izquierda: 0, arriba: 28, ancho: 80, alto: 20 }
    ])
  })

  function motorEn(posicion: number, motivoFreno: string | null = null) {
    return {
      confirmar() {}, tentativo() {}, falloCalce() {}, voz() {}, irAToken() {}, reiniciar() {},
      estadoEn: () => ({
        posicion, avanzando: true, estado: 'SIGUIENDO' as const, motivoFreno,
        ppmEstimadas: 150, ultimoCalce: Math.floor(posicion), tUltimoCalceMs: 1
      })
    }
  }
  const guion = Array.from({ length: 40 }, (_, i) => 'pa' + i).join(' ')
  async function capsulas(estadoToma: 'listo' | 'leyendo', motivoFreno: string | null = null) {
    const { container, unmount } = render(
      <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0}
        anclajeZona="arriba" fontSize={24} columnaAngosta={false}
        estadoToma={estadoToma} motorAvance={motorEn(5, motivoFreno) as any} />
    )
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const ops = [...container.querySelectorAll('.capsula-destacado')].map((c) => (c as HTMLElement).style.opacity)
    unmount()
    return ops
  }

  test('D3 Leyendo se ve; en LISTO no. Y si el motor perdio el hilo, tenue.', async () => {
    expect((await capsulas('leyendo')).some((o) => o === '1')).toBe(true)
    expect((await capsulas('listo')).every((o) => o === '0')).toBe(true)
    expect((await capsulas('leyendo', 'sin-calce')).some((o) => o === '0.35')).toBe(true)
  })
})
