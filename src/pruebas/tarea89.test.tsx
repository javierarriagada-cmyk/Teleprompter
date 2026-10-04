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
import { Conduccion, procesarFinal, procesarParcial, reiniciarToma } from '../lib/conduccion'
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

// LAS CINCO TOMAS DE VERDAD -tarea 89, tercera vuelta, 04-10-2026-. Extractos de la rama
// registros-tarea89 -commit 176d635-: solo la cabecera -el guion "Larralde" tal cual se leyó- y las
// líneas 'oyo', en src/pruebas/corpus/tarea89/. Se repiten por la conducción en el mismo orden en que
// Javier las grabó y SIN reiniciar entre una y otra donde el teléfono tampoco reinició: la toma 2
// empieza en pos=25.87 -donde quedó la 1- y la 5 en calce=1 -donde quedó la 4-, según la primera línea
// 'cuadro' de cada registro. La 3 y la 4 empiezan en 0.
// CORRECCIÓN -cuarta vuelta, 04-10-2026-: esa herencia era el DEFECTO, no el diseño -Javier y Claude-.
// Parar termina la toma y la siguiente parte limpia -reiniciarToma, conduccion.ts-. Las pruebas que
// encadenaban tomas ahora pasan por reiniciarToma entre una y otra, como hace la App al Parar. Lo de
// arriba sigue siendo lo que pasó en el teléfono -por eso se deja-: la 3 y la 4 empezaron limpias porque
// algo cambió el objeto guion antes -ver docs/tarea89.txt, "CUARTA VUELTA"-.
const T89 = path.join(__dirname, 'corpus', 'tarea89')
const TOMA = {
  1: '1-vertical-1080p-1b30bd7e.oyo.txt',
  2: '2-vertical-720p-47c29ca5.oyo.txt',
  3: '3-vertical-480p-d910b9ae.oyo.txt',
  4: '4-de-lado-1080p-58e1b5f8.oyo.txt',
  5: '5-de-lado-1080p-4c98b14d.oyo.txt'
} as const
const corpusDe = (n: keyof typeof TOMA) => leerCorpus(fs.readFileSync(path.join(T89, TOMA[n]), 'utf8'))

// Repite una toma sobre una conducción -nueva o la que dejó la anterior- y devuelve la posición del
// motor cada 2 s. El reloj sigue corriendo entre tomas, como en el teléfono.
let relojTomas = 0
function repetirToma(c: Conduccion, n: keyof typeof TOMA): number[] {
  const corpus = corpusDe(n)
  const oyos = corpus.eventos.filter((e: any) => e.tipo === 'oyo') as any[]
  const fin = oyos[oyos.length - 1].ms + 3000
  const base = relojTomas
  const posiciones: number[] = []
  let k = 0
  for (let t = 0; t <= fin; t += 16) {
    while (k < oyos.length && oyos[k].ms <= t) {
      if (oyos[k].final) procesarFinal(c, oyos[k].texto, base + t)
      else procesarParcial(c, oyos[k].texto, base + t)
      k++
    }
    if (t % 2000 < 16) posiciones.push(Math.round(c.motor.estadoEn(base + t).posicion))
  }
  relojTomas = base + fin + 5000
  return posiciones
}
const guionLarralde = () => corpusDe(1).guion

