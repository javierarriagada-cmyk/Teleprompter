// -arreglo PR 157- Tras comprar con sesión Google, la fila Sigo+ activo debe aparecer
// sin reabrir Ajustes: TarjetaCuenta se suscribe al store como BloqueSigo.
import React, { useSyncExternalStore } from 'react'
import { render, screen, cleanup, act } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import {
  estadoSuscripcion,
  suscribirSuscripcion,
  tieneSuscripcion,
  mostrarFilaSigoActivoEnCuenta,
  fijarSuscripcionParaPruebas
} from '../lib/suscripcion'

afterEach(() => {
  cleanup()
  fijarSuscripcionParaPruebas({ tipo: 'sinDatos' })
})

beforeEach(() => {
  fijarSuscripcionParaPruebas({ tipo: 'sinSuscripcion' })
})

describe('mostrarFilaSigoActivoEnCuenta', () => {
  it('con sesión y conSuscripcion del store, la fila va', () => {
    // Sin el arreglo se miraba tieneSuscripcion() congelado al render, no el tipo del store.
    expect(mostrarFilaSigoActivoEnCuenta('conSesion', 'conSuscripcion')).toBe(true)
    expect(mostrarFilaSigoActivoEnCuenta('conSesion', 'sinSuscripcion')).toBe(false)
    expect(mostrarFilaSigoActivoEnCuenta('sinSesion', 'conSuscripcion')).toBe(false)
  })
})

describe('TarjetaCuenta reacciona al store de suscripción', () => {
  // Misma decisión que TarjetaCuenta tras el arreglo (useSyncExternalStore + mostrarFila…).
  function FilaComoTarjetaCuenta({ conSesion }: { conSesion: boolean }) {
    const estadoSub = useSyncExternalStore(suscribirSuscripcion, estadoSuscripcion, estadoSuscripcion)
    if (!mostrarFilaSigoActivoEnCuenta(conSesion ? 'conSesion' : 'sinSesion', estadoSub.tipo)) return null
    return <div data-testid="fila-sigo-activo" />
  }

  it('tras pasar a conSuscripcion, la fila aparece sin remount', () => {
    render(<FilaComoTarjetaCuenta conSesion />)
    expect(screen.queryByTestId('fila-sigo-activo')).toBeNull()
    act(() => {
      fijarSuscripcionParaPruebas({ tipo: 'conSuscripcion', vence: null, periodo: null, pedidoEn: null })
    })
    expect(screen.getByTestId('fila-sigo-activo')).toBeTruthy()
  })

  it('sin suscribirse al store (bug viejo), la fila no aparece al comprar', () => {
    // Reproduce el bug: lee tieneSuscripcion() sin useSyncExternalStore.
    function FilaBuggy({ conSesion }: { conSesion: boolean }) {
      if (!(conSesion && tieneSuscripcion())) return null
      return <div data-testid="fila-sigo-activo" />
    }
    render(<FilaBuggy conSesion />)
    expect(screen.queryByTestId('fila-sigo-activo')).toBeNull()
    act(() => {
      fijarSuscripcionParaPruebas({ tipo: 'conSuscripcion', vence: null, periodo: null, pedidoEn: null })
    })
    // Sigue null: no hubo re-render. El arreglo (FilaComoTarjetaCuenta) sí la muestra.
    expect(screen.queryByTestId('fila-sigo-activo')).toBeNull()
    expect(tieneSuscripcion()).toBe(true)
  })
})
