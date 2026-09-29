// TAREA 84 -29-09-2026-: la versión para Google Play. Aquí, con las herramientas de la APK de prueba
// -VITE_HERRAMIENTAS sin definir, como en todas las pruebas-: el diálogo de la cámara negada, el
// aviso que anuncia TalkBack, Ajustes como diálogo, el nombre del campo del título y la voz en
// inglés que se baja antes de leer. Lo de la versión de Play sin herramientas va aparte, en
// tarea84-play.test.tsx, porque la variable se fija antes de importar la app.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { AvisoBreve } from '../components/AvisoBreve'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { ResultadoVoz } from '../motor/MotorDeVoz'
import { CameraPreview } from '@capgo/camera-preview'
import { es } from '../textos/es'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 })
  }
}))

vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return {
    ...actual,
    recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar()
  }
})

async function montar(motor = new MotorFake(), idioma: 'es' | 'en' = 'es') {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-84',
    titulo: 'Guion 84',
    idioma,
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: idioma === 'en' ? 'Read this out loud at your own pace' : 'Texto del guion 84 para leer' }]
  })
  render(<App repoOverride={repo} motor={motor} />)
  await screen.findByTestId('btn-leer-tarjeta')
}

// El motor de la versión de Play, fingido: la voz en inglés no está y hay que bajarla.
class MotorQueBaja extends MotorFake {
  llamadas = 0
  constructor(private respuesta: ResultadoVoz, private avances: number[] = []) {
    super()
  }
  async asegurarVoz(_lang: string, alProgreso: (f: number) => void): Promise<ResultadoVoz> {
    this.llamadas++
    for (const a of this.avances) {
      alProgreso(a)
      await new Promise((r) => setTimeout(r, 20))
    }
    return this.respuesta
  }
}

describe('Tarea 84 - La versión para Google Play', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    ;(CameraPreview.start as any).mockResolvedValue({ width: 390, height: 844, x: 0, y: 0 })
  })
  afterEach(() => {
    cleanup()
  })

  test('T84a Con las herramientas de la APK de prueba, los cinco toques SÍ abren el diagnóstico -el control de T84-play-.', async () => {
    await montar()
    const marca = document.querySelector('.portada-marca') as HTMLElement
    for (let i = 0; i < 5; i++) fireEvent.click(marca)
    expect(await screen.findByTestId('franja-de-estado-diagnostico')).toBeTruthy()
  })

  test('T84b Cámara negada al abrir Grabar: se abre el diálogo de permiso de la cámara con "Ahora no" y "Abrir ajustes".', async () => {
    ;(CameraPreview.start as any).mockRejectedValue(
      Object.assign(new Error('camera permission denied. enable camera access in Settings.'), { code: 'cameraPermissionDenied' })
    )
    await montar()
    fireEvent.click(screen.getByTestId('btn-grabar-tarjeta'))
    const dialogo = await screen.findByTestId('dialogo-camara')
    expect(dialogo.getAttribute('role')).toBe('dialog')
    expect(within(dialogo).getByText(es.camaraTitulo)).toBeTruthy()
    expect(within(dialogo).getByText(es.camaraExplicacion)).toBeTruthy()
    expect(within(dialogo).getByTestId('btn-camara-ahora-no').textContent).toBe(es.ahoraNo)
    expect(within(dialogo).getByTestId('btn-camara-ajustes').textContent).toBe(es.abrirAjustes)
    // Misma forma que el del micrófono: las mismas clases.
    expect(dialogo.className).toBe('dialogo-ajustes')
    expect(screen.getByTestId('capa-dialogo-camara').className).toBe('capa-dialogo-microfono')
    fireEvent.click(within(dialogo).getByTestId('btn-camara-ahora-no'))
    expect(screen.queryByTestId('dialogo-camara')).toBeNull()
  })

  test('T84c Cámara que falla por OTRA cosa -ocupada-: no se abre el diálogo de permiso.', async () => {
    ;(CameraPreview.start as any).mockRejectedValue(new Error('Camera is busy or stopping. Please retry shortly.'))
    await montar()
    fireEvent.click(screen.getByTestId('btn-grabar-tarjeta'))
    await screen.findByTestId('btn-empezar-toma')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(CameraPreview.start).toHaveBeenCalled()
    expect(screen.queryByTestId('dialogo-camara')).toBeNull()
  })

  test('T84d AvisoBreve: el aviso vive dentro de una región role="status" con aria-live="polite", montada antes del aviso.', () => {
    const { rerender } = render(<AvisoBreve avisoInfo={null} enLectura={false} cerrarAviso={() => {}} />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.textContent).toBe('')
    rerender(<AvisoBreve avisoInfo={{ texto: 'Guardado' } as any} enLectura={false} cerrarAviso={() => {}} />)
    expect(screen.getByRole('status')).toBe(region)
    expect(within(region).getByTestId('aviso-flotante').textContent).toContain('Guardado')
  })

  test('T84e Ajustes, abierto desde la portada, es un diálogo modal con el título como nombre.', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    const pantalla = await screen.findByTestId('pantalla-ajustes')
    expect(pantalla.getAttribute('role')).toBe('dialog')
    expect(pantalla.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('dialog', { name: es.tituloAjustes })).toBe(pantalla)
  })

  test('T84f El campo del título del guion tiene nombre para el lector.', () => {
    const guion: Guion = {
      id: 'g-84f', titulo: 'Un título', idioma: 'es', creado: 1, modificado: 1, archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto' }]
    } as Guion
    render(<EditorView guion={guion} onChangeGuion={() => {}} onVolverBiblioteca={() => {}} onEntrarLectura={() => {}} />)
    const campo = screen.getByTestId('input-titulo-guion')
    expect(campo.getAttribute('aria-label')).toBe(es.nombreCampoTitulo)
    expect(screen.getByRole('textbox', { name: es.nombreCampoTitulo })).toBe(campo)
  })

  test('T84g Voz en inglés sin conexión: Empezar muestra el aviso y la lectura NO parte.', async () => {
    const motor = new MotorQueBaja('sin-conexion')
    await montar(motor, 'en')
    fireEvent.click(screen.getByTestId('btn-leer-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))
    const aviso = await screen.findByTestId('aviso-voz-sin-conexion')
    expect(aviso.textContent).toContain(es.vozSinConexion)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })
    expect(screen.queryByTestId('cuenta-regresiva')).toBeNull()
    expect(screen.getByTestId('btn-empezar-toma')).toBeTruthy()
    expect(motor.llamadas).toBe(1)
  })

  test('T84h Voz en inglés bajándose: el IndicadorPrecarga muestra el avance real y al terminar parte la cuenta.', async () => {
    const motor = new MotorQueBaja('lista', [0.25, 0.5])
    await montar(motor, 'en')
    fireEvent.click(screen.getByTestId('btn-leer-tarjeta'))
    fireEvent.click(await screen.findByTestId('btn-empezar-toma'))
    const aviso = await screen.findByTestId('aviso-voz')
    expect(aviso.textContent).toContain(es.descargandoModelo)
    expect(aviso.textContent).toMatch(/25%|50%/)
    expect(await screen.findByTestId('cuenta-regresiva')).toBeTruthy()
    expect(screen.queryByTestId('aviso-voz')).toBeNull()
  })
})