describe('Tarea 89, defecto 1: Larralde de pie, las tomas 1, 2 y 3 no cambian', () => {
  test('las cinco tomas son del mismo guion', () => {
    const g = guionLarralde()
    for (const n of [2, 3, 4, 5] as const) expect(corpusDe(n).guion).toBe(g)
    const tokens = tokenizarGuion(g)
    // El título se repite en el párrafo 2: "Se llama 'Si me vieras por dentro'. Es una obra".
    expect(tokens.slice(0, 6).map((t) => t.palabra).join(' ')).toBe('si me vieras por dentro larralde')
    expect(tokens.slice(53, 61).map((t) => t.palabra).join(' ')).toBe('si me vieras por dentro es una obra')
  })

  // AJUSTADA -cuarta vuelta-: era "la 2 seguida sobre lo que dejó la 1" y esperaba
  // [26, 26, 26, 27, 40, 46, 51, 57, 60, 61] -la 2 partía en 26, heredado de la 1-. Con Parar entre las
  // dos, la 2 parte en 0 y da lo mismo que la 2 sola. La toma 1 -guardiana de pie- no cambia.
  test('toma 1 -de pie, 1080p-, nueva; Parar; y la 2 -720p- parte limpia, igual que sola', () => {
    relojTomas = 0
    const c = conduccionDe(guionLarralde())
    expect(repetirToma(c, 1)).toEqual([0, 1, 2, 2, 12, 17, 21, 25, 26])
    reiniciarToma(c, 0)
    const segunda = repetirToma(c, 2)
    expect(segunda).toEqual([0, 0, 0, 0, 14, 39, 51, 57, 60, 61])
    relojTomas = 0
    expect(repetirToma(conduccionDe(guionLarralde()), 2)).toEqual(segunda)
  })

  test('toma 3 -de pie, 480p-, nueva', () => {
    relojTomas = 0
    expect(repetirToma(conduccionDe(guionLarralde()), 3)).toEqual([0, 0, 5, 6, 14, 20, 26, 30, 31])
  })
})

describe('Tarea 89, defecto 1: Larralde de lado, las tomas 4 y 5 mueven la posición', () => {
  // La toma 4 oyó "si me das por dentro es" -el título, con "las" oído como "es"- y el seguidor lo
  // ubicó en 53-58, la repetición del título en el párrafo 2. La conducción lo rechazó -fuera de
  // 0-41- pero el seguidor ya había corrido su posición tentativa, y desde ahí no volvió a buscar
  // cerca del título. Con el arreglo, el seguidor vuelve a donde está el motor.
  test('toma 4 -de lado, 1080p-, nueva: el motor sale de 0', () => {
    relojTomas = 0
    activarDiagnostico(true)
    const pos = repetirToma(conduccionDe(guionLarralde()), 4)
    const txt = comoTexto()
    expect(txt).toMatch(/ventana\tFUERA parcial token=58 ref=1/)
    // Un solo rechazo: después el seguidor vuelve a buscar cerca del título y la toma avanza como
    // las de pie -la 1 llegó a 26, la 3 a 31-.
    expect(txt.match(/ventana\tFUERA/g)!.length).toBe(1)
    expect(txt).toMatch(/seguidor\tdevuelto token=1/)
    expect(Math.max(...pos)).toBeGreaterThanOrEqual(25)
  })

  // OJO, LO QUE ESTA PRUEBA NO DICE: la toma 5 se grabó con la pantalla en 0, y la persona leyó el
  // título. Con el arreglo la 4 deja el texto en ~31, así que esas mismas frases ya no son las que
  // se leerían: lo único que prueba es que la 5 no arranca trabada -en el teléfono empezó en
  // calce=1, freno=sin-calce, y no salió de ahí-. La toma 5 sola, sin la 4 antes, tampoco avanza en
  // sus 12 s: ver docs/tarea89.txt, "lo que no calza".
  // AJUSTADA -cuarta vuelta-: era "toma 5 seguida sobre lo que dejó la 4: no queda trabada en 0", con
  // expect(Math.max(...pos)).toBeGreaterThan(0). Pasaba SOLO por la herencia: la 5 quedaba quieta en el
  // 31 que dejó la 4 -[31, 31, 31, 31, 31, 31, 31]-, no porque avanzara. Con Parar entre las dos, la 5
  // parte en 0 sin calce ni freno de la 4 y da lo mismo que la 5 sola: quieta en 0 sus 12 s. Eso es lo
  // que el oído entregó -"sí por dentro las por dentro la ral de"-, y queda en "lo que no calza".
  test('toma 5 -de lado-, después de Parar la 4: parte limpia en 0, igual que sola, sin el 31 de la 4', () => {
    relojTomas = 0
    const c = conduccionDe(guionLarralde())
    repetirToma(c, 4)
    reiniciarToma(c, 0)
    const st = c.motor.estadoEn(relojTomas)
    expect(Math.round(st.posicion)).toBe(0)
    expect(st.ultimoCalce).toBe(0)
    expect(st.tUltimoCalceMs).toBe(0)
    const pos = repetirToma(c, 5)
    relojTomas = 0
    expect(pos).toEqual(repetirToma(conduccionDe(guionLarralde()), 5))
    expect(pos[0]).toBe(0)
  })
})
