import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import TeleprompterView from '../components/TeleprompterView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion } from '../datos/modelo'

// TAREA 85 -29-09-2026-: EL TOQUE NO ES UN ARRASTRE.
//
// Javier lo confirmó en su moto g86: después de Pausa y Seguir el texto dejaba de acompañarlo, y
// arrastrarlo con el dedo lo enderezaba. La causa estaba en TeleprompterView: CUALQUIER toque
// sobre el texto -también el que solo muestra u oculta los controles, que es el que se hace
// justo antes de tocar Pausa o Seguir- encendía modoManualRef y, 350 ms después de levantar el
// dedo, llamaba a onNavegacionManual -irAToken- con el renglón que estuviera en la ventana.
// irAToken reinicia el arranque del motor -otra vez siete palabras antes de moverse- y pone al
// seguidor en ese renglón aunque la persona esté en otro. Un toque no mueve el texto: no tiene
// por qué decirle al motor que la persona se fue a otra parte.
//
// Las cuatro fallaban en tarea-84 -14b955e- y pasan con el arreglo. T85c además cuida lo que NO
// tiene que cambiar: arrastrar el texto o mover la rueda SÍ es modo manual. Fallaba porque, tras
// el arrastre, un dibujo de App borraba la espera y el modo manual no se apagaba nunca.

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

function guionSimple(texto: string): Guion {
  return {
    id: 'g-85-' + Math.random().toString(36).substring(2, 9),
    titulo: 'Guion de la tarea 85',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    bloques: [{ id: 'b-1', nombre: '', texto }]
  }
}

// Un toque de verdad en el teléfono, en el orden en que lo entrega el WebView de Android:
// pointerdown, touchstart, pointerup, touchend y al final click. Sin movimiento.
function tocar(el: Element) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 300 })
  fireEvent.touchStart(el, { touches: [{ clientX: 100, clientY: 300 }] })
  fireEvent.pointerUp(el, { clientX: 100, clientY: 300 })
  fireEvent.touchEnd(el)
  fireEvent.click(el)
}

async function esperar(ms: number) {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)) })
}

