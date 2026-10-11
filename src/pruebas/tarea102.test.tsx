import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { PanelAjustesFlotante } from '../components/PanelAjustes'
import BibliotecaView from '../components/BibliotecaView'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { idiomaApp, fijarIdioma } from '../lib/idioma'

// Mismo fingido del gesto de atras que pantallas.test.tsx: captura el listener real.
const listenersAtras: Array<() => void> = []
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (evento: string, cb: () => void) => {
      if (evento === 'backButton') listenersAtras.push(cb)
      return Promise.resolve({ remove: () => {} })
    },
    exitApp: vi.fn(),
    getInfo: vi.fn().mockResolvedValue({ version: '1.0', build: '1' })
  }
}))

async function simularGestoAtras() {
  expect(listenersAtras.length).toBeGreaterThan(0)
  await act(async () => {
    listenersAtras[listenersAtras.length - 1]()
    await Promise.resolve()
  })
}

// Antes: React.createElement(PantallaAjustes, { origen: 'portada', ... })
function ajustesPortada(p: Record<string, unknown> = {}) {
  const {
    onCerrar = () => {},
    fontSize = 24,
    onElegirLetra = () => {},
    tipoFuente = 'sans',
    setTipoFuente = () => {},
    columnaAngosta = false,
    marginPercent = 5,
    setColumnaAngosta = () => {},
    setMarginPercent = () => {},
    colorFondo = '#000000',
    colorLetra = '#FFFFFF',
    setColorFondo = () => {},
    setColorLetra = () => {},
    mirror = false,
    setMirror = () => {},
    mostrarTiempo = true,
    setMostrarTiempo = () => {},
    tema = 'oscuro',
    setTema = () => {},
  } = p as any
  return React.createElement(PanelAjustesFlotante, {
    origen: 'portada',
    onCerrar,
    tema,
    setTema,
    ajustesLectura: {
      fontSize, onElegirLetra, tipoFuente, setTipoFuente, columnaAngosta, marginPercent,
      setColumnaAngosta, setMarginPercent, colorFondo, colorLetra, setColorFondo, setColorLetra,
      mirror, setMirror, mostrarTiempo, setMostrarTiempo
    }
  })
}

describe('Tarea 102 PASO 2: menús adjuntos de Ajustes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    fijarIdioma('es')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Elegir en cada menú cambia el ajuste y cierra el menú', () => {
    const onElegirLetra = vi.fn()
    const setTipoFuente = vi.fn()
    const setColumnaAngosta = vi.fn()
    const setMarginPercent = vi.fn()
    const setColorFondo = vi.fn()
    const setColorLetra = vi.fn()
    const setTema = vi.fn()

    render(ajustesPortada({
      onElegirLetra,
      setTipoFuente,
      setColumnaAngosta,
      setMarginPercent,
      setColorFondo,
      setColorLetra,
      setTema
    }))

    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    expect(screen.getByTestId('dialogo-letra')).toBeTruthy()
    fireEvent.click(screen.getByTestId('opcion-letra-32'))
    expect(onElegirLetra).toHaveBeenCalledWith(32)
    expect(screen.queryByTestId('dialogo-letra')).toBeNull()

    fireEvent.click(screen.getByTestId('fila-tipo-letra'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Serif|Serifa|serif/i }))
    expect(setTipoFuente).toHaveBeenCalledWith('serif')
    expect(screen.queryByTestId('dialogo-tipo')).toBeNull()

    fireEvent.click(screen.getByTestId('fila-ancho-texto'))
    const opcionAngosto = screen.getAllByRole('menuitemradio').find((el) =>
      /angosto|narrow/i.test(el.getAttribute('aria-label') || el.textContent || '')
    )
    expect(opcionAngosto).toBeTruthy()
    fireEvent.click(opcionAngosto!)
    expect(setColumnaAngosta).toHaveBeenCalledWith(true)
    expect(setMarginPercent).toHaveBeenCalledWith(5)

    fireEvent.click(screen.getByTestId('fila-colores'))
    const primeraPareja = screen.getAllByRole('menuitemradio')[0]
    fireEvent.click(primeraPareja)
    expect(setColorFondo).toHaveBeenCalled()
    expect(setColorLetra).toHaveBeenCalled()
    expect(screen.queryByTestId('dialogo-colores')).toBeNull()

    fireEvent.click(screen.getByTestId('fila-tema'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /claro|light/i }))
    expect(setTema).toHaveBeenCalledWith('claro')
    expect(screen.queryByTestId('dialogo-tema')).toBeNull()

    fireEvent.click(screen.getByTestId('fila-idioma'))
    expect(screen.getByTestId('selector-idioma-app')).toBeTruthy()
    fireEvent.click(screen.getByTestId('btn-idioma-en'))
    expect(idiomaApp()).toBe('en')
    expect(screen.queryByTestId('dialogo-idioma')).toBeNull()
  })

  test('El menú se cierra con Escape y tocando afuera; aria-checked marca la opción activa', () => {
    render(ajustesPortada({ fontSize: 24 }))

    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    expect(screen.getByTestId('capa-dialogo-ajustes')).toBeTruthy()
    const activa = screen.getByTestId('opcion-letra-24')
    expect(activa.getAttribute('aria-checked')).toBe('true')
    expect(activa.getAttribute('role')).toBe('menuitemradio')
    const otra = screen.getByTestId('opcion-letra-18')
    expect(otra.getAttribute('aria-checked')).toBe('false')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('dialogo-letra')).toBeNull()

    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    expect(screen.getByTestId('dialogo-letra')).toBeTruthy()
    fireEvent.click(screen.getByTestId('capa-dialogo-ajustes'))
    expect(screen.queryByTestId('dialogo-letra')).toBeNull()
  })

  test('role del menú es menu, no listbox', () => {
    render(ajustesPortada())
    fireEvent.click(screen.getByTestId('fila-tema'))
    expect(screen.getByTestId('dialogo-tema').getAttribute('role')).toBe('menu')
  })

  test('Acerca de Sigo abre la subpantalla y la flecha vuelve a Ajustes', () => {
    render(ajustesPortada())
    fireEvent.click(screen.getByTestId('fila-acerca-de-sigo'))
    expect(screen.getByTestId('pantalla-acerca-sigo')).toBeTruthy()
    expect(screen.getByTestId('fila-version')).toBeTruthy()
    expect(screen.getByTestId('fila-licencias')).toBeTruthy()
    // Antes: expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
    // El panel no se reemplaza: Acerca se abre adentro.
    expect(screen.getByTestId('panel-ajustes-toma')).toBeTruthy()

    fireEvent.click(screen.getByTestId('btn-cerrar-acerca'))
    expect(screen.getByTestId('panel-ajustes-toma')).toBeTruthy()
    expect(screen.queryByTestId('pantalla-acerca-sigo')).toBeNull()
  })
})

