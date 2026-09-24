import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import EditorView from '../components/EditorView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

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
  // cuatro ajustes del texto cambia la muestra en el momento del toque. Si
  // alguien desconecta la muestra de un ajuste, ese ajuste vuelve a
  // parecer falso y esta prueba falla nombrandolo.
  test('T285 - tamano, ancho, tipografia y colores cambian la muestra al tocarlos', async () => {
    await appConGuion()
    await abrirPanelAa()
    const col = () => screen.getByTestId('muestra-lectura-columna') as HTMLElement
    const caja = () => screen.getByTestId('muestra-lectura') as HTMLElement

    // Tipografia
    fireEvent.click(screen.getByRole('button', { name: 'Serif' }))
    expect(col().style.fontFamily, 'Serif no llego a la muestra').toContain('Source Serif 4')
    fireEvent.click(screen.getByRole('button', { name: 'Sans' }))
    expect(col().style.fontFamily, 'Sans no llego a la muestra').toContain('Source Sans 3')

    // Ancho
    fireEvent.click(screen.getByRole('button', { name: 'Angosto' }))
    expect(col().style.maxWidth, 'Angosto no llego a la muestra').toBe('22ch')
    fireEvent.click(screen.getByRole('button', { name: 'Ancho' }))
    expect(col().style.maxWidth, 'Ancho no llego a la muestra').toBe('90%')

    // Tamano: por omision es 24, el + lo lleva a 32
    const antes = parseFloat(col().style.fontSize)
    fireEvent.click(screen.getByLabelText('Aumentar letra panel'))
    expect(parseFloat(col().style.fontSize), 'el + no llego a la muestra').toBeGreaterThan(antes)

    // Colores
    fireEvent.click(screen.getByTitle('Blanco con negro'))
    expect(mismoColor(caja().style.backgroundColor, '#FFFFFF'), 'el fondo blanco no llego a la muestra').toBe(true)
    expect(mismoColor(col().style.color, '#000000'), 'la letra negra no llego a la muestra').toBe(true)
    fireEvent.click(screen.getByTitle('Negro con ámbar'))
    expect(mismoColor(caja().style.backgroundColor, '#000000'), 'el fondo negro no llego a la muestra').toBe(true)
    expect(mismoColor(col().style.color, '#F5C24B'), 'la letra ambar no llego a la muestra').toBe(true)
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
    fireEvent.click(await screen.findByTestId('btn-engranaje-toma'))
    const interruptor = screen.getByLabelText('Mostrar tiempo') as HTMLInputElement
    if (!interruptor.checked) fireEvent.click(interruptor)
    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))

    const previa = await screen.findByTestId('barra-tiempo-previa')
    expect(previa.textContent).toMatch(/^00:00 \/ \d\d:\d\d$/)

    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))
    fireEvent.click(screen.getByLabelText('Mostrar tiempo'))
    expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull()
    fireEvent.click(screen.getByLabelText('Mostrar tiempo'))
    expect(screen.getByTestId('barra-tiempo-previa')).toBeDefined()

    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull()

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
    const textarea = screen.getByTestId('textarea-guion') as HTMLTextAreaElement
    await act(async () => {
      fireEvent.select(textarea, { target: { selectionStart: 0, selectionEnd: 4 } })
    })
    const barra = screen.getByTestId('barra-formato-b1')
    expect(barra.parentElement).toBe(document.body)
    expect(barra.style.position).toBe('fixed')
    expect(textarea.parentElement!.contains(barra)).toBe(false)
  })
})
