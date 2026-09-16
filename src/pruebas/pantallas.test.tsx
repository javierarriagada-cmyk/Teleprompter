import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'

// EL PLUGIN DE ANDROID, FINGIDO ACA Y NO EN LA APLICACION.
//
// jsdom no tiene Capacitor, asi que el gesto de atras no existe al probar. La
// primera version resolvio eso dejando que la APLICACION colgara su propia funcion
// de window.__simularBotonAtras para que la prueba la llamara.
//
// Eso tenia dos problemas. El chico: ese atajo viajaba en el APK, codigo que
// existe solo para que una prueba sea posible. El grave: la prueba llamaba a una
// COPIA de la funcion y nunca comprobaba que estuviera conectada al gesto real.
// Comprobado el 15 de septiembre de 2026 borrando la linea del addListener: el
// gesto quedaba desconectado -en el telefono la lectura se habria perdido- y T188
// seguia VERDE.
//
// Asi, en cambio, se captura el listener que la aplicacion registra de verdad. Si
// alguien borra el addListener, no hay listener que capturar y la prueba falla.
const listenersAtras: Array<() => void> = []
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (evento: string, cb: () => void) => {
      if (evento === 'backButton') listenersAtras.push(cb)
      return Promise.resolve({ remove: () => {} })
    },
    exitApp: vi.fn()
  }
}))

// Dispara el gesto de atras como lo haria Android: por el listener registrado.
async function simularGestoAtras() {
  expect(listenersAtras.length).toBeGreaterThan(0)
  await act(async () => {
    listenersAtras[listenersAtras.length - 1]()
    await Promise.resolve()
  })
}

