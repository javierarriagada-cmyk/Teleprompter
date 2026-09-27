import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { act } from '@testing-library/react'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { CameraPreview } from '@capgo/camera-preview'
import TiraGrabaciones from '../components/TiraGrabaciones'
import { grabacionNueva } from '../datos/modelo'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

async function abrirGuionConTexto(titulo = 'Guion 66') {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-66',
    titulo,
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto de la coherencia' }]
  })
  const motorFake = new MotorFake()
  render(<App repoOverride={repo} motor={motorFake} />)
  fireEvent.click(await screen.findByTestId('fila-guion-g-66'))
  return motorFake
}

describe('Tarea 66 - dos puertas, un lienzo', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('el editor ofrece DOS puertas, y Leer no enciende la camara', async () => {
    await abrirGuionConTexto()

    expect(await screen.findByTestId('btn-leer-guion-fijo')).toBeDefined()
    expect(screen.getByTestId('btn-grabar-guion-fijo')).toBeDefined()
    expect(screen.queryByTestId('btn-modo-camara-apagada')).toBeNull()
    expect(screen.queryByTestId('btn-modo-camara-frontal')).toBeNull()
    expect(screen.queryByTestId('btn-modo-camara-trasera')).toBeNull()

    fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container')).toBeDefined()
    })
    const lienzo = screen.getByTestId('teleprompter-view-container')
    expect(lienzo.getAttribute('data-estado-toma')).toBe('listo')
    expect(lienzo.getAttribute('data-con-camara')).toBe('no')
    expect(screen.getByTestId('btn-empezar-toma')).toBeDefined()

    // Tarea 70: Al hacer click en engranaje, en Leer siguen siendo null bajo conCamara
    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))
    expect(screen.queryByTestId('btn-fondo-detras')).toBeNull()
    expect(screen.queryByTestId('btn-voltear-camara')).toBeNull()
    expect(CameraPreview.start).not.toHaveBeenCalled()
  })

  test('Grabar entra al mismo lienzo CON camara, Empezar no vuelve a llamar start', async () => {
    await abrirGuionConTexto()
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-con-camara')).toBe('si')
    })
    await waitFor(() => {
      expect(CameraPreview.start).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')

    // Tarea 70: Abrir el panel de engranaje para encontrar btn-fondo-detras y btn-voltear-camara
    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))
    expect(screen.getByTestId('btn-fondo-detras')).toBeDefined()
    expect(screen.getByTestId('btn-voltear-camara')).toBeDefined()

    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    })
    expect(CameraPreview.start).toHaveBeenCalledTimes(1)
  })

  // GUARDIANA DEL ARRASTRE DEL RECUADRO.
  //
  // RecuadroCamara esta en zIndex 0 y la capa de texto en 1. Si en LISTO esa
  // capa recibe punteros, se traga el pointerdown y el recuadro deja de seguir
  // al dedo. Paso al mudar el chrome en la 66 y Javier lo vio en el telefono.
  //
  // No se puede comprobar arrastrando: jsdom no hace hit-testing y el arrastre
  // pasaria igual con la capa encima. Lo que de verdad falla es esto, asi que
  // esto es lo que se comprueba.
  test('en LISTO la capa de texto deja pasar el dedo al recuadro; en LEYENDO se queda el gesto', async () => {
    await abrirGuionConTexto()
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))

    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })
    expect(screen.getByTestId('contenedor-lectura').style.pointerEvents).toBe('none')

    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    })
    expect(screen.getByTestId('contenedor-lectura').style.pointerEvents).toBe('auto')
  })

  test('mantener apretado el boton Leer de la tarjeta entra a grabar', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-66-puerta', titulo: 'Guion puerta', idioma: 'es',
      creado: Date.now(), modificado: Date.now(), archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de la coherencia' }]
    })
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    const boton = await screen.findByTestId('btn-leer-tarjeta')
    vi.useFakeTimers()
    try {
      await act(async () => {
        fireEvent.mouseDown(boton)
        await vi.advanceTimersByTimeAsync(550)
        fireEvent.mouseUp(boton)
      })
      vi.useRealTimers()
      await waitFor(() => {
        expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-con-camara')).toBe('si')
      })
    } finally {
      vi.useRealTimers()
    }
  })

  test('mantener apretada una toma abre Eliminar y Cerrar; no hay boton Borrar a la vista', async () => {
    vi.useFakeTimers()
    try {
      const toma = grabacionNueva({ id: 'toma-1', tituloGuion: 'Ensayo', ruta: '/x.mp4', duracionMs: 4000 })
      const onBorrar = vi.fn()
      render(<TiraGrabaciones grabaciones={[toma]} onAbrir={() => {}} onBorrar={onBorrar} />)
      expect(screen.queryByText('Borrar')).toBeNull()
      const boton = screen.getByTestId('tarjeta-grabacion-toma-1').querySelector('button') as HTMLElement
      await act(async () => {
        fireEvent.mouseDown(boton)
        await vi.advanceTimersByTimeAsync(550)
        fireEvent.mouseUp(boton)
      })
      expect(screen.getByTestId('menu-toma-toma-1')).not.toBeNull()
      expect(screen.getByText('Eliminar')).not.toBeNull()
      expect(screen.getByText('Cerrar')).not.toBeNull()
      fireEvent.click(screen.getByTestId('borrar-grabacion-toma-1'))
      expect(onBorrar).not.toHaveBeenCalled()
      expect(screen.getByTestId('borrar-grabacion-toma-1').getAttribute('data-confirmando')).toBe('si')
      fireEvent.click(screen.getByTestId('borrar-grabacion-toma-1'))
      expect(onBorrar).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('"donde lees" existe en UN solo lugar: el engranaje de la toma', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const raiz = path.resolve(process.cwd(), 'src')
    const hits: string[] = []
    function andar(dir: string) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name)
        if (item.isDirectory()) andar(full)
        // Desde la tarea 75 el texto vive en textos/es.ts y el control lo usa por su clave:
        // se buscan las dos formas, y la carpeta de los textos no cuenta como un lugar.
        else if (/\.(tsx|ts)$/.test(item.name) && !full.includes(`${path.sep}pruebas`) && !full.includes(`${path.sep}textos${path.sep}`)) {
          const txt = fs.readFileSync(full, 'utf-8')
          if (txt.includes('Dónde lees') || txt.includes("t('dondeLees')")) hits.push(full)
        }
      }
    }
    andar(raiz)
    expect(hits.length).toBe(1)
    expect(hits[0]).toMatch(/TeleprompterView\.tsx$/)
    await abrirGuionConTexto()
    fireEvent.click(await screen.findByTestId('btn-leer-guion-fijo'))
    await waitFor(() => expect(screen.getByTestId('btn-engranaje-toma')).toBeDefined())
    expect(screen.queryByText('Dónde lees:')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-engranaje-toma'))
    // Desde el 24-09-2026 el cajon de la toma no escribe "Dónde lees:": el
    // grupo se dibuja -franja arriba, franja al medio- y se nombra por
    // aria-label.
    expect(screen.getByTestId('panel-ajustes-toma').querySelector('[role="group"][aria-label="Dónde lees"]')).not.toBeNull()
  })
})
