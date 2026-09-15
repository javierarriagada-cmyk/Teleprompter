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
    expect(screen.getByText('← Salir')).not.toBeNull()

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

describe('Pruebas TAREA 39: Tres arreglos del editor y la biblioteca (T180-T182)', () => {
  test('T180 - Con un guion vacio, el editor NO dice "1 min". Con texto, si muestra la duracion.', () => {
    const guionVacio: Guion = {
      id: 'g-vacio',
      titulo: 'Guión Vacío',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: []
    }

    const { unmount } = render(
      React.createElement(EditorView, {
        guion: guionVacio,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    expect(screen.getByText('0 palabras')).not.toBeNull()
    expect(screen.queryByText(/1 min/i)).toBeNull()
    unmount()

    const guionConTexto: Guion = {
      id: 'g-texto',
      titulo: 'Guión Con Texto',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Este guión tiene varias palabras para probar la duración estimada en minutos.' }]
    }

    render(
      React.createElement(EditorView, {
        guion: guionConTexto,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    expect(screen.getByText(/12 palabras · 1 min/i)).not.toBeNull()
  })

  test('T181 - Con la biblioteca vacia NO aparece "0 minutos de lectura". Y con un solo minuto dice "minuto", no "minutos".', () => {
    const { unmount } = render(
      React.createElement(BibliotecaView, {
        guiones: [],
        onAbrir: () => {},
        onCrearNuevo: () => {},
        onImportarArchivo: () => {},
        onBorrar: () => {},
        onArchivar: () => {}
      })
    )

    const resumenVacio = screen.getByTestId('resumen-encabezado-biblioteca')
    expect(resumenVacio.textContent).toBe('0 guiones')
    expect(resumenVacio.textContent).not.toContain('0 minutos de lectura')
    unmount()

    const guionesUnMinuto = [
      { id: 'g1', titulo: 'Guión Corto', idioma: 'es', modificado: Date.now(), palabras: 100 }
    ]

    render(
      React.createElement(BibliotecaView, {
        guiones: guionesUnMinuto,
        onAbrir: () => {},
        onCrearNuevo: () => {},
        onImportarArchivo: () => {},
        onBorrar: () => {},
        onArchivar: () => {}
      })
    )

    const resumenUnMinuto = screen.getByTestId('resumen-encabezado-biblioteca')
    expect(resumenUnMinuto.textContent).toContain('1 minuto de lectura')
    expect(resumenUnMinuto.textContent).not.toContain('1 minutos de lectura')
  })

  test('T182 - El menu del editor NO contiene el caracter ⚙, y el boton de ajustes dice "Ajustes".', () => {
    const guion: Guion = {
      id: 'g-t182',
      titulo: 'Guión T182',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guión' }]
    }

    const { container } = render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {},
        setColumnaAngosta: () => {},
        setMarginPercent: () => {},
        setTipoFuente: () => {},
        setColorFondo: () => {},
        setColorLetra: () => {},
        setTema: () => {},
        setMirror: () => {},
        setAnclajeZona: () => {},
        setMostrarTiempo: () => {}
      })
    )

    const btnMenu = screen.getByTestId('btn-menu-opciones-editor')
    fireEvent.click(btnMenu)

    // No debe contener el caracter ⚙ en el menú desplegable
    expect(container.textContent).not.toContain('⚙')

    // El botón de ajustes dice exactamente 'Ajustes'
    const btnAjustes = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Ajustes'
    )
    expect(btnAjustes).not.toBeUndefined()
    expect(btnAjustes?.textContent?.trim()).toBe('Ajustes')
  })
})

describe('Pruebas TAREA 40: Los Ajustes, Agrupados y Completos (T183-T187)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T183 - El panel muestra los tres títulos de grupo, y cada ajuste está en el grupo que le corresponde.', () => {
    const guion: Guion = {
      id: 'g-t183',
      titulo: 'Guión T183',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guión' }]
    }

    render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {},
        setColumnaAngosta: () => {},
        setMarginPercent: () => {},
        setTipoFuente: () => {},
        setColorFondo: () => {},
        setColorLetra: () => {},
        setTema: () => {},
        setMirror: () => {},
        setAnclajeZona: () => {},
        setMostrarTiempo: () => {}
      })
    )

    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    fireEvent.click(screen.getByText('Ajustes'))

    const panel = screen.getByTestId('panel-ajustes')
    expect(panel).not.toBeNull()

    // 1. Títulos de grupo
    expect(screen.getByText('COMO SE VE EL TEXTO')).not.toBeNull()
    expect(screen.getByText('COLORES')).not.toBeNull()
    expect(screen.getByText('LA TOMA')).not.toBeNull()

    // 2. Orden y pertenencia de controles por grupo
    const htmlText = panel.innerHTML
    const idxGrupo1 = htmlText.indexOf('COMO SE VE EL TEXTO')
    const idxGrupo2 = htmlText.indexOf('COLORES')
    const idxGrupo3 = htmlText.indexOf('LA TOMA')

    expect(idxGrupo1).toBeLessThan(idxGrupo2)
    expect(idxGrupo2).toBeLessThan(idxGrupo3)

    // Grupo 1: Tamaño de letra, Columna, Margen, Tipografía
    const idxLetra = htmlText.indexOf('Tamaño de letra:')
    const idxColumna = htmlText.indexOf('Columna:')
    const idxMargen = htmlText.indexOf('Margen:')
    const idxTipoFuente = htmlText.indexOf('Tipografía:')

    expect(idxLetra).toBeGreaterThan(idxGrupo1)
    expect(idxLetra).toBeLessThan(idxGrupo2)
    expect(idxColumna).toBeGreaterThan(idxLetra)
    expect(idxColumna).toBeLessThan(idxGrupo2)
    expect(idxMargen).toBeGreaterThan(idxColumna)
    expect(idxMargen).toBeLessThan(idxGrupo2)
    expect(idxTipoFuente).toBeGreaterThan(idxMargen)
    expect(idxTipoFuente).toBeLessThan(idxGrupo2)

    // Grupo 2: Fondo, Color de letra, Tema
    const idxFondo = htmlText.indexOf('Fondo:')
    const idxColorLetra = htmlText.indexOf('Color de letra:')
    const idxTema = htmlText.indexOf('Tema:')

    expect(idxFondo).toBeGreaterThan(idxGrupo2)
    expect(idxFondo).toBeLessThan(idxGrupo3)
    expect(idxColorLetra).toBeGreaterThan(idxFondo)
    expect(idxColorLetra).toBeLessThan(idxGrupo3)
    expect(idxTema).toBeGreaterThan(idxColorLetra)
    expect(idxTema).toBeLessThan(idxGrupo3)

    // Grupo 3: Espejo, Anclaje, Mostrar tiempo
    const idxEspejo = htmlText.indexOf('Espejo:')
    const idxAnclaje = htmlText.indexOf('Anclaje:')
    const idxMostrarTiempo = htmlText.indexOf('Mostrar tiempo:')

    expect(idxEspejo).toBeGreaterThan(idxGrupo3)
    expect(idxAnclaje).toBeGreaterThan(idxEspejo)
    expect(idxMostrarTiempo).toBeGreaterThan(idxAnclaje)
  })

  test('T184 - El tamaño de letra se puede cambiar DESDE EL PANEL, recorre los cinco pasos y en los extremos no se sale.', () => {
    let size = 24
    function handleMenos() {
      const pasos = [14, 18, 24, 32, 42]
      const idx = pasos.indexOf(size)
      if (idx > 0) size = pasos[idx - 1]
    }
    function handleMas() {
      const pasos = [14, 18, 24, 32, 42]
      const idx = pasos.indexOf(size)
      if (idx >= 0 && idx < pasos.length - 1) size = pasos[idx + 1]
    }

    const guion: Guion = {
      id: 'g-t184',
      titulo: 'Guión T184',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guión' }]
    }

    const { rerender } = render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {},
        fontSize: size,
        onLetraMenos: () => { handleMenos(); rerenderComp() },
        onLetraMas: () => { handleMas(); rerenderComp() }
      })
    )

    function rerenderComp() {
      rerender(
        React.createElement(EditorView, {
          guion,
          onChangeGuion: () => {},
          onVolverBiblioteca: () => {},
          onEntrarLectura: () => {},
          fontSize: size,
          onLetraMenos: () => { handleMenos(); rerenderComp() },
          onLetraMas: () => { handleMas(); rerenderComp() }
        })
      )
    }

    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    fireEvent.click(screen.getByText('Ajustes'))

    const btnMenos = screen.getByLabelText('Disminuir letra panel')
    const btnMas = screen.getByLabelText('Aumentar letra panel')
    const valSpan = screen.getByTestId('valor-letra-panel')

    expect(valSpan.textContent).toBe('24')

    // Bajar a 18 -> 14 -> inteto extra
    fireEvent.click(btnMenos)
    expect(valSpan.textContent).toBe('18')
    fireEvent.click(btnMenos)
    expect(valSpan.textContent).toBe('14')
    fireEvent.click(btnMenos)
    expect(valSpan.textContent).toBe('14')

    // Subir a 18 -> 24 -> 32 -> 42 -> intento extra
    fireEvent.click(btnMas)
    expect(valSpan.textContent).toBe('18')
    fireEvent.click(btnMas)
    expect(valSpan.textContent).toBe('24')
    fireEvent.click(btnMas)
    expect(valSpan.textContent).toBe('32')
    fireEvent.click(btnMas)
    expect(valSpan.textContent).toBe('42')
    fireEvent.click(btnMas)
    expect(valSpan.textContent).toBe('42')
  })

  test('T185 - El mismo valor se ve reflejado en la barra de lectura y en el panel: no son dos estados distintos.', async () => {
    const repo = new RepositorioMemoria()
    const guion = {
      id: 'g-t185',
      titulo: 'Guion T185',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba para T185' }]
    }
    await repo.guardar(guion)

    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // Abrir guión en editor
    const fila = screen.getByTestId('fila-guion-g-t185')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Abrir Ajustes desde el Editor
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Ajustes'))
    })

    // Cambiar tamaño de letra en el panel de 24 a 32 (+1 paso)
    const btnMasPanel = screen.getByLabelText('Aumentar letra panel')
    await act(async () => {
      fireEvent.click(btnMasPanel)
    })
    expect(screen.getByTestId('valor-letra-panel').textContent).toBe('32')

    // Cerrar panel tocando ✕
    const btnCerrar = screen.getByTestId('panel-ajustes').querySelector('button')!
    await act(async () => {
      fireEvent.click(btnCerrar)
    })

    // Entrar a lectura
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))
    })

    // Traer barra de lectura
    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    // Comprobar que en la barra de lectura el tamaño es 32
    expect(screen.getByTestId('valor-letra').textContent).toBe('32')

    // Cambiar tamaño en la barra de lectura a 42 (+1 paso)
    const btnMasLectura = screen.getByLabelText('Aumentar letra')
    await act(async () => {
      fireEvent.click(btnMasLectura)
    })
    expect(screen.getByTestId('valor-letra').textContent).toBe('42')

    // Salir de lectura al editor
    const btnSalir = screen.getByText('← Salir')
    await act(async () => {
      fireEvent.click(btnSalir)
    })

    // Reabrir Ajustes en el Editor y comprobar que muestra 42
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Ajustes'))
    })

    expect(screen.getByTestId('valor-letra-panel').textContent).toBe('42')
  })

  test('T186 - El selector de motor y la transcripcion en vivo YA NO estan en el panel, y SI estan en la biblioteca, y el selector sigue cambiando el motor.', async () => {
    const repo = new RepositorioMemoria()
    const guion = {
      id: 'g-t186',
      titulo: 'Guion T186',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T186' }]
    }
    await repo.guardar(guion)

    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // 1. En la Biblioteca: abrir menú ⋯ y verificar que SI están Motor de voz y Transcripción en vivo
    const btnMenuBiblio = screen.getByTestId('btn-menu-superior-biblioteca')
    await act(async () => {
      fireEvent.click(btnMenuBiblio)
    })

    const selectEngine = screen.getByLabelText('Motor de Voz') as HTMLSelectElement
    expect(selectEngine).not.toBeNull()
    expect(screen.getByText('Ver transcripción en vivo')).not.toBeNull()

    // Cambiar motor a Web Speech API
    await act(async () => {
      fireEvent.change(selectEngine, { target: { value: 'webspeech' } })
    })
    expect(selectEngine.value).toBe('webspeech')

    // Cerrar menú Biblioteca
    await act(async () => {
      fireEvent.pointerDown(document.body)
    })

    // 2. Abrir Editor -> Ajustes: verificar que NO están selector de motor ni transcripción en vivo
    const fila = screen.getByTestId('fila-guion-g-t186')
    await act(async () => {
      fireEvent.click(fila)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Ajustes'))
    })

    expect(screen.queryByLabelText('Motor de Voz')).toBeNull()
    expect(screen.queryByLabelText('Motor de Voz (Avanzado)')).toBeNull()
    expect(screen.queryByText('Ver transcripción en vivo')).toBeNull()
  })

  test('T187 - El panel se cierra con la ✕ y NO hay boton "Listo".', () => {
    const guion: Guion = {
      id: 'g-t187',
      titulo: 'Guión T187',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guión' }]
    }

    render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    fireEvent.click(screen.getByText('Ajustes'))

    expect(screen.getByTestId('panel-ajustes')).not.toBeNull()

    // No existe botón "Listo"
    expect(screen.queryByText('Listo')).toBeNull()

    // El panel tiene la ✕ y al hacer clic se cierra
    const btnCruz = screen.getByTestId('panel-ajustes').querySelector('button')!
    expect(btnCruz.textContent).toBe('✕')

    fireEvent.click(btnCruz)
    expect(screen.queryByTestId('panel-ajustes')).toBeNull()
  })
})
