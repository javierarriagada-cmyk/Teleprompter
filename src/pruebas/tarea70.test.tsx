import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
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

vi.mock('../lib/camara', async () => {
  const actual = await vi.importActual<typeof import('../lib/camara')>('../lib/camara')
  return {
    ...actual,
    camaraEncendida: () => true
  }
})

async function crearAppConGuion() {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-70',
    titulo: 'Guion Tarea 70',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba para la Tarea 70' }]
  })
  const motorFake = new MotorFake()
  render(<App repoOverride={repo} motor={motorFake} />)
  await screen.findByTestId('btn-leer-tarjeta')
  return { repo, motorFake }
}

describe('Tarea 70 - El estado LISTO y LEYENDO del lienzo se hace como la foto, en las dos puertas', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // 28-09-2026: el engranaje de la esquina se fue. En las dos puertas LISTO
  // monta las fichas; Mas es la puerta de Ajustes.
  test('a) En Leer Y en Grabar, btn-engranaje-toma existe, tiene style.position absolute, top 8px y right 8px', async () => {
    await crearAppConGuion()

    // 1. En Leer
    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    expect(await screen.findByTestId('fila-fichas-listo')).toBeDefined()
    expect(screen.getByTestId('ficha-mas')).toBeDefined()

    // Volver
    fireEvent.click(screen.getByTestId('btn-volver-listo'))

    // 2. En Grabar
    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    expect(await screen.findByTestId('fila-fichas-listo')).toBeDefined()
    expect(screen.getByTestId('ficha-mas')).toBeDefined()
    expect(screen.getByTestId('ficha-camara')).toBeDefined()
  })

  test('b) En Leer Y en Grabar, btn-empezar-toma NO contiene el texto Empezar; en Leer lleva el triangulo y en Grabar el punto rojo', async () => {
    await crearAppConGuion()

    // Leer
    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    const btnEmpezarLeer = await screen.findByTestId('btn-empezar-toma')
    expect(btnEmpezarLeer.textContent).not.toContain('Empezar')
    expect(btnEmpezarLeer.querySelector('svg')).not.toBeNull()
    expect(btnEmpezarLeer.classList.contains('btn-empezar-leer')).toBe(true)

    // Volver
    fireEvent.click(screen.getByTestId('btn-volver-listo'))

    // Grabar
    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    const btnEmpezarGrabar = await screen.findByTestId('btn-empezar-toma')
    expect(btnEmpezarGrabar.textContent).not.toContain('Empezar')
    // 24-09-2026: cada puerta con el estandar de sus botones. Grabar lleva el
    // punto rojo; Leer, el triangulo en crema.
    expect(btnEmpezarGrabar.querySelector('.punto-grabar')).not.toBeNull()
    expect(btnEmpezarGrabar.classList.contains('btn-empezar-grabar')).toBe(true)
  })

  test('c) panel-controles-listo NO EXISTE en ninguna de las dos puertas', async () => {
    await crearAppConGuion()

    // Leer
    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    await screen.findByTestId('btn-empezar-toma')
    expect(screen.queryByTestId('panel-controles-listo')).toBeNull()

    // Volver
    fireEvent.click(screen.getByTestId('btn-volver-listo'))

    // Grabar
    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    await screen.findByTestId('btn-empezar-toma')
    expect(screen.queryByTestId('panel-controles-listo')).toBeNull()
  })

  // 28-09-2026: voltear vive en el panel de la ficha de camara -Javier: "deberia estar incluido
  // en el submenu de la camara"-. Con el panel cerrado no esta; al abrir la ficha, si.
  test('d) En Grabar, con el panel cerrado, btn-voltear-camara es null; al hacer click en btn-engranaje-toma, btn-voltear-camara existe y su aria-label es Voltear cámara', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    await screen.findByTestId('ficha-camara')
    expect(screen.queryByTestId('btn-voltear-camara')).toBeNull()
    fireEvent.click(screen.getByTestId('ficha-camara'))
    const btnVoltear = await screen.findByTestId('btn-voltear-camara')
    expect(btnVoltear).toBeDefined()
    expect(btnVoltear.getAttribute('aria-label')).toBe('Voltear cámara')
  })

  test('e) En leyendo, panel-controles-lectura NO EXISTE', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    expect(screen.queryByTestId('panel-controles-lectura')).toBeNull()
  })

  test('f) En Leer, estando en leyendo, btn-salir-lectura existe', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    expect(await screen.findByTestId('btn-salir-lectura')).toBeDefined()
  })

  test('g) En Grabar, estando en leyendo, btn-salir-lectura es null', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    expect(screen.queryByTestId('btn-salir-lectura')).toBeNull()
  })

  test('h) En Grabar, leyendo y SIN pausa, btn-descartar-toma es null', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    expect(screen.queryByTestId('btn-descartar-toma')).toBeNull()
  })

  test('i) En Grabar, al pausar, btn-descartar-toma existe', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    fireEvent.click(await screen.findByTestId('btn-pausa-lectura'))
    expect(await screen.findByTestId('btn-descartar-toma')).toBeDefined()
  })

  test('j) En Leer, en pausa, btn-descartar-toma es null', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    fireEvent.click(await screen.findByTestId('btn-pausa-lectura'))
    expect(screen.queryByTestId('btn-descartar-toma')).toBeNull()
  })

  test('k) Un solo click en btn-descartar-toma NO descarta: el boton queda en data-confirmando="si". El segundo click si.', async () => {
    await crearAppConGuion()

    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })

    const vista = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(vista)

    fireEvent.click(await screen.findByTestId('btn-pausa-lectura'))
    const btnTacho = await screen.findByTestId('btn-descartar-toma')
    expect(btnTacho.getAttribute('data-confirmando')).toBe('no')

    // Primer click
    fireEvent.click(btnTacho)
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    expect(btnTacho.getAttribute('data-confirmando')).toBe('si')
    expect(btnTacho.textContent).toContain('¿Seguro?')

    // Segundo click
    fireEvent.click(btnTacho)
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    })
    expect((await screen.findByTestId('aviso-flotante')).textContent).toMatch(/Toma descartada/)
  })

  // El + de crear guion cuelga de body por un portal y no se escondia con la
  // biblioteca. En Grabar con la camara detras el lienzo es transparente y el +
  // se veia en plena toma. Lo tapaba el cajon; al sacarlo la 70, aparecio.
  // Javier lo vio en el telefono el 23-09-2026.
  test('m) El + de crear guion existe en la portada y NO existe en el lienzo', async () => {
    await crearAppConGuion()
    expect(screen.getByTestId('btn-crear-guion')).toBeDefined()

    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    await screen.findByTestId('btn-empezar-toma')
    expect(screen.queryByTestId('btn-crear-guion')).toBeNull()

    fireEvent.click(screen.getByTestId('btn-volver-listo'))
    expect(await screen.findByTestId('btn-crear-guion')).toBeDefined()
  })
})
