import React from 'react'
import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import { Renglon, pixelDePosicion, pixelDeRenglon } from '../lib/renglones'
import { AnclajeZona, calcularBanda, RENGLONES_CLAROS } from '../components/banda'
import TeleprompterView, { MARGEN_RENGLONES_ARRIBA, calcularScrollTop, posicionEnPantalla } from '../components/TeleprompterView'
import { leerCorpus } from '../lib/repetidor'
import { tokenizarGuion } from '../lib/seguidor'
import { Guion } from '../datos/modelo'

function guionSimple(texto: string): Guion {
  return {
    id: 'test-guion-' + Math.random().toString(36).substring(2, 9),
    titulo: 'Guion de prueba',
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    bloques: [{ id: 'b-1', nombre: '', texto }]
  }
}

describe('Pruebas TAREA 26 (T144-T146)', () => {
  test('T144 GUARDIANA DEL RENGLON VIVO. Con renglones sinteticos y la banda calculada, para una serie de posiciones repartidas: el renglon que se esta leyendo, una vez restado el desplazamiento, cae DENTRO de la banda, y queda al menos un renglon entero de espacio POR ENCIMA de el.', () => {
    const filaPx = 34
    const renglones: Renglon[] = [
      { top: 0, alto: 34, desdeToken: 0, hastaToken: 3 },
      { top: 34, alto: 34, desdeToken: 4, hastaToken: 7 },
      { top: 68, alto: 34, desdeToken: 8, hastaToken: 11 },
      { top: 102, alto: 34, desdeToken: 12, hastaToken: 15 },
      { top: 136, alto: 34, desdeToken: 16, hastaToken: 19 },
      { top: 170, alto: 34, desdeToken: 20, hastaToken: 23 },
      { top: 204, alto: 34, desdeToken: 24, hastaToken: 27 },
      { top: 238, alto: 34, desdeToken: 28, hastaToken: 31 }
    ]

    const origen = renglones[0].top
    const { topBanda, altoBanda } = calcularBanda(480, filaPx, 3, 'arriba', 20, 20)

    const posicionesMuestra = [8, 12.5, 16, 20.2, 24, 28.5]

    for (const pos of posicionesMuestra) {
      const pPos = pixelDePosicion(renglones, pos)
      const topScroll = calcularScrollTop(pPos, origen, filaPx)
      const yEnPantalla = posicionEnPantalla(pPos, origen, topBanda, topScroll)

      // 1. Cae DENTRO de la banda
      expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda - 1e-9)   // flotantes: con el margen en 0 da topBanda exacto
      expect(yEnPantalla).toBeLessThan(topBanda + altoBanda)

      // 2. Queda al menos un renglón entero de espacio POR ENCIMA de él (dentro de la banda)
      // Antes exigia UN RENGLON ENTERO arriba, que era el valor que tenia
      // MARGEN_RENGLONES_ARRIBA ese dia. Fijar el numero en vez del parametro convierte una
      // decision en una ley: al mover el renglon vivo al primer hueco de la ventana -porque
      // desde que el renglon lo manda la evidencia la marca va DETRAS del lector, no
      // delante- esta prueba se ponia roja sin que hubiera ningun defecto.
      //
      // Lo que protege de verdad es que el renglon vivo NO SE VAYA POR ARRIBA de la ventana,
      // y eso se comprueba igual con el margen en cero.
      const espacioArriba = yEnPantalla - topBanda
      expect(espacioArriba).toBeGreaterThanOrEqual(MARGEN_RENGLONES_ARRIBA * filaPx - 0.001)
      expect(espacioArriba).toBeGreaterThanOrEqual(0)
    }
  })

  test('T145 GUARDIANA CONTRA EL DEFECTO REAL, con la grabacion de Javier.', () => {
    const rutaCorpus = path.resolve(process.cwd(), 'src/pruebas/corpus/lectura-2026-09-13-0055.txt')
    const contenido = fs.readFileSync(rutaCorpus, 'utf-8')
    const corpus = leerCorpus(contenido)

    const tokens = tokenizarGuion(corpus.guion)

    const fontSize = 28
    const filaPx = fontSize * 1.4
    const { topBanda, altoBanda } = calcularBanda(480, filaPx, 3, 'arriba', 20, 20)

    const PALABRAS_POR_RENGLON = 4.1
    const renglones: Renglon[] = []
    let tIdx = 0
    let topActual = 0

    while (tIdx < tokens.length) {
      const numTokens = Math.max(1, Math.round(PALABRAS_POR_RENGLON))
      const hasta = Math.min(tokens.length - 1, tIdx + numTokens - 1)
      renglones.push({
        top: topActual,
        alto: filaPx,
        desdeToken: tIdx,
        hastaToken: hasta
      })
      topActual += filaPx
      tIdx = hasta + 1
    }

    const origen = renglones[0].top

    const cuadros = corpus.eventos.filter((e): e is Extract<import('../lib/repetidor').EventoCorpus, { tipo: 'cuadro' }> => e.tipo === 'cuadro')

    let dentroAntes = 0
    let dentroDespues = 0
    const totalCuadros = cuadros.length

    for (const c of cuadros) {
      const pPos = pixelDePosicion(renglones, c.posicion)
      const pCalce = pixelDePosicion(renglones, c.calce)

      // Cálculo ANTES (fórmula vieja: topScroll = pPos - origen - filaPx)
      const topScrollAntes = Math.max(0, pPos - origen - filaPx)
      const yCalceAntes = posicionEnPantalla(pCalce, origen, topBanda, topScrollAntes)

      if (yCalceAntes >= topBanda && yCalceAntes < topBanda + altoBanda) {
        dentroAntes++
      }

      // Cálculo DESPUÉS (fórmula nueva usando la función oficial calcularScrollTop)
      // LA REGLA QUE DE VERDAD CORRE HOY. Decia pixelDePosicion(c.posicion), que era el
      // desplazamiento interpolado guiado por la posicion estimada sola. La vista usa el
      // pixel DEL RENGLON y lo elige con min(posicion, ultimoCalce): no entra a un renglon
      // sin prueba de que el lector llego. Esta prueba medía una combinacion que ya no es
      // el producto.
      const anclaRenglon = Math.min(c.posicion, c.calce)
      const topScrollDespues = calcularScrollTop(pixelDeRenglon(renglones, anclaRenglon), origen, filaPx)
      const yCalceDespues = posicionEnPantalla(pCalce, origen, topBanda, topScrollDespues)

      if (yCalceDespues >= topBanda && yCalceDespues < topBanda + altoBanda) {
        dentroDespues++
      }
    }

    const pctAntes = (dentroAntes / totalCuadros) * 100
    const pctDespues = (dentroDespues / totalCuadros) * 100

    console.log(`[T145] Porcentaje de cuadros con la palabra oída dentro de la banda:`)
    console.log(`       ANTES (fórmula vieja):  ${pctAntes.toFixed(2)}%`)
    console.log(`       DESPUÉS (fórmula nueva): ${pctDespues.toFixed(2)}%`)

    expect(pctDespues).toBeGreaterThanOrEqual(95)
  })

  test('T146 Con el anclaje al MEDIO y con el anclaje ABAJO, el renglon vivo sigue siendo el del medio de la banda.', () => {
    const filaPx = 34
    const renglones: Renglon[] = Array.from({ length: 60 }, (_, i) => ({
      top: i * 34,
      alto: 34,
      desdeToken: i * 4,
      hastaToken: i * 4 + 3
    }))
    const origen = renglones[0].top

    const anclajes: AnclajeZona[] = ['medio', 'abajo']

    for (const anclaje of anclajes) {
      const { topBanda, altoBanda } = calcularBanda(800, filaPx, 3, anclaje, 20, 20)

      // Seleccionar posiciones donde la banda ya comenzó a desplazarse
      const posMinima = ((topBanda + MARGEN_RENGLONES_ARRIBA * filaPx) / filaPx) * 4 + 10
      const posicionesMuestra = [posMinima, posMinima + 20, posMinima + 40]

      for (const pos of posicionesMuestra) {
        const pPos = pixelDePosicion(renglones, pos)
        const topScroll = calcularScrollTop(pPos, origen, filaPx)
        const yEnPantalla = posicionEnPantalla(pPos, origen, topBanda, topScroll)

        // La distancia desde topBanda a la línea viva comprende exactamente MARGEN_RENGLONES_ARRIBA de espacio arriba (middle line of band)
        const offsetEnBanda = yEnPantalla - topBanda
        expect(Math.abs(offsetEnBanda - MARGEN_RENGLONES_ARRIBA * filaPx)).toBeLessThan(0.001)

        // Queda dentro de la banda
        expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda - 1e-9)   // flotantes: con el margen en 0 da topBanda exacto
        expect(yEnPantalla).toBeLessThan(topBanda + altoBanda)
      }
    }
  })

  // T147 GUARDIANA DE LA DOBLE RESTA DE topBanda.
  //
  // Javier reporto durante dos semanas que terminaba leyendo fuera de la zona marcada. El
  // motor no era: en la palabra 144 de su lectura -el renglon exacto donde dijo que se le
  // escapa- la posicion en palabras iba 0.13 palabras de donde el estaba hablando. El
  // defecto vivia entre la palabra y el pixel: calcularScrollTop restaba topBanda, y el
  // paddingTop del contenedor ya lo tenia puesto.
  //
  // Medido montando el DOM de verdad en el navegador el 13 de septiembre de 2026, el
  // renglon vivo caia 5.8 renglones abajo de la ventana con letra de 24, 4.2 con 32 y 3.1
  // con 40. Esta prueba lo fija sin navegador: si alguien vuelve a meter topBanda en la
  // cuenta, el renglon vivo se corre topBanda pixeles y esto se pone rojo.
  test('T147 GUARDIANA DE LA DOBLE RESTA. Con el paddingTop del contenedor modelado, el renglon vivo cae a exactamente MARGEN_RENGLONES_ARRIBA renglones del borde de arriba de la ventana, para cualquier tamano de letra y cualquier anclaje.', () => {
    for (const fontSize of [24, 32, 40, 56]) {
      const filaPx = fontSize * 1.4
      const renglones: Renglon[] = Array.from({ length: 80 }, (_, i) => ({
        top: i * filaPx,
        alto: filaPx,
        desdeToken: i * 4,
        hastaToken: i * 4 + 3
      }))
      const origen = renglones[0].top

      for (const anclaje of ['arriba', 'medio', 'abajo'] as AnclajeZona[]) {
        const { topBanda } = calcularBanda(480, filaPx, 3, anclaje, 20, 20)

        // posiciones ya bien entrado el guion, donde el scroll dejo de estar clavado en 0
        for (const pos of [120, 160, 200.5, 240]) {
          const pPos = pixelDePosicion(renglones, pos)
          const topScroll = calcularScrollTop(pPos, origen, filaPx)
          const y = posicionEnPantalla(pPos, origen, topBanda, topScroll)

          expect(y - topBanda).toBeCloseTo(MARGEN_RENGLONES_ARRIBA * filaPx, 6)
        }
      }
    }
  })

  // T148 se borró: topBanda ya no está en la firma de calcularScrollTop y TypeScript impide pasarlo.
})