describe('Tarea 102 PASO 2: menú del guion y gesto de atrás', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    listenersAtras.length = 0
    localStorage.clear()
    fijarIdioma('es')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Archivar y Borrar desde el menú del guion se comportan igual que antes', async () => {
    let archivado: { id: string; valor: boolean } | null = null
    let borrado: string | null = null
    const guiones = [
      { id: 'g1', titulo: 'Guión Prueba', idioma: 'es', modificado: Date.now(), palabras: 150 }
    ]

    render(
      React.createElement(BibliotecaView, {
        guiones,
        onAbrir: () => {},
        onCrearNuevo: () => {},
        onBorrar: (id: string) => { borrado = id },
        onArchivar: (id: string, valor: boolean) => { archivado = { id, valor } }
      })
    )

    const fila = screen.getByTestId('fila-guion-g1')
    await act(async () => {
      fireEvent.contextMenu(fila)
    })
    expect(screen.getByTestId('menu-opciones-g1')).toBeTruthy()

    fireEvent.click(screen.getByText('Archivar'))
    expect(archivado).toEqual({ id: 'g1', valor: true })
    expect(screen.queryByTestId('menu-opciones-g1')).toBeNull()

    await act(async () => {
      fireEvent.contextMenu(fila)
    })
    fireEvent.click(screen.getByLabelText('Borrar'))
    expect(borrado).toBe('g1')
    expect(screen.queryByTestId('menu-opciones-g1')).toBeNull()
  })

  test('El menú del guion se cierra con Escape y tocando afuera', async () => {
    const guiones = [
      { id: 'g1', titulo: 'Guión Prueba', idioma: 'es', modificado: Date.now(), palabras: 150 }
    ]
    render(
      React.createElement(BibliotecaView, {
        guiones,
        onAbrir: () => {},
        onCrearNuevo: () => {},
        onBorrar: () => {},
        onArchivar: () => {}
      })
    )
    const fila = screen.getByTestId('fila-guion-g1')
    await act(async () => {
      fireEvent.contextMenu(fila)
    })
    expect(screen.getByTestId('menu-opciones-g1')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('menu-opciones-g1')).toBeNull()

    await act(async () => {
      fireEvent.contextMenu(fila)
    })
    expect(screen.getByTestId('menu-opciones-g1')).toBeTruthy()
    await act(async () => {
      fireEvent.pointerDown(document.body)
    })
    expect(screen.queryByTestId('menu-opciones-g1')).toBeNull()
  })

  test('El gesto de atrás cierra el menú de Ajustes antes de salir de la pantalla', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t102-atras',
      titulo: 'Guion T102',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto del guion T102' }]
    }
    await repo.guardar(guion)

    render(React.createElement(App, { repoOverride: repo }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    })
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(screen.getByTestId('pantalla-ajustes')).toBeTruthy()
    expect(screen.getByTestId('panel-ajustes-flotante')).toBeTruthy()

    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    expect(screen.getByTestId('dialogo-letra')).toBeTruthy()

    await simularGestoAtras()
    expect(screen.queryByTestId('dialogo-letra')).toBeNull()
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(screen.getByTestId('pantalla-ajustes')).toBeTruthy()
    expect(screen.getByTestId('panel-ajustes-flotante')).toBeTruthy()

    await simularGestoAtras()
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
    expect(screen.queryByTestId('panel-ajustes-flotante')).toBeNull()
  })

  test('El gesto de atrás en Acerca vuelve a Ajustes sin cerrar Ajustes', async () => {
    const repo = new RepositorioMemoria()
    render(React.createElement(App, { repoOverride: repo }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    })
    fireEvent.click(screen.getByTestId('fila-acerca-de-sigo'))
    expect(screen.getByTestId('pantalla-acerca-sigo')).toBeTruthy()

    await simularGestoAtras()
    expect(screen.queryByTestId('pantalla-acerca-sigo')).toBeNull()
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(screen.getByTestId('pantalla-ajustes')).toBeTruthy()
    expect(screen.getByTestId('panel-ajustes-flotante')).toBeTruthy()
  })

  test('El gesto de atrás cierra el menú del guion en la biblioteca', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t102-menu',
      titulo: 'Guion menu',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Hola' }]
    }
    await repo.guardar(guion)

    render(React.createElement(App, { repoOverride: repo }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    const fila = screen.getByTestId('fila-guion-g-t102-menu')
    await act(async () => {
      fireEvent.contextMenu(fila)
    })
    expect(screen.getByTestId('menu-opciones-g-t102-menu')).toBeTruthy()

    await simularGestoAtras()
    expect(screen.queryByTestId('menu-opciones-g-t102-menu')).toBeNull()
  })
})