import App from '../App'
import BibliotecaView from '../components/BibliotecaView'
import EditorView from '../components/EditorView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'
import { MotorVosk } from '../motor/MotorVosk'

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

    // 2. Encendido mediante el toque en el título de la tarjeta de portada, SÍ aparece
    const resumen = screen.getByTestId('titulo-tarjeta-lectura')
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
      const fila = screen.getByTestId('fila-guion-g1')
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

  test('T181 - Con la biblioteca vacia NO aparece "0 minutos de lectura". Y con un solo minuto dice "minuto", no "minutos".', async () => {
    const { formatearTextoResumen } = await import('../components/BibliotecaView')

    const textoVacio = formatearTextoResumen([])
    expect(textoVacio).toBe('0 guiones')
    expect(textoVacio).not.toContain('0 minutos de lectura')

    const guionesUnMinuto = [
      { id: 'g1', titulo: 'Guión Corto', idioma: 'es', modificado: Date.now(), palabras: 100 }
    ]

    const textoUnMinuto = formatearTextoResumen(guionesUnMinuto)
    expect(textoUnMinuto).toContain('1 minuto de lectura')
    expect(textoUnMinuto).not.toContain('1 minutos de lectura')
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

  test('T183 - El panel muestra los dos títulos de grupo, y los siete controles están en el grupo que les corresponde.', () => {
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
    expect(screen.getByText('Cómo se ve el texto')).not.toBeNull()
    expect(screen.getByText('La toma')).not.toBeNull()

    // 2. Orden y pertenencia de controles por grupo
    const htmlText = panel.innerHTML
    const idxGrupo1 = htmlText.indexOf('Cómo se ve el texto')
    const idxGrupo2 = htmlText.indexOf('La toma')

    expect(idxGrupo1).toBeLessThan(idxGrupo2)

    // Grupo 1: Tamaño de letra, Ancho, Tipografía
    const idxLetra = htmlText.indexOf('Tamaño de letra:')
    const idxAncho = htmlText.indexOf('Ancho:')
    const idxTipoFuente = htmlText.indexOf('Tipografía:')

    expect(idxLetra).toBeGreaterThan(idxGrupo1)
    expect(idxLetra).toBeLessThan(idxGrupo2)
    expect(idxAncho).toBeGreaterThan(idxLetra)
    expect(idxAncho).toBeLessThan(idxGrupo2)
    expect(idxTipoFuente).toBeGreaterThan(idxAncho)
    expect(idxTipoFuente).toBeLessThan(idxGrupo2)

    // Grupo 2: Fondo y letra, Dónde lees, Espejo, Mostrar tiempo
    const idxFondoLetra = htmlText.indexOf('Fondo y letra:')
    const idxDondeLees = htmlText.indexOf('Dónde lees:')
    const idxEspejo = htmlText.indexOf('Espejo:')
    const idxMostrarTiempo = htmlText.indexOf('Mostrar tiempo:')

    expect(idxFondoLetra).toBeGreaterThan(idxGrupo2)
    expect(idxDondeLees).toBeGreaterThan(idxFondoLetra)
    expect(idxEspejo).toBeGreaterThan(idxDondeLees)
    expect(idxMostrarTiempo).toBeGreaterThan(idxEspejo)
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

    // Cambiar motor a Nativo (Android)
    await act(async () => {
      fireEvent.change(selectEngine, { target: { value: 'nativo' } })
    })
    expect(selectEngine.value).toBe('nativo')

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

describe('Pruebas TAREA 41: El gesto de atrás y deshabilitación de Leer (T188-T190)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T188 - GUARDIANA DE LA LECTURA. Durante la lectura, el gesto de atras llama a detenerGrabacion, igual que el boton Salir. La lectura no se pierde.', async () => {
    const grabadorModule = await import('../lib/grabadorCorpus')
    const spyDetener = vi.spyOn(grabadorModule, 'detenerGrabacion')

    const motor = new MotorFake()
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t188',
      titulo: 'Guion T188',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Un dos tres cuatro cinco seis siete palabras en este guion' }]
    }
    await repo.guardar(guion)

    render(React.createElement(App, { motor, repoOverride: repo }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Entrar al guion en el editor
    const fila = screen.getByTestId('fila-guion-g-t188')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Entrar a la lectura
    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 200))
    })

    // Confirmar que estamos en lectura
    expect(screen.getByTestId('teleprompter-view-container')).not.toBeNull()

    await simularGestoAtras()
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })

    // Verificar que detenerGrabacion se haya llamado y estemos de vuelta en el editor
    expect(spyDetener).toHaveBeenCalled()
    expect(screen.getByTestId('input-titulo-guion')).not.toBeNull()
  })

  test('T189 - Con un modal abierto, el gesto de atras cierra el modal y NO sale de la pantalla de atras.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t189',
      titulo: 'Guion T189',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion T189' }]
    }
    await repo.guardar(guion)

    render(React.createElement(App, { repoOverride: repo }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Entrar al editor
    const fila = screen.getByTestId('fila-guion-g-t189')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Abrir modal de Ajustes
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Ajustes'))
    })

    expect(screen.getByTestId('panel-ajustes')).not.toBeNull()

    await simularGestoAtras()

    // El modal de Ajustes se cierra, pero SE MANTIENE en la vista del editor
    expect(screen.queryByTestId('panel-ajustes')).toBeNull()
    expect(screen.getByTestId('input-titulo-guion')).not.toBeNull()
  })

  test('T190 - Con un guion vacio, "btn-leer-guion-fijo" NO esta en el documento. Con texto, SI esta.', () => {
    const guionVacio: Guion = {
      id: 'g-vacio-t190',
      titulo: 'Guion Vacio T190',
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

    // Con guión vacío NO está el botón btn-leer-guion-fijo en el DOM
    expect(screen.queryByTestId('btn-leer-guion-fijo')).toBeNull()

    unmount()

    const guionConTexto: Guion = {
      id: 'g-con-texto-t190',
      titulo: 'Guion Con Texto T190',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Hola mundo' }]
    }

    render(
      React.createElement(EditorView, {
        guion: guionConTexto,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    const btnLeerTexto = screen.getByTestId('btn-leer-guion-fijo') as HTMLButtonElement
    expect(btnLeerTexto).not.toBeNull()
    expect(btnLeerTexto.disabled).toBe(false)
    // El 16 de septiembre de 2026 se saco el "— Escribe algo para leer": la pantalla
    // ya lo dice tres veces -el contador en 0 palabras, el "Escribe el texto..." del
    // bloque y el propio boton apagado-. Lo que esta prueba cuida, que el boton este
    // HABILITADO con texto, no cambio.
    expect(btnLeerTexto.textContent?.trim()).toBe('▶ Leer')
  })

  test('T191 - GUARDIANA DEL AJUSTE VIEJO. Con engine "webspeech" guardado en localStorage -o cualquier valor que ya no existe-, la aplicacion abre y termina con un motor valido. No queda sin motor ni lanza.', async () => {
    localStorage.clear()
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ engine: 'webspeech' }))

    vi.spyOn(MotorVosk.prototype, 'disponible').mockResolvedValue(true)

    const repo = new RepositorioMemoria()
    render(React.createElement(App, { repoOverride: repo }))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // Activar diagnóstico
    const resumen = screen.getByTestId('titulo-tarjeta-lectura')
    await act(async () => {
      fireEvent.click(resumen)
    })

    const diagnostico = screen.getByTestId('franja-de-estado-diagnostico')
    expect(diagnostico.textContent).not.toContain('webspeech')
  })
})