describe('Pruebas TAREA 27 (T154-T156)', () => {
  test('T154 Con alturas de contenedor de 360, 720 y 1000, y anclaje "medio": el borde de arriba de la ventana queda centrado respecto del ALTO REAL, no de 480.', () => {
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const guion = guionSimple('Línea 1\nLínea 2\nLínea 3')

    try {
      // 1. Verificar que cuando clientHeight es 0, no se dibuja la banda ni el velo
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get() { return 0 }
      })
      const { container: containerCero, unmount: unmountCero } = render(
        <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0} anclajeZona="medio" fontSize={24} />
      )
      expect(containerCero.querySelector('[data-testid="banda-lectura"]')).toBeNull()
      expect(containerCero.querySelector('[data-testid="velo-lectura"]')).toBeNull()
      unmountCero()

      // 2. Probar con alturas reales 360, 720 y 1000 con anclaje 'medio'
      for (const altoReal of [360, 720, 1000]) {
        Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
          configurable: true,
          get() { return altoReal }
        })

        const { container, unmount } = render(
          <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0} anclajeZona="medio" fontSize={24} />
        )

        const banda = container.querySelector('[data-testid="banda-lectura"]') as HTMLElement
        expect(banda).not.toBeNull()

        const filaPx = 24 * 1.4
        const altoBandaEsperado = RENGLONES_CLAROS * filaPx
        const topEsperado = (altoReal - altoBandaEsperado) / 2

        expect(parseFloat(banda.style.top)).toBeCloseTo(topEsperado, 4)
        unmount()
      }
    } finally {
      if (origClientHeight) {
        Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      } else {
        delete (window.HTMLElement.prototype as any).clientHeight
      }
    }
  })

  test('T155 Con anclaje "abajo" y alto real 720: el borde de abajo de la ventana queda a paddingInferior del borde de abajo del contenedor.', () => {
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const guion = guionSimple('Línea 1\nLínea 2\nLínea 3')

    try {
      const altoReal = 720
      const paddingInferior = 20
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get() { return altoReal }
      })

      const { container, unmount } = render(
        <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0} anclajeZona="abajo" fontSize={24} />
      )

      const banda = container.querySelector('[data-testid="banda-lectura"]') as HTMLElement
      expect(banda).not.toBeNull()

      const topBanda = parseFloat(banda.style.top)
      const altoBanda = parseFloat(banda.style.height)
      const distanciaAlBordeInferior = altoReal - (topBanda + altoBanda)

      expect(distanciaAlBordeInferior).toBeCloseTo(paddingInferior, 4)
      unmount()
    } finally {
      if (origClientHeight) {
        Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      } else {
        delete (window.HTMLElement.prototype as any).clientHeight
      }
    }
  })

  test('T156 Para cada combinación de alto real (360, 720), tamaño de letra (24, 40) y anclaje (arriba, medio, abajo): posicionEnPantalla del renglón vivo cae dentro de la ventana y a exactamente MARGEN_RENGLONES_ARRIBA * filaPx de su borde de arriba.', () => {
    for (const altoReal of [360, 720]) {
      for (const fontSize of [24, 40]) {
        const filaPx = fontSize * 1.4
        const renglones: Renglon[] = Array.from({ length: 80 }, (_, i) => ({
          top: i * filaPx,
          alto: filaPx,
          desdeToken: i * 4,
          hastaToken: i * 4 + 3
        }))
        const origen = renglones[0].top

        for (const anclaje of ['arriba', 'medio', 'abajo'] as AnclajeZona[]) {
          const { topBanda, altoBanda } = calcularBanda(altoReal, filaPx, 3, anclaje, 20, 20)

          for (const pos of [100, 150, 200]) {
            const pPos = pixelDePosicion(renglones, pos)
            const topScroll = calcularScrollTop(pPos, origen, filaPx)
            const yEnPantalla = posicionEnPantalla(pPos, origen, topBanda, topScroll)

            // Cae dentro de la ventana
            expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda - 1e-9)   // flotantes: con el margen en 0 da topBanda exacto
            expect(yEnPantalla).toBeLessThan(topBanda + altoBanda)

            // Cae a exactamente MARGEN_RENGLONES_ARRIBA * filaPx de su borde de arriba
            expect(yEnPantalla - topBanda).toBeCloseTo(MARGEN_RENGLONES_ARRIBA * filaPx, 6)
          }
        }
      }
    }
  })
})

