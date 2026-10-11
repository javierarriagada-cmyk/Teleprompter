import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { grabacionNueva } from '../datos/modelo'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

let sesionFalsa = false
const idsCortados: string[] = []

vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return {
    ...actual,
    tomaEnCurso: () => sesionFalsa,
    iniciarTomaVideo: vi.fn(async () => {
      sesionFalsa = true
      return true
    }),
    cortarTomaVideo: vi.fn(async () => {
      sesionFalsa = false
      const toma = grabacionNueva({
        id: `toma-68-${idsCortados.length + 1}`,
        tituloGuion: 'Guion 68',
        ruta: `/toma-68-${idsCortados.length + 1}.mp4`,
        duracionMs: 4000,
        bytes: 120000
      })
      idsCortados.push(toma.id)
      return toma
    }),
    recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar()
  }
})

vi.mock('../lib/camara', async () => {
  const actual = await vi.importActual<typeof import('../lib/camara')>('../lib/camara')
  return {
    ...actual,
    camaraEncendida: () => true
  }
})

async function portadaConGuion() {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-68',
    titulo: 'Guion 68',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto para ver la toma' }]
  })
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  await screen.findByTestId('btn-leer-tarjeta')
  return repo
}

async function entrarGrabandoYSalir() {
  fireEvent.click(screen.getByTestId('btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 3100))
  })
  const vista = screen.getByTestId('teleprompter-view-container')
  fireEvent.click(vista)
  fireEvent.click(screen.getByTestId('btn-parar-lectura'))
}

describe('Tarea 68 - que pasa cuando la toma termina', () => {
  beforeEach(() => {
    localStorage.clear()
    sesionFalsa = false
    idsCortados.length = 0
    vi.clearAllMocks()
  })

  test('al salir de LEYENDO habiendo grabado, el visor aparece con esa toma', async () => {
    await portadaConGuion()
    await entrarGrabandoYSalir()
    const visor = await screen.findByTestId('reproductor-grabacion')
    expect(visor).toBeDefined()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    expect(screen.queryByTestId('aviso-flotante')).toBeNull()
  })

  test('al salir de LEYENDO SIN camara, el visor NO aparece', async () => {
    await portadaConGuion()
    fireEvent.click(screen.getByTestId('btn-leer-tarjeta'))
    await screen.findByTestId('btn-empezar-toma')
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    const vista = await screen.findByTestId('teleprompter-view-container')
    fireEvent.click(vista)
    fireEvent.click(screen.getByTestId('btn-salir-lectura'))
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    // Con findBy y no getBy: el aviso lo pinta App despues de que handleStop
    // resuelve, asi que no esta en el mismo tick que el click en Salir.
    // 28-09-2026: al salir de una LECTURA el aviso dice "Lectura", no "Grabado": no se grabo nada -App.tsx, avisarFinDeToma-.
    expect((await screen.findByTestId('aviso-flotante')).textContent).toMatch(/Lectura/)
  })

  test('al cerrar el visor se queda en LISTO, no en el origen', async () => {
    await portadaConGuion()
    await entrarGrabandoYSalir()
    await screen.findByTestId('reproductor-grabacion')
    // 28-09-2026: Cerrar es la X de la esquina del video.
    fireEvent.click(screen.getByTestId('btn-cerrar-reproductor'))
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('listo')
    // NO se comprueba que la tarjeta de la portada haya desaparecido: cuando se
    // entro desde la portada, esa pantalla SIGUE MONTADA detras del lienzo
    // -atenuada y sin recibir toques- y su boton esta en el DOM aunque no se
    // haya vuelto a ella. Lo que prueba que seguimos en la toma es que el
    // lienzo siga ahi y en LISTO, no la ausencia de lo de atras.
    expect(screen.getByTestId('teleprompter-view-container')).toBeDefined()
  })

  test('Repetir toma arranca otra toma y la anterior SIGUE EXISTIENDO', async () => {
    await portadaConGuion()
    await entrarGrabandoYSalir()
    await screen.findByTestId('reproductor-grabacion')
    const idPrimera = idsCortados[0]
    expect(idPrimera).toBeDefined()
    fireEvent.click(screen.getByTestId('btn-repetir-toma'))
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')).toBe('leyendo')
    })
    expect(idsCortados).toEqual([idPrimera])
  })

  test('el menu de la portada NO muestra motor, transcripcion ni medicion', async () => {
    await portadaConGuion()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    // 28-09-2026: el cajon se fue. Lo mismo se mira en Ajustes.
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: const ajustes = await screen.findByTestId('pantalla-ajustes')
    const ajustes = await screen.findByTestId('panel-ajustes-flotante')
    expect(ajustes.textContent).not.toContain('Motor de voz')
    expect(ajustes.textContent).not.toContain('Ver transcripción en vivo')
    expect(ajustes.textContent).not.toContain('Medición / Panel Corpus')
    expect(screen.getByTestId('fila-tema')).not.toBeNull()
    expect(screen.queryByTestId('apartado-nuestro')).toBeNull()
  })

  test('los tres siguen alcanzables por la puerta de diagnostico', async () => {
    await portadaConGuion()
    const marca = document.querySelector('.portada-marca') as HTMLElement
    for (let i = 0; i < 5; i++) {
      fireEvent.click(marca)
    }
    const franja = await screen.findByTestId('franja-de-estado-diagnostico')
    expect(franja.textContent).toContain('Motor de voz')
    expect(franja.textContent).toContain('Ver transcripción en vivo')
    expect(franja.textContent).toContain('Medición / Panel Corpus')
    fireEvent.click(screen.getByTestId('btn-abrir-corpus'))
    expect(screen.getByTestId('panel-corpus')).toBeDefined()
  })
})
