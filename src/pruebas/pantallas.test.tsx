import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import BibliotecaView from '../components/BibliotecaView'
import EditorView from '../components/EditorView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'

describe('Pruebas TAREA 25: Pantallas Biblioteca y Editor (T149-T153)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T149: En la biblioteca con tres guiones, TOCAR LA FILA abre el guion. Y no existe ningún botón "Abrir": la fila es el botón.', async () => {
    let guionAbiertoId: string | null = null
    const guiones = [
      { id: 'g1', titulo: 'Guión Uno', idioma: 'es', modificado: Date.now() - 3600000, palabras: 100 },
      { id: 'g2', titulo: 'Guión Dos', idioma: 'es', modificado: Date.now() - 86400000, palabras: 200 },
      { id: 'g3', titulo: 'Guión Tres', idioma: 'es', modificado: Date.now() - 172800000, palabras: 300 }
    ]

    const { container } = render(
      React.createElement(BibliotecaView, {
        guiones,
        onAbrir: (id: string) => { guionAbiertoId = id },
        onCrearNuevo: () => {},
        onImportarArchivo: () => {},
        onBorrar: () => {},
        onArchivar: () => {}
      })
    )

    // 1. Confirmar que no hay botones visibles con el texto exacto "Abrir"
    const botonesVisibles = Array.from(container.querySelectorAll('button')).filter(
      (b) => window.getComputedStyle(b).display !== 'none' && b.textContent === 'Abrir'
    )
    expect(botonesVisibles.length).toBe(0)

    // 2. Tocar la fila de "Guión Dos" abre el guión
    const filaGuion2 = screen.getByTestId('fila-guion-g2')
    await act(async () => {
      fireEvent.click(filaGuion2)
    })

    expect(guionAbiertoId).toBe('g2')
  })

  test('T150: Mantener apretada una fila muestra archivar y borrar. Un toque corto NO los muestra: abre el guion.', async () => {
    let guionAbiertoId: string | null = null
    let guionBorradoId: string | null = null
    const guiones = [
      { id: 'g1', titulo: 'Guión Prueba', idioma: 'es', modificado: Date.now(), palabras: 150 }
    ]

    render(
      React.createElement(BibliotecaView, {
        guiones,
        onAbrir: (id: string) => { guionAbiertoId = id },
        onCrearNuevo: () => {},
        onImportarArchivo: () => {},
        onBorrar: (id: string) => { guionBorradoId = id },
        onArchivar: () => {}
      })
    )

    // 1. Un toque corto NO muestra el menú de archivar/borrar y abre el guion
    const fila = screen.getByTestId('fila-guion-g1')
    await act(async () => {
      fireEvent.click(fila)
    })

    expect(guionAbiertoId).toBe('g1')
    expect(screen.queryByTestId('menu-opciones-g1')).toBeNull()

    // 2. Un toque largo (long press simulated via context menu or touch timer) muestra el menú
    await act(async () => {
      fireEvent.contextMenu(fila)
    })

    expect(screen.getByTestId('menu-opciones-g1')).not.toBeNull()
    expect(screen.getByText('Archivar')).not.toBeNull()
    expect(screen.getByText('Eliminar')).not.toBeNull()
  })

  test('T151: GUARDIANA DEL TITULO. En el editor, el titulo del guion se dibuja con el tamano de display y NO existe ninguna etiqueta con el texto "Título del guión". Editarlo cambia el guion.', async () => {
    let guionModificado: Guion | null = null
    const guionInicial: Guion = {
      id: 'g-t151',
      titulo: 'Título Original',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del bloque' }]
    }

    render(
      React.createElement(EditorView, {
        guion: guionInicial,
        onChangeGuion: (nuevo) => { guionModificado = nuevo },
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    // 1. Verificar que NO existe ninguna etiqueta o texto con "Título del guión"
    expect(screen.queryByText(/Título del guión/i)).toBeNull()

    // 2. Verificar que el título se dibuja con la clase texto-display
    const inputTitulo = screen.getByTestId('input-titulo-guion') as HTMLInputElement
    expect(inputTitulo).not.toBeNull()
    expect(inputTitulo.classList.contains('texto-display')).toBe(true)
    expect(inputTitulo.value).toBe('Título Original')

    // 3. Editarlo modifica el guion
    await act(async () => {
      fireEvent.change(inputTitulo, { target: { value: 'Título Nuevo' } })
    })

    expect(guionModificado).not.toBeNull()
    expect((guionModificado as unknown as Guion).titulo).toBe('Título Nuevo')
  })

  test('T152: GUARDIANA DE LA BARRA CONTEXTUAL. Sin texto seleccionado, los botones de negrita y color NO estan en el documento. Con texto seleccionado, si.', async () => {
    const guion: Guion = {
      id: 'g-t152',
      titulo: 'Guion Barra Contextual',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Este es el texto para seleccionar.' }]
    }

    render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    // 1. Sin texto seleccionado, la barra de formato NO está en el documento
    expect(screen.queryByTestId('barra-formato-b1')).toBeNull()
    expect(screen.queryByTestId('btn-color-ambar')).toBeNull()

    // 2. Con texto seleccionado en el textarea, aparece la barra de formato
    const textarea = screen.getByPlaceholderText('Escribe el texto...') as HTMLTextAreaElement
    await act(async () => {
      fireEvent.select(textarea, { target: { selectionStart: 0, selectionEnd: 7 } })
    })

    expect(screen.getByTestId('barra-formato-b1')).not.toBeNull()
    expect(screen.getByTestId('btn-color-ambar')).not.toBeNull()
  })

  test('T153: GUARDIANA DEL DIAGNOSTICO. Con el interruptor apagado -que es lo de omision-, el texto "Franja de Estado" NO esta en el documento en ninguna de las dos pantallas. Encendido, si.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t153',
      titulo: 'Guion Diagnostico',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba' }]
    }
    await repo.guardar(guion)

    render(React.createElement(App, { repoOverride: repo }))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // 1. En la biblioteca, por omisión (interruptor apagado), NO existe "Franja de Estado"
    expect(screen.queryByText(/Franja de Estado/i)).toBeNull()

    // 2. Encendido mediante el toque en el resumen de biblioteca, SÍ aparece
    const resumen = screen.getByTestId('resumen-encabezado-biblioteca')
    await act(async () => {
      fireEvent.click(resumen)
    })

    expect(screen.getByText(/Franja de Estado/i)).not.toBeNull()
  })
})