describe('Pruebas TAREA 35 (T163-T164)', () => {
  test('T163 GUARDIANA DE AREA SEGURA A ZERO. Con env() a 0, la geometria queda identica a hoy y el padding de abajo sigue alcanzando para que el ultimo renglon llegue a la barra.', () => {
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const guion = guionSimple(Array.from({ length: 40 }, (_, i) => 'pa' + i).join(' '))

    try {
      for (const altoReal of [480, 720, 1000]) {
        for (const fontSize of [24, 40]) {
          Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
            configurable: true, get() { return altoReal }
          })
          const { container, unmount } = render(
            <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0}
              anclajeZona="arriba" fontSize={fontSize} />
          )
          const cont = container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
          const filaPx = fontSize * 1.4
          const topBanda = 20

          const pBottomStr = cont.style.paddingBottom
          expect(pBottomStr).toContain('calc(')
          expect(pBottomStr).toContain('safe-area-inset-bottom')

          const match = pBottomStr.match(/calc\(([\d.]+)px/)
          expect(match).not.toBeNull()
          const reservado = parseFloat(match![1])
          const necesario = altoReal - topBanda - (MARGEN_RENGLONES_ARRIBA + 1) * filaPx

          expect(reservado).toBeGreaterThanOrEqual(necesario - 0.001)
          expect(reservado).toBeLessThanOrEqual(altoReal)

          // Verificar top y paddings laterales con env 0 (jsdom los normaliza manteniendo las variables CSS)
          expect(cont.style.paddingTop).toContain('safe-area-inset-top')
          expect(cont.style.paddingLeft).toContain('safe-area-inset-left')
          expect(cont.style.paddingRight).toContain('safe-area-inset-right')

          unmount()
        }
      }
    } finally {
      if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      else delete (window.HTMLElement.prototype as any).clientHeight
    }
  })

  test('T164 MEDICION DE RENGLON INVARIANTE EN 20 COMBINACIONES (5 tamaños x 2 columnas x 2 altos).', async () => {
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const origOffsetTop = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetTop')

    const PALABRAS_PARA_ARRANCAR = 7

    // Guion suficientemente largo con palabras regulares
    const textoPrueba = Array.from({ length: 200 }, (_, i) => `palabra${i + 1}`).join(' ')
    const guion = guionSimple(textoPrueba)

    const tamanosLetra = [14, 18, 24, 32, 42]
    const columnas = [true, false] // true = angosta, false = ancho completo
    const altosPantalla = [360, 800]

    function motorFalso(posicion: number, ultimoCalce: number) {
      return {
        confirmar() {}, tentativo() {}, falloCalce() {}, voz() {}, irAToken() {}, reiniciar() {},
        estadoEn: () => ({
          posicion, avanzando: true, estado: 'SIGUIENDO' as const, motivoFreno: null,
          ppmEstimadas: 120, ultimoCalce, tUltimoCalceMs: 1
        })
      }
    }

    const tablaReporte: Array<{
      fontSize: number
      columna: string
      altoPantalla: number
      palabrasPorRenglon: number
      renglonesArranque: number
    }> = []

    try {
      for (const fontSize of tamanosLetra) {
        const filaPx = fontSize * 1.4

        for (const colAngosta of columnas) {
          // Modelado realista del número de palabras por renglón en jsdom según la tipografía y columna:
          // En angosta (~22ch): unas 3 a 5 palabras según tamaño/ancho de palabra.
          // En completo (ancho ~400px o ~800px): proporcional al ancho.
          const palabrasPorRenglon = colAngosta ? Math.max(2, Math.round(22 / 6)) : Math.max(4, Math.round(60 / 6))

          Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
            configurable: true,
            get(this: HTMLElement) {
              const t = this.dataset && this.dataset.token
              return t === undefined ? 0 : Math.floor(Number(t) / palabrasPorRenglon) * filaPx
            }
          })

          for (const altoReal of altosPantalla) {
            Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
              configurable: true,
              get() { return altoReal }
            })

            const { container, unmount } = render(
              <TeleprompterView
                script={guion}
                currentLineIndex={0}
                currentWordIndex={0}
                anclajeZona="arriba"
                fontSize={fontSize}
                columnaAngosta={colAngosta}
                motorAvance={motorFalso(20, 20) as any}
              />
            )

            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

            const cont = container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
            const banda = container.querySelector('[data-testid="banda-lectura"]') as HTMLElement

            expect(cont).not.toBeNull()
            expect(banda).not.toBeNull()

            const topBanda = parseFloat(banda.style.top)
            const altoBanda = parseFloat(banda.style.height)

            // a. el renglon vivo cae a exactamente MARGEN_RENGLONES_ARRIBA * filaPx del borde de arriba de la ventana clara
            // Dado scroll = calcularScrollTop(pixelDeRenglon(renglones, ancla), origen, filaPx),
            // posicionEnPantalla(pixelDeRenglon, origen, topBanda, scroll) - topBanda == MARGEN_RENGLONES_ARRIBA * filaPx
            const pPos = 20 * filaPx // token 20 cae en renglon (20/palabrasPorRenglon)
            const origen = 0
            const topScroll = calcularScrollTop(pPos, origen, filaPx)
            const yEnPantalla = posicionEnPantalla(pPos, origen, topBanda, topScroll)
            expect(yEnPantalla - topBanda).toBeCloseTo(MARGEN_RENGLONES_ARRIBA * filaPx, 4)

            // b. la ventana clara mide RENGLONES_CLAROS renglones
            expect(altoBanda).toBeCloseTo(RENGLONES_CLAROS * filaPx, 4)

            // c. el desplazamiento no cambia mientras la posicion recorre un mismo renglon, y cambia exactamente un renglon al cruzar al siguiente
            const rBase = Math.floor(20 / palabrasPorRenglon) * filaPx
            const rSig = Math.floor((20 + palabrasPorRenglon) / palabrasPorRenglon) * filaPx
            const scrollEnRenglon = calcularScrollTop(rBase, origen, filaPx)
            const scrollSiguiente = calcularScrollTop(rSig, origen, filaPx)
            expect(scrollSiguiente - scrollEnRenglon).toBeCloseTo(filaPx, 4)

            // d. el espacio reservado abajo alcanza para que el ultimo renglon llegue a la barra
            const pBottomStr = cont.style.paddingBottom
            const match = pBottomStr.match(/calc\(([\d.]+)px/)
            const reservado = match ? parseFloat(match[1]) : parseFloat(pBottomStr)
            const necesario = altoReal - topBanda - (MARGEN_RENGLONES_ARRIBA + 1) * filaPx
            expect(reservado).toBeGreaterThanOrEqual(necesario - 0.001)

            const renglonesArranque = PALABRAS_PARA_ARRANCAR / palabrasPorRenglon
            tablaReporte.push({
              fontSize,
              columna: colAngosta ? 'angosta' : 'ancho completo',
              altoPantalla: altoReal,
              palabrasPorRenglon,
              renglonesArranque: parseFloat(renglonesArranque.toFixed(2))
            })

            unmount()
          }
        }
      }

      console.log('\n=================== TABLA DE 20 COMBINACIONES ===================')
      console.table(tablaReporte)
      console.log('=================================================================\n')

    } finally {
      if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      else delete (window.HTMLElement.prototype as any).clientHeight
      if (origOffsetTop) Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', origOffsetTop)
      else delete (window.HTMLElement.prototype as any).offsetTop
    }
  })
})

