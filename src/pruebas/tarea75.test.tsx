import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import ReproductorGrabacion from '../components/ReproductorGrabacion'
import TiraGrabaciones from '../components/TiraGrabaciones'
import { SelectorSubtitulos } from '../components/SubtitulosVisor'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { grabacionNueva, Guion } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'
import { fijarIdioma, idiomaApp } from '../lib/idioma'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pegarEnGuion, seleccionarEnGuion, escribirEnGuion } from './ayudaEditor'
import { desplegarGuiones } from './ayudaPortada'

// TAREA 75 -27-09-2026-: LA APP EN ESPANOL E INGLES. La vara: con la app en ingles, ni un
// texto en espanol que se escape. Estas pruebas renderizan <App> entera -la regla de la casa:
// construir no es conectar- y recorren la portada, el editor, la lectura y el cajon de la toma.

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

// Con la camara "encendida", Grabar muestra las opciones de la imagen en el cajon de la toma.
vi.mock('../lib/camara', async () => {
  const actual = await vi.importActual<typeof import('../lib/camara')>('../lib/camara')
  return {
    ...actual,
    camaraEncendida: () => true
  }
})

// LO QUE SE VE O SE ESCUCHA: cada nodo de texto por separado -si se juntara todo el
// textContent, "Read" y "Record" quedarian pegados y una palabra partida no se encontraria- y
// los atributos que lee el lector de pantalla o que aparecen en la pantalla.
//
// Un elemento que declara su propio idioma con lang -la opcion "Español" del selector de
// idioma- es espanol A PROPOSITO: se nombra en su idioma para que quien no entiende la
// pantalla encuentre el suyo. Se salta con todo lo que tiene adentro.
const ATRIBUTOS = ['aria-label', 'title', 'placeholder', 'data-placeholder', 'alt']