// T160 GUARDIANA DE QUE UN MENU ABIERTO SE CIERRE TOCANDO AFUERA.
//
// Javier lo reporto el 13 de septiembre de 2026 sobre el menu ⋯ del editor: "al abrir esos
// botoncitos arriba, muy bien puestos, no se cierran si presiono en el texto". Y planteo el
// criterio que hace que esto valga la pena: "existe un conjunto de ese tipo de elementos,
// casi por coherencia de uso que se podrian resolver al buscar en la aplicacion".
//
// En un telefono nadie vuelve a buscar el mismo boton para cerrar: se toca afuera. Un menu
// que solo se cierra con el boton que lo abrio tapa el texto hasta que el usuario descubre
// el truco.
//
// Son TRES en toda la aplicacion y los tres usan el mismo hook, useCerrarAfuera: el ⋯ del
// editor, el ⋯ de la biblioteca y el de cada fila. Esta prueba los recorre, mas Escape.
describe('Pruebas TAREA 31 (T160)', () => {
  const guionEditor: Guion = {
    id: 'g-menu', titulo: 'Guion de prueba', idioma: 'es', creado: 1, modificado: 1,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion.' }]
  }
  const guionesBiblioteca = [
    { id: 'g1', titulo: 'Uno', idioma: 'es', modificado: 2, creado: 1, palabras: 10, archivado: false }
  ]

  test('T160: los menus del editor y de la biblioteca se cierran al tocar afuera y con Escape.', () => {
    // 1. el ⋯ del editor
    {
      const { unmount } = render(
        React.createElement(EditorView, {
          guion: guionEditor, onChangeGuion: () => {}, onVolverBiblioteca: () => {}, onEntrarLectura: () => {}
        })
      )
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
      expect(screen.queryByText('Pegar texto')).not.toBeNull()

      fireEvent.pointerDown(document.body)
      expect(screen.queryByText('Pegar texto')).toBeNull()

      // y con Escape
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
      expect(screen.queryByText('Pegar texto')).not.toBeNull()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByText('Pegar texto')).toBeNull()
      unmount()
    }

    // 2. el ⋯ de la biblioteca
    {
      const { unmount } = render(
        React.createElement(BibliotecaView, {
          guiones: guionesBiblioteca, onAbrir: () => {}, onCrearNuevo: () => {},
          onImportarArchivo: () => {}, onBorrar: () => {}, onArchivar: () => {}
        })
      )
      const btn = screen.getByTestId('btn-menu-superior-biblioteca')
      fireEvent.click(btn)
      const abierto = document.body.textContent || ''
      expect(abierto).toContain('Importar archivo')

      fireEvent.pointerDown(document.body)
      expect(document.body.textContent || '').not.toContain('Importar archivo')
      unmount()
    }

    // 3. el menu de cada fila, que se abre con clic derecho o toque largo
    {
      const { unmount } = render(
        React.createElement(BibliotecaView, {
          guiones: guionesBiblioteca, onAbrir: () => {}, onCrearNuevo: () => {},
          onImportarArchivo: () => {}, onBorrar: () => {}, onArchivar: () => {}
        })
      )
      const fila = screen.getByText('Uno')
      fireEvent.contextMenu(fila)
      expect(screen.queryByTestId('menu-opciones-g1')).not.toBeNull()

      fireEvent.pointerDown(document.body)
      expect(screen.queryByTestId('menu-opciones-g1')).toBeNull()
      unmount()
    }
  })
})

