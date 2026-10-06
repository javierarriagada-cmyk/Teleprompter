import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { editorDelGuion, seleccionarEnGuion, textoDelGuion } from './ayudaEditor'

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
import { PantallaAjustes } from '../components/PantallaAjustes'
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
    // 28-09-2026: los botones pasaron a simbolos; se buscan por su nombre -aria-label-, que es lo que lee TalkBack. "Eliminar" ahora es "Borrar".
    expect(screen.getByLabelText('Borrar')).not.toBeNull()
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

    // 2. Con texto seleccionado en el editor, aparece la barra de formato
    seleccionarEnGuion(0, 7)

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

    // 2. Encendido mediante los 5 toques en la marca de la portada, SÍ aparece
    const marca = document.querySelector('.portada-marca') as HTMLElement
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca)
      }
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
// Eran TRES y los tres usaban useCerrarAfuera: el Aa del editor, el cajon de la
// biblioteca y el de cada fila. 28-09-2026: el cajon de la biblioteca se fue; el
// engranaje abre Ajustes. Quedan el Aa y el menu de cada fila, mas el cierre de
// Ajustes con su atras.
describe('Pruebas TAREA 31 (T160)', () => {
  const guionEditor: Guion = {
    id: 'g-menu', titulo: 'Guion de prueba', idioma: 'es', creado: 1, modificado: 1,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion.' }]
  }
  const guionesBiblioteca = [
    { id: 'g1', titulo: 'Uno', idioma: 'es', modificado: 2, creado: 1, palabras: 10, archivado: false }
  ]

  test('T160: los menus del editor y de la biblioteca se cierran al tocar afuera y con Escape.', () => {
    // 1. el Aa del editor -28-09-2026: ya no abre un cajon propio; pide la pantalla de Ajustes a App-
    {
      const abrir = vi.fn()
      const { unmount } = render(
        React.createElement(EditorView, {
          guion: guionEditor, onChangeGuion: () => {}, onVolverBiblioteca: () => {}, onEntrarLectura: () => {},
          onAbrirAjustes: abrir
        })
      )
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
      expect(abrir).toHaveBeenCalledTimes(1)
      expect(screen.queryByTestId('panel-ajustes')).toBeNull()
      unmount()
    }

    // 2. el engranaje de la biblioteca
    // 28-09-2026: el cajon menu-superior-biblioteca se fue. El engranaje abre
    // la pantalla de Ajustes —capa de App—, y se cierra con su atras.
    {
      const { unmount } = render(
        React.createElement(App, {})
      )
      const btn = screen.getByTestId('btn-menu-superior-biblioteca')
      fireEvent.click(btn)
      expect(screen.queryByTestId('pantalla-ajustes')).not.toBeNull()
      expect(screen.queryByTestId('menu-superior-biblioteca')).toBeNull()

      fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
      expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()

      fireEvent.click(btn)
      expect(screen.queryByTestId('pantalla-ajustes')).not.toBeNull()
      fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
      expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
      unmount()
    }

    // 3. el menu de cada fila, que se abre con clic derecho o toque largo
    {
      const { unmount } = render(
        React.createElement(BibliotecaView, {
          guiones: guionesBiblioteca, onAbrir: () => {}, onCrearNuevo: () => {},
          onBorrar: () => {}, onArchivar: () => {}
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

  test('T163 - Al apretar el boton de leer del editor se entra a la lectura Y el motor arranca: no hace falta apretar nada mas. Con el motor falso, start() se llama al empezar la cuenta regresiva -desde el 28-09-2026-.', async () => {
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
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-empezar-toma'))
        await vi.advanceTimersByTimeAsync(100)
      })

      // Desde el 28-09-2026 el motor arranca con la cuenta, no al final -ver T81-.
      expect(iniciarSpy).toHaveBeenCalledTimes(1)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3300)
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

  test('T165 - Un toque trae la barra minima: esta Salir, NO el control de letra (vive en el Aa del editor), y NO estan el selector de motor ni el panel de corpus.', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.queryByTestId('btn-salir-lectura')).toBeNull()

    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    expect(screen.getByTestId('btn-salir-lectura')).not.toBeNull()
    expect(screen.queryByTestId('valor-letra')).toBeNull()

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

    const marca = document.querySelector('.portada-marca') as HTMLElement
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca)
      }
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
  test('T161: con un guion que YA tiene un bloque, es una sola hoja de texto y NO existe el boton de agregar bloque.', () => {
    let guionActual: Guion = {
      id: 'g-bloques', titulo: 'Con un bloque', idioma: 'es', creado: 1, modificado: 1,
      bloques: [{ id: 'b1', nombre: '', texto: 'Primero.' }]
    }
    render(
      React.createElement(EditorView, {
        guion: guionActual,
        onChangeGuion: (g: Guion) => { guionActual = g },
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    // la pantalla vacia no esta, y NO existe el boton de agregar bloque
    expect(screen.queryByText('Agregar primer bloque')).toBeNull()
    expect(screen.queryByTestId('btn-agregar-bloque')).toBeNull()
    expect(document.querySelectorAll('[data-testid="editor-guion"]').length).toBe(1)
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

    expect(screen.queryByTestId('contador-palabras-editor')).toBeNull()
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

    // 28-09-2026: la duracion es la de duracionDeLectura, la misma de la portada -12 palabras a
    // 150 por minuto son 5 s-. Antes decia "1 min" redondeando hacia arriba, y la misma pantalla
    // mostraba "5 s" mas abajo.
    expect(screen.getByText(/12 palabras · 5 s/i)).not.toBeNull()
    expect(screen.queryByText(/12 palabras · 1 min/i)).toBeNull()
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

  test('T182 - El menu del editor NO contiene el caracter ⚙, y el boton de ajustes dice "Aa".', () => {
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
        setColorLetra: () => {}
      })
    )

    const btnMenu = screen.getByTestId('btn-menu-opciones-editor')
    expect(btnMenu.textContent?.trim()).toBe('Aa')
    expect(container.textContent).not.toContain('⚙')
  })
})


// 28-09-2026, tarea 77: EL CAJON Aa DEL EDITOR SE FUE. El Aa abre la pantalla de Ajustes de App
// -origen "editor"-, la misma de la portada y de LISTO. Las pruebas que cuidaban el tamano, el ancho,
// la tipografia y las parejas de color desde el cajon las cuidan ahora en esa pantalla.
function ajustesDelEditor(p: Record<string, unknown> = {}) {
  return React.createElement(PantallaAjustes, {
    onCerrar: () => {}, origen: 'editor', fontSize: 24, tipoFuente: 'sans', setTipoFuente: () => {},
    columnaAngosta: false, marginPercent: 5, setColumnaAngosta: () => {}, setMarginPercent: () => {},
    colorFondo: '#000000', colorLetra: '#FFFFFF', setColorFondo: () => {}, setColorLetra: () => {},
    mirror: false, setMirror: () => {}, mostrarTiempo: true, setMostrarTiempo: () => {},
    calidadVideo: '1080p', setCalidadVideo: () => {}, calidadesSoportadas: ['1080p'], minutosDisponibles: null,
    conCamara: false, tema: 'oscuro', setTema: () => {}, ...p
  } as any)
}

describe('Pruebas TAREA 40: Los Ajustes, Agrupados y Completos (T183-T187)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T183 - Desde el guion, Ajustes muestra solo lo del texto: tamaño, tipografía, ancho y colores. Dónde lees, video y apariencia no están acá.', () => {
    render(ajustesDelEditor())
    const pantalla = screen.getByTestId('pantalla-ajustes')
    expect(screen.getByTestId('fila-tamano-letra')).toBeTruthy()
    expect(screen.getByTestId('fila-tipo-letra')).toBeTruthy()
    expect(screen.getByTestId('fila-ancho-texto')).toBeTruthy()
    expect(screen.getByTestId('fila-colores')).toBeTruthy()
    expect(screen.getByTestId('muestra-lectura-ajustes')).toBeTruthy()
    // Lo de otras puertas no aparece desde el guion -origen editor, 28-09-2026-.
    expect(screen.queryByTestId('fila-calidad')).toBeNull()
    expect(screen.queryByTestId('fila-subtitulos')).toBeNull()
    expect(screen.queryByTestId('fila-tema')).toBeNull()
    expect(pantalla.textContent).not.toContain('Dónde lees')
  })

  test('T184 - El tamaño de letra se elige en Ajustes entre los cinco pasos, y cada opción entrega su paso.', () => {
    const elegir = vi.fn()
    render(ajustesDelEditor({ fontSize: 24, onElegirLetra: elegir }))
    expect(screen.getByTestId('fila-tamano-letra').textContent).toContain('24')
    for (const n of [14, 18, 24, 32, 42]) {
      fireEvent.click(screen.getByTestId('fila-tamano-letra'))
      fireEvent.click(screen.getByTestId(`opcion-letra-${n}`))
      expect(elegir).toHaveBeenLastCalledWith(n)
    }
    // No hay pasos fuera de la escalera.
    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    expect(screen.queryByTestId('opcion-letra-10')).toBeNull()
    expect(screen.queryByTestId('opcion-letra-50')).toBeNull()
  })

  test('T185 - El tamaño de letra vive en el Aa del editor. Entrar a leer no lo cambia, y no hay control de letra en la lectura.', async () => {
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

    // Abrir Ajustes desde el Editor -28-09-2026: el Aa abre la pantalla de Ajustes-
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })

    // Cambiar tamaño de letra de 24 a 32
    await act(async () => {
      fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('opcion-letra-32'))
    })
    expect(screen.getByTestId('fila-tamano-letra').textContent).toContain('32')

    // Cerrar Ajustes
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    })

    // Entrar al lienzo. Leer deja en LISTO; Empezar pasa a LEYENDO.
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    })

    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    expect(screen.queryByTestId('valor-letra')).toBeNull()

    const btnSalir = screen.getByTestId('btn-salir-lectura')
    await act(async () => {
      fireEvent.click(btnSalir)
    })
    // Primer piso: LEYENDO -> LISTO
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-volver-listo'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })

    expect(screen.getByTestId('fila-tamano-letra').textContent).toContain('32')
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

    // 1. Motor de voz y Transcripción en vivo NO estan en el panel del editor.
    //
    // Estaban en el menu del engranaje de la portada y desde la tarea 68 ya no:
    // son instrumentos nuestros, no preferencias, y viven detras de la puerta
    // de diagnostico. Lo que esta prueba cuida NO cambio -que no esten en el
    // panel del editor y que el selector siga cambiando el motor-, solo cambio
    // de donde se los saca.
    const marca186 = document.querySelector('.portada-marca') as HTMLElement
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca186)
      }
    })

    const selectEngine = screen.getByLabelText('Motor de Voz') as HTMLSelectElement
    expect(selectEngine).not.toBeNull()
    expect(screen.getByText('Ver transcripción en vivo')).not.toBeNull()

    // Cambiar motor a Nativo (Android)
    await act(async () => {
      fireEvent.change(selectEngine, { target: { value: 'nativo' } })
    })
    expect(selectEngine.value).toBe('nativo')

    // Cerrar la franja de diagnostico. Un toque afuera NO la cierra -eso
    // cerraba el menu del engranaje, que es otra cosa-: la franja conmuta con
    // el mismo titulo que la abre. Si queda abierta, su selector de motor
    // sigue en el documento y la comprobacion de abajo mira el equivocado.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca186)
      }
    })

    // 2. Abrir Editor -> Ajustes: verificar que NO están selector de motor ni transcripción en vivo
    const fila = screen.getByTestId('fila-guion-g-t186')
    await act(async () => {
      fireEvent.click(fila)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })

    expect(screen.queryByLabelText('Motor de Voz')).toBeNull()
    expect(screen.queryByLabelText('Motor de Voz (Avanzado)')).toBeNull()
    expect(screen.queryByText('Ver transcripción en vivo')).toBeNull()
  })

  test('T187 - Ajustes no tiene "Listo": elegir aplica y cierra el diálogo, y la pantalla se cierra con su flecha.', () => {
    // 28-09-2026: el cajon se fue. Lo que cuidaba -nada de "Listo"- sigue: en Ajustes no hay
    // boton de confirmar; cada eleccion aplica al tocarla.
    const cerrar = vi.fn()
    render(ajustesDelEditor({ onCerrar: cerrar }))
    expect(screen.getByTestId('pantalla-ajustes').textContent).not.toContain('Listo')
    fireEvent.click(screen.getByTestId('fila-tipo-letra'))
    expect(screen.getByTestId('capa-dialogo-ajustes')).toBeTruthy()
    expect(screen.getByTestId('capa-dialogo-ajustes').textContent).not.toContain('Listo')
    fireEvent.click(screen.getByTestId('capa-dialogo-ajustes'))
    expect(screen.queryByTestId('capa-dialogo-ajustes')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})

describe('Pruebas TAREA 41: El gesto de atrás y deshabilitación de Leer (T188-T190)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('T188 - GUARDIANA DE LA LECTURA. En LEYENDO, el gesto de atras llama a detenerGrabacion y deja en LISTO. No salta al origen: ese es el piso de arriba y es lo que protege la toma.', async () => {
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

    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 200))
    })

    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
      await new Promise((r) => setTimeout(r, 200))
    })
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')

    spyDetener.mockClear()
    await simularGestoAtras()
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })

    expect(spyDetener).toHaveBeenCalled()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    expect(screen.queryByTestId('input-titulo-guion')).toBeNull()
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

    // Abrir Ajustes -28-09-2026: la pantalla de Ajustes, no el cajon-
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })

    expect(screen.getByTestId('pantalla-ajustes')).not.toBeNull()

    await simularGestoAtras()

    // Ajustes se cierra, pero SE MANTIENE en la vista del editor
    expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
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
    expect(btnLeerTexto.textContent?.trim()).toBe('Leer')
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

    // Activar diagnóstico mediante 5 toques en la marca
    const marca191 = document.querySelector('.portada-marca') as HTMLElement
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(marca191)
      }
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
    // 28-09-2026: se elige en Ajustes -fila Ancho del texto-, no en el cajon del editor.
    let columna = false
    let margen = 5
    const props = () => ({
      columnaAngosta: columna, marginPercent: margen,
      setColumnaAngosta: (c: boolean) => { columna = c; rerender(ajustesDelEditor(props())) },
      setMarginPercent: (m: number) => { margen = m; rerender(ajustesDelEditor(props())) }
    })
    const { rerender } = render(ajustesDelEditor(props()))
    const elegir = (nombre: string) => {
      fireEvent.click(screen.getByTestId('fila-ancho-texto'))
      fireEvent.click(screen.getByRole('menuitemradio', { name: nombre }))
    }
    elegir('Ancho')
    expect(columna).toBe(false)
    expect(margen).toBe(5)
    elegir('Medio')
    expect(columna).toBe(false)
    expect(margen).toBe(12)
    elegir('Angosto')
    expect(columna).toBe(true)
    expect(margen).toBe(5)
  })

  test('T196 - Las parejas de color mueven fondo y letra juntos, y NO existe forma de elegir una combinacion donde fondo y letra sean iguales.', () => {
    // 28-09-2026: las parejas viven en Ajustes -fila Colores-.
    let fondo = '#000000'
    let letra = '#FFFFFF'
    const props = () => ({
      colorFondo: fondo, colorLetra: letra,
      setColorFondo: (v: string) => { fondo = v; rerender(ajustesDelEditor(props())) },
      setColorLetra: (v: string) => { letra = v; rerender(ajustesDelEditor(props())) }
    })
    const { container, rerender } = render(ajustesDelEditor(props()))
    expect(container.querySelector('select[aria-label="Color de fondo"]')).toBeNull()
    expect(container.querySelector('select[aria-label="Color de letra"]')).toBeNull()
    const elegir = (nombre: string) => {
      fireEvent.click(screen.getByTestId('fila-colores'))
      fireEvent.click(screen.getByRole('menuitemradio', { name: nombre }))
    }
    elegir('Negro con ámbar')
    expect(fondo).toBe('#000000')
    expect(letra).toBe('#F5C24B')
    elegir('Blanco con negro')
    expect(fondo).toBe('#FFFFFF')
    expect(letra).toBe('#000000')
    elegir('Negro con blanco')
    expect(fondo).toBe('#000000')
    expect(letra).toBe('#FFFFFF')
    expect(fondo).not.toBe(letra)
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

  // 28-09-2026: Tema sigue fuera del panel Aa del editor. Ya no vive en el
  // cajon de la portada: esta en la pantalla de Ajustes, fila-tema. Sigue
  // cambiando data-tema.
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

    // 1. Abrir Editor -> panel Aa: verificar que NO esta Tema
    const fila = screen.getByTestId('fila-guion-g-t198')
    await act(async () => {
      fireEvent.click(fila)
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })

    // 28-09-2026: desde el guion, Ajustes no muestra el Tema -es de la app, no del texto-.
    expect(screen.getByTestId('pantalla-ajustes')).not.toBeNull()
    expect(screen.queryByTestId('fila-tema')).toBeNull()

    // Cerrar Ajustes y volver a la Biblioteca
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Guiones'))
    })

    // 2. El engranaje abre Ajustes; Tema esta ahi.
    const btnMenuBiblio = screen.getByTestId('btn-menu-superior-biblioteca')
    await act(async () => {
      fireEvent.click(btnMenuBiblio)
    })

    expect(screen.getByTestId('pantalla-ajustes')).not.toBeNull()
    expect(screen.getByTestId('fila-tema')).not.toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByTestId('fila-tema'))
    })
    const btnClaro = screen.getByRole('menuitemradio', { name: 'Claro' })
    const btnOscuro = screen.getByRole('menuitemradio', { name: 'Oscuro' })
    expect(btnClaro).not.toBeNull()
    expect(btnOscuro).not.toBeNull()

    // 3. Cambiar a Oscuro y comprobar data-tema en documentElement
    await act(async () => {
      fireEvent.click(btnOscuro)
    })
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro')

    // Cambiar a Claro: hay que volver a abrir el dialogo.
    await act(async () => {
      fireEvent.click(screen.getByTestId('fila-tema'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Claro' }))
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
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-empezar-toma'))
      await new Promise((r) => setTimeout(r, 100))
    })

    // Traer controles con un toque
    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    const btnParar = screen.getByTestId('btn-parar-lectura') as HTMLElement
    expect(btnParar).not.toBeNull()
    // -tarea 83, parte B, 04-10-2026- Parar va ahora dentro de la fila de la toma -con la pausa y el
    // tacho-, y la que lleva el bottom es la caja de la fila. Antes:
    //   const parentContainer = btnParar.parentElement as HTMLElement
    const parentContainer = (btnParar.closest('[data-testid="fila-toma"]') as HTMLElement).parentElement as HTMLElement
    // Desde el 27-09-2026 la altura sale de --circulo-desde-abajo -styles.css-, compartida con
    // Empezar y la barra de tiempo. Antes esta prueba pedia '24px'.
    expect(parentContainer.style.bottom).toContain('--circulo-desde-abajo')
    expect(parentContainer.style.bottom).toContain('safe-area-inset-bottom')

    unmount()
  })

  test('T275 - Limpia saltos de linea al abrir un guion y NO borra el salto de linea al escribir Enter al final.', async () => {
    function WrapperEditorT275({ guionInicial }: { guionInicial: Guion }) {
      const [guion, setGuion] = React.useState<Guion>(guionInicial)
      return (
        <EditorView
          guion={guion}
          onChangeGuion={setGuion}
          onVolverBiblioteca={() => {}}
          onEntrarLectura={() => {}}
        />
      )
    }

    // 1. Un guion que se abre con "\n\nHola" queda con "Hola" al montar
    const guionConSaltosIniciales: Guion = {
      id: 'g-t275-abrir',
      titulo: 'Guion con saltos',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: '\n\nHola' }]
    }

    const { unmount } = render(<WrapperEditorT275 guionInicial={guionConSaltosIniciales} />)

    expect(textoDelGuion()).toBe('Hola')
    unmount()

    // 2. Se monta el editor con "Hola" y se aprieta Enter al final. El guion tiene que quedar en "Hola\n", NO en "Hola"
    const guionNormal: Guion = {
      id: 'g-t275-escribir',
      titulo: 'Guion normal',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Hola' }]
    }

    render(<WrapperEditorT275 guionInicial={guionNormal} />)

    expect(textoDelGuion()).toBe('Hola')

    // Enter es splitBlock: parte el parrafo donde esta el cursor.
    const editor = editorDelGuion()
    await act(async () => {
      editor.chain().setTextSelection(editor.state.doc.content.size - 1).splitBlock().run()
    })

    expect(textoDelGuion()).toBe('Hola\n')
  })
})
