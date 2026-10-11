// TAREA 83 -30-09-2026-: la tableta, Leer y Grabar en vertical y de lado. Se finge matchMedia con
// un tamaño de ventana -ancho x alto- y se evalúan de verdad las consultas de useLayout.ts: así la
// prueba dice qué layout sale para cada tableta de la hoja -sección 1- y qué se dibuja en Leer y
// Grabar. Las pruebas de hoy no se tocan: en jsdom sin matchMedia useLayout sigue en 'tel-v'.
//
// jsdom no calcula estilos de hojas externas: las medidas -barra 72, dock 172, rieles 168, texto
// a 24 del borde al leer- se revisan en src/styles-tableta.css, que es donde viven -T209-.
import React from 'react'
import fs from 'fs'
import path from 'path'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 820, height: 1180, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 820, height: 1180, x: 0, y: 0 })
  }
}))

const CSS_TABLETA = fs.readFileSync(path.resolve(__dirname, '../styles-tableta.css'), 'utf8')
const matchMediaOriginal = window.matchMedia

// La ventana fingida y quienes escuchan sus consultas: girar es cambiar el tamaño y avisar.
let ventana = { ancho: 360, alto: 800 }
let oyentes: Array<() => void> = []

// Evalúa una consulta de las de useLayout -min/max-width, min/max-height y orientation- contra la
// ventana fingida. No es un motor de CSS: alcanza para las cuatro consultas de la hoja.
function cumple(query: string, { ancho, alto }: { ancho: number; alto: number }): boolean {
  return query.split(' and ').every((parte) => {
    const m = parte.trim().match(/^\(([a-z-]+):\s*([a-z0-9.]+?)(px)?\)$/)
    if (!m) return false
    const [, rasgo, valor] = m
    const n = parseFloat(valor)
    if (rasgo === 'min-width') return ancho >= n
    if (rasgo === 'max-width') return ancho <= n
    if (rasgo === 'min-height') return alto >= n
    if (rasgo === 'max-height') return alto <= n
    if (rasgo === 'orientation') return valor === (alto >= ancho ? 'portrait' : 'landscape')
    return false
  })
}

function fingirVentana(ancho: number, alto: number) {
  ventana = { ancho, alto }
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return cumple(query, ventana)
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_tipo: string, fn: () => void) => oyentes.push(fn)),
    removeEventListener: vi.fn((_tipo: string, fn: () => void) => {
      oyentes = oyentes.filter((o) => o !== fn)
    }),
    dispatchEvent: vi.fn()
  })) as any
}

// Girar la tableta en plena toma: cambia la ventana y avisan las consultas, como en el aparato.
function girar(ancho: number, alto: number) {
  ventana = { ancho, alto }
  act(() => {
    oyentes.forEach((o) => o())
  })
}

async function abrir(puerta: 'leer' | 'grabar', ajustes: Record<string, unknown> = {}) {
  localStorage.setItem('teleprompter_ajustes', JSON.stringify({ colorFondo: '#000000', colorLetra: '#FFFFFF', ...ajustes }))
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-83',
    titulo: 'Guion de tableta',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    archivado: false,
    bloques: [{ id: 'b1', nombre: '', texto: 'Texto para leer en la tableta, parada o de lado, con la cámara arriba' }]
  })
  const motor = new MotorFake()
  render(<App repoOverride={repo} motor={motor} />)
  fireEvent.click(await screen.findByTestId(puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'))
  await screen.findByTestId('btn-empezar-toma')
  return motor
}

async function empezar() {
  fireEvent.click(screen.getByTestId('btn-empezar-toma'))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 3100))
  })
}

async function mostrarControles() {
  fireEvent.click(screen.getByTestId('teleprompter-view-container'))
  await screen.findByTestId('btn-pausa-lectura')
}

const fichasEn = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('[data-testid^="ficha-"]'))
    .map((f) => f.getAttribute('data-testid'))
    .filter((id) => id !== 'ficha-mas')

// El cuerpo de la primera regla de styles-tableta.css cuyo selector es exactamente `selector`.
function regla(selector: string): string {
  const i = CSS_TABLETA.indexOf(selector + ' {')
  expect(i, `falta la regla ${selector} en styles-tableta.css`).toBeGreaterThanOrEqual(0)
  return CSS_TABLETA.slice(i, CSS_TABLETA.indexOf('}', i))
}

