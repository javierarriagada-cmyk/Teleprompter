// TAREA 89 -04-10-2026-: tres defectos.
//
// DEFECTO 1 -seguimiento de lado-: no hay arreglo de conducción, porque sin los registros completos
// de las cinco tomas no se sabe si el calce del token 60 era verdadero -ver docs/tarea89.txt-. Lo que
// sí hay son líneas de registro nuevas para que Claude lo vea en el moto g86: el calce que cae fuera
// de la ventana -con dónde estaba el seguidor-, el arrastre que mueve seguidor y motor, y el diseño
// -tel-h o tel-v- con que salieron los renglones. Más una guardiana que fija la salida vertical de hoy.
//
// DEFECTO 3 -barra de tres botones-: el visor y las capas que no sumaban env(safe-area-inset-*).
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi, afterEach } from 'vitest'
import { render, act, renderHook } from '@testing-library/react'

vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    directorioGrabaciones: async () => '/grabaciones',
    leerTexto: async () => { throw new Error('sin registro') }
  }
})

import ReproductorGrabacion from '../components/ReproductorGrabacion'
import { grabacionNueva, Guion } from '../datos/modelo'
import { activarDiagnostico, anotar, comoTexto } from '../lib/diagnostico'
import { crearSeguidor, tokenizarGuion } from '../lib/seguidor'
import { crearMotorDeAvance } from '../lib/avance'
import { Conduccion, procesarFinal, procesarParcial } from '../lib/conduccion'
import { bloqueDeBienvenida } from '../app/bienvenida'
import { useSeguidor } from '../hooks/useSeguidor'
import { leerCorpus } from '../lib/repetidor'

const raiz = path.join(__dirname, '..')
const fuente = (rel: string) => fs.readFileSync(path.join(raiz, rel), 'utf8')

const guionHola: Guion = { id: 'hola', titulo: 'Hola', idioma: 'es', creado: 0, modificado: 0, bloques: [bloqueDeBienvenida('es')] }

function conduccionDe(guion: Guion | string): Conduccion {
  const tokens = tokenizarGuion(guion)
  const lm = new Map<string, number>(), bm = new Map<number, number>()
  tokens.forEach((t, i) => { lm.set(`${t.bloque}-${t.linea}`, i); bm.set(t.bloque, i) })
  const limitesDeLinea = [...lm.values()].sort((a, b) => a - b)
  const motor = crearMotorDeAvance(undefined, limitesDeLinea, [...bm.values()].sort((a, b) => a - b))
  return { seguidor: crearSeguidor(tokens), motor, tokens, limitesDeLinea }
}

afterEach(() => activarDiagnostico(false))

