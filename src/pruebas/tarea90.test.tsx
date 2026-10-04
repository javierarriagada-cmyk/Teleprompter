// TAREA 90 -04-10-2026-: EL VISOR DE LADO, SEGÚN EL BOCETO APROBADO.
//
// El boceto es el de la tarea 89 -PR #67, rama tarea89-tres-defectos, docs/pantallas/tarea89/
// medidas-implementacion.md, cuarta versión- con el ajuste de Javier: el botón y el avance de la barra de
// reproducción en 48, la barra en 52. Es el PISO. Estas pruebas fijan:
//   - la detección del caso -videoWidth > videoHeight al cargar; antes, la miniatura; sin nada, caso 2-;
//   - las medidas de cada caso en 915x411 y 800x360, en los dos giros;
//   - los toques de 48 y los rótulos de 12;
//   - que el visor de lado es siempre oscuro;
//   - SystemBars al abrir, al cerrar y al girar;
//   - el registro 'visor-lado';
//   - y, como guardianas, que de pie el visor queda igual que hoy.
// Los módulos nuevos se cargan con import() dentro de cada prueba, para que contra main -donde no existen-
// cada prueba falle por su nombre y no el archivo entero.
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, cleanup } from '@testing-library/react'

const barras = vi.hoisted(() => ({
  hide: vi.fn(async (_o?: any) => {}),
  show: vi.fn(async (_o?: any) => {}),
  setStyle: vi.fn(async (_o?: any) => {})
}))
const escritos = vi.hoisted(() => [] as Array<{ ruta: string; contenido: string }>)
// Con registro del motor hay subtítulos y la columna lleva la fila de Subtítulos.
const registro = vi.hoisted(() => ({ texto: null as string | null }))
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, isNativePlatform: () => true, convertFileSrc: (r: string) => r, getPlatform: () => 'android' },
    SystemBars: barras
  }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async (ruta: string) => {
      if (ruta.endsWith('.json')) return JSON.stringify({ id: 't90', calidad: '1080p' })
      if (ruta.endsWith('.motor.txt') && registro.texto) return registro.texto
      throw new Error('no existe ' + ruta)
    },
    escribirTexto: async (ruta: string, contenido: string) => { escritos.push({ ruta, contenido }) }
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva } from '../datos/modelo'
import { activarDiagnostico, comoTexto } from '../lib/diagnostico'

const RAIZ = path.join(__dirname, '..')
const fuente = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8')
const cargar = (rel: string): Promise<any> => import(/* @vite-ignore */ rel)

// EL TELÉFONO DE LADO EN JSDOM: matchMedia que responde la consulta de useLayout, el tamaño de la ventana y
// los bordes como los escribe Capacitor ---safe-area-inset-*; jsdom no entiende env()-.
let deLado = false
const oyentes = new Set<() => void>()
function ponerVentana(ancho: number, alto: number, giro: 90 | 270, lado = true) {
  deLado = lado
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: ancho })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: alto })
  const s = document.documentElement.style
  s.setProperty('--safe-area-inset-top', '0px')
  s.setProperty('--safe-area-inset-bottom', '0px')
  s.setProperty('--safe-area-inset-left', lado ? (giro === 90 ? '44px' : '48px') : '0px')
  s.setProperty('--safe-area-inset-right', lado ? (giro === 90 ? '48px' : '44px') : '0px')
  ;(window as any).matchMedia = (q: string) => ({
    get matches() { return q.includes('max-height: 479.98px') ? deLado : false },
    media: q,
    addEventListener: (_: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_: string, f: () => void) => oyentes.delete(f)
  })
}
function girarDePie() {
  deLado = false
  oyentes.forEach((f) => f())
}
function girarDeLado() {
  deLado = true
  oyentes.forEach((f) => f())
}
// El video de jsdom no tiene imagen: se le da la forma que diría el archivo.
function cargarVideo(ancho: number, alto: number) {
  const v = document.querySelector('video') as HTMLVideoElement
  Object.defineProperty(v, 'videoWidth', { configurable: true, value: ancho })
  Object.defineProperty(v, 'videoHeight', { configurable: true, value: alto })
  fireEvent(v, new Event('loadedmetadata'))
}
const esperar = (ms = 20) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })
const toma = (extra: any = {}) => ({ ...grabacionNueva({ id: 't90', tituloGuion: 'Larralde', duracionMs: 252000, ruta: '/grabaciones/t90.mp4' }), ...extra })
async function abrir(extra: any = {}, props: any = {}) {
  const r = render(<ReproductorGrabacion grabacion={toma(extra)} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} {...props} />)
  await esperar()
  return r
}
const raiz = () => document.querySelector('[data-testid="reproductor-grabacion"]') as HTMLElement
const px = (v: string) => parseFloat(v)