function textosALaVista(raiz: HTMLElement = document.body): string[] {
  const fuera = (el: Element | null) => {
    const conLang = el ? el.closest('[lang]') : null
    return Boolean(conLang && conLang !== document.documentElement && !conLang.getAttribute('lang')!.startsWith('en'))
  }
  const out: string[] = []
  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  while (caminante.nextNode()) {
    const n = caminante.currentNode
    if (n.nodeValue && n.nodeValue.trim() && !fuera(n.parentElement)) out.push(n.nodeValue)
  }
  raiz.querySelectorAll('*').forEach((el) => {
    if (fuera(el)) return
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a)
      if (v && v.trim()) out.push(v)
    }
  })
  return out
}

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// LOS PEDAZOS DE es.ts QUE NO PUEDEN APARECER. Se recorren TODOS los valores de es.ts. Un
// valor con variables -"Archivados · {n}"- se parte en sus pedazos fijos. Se saltan los que
// son iguales en los dos idiomas -"Videos", "Formal"- y los que en ingles tambien son una
// palabra que usa en.ts -"No" de los subtitulos es "No scripts" en ingles-: no distinguen un
// idioma del otro.
const valoresIngleses = Object.values(en)
function apareceComoPalabra(pedazo: string, texto: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapar(pedazo)}(?![\\p{L}\\p{N}])`, 'u').test(texto)
}
const PEDAZOS_ESPANOLES: Array<{ clave: string; pedazo: string }> = []
for (const [clave, valor] of Object.entries(es)) {
  if (valor === (en as Record<string, string>)[clave]) continue
  for (const crudo of valor.split(/\{\w+\}/)) {
    const pedazo = crudo.trim()
    if (!/\p{L}/u.test(pedazo)) continue
    if (valoresIngleses.some((v) => apareceComoPalabra(pedazo, v))) continue
    PEDAZOS_ESPANOLES.push({ clave, pedazo })
  }
}

const escapados: string[] = []
function revisar(etapa: string) {
  const vistos = textosALaVista()
  for (const { clave, pedazo } of PEDAZOS_ESPANOLES) {
    const donde = vistos.find((v) => apareceComoPalabra(pedazo, v))
    if (donde !== undefined) escapados.push(`${etapa}: "${pedazo}" (es.${clave}) en «${donde}»`)
  }
}

// Guiones escritos en ingles: el titulo y el texto del guion son de la persona, no de la app,
// y no tienen que confundir la busqueda.
function guionIngles(id: string, titulo: string, archivado = false): Guion {
  return {
    id,
    titulo,
    idioma: 'en',
    creado: Date.now(),
    modificado: Date.now() - 3 * 24 * 3600 * 1000,
    archivado,
    bloques: [{ id: `b-${id}`, nombre: '', texto: 'Thanks for being here today. This is the first line of my talk, and the second one comes right after it.' }]
  }
}

async function appEnIngles() {
  const repo = new RepositorioMemoria()
  for (let i = 1; i <= 8; i++) await repo.guardar(guionIngles(`g-${i}`, `Talk number ${i}`))
  await repo.guardar(guionIngles('g-arch', 'Old talk', true))
  const motorFake = new MotorFake()
  render(<App repoOverride={repo} motor={motorFake} />)
  await screen.findByTestId('btn-leer-tarjeta')
  return { repo, motorFake }
}

describe('Tarea 75 - la app en espanol e ingles', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    escapados.length = 0
    // La guardiana fija ella misma el idioma que necesita: no se apoya en el de la
    // preparacion -src/pruebas/preparacion.ts-.
    fijarIdioma('en')
  })

  test('T75a - Con la app en ingles, la portada, el editor, la lectura y el cajon de la toma no muestran ningun texto de es.ts', async () => {
    // Por si la lista de pedazos se vaciara sola -un error al armarla-: sin pedazos la prueba
    // pasaria sin mirar nada.
    expect(PEDAZOS_ESPANOLES.length).toBeGreaterThan(100)

    await appEnIngles()

    // La lista plegada -tarea 76, 28-09-2026-: tres filas y "See all".
    revisar('portada plegada')
    // Desplegada aparecen el buscador y el pie de archivados.
    desplegarGuiones()

    // --- PORTADA: la tarjeta, la lista con su buscador, el pie de archivados, la tira vacia
    revisar('portada')
    // El menu de una fila y la pantalla de Ajustes —28-09-2026, fuera el cajon—.
    fireEvent.contextMenu(screen.getByTestId('fila-guion-g-1'))
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    await screen.findByTestId('pantalla-ajustes')
    revisar('portada, menu de la fila y pantalla de Ajustes')
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    // Los archivados, y una busqueda sin resultados.
    fireEvent.click(screen.getByTestId('btn-ver-archivados'))
    revisar('portada, archivados')
    fireEvent.change(screen.getByTestId('input-busqueda-biblioteca'), { target: { value: 'zzzz' } })
    revisar('portada, busqueda sin resultados')
    fireEvent.change(screen.getByTestId('input-busqueda-biblioteca'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('btn-ver-archivados'))
    // Borrar deja el aviso con Deshacer.
    fireEvent.contextMenu(screen.getByTestId('fila-guion-g-8'))
    fireEvent.click(screen.getByRole('button', { name: en.borrar }))
    await screen.findByTestId('aviso-flotante')
    revisar('portada, aviso de borrado')

    // --- EDITOR: la fila de arriba, el cajon Aa y la barra de formato
    fireEvent.click(screen.getByTestId('fila-guion-g-1'))
    await screen.findByTestId('btn-leer-guion-fijo')
    revisar('editor')
    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    // 28-09-2026: el Aa abre la pantalla de Ajustes. Se revisa ella y el dialogo del tamano.
    await screen.findByTestId('pantalla-ajustes')
    fireEvent.click(screen.getByTestId('fila-tamano-letra'))
    revisar('editor, pantalla de Ajustes y dialogo del tamano')
    fireEvent.click(screen.getByTestId('capa-dialogo-ajustes'))
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes'))
    seleccionarEnGuion(0, 6)
    await screen.findByRole('toolbar')
    revisar('editor, barra de formato')
    // Un cambio y la salida: el aviso "Saved".
    escribirEnGuion('Thanks for being here today. This is my talk, and I changed it a little.')
    fireEvent.click(screen.getByText(en.guiones))
    await screen.findByTestId('aviso-flotante')
    revisar('portada, aviso de guardado')

    // --- EDITOR VACIO: pegar texto y abrir archivo
    fireEvent.click(screen.getByTestId('btn-crear-guion'))
    await screen.findByTestId('btn-pegar-texto')
    revisar('editor vacio')
    fireEvent.click(screen.getByText(en.guiones))
    await screen.findByTestId('btn-leer-tarjeta')

    // --- LECTURA: el estado listo y las fichas, en Leer
    fireEvent.click(screen.getByTestId('btn-leer-tarjeta'))
    fireEvent.click(await screen.findByTestId('ficha-letra'))
    await screen.findByTestId('panel-ficha-letra')
    fireEvent.click(screen.getByTestId('ficha-anclaje'))
    await screen.findByTestId('panel-ficha-anclaje')
    revisar('lectura, fichas de LISTO en Leer')
    fireEvent.click(screen.getByTestId('btn-volver-listo'))

    // --- GRABAR: la ficha de camara, y la camara oculta
    fireEvent.click(await screen.findByTestId('btn-grabar-tarjeta'))
    fireEvent.click(await screen.findByTestId('ficha-camara'))
    fireEvent.click(await screen.findByTestId('btn-fondo-oculta'))
    await screen.findByTestId('aviso-camara-encendida')
    revisar('grabar, ficha de camara oculta')
    fireEvent.click(screen.getByTestId('btn-fondo-detras'))

    // --- LEYENDO: los controles, la pausa y el tacho con su "Sure?"
    fireEvent.click(screen.getByTestId('btn-empezar-toma'))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3100))
    })
    fireEvent.click(screen.getByTestId('teleprompter-view-container'))
    fireEvent.click(await screen.findByTestId('btn-pausa-lectura'))
    fireEvent.click(await screen.findByTestId('btn-descartar-toma'))
    revisar('grabando, en pausa, confirmando el descarte')

    expect(escapados).toEqual([])
  }, 30000)

  test('T75a2 - Con la app en ingles, la tira de videos, el visor de la toma y los subtitulos tampoco', async () => {
    const toma = grabacionNueva({ id: 't-1', tituloGuion: 'Sin título', incompleta: true, errorMudo: true, avisoMudo: true, duracionMs: 65000 })
    render(<TiraGrabaciones grabaciones={[toma]} onAbrir={() => {}} onBorrar={() => {}} />)
    revisar('tira de videos')
    cleanup()
    render(<TiraGrabaciones grabaciones={[]} onAbrir={() => {}} onBorrar={() => {}} />)
    revisar('tira de videos vacia')
    cleanup()
    render(<ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />)
    fireEvent.click(screen.getByTestId('borrar-desde-reproductor'))
    revisar('visor de la toma')
    cleanup()
    render(<SelectorSubtitulos estilo="amarillo" onCambiar={() => {}} />)
    fireEvent.click(screen.getByTestId('btn-subtitulos'))
    revisar('subtitulos')
    expect(escapados).toEqual([])
    // Y el titulo sin nombre de la toma se muestra en ingles, aunque se guarde en espanol.
    cleanup()
    render(<TiraGrabaciones grabaciones={[toma]} onAbrir={() => {}} onBorrar={() => {}} />)
    expect(screen.getByText(en.sinTitulo)).toBeDefined()
  })

  // 28-09-2026: ES · EN viven en Ajustes, fila-idioma. Elegir aplica y cierra
  // el dialogo; Ajustes sigue abierto.
  test('T75b - El selector ES · EN del cajon del engranaje cambia la app en el momento', async () => {
    fijarIdioma('es')
    await appEnIngles()
    expect(screen.getByTestId('btn-leer-tarjeta').textContent).toContain(es.leer)

    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    fireEvent.click(await screen.findByTestId('fila-idioma'))
    const selector = await screen.findByTestId('selector-idioma-app')
    expect(selector).toBeTruthy()
    expect(screen.getByTestId('btn-idioma-es').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('btn-idioma-en').getAttribute('aria-checked')).toBe('false')

    fireEvent.click(screen.getByTestId('btn-idioma-en'))
    // Sin reiniciar: la misma App, ya en ingles, y Ajustes sigue abierto.
    expect(idiomaApp()).toBe('en')
    expect(screen.getByTestId('btn-leer-tarjeta').textContent).toContain(en.leer)
    expect(screen.getByTestId('btn-grabar-tarjeta').textContent).toContain(en.grabar)
    expect(screen.getByTestId('btn-menu-superior-biblioteca').getAttribute('aria-label')).toBe(en.ajustesApp)
    expect(screen.getByText(en.guiones)).toBeDefined()
    expect(document.documentElement.lang).toBe('en')
    // Sin el plugin nativo, la eleccion queda en localStorage, que manda al arrancar.
    expect(localStorage.getItem('sigo_idioma')).toBe('en')

    fireEvent.click(screen.getByTestId('fila-idioma'))
    expect(screen.getByTestId('btn-idioma-en').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByTestId('btn-idioma-es'))
    expect(screen.getByTestId('btn-leer-tarjeta').textContent).toContain(es.leer)
    expect(screen.getByText(es.guiones)).toBeDefined()
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem('sigo_idioma')).toBe('es')
  })

  test('T75c - Con la app en ingles, un guion nuevo nace en ingles; pegar un texto espanol largo lo pasa a espanol; elegirlo a mano lo deja fijo', async () => {
    const { repo } = await appEnIngles()
    fireEvent.click(screen.getByTestId('btn-crear-guion'))
    const boton = await screen.findByTestId('btn-idioma-guion')
    expect(boton.getAttribute('data-idioma')).toBe('en')
    expect(boton.textContent).toBe('EN')
    const nuevo = (await repo.listar()).find((g) => !g.id.startsWith('g-'))!
    expect(nuevo.idioma).toBe('en')

    pegarEnGuion('Hoy les quiero contar algo que me pasó el año pasado, cuando empecé a grabar videos para mis clases. No sabía por dónde partir y el texto se me olvidaba a cada rato.')
    await waitFor(() => expect(screen.getByTestId('btn-idioma-guion').getAttribute('data-idioma')).toBe('es'))
    expect(screen.getByTestId('btn-idioma-guion').textContent).toBe('ES')
    expect(screen.getByTestId('btn-idioma-guion').getAttribute('aria-label')).toBe('Script language: Spanish')

    // Elegido a mano: vuelve a ingles y ya no cambia solo, aunque se siga pegando espanol.
    fireEvent.click(screen.getByTestId('btn-idioma-guion'))
    expect(screen.getByTestId('btn-idioma-guion').getAttribute('data-idioma')).toBe('en')
    pegarEnGuion(' Y despues de eso decidí que la próxima vez iba a preparar todo con tiempo, porque no se puede improvisar una clase entera.')
    expect(screen.getByTestId('btn-idioma-guion').getAttribute('data-idioma')).toBe('en')

    // Y queda guardado asi.
    await waitFor(async () => {
      const g = await repo.abrir(nuevo.id)
      expect(g && g.idioma).toBe('en')
      expect(g && g.idiomaElegido).toBe(true)
    }, { timeout: 2000 })
  })

  test('T75d - en.ts tiene todas las claves de es.ts, ninguna de mas y ninguna vacia', () => {
    const clavesEs = Object.keys(es).sort()
    const clavesEn = Object.keys(en).sort()
    expect(clavesEn).toEqual(clavesEs)
    for (const clave of clavesEn) {
      expect((en as Record<string, string>)[clave].trim(), `en.${clave}`).not.toBe('')
      expect((es as Record<string, string>)[clave].trim(), `es.${clave}`).not.toBe('')
    }
    // Las variables son las mismas en los dos: una que falte en ingles dejaria el hueco vacio.
    for (const clave of clavesEs) {
      const vars = (s: string) => (s.match(/\{\w+\}/g) || []).sort()
      expect(vars((en as Record<string, string>)[clave]), `variables de ${clave}`).toEqual(vars((es as Record<string, string>)[clave]))
    }
  })

  test('T75e - Al instalar con la app en ingles, el guion Hola se crea en ingles: se llama Hi', async () => {
    const motorFake = new MotorFake()
    render(<App motor={motorFake} />)
    await waitFor(() => expect(screen.getByTestId('titulo-tarjeta-lectura').textContent).toBe('Hi'), { timeout: 3000 })
  })
})