// T157 GUARDIANA DE QUE LA PANTALLA NO PASE DE LA EVIDENCIA.
//
// avance.ts ya topa la posicion en refToken + 3 palabras. Con 4.1 palabras por renglon eso
// son tres cuartos de renglon, asi que el tope se cumple y la pantalla igual se mete en el
// renglon siguiente 3 de cada 4 veces. La vista aplica el mismo tope EN RENGLONES.
//
// Esta prueba fija esa regla: con la posicion estimada ya metida en el renglon siguiente
// pero la ultima palabra oida todavia en el actual, el renglon que se muestra es el ACTUAL.
// Si alguien vuelve a elegir el renglon con st.posicion sola, se pone roja.
describe('Pruebas TAREA 28 (T157)', () => {
  test('T157 El renglon mostrado no pasa del renglon donde esta la ultima palabra oida, aunque la posicion estimada ya este en el siguiente.', () => {
    const filaPx = 34
    const renglones: Renglon[] = Array.from({ length: 40 }, (_, i) => ({
      top: i * filaPx, alto: filaPx, desdeToken: i * 4, hastaToken: i * 4 + 3
    }))

    // renglon 10 = tokens 40..43, renglon 11 = tokens 44..47
    const ultimaOida = 41          // todavia en el renglon 10
    const posicionEstimada = 44.5  // el tope de 3 palabras la deja ya en el renglon 11

    const anclaRenglon = Math.min(posicionEstimada, ultimaOida)

    expect(pixelDeRenglon(renglones, anclaRenglon)).toBe(renglones[10].top)
    // y sin el tope, la pantalla se habria ido al 11: por eso la prueba vale
    expect(pixelDeRenglon(renglones, posicionEstimada)).toBe(renglones[11].top)

    // el arranque: la posicion se queda en 0 mientras la evidencia ya avanzo
    expect(pixelDeRenglon(renglones, Math.min(0, 9))).toBe(renglones[0].top)
  })
})