// ─── SOBRE LA VISTA SOLA: la geometría la fija la prueba, como en T170 ─────────────────────────
describe('Tarea 85 - Tocar el texto no es arrastrarlo -TeleprompterView-', () => {
  const FILA = 24 * 1.4
  let origClientHeight: PropertyDescriptor | undefined
  let origOffsetTop: PropertyDescriptor | undefined

  beforeEach(() => {
    origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    origOffsetTop = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetTop')
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 720 } })
    // Cuatro palabras por renglón.
    Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        const t = this.dataset && this.dataset.token
        return t === undefined ? 0 : Math.floor(Number(t) / 4) * FILA
      }
    })
  })

  afterEach(() => {
    if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
    else delete (window.HTMLElement.prototype as any).clientHeight
    if (origOffsetTop) Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', origOffsetTop)
    else delete (window.HTMLElement.prototype as any).offsetTop
  })

  // El motor de la prueba: la posición la mueve la prueba, como si la persona siguiera leyendo.
  function motorMovible() {
    const m = { posicion: 8 }
    const motor = {
      confirmar() {}, tentativo() {}, falloCalce() {}, voz() {}, irAToken() {}, reiniciar() {},
      estadoEn: () => ({
        posicion: m.posicion, avanzando: true, estado: 'SIGUIENDO' as const, motivoFreno: null,
        ppmEstimadas: 120, ultimoCalce: Math.floor(m.posicion), tUltimoCalceMs: 1
      })
    }
    return { m, motor }
  }

  function montar() {
    const guion = guionSimple(Array.from({ length: 80 }, (_, i) => 'pa' + i).join(' '))
    const { m, motor } = motorMovible()
    const alModoManual = vi.fn()
    const alNavegar = vi.fn()
    const alControles = vi.fn()
    const r = render(
      <TeleprompterView
        script={guion} currentLineIndex={0} currentWordIndex={0}
        anclajeZona="arriba" fontSize={24} columnaAngosta={false}
        estadoToma="leyendo"
        motorAvance={motor as any}
        onModoManualChange={alModoManual}
        onNavegacionManual={alNavegar}
        onToggleControles={alControles}
      />
    )
    const cont = r.container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
    return { ...r, guion, motor, m, cont, alModoManual, alNavegar, alControles }
  }

  test('T85a El toque que solo muestra u oculta los controles NO enciende el modo manual, NO apaga el desplazamiento y NO manda al motor a otro renglón.', async () => {
    const v = montar()
    try {
      await esperar(100)
      const antes = v.cont.scrollTop

      tocar(v.cont)
      // El toque sí llega a los controles: para eso se tocó.
      expect(v.alControles).toHaveBeenCalled()

      // Dentro de los 350 ms que antes eran "manuales", la persona sigue leyendo cuatro renglones
      // más. El texto la tiene que acompañar: el lazo sigue escribiendo el scrollTop.
      v.m.posicion = 24
      await esperar(200)
      expect(v.cont.scrollTop).toBeGreaterThan(antes)

      // Y DESPUÉS DE ESOS 350 MS TAMPOCO SE QUEDA PEGADO. App vuelve a dibujarse al mostrar los
      // controles y le pasa funciones nuevas -onToggleControles es una flecha escrita en el JSX,
      // irAToken se crea en cada vuelta de useSeguidor-. Con esas funciones en las dependencias,
      // el efecto de los gestos se desarmaba y su limpieza borraba el temporizador que apagaba el
      // modo manual: modoManualRef quedaba en true para siempre y el lazo no volvía a escribir el
      // scrollTop hasta el siguiente arrastre. Eso es lo que Javier vio: tras Seguir, arrastrar
      // el texto lo enderezaba.
      v.rerender(
        <TeleprompterView
          script={v.guion} currentLineIndex={0} currentWordIndex={0}
          anclajeZona="arriba" fontSize={24} columnaAngosta={false}
          estadoToma="leyendo"
          motorAvance={v.motor as any}
          onModoManualChange={(x) => v.alModoManual(x)}
          onNavegacionManual={(x) => v.alNavegar(x)}
          onToggleControles={() => v.alControles()}
        />
      )
      await esperar(400)
      const despues = v.cont.scrollTop
      v.m.posicion = 40
      await esperar(200)
      expect(v.cont.scrollTop).toBeGreaterThan(despues)

      expect(v.alModoManual).not.toHaveBeenCalledWith(true)
      expect(v.alNavegar).not.toHaveBeenCalled()
    } finally {
      v.unmount()
    }
  })

  test('T85c Arrastrar el texto con el dedo, deslizarlo -touchmove- y mover la rueda SÍ entran a modo manual, y al soltar se navega al renglón de la ventana.', async () => {
    const v = montar()
    try {
      await esperar(100)

      // El arrastre va con touchstart y touchmove, como en el teléfono. Con pointerdown y
      // pointermove no se puede probar aquí: jsdom no pone clientX en los eventos de puntero, y el
      // gesto se vería como un toque sin posición.
      // 1. Deslizar en el teléfono: touchstart y touchmove -el WebView corta los pointer al
      // empezar a desplazar-.
      fireEvent.touchStart(v.cont, { touches: [{ clientX: 100, clientY: 300 }] })
      fireEvent.touchMove(v.cont, { touches: [{ clientX: 100, clientY: 240 }] })
      expect(v.alModoManual).toHaveBeenCalledWith(true)
      // Mientras está en manual, el lazo no pisa lo que la persona mueve con el dedo.
      v.cont.scrollTop = 5
      v.m.posicion = 40
      await esperar(150)
      expect(v.cont.scrollTop).toBe(5)
      fireEvent.touchEnd(v.cont)
      expect(v.alControles).not.toHaveBeenCalled()
      // App se vuelve a dibujar dentro de los 350 ms -cada frase oída lo hace- y pasa funciones
      // nuevas. Antes eso borraba la espera y el modo manual quedaba pegado tras el arrastre.
      v.rerender(
        <TeleprompterView
          script={v.guion} currentLineIndex={0} currentWordIndex={0}
          anclajeZona="arriba" fontSize={24} columnaAngosta={false}
          estadoToma="leyendo"
          motorAvance={v.motor as any}
          onModoManualChange={(x) => v.alModoManual(x)}
          onNavegacionManual={(x) => v.alNavegar(x)}
          onToggleControles={() => v.alControles()}
        />
      )
      await esperar(450)
      expect(v.alModoManual).toHaveBeenLastCalledWith(false)
      expect(v.alNavegar).toHaveBeenCalledTimes(1)

      // 2. La rueda del mouse.
      v.alModoManual.mockClear(); v.alNavegar.mockClear()
      fireEvent.wheel(v.cont, { deltaY: 120 })
      expect(v.alModoManual).toHaveBeenCalledWith(true)
      await esperar(450)
      expect(v.alModoManual).toHaveBeenLastCalledWith(false)
      expect(v.alNavegar).toHaveBeenCalledTimes(1)
    } finally {
      v.unmount()
    }
  })
})

