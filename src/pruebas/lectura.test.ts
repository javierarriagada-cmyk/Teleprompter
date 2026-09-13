import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { Renglon, pixelDePosicion } from '../lib/renglones'
import { AnclajeZona, calcularBanda } from '../components/banda'
import { MARGEN_RENGLONES_ARRIBA, calcularScrollTop } from '../components/TeleprompterView'
import { leerCorpus } from '../lib/repetidor'
import { tokenizarGuion } from '../lib/seguidor'

// DONDE CAE UN TOKEN EN LA PANTALLA. Hay que modelar el contenedor entero, no la resta sola.
//
// El contenedor que hace scroll tiene paddingTop: topBanda, y origen es el offsetTop del
// primer token, que YA TRAE ese padding adentro. Asi que la posicion en pantalla es:
//
//     topBanda  +  (cuanto baja el token desde el primero)  -  cuanto se desplazo
//
// T144 y T146 hacian `pPos - topScroll`, que se saltea el padding. Con esa cuenta la resta
// de topBanda repetida en calcularScrollTop se cancelaba sola y las dos pruebas daban verde
// con el renglon vivo cayendo SEIS RENGLONES fuera de la ventana en la pantalla de verdad.
// Comprobaban la formula contra si misma.
function enPantalla(pPos: number, origen: number, topBanda: number, topScroll: number): number {
  return topBanda + (pPos - origen) - topScroll
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
      const topScroll = calcularScrollTop(pPos, origen, topBanda, filaPx)
      const yEnPantalla = enPantalla(pPos, origen, topBanda, topScroll)

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
      const yCalceAntes = enPantalla(pCalce, origen, topBanda, topScrollAntes)

      if (yCalceAntes >= topBanda && yCalceAntes < topBanda + altoBanda) {
        dentroAntes++
      }

      // Cálculo DESPUÉS (fórmula nueva usando la función oficial calcularScrollTop)
      const topScrollDespues = calcularScrollTop(pPos, origen, topBanda, filaPx)
      const yCalceDespues = enPantalla(pCalce, origen, topBanda, topScrollDespues)

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
        const topScroll = calcularScrollTop(pPos, origen, topBanda, filaPx)
        const yEnPantalla = enPantalla(pPos, origen, topBanda, topScroll)

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
          const topScroll = calcularScrollTop(pPos, origen, topBanda, filaPx)
          const y = enPantalla(pPos, origen, topBanda, topScroll)

          expect(y - topBanda).toBeCloseTo(MARGEN_RENGLONES_ARRIBA * filaPx, 6)
        }
      }
    }
  })

  // T148 GUARDIANA DE QUE topBanda NO PARTICIPE DE LA CUENTA.
  // Directa y brutal: mover la banda no puede mover el desplazamiento. Si alguien reintroduce
  // la resta, estos dos numeros dejan de ser iguales.
  test('T148 El desplazamiento no depende de donde este la banda: con la misma posicion y dos anclajes distintos, calcularScrollTop devuelve lo mismo.', () => {
    const filaPx = 34
    const renglones: Renglon[] = Array.from({ length: 80 }, (_, i) => ({
      top: i * filaPx, alto: filaPx, desdeToken: i * 4, hastaToken: i * 4 + 3
    }))
    const origen = renglones[0].top
    const pPos = pixelDePosicion(renglones, 200)

    const arriba = calcularBanda(480, filaPx, 3, 'arriba', 20, 20).topBanda
    const abajo = calcularBanda(480, filaPx, 3, 'abajo', 20, 20).topBanda
    expect(arriba).not.toBeCloseTo(abajo, 1)   // la prueba solo sirve si de verdad difieren

    expect(calcularScrollTop(pPos, origen, arriba, filaPx))
      .toBeCloseTo(calcularScrollTop(pPos, origen, abajo, filaPx), 6)
  })
})
