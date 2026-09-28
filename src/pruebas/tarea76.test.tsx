import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import fs from 'fs'
import path from 'path'
import App from '../App'
import BibliotecaView, { GUIONES_A_LA_VISTA, resetearPrimerMontajeBiblioteca } from '../components/BibliotecaView'
import EditorView from '../components/EditorView'
import TiraGrabaciones from '../components/TiraGrabaciones'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion, ResumenGrabacion, grabacionNueva } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'
import { fijarIdioma } from '../lib/idioma'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { desplegarGuiones } from './ayudaPortada'
import { textoDelGuion } from './ayudaEditor'

// TAREA 76 -28-09-2026-: la portada que no crece sin fin, los videos vacios con dibujo y las
// tomas del guion abierto. Docs: docs/tarea76.txt.
//
// Las tomas se siembran en el repositorio de grabaciones que App arma cuando recibe
// repoOverride -RepositorioGrabacionesMemoria-: la app las lee al arrancar como lee las de
// verdad, sin atajos. vi.hoisted porque vi.mock sube arriba de todo el archivo.
const { tomasSembradas } = vi.hoisted(() => ({ tomasSembradas: [] as ResumenGrabacion[] }))
vi.mock('../datos/RepositorioGrabacionesMemoria', async () => {
  const real = await vi.importActual<typeof import('../datos/RepositorioGrabacionesMemoria')>('../datos/RepositorioGrabacionesMemoria')
  class ConTomasSembradas extends real.RepositorioGrabacionesMemoria {
    constructor() {
      super()
      for (const g of tomasSembradas) void this.guardar(g)
    }
  }
  return { RepositorioGrabacionesMemoria: ConTomasSembradas }
})

// Guion i: el numero mas alto es el mas reciente -modificado-, y la lista lo pone arriba.
function guion(i: number, extra: Partial<Guion> = {}): Guion {
  return {
    id: `g-${i}`,
    titulo: `Guion número ${i}`,
    idioma: 'es',
    creado: 1_000_000 + i,
    modificado: 1_000_000 + i * 1000,
    archivado: false,
    bloques: [{ id: `b-${i}`, nombre: '', texto: `Texto del guion ${i}, con palabras para leer en voz alta.` }],
    ...extra
  }
}

function toma(id: string, guionId: string, creado: number, extra: Partial<ResumenGrabacion> = {}): ResumenGrabacion {
  return grabacionNueva({
    id,
    guionId,
    tituloGuion: `Titulo de ${guionId}`,
    ruta: `/tomas/${id}.mp4`,
    rutaMiniatura: `data:image/png;base64,${id}`,
    duracionMs: 42_000,
    creado,
    ...extra
  })
}

async function portada(guiones: Guion[]) {
  const repo = new RepositorioMemoria()
  for (const g of guiones) await repo.guardar(g)
  let container!: HTMLElement
  await act(async () => {
    container = render(<App repoOverride={repo} motor={new MotorFake()} />).container
    await new Promise((r) => setTimeout(r, 600))
  })
  return { repo, container }
}

function muchos(n: number): Guion[] {
  return Array.from({ length: n }, (_, k) => guion(k + 1))
}

// Las filas que se ven, de arriba a abajo, acotadas a la lista -no a la tarjeta de arriba-.
function filas(): string[] {
  const lista = screen.getByTestId('lista-guiones-biblioteca')
  return Array.from(lista.querySelectorAll('[data-testid^="fila-guion-"]')).map((el) =>
    (el.getAttribute('data-testid') || '').replace('fila-guion-', '')
  )
}