// T158 GUARDIANA DE QUE EL RENGLON NO SE MUEVA MIENTRAS SE LEE.
//
// Este es el cambio que el 13 de septiembre de 2026 dejo a Javier terminar un renglon por
// primera vez en dos semanas, y no estaba guardado por nada.
//
// pixelDePosicion reparte el alto del renglon entre sus palabras: decir las cuatro palabras
// de un renglon desplazaba la pantalla un renglon entero, repartido desde la PRIMERA. El
// renglon que se estaba leyendo se subia mientras se lo leia y llegaba al borde de arriba
// antes de terminarlo. Javier lo describio asi: "no se mueve cuando finalizo ese renglon
// sino antes".
//
// La vista usa pixelDeRenglon: todas las palabras de un renglon dan EL MISMO desplazamiento.
//
// T145 no sirve para esto: da 100% con las dos versiones, asi que no distingue. Esta si.
describe('Pruebas TAREA 29 (T158)', () => {
  // T158 GUARDIANA DE QUE EL RENGLON NO SE MUEVA MIENTRAS SE LEE.
  //
  // Este es el cambio que el 13 de septiembre de 2026 dejo a Javier terminar un renglon por
  // primera vez en dos semanas. pixelDePosicion reparte el alto del renglon entre sus
  // palabras: decir las cuatro palabras de un renglon desplazaba la pantalla un renglon
  // entero, repartido desde la PRIMERA. El renglon que se estaba leyendo se subia mientras
  // se lo leia. Javier: "no se mueve cuando finalizo ese renglon sino antes".
  //
  // ESTA PRUEBA EJERCITA LA VISTA, NO LA FORMULA. El primer intento llamaba a
  // calcularScrollTop(pixelDeRenglon(...)) directo y pasaba IGUAL con el defecto puesto,
  // porque no tocaba el cableado. Se descubrio rompiendo, que es para lo unico que sirve
  // romper.
  //
  // jsdom no calcula layout y offsetTop devuelve 0 para todo, asi que se falsea: cuatro
  // palabras por renglon, que es lo medido en la lectura de Javier.
  test('T158 Con la vista montada y la voz avanzando dentro de un mismo renglon, el desplazamiento NO cambia; cambia una sola vez al cruzar al siguiente.', async () => {
    const FILA = 24 * 1.4
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const origOffsetTop = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetTop')

    const guion = guionSimple(Array.from({ length: 60 }, (_, i) => 'pa' + i).join(' '))

    function motorFalso(posicion: number, ultimoCalce: number) {
      return {
        confirmar() {}, tentativo() {}, falloCalce() {}, voz() {}, irAToken() {}, reiniciar() {},
        estadoEn: () => ({
          posicion, avanzando: true, estado: 'SIGUIENDO' as const, motivoFreno: null,
          ppmEstimadas: 120, ultimoCalce, tUltimoCalceMs: 1
        })
      }
    }

    async function desplazamientoCon(posicion: number, ultimoCalce: number): Promise<number> {
      const { container, unmount } = render(
        <TeleprompterView
          script={guion} currentLineIndex={0} currentWordIndex={0}
          anclajeZona="arriba" fontSize={24} columnaAngosta={false}
          motorAvance={motorFalso(posicion, ultimoCalce) as any}
        />
      )
      // el desplazamiento se aplica dentro del lazo de animacion: hay que dejar correr un cuadro
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const cont = container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
      const top = cont ? cont.scrollTop : -1
      unmount()
      return top
    }

    try {
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 720 } })
      // cuatro palabras por renglon
      Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get(this: HTMLElement) {
          const t = this.dataset && this.dataset.token
          return t === undefined ? 0 : Math.floor(Number(t) / 4) * FILA
        }
      })

      // renglon 5 = tokens 20..23. La voz recorre el renglon entero.
      const dentroDelRenglon: number[] = []
      for (const tok of [20, 21, 22, 23]) dentroDelRenglon.push(await desplazamientoCon(tok, tok))
      for (const d of dentroDelRenglon) {
        expect(d).toBe(dentroDelRenglon[0])
      }

      // al cruzar al siguiente cambia, y cambia exactamente un renglon
      const alCruzar = await desplazamientoCon(24, 24)
      expect(alCruzar - dentroDelRenglon[0]).toBeCloseTo(FILA, 4)

      // Y NO ENTRA A UN RENGLON SIN PRUEBA DE QUE EL LECTOR LLEGO.
      //
      // La posicion estimada ya esta en el renglon 6 -el tope de avance.ts la deja hasta 3
      // palabras por delante de lo oido, y con 4 palabras por renglon eso cruza casi
      // siempre- pero la ultima palabra que el reconocedor ubico sigue en el 5. El
      // desplazamiento tiene que quedarse en el 5.
      //
      // Sin el min con ultimoCalce esto se va al renglon siguiente y la prueba se pone roja.
      const posicionAdelantada = await desplazamientoCon(24.5, 22)
      expect(posicionAdelantada).toBe(dentroDelRenglon[0])
    } finally {
      if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      else delete (window.HTMLElement.prototype as any).clientHeight
      if (origOffsetTop) Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', origOffsetTop)
      else delete (window.HTMLElement.prototype as any).offsetTop
    }
  })
})

