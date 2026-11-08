// -tanda-08-nov, 08-11-2026- Pruebas de lógica de los cuatro ajustes de pantalla:
// los textos del editor vacío, la hora de las tarjetas, cómo se juntan fecha y hora,
// y que la muestra del menú de tipo de letra usa la fuente de esa opción.
// Nada de posiciones, tamaños ni colores: eso lo juzga Javier en el teléfono.
import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'
import { fechaCortaDosDigitos, horaCorta } from '../textos'
import { formatearFechaCorta } from '../components/TiraGrabaciones'
import { MenuLectura, type AjustesLectura, type AnclasLectura } from '../components/FilasAjustesLectura'
import { familiaLectura } from '../components/estiloLectura'

describe('tanda-08-nov - textos del editor vacío', () => {
  test('placeholderGuion y ejemploGuion existen en es, en y pt, no están vacíos y ninguno lleva un salto de línea', () => {
    for (const textos of [es, en, pt]) {
      expect(typeof textos.placeholderGuion).toBe('string')
      expect(typeof textos.ejemploGuion).toBe('string')
      expect(textos.placeholderGuion.length).toBeGreaterThan(0)
      expect(textos.ejemploGuion.length).toBeGreaterThan(0)
      expect(textos.placeholderGuion.includes('\n')).toBe(false)
      expect(textos.ejemploGuion.includes('\n')).toBe(false)
    }
  })
})

describe('tanda-08-nov - la hora de las tarjetas', () => {
  const aLas1842 = new Date(2026, 10, 8, 18, 42).getTime()
  const aLas0905 = new Date(2026, 10, 8, 9, 5).getTime()

  test('es y pt dan 18:42 y 09:05', () => {
    expect(horaCorta(aLas1842, 'es')).toBe('18:42')
    expect(horaCorta(aLas0905, 'es')).toBe('09:05')
    expect(horaCorta(aLas1842, 'pt')).toBe('18:42')
    expect(horaCorta(aLas0905, 'pt')).toBe('09:05')
  })

  test('en da lo mismo que Intl para en', () => {
    const esperado = (ts: number) =>
      new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(ts))
    expect(horaCorta(aLas1842, 'en')).toBe(esperado(aLas1842))
    expect(horaCorta(aLas0905, 'en')).toBe(esperado(aLas0905))
  })

  test('la tarjeta junta fecha y hora con « · »', () => {
    expect(formatearFechaCorta(aLas1842)).toBe(`${fechaCortaDosDigitos(aLas1842)} · ${horaCorta(aLas1842)}`)
    expect(formatearFechaCorta(aLas0905)).toBe(`${fechaCortaDosDigitos(aLas0905)} · ${horaCorta(aLas0905)}`)
    expect(formatearFechaCorta(aLas1842)).toContain(' · ')
  })
})

describe('tanda-08-nov - el menú de tipo de letra', () => {
  test('la muestra de cada opción usa la fuente de esa opción, aunque la elegida sea la otra', () => {
    const nodo = document.createElement('div')
    document.body.appendChild(nodo)
    const ancla = { current: nodo }
    const anclas: AnclasLectura = { letra: ancla, tipo: ancla, ancho: ancla, colores: ancla }
    const ajustes: AjustesLectura = {
      fontSize: 24,
      tipoFuente: 'serif',
      setTipoFuente: () => {},
      columnaAngosta: false,
      marginPercent: 5,
      setColumnaAngosta: () => {},
      setMarginPercent: () => {},
      colorFondo: '#000000',
      colorLetra: '#FFFFFF',
      setColorFondo: () => {},
      setColorLetra: () => {},
      mirror: false,
      setMirror: () => {},
      mostrarTiempo: true,
      setMostrarTiempo: () => {}
    }

    render(React.createElement(MenuLectura, { ajustes, anclas, dialogo: 'tipo', onCerrar: () => {} }))

    const sans = screen.getByText('Sans').closest('button')
    const serif = screen.getByText('Serif').closest('button')
    expect(sans).not.toBeNull()
    expect(serif).not.toBeNull()
    const aaSans = sans!.querySelector('[aria-hidden="true"]') as HTMLElement | null
    const aaSerif = serif!.querySelector('[aria-hidden="true"]') as HTMLElement | null
    expect(aaSans?.textContent).toBe('Aa')
    expect(aaSerif?.textContent).toBe('Aa')
    expect(aaSans?.style.fontFamily).toBe(familiaLectura('sans'))
    expect(aaSerif?.style.fontFamily).toBe(familiaLectura('serif'))
  })
})
