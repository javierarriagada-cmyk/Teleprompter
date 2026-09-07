import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, act, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { importarArchivo, extraerTituloArchivo } from '../datos/importarArchivo'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'

describe('Pruebas TAREA 12 - Importar guiones desde archivo (T63-T66)', () => {

  // T63: Importar archivo .txt y .md y extracción de título sin extensión
  test('T63: importarArchivo lee archivos .txt y .md y extrae el título del nombre del archivo sin extensión', async () => {
    // Archivo .txt con título normal
    const contenidoTxt = `Primer párrafo del discurso.

Segundo párrafo del discurso.`
    const archivoTxt = new File([contenidoTxt], 'discurso_bienvenida.txt', { type: 'text/plain' })

    const resTxt = await importarArchivo(archivoTxt)
    expect(resTxt.titulo).toBe('discurso_bienvenida')
    expect(resTxt.bloques.length).toBe(2)
    expect(resTxt.bloques[0].texto).toContain('Primer párrafo')
    expect(resTxt.bloques[1].texto).toContain('Segundo párrafo')

    // Archivo .md con extensión en mayúsculas
    const contenidoMd = 'Texto en markdown de prueba.'
    const archivoMd = new File([contenidoMd], 'capitulo1.MD', { type: 'text/markdown' })

    const resMd = await importarArchivo(archivoMd)
    expect(resMd.titulo).toBe('capitulo1')
    expect(resMd.bloques.length).toBe(1)

    // Caso de título vacío (ej. ".txt")
    expect(extraerTituloArchivo('.txt')).toBe('Sin titulo')
    const archivoSinTitulo = new File(['Texto simple.'], '.txt', { type: 'text/plain' })
    const resSinTitulo = await importarArchivo(archivoSinTitulo)
    expect(resSinTitulo.titulo).toBe('Sin titulo')

    // Múltiples puntos en el nombre
    expect(extraerTituloArchivo('mi.guion.v2.txt')).toBe('mi.guion.v2')
  })

  // T64: Reconocimiento de extensión .docx y error ante contenido inválido
  test('T64: importarArchivo reconoce extensión .docx y lanza error si el contenido es inválido', async () => {
    const contenidoInvalido = 'Este texto no es un archivo zip de docx válido'
    const archivoDocx = new File([contenidoInvalido], 'documento_prueba.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

    await expect(importarArchivo(archivoDocx)).rejects.toThrow()
  })

  // T65: Formato de archivo no soportado produce error explicativo
  test('T65: archivo con formato no soportado (.pdf, .png) lanza error explicativo', async () => {
    const archivoPdf = new File(['%PDF-1.4 ...'], 'documento.pdf', { type: 'application/pdf' })
    await expect(importarArchivo(archivoPdf)).rejects.toThrow(/Formato de archivo no soportado/)

    const archivoPng = new File(['fake image'], 'imagen.png', { type: 'image/png' })
    await expect(importarArchivo(archivoPng)).rejects.toThrow(/Formato de archivo no soportado/)
  })

  // T66: Integración UI en EditorView (botón "Abrir archivo", deshabilitado mientras lee, agrega al final sin reemplazar)
  test('T66: en EditorView, "Abrir archivo" agrega bloques al final sin tocar los existentes y resguarda ante errores', async () => {
    let guionEstado: Guion = {
      id: 'g-t66',
      titulo: 'Guion T66 Original',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [
        { id: 'b-base', nombre: 'Bloque previo', texto: 'Contenido original que no se debe perder.' }
      ]
    }

    let llamadasChange = 0
    const handleChangeGuion = (nuevoGuion: Guion) => {
      guionEstado = nuevoGuion
      llamadasChange++
    }

    render(
      React.createElement(EditorView, {
        guion: guionEstado,
        onChangeGuion: handleChangeGuion,
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    // Verificar que existe el botón "Abrir archivo"
    const btnAbrir = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Abrir archivo')
    expect(btnAbrir).not.toBeUndefined()

    // Verificar el input file con accept .txt,.md,.docx
    const fileInput = document.querySelector('input[type="file"][accept=".txt,.md,.docx"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    // 1. Simular importar un archivo .txt válido con 2 párrafos
    const contenidoTxt = `Bloque importado A.

Bloque importado B.`
    const archivoValido = new File([contenidoTxt], 'nuevo_guion.txt', { type: 'text/plain' })

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [archivoValido] } })
    })

    // Esperar a que la promesa asíncrona de handleSeleccionarArchivo termine
    await waitFor(() => {
      expect(llamadasChange).toBe(1)
    })

    expect(guionEstado.bloques.length).toBe(3)
    expect(guionEstado.bloques[0].id).toBe('b-base')
    expect(guionEstado.bloques[1].texto).toBe('Bloque importado A.')
    expect(guionEstado.bloques[2].texto).toBe('Bloque importado B.')
    // Mantener título previo porque no estaba vacío ni era 'Sin título'
    expect(guionEstado.titulo).toBe('Guion T66 Original')

    // 2. Simular un error (archivo con extensión .pdf no soportada)
    const archivoErróneo = new File(['test'], 'archivo_malo.pdf', { type: 'application/pdf' })

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [archivoErróneo] } })
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain('Formato de archivo no soportado')
    })

    // No debe haber llamado a onChangeGuion de nuevo
    expect(llamadasChange).toBe(1)
    // Los bloques existentes no se alteran
    expect(guionEstado.bloques.length).toBe(3)
  })

})