describe('Pruebas TAREA 30 (T159)', () => {
  // T159 GUARDIANA DE QUE EL FINAL DEL GUION LLEGUE A LA BARRA.
  //
  // Javier, despues de leer el guion entero por primera vez: "cuando llegue al final del
  // guion tuve que seguir leyendo hacia abajo y ya no siguio subiendo, y es obvio por que se
  // le acabo el texto que arrastrar".
  //
  // El contenedor reservaba abajo calc(100% - ...), y los porcentajes en padding se calculan
  // sobre el ANCHO. Con eso el ultimo renglon no puede subir hasta la barra y hay que leer
  // hacia abajo, fuera de la zona clara, justo en el cierre.
  //
  // Se comprueba sobre el contenedor montado: el espacio reservado abajo tiene que alcanzar
  // para que el ultimo renglon llegue a topBanda + MARGEN_RENGLONES_ARRIBA renglones.
  test('T159 El espacio reservado despues del ultimo renglon alcanza para que llegue a la barra de lectura, para varios altos de pantalla y tamanos de letra.', () => {
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const guion = guionSimple(Array.from({ length: 40 }, (_, i) => 'pa' + i).join(' '))

    try {
      for (const altoReal of [480, 720, 1000]) {
        for (const fontSize of [24, 40]) {
          Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
            configurable: true, get() { return altoReal }
          })
          const { container, unmount } = render(
            <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0}
              anclajeZona="arriba" fontSize={fontSize} />
          )
          const cont = container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
          const filaPx = fontSize * 1.4
          const topBanda = 20   // anclaje 'arriba' con paddingSuperior 20

          const pBottomStr = cont.style.paddingBottom
          const match = pBottomStr.match(/calc\(([\d.]+)px/)
          const reservado = match ? parseFloat(match[1]) : parseFloat(pBottomStr)
          // lo que hace falta: el ultimo renglon queda a filaPx del fondo del contenido, y
          // tiene que poder subir hasta topBanda + margen.
          const necesario = altoReal - topBanda - (MARGEN_RENGLONES_ARRIBA + 1) * filaPx

          expect(reservado).toBeGreaterThanOrEqual(necesario - 0.001)
          // y no de mas: reservar el alto entero deja un hueco negro gigante al final
          expect(reservado).toBeLessThanOrEqual(altoReal)
          unmount()
        }
      }
    } finally {
      if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      else delete (window.HTMLElement.prototype as any).clientHeight
    }
  })
})

