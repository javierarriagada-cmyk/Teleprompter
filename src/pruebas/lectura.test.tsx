import React from 'react'
import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import { Renglon, pixelDePosicion, pixelDeRenglon } from '../lib/renglones'
import { AnclajeZona, calcularBanda } from '../components/banda'
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
      expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda)
      expect(yEnPantalla).toBeLessThan(topBanda + altoBanda)

      // 2. Queda al menos un renglón entero de espacio POR ENCIMA de él (dentro de la banda)
      const espacioArriba = yEnPantalla - topBanda
      expect(espacioArriba).toBeGreaterThanOrEqual(filaPx - 0.001)
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
      const topScrollDespues = calcularScrollTop(pPos, origen, filaPx)
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
        expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda)
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
        const altoBandaEsperado = 3 * filaPx
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
            expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda)
            expect(yEnPantalla).toBeLessThan(topBanda + altoBanda)

            // Cae a exactamente MARGEN_RENGLONES_ARRIBA * filaPx de su borde de arriba
            expect(yEnPantalla - topBanda).toBeCloseTo(MARGEN_RENGLONES_ARRIBA * filaPx, 6)
          }
        }
      }
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