describe('Tarea 89, defecto 1: el registro muestra lo que hoy no se ve', () => {
  test('las tres líneas nuevas se escriben legibles', () => {
    activarDiagnostico(true)
    anotar({ tipo: 'ventana', token: 60, ref: 0, desde: 0, hasta: 40, final: true, seguidor: 62 } as any)
    anotar({ tipo: 'seguidor', evento: 'irAToken', token: 55 } as any)
    anotar({ tipo: 'pantalla', diseno: 'tel-h', ancho: 915, alto: 411 } as any)
    const txt = comoTexto()
    expect(txt).toMatch(/ventana\tFUERA FINAL token=60 ref=0 desde=0 hasta=40 seguidor=62/)
    expect(txt).toMatch(/seguidor\tirAToken token=55/)
    expect(txt).toMatch(/pantalla\ttel-h 915x411/)
  })

  // El caso de la medición: el motor en 0 y el seguidor ya en los corchetes. El calce del 60 se
  // anota -como hoy- y luego queda dicho que cayó fuera de la ventana, con dónde estaba el seguidor.
  // Esa última parte es la que hoy falta: con ella se ve el desfase entre los dos.
  test('un calce fuera de la ventana anota "ventana FUERA" y el motor no se mueve', () => {
    const c = conduccionDe(guionHola)
    activarDiagnostico(true)
    c.seguidor.irAToken(55)
    const t = 1000
    procesarParcial(c, 'lo que escribes entre corchetes es una nota', t)
    procesarFinal(c, 'lo que escribes entre corchetes es una nota solo para ti', t + 400)
    const txt = comoTexto()
    expect(txt).toMatch(/calce/)
    expect(txt).toMatch(/ventana\tFUERA (parcial|FINAL) token=\d+ ref=0 desde=0 hasta=40 seguidor=\d+/)
    const st = c.motor.estadoEn(t + 500)
    expect(Math.round(st.posicion)).toBe(0)
  })

  test('el arrastre que mueve seguidor y motor queda anotado', () => {
    activarDiagnostico(true)
    const { result } = renderHook(() => useSeguidor(guionHola))
    act(() => { (result.current as any).irAToken(55) })
    expect(comoTexto()).toMatch(/seguidor\tirAToken token=55/)
  })

  test('los renglones del registro llevan el diseño con que salieron', () => {
    expect(fuente('components/TeleprompterView.tsx')).toMatch(/tipo: 'pantalla', diseno: horizontalRef\.current \? 'tel-h' : 'tel-v'/)
    expect(fuente('App.tsx')).toMatch(/# diseño: /)
  })
})

// GUARDIANA DEL VERTICAL: la toma del corpus con el guion Hola -de pie-, repetida frase por frase por
// la conducción. Estos números son los de hoy, 04-10-2026. Si un cambio para lo de lado los mueve,
// esta prueba lo dice.
// CORRECCIÓN del 04-10-2026, más tarde: el guion de las 5 tomas es "Larralde", no "Hola". Que a5bc922c
// sea de pie no lo dice su cabecera; es del 24-09, antes de que existiera el diseño de lado -tarea 82,
// 29-09-, así que se leyó con el diseño vertical. Se queda, y se suma la guardiana de Larralde de abajo.
describe('Tarea 89, defecto 1: la salida vertical de hoy no cambia', () => {
  test('toma a5bc922c (Hola, de pie): mismas posiciones que hoy', () => {
    const corpus = leerCorpus(fs.readFileSync(path.join(__dirname, 'corpus', 'toma-a5bc922c-salto.motor.txt'), 'utf8'))
    const c = conduccionDe(corpus.guion as any)
    const oyos = corpus.eventos.filter((e: any) => e.tipo === 'oyo') as any[]
    const posiciones: number[] = []
    let k = 0
    const fin = oyos[oyos.length - 1].ms + 16
    for (let t = 0; t <= fin; t += 16) {
      while (k < oyos.length && oyos[k].ms <= t) {
        if (oyos[k].final) procesarFinal(c, oyos[k].texto, t)
        else procesarParcial(c, oyos[k].texto, t)
        k++
      }
      if (t % 500 < 16) posiciones.push(Math.round(c.motor.estadoEn(t).posicion))
    }
    expect(posiciones).toEqual(POSICIONES_VERTICALES_DE_HOY)
  })

  // GUARDIANA CON EL GUION LARRALDE: la lectura del 13-09 a las 11:48 -del corpus, anterior al diseño
  // de lado-, sus primeros 40 segundos. De pie, el motor arranca a los ~10 s y avanza sin un solo
  // calce fuera de la ventana. Números de hoy, contra main 71166e5.
  test('lectura Larralde 2026-09-13-1148 (de pie): mismas posiciones y ningún calce fuera de la ventana', () => {
    const corpus = leerCorpus(fs.readFileSync(path.join(__dirname, 'corpus', 'lectura-2026-09-13-1148.txt'), 'utf8'))
    const c = conduccionDe(corpus.guion as any)
    expect(c.tokens[60].palabra).toBe('hombre')
    activarDiagnostico(true)
    const oyos = corpus.eventos.filter((e: any) => e.tipo === 'oyo') as any[]
    const posiciones: number[] = []
    let k = 0
    for (let t = 0; t <= 40000; t += 16) {
      while (k < oyos.length && oyos[k].ms <= t) {
        if (oyos[k].final) procesarFinal(c, oyos[k].texto, t)
        else procesarParcial(c, oyos[k].texto, t)
        k++
      }
      if (t % 2000 < 16) posiciones.push(Math.round(c.motor.estadoEn(t).posicion))
    }
    expect(posiciones).toEqual(LARRALDE_VERTICAL_DE_HOY)
    expect(comoTexto()).not.toMatch(/ventana\tFUERA/)
  })
})

// Una muestra cada 2 segundos, los primeros 40, redondeada. 04-10-2026, main 71166e5.
const LARRALDE_VERTICAL_DE_HOY: number[] = [0, 0, 0, 0, 0, 10, 15, 18, 24, 26, 28, 35, 40, 45, 49, 53, 58, 62, 68, 72, 77]

// Una muestra cada medio segundo, redondeada. Sacadas el 04-10-2026 contra main 71166e5.
const POSICIONES_VERTICALES_DE_HOY: number[] = [0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 7, 8, 8]

describe('Tarea 89, defecto 3: lo que la barra de tres botones tapa', () => {
  test('el visor suma los bordes seguros en los cuatro lados', async () => {
    const toma = grabacionNueva({ id: 't89', tituloGuion: 'Hola', duracionMs: 5000, ruta: '/grabaciones/t89.mp4' })
    const { getByTestId } = render(<ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    const el = getByTestId('reproductor-grabacion')
    expect(el.style.paddingBottom).toContain('env(safe-area-inset-bottom')
    expect(el.style.paddingLeft).toContain('env(safe-area-inset-left')
    expect(el.style.paddingRight).toContain('env(safe-area-inset-right')
    expect(el.style.paddingTop).toContain('env(safe-area-inset-top')
  })

  // De pie con el selector de subtítulos la tarjeta mide ~880 dp -medido en Chrome a 412x915-: más
  // que el alto menos las barras. Centrada y sin desplazamiento, se metía igual bajo la barra. Con
  // overflow auto en la raíz y margin auto en la tarjeta, si cabe queda centrada como hoy; si no,
  // empieza arriba y se desplaza hasta que Guardar, Repetir y Borrar queden sobre la barra.
  test('si la tarjeta no cabe, el visor se desplaza en vez de cortarla', async () => {
    const toma = grabacionNueva({ id: 't89b', tituloGuion: 'Hola', duracionMs: 5000, ruta: '/grabaciones/t89b.mp4' })
    const { getByTestId } = render(<ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    const el = getByTestId('reproductor-grabacion')
    expect(el.style.overflowY).toBe('auto')
    expect((el.firstElementChild as HTMLElement).style.margin).toBe('auto')
  })

  test('la capa de los diálogos de micrófono y permiso respeta la barra', () => {
    const css = fuente('styles-ajustes.css')
    const bloque = css.slice(css.indexOf('.capa-dialogo-microfono {'), css.indexOf('}', css.indexOf('.capa-dialogo-microfono {')))
    expect(bloque).toContain('env(safe-area-inset-bottom')
  })

  test('los dos paneles de corpus respetan la barra', () => {
    for (const rel of ['App.tsx', 'components/BibliotecaView.tsx']) {
      const s = fuente(rel)
      const i = s.indexOf('{HERRAMIENTAS && mostrarPanelCorpus && (')
      expect(i, rel).toBeGreaterThan(-1)
      expect(s.slice(i, i + 900), rel).toContain('env(safe-area-inset-bottom')
    }
  })
})
