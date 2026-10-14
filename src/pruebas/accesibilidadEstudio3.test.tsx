import React from 'react'
import { render, screen, cleanup, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PanelAjustes } from '../components/PanelAjustes'
import BibliotecaView from '../components/BibliotecaView'
import TiraGrabaciones from '../components/TiraGrabaciones'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'

describe('Estudio 3 - Arreglos de accesibilidad', () => {
  // -15-10-2026, revision- La barra de color solo existe con texto seleccionado: la version de Jules no
  // seleccionaba, no encontraba el boton y terminaba en expect(true).toBe(true) -pasaba siempre-.
  // Ahora selecciona como usabilidad1.test.tsx. Antes, la rama sin boton:
  //     } else {
  //       expect(true).toBe(true)
  //     }
  it('1. Cada botón de color en EditorView tiene la clase btn-color-seleccion', async () => {
    const guionPrueba: Guion = {
      id: 'g-1',
      titulo: 'Test',
      creado: Date.now(),
      modificado: Date.now(),
      idioma: 'es',
      bloques: [{ id: 'b-1', nombre: '', texto: 'Palabra seleccionada', tramos: [] }]
    }
    const editorRefObj: { current: any } = { current: null }

    render(
      <EditorView
        guion={guionPrueba}
        onChangeGuion={vi.fn()}
        onVolverBiblioteca={vi.fn()}
        onEntrarLectura={vi.fn()}
        editorRef={editorRefObj as any}
      />
    )
    await waitFor(() => expect(editorRefObj.current).not.toBeNull())
    await act(async () => {
      editorRefObj.current.chain().focus().setTextSelection({ from: 1, to: 8 }).run()
    })
    const btnAmbar = await waitFor(() => screen.getByTestId('btn-color-ambar'))
    expect(btnAmbar.className).toContain('btn-color-seleccion')
    const colores = btnAmbar.parentElement!.querySelectorAll('button[style*="background-color"]')
    expect(colores.length).toBe(3)
    colores.forEach((b) => expect(b.className).toContain('btn-color-seleccion'))
  })

  it('2. Al montar PanelAjustes el elemento activo es su título y al desmontarlo vuelve al botón activo', () => {
    const btnOrigen = document.createElement('button')
    btnOrigen.id = 'btn-origen'
    document.body.appendChild(btnOrigen)
    btnOrigen.focus()
    expect(document.activeElement).toBe(btnOrigen)

    const ajustesLecturaDummy = {
      fontSize: 24,
      setFontSize: vi.fn(),
      columnaAngosta: false,
      setColumnaAngosta: vi.fn(),
      marginPercent: 5,
      setMarginPercent: vi.fn(),
      colorFondo: '#151312',
      setColorFondo: vi.fn(),
      colorLetra: '#E7E1DE',
      setColorLetra: vi.fn(),
      tipoFuente: 'sans' as const,
      setTipoFuente: vi.fn(),
      mirror: false,
      setMirror: vi.fn(),
      mostrarTiempo: true,
      setMostrarTiempo: vi.fn(),
      letraBase: 24
    }

    const { unmount } = render(
      <PanelAjustes
        origen="portada"
        ajustesLectura={ajustesLecturaDummy}
        onCerrar={vi.fn()}
        hostMenus={null}
        animar={false}
      />
    )

    // Al montarse, el elemento activo pasa a ser el h2 del PanelAjustes
    const titulo = screen.getByRole('heading', { level: 2, name: /ajustes/i })
    expect(document.activeElement).toBe(titulo)

    // Al desmontarse, el foco debe regresar al elemento previo (btnOrigen)
    unmount()
    expect(document.activeElement).toBe(btnOrigen)

    document.body.removeChild(btnOrigen)
  })

  it('3. Los dos títulos de la portada (Guiones y Videos) tienen role heading con nivel 2', () => {
    render(
      <BibliotecaView
        guiones={[]}
        onAbrir={vi.fn()}
        onCrearNuevo={vi.fn()}
        onBorrar={vi.fn()}
        onArchivar={vi.fn()}
        grabaciones={[]}
        onAbrirGrabacion={vi.fn()}
        onBorrarGrabacion={vi.fn()}
      />
    )

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.length).toBeGreaterThanOrEqual(2)

    const titulosTexto = headings.map((h) => h.textContent?.trim())
    expect(titulosTexto).toContain('Guiones')
    expect(titulosTexto).toContain('Videos')
  })
})
