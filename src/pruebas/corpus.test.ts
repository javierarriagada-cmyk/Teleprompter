import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi, afterEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { MotorFake } from '../motor/MotorFake'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { iniciarGrabacion, detenerGrabacion, estadoGrabador, registroComoTexto, reiniciarGrabadorParaPruebas } from '../lib/grabadorCorpus'
import { anotar, cantidadEntradas, activarDiagnostico } from '../lib/diagnostico'
import { leerCorpus, repetirLectura } from '../lib/repetidor'
import { crearSeguidor, tokenizarGuion } from '../lib/seguidor'
import { crearMotorDeAvance } from '../lib/avance'
import { procesarFinal, procesarParcial } from '../lib/conduccion'
import { useSeguidor } from '../hooks/useSeguidor'

// Un grabador de mentira que NO dispara onstart solo. Asi se puede mirar el rato que hay
// entre "pedi grabar" y "empezo a grabar", que es justo donde vive el defecto que esta
// prueba protege.
class GrabadorFalso {
  static ultimo: GrabadorFalso | null = null
  state = 'inactive'
  ondataavailable: ((e: any) => void) | null = null
  onstart: (() => void) | null = null
  onstop: ((e: any) => void) | null = null
  onerror: ((e: any) => void) | null = null
  mimeType = 'audio/webm'

  constructor(_stream: any, _opts?: any) {
    GrabadorFalso.ultimo = this
  }
  static isTypeSupported(_t: string) {
    return true
  }
  start(_ms?: number) {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    if (this.ondataavailable) this.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    if (this.onstop) this.onstop({} as any)
  }
  // Lo dispara la prueba a mano, para simular la demora del navegador.
  dispararOnstart() {
    if (this.onstart) this.onstart()
  }
}

function prepararNavegador() {
  const pista = { stop: vi.fn() }
  ;(globalThis as any).MediaRecorder = GrabadorFalso as any
  ;(globalThis as any).Blob = Blob
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [pista] })
    }
  })
  return pista
}

