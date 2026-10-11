import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import EditorView from '../components/EditorView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { editorDelGuion, seleccionarEnGuion } from './ayudaEditor'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

const TEXTO = 'Hola. Lee esto en voz alta, con o sin apuro, como prefieras. Ahora fijate en el texto.'

async function appConGuion() {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-72',
    titulo: 'Guion 72',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: TEXTO }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  await screen.findByTestId('btn-leer-tarjeta')
}

async function abrirPanelAa() {
  fireEvent.click(await screen.findByTestId('fila-guion-g-72'))
  fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
}

// jsdom puede devolver un color como hex o como rgb(); se comparan los dos.
function mismoColor(css: string, hex: string): boolean {
  const n = css.replace(/\s/g, '').toLowerCase()
  const h = hex.toLowerCase()
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
  return n === h || n === `rgb(${r},${g},${b})`
}

describe('Tarea 72 - cada ajuste muestra lo que hace', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // T285 - GUARDIANA DE LA REGLA DE PRODUCTO EN EL PANEL Aa. Cada uno de los
  // cuatro ajustes del texto cambia EL GUION en el momento del toque. Hasta
  // el 24-09-2026 cambiaban una muestra dentro del panel -MuestraLectura-;
  // desde que el editor es Tiptap, el guion mismo es la muestra. Si alguien
  // desconecta un ajuste de la hoja del editor, ese ajuste vuelve a parecer
  // falso y esta prueba falla nombrandolo.
  test('T285 - tamano, ancho, tipografia y colores cambian el guion al tocarlos', async () => {
    await appConGuion()
    await abrirPanelAa()
    const caja = () => screen.getByTestId('hoja-editor') as HTMLElement
    const col = () => caja().firstElementChild as HTMLElement

    // 28-09-2026: los ajustes se eligen en la pantalla de Ajustes, fila y opcion; el guion de atras
    // sigue montado y es el que se revisa.
    const elegir = (fila: string, nombre: string) => {
      fireEvent.click(screen.getByTestId(fila))
      fireEvent.click(screen.getByRole('menuitemradio', { name: nombre }))
    }

    // Tipografia
    elegir('fila-tipo-letra', 'Serif')
    expect(col().style.fontFamily, 'Serif no llego al guion').toContain('Source Serif 4')
    elegir('fila-tipo-letra', 'Sans')
    expect(col().style.fontFamily, 'Sans no llego al guion').toContain('Source Sans 3')

    // Ancho
    elegir('fila-ancho-texto', 'Angosto')
    expect(col().style.maxWidth, 'Angosto no llego al guion').toBe('22ch')
    elegir('fila-ancho-texto', 'Ancho')
    expect(col().style.maxWidth, 'Ancho no llego al guion').toBe('93%')

    // Tamano: por omision es 24; elegir 32 lo agranda
    const antes = parseFloat(col().style.fontSize)
    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    fireEvent.click(screen.getByTestId('opcion-letra-32'))
    expect(parseFloat(col().style.fontSize), 'el tamano no llego al guion').toBeGreaterThan(antes)

    // Colores
    fireEvent.click(screen.getByTestId('fila-colores'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Blanco con negro' }))
    expect(mismoColor(caja().style.backgroundColor, '#FFFFFF'), 'el fondo blanco no llego al guion').toBe(true)
    expect(mismoColor(col().style.color, '#000000'), 'la letra negra no llego al guion').toBe(true)
    fireEvent.click(screen.getByTestId('fila-colores'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Negro con ámbar' }))
    expect(mismoColor(caja().style.backgroundColor, '#000000'), 'el fondo negro no llego al guion').toBe(true)
    expect(mismoColor(col().style.color, '#F5C24B'), 'la letra ambar no llego al guion').toBe(true)
  })

  // T286 - GUARDIANA DE LA BARRA DE TIEMPO. Dos cosas: que en listo el
  // interruptor muestre algo, y que la barra viva ADENTRO del lienzo. Si
  // alguien la vuelve a montar despues del lienzo, queda debajo del borde
  // de la pantalla y no se ve; eso jsdom no lo puede medir, pero si puede
  // ver donde esta montada.
  test('T286 - Mostrar tiempo se ve en listo, y el reloj vive adentro del lienzo', async () => {
    await appConGuion()
    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))

    // No se da por sentado el valor por omision de Mostrar tiempo: se
    // enciende a mano, asi la prueba cuida el montaje y no un default.
    // 28-09-2026: el interruptor vive en Ajustes, ficha Mas. Es un switch,
    // no una casilla.
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: fireEvent.click(await screen.findByTestId('ficha-mas'))
    fireEvent.click(await screen.findByTestId('btn-ajustes-toma'))
    const interruptor = screen.getByTestId('switch-mostrar-tiempo')
    if (interruptor.getAttribute('aria-checked') !== 'true') fireEvent.click(interruptor)
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))

    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: const previa = await screen.findByTestId('barra-tiempo-previa')
    // De pie en Leer, LISTO dice lo que dura en el dock -como Grabar-: la pastilla quieta no sale.
    const previa = await screen.findByTestId('dock-duracion-valor')
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(previa.textContent).toMatch(/^00:00 \/ \d\d:\d\d$/)
    expect(previa.textContent).toMatch(/^\d+:\d\d$/)
    expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull()

    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: fireEvent.click(screen.getByTestId('ficha-mas'))
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    fireEvent.click(screen.getByTestId('switch-mostrar-tiempo'))
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull()
    expect(screen.queryByTestId('dock-duracion-valor')).toBeNull()
    fireEvent.click(screen.getByTestId('switch-mostrar-tiempo'))
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: expect(screen.getByTestId('barra-tiempo-previa')).toBeDefined()
    expect(screen.getByTestId('dock-duracion-valor')).toBeDefined()

    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    // Desde el 28-09-2026 Empezar primero resuelve el permiso del microfono -asincrono- y recien
    // despues pasa a leyendo: la previa se va un instante despues del toque, no en el mismo.
    await waitFor(() => expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })
    const reloj = document.querySelector('div[aria-label="tiempo transcurrido y total estimado"]') as HTMLElement
    expect(reloj).not.toBeNull()
    const lienzo = screen.getByTestId('teleprompter-view-container').parentElement as HTMLElement
    expect(lienzo.contains(reloj), 'el reloj no esta adentro del lienzo').toBe(true)
  }, 15000)

  // T287 - GUARDIANA DE LA BARRA DE FORMATO. No puede volver al flujo del
  // editor: si vuelve, seleccionar una palabra empuja el guion.
  test('T287 - la barra de formato cuelga de body, fija, y no del editor', async () => {
    render(
      <EditorView
        guion={{
          id: 'g-288',
          titulo: 'Guion 288',
          idioma: 'es',
          creado: Date.now(),
          modificado: Date.now(),
          bloques: [{ id: 'b1', nombre: '', texto: TEXTO }]
        }}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )
    seleccionarEnGuion(0, 4)
    const barra = screen.getByTestId('barra-formato-b1')
    expect(barra.parentElement).toBe(document.body)
    expect(barra.style.position).toBe('fixed')
    expect(screen.getByTestId('hoja-editor').contains(barra)).toBe(false)
    expect(editorDelGuion().view.dom.contains(barra)).toBe(false)
  })
})
