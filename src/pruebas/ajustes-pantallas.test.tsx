// AJUSTES DE PANTALLAS -10-10-2026-: EL DOCK DE LISTO EN GRABAR, a través de <App>. Solo lógica: qué se
// abre, qué ajuste cambia, qué empieza. Sin posiciones ni medidas -jsdom no mide-. De pie en el
// teléfono -el layout de jsdom es tel-v-.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'

const h = vi.hoisted(() => ({
  lado: 'frontal' as 'frontal' | 'trasera',
  encendida: false,
  calidades: ['1080p', '720p', '480p'] as string[]
}))

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))
vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('../lib/camara', async (importOriginal) => {
  const actual: any = await importOriginal()
  // El plugin fingido, como en tarea93-flecha-fichas.
  const CamaraNativa = new Proxy({} as any, {
    get(_o, nombre: string) {
      if (nombre === 'then') return undefined
      if (nombre === 'addListener') return async () => ({ remove: async () => {} })
      if (nombre === 'vigilarRecursos') return async () => ({ camara: true, microfono: true })
      return async () => ({})
    }
  })
  return {
    ...actual,
    CamaraNativa,
    camaraEncendida: () => h.encendida,
    ladoActual: () => h.lado,
    encenderCamara: async (lado: 'frontal' | 'trasera') => { h.lado = lado; h.encendida = true },
    apagarCamara: async () => { h.encendida = false },
    empezarGrabacionVideo: async () => {},
    grabacionNativaEnCurso: () => true,
    cortarGrabacionVideo: async () => 'file:///plugin/video_1.mp4',
    errorDelUltimoCorte: () => null,
    obtenerCalidadesSoportadas: async () => h.calidades
  }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    juntos: (a: string, b: string) => `${a}/${b}`,
    escribirTexto: async () => {},
    leerTexto: async () => { throw new Error('no existe') },
    listarDirectorio: async () => [],
    borrarArchivo: async () => {},
    buscarMp4Recientes: async () => [],
    moverArchivo: async (_de: string, a: string) => a,
    analizarVideo: async () => ({ duracionMs: 20_000, bytes: 5_000_000, tienePistaAudio: true, nivelRmsDb: -20, anchoPx: 1080, altoPx: 1920, rotacion: 0 }),
    bytesDe: async () => 5_000_000,
    extraerMiniatura: async (_r: string, destino: string) => destino,
    obtenerEspacioLibre: async () => null
  }
})
vi.mock('../lib/tomaVideo', async () => {
  const actual = await vi.importActual<typeof import('../lib/tomaVideo')>('../lib/tomaVideo')
  return { ...actual, recuperarTomasPendientes: async (repo: { listar: () => Promise<unknown[]> }) => repo.listar() }
})

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion, contarPalabras, duracionDeLectura, duracionDeLecturaReloj } from '../datos/modelo'
import { hayCalidad } from '../components/FichasListo'
import { es } from '../textos/es'
import { fijarIdioma } from '../lib/idioma'
// -ajustes de pantallas, segunda vuelta- La única estimación y «Preparando la voz…» en el dock.
import BarraDeTiempo from '../components/BarraDeTiempo'
import { DockListo } from '../components/DockListo'
// -cuarta vuelta- Antes: import { CONSULTA_TEL_H } from '../hooks/useLayout'
import { CONSULTA_TEL_H, CONSULTA_TAB_V } from '../hooks/useLayout'

const matchMediaOriginal = window.matchMedia
function fingirDeLado(consulta: string) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === consulta,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as any
}

// 425 palabras: 170 s a 150 por minuto, el «2:50» del boceto.
const guion: Guion = {
  id: 'g-ap', titulo: 'Ajustes', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: Array.from({ length: 425 }, () => 'palabra').join(' ') }]
}

const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
const ajustesGuardados = () => JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}')
const estadoToma = () => screen.getByTestId('teleprompter-view-container').getAttribute('data-estado-toma')

async function sembrar() {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  return repo
}

async function abrirGrabar() {
  render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
  fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  await esperar(80)
}

