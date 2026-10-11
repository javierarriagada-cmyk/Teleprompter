import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { DockListo, IndicadorCargaExpressive } from '../components/DockListo'
import { movimientoApagado } from '../components/movimiento'

describe('Pruebas de lógica - M3 Expressive en botones y dock', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  test('Tocar Grabar en el dock sigue disparando la acción de empezar la toma', () => {
    const onEmpezar = vi.fn()
    const botonGrabar = (
      <button data-testid="btn-empezar-toma" onClick={onEmpezar}>
        Grabar
      </button>
    )

    render(
      <DockListo
        fichas={() => null}
        botonGrabar={botonGrabar}
        conVoltear={false}
        duracion="01:30"
        mostrarDuracion={true}
        conCamara={true}
        calidadVideo="1080p"
        calidadesSoportadas={['1080p']}
        minutosDisponibles={10}
        ajustesLectura={{} as any}
      />
    )

    const btn = screen.getByTestId('btn-empezar-toma')
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(onEmpezar).toHaveBeenCalledTimes(1)
  })

  test('El indicador de carga aparece solo mientras se baja la voz (preparandoVoz !== null)', () => {
    const { rerender } = render(
      <DockListo
        fichas={() => null}
        botonGrabar={<button data-testid="btn-empezar-toma">Grabar</button>}
        conVoltear={false}
        duracion="01:30"
        mostrarDuracion={true}
        preparandoVoz={0.45}
        conCamara={true}
        calidadVideo="1080p"
        calidadesSoportadas={['1080p']}
        minutosDisponibles={10}
        ajustesLectura={{} as any}
      />
    )

    expect(screen.getByTestId('dock-preparando-voz')).toBeTruthy()
    expect(screen.getByTestId('indicador-carga-expressive')).toBeTruthy()

    rerender(
      <DockListo
        fichas={() => null}
        botonGrabar={<button data-testid="btn-empezar-toma">Grabar</button>}
        conVoltear={false}
        duracion="01:30"
        mostrarDuracion={true}
        preparandoVoz={null}
        conCamara={true}
        calidadVideo="1080p"
        calidadesSoportadas={['1080p']}
        minutosDisponibles={10}
        ajustesLectura={{} as any}
      />
    )

    expect(screen.queryByTestId('dock-preparando-voz')).toBeNull()
    expect(screen.queryByTestId('indicador-carga-expressive')).toBeNull()
  })

  test('Con movimiento reducido (prefers-reduced-motion) se apaga la animación del indicador', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))

    expect(movimientoApagado()).toBe(true)

    render(<IndicadorCargaExpressive />)
    const el = screen.getByTestId('indicador-carga-expressive')
    expect(el.style.animation).toBe('none')
  })
})