describe('Corpus de medicion del motor (paso 1 del plan)', () => {
  afterEach(() => {
    activarDiagnostico(false)
    reiniciarGrabadorParaPruebas()
    vi.restoreAllMocks()
  })

  test('T135: GUARDIANA DEL RELOJ. El milisegundo cero del registro es el instante en que ARRANCA EL AUDIO, no el instante en que se pidio grabar.', async () => {
    prepararNavegador()

    await iniciarGrabacion({
      guionTitulo: 'Guion de prueba',
      guionTexto: 'una dos tres',
      motor: 'Motor Fake para Pruebas'
    })

    // Entre pedir permiso y que el navegador confirme que empezo a grabar puede pasar un
    // rato. Lo que ocurra en ese rato NO pertenece a la grabacion: si se anotara, quedaria
    // con un milisegundo que no corresponde a ningun sonido del archivo de audio.
    anotar({ tipo: 'oyo', texto: 'esto pasa ANTES de que arranque el audio', final: false })
    expect(cantidadEntradas()).toBe(0)

    // Ahora si: el navegador confirma que empezo a grabar. Aca, y solo aca, arranca el reloj.
    GrabadorFalso.ultimo!.dispararOnstart()
    expect(estadoGrabador()).toBe('grabando')

    anotar({ tipo: 'oyo', texto: 'esto ya es parte de la grabacion', final: false })
    expect(cantidadEntradas()).toBe(1)

    // Y su marca de tiempo arranca cerca de cero, porque el origen se acaba de fijar.
    const texto = registroComoTexto()
    const linea = texto.split('\n').find((l) => l.includes('esto ya es parte de la grabacion'))
    expect(linea).toBeDefined()
    const ms = Number(linea!.split('\t')[0])
    expect(ms).toBeGreaterThanOrEqual(0)
    expect(ms).toBeLessThan(200)

    await detenerGrabacion()
    expect(estadoGrabador()).toBe('listo')
  })

  test('T136: El registro que se descarga lleva el guion y el motor adentro, para que el audio no quede huerfano.', async () => {
    prepararNavegador()

    await iniciarGrabacion({
      guionTitulo: 'Prueba de cabecera',
      guionTexto: 'primera linea\nsegunda linea',
      motor: 'Web Speech API (Navegador)'
    })
    GrabadorFalso.ultimo!.dispararOnstart()
    anotar({ tipo: 'cuadro', posicion: 12.5, calce: 12, scroll: 340, freno: '-', trabado: 3 })
    await detenerGrabacion()

    const texto = registroComoTexto()

    // Sin el guion, el audio no se puede alinear: el alineador necesita las palabras.
    expect(texto).toContain('primera linea')
    expect(texto).toContain('segunda linea')
    // Sin saber que motor se uso, la medicion no se puede atribuir a nada.
    expect(texto).toContain('Web Speech API (Navegador)')
    // Y la capa que faltaba: lo que la pantalla estaba mostrando.
    expect(texto).toContain('pos=12.50')
  })

  test('T137: GUARDIANA DE QUE MEDIR NO SEA UN BOTON APARTE. Apretar Iniciar arranca tambien la grabacion de medicion.', async () => {
    prepararNavegador()

    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-137',
      titulo: 'Guion T137',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b-137', nombre: '', texto: 'una dos tres cuatro cinco seis siete ocho' }]
    }
    await repo.guardar(guion)

    let container: HTMLElement
    await act(async () => {
      const res = render(React.createElement(App, { motor: new MotorFake(), repoOverride: repo }))
      container = res.container
      await new Promise((r) => setTimeout(r, 400))
    })

    const abrir = container!.querySelector('[data-testid^="fila-guion"]') as HTMLElement
    await act(async () => {
      fireEvent.click(abrir!)
      await new Promise((r) => setTimeout(r, 100))
    })

    // Antes de apretar Leer, no hay ninguna grabacion en curso.
    expect(estadoGrabador()).toBe('inactivo')

    const leerBtn = container!.querySelector('[data-testid="btn-leer-guion-fijo"]') as HTMLButtonElement | null
    await act(async () => {
      fireEvent.click(leerBtn!)
      await new Promise((r) => setTimeout(r, 100))
    })

    // Y aca esta el contrato: apretar Leer arranca la grabacion junto con la lectura.
    // La grabacion arranca ANTES de la cuenta regresiva, para que el comienzo de la lectura no quede cortado.
    expect(estadoGrabador()).not.toBe('inactivo')

    GrabadorFalso.ultimo!.dispararOnstart()
    expect(estadoGrabador()).toBe('grabando')
  })

  test('T138: GUARDIANA DE QUE MEDIR NO PUEDA IMPEDIR LEER. Si el microfono nunca contesta, la lectura arranca igual.', async () => {
    // El microfono que se queda pensando para siempre: el cartel de permiso que la persona
    // no contesta, o un microfono tomado por otra cosa. getUserMedia devuelve una promesa
    // que no se resuelve nunca.
    ;(globalThis as any).MediaRecorder = GrabadorFalso as any
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockReturnValue(new Promise(() => {})) }
    })

    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-138',
      titulo: 'Guion T138',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b-138', nombre: '', texto: 'una dos tres cuatro cinco seis siete ocho' }]
    }
    await repo.guardar(guion)

    let container: HTMLElement
    await act(async () => {
      const res = render(React.createElement(App, { motor: new MotorFake(), repoOverride: repo }))
      container = res.container
      await new Promise((r) => setTimeout(r, 400))
    })

    const abrir = container!.querySelector('[data-testid^="fila-guion"]') as HTMLElement
    await act(async () => {
      fireEvent.click(abrir!)
      await new Promise((r) => setTimeout(r, 100))
    })
    const leer = container!.querySelector('[data-testid="btn-leer-guion-fijo"]') as HTMLButtonElement | null
    await act(async () => {
      fireEvent.click(leer!)
      await new Promise((r) => setTimeout(r, 200))
    })

    // ESTE ES EL CONTRATO. Con el await puesto antes de la cuenta regresiva, esto queda en
    // null y no arranca nada: es el defecto que Javier vio como "no avanza nada y desde el
    // principio aparece abajo detenido".
    expect(container!.querySelector('[data-testid="cuenta-regresiva"]')).not.toBeNull()
  })

  test('T139: leerCorpus saca del archivo el guion, el motor y los eventos, y NO lee las lineas de calce.', () => {
    const rutaCorpus = path.resolve(process.cwd(), 'src/pruebas/corpus/lectura-2026-09-12-2311.txt')
    const contenido = fs.readFileSync(rutaCorpus, 'utf-8')
    const corpus = leerCorpus(contenido)

    expect(corpus.guion).toContain('Enero de 1969. Sale un disco que se llama Hombre.')
    expect(corpus.motor).toContain('Vosk Local')

    const eventosOyo = corpus.eventos.filter((e) => e.tipo === 'oyo')
    expect(eventosOyo.length).toBe(389)

    const finales = eventosOyo.filter((e) => e.tipo === 'oyo' && e.final)
    expect(finales.length).toBe(3)

    // Verificar que las líneas de tipo 'calce' no fueron leídas como eventos
    const calces = (corpus.eventos as any[]).filter((e) => e.tipo === 'calce')
    expect(calces.length).toBe(0)
  })

  test('T140: GUARDIANA DE LA VENTANA HACIA ATRAS', () => {
    // Guion de 50 palabras.
    // Frase larga de 12 palabras ubicada en los tokens 25 a 36.
    const palabras = Array.from({ length: 50 }, (_, i) => `palabra${i + 1}`)
    const fraseLarga = ['es', 'el', 'mas', 'largo', 'cuatro', 'minutos', 'de', 'un', 'hombre', 'de', 'treinta', 'y']
    for (let i = 0; i < fraseLarga.length; i++) {
      palabras[25 + i] = fraseLarga[i]
    }
    const guionTexto = palabras.join(' ')

    const tokens = tokenizarGuion(guionTexto)
    const seguidor = crearSeguidor(tokens)

    // El seguidor avanza hasta la palabra 40.
    seguidor.avanzar(palabras.slice(0, 40).join(' '))

    // Ahora se recibe la frase larga que empieza en el token 25 (15 tokens atras de la posicion actual 40).
    // Con la ventana fija de 5 atras (posMinima - 5 = 35), el offset 25 queda fuera de la ventana.
    // Con posMinima - (frase.length + VENTANA_ATRAS) = 40 - (12 + 5) = 23, el offset 25 SI queda dentro.
    const pos = seguidor.avanzar(fraseLarga.join(' '))
    expect(pos.movio).toBe(true)
    expect(pos.desdeToken).toBe(25)
  })

  test('T141: GUARDIANA DEL ADELANTO', () => {
    const rutaCorpus = path.resolve(process.cwd(), 'src/pruebas/corpus/lectura-2026-09-12-2311.txt')
    const contenido = fs.readFileSync(rutaCorpus, 'utf-8')
    const corpus = leerCorpus(contenido)

    const res = repetirLectura(corpus)
    // adelantoMaximo <= adelantoMaximoParam (3) + 0.1
    expect(res.adelantoMaximo).toBeLessThanOrEqual(3.1)
  })

  test('T142: GUARDIANA DE QUE EL ARNES MIDA EL CAMINO DE VERDAD', async () => {
    const guionTexto = 'uno dos tres cuatro cinco seis siete ocho nueve diez'
    const guion = {
      id: 'g-142',
      titulo: 'Guion T142',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: guionTexto }]
    }

    const entradas: Array<{ ms: number; texto: string; final: boolean }> = [
      { ms: 1000, texto: 'uno dos tres', final: false },
      { ms: 2000, texto: 'cuatro cinco seis', final: true },
      { ms: 3000, texto: 'siete ocho nueve diez', final: true }
    ]

    // Camino A: Repeticion por el arnes (repetirLectura con Corpus sintético)
    const corpusSintetico = {
      guion: guionTexto,
      motor: 'Fake',
      eventos: entradas.map((e) => ({
        ms: e.ms,
        tipo: 'oyo' as const,
        texto: e.texto,
        final: e.final
      }))
    }
    const resArnes = repetirLectura(corpusSintetico)

    // Camino B: useSeguidor en la aplicacion real
    let hookResult: ReturnType<typeof useSeguidor> = null!

    const TestComp = () => {
      hookResult = useSeguidor(guion)
      return null
    }

    await act(async () => {
      render(React.createElement(TestComp, null))
    })

    const ubicadosApp: number[] = []
    await act(async () => {
      for (const ev of entradas) {
        if (ev.final) {
          hookResult.alRecibirFinal(ev.texto)
        } else {
          hookResult.alRecibirParcial(ev.texto)
        }
        const st = hookResult.motorAvance?.estadoEn(performance.now())
        if (st && st.ultimoCalce > 0) ubicadosApp.push(st.ultimoCalce)
      }
    })

    // Extraer calces no nulos del arnes para comparar la secuencia exacta de tokens ubicados
    const calcesArnes = resArnes.serie.filter((s) => s.calce > 0).map((s) => s.calce)
    const calcesUnicosArnes = Array.from(new Set(calcesArnes))

    // Comparar la secuencia de calces entre el arnes y el hook
    expect(calcesUnicosArnes).toEqual(ubicadosApp)
    expect(calcesUnicosArnes).toEqual([2, 5, 9])
  })

  test('T143: EL CORPUS MEJORA', () => {
    const rutaCorpus = path.resolve(process.cwd(), 'src/pruebas/corpus/lectura-2026-09-12-2311.txt')
    const contenido = fs.readFileSync(rutaCorpus, 'utf-8')
    const corpus = leerCorpus(contenido)

    const res = repetirLectura(corpus)
    console.log(`[T143] RESULTADOS CORPUS:
      porcentaje ubicado: ${res.porcentajeUbicados.toFixed(2)}%
      adelanto maximo:    ${res.adelantoMaximo.toFixed(2)} palabras
      adelanto medio:     ${res.adelantoMedio.toFixed(2)} palabras
      cuadros quietos:    ${res.cuadrosQuietos} / ${res.totalCuadros}`)

    expect(res.porcentajeUbicados).toBeGreaterThanOrEqual(60.0)
  })
})