const ImagenOriginal = (globalThis as any).Image
beforeEach(() => {
  barras.hide.mockClear()
  barras.show.mockClear()
  barras.setStyle.mockClear()
  escritos.length = 0
  oyentes.clear()
  document.documentElement.setAttribute('data-tema', 'claro')
})
afterEach(() => {
  cleanup()
  ;(globalThis as any).Image = ImagenOriginal
  document.documentElement.removeAttribute('data-tema')
})

describe('Tarea 90: cuál de los dos casos -la forma del video-', () => {
  test('una toma 16:9 de lado sale en el caso 1 -videoWidth > videoHeight al cargar-', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    expect(raiz().getAttribute('data-visor')).toBe('lado')
    expect(raiz().getAttribute('data-caso')).toBe('1')
  })

  test('una toma 9:16 de lado sale en el caso 2', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1080, 1920)
    await esperar()
    expect(raiz().getAttribute('data-caso')).toBe('2')
  })

  test('antes de que cargue el video decide la miniatura', async () => {
    ;(globalThis as any).Image = class {
      naturalWidth = 0
      naturalHeight = 0
      onload: null | (() => void) = null
      onerror: null | (() => void) = null
      set src(_: string) { this.naturalWidth = 1280; this.naturalHeight = 720; setTimeout(() => this.onload?.(), 0) }
    }
    ponerVentana(915, 411, 90)
    await abrir({ rutaMiniatura: '/grabaciones/t90.jpg' })
    expect(raiz().getAttribute('data-caso')).toBe('1')
  })

  test('el video manda sobre la miniatura', async () => {
    ;(globalThis as any).Image = class {
      naturalWidth = 0
      naturalHeight = 0
      onload: null | (() => void) = null
      set src(_: string) { this.naturalWidth = 1280; this.naturalHeight = 720; setTimeout(() => this.onload?.(), 0) }
    }
    ponerVentana(915, 411, 90)
    await abrir({ rutaMiniatura: '/grabaciones/t90.jpg' })
    cargarVideo(1080, 1920)
    await esperar()
    expect(raiz().getAttribute('data-caso')).toBe('2')
  })

  test('sin miniatura y sin video cargado, el caso 2', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    expect(raiz().getAttribute('data-caso')).toBe('2')
  })

  test('la forma: ancho mayor que alto es horizontal; un cuadrado o sin datos, no es horizontal', async () => {
    const { formaDeVideo } = await cargar('../lib/visorDeLado')
    expect(formaDeVideo(1920, 1080)).toBe('horizontal')
    expect(formaDeVideo(1080, 1920)).toBe('vertical')
    expect(formaDeVideo(1080, 1080)).toBe('vertical')
    expect(formaDeVideo(0, 0)).toBe(null)
  })
})