describe('Pruebas TAREA 34: La Toma es Negro y Texto (T163-T166)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('T163 - Al apretar el boton de leer del editor se entra a la lectura Y el motor arranca: no hace falta apretar nada mas. Con el motor falso, start() se llama despues de la cuenta regresiva.', async () => {
    vi.useFakeTimers()
    try {
      const motor = new MotorFake()
      const iniciarSpy = vi.spyOn(motor, 'iniciar')
      const repo = new RepositorioMemoria()
      const guion = {
        id: 'g-t163',
        titulo: 'Guion T163',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto de lectura automatica para T163' }]
      }
      await repo.guardar(guion)

      render(<App motor={motor} repoOverride={repo} />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      const fila = screen.getByTestId('fila-guion-g-t163')
      await act(async () => {
        fireEvent.click(fila)
        await vi.advanceTimersByTimeAsync(100)
      })

      const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
      await act(async () => {
        fireEvent.click(btnLeer)
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(screen.getByTestId('teleprompter-view-container')).not.toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2800)
      })
      expect(iniciarSpy).toHaveBeenCalledTimes(0)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(iniciarSpy).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('T164 - Al entrar a la lectura NO estan en el documento: el panel de corpus, el selector de motor, ni la franja de estado del motor. El texto si.', async () => {
    const motor = new MotorFake()
    const repo = new RepositorioMemoria()
    const guion = {
      id: 'g-t164',
      titulo: 'Guion T164',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto visible en la toma T164' }]
    }
    await repo.guardar(guion)

    render(<App motor={motor} repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    const fila = screen.getByTestId('fila-guion-g-t164')
    await act(async () => {
      fireEvent.click(fila)
      await new Promise((r) => setTimeout(r, 100))
    })

    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.queryByTestId('panel-corpus')).toBeNull()
    expect(screen.queryByLabelText('Motor de Voz (Avanzado)')).toBeNull()
    expect(screen.queryByTestId('franja-de-estado-diagnostico')).toBeNull()

    expect(screen.getByTestId('teleprompter-view-container')).not.toBeNull()
    expect(screen.getByTestId('columna-texto')).not.toBeNull()
    expect(screen.getByText('Texto')).not.toBeNull()
  })

  test('T165 - Un toque trae la barra minima: estan el control de letra y el de salir, y NO estan el selector de motor ni el panel de corpus.', async () => {
    const motor = new MotorFake()
    const repo = new RepositorioMemoria()
    const guion = {
      id: 'g-t165',
      titulo: 'Guion T165',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto para T165' }]
    }
    await repo.guardar(guion)

    render(<App motor={motor} repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    const fila = screen.getByTestId('fila-guion-g-t165')
    await act(async () => {
      fireEvent.click(fila)
      await new Promise((r) => setTimeout(r, 100))
    })

    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.queryByTestId('panel-controles-lectura')).toBeNull()

    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    expect(screen.getByTestId('panel-controles-lectura')).not.toBeNull()
    expect(screen.getByTestId('valor-letra')).not.toBeNull()
    expect(screen.getByText('← Volver al Editor')).not.toBeNull()

    expect(screen.queryByTestId('panel-corpus')).toBeNull()
    expect(screen.queryByLabelText('Motor de Voz (Avanzado)')).toBeNull()
  })

  test('T166 - El panel de corpus se puede abrir desde la biblioteca.', async () => {
    const repo = new RepositorioMemoria()
    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    expect(screen.queryByTestId('panel-corpus')).toBeNull()

    const btnMenu = screen.getByTestId('btn-menu-superior-biblioteca')
    await act(async () => {
      fireEvent.click(btnMenu)
    })

    const btnCorpus = screen.getByTestId('btn-abrir-corpus')
    await act(async () => {
      fireEvent.click(btnCorpus)
    })

    expect(screen.getByTestId('panel-corpus')).not.toBeNull()
  })
})