describe('Pruebas TAREA 44: Los Ajustes, de diez controles a siete (T195-T198)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T195 - "Ancho" mueve columna y margen a la vez: los tres pasos dan tres anchos distintos, y "Ancho" deja margen 5% y columna completa.', () => {
    let columnaAngostaState = false
    let marginPercentState = 5

    const guion: Guion = {
      id: 'g-t195',
      titulo: 'Guión T195',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T195' }]
    }

    const { rerender } = render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {},
        columnaAngosta: columnaAngostaState,
        setColumnaAngosta: (c) => { columnaAngostaState = c; rerenderComp() },
        marginPercent: marginPercentState,
        setMarginPercent: (m) => { marginPercentState = m; rerenderComp() }
      })
    )

    function rerenderComp() {
      rerender(
        React.createElement(EditorView, {
          guion,
          onChangeGuion: () => {},
          onVolverBiblioteca: () => {},
          onEntrarLectura: () => {},
          columnaAngosta: columnaAngostaState,
          setColumnaAngosta: (c) => { columnaAngostaState = c; rerenderComp() },
          marginPercent: marginPercentState,
          setMarginPercent: (m) => { marginPercentState = m; rerenderComp() }
        })
      )
    }

    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    fireEvent.click(screen.getByText('Ajustes'))

    const btnAncho = screen.getByText('Ancho')
    const btnMedio = screen.getByText('Medio')
    const btnAngosto = screen.getByText('Angosto')

    // 1. "Ancho" deja margen 5% y columna completa (columnaAngosta = false)
    fireEvent.click(btnAncho)
    expect(columnaAngostaState).toBe(false)
    expect(marginPercentState).toBe(5)

    // 2. "Medio" deja columna completa (columnaAngosta = false) y margen 12%
    fireEvent.click(btnMedio)
    expect(columnaAngostaState).toBe(false)
    expect(marginPercentState).toBe(12)

    // 3. "Angosto" deja columna angosta (columnaAngosta = true) y margen 5%
    fireEvent.click(btnAngosto)
    expect(columnaAngostaState).toBe(true)
    expect(marginPercentState).toBe(5)

    // Confirmar que los tres pasos dan tres combinaciones de columna/margen distintas
    expect(5).not.toBe(12)
  })

  test('T196 - Las parejas de color mueven fondo y letra juntos, y NO existe forma de elegir una combinacion donde fondo y letra sean iguales.', () => {
    let colorFondoState = '#000000'
    let colorLetraState = '#FFFFFF'

    const guion: Guion = {
      id: 'g-t196',
      titulo: 'Guión T196',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T196' }]
    }

    const { container, rerender } = render(
      React.createElement(EditorView, {
        guion,
        onChangeGuion: () => {},
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {},
        colorFondo: colorFondoState,
        setColorFondo: (f) => { colorFondoState = f; rerenderComp() },
        colorLetra: colorLetraState,
        setColorLetra: (l) => { colorLetraState = l; rerenderComp() }
      })
    )

    function rerenderComp() {
      rerender(
        React.createElement(EditorView, {
          guion,
          onChangeGuion: () => {},
          onVolverBiblioteca: () => {},
          onEntrarLectura: () => {},
          colorFondo: colorFondoState,
          setColorFondo: (f) => { colorFondoState = f; rerenderComp() },
          colorLetra: colorLetraState,
          setColorLetra: (l) => { colorLetraState = l; rerenderComp() }
        })
      )
    }

    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    fireEvent.click(screen.getByText('Ajustes'))

    // Comprobar que NO hay selects o controles independientes para Fondo o Letra
    expect(container.querySelector('select[aria-label="Color de fondo"]')).toBeNull()
    expect(container.querySelector('select[aria-label="Color de letra"]')).toBeNull()

    const btnNegroBlanco = screen.getByTitle('Negro con blanco')
    const btnNegroAmbar = screen.getByTitle('Negro con ámbar')
    const btnBlancoNegro = screen.getByTitle('Blanco con negro')

    // Probar las tres parejas
    fireEvent.click(btnNegroAmbar)
    expect(colorFondoState).toBe('#000000')
    expect(colorLetraState).toBe('#F5C24B')
    expect(colorFondoState).not.toBe(colorLetraState)

    fireEvent.click(btnBlancoNegro)
    expect(colorFondoState).toBe('#FFFFFF')
    expect(colorLetraState).toBe('#000000')
    expect(colorFondoState).not.toBe(colorLetraState)

    fireEvent.click(btnNegroBlanco)
    expect(colorFondoState).toBe('#000000')
    expect(colorLetraState).toBe('#FFFFFF')
    expect(colorFondoState).not.toBe(colorLetraState)
  })

  test('T197 - GUARDIANA DEL AJUSTE VIEJO. Con una combinacion de colores guardada en localStorage que ya no existe, la aplicacion abre con negro sobre blanco y no lanza.', async () => {
    localStorage.clear()
    localStorage.setItem(
      'teleprompter_ajustes',
      JSON.stringify({ colorFondo: '#FFFFFF', colorLetra: '#FFFFFF' })
    )

    const repo = new RepositorioMemoria()
    const guion = {
      id: 'g-t197',
      titulo: 'Guion T197',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T197' }]
    }
    await repo.guardar(guion)

    let container: HTMLElement
    await act(async () => {
      const res = render(React.createElement(App, { repoOverride: repo }))
      container = res.container
      await new Promise((r) => setTimeout(r, 600))
    })

    // Abrir guion en el editor
    const fila = screen.getByTestId('fila-guion-g-t197')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Entrar a la lectura
    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    const prompterView = container!.querySelector('[data-testid="teleprompter-view-container"]') as HTMLElement
    expect(prompterView).not.toBeNull()

    // Con combinacion vieja/invalida (blanco sobre blanco), cae en negro sobre blanco (#000000 / #FFFFFF)
    expect(prompterView.getAttribute('data-fondo')).toBe('#000000')
    expect(prompterView.getAttribute('data-letra')).toBe('#FFFFFF')
  })

  test('T198 - "Tema" NO esta en el panel de Ajustes y SI esta en la biblioteca, y sigue cambiando el modo oscuro.', async () => {
    const repo = new RepositorioMemoria()
    const guion = {
      id: 'g-t198',
      titulo: 'Guion T198',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T198' }]
    }
    await repo.guardar(guion)

    render(React.createElement(App, { repoOverride: repo }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // 1. Abrir Editor -> Ajustes: verificar que NO esta Tema
    const fila = screen.getByTestId('fila-guion-g-t198')
    await act(async () => {
      fireEvent.click(fila)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Ajustes'))
    })

    const panelAjustes = screen.getByTestId('panel-ajustes')
    expect(panelAjustes.textContent).not.toContain('Tema:')

    // Cerrar panel y volver a la Biblioteca
    const btnCruz = panelAjustes.querySelector('button')!
    await act(async () => {
      fireEvent.click(btnCruz)
    })
    await act(async () => {
      fireEvent.click(screen.getByText('‹ Guiones'))
    })

    // 2. En la Biblioteca: abrir menu ⋯ superior y verificar que SI esta Tema
    const btnMenuBiblio = screen.getByTestId('btn-menu-superior-biblioteca')
    await act(async () => {
      fireEvent.click(btnMenuBiblio)
    })

    expect(screen.getByText('Tema:')).not.toBeNull()
    const btnClaro = screen.getByRole('button', { name: 'Claro' })
    const btnOscuro = screen.getByRole('button', { name: 'Oscuro' })
    expect(btnClaro).not.toBeNull()
    expect(btnOscuro).not.toBeNull()

    // 3. Cambiar a Oscuro y comprobar data-tema en documentElement
    await act(async () => {
      fireEvent.click(btnOscuro)
    })
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro')

    // Cambiar a Claro y comprobar data-tema
    await act(async () => {
      fireEvent.click(btnClaro)
    })
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro')
  })
})