// Las medidas del boceto con la barra de 52 -tolerancia de 1 dp por el redondeo-.
// -04-10-2026, (4)- Javier lo vio en su moto: la columna era demasiado ancha. Pasa al 70% de lo que era
// -185 → 130 a 915, 160 → 112 a 800- y el video, de la misma altura en 16:9, queda centrado en lo que
// sobra entre el borde seguro y la columna. Antes: video en x 44/48 y columna de 185 en 682/686 a 915;
// video en 44/48 y columna de 160 en 592/596 a 800.
const CASO1: Record<string, { video: [number, number, number, number]; columna: [number, number] }> = {
  '915x411-90': { video: [72, 0, 638, 359], columna: [737, 130] },
  '915x411-270': { video: [76, 0, 638, 359], columna: [741, 130] },
  '800x360-90': { video: [68, 0, 548, 308], columna: [640, 112] },
  '800x360-270': { video: [72, 0, 548, 308], columna: [644, 112] }
}
const CASO2: Record<string, { video: [number, number]; tarjeta: number; margen: number }> = {
  '915x411-90': { video: [172, 231], tarjeta: 419, margen: 128 },
  '915x411-270': { video: [176, 231], tarjeta: 423, margen: 128 },
  '800x360-90': { video: [129, 203], tarjeta: 348, margen: 85 },
  '800x360-270': { video: [133, 203], tarjeta: 352, margen: 85 }
}
const cerca = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1)

