import React from 'react'
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'
// Por las medidas que jsdom no tiene y ProseMirror pide al llevar el cursor a la vista.
import './ayudaEditor'

// EL BOTON "PEGAR TEXTO" PEGA -24-09-2026-. Antes solo dejaba el cursor en el guion y esperaba
// que Android ofreciera "Pegar"; con el editor de la Tarea 73 no lo ofrece, y Javier: "el boton
// pegar no esta haciendo nada". En el navegador -y en estas pruebas- lee navigator.clipboard.
describe('Pegar texto', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original)
    else delete (navigator as any).clipboard
  })

  test('P1 Con el guion vacio, el boton pega lo copiado, y cada linea -la vacia tambien- queda como linea.', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: async () => 'Primera linea.\n\nTercera linea.' }
    })
    const vacio: Guion = { id: 'g1', titulo: 'Prueba', bloques: [{ id: 'b1', nombre: '', texto: '' }] } as Guion
    let ultimo: Guion = vacio
    render(
      <EditorView
        guion={vacio}
        onChangeGuion={(g) => { ultimo = g }}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('btn-pegar-texto'))
    await waitFor(() => {
      expect(ultimo.bloques.map((b) => b.texto).join('\n')).toBe('Primera linea.\n\nTercera linea.')
    })
  })

  test('P2 Sin nada copiado, el boton no escribe nada.', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { readText: async () => '' } })
    const vacio: Guion = { id: 'g1', titulo: 'Prueba', bloques: [{ id: 'b1', nombre: '', texto: '' }] } as Guion
    let cambios = 0
    render(
      <EditorView
        guion={vacio}
        onChangeGuion={() => { cambios++ }}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('btn-pegar-texto'))
    await new Promise((r) => setTimeout(r, 50))
    expect(cambios).toBe(0)
  })
})
