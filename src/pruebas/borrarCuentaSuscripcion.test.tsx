// -borrar-cuenta-suscripcion, 31-10-2026- Aviso de Sigo+ en el diálogo de borrar; claves es/en/pt.
import React from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'
import { fijarSuscripcionParaPruebas } from '../lib/suscripcion'

const RAIZ_SITIO_TEXTOS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../sitio/fuente/textos')

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

function abrirDialogoBorrar() {
  sim.estado = { tipo: 'conSesion', correo: 'javier@ejemplo.cl' }
  render(<PanelAjustes origen="portada" ajustesLectura={ajustes} onCerrar={vi.fn()} hostMenus={null} animar={false} />)
  fireEvent.click(screen.getByTestId('fila-cuenta'))
  fireEvent.click(screen.getByTestId('btn-borrar-cuenta'))
}

afterEach(() => {
  cleanup()
  fijarSuscripcionParaPruebas({ tipo: 'sinDatos' })
})

beforeEach(() => {
  fijarSuscripcionParaPruebas({ tipo: 'sinSuscripcion' })
})

describe('diálogo borrar cuenta y Sigo+', () => {
  it('con Sigo+ muestra el aviso y el botón a Google Play; tocarlo no cierra el diálogo', () => {
    fijarSuscripcionParaPruebas({ tipo: 'conSuscripcion', vence: null, periodo: null, pedidoEn: null })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    abrirDialogoBorrar()
    expect(screen.getByTestId('aviso-borrar-cuenta-suscripcion').textContent).toBe(es.borrarCuentaAvisoSuscripcion)
    const btn = screen.getByTestId('btn-borrar-cuenta-google-play')
    expect(btn.textContent).toBe(es.borrarCuentaIrAGooglePlay)
    fireEvent.click(btn)
    expect(open).toHaveBeenCalledWith(
      'https://play.google.com/store/account/subscriptions',
      '_blank'
    )
    // El diálogo sigue abierto: Cancelar y Borrar siguen ahí.
    expect(screen.getByTestId('dialogo-borrar-cuenta')).toBeTruthy()
    expect(screen.getByTestId('btn-borrar-cuenta-cancelar')).toBeTruthy()
    expect(screen.getByTestId('btn-borrar-cuenta-confirmar')).toBeTruthy()
    open.mockRestore()
  })

  it('sin Sigo+ el diálogo queda como hoy: sin aviso ni botón a Play', () => {
    fijarSuscripcionParaPruebas({ tipo: 'sinSuscripcion' })
    abrirDialogoBorrar()
    expect(screen.queryByTestId('aviso-borrar-cuenta-suscripcion')).toBeNull()
    expect(screen.queryByTestId('btn-borrar-cuenta-google-play')).toBeNull()
    expect(screen.getByTestId('dialogo-borrar-cuenta')).toBeTruthy()
    expect(screen.getByText(es.borrarCuentaTexto2)).toBeTruthy()
  })
})

describe('textos borrar-cuenta-suscripcion', () => {
  it('claves de la app en es, en y pt con el texto pedido', () => {
    expect(es.borrarCuentaAvisoSuscripcion).toBe(
      'Tu suscripción a Sigo+ sigue activa y se seguirá cobrando. Para dejar de pagar, cancélala en Google Play.'
    )
    expect(en.borrarCuentaAvisoSuscripcion).toBe(
      "Your Sigo+ subscription stays active and you'll keep being charged. To stop paying, cancel it in Google Play."
    )
    expect(pt.borrarCuentaAvisoSuscripcion).toBe(
      'Sua assinatura do Sigo+ continua ativa e continuará sendo cobrada. Para parar de pagar, cancele no Google Play.'
    )
    expect(es.borrarCuentaIrAGooglePlay).toBe('Ir a Google Play')
    expect(en.borrarCuentaIrAGooglePlay).toBe('Go to Google Play')
    expect(pt.borrarCuentaIrAGooglePlay).toBe('Ir para o Google Play')
  })

  it('claves del sitio en es, en y pt con Google Play enlazado', () => {
    // Lee los .js del sitio como texto: no tienen .d.ts y tsc no los tipa desde src/.
    const url = 'https://play.google.com/store/account/subscriptions'
    const leer = (idioma: string) =>
      fs.readFileSync(path.join(RAIZ_SITIO_TEXTOS, `${idioma}.js`), 'utf8')
    const esTxt = leer('es')
    const enTxt = leer('en')
    const ptTxt = leer('pt')
    expect(esTxt).toMatch(/avisoSuscripcion:\s*'/)
    expect(enTxt).toMatch(/avisoSuscripcion:\s*'/)
    expect(ptTxt).toMatch(/avisoSuscripcion:\s*'/)
    expect(esTxt).toContain(`<a href="${url}">Google Play</a>`)
    expect(enTxt).toContain(`<a href="${url}">Google Play</a>`)
    expect(ptTxt).toContain(`<a href="${url}">Google Play</a>`)
    expect(esTxt).toContain('Si tienes Sigo+, borrar tu cuenta no cancela la suscripción.')
    expect(esTxt).toContain('También borramos tu registro de compras en RevenueCat; Google conserva el suyo.')
    // En el .js el apóstrofo va escapado: doesn\'t
    expect(enTxt).toContain("deleting your account doesn\\'t cancel your subscription.")
    expect(enTxt).toContain('We also delete your purchase record at RevenueCat; Google keeps its own.')
    expect(ptTxt).toContain('Se você tem o Sigo+, excluir sua conta não cancela a assinatura.')
    expect(ptTxt).toContain('Também excluímos seu registro de compras na RevenueCat; o Google mantém o dele.')
  })
})