describe('Tarea 83 - La tableta: leer y grabar en vertical y de lado', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    oyentes = []
  })
  afterEach(() => {
    cleanup()
    window.matchMedia = matchMediaOriginal
  })

  test('T83a 820 x 1180 es tab-v. Leer LISTO: barra con ‹ y Más, dock con 3 fichas y Empezar de 72, sin velo.', async () => {
    fingirVentana(820, 1180)
    await abrir('leer')
    expect(document.querySelector('.layout-tab-v')).not.toBeNull()
    const barra = screen.getByTestId('tab-barra')
    const dock = screen.getByTestId('tab-dock')
    expect(within(barra).getByTestId('btn-volver-listo')).toBeTruthy()
    expect(within(barra).getByTestId('ficha-mas')).toBeTruthy()
    expect(screen.getAllByTestId('ficha-mas')).toHaveLength(1)
    expect(fichasEn(dock)).toEqual(['ficha-letra', 'ficha-anclaje', 'ficha-brillo'])
    dock.querySelectorAll('[data-testid^="ficha-"]').forEach((f) => expect(f.className).toContain('grande'))
    const empezarBtn = within(dock).getByTestId('btn-empezar-toma') as HTMLElement
    expect(empezarBtn.style.width).toBe('72px')
    expect(empezarBtn.style.height).toBe('72px')
    expect(screen.queryByTestId('velo-controles')).toBeNull()
    expect(screen.queryByTestId('riel-izquierdo')).toBeNull()
    // Las medidas de la hoja -sección 3-: barra 72 y dock 172, en la hoja de estilos.
    expect(CSS_TABLETA).toMatch(/--tab-barra:\s*72px;/)
    expect(CSS_TABLETA).toMatch(/--tab-dock:\s*172px;/)
    expect(regla('.tab-barra')).toContain('height: calc(var(--tab-barra) + env(safe-area-inset-top, 0px))')
    expect(regla('.tab-dock')).toContain('height: calc(var(--tab-dock) + env(safe-area-inset-bottom, 0px))')
  })

  // Antes (2026-10-05): test('T83b 820 x 1180, Grabar LISTO: las seis fichas en el dock, en orden, y Más en la barra.', async () => {
  test('T83b 820 x 1180, Grabar LISTO: las cuatro fichas y la flecha en el dock, en orden; sin Más en la barra.', async () => {
    fingirVentana(820, 1180)
    await abrir('grabar')
    const dock = screen.getByTestId('tab-dock')
    // Tarea 93, 05-10-2026: en Grabar la primera fila termina en la flecha; Calidad y Subtítulos
    // pasaron a la segunda fila, y Más ya no está en Grabar.
    // Antes (2026-10-05): expect(fichasEn(dock)).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-calidad', 'ficha-subtitulos'])
    // -ajustes de pantallas, 10-10-2026- El orden de las fichas pasa a Texto -letra, anclaje- y Cámara
    // -cámara, brillo-. Antes: expect(fichasEn(dock)).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-flecha'])
    expect(fichasEn(dock)).toEqual(['ficha-letra', 'ficha-anclaje', 'ficha-camara', 'ficha-brillo', 'ficha-flecha'])
    // Antes (2026-10-05): expect(within(screen.getByTestId('tab-barra')).getByTestId('ficha-mas')).toBeTruthy()
    expect(within(screen.getByTestId('tab-barra')).queryByTestId('ficha-mas')).toBeNull()
    expect(within(dock).queryByTestId('ficha-mas')).toBeNull()
    expect(screen.queryByTestId('velo-controles')).toBeNull()
  })

  test('T83c 820 x 1180, leyendo sin controles: no están la barra ni el dock y el renglón vivo va arriba, no a 72 del borde.', async () => {
    fingirVentana(820, 1180)
    await abrir('leer')
    await empezar()
    expect(screen.queryByTestId('tab-barra')).toBeNull()
    expect(screen.queryByTestId('tab-dock')).toBeNull()
    const vista = screen.getByTestId('teleprompter-view-container')
    expect(vista.getAttribute('data-tab-texto')).toBe('lectura')
    // Leyendo, el texto sube al aire de 24 -sin la barra de 72- y no reserva el dock.
    const lectura = regla('.layout-tab-v [data-tab-texto="lectura"]')
    expect(lectura).toContain('--tab-texto-arriba: var(--tab-aire-arriba-v);')
    expect(lectura).not.toContain('--tab-barra')
    expect(lectura).toContain('--tab-reserva-abajo: 0px;')
    expect(CSS_TABLETA).toMatch(/--tab-aire-arriba-v:\s*24px;/)
    // En LISTO, en cambio, el texto va debajo de la barra.
    expect(regla('.layout-tab-v [data-testid="teleprompter-view-container"]')).toContain(
      '--tab-texto-arriba: calc(var(--tab-barra) + var(--tab-aire-arriba-v));'
    )
  })

  test('T83d 820 x 1180, leyendo con controles: vuelven barra y dock; salir a la izquierda, parar en el dock; el texto sigue arriba.', async () => {
    fingirVentana(820, 1180)
    await abrir('leer')
    await empezar()
    await mostrarControles()
    const barra = screen.getByTestId('tab-barra')
    const dock = screen.getByTestId('tab-dock')
    expect(within(barra).getByTestId('btn-salir-lectura')).toBeTruthy()
    expect(within(dock).getByTestId('btn-parar-lectura')).toBeTruthy()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-tab-texto')).toBe('controles')
    expect(screen.queryByTestId('velo-controles')).toBeNull()
  })

  test('T83e Sin tamaño guardado la tableta lee a 32; con uno guardado se respeta.', async () => {
    fingirVentana(820, 1180)
    await abrir('leer')
    expect(screen.getByTestId('ficha-letra').textContent).toBe('Aa 32')
    cleanup()
    localStorage.clear()
    // Una elección previa -24, la del teléfono- no se pisa con el 32 de la tableta.
    await abrir('leer', { fontSize: 24 })
    expect(screen.getByTestId('ficha-letra').textContent).toBe('Aa 24')
  })

  // Antes (2026-10-05): test('T83f 1180 x 820 es tab-h: rieles de 168, fichas a la izquierda y Más a la derecha.', async () => {
  test('T83f 1180 x 820 es tab-h: rieles de 168, fichas y flecha a la izquierda; sin Más en Grabar.', async () => {
    fingirVentana(1180, 820)
    await abrir('grabar')
    expect(document.querySelector('.layout-tab-h')).not.toBeNull()
    const izq = screen.getByTestId('riel-izquierdo')
    const der = screen.getByTestId('riel-derecho')
    // Tarea 93, 05-10-2026: en Grabar la primera fila termina en la flecha; Calidad y Subtítulos
    // pasaron a la segunda fila, y Más ya no está en Grabar.
    // Antes (2026-10-05): expect(fichasEn(izq)).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-calidad', 'ficha-subtitulos'])
    // -ajustes de pantallas, 10-10-2026- El orden de las fichas pasa a Texto -letra, anclaje- y Cámara
    // -cámara, brillo-. Antes: expect(fichasEn(izq)).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-flecha'])
    expect(fichasEn(izq)).toEqual(['ficha-letra', 'ficha-anclaje', 'ficha-camara', 'ficha-brillo', 'ficha-flecha'])
    izq.querySelectorAll('[data-testid^="ficha-"]').forEach((f) => expect(f.className).toContain('grande ancha'))
    // Antes (2026-10-05): expect(within(der).getByTestId('ficha-mas')).toBeTruthy()
    expect(within(der).queryByTestId('ficha-mas')).toBeNull()
    expect(within(izq).queryByTestId('ficha-mas')).toBeNull()
    expect(within(der).getByTestId('btn-empezar-toma')).toBeTruthy()
    expect(screen.queryByTestId('velo-controles')).toBeNull()
    expect(screen.queryByTestId('tab-barra')).toBeNull()
    expect(CSS_TABLETA).toMatch(/--riel-izq-leer:\s*168px;/)
    expect(CSS_TABLETA).toMatch(/--riel-izq-grabar:\s*168px;/)
    expect(CSS_TABLETA).toMatch(/--riel-der:\s*168px;/)
  })

  test('T83g 1180 x 820, Leer: tres fichas en el riel izquierdo.', async () => {
    fingirVentana(1180, 820)
    await abrir('leer')
    expect(fichasEn(screen.getByTestId('riel-izquierdo'))).toEqual(['ficha-letra', 'ficha-anclaje', 'ficha-brillo'])
  })

  test.each([
    [820, 1180, 'tab-v'],
    [800, 1280, 'tab-v'],
    [1180, 820, 'tab-h'],
    [1280, 800, 'tab-h'],
    [800, 360, 'tel-h'],
    [844, 390, 'tel-h'],
    [700, 520, 'tel-h'],
    [360, 800, 'tel-v']
  ])('T83h %i x %i da %s', async (ancho, alto, esperado) => {
    fingirVentana(ancho, alto)
    await abrir('leer')
    const clase = esperado === 'tel-v' ? null : `.layout-${esperado}`
    if (clase) expect(document.querySelector(clase)).not.toBeNull()
    for (const otro of ['tel-h', 'tab-v', 'tab-h']) {
      if (otro !== esperado) expect(document.querySelector(`.layout-${otro}`)).toBeNull()
    }
  })

  test('T83i 360 x 800 sigue siendo el teléfono vertical: velo y fichas de siempre, letra 24, sin barra ni dock de tableta.', async () => {
    fingirVentana(360, 800)
    await abrir('leer')
    expect(screen.queryByTestId('tab-barra')).toBeNull()
    expect(screen.queryByTestId('tab-dock')).toBeNull()
    expect(screen.queryByTestId('riel-izquierdo')).toBeNull()
    expect(screen.getByTestId('ficha-letra').textContent).toContain('24')
    expect(screen.getByTestId('ficha-letra').className).not.toContain('grande')
  })

  test('T83j 800 x 360 sigue siendo el teléfono de lado de la 82: rieles, fichas chicas, letra 24.', async () => {
    fingirVentana(800, 360)
    await abrir('grabar')
    expect(document.querySelector('.layout-tel-h')).not.toBeNull()
    const izq = screen.getByTestId('riel-izquierdo')
    // Tarea 93, 05-10-2026: en Grabar la primera fila termina en la flecha; Calidad y Subtítulos
    // pasaron a la segunda fila, y Más ya no está en Grabar.
    // Antes (2026-10-05): expect(fichasEn(izq)).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-calidad', 'ficha-subtitulos'])
    // -ajustes de pantallas, 10-10-2026- El orden de las fichas pasa a Texto -letra, anclaje- y Cámara
    // -cámara, brillo-. Antes: expect(fichasEn(izq)).toEqual(['ficha-letra', 'ficha-camara', 'ficha-anclaje', 'ficha-brillo', 'ficha-flecha'])
    expect(fichasEn(izq)).toEqual(['ficha-letra', 'ficha-anclaje', 'ficha-camara', 'ficha-brillo', 'ficha-flecha'])
    // Antes (2026-10-05): expect(within(screen.getByTestId('riel-derecho')).getByTestId('ficha-mas')).toBeTruthy()
    expect(within(screen.getByTestId('riel-derecho')).queryByTestId('ficha-mas')).toBeNull()
    expect(screen.getByTestId('ficha-letra').className).not.toContain('grande')
    expect(screen.getByTestId('ficha-letra').textContent).toContain('24')
    expect(screen.queryByTestId('tab-barra')).toBeNull()
  })

  test('T83k Girar en plena lectura: de tab-v a tab-h sin cortar la lectura.', async () => {
    fingirVentana(820, 1180)
    await abrir('leer')
    await empezar()
    expect(document.querySelector('.layout-tab-v')).not.toBeNull()
    girar(1180, 820)
    expect(document.querySelector('.layout-tab-h')).not.toBeNull()
    expect(document.querySelector('.layout-tab-v')).toBeNull()
    // Sigue leyendo: no volvió a LISTO.
    expect(screen.queryByTestId('btn-empezar-toma')).toBeNull()
    expect(screen.getByTestId('teleprompter-view-container').getAttribute('data-tab-texto')).toBe('lectura')
    girar(820, 1180)
    expect(document.querySelector('.layout-tab-v')).not.toBeNull()
    expect(screen.queryByTestId('btn-empezar-toma')).toBeNull()
  })
})