// ─── A TRAVÉS DE LA APLICACIÓN -AGENTS.md: construir no es conectar- ───────────────────────────
//
// Un motor de voz que no vuelve a la primera frase al reanudar -MotorFake.iniciar lo hace, porque
// sus pruebas empiezan siempre de cero- y que anota el orden en que lo prenden y lo apagan.
class MotorDeLaPausa extends MotorFake {
  orden: string[] = []
  msDetener = 0
  private iniciadoUnaVez = false
  async iniciar(opciones: { lang: string }): Promise<void> {
    this.orden.push('iniciar')
    if (!this.iniciadoUnaVez) { this.iniciadoUnaVez = true; await super.iniciar(opciones) }
  }
  async detener(): Promise<void> {
    this.orden.push('detener')
    if (this.msDetener > 0) await new Promise((r) => setTimeout(r, this.msDetener))
    this.orden.push('detenido')
  }
}

const LINEAS = [
  'uno dos tres cuatro cinco seis siete ocho',
  'nueve diez once doce trece catorce quince dieciseis',
  'diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro',
  'veinticinco veintiseis veintisiete veintiocho veintinueve treinta treintaiuno treintaidos'
]

async function abrirYLeer(motor: MotorDeLaPausa) {
  const repo = new RepositorioMemoria()
  await repo.guardar({
    id: 'g-85', titulo: 'Guion Tarea 85', idioma: 'es', creado: Date.now(), modificado: Date.now(),
    archivado: false, bloques: [{ id: 'b1', nombre: '', texto: LINEAS.join('\n') }]
  } as any)
  const r = render(<App repoOverride={repo} motor={motor} />)
  fireEvent.click(await screen.findByTestId('btn-leer-tarjeta'))
  fireEvent.click(await screen.findByTestId('btn-empezar-toma'))
  await esperar(3200)
  return r
}

function renglonResaltado(container: HTMLElement): number {
  const el = container.querySelector('[data-testid="teleprompter-view-container"]')
  if (!el) return -1
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'))
  let fiber = key ? (el as any)[key] : null
  while (fiber) {
    if (fiber.memoizedProps && typeof fiber.memoizedProps.currentLineIndex === 'number') return fiber.memoizedProps.currentLineIndex
    fiber = fiber.return
  }
  return -1
}

async function mostrarControles(container: HTMLElement) {
  const texto = container.querySelector('[data-testid="contenedor-lectura"]')!
  if (!screen.queryByTestId('btn-pausa-lectura')) tocar(texto)
  return screen.findByTestId('btn-pausa-lectura')
}

