import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, act, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { importarArchivo, extraerTituloArchivo } from '../datos/importarArchivo'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'

describe('Pruebas TAREA 12 - Importar guiones desde archivo (T64-T68 y T75)', () => {

  // T75: Importar archivo .txt y extracción de título sin extensión.
  // Se llamaba T63. Renumerada al mergear: esta rama se abrió antes de que entrara el
  // motor Vosk, que ya se había llevado la T63 para su guardiana del build. Dos pruebas
  // con el mismo número hacen imposible saber qué encargo pidió cuál.
  test('T75: importarArchivo lee archivos .txt y extrae el título del nombre del archivo sin extensión', async () => {
    const contenidoTxt = `Primer párrafo del discurso.

Segundo párrafo del discurso.`
    const archivoTxt = new File([contenidoTxt], 'discurso_bienvenida.txt', { type: 'text/plain' })

    const resTxt = await importarArchivo(archivoTxt)
    expect(resTxt.titulo).toBe('discurso_bienvenida')
    expect(resTxt.bloques.length).toBe(2)
    expect(resTxt.bloques[0].texto).toContain('Primer párrafo')
    expect(resTxt.bloques[1].texto).toContain('Segundo párrafo')

    // Caso de título vacío (ej. ".txt")
    expect(extraerTituloArchivo('.txt')).toBe('Sin titulo')
    const archivoSinTitulo = new File(['Texto simple.'], '.txt', { type: 'text/plain' })
    const resSinTitulo = await importarArchivo(archivoSinTitulo)
    expect(resSinTitulo.titulo).toBe('Sin titulo')

    // Múltiples puntos en el nombre
    expect(extraerTituloArchivo('mi.guion.v2.txt')).toBe('mi.guion.v2')
  })

  // T64: Importar .md limpiando sintaxis Markdown (Sabina) y comprobando que no quedan corchetes
  test('T64: importarArchivo procesa .md limpiando marcas de Markdown y eliminando corchetes de enlaces', async () => {
    const contenidoMd = `# El silencio
Sabina pidio **al reves**.
- No a Dios.
- No a Cristo.
> A la Virgen.
Ver el [video completo](https://ejemplo.com/v).`

    const archivoMd = new File([contenidoMd], 'sabina.md', { type: 'text/markdown' })
    const res = await importarArchivo(archivoMd)

    expect(res.titulo).toBe('sabina')
    expect(res.bloques.length).toBe(1)

    const textoResultado = res.bloques[0].texto

    // Sin almohadillas, sin asteriscos, sin guiones de lista, sin comilla de cita
    expect(textoResultado).not.toContain('#')
    expect(textoResultado).not.toContain('*')
    expect(textoResultado).not.toContain('- No')
    expect(textoResultado).not.toContain('> ')
    expect(textoResultado).toContain('video completo')
    expect(textoResultado).not.toContain('https://ejemplo.com/v')

    // COMPROBACIÓN CRÍTICA: NO debe quedar ningún corchete '[' ni ']'
    expect(textoResultado).not.toContain('[')
    expect(textoResultado).not.toContain(']')

    // Las otras formas de escribir un enlace en Markdown, que dejaban corchetes vivos y
    // por lo tanto acotaciones falsas que el lector nunca dice en voz alta.
    const contenidoOtrosEnlaces = `Ver el [video completo][1] ahora.
Mira ![una foto](https://x.com/a.png) aca.

[1]: https://ejemplo.com/v`
    const archivoOtros = new File([contenidoOtrosEnlaces], 'enlaces.md', { type: 'text/markdown' })
    const resOtros = await importarArchivo(archivoOtros)
    const textoOtros = resOtros.bloques.map((b) => b.texto).join('\n')

    expect(textoOtros).toContain('video completo')   // enlace por referencia [texto][1]
    expect(textoOtros).toContain('una foto')         // imagen, sin el signo de admiración
    expect(textoOtros).not.toContain('!')
    expect(textoOtros).not.toContain('ejemplo.com')  // la línea de definición se elimina
    expect(textoOtros).not.toContain('[')
    expect(textoOtros).not.toContain(']')
  })

  // T64b: lo que la limpieza NO debe tocar. Va junto a la T64 porque es su otra mitad:
  // sin esta, la forma más fácil de pasar la T64 es borrar todos los corchetes, y eso
  // borraría las acotaciones, que en este proyecto son justamente corchetes.
  test('T64b: la limpieza de Markdown respeta las acotaciones y no suelda palabras', async () => {
    const contenido = `Hola [respirar] mundo.
El archivo se llama el_mundo_entero hoy.
**Fuerte** y [pausa] despues.`
    const archivo = new File([contenido], 'acotaciones.md', { type: 'text/markdown' })
    const res = await importarArchivo(archivo)
    const texto = res.bloques.map((b) => b.texto).join('\n')

    // Las acotaciones son del guion, no de Markdown: se quedan tal cual.
    expect(texto).toContain('[respirar]')
    expect(texto).toContain('[pausa]')

    // Los guiones bajos dentro de una palabra no son énfasis: si se los trata como tal,
    // el_mundo_entero queda elmundoentero y el lector lee una palabra que no existe.
    expect(texto).toContain('el_mundo_entero')

    // Y el énfasis de verdad sí se limpia.
    expect(texto).toContain('Fuerte')
    expect(texto).not.toContain('**')
  })

  // T65: Formato de archivo no soportado produce error explicativo
  test('T65: archivo con formato no soportado (.pdf, .png) lanza error explicativo', async () => {
    const archivoPdf = new File(['%PDF-1.4 ...'], 'documento.pdf', { type: 'application/pdf' })
    await expect(importarArchivo(archivoPdf)).rejects.toThrow(/Formato de archivo no soportado/)

    const archivoPng = new File(['fake image'], 'imagen.png', { type: 'image/png' })
    await expect(importarArchivo(archivoPng)).rejects.toThrow(/Formato de archivo no soportado/)
  })

  // T66: Archivo vacío o con solo espacios devuelve cero bloques y no lanza
  test('T66: archivo vacío o con solo espacios devuelve cero bloques y no lanza', async () => {
    const archivoVacio = new File([''], 'vacio.txt', { type: 'text/plain' })
    let resVacio: Awaited<ReturnType<typeof importarArchivo>> | null = null

    await expect((async () => {
      resVacio = await importarArchivo(archivoVacio)
    })()).resolves.not.toThrow()

    expect(resVacio).not.toBeNull()
    expect(resVacio!.titulo).toBe('vacio')
    expect(resVacio!.bloques).toEqual([])

    const archivoEspacios = new File(['   \n\n\t   '], 'espacios.md', { type: 'text/markdown' })
    const resEspacios = await importarArchivo(archivoEspacios)
    expect(resEspacios.bloques).toEqual([])
  })

  // T67: Reconocimiento de extensión .docx y error ante contenido inválido (anterior T64)
  test('T67: importarArchivo reconoce extensión .docx y lanza error si el contenido es inválido', async () => {
    const contenidoInvalido = 'Este texto no es un archivo zip de docx válido'
    const archivoDocx = new File([contenidoInvalido], 'documento_prueba.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

    await expect(importarArchivo(archivoDocx)).rejects.toThrow()
  })

  // T68: Integración UI en EditorView (anterior T66)
  test('T68: en EditorView, "Abrir archivo" agrega bloques al final sin tocar los existentes y resguarda ante errores', async () => {
    let guionEstado: Guion = {
      id: 'g-t68',
      titulo: 'Guion T68 Original',
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
    expect(guionEstado.titulo).toBe('Guion T68 Original')

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
