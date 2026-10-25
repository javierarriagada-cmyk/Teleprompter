// EL AVISO DE BORRAR TOMAS, IGUAL AL DE GUIONES -ajustes-accesible, 25-10-2026, decisión de Javier-. Solo lógica,
// acotada al aviso: el aviso de las tomas -texto, «Deshacer» y MS_DESHACER_TOMA, como lo arma App.tsx en
// handleBorrarTomas- pasa por useAviso y AvisoBreve, sale en el modo «destacado» y dura 6 s.
import React from 'react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { useAviso } from '../hooks/useAviso'
import { AvisoBreve } from '../components/AvisoBreve'
import { MS_DESHACER_TOMA } from '../lib/seleccionTomas'
import { es } from '../textos/es'
import { t } from '../textos'

function ConAviso({ onListo }: { onListo: (m: ReturnType<typeof useAviso>['mostrarAviso']) => void }) {
  const { avisoInfo, mostrarAviso, cerrarAviso } = useAviso()
  onListo(mostrarAviso)
  return <AvisoBreve avisoInfo={avisoInfo} enLectura={false} cerrarAviso={cerrarAviso} />
}

describe('El aviso de borrar tomas', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  test('dura 6 s, lo mismo que el de borrar un guion', () => {
    expect(MS_DESHACER_TOMA).toBe(6000)
  })

  test('es el «destacado» y se va a los 6 s', () => {
    vi.useFakeTimers()
    let mostrar: ReturnType<typeof useAviso>['mostrarAviso'] = () => {}
    render(<ConAviso onListo={(m) => { mostrar = m }} />)
    act(() => {
      mostrar(t('tomasBorradas', { n: 2 }), { accionTexto: t('deshacer'), duracionMs: MS_DESHACER_TOMA, alEjecutarAccion: () => {} })
    })
    const aviso = screen.getByTestId('aviso-flotante')
    expect(aviso.style.minHeight).toBe('56px')
    expect(aviso.style.fontSize).toBe('16px')
    expect(aviso.style.bottom).toContain('--aviso-accion-abajo')
    const accion = screen.getByText(es.deshacer)
    expect(accion.style.minHeight).toBe('48px')
    expect(accion.style.color).toBe('var(--aviso-accion)')
    act(() => { vi.advanceTimersByTime(5999) })
    expect(screen.queryByTestId('aviso-flotante')).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.queryByTestId('aviso-flotante')).toBeNull()
  })
})
