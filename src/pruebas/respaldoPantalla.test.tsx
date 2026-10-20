// -orden B, 20-10-2026- La tarjeta de la cuenta, arriba de Ajustes. Solo lógica: qué hay, no dónde.
import React from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { es } from '../textos/es'

const sim = vi.hoisted(() => ({ estado: { tipo: 'sinSesion' } as any }))
vi.mock('../lib/cuenta', () => ({
  estadoCuenta: () => sim.estado,
  suscribirCuenta: () => () => {},
  entrar: vi.fn(), salir: vi.fn(), borrarCuenta: vi.fn()
}))

import { PanelAjustes } from '../components/PanelAjustes'

const ajustes: any = {
  fontSize: 24, setFontSize: vi.fn(), columnaAngosta: false, setColumnaAngosta: vi.fn(), marginPercent: 5,
  setMarginPercent: vi.fn(), colorFondo: '#151312', setColorFondo: vi.fn(), colorLetra: '#E7E1DE',
  setColorLetra: vi.fn(), tipoFuente: 'sans', setTipoFuente: vi.fn(), mirror: false, setMirror: vi.fn(),
  mostrarTiempo: true, setMostrarTiempo: vi.fn(), letraBase: 24
}
const panel = () => render(<PanelAjustes origen="portada" ajustesLectura={ajustes} onCerrar={vi.fn()} hostMenus={null} animar={false} />)
afterEach(cleanup)

describe('la tarjeta de la cuenta', () => {
  it('sin sesión: el título, la línea y el botón de Google', () => {
    sim.estado = { tipo: 'sinSesion' }
    panel()
    expect(screen.getByText(es.cuentaBienvenidaTitulo)).toBeTruthy()
    expect(screen.getByText(es.cuentaRespaldoLinea)).toBeTruthy()
    expect(screen.getByTestId('btn-continuar-con-google')).toBeTruthy()
  })
  it('con sesión: el correo, y al tocar la fila, el menú con Cerrar sesión y Borrar cuenta', () => {
    sim.estado = { tipo: 'conSesion', correo: 'javier@ejemplo.cl' }
    panel()
    expect(screen.getByTestId('fila-cuenta-correo').textContent).toBe('javier@ejemplo.cl')
    expect(screen.queryByTestId('btn-continuar-con-google')).toBeNull()
    expect(screen.queryByTestId('menu-cuenta')).toBeNull()
    fireEvent.click(screen.getByTestId('fila-cuenta'))
    expect(screen.getByTestId('btn-cerrar-sesion').textContent).toBe(es.cerrarSesion)
    expect(screen.getByTestId('btn-borrar-cuenta').textContent).toBe(es.borrarCuenta)
  })
})

describe('la tarjeta de la cuenta va arriba de todo -corrección del 20-10-2026-', () => {
  it('en el orden del documento: la tarjeta antes del selector Con la voz / Velocidad fija, y su línea de estado con clase propia', () => {
    sim.estado = { tipo: 'conSesion', correo: 'javier@ejemplo.cl' }
    panel()
    const tarjeta = screen.getByTestId('seccion-cuenta')
    const selector = screen.getByText(es.modoConLaVoz)
    expect(tarjeta.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByTestId('estado-respaldo').className).not.toContain('fila-ajuste-explicacion')
  })
})