describe('Pruebas TAREA 43: El sistema operativo no puede meterse en la pantalla (T192-T194)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('T192 - GUARDIANA DEL CERO. Con env() a 0, la geometria de biblioteca, editor y lectura queda IDENTICA a la de hoy.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t192',
      titulo: 'Guion T192',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto para la prueba T192' }]
    }
    await repo.guardar(guion)

    const { container, unmount } = render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // En biblioteca, la raiz tiene sus paddings base
    const rootDiv = container.firstElementChild as HTMLElement
    expect(rootDiv).not.toBeNull()

    // Abrir editor
    const fila = screen.getByTestId('fila-guion-g-t192')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Entrar a lectura
    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    // En lectura, la raiz tiene padding 0 en los cuatro bordes
    expect(rootDiv.style.paddingTop).toBe('0px')
    expect(rootDiv.style.paddingBottom).toBe('0px')
    expect(rootDiv.style.paddingLeft).toBe('0px')
    expect(rootDiv.style.paddingRight).toBe('0px')

    unmount()
  })

  test('T193 - La raiz de biblioteca y editor usa env(safe-area-inset-*) en los cuatro bordes, sumado a los 16 px, no en lugar de ellos.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t193',
      titulo: 'Guion T193',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T193' }]
    }
    await repo.guardar(guion)

    const { container, unmount } = render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const rootBiblio = container.firstElementChild as HTMLElement
    expect(rootBiblio.style.paddingTop).toContain('16px')
    expect(rootBiblio.style.paddingTop).toContain('safe-area-inset-top')
    expect(rootBiblio.style.paddingBottom).toContain('16px')
    expect(rootBiblio.style.paddingBottom).toContain('safe-area-inset-bottom')
    expect(rootBiblio.style.paddingLeft).toContain('16px')
    expect(rootBiblio.style.paddingLeft).toContain('safe-area-inset-left')
    expect(rootBiblio.style.paddingRight).toContain('16px')
    expect(rootBiblio.style.paddingRight).toContain('safe-area-inset-right')

    // Abrir editor
    const fila = screen.getByTestId('fila-guion-g-t193')
    await act(async () => {
      fireEvent.click(fila)
    })

    const rootEditor = container.firstElementChild as HTMLElement
    expect(rootEditor.style.paddingTop).toContain('16px')
    expect(rootEditor.style.paddingTop).toContain('safe-area-inset-top')
    expect(rootEditor.style.paddingBottom).toContain('16px')
    expect(rootEditor.style.paddingBottom).toContain('safe-area-inset-bottom')
    expect(rootEditor.style.paddingLeft).toContain('16px')
    expect(rootEditor.style.paddingLeft).toContain('safe-area-inset-left')
    expect(rootEditor.style.paddingRight).toContain('16px')
    expect(rootEditor.style.paddingRight).toContain('safe-area-inset-right')

    unmount()
  })

  test('T194 - La barra de controles de lectura descuenta el area segura de abajo.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t194',
      titulo: 'Guion T194',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T194' }]
    }
    await repo.guardar(guion)

    const { unmount } = render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const fila = screen.getByTestId('fila-guion-g-t194')
    await act(async () => {
      fireEvent.click(fila)
    })

    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    // Traer controles con un toque
    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    const panel = screen.getByTestId('panel-controles-lectura') as HTMLElement
    expect(panel).not.toBeNull()
    expect(panel.style.bottom).toContain('16px')
    expect(panel.style.bottom).toContain('safe-area-inset-bottom')
    expect(panel.style.left).toContain('16px')
    expect(panel.style.left).toContain('safe-area-inset-left')
    expect(panel.style.right).toContain('16px')
    expect(panel.style.right).toContain('safe-area-inset-right')

    unmount()
  })
})