describe('Tarea 85 - Pausa y Seguir a través de la aplicación', () => {
  // La geometría del texto: ocho palabras por renglón -los renglones de LINEAS- y 200 px entre
  // renglones, más que cualquier letra, para que agruparEnRenglones los separe con cualquier
  // tamaño guardado.
  let origClientHeight: PropertyDescriptor | undefined
  let origOffsetTop: PropertyDescriptor | undefined
  beforeEach(() => {
    localStorage.clear()
    origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    origOffsetTop = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetTop')
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 720 } })
    Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        const t = this.dataset && this.dataset.token
        return t === undefined ? 0 : Math.floor(Number(t) / 8) * 200
      }
    })
  })
  afterEach(() => {
    if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
    else delete (window.HTMLElement.prototype as any).clientHeight
    if (origOffsetTop) Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', origOffsetTop)
    else delete (window.HTMLElement.prototype as any).offsetTop
  })

  test('T85b Tocar el texto, Pausa, tocar el texto y Seguir altiro -antes de 350 ms-: el texto vuelve a acompañar la voz sin arrastrarlo, y el renglón no vuelve atrás.', async () => {
    const motor = new MotorDeLaPausa([LINEAS[0], LINEAS[1], LINEAS[2]])
    const { container } = await abrirYLeer(motor)
    const texto = container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
    await act(async () => { motor.emitirSiguiente() })
    await act(async () => { motor.emitirSiguiente() })
    await waitFor(() => expect(renglonResaltado(container)).toBe(1), { timeout: 3000 })
    // La prueba vale solo si antes de tocar nada el texto sí se desplaza con la voz.
    await waitFor(() => expect(texto.scrollTop).toBeGreaterThan(0), { timeout: 3000 })

    // Pausa: primero el toque que trae los controles.
    fireEvent.click(await mostrarControles(container))
    await esperar(600)
    expect(renglonResaltado(container)).toBe(1)

    // Seguir: otra vez el toque que trae los controles -dos toques si quedaron a la vista: uno los
    // esconde y otro los trae- y Seguir en seguida, como se hace con el pulgar.
    tocar(texto)
    const seguir = await mostrarControles(container)
    await act(async () => { fireEvent.click(seguir) })
    await esperar(600)
    expect(renglonResaltado(container)).toBe(1)
    const alSeguir = texto.scrollTop

    // La persona lee el renglón siguiente: el texto tiene que subir solo. Antes quedaba quieto
    // -modoManualRef pegado en true- hasta que alguien lo arrastrara.
    await act(async () => { motor.emitirSiguiente() })
    await waitFor(() => expect(renglonResaltado(container)).toBe(2), { timeout: 3000 })
    await waitFor(() => expect(texto.scrollTop).toBeGreaterThan(alSeguir), { timeout: 3000 })
  }, 20000)

  test('T85d Seguir mientras Pausa todavía está apagando el micrófono: Seguir espera a que termine de apagarse y recién ahí lo vuelve a prender.', async () => {
    const motor = new MotorDeLaPausa([LINEAS[0], LINEAS[1]])
    const { container } = await abrirYLeer(motor)
    motor.orden = []
    motor.msDetener = 300

    fireEvent.click(await mostrarControles(container))
    await esperar(50)
    // Pausa sigue apagando -300 ms-: Seguir llega antes.
    await act(async () => { fireEvent.click(screen.getByTestId('btn-pausa-lectura')) })
    await esperar(700)

    // Antes: ['detener', 'iniciar', 'detenido']. En el teléfono, el detener() atrasado de
    // MotorNativo sacaba las suscripciones que el iniciar() recién había puesto: Vosk escuchaba
    // y nadie oía sus frases.
    expect(motor.orden).toEqual(['detener', 'detenido', 'iniciar'])
    expect(screen.getByTestId('btn-pausa-lectura').getAttribute('aria-label')).not.toBe(null)
  }, 20000)
})