describe('Ajustes de pantallas: el dock de LISTO en Grabar', () => {
  beforeEach(() => {
    localStorage.clear()
    h.encendida = false
    h.lado = 'frontal'
    h.calidades = ['1080p', '720p', '480p']
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.matchMedia = matchMediaOriginal
    window.history.replaceState(null, '', '/')
    fijarIdioma('es')
  })

  test('AJUSTES ABRE EL PANEL SIN CAMBIAR DE PANTALLA', async () => {
    await abrirGrabar()
    const ajustes = screen.getByTestId('btn-ajustes-toma')
    expect(ajustes.getAttribute('aria-label')).toBe(es.tituloAjustes)
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    fireEvent.click(ajustes)
    const panel = await screen.findByTestId('panel-ajustes-toma')
    expect(within(panel).getByText(es.tituloAjustesToma)).toBeTruthy()
    expect(screen.getByTestId('dock-listo').getAttribute('data-abierto')).toBe('si')
    // Sigue en LISTO de Grabar: no se abre la pantalla Ajustes.
    expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
    expect(estadoToma()).toBe('listo')
    expect(screen.getByTestId('btn-empezar-toma')).toBeTruthy()
    // La X lo cierra y se queda en LISTO.
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    expect(estadoToma()).toBe('listo')
  })

  test('UN CAMBIO EN EL PANEL ES EL MISMO AJUSTE QUE EN LA PANTALLA AJUSTES', async () => {
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    fireEvent.click(await screen.findByTestId('fila-ancho-texto'))
    fireEvent.click(within(screen.getByTestId('dialogo-ancho')).getByRole('menuitemradio', { name: es.angosto }))
    await waitFor(() => expect(ajustesGuardados().columnaAngosta).toBe(true))
    fireEvent.click(screen.getByTestId('switch-espejo'))
    await waitFor(() => expect(ajustesGuardados().mirror).toBe(true))
    cleanup()

    // La pantalla Ajustes de la biblioteca muestra lo elegido en el panel, en las mismas filas.
    render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-menu-superior-biblioteca'))
    // Antes -hasta 2026-10-10, cuarta vuelta: un solo panel de Ajustes-: await screen.findByTestId('pantalla-ajustes')
    await screen.findByTestId('panel-ajustes-flotante')
    expect(screen.getByTestId('fila-ancho-texto').textContent).toContain(es.angosto)
    expect(screen.getByTestId('switch-espejo').getAttribute('aria-checked')).toBe('true')
  })

  test('GRABAR CON EL PANEL ABIERTO LO CIERRA Y EMPIEZA', async () => {
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    await screen.findByTestId('panel-ajustes-toma')
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    await esperar(3200)
    expect(estadoToma()).toBe('leyendo')
  })

  test('VOLTEAR DE LA FILA HACE LO MISMO QUE EL DEL PANEL DE LA CÁMARA', async () => {
    await abrirGrabar()
    const voltear = screen.getByTestId('btn-voltear-listo')
    expect(voltear.getAttribute('aria-label')).toBe(es.voltearCamara)
    expect(voltear.textContent).toContain(es.voltear)
    fireEvent.click(voltear)
    await waitFor(() => expect(ajustesGuardados().ladoCamara).toBe('trasera'))
    await waitFor(() => expect(h.lado).toBe('trasera'))
    // El de siempre sigue en el panel de la ficha Cámara y vuelve a la frontal.
    fireEvent.click(screen.getByTestId('ficha-camara'))
    fireEvent.click(await screen.findByTestId('btn-voltear-camara'))
    await waitFor(() => expect(ajustesGuardados().ladoCamara).toBe('frontal'))
    await waitFor(() => expect(h.lado).toBe('frontal'))
  })

  test('LA DURACIÓN DE LISTO ES LA DEL EDITOR Y AL GRABAR VUELVE EL CONTADOR', async () => {
    const palabras = contarPalabras(guion)
    expect(duracionDeLecturaReloj(palabras)).toBe('2:50')
    expect(duracionDeLectura(palabras)).toBe('2:50 min')
    await abrirGrabar()
    expect(screen.getByTestId('dock-duracion-valor').textContent).toBe(duracionDeLecturaReloj(palabras))
    expect(screen.getByTestId('dock-duracion').textContent).toContain(es.duraAprox)
    // En LISTO la duración está en el dock, no en la pastilla de siempre.
    expect(screen.queryByTestId('barra-tiempo-previa')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await esperar(3200)
    expect(estadoToma()).toBe('leyendo')
    expect(screen.queryByTestId('dock-listo')).toBeNull()
    expect(screen.getByLabelText(es.tiempoTranscurrido)).toBeTruthy()
  })

  test('CALIDAD APARECE CON LA MISMA CONDICIÓN DE HOY', async () => {
    // La condición, la misma de la ficha de hoy: Grabar y calidades reportadas.
    expect(hayCalidad(true, ['1080p'])).toBe(true)
    expect(hayCalidad(true, [])).toBe(false)
    expect(hayCalidad(false, ['1080p'])).toBe(false)

    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    expect(await screen.findByTestId('fila-calidad')).toBeTruthy()
    fireEvent.click(screen.getByTestId('fila-calidad'))
    fireEvent.click(await screen.findByTestId('btn-calidad-720p'))
    await waitFor(() => expect(ajustesGuardados().calidadVideo).toBe('720p'))
    cleanup()

    h.calidades = []
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    await screen.findByTestId('panel-ajustes-toma')
    expect(screen.queryByTestId('fila-calidad')).toBeNull()
    // -tomas-largas, 15-10-2026, decisión de Javier- Los subtítulos se eligen SOLO en el visor: Ajustes ya no tiene la fila. Antes: expect(screen.getByTestId('fila-subtitulos')).toBeTruthy()
    expect(screen.queryByTestId('fila-subtitulos')).toBeNull()
  })

  // -SEGUNDA VUELTA, 10-10-2026- Una sola estimación. El guion lleva una nota entre corchetes: la nota
  // se ve pero no se lee, y el editor no la cuenta. Antes la pastilla contaba los tokens -con la nota-
  // y daba otro número.
  test('EL EDITOR, EL DOCK Y EL TOTAL DEL CONTADOR DAN LA MISMA DURACIÓN', async () => {
    const conNota: Guion = {
      ...guion,
      id: 'g-nota',
      bloques: [{ id: 'b1', nombre: '', texto: guion.bloques[0].texto + ' [una nota que no se lee en voz alta, solo para mí]' }]
    }
    const palabras = contarPalabras(conNota)
    expect(palabras).toBe(425)
    const repo = new RepositorioMemoria()
    await repo.guardar(conNota)

    // El editor.
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('fila-guion-g-nota'))
    expect((await screen.findByTestId('duracion-editor')).textContent).toBe(duracionDeLectura(palabras))
    expect(duracionDeLectura(palabras)).toBe('2:50 min')
    // El dock de LISTO.
    fireEvent.click(await screen.findByTestId('btn-grabar-guion-fijo'))
    await screen.findByTestId('btn-empezar-toma')
    expect(screen.getByTestId('dock-duracion-valor').textContent).toBe('2:50')
    cleanup()

    // El total de la pastilla quieta -de lado no hay dock y la pastilla sale en LISTO-.
    fingirDeLado(CONSULTA_TEL_H)
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    expect((await screen.findByTestId('barra-tiempo-previa')).textContent).toBe('00:00 / 02:50')
    cleanup()

    // El total del contador al arrancar la toma: posición 0, sin ritmo medido todavía. Los tokens -440,
    // con la nota- ya no cambian el total; antes daban 02:56.
    // -motor sin pastilla, 13-10-2026- la pastilla lee con leerEstado, sin avanzar el motor.
    // Antes: const motorQuieto = { estadoEn: () => ({ posicion: 0, ppmEstimadas: 150 }) } as any
    const motorQuieto = { leerEstado: () => ({ posicion: 0, ppmEstimadas: 150 }) } as any
    render(
      <BarraDeTiempo motorAvance={motorQuieto} totalTokens={440} palabrasGuion={palabras} tInicioLecturaMs={performance.now()} />
    )
    expect(screen.getByLabelText(es.tiempoTranscurrido).textContent).toBe('00:00 / 02:50')
  })

  test('MIENTRAS BAJA LA VOZ, EL DOCK DICE «PREPARANDO LA VOZ…» EN VEZ DE LA DURACIÓN', async () => {
    // La voz forzada bajando en 70 % -lib/forzado104.ts, solo en desarrollo y pruebas-.
    window.history.replaceState(null, '', '/?t104voz=bajando')
    await abrirGrabar()
    const preparando = await screen.findByTestId('dock-preparando-voz')
    expect(preparando.textContent).toContain(es.preparandoVoz)
    expect(preparando.textContent).toContain('70 %')
    expect(screen.queryByTestId('dock-duracion-valor')).toBeNull()
    // Nunca encima del dock: la pastilla no sale.
    expect(screen.queryByTestId('pastilla-preparando-voz')).toBeNull()
    cleanup()

    // De lado, sin dock, queda como hoy: la pastilla.
    fingirDeLado(CONSULTA_TEL_H)
    await abrirGrabar()
    expect(await screen.findByTestId('pastilla-preparando-voz')).toBeTruthy()
    cleanup()

    // Al terminar de bajar -null- vuelve la duración.
    const props = {
      fichas: () => null,
      botonGrabar: <button type="button">Grabar</button>,
      conVoltear: false,
      duracion: '2:50',
      mostrarDuracion: true,
      ajustesLectura: {} as any,
      conCamara: true,
      calidadVideo: '1080p',
      calidadesSoportadas: ['1080p'],
      minutosDisponibles: null
    }
    const { rerender } = render(<DockListo {...props} preparandoVoz={0.4} />)
    expect(screen.getByTestId('dock-preparando-voz').textContent).toContain('40 %')
    expect(screen.queryByTestId('dock-duracion-valor')).toBeNull()
    rerender(<DockListo {...props} preparandoVoz={null} />)
    expect(screen.queryByTestId('dock-preparando-voz')).toBeNull()
    expect(screen.getByTestId('dock-duracion-valor').textContent).toBe('2:50')
  })
})