// T161 GUARDIANA DE QUE SE PUEDA AGREGAR UN SEGUNDO BLOQUE.
//
// El unico boton para agregar bloques vivia dentro de la pantalla vacia -"Agregar primer
// bloque"-, dentro de la rama (!guion.bloques || guion.bloques.length === 0). En cuanto el
// guion tenia un bloque, no habia ninguna manera de sumar otro. Aparecio el 13 de septiembre
// de 2026 revisando textos de botones: el texto estaba bien, lo que faltaba era la funcion.
describe('Pruebas TAREA 32 (T161)', () => {
  test('T161: con un guion que YA tiene un bloque, existe un boton para agregar otro y agregarlo suma un bloque.', () => {
    let guionActual: Guion = {
      id: 'g-bloques', titulo: 'Con un bloque', idioma: 'es', creado: 1, modificado: 1,
      bloques: [{ id: 'b1', nombre: '', texto: 'Primero.' }]
    }
    const { rerender } = render(
      React.createElement(EditorView, {
        guion: guionActual,
        onChangeGuion: (g: Guion) => { guionActual = g },
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    // la pantalla vacia no esta, y el boton de agregar SI
    expect(screen.queryByText('Agregar primer bloque')).toBeNull()
    const btn = screen.getByTestId('btn-agregar-bloque')
    expect(btn).not.toBeNull()

    fireEvent.click(btn)
    expect(guionActual.bloques.length).toBe(2)

    rerender(
      React.createElement(EditorView, {
        guion: guionActual, onChangeGuion: () => {}, onVolverBiblioteca: () => {}, onEntrarLectura: () => {}
      })
    )
    expect(document.querySelectorAll('textarea').length).toBe(2)
  })
})
