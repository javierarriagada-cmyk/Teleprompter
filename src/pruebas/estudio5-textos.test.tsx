import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { es } from '../textos/es'
import { en } from '../textos/en'
import EditorView from '../components/EditorView'
import { IndicadorPrecarga } from '../components/IndicadorPrecarga'
import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { Guion, grabacionNueva } from '../datos/modelo'

describe('Estudio 5 - Tres textos que dicen que paso y que hacer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('1. El mensaje de archivo no soportado no empieza con el encabezado viejo ("Error al abrir archivo:")', async () => {
    const guionVacio: Guion = {
      id: 'g-test-estudio5',
      titulo: 'Sin título',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: '' }]
    }

    const { container } = render(
      <EditorView
        guion={guionVacio}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    const file = new File(['dummy content'], 'documento.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    const errorMsg = await waitFor(() => {
      const el = container.querySelector('div[style*="var(--color-grabando)"]')
      expect(el).not.toBeNull()
      return el!.textContent
    })

    expect(errorMsg).not.toMatch(/^Error al abrir archivo:/)
    expect(errorMsg).toBe('No se puede abrir documento.pdf. Usa un archivo .txt, .md o .docx.')
  })

  test('2. errorModelo no contiene «Vosk» ni {detalle}', () => {
    expect(es.errorModelo).not.toContain('Vosk')
    expect(es.errorModelo).not.toContain('{detalle}')
    expect(es.errorModelo).toBe('No se pudo descargar la voz. Revisa tu conexión y toca Reintentar.')

    expect(en.errorModelo).not.toContain('Vosk')
    expect(en.errorModelo).not.toContain('{detalle}')
    expect(en.errorModelo).toBe('Couldn’t download the voice. Check your connection and tap Try again.')

    render(
      <IndicadorPrecarga
        estadoPrecarga="error"
        progresoPrecarga={0}
        errorPrecarga="Connection timeout"
        reintentarPrecarga={() => {}}
        oculto={false}
      />
    )

    const errorText = screen.getByText(/No se pudo descargar la voz/)
    expect(errorText.textContent).not.toContain('Vosk')
    expect(errorText.textContent).not.toContain('Connection timeout')
  })

  test('3. El descarte usa confirmarDescartar («¿Descartar?») y el reproductor confirmarBorrar («¿Borrar?»)', () => {
    expect(es.confirmarDescartar).toBe('¿Descartar?')
    expect(en.confirmarDescartar).toBe('Discard?')

    expect(es.confirmarBorrar).toBe('¿Borrar?')
    expect(en.confirmarBorrar).toBe('Delete?')

    expect((es as any).seguro).toBeUndefined()
    expect((en as any).seguro).toBeUndefined()

    const toma = grabacionNueva({
      id: 't-estudio5',
      tituloGuion: 'Guion prueba',
      duracionMs: 5000
    })

    render(
      <ReproductorGrabacion
        grabacion={toma}
        onCerrar={() => {}}
        onBorrar={() => {}}
        onRepetir={() => {}}
      />
    )

    const btnBorrar = screen.getByTestId('borrar-desde-reproductor')
    expect(btnBorrar.getAttribute('aria-label')).toBe('Borrar')
    expect(btnBorrar.textContent).toContain('Borrar')

    fireEvent.click(btnBorrar)
    expect(btnBorrar.getAttribute('aria-label')).toBe('¿Borrar?')
    expect(btnBorrar.textContent).toContain('¿Borrar?')
  })

  test('4. es.ts y en.ts tienen exactamente las mismas claves', () => {
    const clavesEs = Object.keys(es).sort()
    const clavesEn = Object.keys(en).sort()
    expect(clavesEn).toEqual(clavesEs)
  })
})