// -AJUSTES DE PANTALLAS, CUARTA VUELTA, 10-10-2026- UN SOLO PANEL DE AJUSTES EN TODA LA APP. Javier: el de
// «Ajustes de la toma», que se abre en el lugar, de vidrio, sin oscurecer, y se cierra con la X o tocando
// afuera; reemplaza a la pantalla completa de Ajustes en todas las puertas. Solo lógica: qué se abre, en
// qué pantalla se queda, qué secciones muestra y qué ajuste cambia. Sin posiciones ni medidas.
describe('Ajustes de pantallas, cuarta vuelta: un solo panel de Ajustes', () => {
  beforeEach(() => {
    localStorage.clear()
    h.encendida = false
    h.lado = 'frontal'
    h.calidades = ['1080p', '720p', '480p']
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.matchMedia = matchMediaOriginal
    fijarIdioma('es')
  })

  // Los títulos de las secciones del panel abierto, en el orden en que se ven.
  const secciones = () =>
    Array.from(screen.getByTestId('panel-ajustes-toma').querySelectorAll('.dock-seccion')).map((e) => e.textContent)
  const LECTURA_PANTALLA = [es.seccionLectura, es.seccionPantalla]
  const LECTURA_VIDEO_PANTALLA = [es.seccionLectura, es.seccionVideo, es.seccionPantalla]
  const sinPantallaCompleta = () => {
    expect(screen.queryByTestId('pantalla-ajustes')).toBeNull()
    expect(screen.queryByRole('dialog', { name: es.tituloAjustes })).toBeNull()
  }

  async function montar() {
    render(<App repoOverride={await sembrar()} motor={new MotorFake()} />)
    await screen.findByTestId('btn-menu-superior-biblioteca')
    await esperar(80)
  }
  async function abrirLeer() {
    await montar()
    fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
    await screen.findByTestId('btn-empezar-toma')
    await esperar(80)
  }

  test('DESDE LA PORTADA SE ABRE EN EL LUGAR CON LECTURA, PANTALLA, APARIENCIA Y ACERCA DE SIGO', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    const panel = await screen.findByTestId('panel-ajustes-toma')
    expect(panel.getAttribute('data-origen')).toBe('portada')
    expect(within(panel).getByText(es.tituloAjustes)).toBeTruthy()
    // -guia-sigo, 18-10-2026- Entra la sección Ayuda, arriba de Acerca de: decisión D8 del estudio de cómo
    // enseña Sigo, aprobada por Javier. Antes:
    // expect(secciones()).toEqual([es.seccionLectura, es.seccionPantalla, es.seccionApariencia, es.seccionAcerca])
    // -cuenta-google, 20-10-2026- Entra la sección Cuenta, entre Apariencia y Ayuda: orden A «Entrar con
    // Google», visible desde que firebaseConfig.ts tiene los datos de la consola. Antes:
    // expect(secciones()).toEqual([es.seccionLectura, es.seccionPantalla, es.seccionApariencia, es.seccionAyuda, es.seccionAcerca])
    expect(secciones()).toEqual([es.seccionLectura, es.seccionPantalla, es.seccionApariencia, es.seccionCuenta, es.seccionAyuda, es.seccionAcerca])
    expect(screen.getByTestId('fila-tema')).toBeTruthy()
    expect(screen.getByTestId('fila-idioma')).toBeTruthy()
    expect(screen.getByTestId('fila-acerca-de-sigo')).toBeTruthy()
    // Sin cambiar de pantalla: la portada sigue ahí, y no hay pantalla completa.
    expect(screen.getByTestId('btn-menu-superior-biblioteca')).toBeTruthy()
    sinPantallaCompleta()
    // Tocar afuera lo cierra.
    fireEvent.click(screen.getByTestId('capa-panel-ajustes'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    expect(screen.getByTestId('btn-menu-superior-biblioteca')).toBeTruthy()
  })

  test('ACERCA DE SIGO SE ABRE DENTRO DEL MISMO PANEL; LICENCIAS SIGUE SIENDO SU PANTALLA', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    fireEvent.click(await screen.findByTestId('fila-acerca-de-sigo'))
    const panel = screen.getByTestId('panel-ajustes-toma')
    const acerca = within(panel).getByTestId('pantalla-acerca-sigo')
    expect(within(panel).getByText(es.acercaDeSigo)).toBeTruthy()
    for (const id of ['fila-version', 'fila-privacidad', 'fila-soporte', 'fila-licencias']) {
      expect(within(acerca).getByTestId(id)).toBeTruthy()
    }
    sinPantallaCompleta()
    // Volver deja el panel con sus secciones.
    fireEvent.click(screen.getByTestId('btn-cerrar-acerca'))
    expect(screen.queryByTestId('pantalla-acerca-sigo')).toBeNull()
    expect(secciones()).toContain(es.seccionAcerca)
    // Licencias, su propia pantalla.
    fireEvent.click(screen.getByTestId('fila-acerca-de-sigo'))
    fireEvent.click(screen.getByTestId('fila-licencias'))
    expect(await screen.findByTestId('pantalla-licencias')).toBeTruthy()
  })

  test('DESDE EL EDITOR SE ABRE EN EL LUGAR CON LECTURA Y PANTALLA', async () => {
    await montar()
    fireEvent.click(await screen.findByTestId('fila-guion-g-ap'))
    fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
    const panel = await screen.findByTestId('panel-ajustes-toma')
    expect(panel.getAttribute('data-origen')).toBe('editor')
    expect(within(panel).getByText(es.tituloAjustes)).toBeTruthy()
    expect(secciones()).toEqual(LECTURA_PANTALLA)
    expect(screen.queryByTestId('fila-tema')).toBeNull()
    expect(screen.queryByTestId('fila-subtitulos')).toBeNull()
    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
    sinPantallaCompleta()
    // La X lo cierra y el editor sigue.
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    expect(screen.getByTestId('input-titulo-guion')).toBeTruthy()
  })

  test('LEER DE PIE TIENE EL DOCK: TEXTO, PANTALLA Y EL ENGRANAJE; EL PLAY Y LO QUE DURA ABAJO', async () => {
    await abrirLeer()
    const dock = screen.getByTestId('dock-listo')
    const grupos = Array.from(dock.querySelectorAll('.grupo-fichas')).map((g) => g.getAttribute('aria-label'))
    expect(grupos).toEqual([es.rotuloGrupoTexto, es.seccionPantalla])
    const ids = Array.from(dock.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid'))
    // -tarea 106- La ficha del modo de lectura va abajo a la izquierda, despues del engranaje en el orden
    // del dock. Antes:
    // expect(ids.filter((id) => id!.startsWith('ficha-') || id === 'btn-ajustes-toma')).toEqual([
    //   'ficha-letra', 'ficha-anclaje', 'ficha-brillo', 'btn-ajustes-toma'
    // ])
    expect(ids.filter((id) => id!.startsWith('ficha-') || id === 'btn-ajustes-toma')).toEqual([
      'ficha-letra', 'ficha-anclaje', 'ficha-brillo', 'btn-ajustes-toma', 'ficha-modo-lectura'
    ])
    // El engranaje reemplaza a Más, y no hay Voltear ni cámara.
    expect(screen.queryByTestId('ficha-mas')).toBeNull()
    expect(screen.queryByTestId('btn-voltear-listo')).toBeNull()
    expect(screen.queryByTestId('ficha-camara')).toBeNull()
    // Abajo, el play de hoy y lo que dura, con la única estimación.
    expect(within(dock).getByTestId('btn-empezar-toma').classList.contains('btn-empezar-leer')).toBe(true)
    expect(within(dock).getByTestId('dock-duracion-valor').textContent).toBe(duracionDeLecturaReloj(contarPalabras(guion)))
    expect(within(dock).getByTestId('dock-duracion').textContent).toContain(es.duraAprox)
  })

  test('EN LEER EL ENGRANAJE ABRE EL PANEL EN EL DOCK CON LECTURA Y PANTALLA, SIN VIDEO', async () => {
    await abrirLeer()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    const panel = await screen.findByTestId('panel-ajustes-toma')
    expect(panel.getAttribute('data-origen')).toBe('leer')
    expect(within(panel).getByText(es.tituloAjustes)).toBeTruthy()
    expect(secciones()).toEqual(LECTURA_PANTALLA)
    expect(screen.queryByTestId('fila-subtitulos')).toBeNull()
    expect(screen.queryByTestId('fila-calidad')).toBeNull()
    expect(screen.getByTestId('dock-listo').contains(panel)).toBe(true)
    expect(estadoToma()).toBe('listo')
    sinPantallaCompleta()
    // Tocar afuera lo cierra.
    fireEvent.click(screen.getByTestId('capa-dock-ajustes'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
  })

  test('EN GRABAR EL PANEL SIGUE COMO HOY: LECTURA, VIDEO Y PANTALLA, «AJUSTES DE LA TOMA»', async () => {
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    const panel = await screen.findByTestId('panel-ajustes-toma')
    expect(panel.getAttribute('data-origen')).toBe('grabar')
    expect(within(panel).getByText(es.tituloAjustesToma)).toBeTruthy()
    expect(secciones()).toEqual(LECTURA_VIDEO_PANTALLA)
    sinPantallaCompleta()
  })

  test('DE LADO Y EN TABLETA, MÁS ABRE EL MISMO PANEL EN EL LUGAR CON LAS SECCIONES DE SU PANTALLA', async () => {
    // Leer de lado: Más, en el riel derecho.
    fingirDeLado(CONSULTA_TEL_H)
    await abrirLeer()
    fireEvent.click(screen.getByTestId('ficha-mas'))
    let panel = await screen.findByTestId('panel-ajustes-toma')
    expect(screen.getByTestId('panel-ajustes-flotante').contains(panel)).toBe(true)
    expect(panel.getAttribute('data-origen')).toBe('leer')
    expect(within(panel).getByText(es.tituloAjustes)).toBeTruthy()
    expect(secciones()).toEqual(LECTURA_PANTALLA)
    expect(estadoToma()).toBe('listo')
    sinPantallaCompleta()
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    cleanup()

    // Grabar de lado: Ajustes en la segunda fila -la Más de Grabar-.
    fingirDeLado(CONSULTA_TEL_H)
    await abrirGrabar()
    fireEvent.click(await screen.findByTestId('ficha-flecha'))
    fireEvent.click(await screen.findByTestId('ficha-ajustes'))
    panel = await screen.findByTestId('panel-ajustes-toma')
    expect(panel.getAttribute('data-origen')).toBe('grabar')
    expect(within(panel).getByText(es.tituloAjustesToma)).toBeTruthy()
    expect(secciones()).toEqual(LECTURA_VIDEO_PANTALLA)
    expect(estadoToma()).toBe('listo')
    sinPantallaCompleta()
    cleanup()

    // Leer en la tableta de pie: Más, en la barra de arriba.
    fingirDeLado(CONSULTA_TAB_V)
    await abrirLeer()
    fireEvent.click(screen.getByTestId('ficha-mas'))
    panel = await screen.findByTestId('panel-ajustes-toma')
    expect(screen.getByTestId('panel-ajustes-flotante').contains(panel)).toBe(true)
    expect(secciones()).toEqual(LECTURA_PANTALLA)
    expect(estadoToma()).toBe('listo')
    sinPantallaCompleta()
  })

  test('UN CAMBIO HECHO EN CUALQUIER PANEL ES EL MISMO AJUSTE EN LOS OTROS', async () => {
    // En la portada: ancho angosto.
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    fireEvent.click(await screen.findByTestId('fila-ancho-texto'))
    fireEvent.click(within(screen.getByTestId('dialogo-ancho')).getByRole('menuitemradio', { name: es.angosto }))
    await waitFor(() => expect(ajustesGuardados().columnaAngosta).toBe(true))
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))

    // En el editor se ve lo mismo; ahí, el espejo.
    fireEvent.click(await screen.findByTestId('fila-guion-g-ap'))
    fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
    expect((await screen.findByTestId('fila-ancho-texto')).textContent).toContain(es.angosto)
    fireEvent.click(screen.getByTestId('switch-espejo'))
    await waitFor(() => expect(ajustesGuardados().mirror).toBe(true))
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))

    // En el dock de Leer, los dos; ahí, la tipografía.
    fireEvent.click(screen.getByTestId('btn-leer-guion-fijo'))
    fireEvent.click(await screen.findByTestId('btn-ajustes-toma'))
    expect((await screen.findByTestId('fila-ancho-texto')).textContent).toContain(es.angosto)
    expect(screen.getByTestId('switch-espejo').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByTestId('fila-tipo-letra'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Serif' }))
    await waitFor(() => expect(ajustesGuardados().tipoFuente).toBe('serif'))
    cleanup()

    // En el panel de Grabar y otra vez en la portada, los tres.
    await abrirGrabar()
    fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
    expect((await screen.findByTestId('fila-ancho-texto')).textContent).toContain(es.angosto)
    expect(screen.getByTestId('switch-espejo').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('fila-tipo-letra').textContent).toContain('Serif')
    cleanup()
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    expect((await screen.findByTestId('fila-tipo-letra')).textContent).toContain('Serif')
    expect(screen.getByTestId('switch-espejo').getAttribute('aria-checked')).toBe('true')
  })

  test('LA PANTALLA COMPLETA DE AJUSTES YA NO SE ABRE DESDE NINGUNA PUERTA', async () => {
    const puertas: Array<[string, () => Promise<void>]> = [
      ['portada', async () => {
        await montar()
        fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
      }],
      ['editor', async () => {
        await montar()
        fireEvent.click(await screen.findByTestId('fila-guion-g-ap'))
        fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
      }],
      ['Leer de pie', async () => {
        await abrirLeer()
        fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
      }],
      ['Grabar de pie', async () => {
        await abrirGrabar()
        fireEvent.click(screen.getByTestId('btn-ajustes-toma'))
      }],
      ['Leer de lado', async () => {
        fingirDeLado(CONSULTA_TEL_H)
        await abrirLeer()
        fireEvent.click(screen.getByTestId('ficha-mas'))
      }],
      ['Grabar de lado', async () => {
        fingirDeLado(CONSULTA_TEL_H)
        await abrirGrabar()
        fireEvent.click(await screen.findByTestId('ficha-flecha'))
        fireEvent.click(await screen.findByTestId('ficha-ajustes'))
      }]
    ]
    for (const [puerta, abrir] of puertas) {
      await abrir()
      expect(await screen.findByTestId('panel-ajustes-toma'), puerta).toBeTruthy()
      expect(screen.queryByTestId('pantalla-ajustes'), puerta).toBeNull()
      expect(screen.queryByRole('dialog', { name: es.tituloAjustes }), puerta).toBeNull()
      cleanup()
      window.matchMedia = matchMediaOriginal
    }
  })

  test('SIN MOVIMIENTO SI EL SISTEMA LO PIDE: EL PANEL SUBE SIN ANIMACIÓN', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    expect((await screen.findByTestId('panel-ajustes-flotante')).style.animation).toContain('dock-crece')
    cleanup()
    fingirDeLado('(prefers-reduced-motion: reduce)')
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    expect((await screen.findByTestId('panel-ajustes-flotante')).style.animation).toBe('')
    expect(screen.getByTestId('panel-ajustes-toma').style.animation).toBe('')
  })
})