describe('Tarea 76 - la portada plegada', () => {
  beforeEach(() => {
    localStorage.clear()
    tomasSembradas.length = 0
    resetearPrimerMontajeBiblioteca()
  })

  test('T76-1 Con 1, 3, 4 y 12 guiones: cuantas filas, cuando hay "Ver todos", el numero es el total, desplegar muestra todas y plegar vuelve a 3', async () => {
    expect(GUIONES_A_LA_VISTA).toBe(3)

    for (const n of [1, 3]) {
      await portada(muchos(n))
      expect(filas().length, `con ${n} guiones`).toBe(n)
      expect(screen.queryByTestId('btn-ver-todos-guiones'), `con ${n} guiones no hay "Ver todos"`).toBeNull()
      cleanup()
      resetearPrimerMontajeBiblioteca()
    }

    for (const n of [4, 12]) {
      await portada(muchos(n))
      // Plegada: los tres mas recientes, en el orden de siempre -modificado, el ultimo arriba-.
      expect(filas(), `con ${n} guiones, plegada`).toEqual([`g-${n}`, `g-${n - 1}`, `g-${n - 2}`])
      const boton = screen.getByTestId('btn-ver-todos-guiones')
      expect(boton.tagName).toBe('BUTTON')
      expect(boton.getAttribute('type')).toBe('button')
      expect(boton.textContent).toBe(`Ver todos · ${n}`)
      expect(boton.getAttribute('aria-expanded')).toBe('false')
      // aria-controls apunta a la lista.
      expect(boton.getAttribute('aria-controls')).toBe(screen.getByTestId('lista-guiones-biblioteca').id)
      expect(boton.getAttribute('aria-controls')).not.toBe('')

      fireEvent.click(boton)
      const todas = muchos(n).map((g) => g.id).reverse()
      expect(filas(), `con ${n} guiones, desplegada`).toEqual(todas)
      expect(boton.getAttribute('aria-expanded')).toBe('true')
      expect(boton.textContent).toBe('Ver menos')

      fireEvent.click(boton)
      expect(filas(), `con ${n} guiones, plegada de nuevo`).toEqual([`g-${n}`, `g-${n - 1}`, `g-${n - 2}`])
      expect(boton.getAttribute('aria-expanded')).toBe('false')
      cleanup()
      resetearPrimerMontajeBiblioteca()
    }
  })

  test('T76-2 El numero de "Ver todos" es el total de la lista SIN archivados, y "Archivados" solo esta desplegada', async () => {
    await portada([...muchos(12), guion(50, { archivado: true }), guion(51, { archivado: true })])
    expect(screen.getByTestId('btn-ver-todos-guiones').textContent).toBe('Ver todos · 12')
    expect(screen.queryByTestId('btn-ver-archivados')).toBeNull()
    desplegarGuiones()
    const archivados = screen.getByTestId('btn-ver-archivados')
    expect(archivados.textContent).toBe('Archivados · 2')
    // Al pie: despues de "Ver menos".
    const verTodos = screen.getByTestId('btn-ver-todos-guiones')
    expect(verTodos.compareDocumentPosition(archivados) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // La vista de archivados muestra todos sus guiones, sin plegar ni "Ver todos".
    fireEvent.click(archivados)
    expect(filas().sort()).toEqual(['g-50', 'g-51'])
    expect(screen.queryByTestId('btn-ver-todos-guiones')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-ver-archivados'))
    expect(filas().length).toBe(12)
  })

  test('T76-3 Con 3 guiones o menos y alguno archivado, "Archivados" se ve: la lista ya esta entera y no hay como desplegarla', async () => {
    await portada([guion(1), guion(2), guion(9, { archivado: true })])
    expect(screen.queryByTestId('btn-ver-todos-guiones')).toBeNull()
    expect(screen.getByTestId('btn-ver-archivados').textContent).toBe('Archivados · 1')
  })

  test('T76-4 Desplegar, entrar a un guion y volver: sigue desplegada, y las filas no vuelven a entrar', async () => {
    await portada(muchos(12))
    desplegarGuiones()
    expect(filas().length).toBe(12)
    // g-2 es la penultima fila: solo se llega desplegando.
    await act(async () => {
      fireEvent.click(screen.getByTestId('fila-guion-g-2'))
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(screen.queryByTestId('lista-guiones-biblioteca')).toBeNull()
    expect(screen.getByTestId('editor-guion')).not.toBeNull()
    await act(async () => {
      fireEvent.click(document.querySelector('.volver-guiones') as HTMLElement)
      await new Promise((r) => setTimeout(r, 600))
    })
    expect(filas().length).toBe(12)
    expect(screen.getByTestId('btn-ver-todos-guiones').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('filas-desplegadas').getAttribute('data-retardo-escalonado')).toBe('0')
    expect(screen.getByTestId('filas-desplegadas').style.animation).toBe('')
  })

  test('T76-5 El estado vive en la sesion, no en el telefono: una app recien cargada vuelve a plegada', async () => {
    const props = { guiones: muchos(6).map((g) => ({ id: g.id, titulo: g.titulo, idioma: 'es', modificado: g.modificado, palabras: 10 })).reverse(), onAbrir: () => {}, onCrearNuevo: () => {}, onBorrar: () => {}, onArchivar: () => {} }
    const primera = render(<BibliotecaView {...props} />)
    desplegarGuiones(primera.container)
    primera.unmount()
    // Misma sesion: el modulo sigue cargado y la lista sigue desplegada.
    const segunda = render(<BibliotecaView {...props} />)
    expect(within(segunda.container).getByTestId('btn-ver-todos-guiones').getAttribute('aria-expanded')).toBe('true')
    segunda.unmount()
    expect(localStorage.length).toBe(0)
    // App cerrada y vuelta a abrir: el modulo se carga de nuevo.
    vi.resetModules()
    const { default: BibliotecaNueva } = await import('../components/BibliotecaView')
    const tercera = render(<BibliotecaNueva {...props} />)
    expect(within(tercera.container).getByTestId('btn-ver-todos-guiones').getAttribute('aria-expanded')).toBe('false')
    expect(within(tercera.container).getAllByTestId(/^fila-guion-/).length).toBe(3)
  })

  test('T76-6 Las filas de la cuarta en adelante entran con la entrada de la lista despues del toque; el chevron gira', async () => {
    await portada(muchos(12))
    const boton = screen.getByTestId('btn-ver-todos-guiones')
    const chevron = boton.querySelector('svg') as SVGElement
    expect(chevron.style.transform).toBe('rotate(0deg)')
    fireEvent.click(boton)
    const resto = screen.getByTestId('filas-desplegadas')
    expect(within(resto).getAllByTestId(/^fila-guion-/).length).toBe(9)
    expect(resto.getAttribute('data-retardo-escalonado')).toBe('80')
    expect(resto.style.animation).toContain('pantallaEntraInicial')
    expect(resto.style.animationDelay).toBe('80ms')
    expect(chevron.style.transform).toBe('rotate(180deg)')
    expect(chevron.style.transition).toContain('transform')
  })

  test('T76-7 La busqueda solo aparece desplegada, arriba de las filas, y encuentra un guion que estaba mas abajo del tercero', async () => {
    await portada(muchos(12))
    expect(screen.queryByTestId('input-busqueda-biblioteca')).toBeNull()
    desplegarGuiones()
    const input = screen.getByTestId('input-busqueda-biblioteca') as HTMLInputElement
    const lista = screen.getByTestId('lista-guiones-biblioteca')
    expect(input.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // "número 2" no esta en "número 12": encuentra solo el g-2, la penultima fila.
    await act(async () => {
      fireEvent.change(input, { target: { value: 'número 2' } })
    })
    expect(filas()).toEqual(['g-2'])
    // Plegar se lleva la busqueda y lo escrito: no queda un filtro con un campo que no se ve.
    fireEvent.click(screen.getByTestId('btn-ver-todos-guiones'))
    expect(screen.queryByTestId('input-busqueda-biblioteca')).toBeNull()
    expect(filas()).toEqual(['g-12', 'g-11', 'g-10'])
    desplegarGuiones()
    expect((screen.getByTestId('input-busqueda-biblioteca') as HTMLInputElement).value).toBe('')
    expect(filas().length).toBe(12)
  })

  test('T76-18 Al plegar, si "Ver todos" quedo arriba del borde de la pantalla, la pagina vuelve suave al titulo "Guiones"; si se ve, no se mueve', async () => {
    // jsdom no mide ni desplaza: la prueba fija ella misma donde queda el boton y mira a quien
    // se le pide volver.
    const volver = vi.fn()
    const original = (Element.prototype as any).scrollIntoView
    ;(Element.prototype as any).scrollIntoView = volver
    try {
      await portada(muchos(12))
      const boton = screen.getByTestId('btn-ver-todos-guiones')
      const medirEn = (top: number) => {
        boton.getBoundingClientRect = () => ({ top, bottom: top + 44, left: 0, right: 0, width: 0, height: 44, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
      }
      // Plegar con "Ver todos" a la vista: no se mueve.
      fireEvent.click(boton)
      medirEn(300)
      fireEvent.click(boton)
      expect(volver).not.toHaveBeenCalled()
      // Plegar con "Ver todos" arriba del borde: vuelve al titulo.
      fireEvent.click(boton)
      medirEn(-40)
      fireEvent.click(boton)
      expect(volver).toHaveBeenCalledTimes(1)
      expect(volver.mock.instances[0].textContent).toBe('Guiones')
      expect(volver).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    } finally {
      ;(Element.prototype as any).scrollIntoView = original
    }
  })

  test('T76-8 Bajar la pantalla sobre una fila que aparecio al desplegar tampoco la abre: las filas nuevas son FilaGuion', async () => {
    await portada(muchos(12))
    desplegarGuiones()
    const fila = screen.getByTestId('fila-guion-g-1')
    expect(fila.style.touchAction).toBe('pan-y')
    await act(async () => {
      fireEvent.pointerDown(fila, { clientX: 100, clientY: 300 })
      fireEvent.pointerCancel(fila)
      fireEvent.touchEnd(fila)
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.queryByTestId('fila-guion-g-1')).not.toBeNull()
  })
})

describe('Tarea 76 - videos vacios', () => {
  beforeEach(() => {
    localStorage.clear()
    tomasSembradas.length = 0
    resetearPrimerMontajeBiblioteca()
  })

  function revisarVacio(textos: typeof es) {
    const vacio = screen.getByTestId('videos-vacio')
    const dibujo = vacio.querySelector('svg') as SVGElement
    expect(dibujo).not.toBeNull()
    expect(dibujo.getAttribute('width')).toBe('96')
    expect(dibujo.getAttribute('height')).toBe('72')
    expect(dibujo.getAttribute('aria-hidden')).toBe('true')
    // Cuatro esquinas y el triangulo en el rojo de la casa; nada de colores escritos a mano.
    const rojos = Array.from(dibujo.querySelectorAll('[style]')).filter((el) => (el as SVGElement).style.stroke === 'var(--color-grabando)')
    expect(rojos.length).toBe(5)
    expect(dibujo.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(/)
    expect(vacio.textContent).toContain(textos.videosVacioTitulo)
    expect(vacio.textContent).toContain(textos.videosVacioLinea)
  }

  test('T76-9 Sin videos: el dibujo, el titulo y la linea, en espanol y en ingles, a traves de la app', async () => {
    await portada(muchos(2))
    revisarVacio(es)
    expect(es.videosVacioTitulo).toBe('Aún no tienes videos')
    expect(es.videosVacioLinea).toBe('Abre un guion y toca Grabar. Tus tomas aparecerán aquí.')
    act(() => fijarIdioma('en'))
    revisarVacio(en)
    expect(en.videosVacioTitulo).toBe('No videos yet')
    expect(en.videosVacioLinea).toBe('Open a script and tap Record. Your takes will show up here.')
    act(() => fijarIdioma('es'))
  })

  test('T76-10 Con videos: la tira, sin el bloque vacio', async () => {
    const t1 = toma('t-1', 'g-1', 5000)
    render(<TiraGrabaciones grabaciones={[t1]} onAbrir={() => {}} onBorrar={() => {}} />)
    expect(screen.getByTestId('tarjeta-grabacion-t-1')).not.toBeNull()
    expect(screen.queryByTestId('videos-vacio')).toBeNull()
  })
})

describe('Tarea 76 - las tomas del guion abierto', () => {
  beforeEach(() => {
    localStorage.clear()
    tomasSembradas.length = 0
    resetearPrimerMontajeBiblioteca()
  })

  async function abrirGuion(id: string) {
    await act(async () => {
      fireEvent.click(screen.getByTestId(`fila-guion-${id}`))
      await new Promise((r) => setTimeout(r, 100))
    })
  }

  test('T76-11 Un guion sin tomas no tiene banda: ni titulo ni hueco', async () => {
    tomasSembradas.push(toma('t-otro', 'g-2', 5000))
    await portada([guion(1), guion(2)])
    await abrirGuion('g-1')
    expect(screen.getByTestId('btn-leer-guion-fijo')).not.toBeNull()
    expect(screen.queryByTestId('banda-tomas')).toBeNull()
    expect(document.body.textContent).not.toContain('Tomas ·')
  })

  test('T76-12 Con 2 tomas del guion y 1 de otro: la banda muestra 2, de la mas nueva a la mas vieja, y tocar una abre esa toma', async () => {
    tomasSembradas.push(toma('t-vieja', 'g-1', 1000), toma('t-otro', 'g-2', 3000), toma('t-nueva', 'g-1', 2000))
    await portada([guion(1), guion(2)])
    await abrirGuion('g-1')
    const banda = screen.getByTestId('banda-tomas')
    expect(within(banda).getByText('Tomas · 2')).not.toBeNull()
    const miniaturas = within(banda).getAllByTestId(/^toma-banda-/).map((el) => el.getAttribute('data-testid'))
    expect(miniaturas).toEqual(['toma-banda-t-nueva', 'toma-banda-t-vieja'])
    // La duracion, como en la tira; sin titulo ni fecha.
    expect(within(banda).getAllByText('0:42').length).toBe(2)
    expect(banda.textContent).not.toContain('Titulo de g-1')
    // La banda va en el mismo contenedor fijo que Leer y Grabar, encima de ellos.
    const leer = screen.getByTestId('btn-leer-guion-fijo')
    expect(leer.parentElement!.contains(banda)).toBe(true)
    expect(banda.compareDocumentPosition(leer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByTestId('toma-banda-t-vieja'))
    })
    const video = within(screen.getByTestId('reproductor-grabacion')).getByTestId('video-grabacion') as HTMLVideoElement
    expect(video.getAttribute('src')).toContain('t-vieja.mp4')
  })

  test('T76-13 Tocar una miniatura llama a onAbrirToma con esa toma; las marcas "incompleta" y "sin audio" se conservan', () => {
    const a = toma('t-a', 'g-1', 2000, { incompleta: true, errorMudo: true })
    const b = toma('t-b', 'g-1', 1000)
    const onAbrirToma = vi.fn()
    render(
      <EditorView
        guion={guion(1)}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
        tomas={[a, b]}
        onAbrirToma={onAbrirToma}
      />
    )
    fireEvent.click(screen.getByTestId('toma-banda-t-b'))
    expect(onAbrirToma).toHaveBeenCalledTimes(1)
    expect(onAbrirToma).toHaveBeenCalledWith(b)
    const conMarcas = screen.getByTestId('toma-banda-t-a')
    expect(within(conMarcas).getByTestId('marca-incompleta-banda-t-a').textContent).toBe(es.incompleta)
    expect(conMarcas.textContent).toContain(es.sinAudio)
    expect(screen.getByTestId('toma-banda-t-b').textContent).not.toContain(es.incompleta)
    // Sin menu de borrar: mantener apretado no abre nada.
    // 28-09-2026: el menu de borrar ahora es un tacho; se busca por su nombre.
    expect(screen.queryByLabelText(es.borrar)).toBeNull()
  })

  test('T76-14 Con el foco en el texto del guion la banda no se ve; al perder el foco vuelve. Con el titulo, igual', async () => {
    tomasSembradas.push(toma('t-1', 'g-1', 1000))
    await portada([guion(1)])
    await abrirGuion('g-1')
    expect(screen.getByTestId('banda-tomas')).not.toBeNull()

    // Se enfoca el elemento, como lo hace el dedo: el focus() de Tiptap espera un cuadro de
    // animacion para hacer lo mismo.
    const texto = screen.getByTestId('editor-guion') as HTMLElement
    act(() => texto.focus())
    expect(document.activeElement).toBe(texto)
    expect(screen.queryByTestId('banda-tomas'), 'escribiendo en el texto').toBeNull()
    // Leer y Grabar siguen como estan.
    expect(screen.getByTestId('btn-leer-guion-fijo')).not.toBeNull()
    act(() => texto.blur())
    expect(screen.getByTestId('banda-tomas')).not.toBeNull()

    const titulo = screen.getByTestId('input-titulo-guion')
    fireEvent.focus(titulo)
    expect(screen.queryByTestId('banda-tomas'), 'escribiendo el titulo').toBeNull()
    fireEvent.blur(titulo)
    expect(screen.getByTestId('banda-tomas')).not.toBeNull()
  })

  test('T76-15 Con banda, el relleno de abajo crece lo que mide la banda -tambien mientras se escribe, para que nada salte-, y escondida baja entera', async () => {
    const base = { guion: guion(1), onChangeGuion: () => {}, onVolverBiblioteca: () => {}, onEntrarLectura: () => {} }
    const sin = render(<EditorView {...base} tomas={[]} onAbrirToma={() => {}} />)
    const raizSin = sin.container.firstElementChild as HTMLElement
    expect(raizSin.style.padding).not.toContain('alto-banda-tomas')
    sin.unmount()

    const con = render(<EditorView {...base} tomas={[toma('t-1', 'g-1', 1000)]} onAbrirToma={() => {}} />)
    const raiz = con.container.firstElementChild as HTMLElement
    expect(raiz.style.padding).toContain('var(--alto-banda-tomas)')
    const texto = screen.getByTestId('editor-guion') as HTMLElement
    act(() => texto.focus())
    expect(screen.queryByTestId('banda-tomas')).toBeNull()
    expect(raiz.style.padding).toContain('var(--alto-banda-tomas)')
    act(() => texto.blur())
    const contenedor = screen.getByTestId('btn-leer-guion-fijo').parentElement as HTMLElement
    fireEvent.scroll(window, { target: { scrollY: 100 } })
    expect(contenedor.style.transform).toBe('translateY(calc(120px + var(--alto-banda-tomas) + var(--aire-3)))')
    fireEvent.scroll(window, { target: { scrollY: 40 } })
    expect(contenedor.style.transform).toBe('translateY(0)')
  })

  test('T76-16 El reproductor se abre sobre el editor; al cerrarlo el editor esta como estaba, y al borrar la ultima toma la banda se va sola', async () => {
    tomasSembradas.push(toma('t-unica', 'g-1', 1000))
    await portada([guion(1)])
    await abrirGuion('g-1')
    const textoAntes = textoDelGuion()
    await act(async () => {
      fireEvent.click(screen.getByTestId('toma-banda-t-unica'))
    })
    expect(screen.getByTestId('reproductor-grabacion')).not.toBeNull()
    // El editor sigue montado debajo.
    expect(screen.getByTestId('editor-guion')).not.toBeNull()
    await act(async () => {
      // 28-09-2026: Cerrar es la X de la esquina del video; se busca por su nombre.
      fireEvent.click(within(screen.getByTestId('reproductor-grabacion')).getByLabelText(es.cerrar))
    })
    expect(screen.queryByTestId('reproductor-grabacion')).toBeNull()
    expect(textoDelGuion()).toBe(textoAntes)
    expect(screen.getByTestId('banda-tomas')).not.toBeNull()

    // Borrar desde el reproductor: pregunta y borra.
    await act(async () => {
      fireEvent.click(screen.getByTestId('toma-banda-t-unica'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('borrar-desde-reproductor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('borrar-desde-reproductor'))
      await new Promise((r) => setTimeout(r, 50))
    })
    await waitFor(() => expect(screen.queryByTestId('reproductor-grabacion')).toBeNull())
    expect(screen.queryByTestId('banda-tomas')).toBeNull()
    expect(screen.getByTestId('editor-guion')).not.toBeNull()
  })

  test('T76-17 BandaTomas no escribe a mano ni un color, ni un tamano de letra, ni un espaciado, ni un radio -la vara de T209-', () => {
    const fuente = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BandaTomas.tsx'), 'utf8')
    expect(fuente).not.toMatch(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/)
    expect(fuente).not.toMatch(/rgba?\(/)
    expect(fuente).not.toMatch(/(?:fontSize|borderRadius|padding\w*|margin\w*|\bgap)\s*:\s*[0-9]/)
  })
})