describe('Tarea 90: las medidas de cada caso -915x411 y 800x360, giro 90 y 270-', () => {
  for (const [w, h] of [[915, 411], [800, 360]]) for (const giro of [90, 270] as const) {
    const k = `${w}x${h}-${giro}`
    test(`caso 1 ${k}: video ${CASO1[k].video[2]}x${CASO1[k].video[3]}, barra de 52 debajo, columna de ${CASO1[k].columna[1]}`, async () => {
      ponerVentana(w, h, giro)
      await abrir()
      cargarVideo(1920, 1080)
      await esperar()
      const v = document.querySelector('[data-testid="visor-lado-video"]') as HTMLElement
      const b = document.querySelector('[data-testid="visor-lado-barra"]') as HTMLElement
      const c = document.querySelector('[data-testid="visor-lado-columna"]') as HTMLElement
      const [x, y, an, al] = CASO1[k].video
      cerca(px(v.style.left), x); cerca(px(v.style.top), y); cerca(px(v.style.width), an); cerca(px(v.style.height), al)
      cerca(px(b.style.left), x); cerca(px(b.style.top), y + al); cerca(px(b.style.width), an); cerca(px(b.style.height), 52)
      cerca(px(c.style.left), CASO1[k].columna[0]); cerca(px(c.style.width), CASO1[k].columna[1]); cerca(px(c.style.height), h)
      expect(px(c.style.width)).toBeGreaterThanOrEqual(112)
    })
    test(`caso 2 ${k}: video de ${CASO2[k].video[1]} a todo el alto, tarjeta de 320, ${CASO2[k].margen} a cada lado`, async () => {
      ponerVentana(w, h, giro)
      await abrir()
      cargarVideo(1080, 1920)
      await esperar()
      const v = document.querySelector('[data-testid="visor-lado-video"]') as HTMLElement
      const t = (document.querySelector('[data-testid="visor-lado-tarjeta"]') as HTMLElement).parentElement as HTMLElement
      cerca(px(v.style.left), CASO2[k].video[0]); cerca(px(v.style.width), CASO2[k].video[1]); cerca(px(v.style.height), h)
      cerca(px(t.style.left), CASO2[k].tarjeta); cerca(px(t.style.width), 320)
      expect(raiz().style.background).toContain('--bg-suelo')
    })
  }

  for (const [w, h, giro] of [[915, 411, 90], [915, 411, 270], [800, 360, 90], [800, 360, 270]] as const) {
    test(`caso 1 ${w}x${h}-${giro}: el video queda centrado entre el borde seguro y la columna, con franjas oscuras a los dos lados`, async () => {
      ponerVentana(w, h, giro)
      await abrir()
      cargarVideo(1920, 1080)
      await esperar()
      const izq = giro === 90 ? 44 : 48
      const v = document.querySelector('[data-testid="visor-lado-video"]') as HTMLElement
      const c = document.querySelector('[data-testid="visor-lado-columna"]') as HTMLElement
      const antes = px(v.style.left) - izq
      const despues = px(c.style.left) - (px(v.style.left) + px(v.style.width))
      expect(antes).toBeGreaterThan(0)
      cerca(antes, despues)
      const fi = document.querySelector('[data-testid="visor-lado-franja"]') as HTMLElement
      const fd = document.querySelector('[data-testid="visor-lado-franja-derecha"]') as HTMLElement
      expect(fi).toBeTruthy()
      expect(fd).toBeTruthy()
      cerca(px(fi.style.width), px(v.style.left))
      cerca(px(fd.style.left), px(v.style.left) + px(v.style.width))
      cerca(px(fd.style.width), despues)
      for (const f of [fi, fd]) expect(f.style.background).toMatch(/#000|rgb\(0, 0, 0\)/)
    })
  }

  test('las cuentas: la columna es el 70% de lo que deja el video -130 a 915, 112 a 800-', async () => {
    const { medidasVisorDeLado, FRACCION_COLUMNA } = await cargar('../lib/visorDeLado')
    expect(FRACCION_COLUMNA).toBe(0.7)
    const a = medidasVisorDeLado({ ancho: 915, alto: 411, bordes: { arriba: 0, derecha: 48, abajo: 0, izquierda: 44 }, forma: 'horizontal' })
    expect(a.columna.ancho).toBe(130)
    expect(a.ajustado).toBe(false)
    const b = medidasVisorDeLado({ ancho: 800, alto: 360, bordes: { arriba: 0, derecha: 44, abajo: 0, izquierda: 48 }, forma: 'horizontal' })
    expect(b.columna.ancho).toBe(112)
    expect(b.ajustado).toBe(false)
  })

  test('las cuentas: la columna nunca baja de 112 -si falta, se achica el video en 16:9-', async () => {
    const { medidasVisorDeLado } = await cargar('../lib/visorDeLado')
    const m = medidasVisorDeLado({ ancho: 700, alto: 470, bordes: { arriba: 0, derecha: 48, abajo: 0, izquierda: 44 }, forma: 'horizontal' })
    expect(m.columna.ancho).toBe(112)
    expect(m.ajustado).toBe(true)
    cerca(m.video.ancho / m.video.alto, 16 / 9)
  })

  test('sin registro del motor no hay Subtítulos -como hoy-: tres filas', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    expect(document.querySelector('[data-testid="visor-lado-subtitulos"]')).toBeNull()
    expect(document.querySelectorAll('[data-fila-accion]').length).toBe(3)
  })

  test('Subtítulos abierto: el panel de las cuatro opciones sale desde la fila de la columna', async () => {
    registro.texto = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    registro.texto = null
    const filas = Array.from(document.querySelectorAll('[data-fila-accion]')).map((f) => f.getAttribute('data-testid'))
    expect(filas).toEqual(['guardar-galeria-desde-reproductor', 'visor-lado-subtitulos', 'btn-repetir-toma', 'borrar-desde-reproductor'])
    fireEvent.click(document.querySelector('[data-testid="btn-subtitulos"]')!)
    const op = document.querySelector('[data-testid="opciones-subtitulos"]')!
    expect(op.closest('[data-testid="visor-lado-subtitulos"]')).toBeTruthy()
    expect(op.querySelectorAll('button').length).toBe(4)
    // El rótulo del estilo elegido en 12, heredado de la fila.
    expect(px((document.querySelector('[data-testid="visor-lado-subtitulos"]') as HTMLElement).style.fontSize)).toBeGreaterThanOrEqual(12)
    const css = fuente('styles-visor-de-lado.css')
    const i = css.indexOf('.visor-lado-subtitulos .opciones-subtitulos {')
    expect(i).toBeGreaterThan(-1)
    const bloque = css.slice(i, css.indexOf('}', i))
    expect(bloque).toContain('right: calc(100% + 8px)')
    expect(bloque).toContain('width: 320px')
  })

  test('caso 1: tocar la franja del recorte no cierra el visor; en el caso 2, tocar el fondo sí', async () => {
    ponerVentana(915, 411, 90)
    const onCerrar = vi.fn()
    await abrir({}, { onCerrar })
    cargarVideo(1920, 1080)
    await esperar()
    fireEvent.click(document.querySelector('[data-testid="visor-lado-franja"]')!)
    expect(onCerrar).not.toHaveBeenCalled()
    cargarVideo(1080, 1920)
    await esperar()
    fireEvent.click(raiz())
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  test('la toma guardada: Compartir y Borrar, una fila cada uno', async () => {
    ponerVentana(915, 411, 90)
    await abrir({ galeriaUri: 'content://media/1' })
    cargarVideo(1920, 1080)
    await esperar()
    const filas = Array.from(document.querySelectorAll('[data-fila-accion]')).map((f) => f.getAttribute('data-testid'))
    expect(filas).toEqual(['btn-compartir-toma', 'borrar-desde-reproductor'])
  })
})

describe('Tarea 90: toques de 48 y rótulos de 12', () => {
  test('la X, el botón y el avance de la barra miden 48; la barra, 52', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    const x = document.querySelector('[data-testid="btn-cerrar-reproductor"]') as HTMLElement
    expect(px(x.style.width)).toBeGreaterThanOrEqual(48)
    expect(px(x.style.height)).toBeGreaterThanOrEqual(48)
    const b = document.querySelector('[data-testid="btn-reproducir-toma"]') as HTMLElement
    expect(px(b.style.width)).toBeGreaterThanOrEqual(48)
    expect(px(b.style.height)).toBeGreaterThanOrEqual(48)
    const a = document.querySelector('[data-testid="avance-toma"]') as HTMLElement
    expect(px(a.style.height)).toBeGreaterThanOrEqual(48)
    const barra = document.querySelector('[data-testid="visor-lado-barra"]') as HTMLElement
    expect(px(barra.style.height)).toBe(52)
  })

  test('cada fila de la columna tiene 48 de toque como mínimo y el rótulo en 12', async () => {
    ponerVentana(800, 360, 270)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    const filas = Array.from(document.querySelectorAll<HTMLElement>('[data-fila-accion]'))
    expect(filas.length).toBeGreaterThanOrEqual(3)
    for (const f of filas) expect(px(f.style.minHeight)).toBeGreaterThanOrEqual(48)
    const guardar = document.querySelector<HTMLElement>('[data-rotulo="guardar"]')!
    expect(px(guardar.style.fontSize)).toBeGreaterThanOrEqual(12)
  })

  test('en la tarjeta del caso 2 también: X, barra y acciones de 48, rótulo de 12', async () => {
    ponerVentana(800, 360, 90)
    await abrir()
    cargarVideo(1080, 1920)
    await esperar()
    expect(px((document.querySelector('[data-testid="btn-cerrar-reproductor"]') as HTMLElement).style.width)).toBeGreaterThanOrEqual(48)
    expect(px((document.querySelector('[data-testid="btn-reproducir-toma"]') as HTMLElement).style.height)).toBeGreaterThanOrEqual(48)
    for (const a of Array.from(document.querySelectorAll<HTMLElement>('.visor-lado-tarjeta .accion-toma'))) expect(px(a.style.minHeight)).toBeGreaterThanOrEqual(48)
    expect(px(document.querySelector<HTMLElement>('[data-rotulo="guardar"]')!.style.fontSize)).toBeGreaterThanOrEqual(12)
    expect(fuente('styles-visor-de-lado.css')).toMatch(/\.visor-lado-tarjeta button\.boton-subtitulos \{\s*min-height: 48px;/)
  })
})

describe('Tarea 90: el visor de lado es siempre oscuro', () => {
  test('con la app en claro, la raíz del visor de lado lleva data-tema="oscuro"', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro')
    expect(raiz().getAttribute('data-tema')).toBe('oscuro')
  })

  test('el bloque oscuro de styles.css vale en cualquier elemento, no solo en :root', () => {
    // \r?\n -04-10-2026, Claude-: en Windows git deja styles.css con saltos \r\n y la prueba fallaba
    // ahí sin que la app tuviera nada; en Linux pasaba.
    expect(fuente('styles.css')).toMatch(/^\[data-tema="oscuro"\] \{\r?\n\s*--bg-suelo: #151312;/m)
  })
})

describe('Tarea 90: SystemBars al abrir, al cerrar y al girar', () => {
  test('al abrir de lado: hide de la barra de estado y estilo oscuro', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    expect(barras.hide).toHaveBeenCalledWith({ bar: 'StatusBar' })
    expect(barras.setStyle).toHaveBeenLastCalledWith({ style: 'DARK' })
  })

  test('al cerrar: show de la barra de estado y el estilo de la app -claro-', async () => {
    const { fijarEstiloDeLaApp } = await cargar('../lib/barrasDelSistema')
    fijarEstiloDeLaApp(false)
    ponerVentana(915, 411, 90)
    const r = await abrir()
    barras.setStyle.mockClear()
    r.unmount()
    expect(barras.show).toHaveBeenCalledWith({ bar: 'StatusBar' })
    expect(barras.setStyle).toHaveBeenLastCalledWith({ style: 'LIGHT' })
  })

  test('al volver de pie con el visor abierto: show; al volver de lado: hide otra vez', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    expect(barras.hide).toHaveBeenCalledTimes(1)
    await act(async () => { girarDePie() })
    await esperar()
    expect(barras.show).toHaveBeenCalledWith({ bar: 'StatusBar' })
    expect(raiz().getAttribute('data-visor')).toBeNull()
    await act(async () => { girarDeLado() })
    await esperar()
    expect(barras.hide).toHaveBeenCalledTimes(2)
  })

  test('mientras el visor de lado tiene las barras, el estilo que pide la app espera', async () => {
    const { fijarEstiloDeLaApp } = await cargar('../lib/barrasDelSistema')
    ponerVentana(915, 411, 90)
    const r = await abrir()
    barras.setStyle.mockClear()
    fijarEstiloDeLaApp(false)
    expect(barras.setStyle).not.toHaveBeenCalled()
    r.unmount()
    expect(barras.setStyle).toHaveBeenLastCalledWith({ style: 'LIGHT' })
  })

  test('App ya no llama a SystemBars directo: pasa por barrasDelSistema', () => {
    const app = fuente('App.tsx')
    expect(app).toContain('fijarEstiloDeLaApp(oscuro)')
    expect(app).not.toMatch(/SystemBars\.setStyle\(\{/)
  })
})

describe("Tarea 90: el registro 'visor-lado' para el moto g86", () => {
  test('(a)(b)(d) los bordes, el giro y los ms desde el hide, también cuando cambian sin cambiar el tamaño', async () => {
    activarDiagnostico(true)
    Object.defineProperty(screen, 'orientation', { configurable: true, value: { angle: 270, type: 'landscape-secondary', addEventListener() {}, removeEventListener() {} } })
    ponerVentana(915, 411, 270)
    await abrir()
    // Deslizar desde arriba: la barra de estado aparece y Capacitor reescribe el borde de arriba.
    await act(async () => { document.documentElement.style.setProperty('--safe-area-inset-top', '24px') })
    await esperar(30)
    const texto = comoTexto()
    activarDiagnostico(false)
    expect(texto).toMatch(/visor-lado\tbordes motivo=apertura giro=270 tipo=landscape-secondary fuente=capacitor l=48 r=44 t=0 b=0/)
    expect(texto).toMatch(/visor-lado\tbordes motivo=capacitor .* t=24 .*msDesdeHide=\d+/)
    expect(texto).toMatch(/viewport=915x411 visual=\S+ dpr=\d/)
    expect(texto).toMatch(/visor-lado\tbarras accion=hide bar=StatusBar estilo=Dark/)
  })

  test('(c) videoWidth, videoHeight, la miniatura y la rotación del sidecar', async () => {
    activarDiagnostico(true)
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    const texto = comoTexto()
    activarDiagnostico(false)
    expect(texto).toMatch(/visor-lado\tvideo toma=t90 videoWidth=1920 videoHeight=1080 forma=horizontal usada=horizontal miniatura=sin-miniatura rotacionSidecar=sin-campo calidad=1080p/)
  })

  test('(e) la letra: el tamaño calculado de los rótulos y si alguna fila baja de 48', async () => {
    activarDiagnostico(true)
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar(40)
    const texto = comoTexto()
    activarDiagnostico(false)
    expect(texto).toMatch(/visor-lado\tletra rotulos=guardar:12 escala=1 filas=[\d,]+ bajo48=(si|no)/)
  })

  test('al cerrar el visor de lado, el registro queda en visor-lado.txt junto a las tomas', async () => {
    ponerVentana(915, 411, 90)
    const r = await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    r.unmount()
    await esperar()
    const archivo = escritos.find((e) => e.ruta.endsWith('/visor-lado.txt'))
    expect(archivo).toBeTruthy()
    expect(archivo!.contenido).toMatch(/\tvisor-lado\tabrir toma=t90/)
    expect(archivo!.contenido).toMatch(/\tvisor-lado\tbarras accion=show bar=StatusBar/)
    expect(archivo!.contenido).toMatch(/\tvisor-lado\tcerrar toma=t90/)
  })
})

// GUARDIANAS: de pie el visor queda como hoy -main c03d734-. Pasan hoy y tienen que seguir pasando.
describe('Tarea 90, guardianas: de pie no cambia nada', () => {
  test('de pie: la tarjeta de siempre, sin disposición de lado, sin data-tema propio', async () => {
    ponerVentana(412, 915, 90, false)
    await abrir()
    cargarVideo(1920, 1080)
    await esperar()
    const r = raiz()
    expect(r.getAttribute('data-visor')).toBeNull()
    expect(r.getAttribute('data-tema')).toBeNull()
    expect(r.style.background).toBe('rgb(17, 17, 17)')
    expect(r.style.overflowY).toBe('auto')
    const tarjeta = r.firstElementChild as HTMLElement
    expect(tarjeta.className).toBe('tarjeta-elevada')
    expect(tarjeta.style.width).toBe('min(720px, 100%)')
    expect(Array.from(tarjeta.children).map((c) => c.className)).toEqual(['visor-video', 'barra-visor', '', 'acciones-toma'])
    expect(document.querySelectorAll('[data-fila-accion]').length).toBe(0)
    expect((document.querySelector('[data-testid="btn-cerrar-reproductor"]') as HTMLElement).style.width).toBe('')
    expect((document.querySelector('[data-testid="btn-reproducir-toma"]') as HTMLElement).getAttribute('style')).toBeNull()
  })

  test('de pie no se tocan las barras del sistema', async () => {
    ponerVentana(412, 915, 90, false)
    const r = await abrir()
    r.unmount()
    expect(barras.hide).not.toHaveBeenCalled()
    expect(barras.show).not.toHaveBeenCalled()
  })

  test('de pie el video sigue con maxHeight 70vh y ancho completo, como hoy', async () => {
    ponerVentana(412, 915, 90, false)
    await abrir()
    const v = document.querySelector('video') as HTMLVideoElement
    expect(v.style.width).toBe('100%')
    expect(v.style.maxHeight).toBe('70vh')
  })
})

// GIRAR CON EL VIDEO ANDANDO -04-10-2026, pedido de Javier después del #68-: al girar, el visor cambia de
// disposición y el <video> es otro elemento. Si el de antes se estaba reproduciendo, el nuevo sigue
// reproduciéndose desde la misma posición; si estaba en pausa, sigue en pausa en la misma posición.
// jsdom no reproduce: play y pause se reemplazan por unos que mueven paused y disparan los eventos, como
// el navegador.
describe('Tarea 90: girar con el video del visor', () => {
  const play = vi.fn(function (this: HTMLVideoElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false })
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  const pause = vi.fn(function (this: HTMLVideoElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true })
    this.dispatchEvent(new Event('pause'))
  })
  let playAntes: any
  let pauseAntes: any
  beforeEach(() => {
    play.mockClear()
    pause.mockClear()
    playAntes = HTMLMediaElement.prototype.play
    pauseAntes = HTMLMediaElement.prototype.pause
    HTMLMediaElement.prototype.play = play as any
    HTMLMediaElement.prototype.pause = pause as any
  })
  afterEach(() => {
    HTMLMediaElement.prototype.play = playAntes
    HTMLMediaElement.prototype.pause = pauseAntes
  })
  // La posición: jsdom no avanza el video; se fija a mano en el elemento.
  const ponerTiempo = (v: HTMLVideoElement, t: number) => {
    let actual = t
    Object.defineProperty(v, 'currentTime', { configurable: true, get: () => actual, set: (n: number) => { actual = n } })
  }
  const elVideo = () => document.querySelector('video') as HTMLVideoElement

  test('reproduciéndose de pie, al girar de lado el video nuevo sigue reproduciéndose desde la misma posición', async () => {
    ponerVentana(915, 411, 90, false)
    await abrir()
    cargarVideo(1920, 1080)
    const antes = elVideo()
    await act(async () => { await antes.play() })
    ponerTiempo(antes, 12.5)
    play.mockClear()
    await act(async () => { girarDeLado() })
    await esperar()
    const nuevo = elVideo()
    expect(nuevo).not.toBe(antes)
    expect(raiz().getAttribute('data-visor')).toBe('lado')
    ponerTiempo(nuevo, 0)
    cargarVideo(1920, 1080)
    await esperar()
    expect(nuevo.currentTime).toBeCloseTo(12.5, 1)
    expect(play.mock.instances).toContain(nuevo)
    expect(nuevo.paused).toBe(false)
  })

  test('reproduciéndose de lado, al girar de pie el video nuevo sigue reproduciéndose desde la misma posición', async () => {
    ponerVentana(915, 411, 270)
    await abrir()
    cargarVideo(1080, 1920)
    const antes = elVideo()
    await act(async () => { await antes.play() })
    ponerTiempo(antes, 40)
    play.mockClear()
    await act(async () => { girarDePie() })
    await esperar()
    const nuevo = elVideo()
    expect(nuevo).not.toBe(antes)
    expect(raiz().getAttribute('data-visor')).toBeNull()
    ponerTiempo(nuevo, 0)
    cargarVideo(1080, 1920)
    await esperar()
    expect(nuevo.currentTime).toBeCloseTo(40, 1)
    expect(play.mock.instances).toContain(nuevo)
    expect(nuevo.paused).toBe(false)
  })

  // Guardiana: hoy ya queda en pausa; tiene que seguir así cuando el giro retome la reproducción.
  test('en pausa de lado, al girar de pie el video nuevo sigue en pausa en la misma posición', async () => {
    ponerVentana(915, 411, 90)
    await abrir()
    cargarVideo(1920, 1080)
    const antes = elVideo()
    await act(async () => { await antes.play() })
    await act(async () => { antes.pause() })
    ponerTiempo(antes, 7.25)
    play.mockClear()
    await act(async () => { girarDePie() })
    await esperar()
    const nuevo = elVideo()
    expect(nuevo).not.toBe(antes)
    ponerTiempo(nuevo, 0)
    cargarVideo(1920, 1080)
    await esperar()
    expect(nuevo.currentTime).toBeCloseTo(7.25, 1)
    expect(play).not.toHaveBeenCalled()
    expect(nuevo.paused).toBe(true)
  })

  test('si el navegador no deja reproducir solo, queda en pausa y lo anota el registro visor-lado', async () => {
    const { lineasVisorLado, limpiarRegistroVisorLado } = await cargar('../lib/registroVisorLado')
    limpiarRegistroVisorLado()
    ponerVentana(915, 411, 90, false)
    await abrir()
    cargarVideo(1920, 1080)
    const antes = elVideo()
    await act(async () => { await antes.play() })
    ponerTiempo(antes, 3)
    play.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('sin gesto'), { name: 'NotAllowedError' })))
    await act(async () => { girarDeLado() })
    await esperar()
    cargarVideo(1920, 1080)
    await esperar()
    const linea = lineasVisorLado().find((l: string) => l.includes('\tgiro-video '))
    expect(linea).toBeTruthy()
    expect(linea).toContain('estado=reproduciendo')
    expect(linea).toContain('resultado=bloqueado')
    expect(linea).toContain('error=NotAllowedError')
  })
})