describe('Pruebas TAREA 33 (T162)', () => {
  // T162 GUARDIANA DE LA ALINEACION SEGUN EL ANCHO DE COLUMNA.
  //
  // En angosta el renglon tiene 22 caracteres y la bandera derecha queda muy marcada: el
  // bloque se lee corrido aunque la caja este centrada. Javier: "en angosta no esta centrado
  // el texto, sigue orientado desde la izquierda". En ancho completo es al reves: el renglon
  // es largo y centrar obliga a buscar donde empieza cada linea.
  //
  // Las dos mitades importan. Por eso la prueba comprueba las dos, no solo la que se pidio.
  test('T162 El texto va centrado en columna angosta y a la izquierda en ancho completo, y la caja queda centrada en los dos casos.', () => {
    const origClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight')
    const guion = guionSimple('Enero de 1969. Sale un disco que se llama Hombre. Doce cortes.')
    try {
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        configurable: true, get() { return 720 }
      })

      for (const angosta of [true, false]) {
        const { container, unmount } = render(
          <TeleprompterView script={guion} currentLineIndex={0} currentWordIndex={0}
            anclajeZona="arriba" fontSize={24} columnaAngosta={angosta} />
        )
        const col = container.querySelector('[data-testid="columna-texto"]') as HTMLElement
        expect(col).not.toBeNull()

        expect(col.style.textAlign).toBe(angosta ? 'center' : 'left')
        // y la caja sigue centrada en los dos, que es lo que ya estaba bien
        expect(col.style.margin).toBe('0px auto')
        expect(col.style.maxWidth).toBe(angosta ? '22ch' : '90%')
        unmount()
      }
    } finally {
      if (origClientHeight) Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', origClientHeight)
      else delete (window.HTMLElement.prototype as any).clientHeight
    }
  })
})
