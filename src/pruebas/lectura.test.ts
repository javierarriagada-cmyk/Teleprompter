import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { Renglon, pixelDePosicion } from '../lib/renglones'
import { AnclajeZona, calcularBanda } from '../components/banda'
import { MARGEN_RENGLONES_ARRIBA, calcularScrollTop } from '../components/TeleprompterView'
import { leerCorpus } from '../lib/repetidor'
import { tokenizarGuion } from '../lib/seguidor'

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
      const yEnPantalla = pPos - topScroll

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
      const yCalceAntes = pCalce - topScrollAntes

      if (yCalceAntes >= topBanda && yCalceAntes < topBanda + altoBanda) {
        dentroAntes++
      }

      // Cálculo DESPUÉS (fórmula nueva usando la función oficial calcularScrollTop)
      const topScrollDespues = calcularScrollTop(pPos, origen, topBanda, filaPx)
      const yCalceDespues = pCalce - topScrollDespues

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
        const yEnPantalla = pPos - topScroll

        // La distancia desde topBanda a la línea viva comprende exactamente MARGEN_RENGLONES_ARRIBA de espacio arriba (middle line of band)
        const offsetEnBanda = yEnPantalla - topBanda
        expect(Math.abs(offsetEnBanda - MARGEN_RENGLONES_ARRIBA * filaPx)).toBeLessThan(0.001)

        // Queda dentro de la banda
        expect(yEnPantalla).toBeGreaterThanOrEqual(topBanda)
        expect(yEnPantalla).toBeLessThan(topBanda + altoBanda)
      }
    }
  })
})
