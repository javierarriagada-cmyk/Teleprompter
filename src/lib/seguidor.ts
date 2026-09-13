import leven from 'leven'
import { Guion } from '../datos/modelo'
import { esCaracterApertura, esCaracterCierre } from './acotaciones'

export type Token = {
  palabra: string        // normalizada
  bloque: number         // índice en Guion.bloques
  linea: number          // índice de línea DENTRO del bloque
  indiceEnLinea: number  // índice de palabra dentro de esa línea
  esAcotacion: boolean   // indica si es una acotación entre corchetes [...]
  tokenAbsoluto: number
  desdeChar: number      // indice del primer caracter del token en bloque.texto
  hastaChar: number      // indice siguiente al ultimo (medio abierto)
}

export type Posicion = {
  bloque: number
  linea: number
  palabra: number
  desdeToken: number
  hastaToken: number
  movio: boolean
}

export interface Seguidor {
  avanzar(fraseFinal: string, tMs?: number, ppmEstimadas?: number, tUltimoCalce?: number): Posicion
  avanzarTentativo(fraseParcial: string, tMs?: number, ppmEstimadas?: number, tUltimoCalce?: number): Posicion
  // El usuario movio el texto a mano: la ventana de contexto se muda con el.
  irAToken(token: number): void
  reiniciar(): void
  posicionToken(): number
}

export const VENTANA_ATRAS = 5
export const VENTANA_ADELANTE = 40
export const MAX_PALABRAS_FRASE = 12
export const MIN_PALABRAS_COINCIDENTES = 3
export const MIN_COINCIDENCIA = 0.5
export const MAX_FALLOS = 3
export const PALABRAS_SEGUIDAS_MINIMO = 3
export const MAX_PENDIENTES = 5

export const MIN_PALABRAS_PARCIAL = 3
export const MIN_PALABRAS_SEGUIDAS = 3
export const PENALIZACION_POR_TOKEN = 0.005
export const VENTANA_LINEAS_ADELANTE = 3

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizarGuion(guionEntrada: Guion | string): Token[] {
  const guion: Guion = typeof guionEntrada === 'string' ? {
    id: 'temp',
    titulo: 'Temp',
    idioma: 'es',
    creado: 0,
    modificado: 0,
    bloques: [{ id: 'b1', nombre: '', texto: guionEntrada }]
  } : guionEntrada

  const tokens: Token[] = []
  let tokenAbsoluto = 0

  if (!guion || !guion.bloques) return tokens

  for (let bIdx = 0; bIdx < guion.bloques.length; bIdx++) {
    const bloque = guion.bloques[bIdx]
    if (!bloque || !bloque.texto) continue

    const lineas = bloque.texto.split(/\r?\n/)
    let enAcotacion = false
    let lineaOffset = 0

    for (let lIdx = 0; lIdx < lineas.length; lIdx++) {
      const lineaTexto = lineas[lIdx]
      let idxEnLinea = 0
      let posInLine = 0

      while (posInLine < lineaTexto.length) {
        while (posInLine < lineaTexto.length && /\s/.test(lineaTexto[posInLine])) {
          posInLine++
        }
        if (posInLine >= lineaTexto.length) break

        let startWord = posInLine
        while (posInLine < lineaTexto.length && !/\s/.test(lineaTexto[posInLine])) {
          posInLine++
        }
        const fragmento = lineaTexto.substring(startWord, posInLine)

        let bufferWord = ''
        let bufferStartInLine = startWord
        for (let i = 0; i < fragmento.length; i++) {
          const char = fragmento[i]
          const charInLine = startWord + i
          if (esCaracterApertura(char)) {
            if (bufferWord) {
              const norm = normalizar(bufferWord)
              if (norm) {
                tokens.push({
                  palabra: norm,
                  bloque: bIdx,
                  linea: lIdx,
                  indiceEnLinea: idxEnLinea++,
                  esAcotacion: enAcotacion,
                  tokenAbsoluto: tokenAbsoluto++,
                  desdeChar: lineaOffset + bufferStartInLine,
                  hastaChar: lineaOffset + charInLine
                })
              }
              bufferWord = ''
            }
            enAcotacion = true
          } else if (esCaracterCierre(char)) {
            if (bufferWord) {
              const norm = normalizar(bufferWord)
              if (norm) {
                tokens.push({
                  palabra: norm,
                  bloque: bIdx,
                  linea: lIdx,
                  indiceEnLinea: idxEnLinea++,
                  esAcotacion: enAcotacion,
                  tokenAbsoluto: tokenAbsoluto++,
                  desdeChar: lineaOffset + bufferStartInLine,
                  hastaChar: lineaOffset + charInLine
                })
              }
              bufferWord = ''
            }
            enAcotacion = false
          } else {
            if (!bufferWord) {
              bufferStartInLine = charInLine
            }
            bufferWord += char
          }
        }

        if (bufferWord) {
          const norm = normalizar(bufferWord)
          if (norm) {
            tokens.push({
              palabra: norm,
              bloque: bIdx,
              linea: lIdx,
              indiceEnLinea: idxEnLinea++,
              esAcotacion: enAcotacion,
              tokenAbsoluto: tokenAbsoluto++,
              desdeChar: lineaOffset + bufferStartInLine,
              hastaChar: lineaOffset + posInLine
            })
          }
        }
      }

      lineaOffset += lineaTexto.length
      if (bloque.texto.substring(lineaOffset, lineaOffset + 2) === '\r\n') {
        lineaOffset += 2
      } else if (bloque.texto.substring(lineaOffset, lineaOffset + 1) === '\n') {
        lineaOffset += 1
      }
    }

    if (enAcotacion) {
      console.warn(`[tokenizarGuion] Corchete abierto sin cerrar en bloque ${bIdx} (${bloque.nombre || 'sin nombre'})`)
      enAcotacion = false
    }
  }

  return tokens
}

function similar(a: string, b: string): boolean {
  if (a === b) return true
  const tolerancia = Math.max(1, Math.floor(Math.min(a.length, b.length) / 4))
  return leven(a, b) <= tolerancia
}

export function crearSeguidor(tokens: Token[]): Seguidor {
  const frecuencia = new Map<string, number>()
  for (const t of tokens) {
    if (t.esAcotacion) continue
    frecuencia.set(t.palabra, (frecuencia.get(t.palabra) || 0) + 1)
  }
  function pesoDe(palabra: string): number {
    const n = frecuencia.get(palabra) || 1
    return 1 / Math.sqrt(n)
  }

  let pos = 0
  let fallosSeguidos = 0
  let posTentativa = 0
  let ultimoParcial = ''
  let pendientes: string[] = []
  let fallosParcialesSeguidos = 0

  function obtenerPosicionRespuesta(movio: boolean, desde?: number, hasta?: number): Posicion {
    if (tokens.length === 0) {
      return { bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false }
    }
    const idx = Math.min(pos, tokens.length - 1)
    const t = tokens[idx]
    return {
      bloque: t.bloque,
      linea: t.linea,
      palabra: t.indiceEnLinea,
      desdeToken: desde !== undefined ? desde : idx,
      hastaToken: hasta !== undefined ? hasta : idx,
      movio
    }
  }

  function calcularPosPredicha(tMs?: number, ppmEstimadas?: number, tUltimoCalce?: number): number {
    const posActual = Math.max(pos, posTentativa)
    if (tMs !== undefined && ppmEstimadas !== undefined && tUltimoCalce !== undefined && tUltimoCalce > 0 && tMs >= tUltimoCalce) {
      const dtSeg = (tMs - tUltimoCalce) / 1000
      const velocidadTokensSeg = (ppmEstimadas / 60)
      return posActual + velocidadTokensSeg * dtSeg
    }
    return posActual
  }

  function buscarMejorOffset(
    frase: string[],
    desde: number,
    hasta: number,
    posPredicha: number,
    seguidasMinimo: number = PALABRAS_SEGUIDAS_MINIMO
  ): { mejorOffset: number; mejorPuntaje: number } {
    let mejorOffset = -1
    let mejorPuntaje = -1

    for (let offset = desde; offset <= hasta; offset++) {
      let coincidencias = 0
      let evidencia = 0
      let currTokenIdx = offset
      let racha = 0
      let rachaMaxima = 0

      for (let i = 0; i < frase.length; i++) {
        while (currTokenIdx < tokens.length && tokens[currTokenIdx].esAcotacion) {
          currTokenIdx++
        }

        if (currTokenIdx < tokens.length) {
          if (similar(frase[i], tokens[currTokenIdx].palabra)) {
            coincidencias++
            evidencia += pesoDe(tokens[currTokenIdx].palabra)
            racha++
            if (racha > rachaMaxima) rachaMaxima = racha
          } else {
            racha = 0
          }
          currTokenIdx++
        }
      }

      if (frase.length === 0) continue

      const suficientes = coincidencias >= Math.min(MIN_PALABRAS_COINCIDENTES, frase.length)

      let puntaje = suficientes
        ? coincidencias / frase.length + evidencia * 0.02
        : 0

      const seguidasNecesarias = Math.min(seguidasMinimo, frase.length)
      if (rachaMaxima < seguidasNecesarias) {
        puntaje = 0
      }

      // 1. LA BUSQUEDA SE CENTRA EN DONDE DEBERIAS ESTAR (posPredicha)
      const tokenDist = Math.abs(posPredicha - offset)
      puntaje = Math.max(0, puntaje - tokenDist * PENALIZACION_POR_TOKEN)

      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje
        mejorOffset = offset
      } else if (Math.abs(puntaje - mejorPuntaje) < 1e-5 && mejorOffset >= 0) {
        if (Math.abs(offset - posPredicha) < Math.abs(mejorOffset - posPredicha)) {
          mejorPuntaje = puntaje
          mejorOffset = offset
        }
      }
    }

    return { mejorOffset, mejorPuntaje }
  }

  return {
    avanzar(fraseFinal: string, tMs?: number, ppmEstimadas?: number, tUltimoCalce?: number): Posicion {
      ultimoParcial = ''
      pendientes = []

      if (tokens.length === 0) {
        return { bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false }
      }

      const fraseNorm = normalizar(fraseFinal)
      if (!fraseNorm) {
        return obtenerPosicionRespuesta(false)
      }

      const palabrasFrase = fraseNorm.split(' ').filter(Boolean)
      const frase = palabrasFrase.slice(-MAX_PALABRAS_FRASE)
      if (frase.length === 0) {
        return obtenerPosicionRespuesta(false)
      }

      const posPredicha = calcularPosPredicha(tMs, ppmEstimadas, tUltimoCalce)
      const basePos = Math.round(posPredicha)
      const posMinima = Math.min(Math.round(pos), basePos)

      const desde = Math.max(0, posMinima - VENTANA_ATRAS)
      const hasta = Math.min(tokens.length - 1, basePos + VENTANA_ADELANTE)

      const { mejorOffset, mejorPuntaje } = buscarMejorOffset(frase, desde, hasta, posPredicha)

      if (mejorPuntaje < MIN_COINCIDENCIA) {
        fallosSeguidos++
        return obtenerPosicionRespuesta(false)
      }

      let currIdx = mejorOffset
      for (let i = 0; i < frase.length; i++) {
        while (currIdx < tokens.length && tokens[currIdx].esAcotacion) {
          currIdx++
        }
        if (i < frase.length - 1 && currIdx < tokens.length) {
          currIdx++
        }
      }
      const candPos = Math.min(currIdx, tokens.length - 1)

      pos = candPos
      posTentativa = candPos
      fallosSeguidos = 0
      return obtenerPosicionRespuesta(true, mejorOffset, candPos)
    },

    avanzarTentativo(fraseParcial: string, tMs?: number, ppmEstimadas?: number, tUltimoCalce?: number): Posicion {
      if (tokens.length === 0) {
        return { bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false }
      }

      const fraseNorm = normalizar(fraseParcial)
      if (!fraseNorm) {
        return obtenerPosicionRespuesta(false)
      }

      const palabrasAhora = fraseNorm.split(' ').filter(Boolean)
      if (palabrasAhora.length < 2) {
        return obtenerPosicionRespuesta(false)
      }

      let nuevas: string[]
      if (ultimoParcial && fraseNorm.startsWith(ultimoParcial)) {
        nuevas = fraseNorm.slice(ultimoParcial.length).split(' ').filter(Boolean)
      } else {
        nuevas = palabrasAhora
        pendientes = []
      }
      ultimoParcial = fraseNorm

      if (nuevas.length > 0) {
        pendientes = pendientes.concat(nuevas).slice(-MAX_PENDIENTES)
      }

      const enRecuperacion = fallosParcialesSeguidos >= MAX_FALLOS
      const palabrasAEvaluar = enRecuperacion ? pendientes : palabrasAhora

      if (enRecuperacion && palabrasAEvaluar.length < PALABRAS_SEGUIDAS_MINIMO) {
        fallosParcialesSeguidos++
        return obtenerPosicionRespuesta(false)
      }

      const palabrasFrase = palabrasAEvaluar
      const frase = palabrasFrase.slice(-MAX_PALABRAS_FRASE)

      const posPredicha = calcularPosPredicha(tMs, ppmEstimadas, tUltimoCalce)
      const base = Math.max(Math.round(posPredicha), Math.round(posTentativa))
      const tokActual = tokens[base] || tokens[tokens.length - 1]
      const lineaActual = tokActual ? tokActual.linea : 0
      const lineaLimite = lineaActual + VENTANA_LINEAS_ADELANTE
      let hasta = Math.min(tokens.length - 1, base + VENTANA_ADELANTE)

      for (let i = base; i < tokens.length; i++) {
        if (tokens[i].linea > lineaLimite) {
          hasta = i - 1
          break
        }
      }

      const posMinima = Math.min(Math.round(posTentativa), Math.round(posPredicha))
      const desde = Math.max(0, posMinima - VENTANA_ATRAS)
      hasta = Math.max(desde, hasta)

      const { mejorOffset, mejorPuntaje } = buscarMejorOffset(frase, desde, hasta, posPredicha)

      if (mejorPuntaje < MIN_COINCIDENCIA) {
        fallosParcialesSeguidos++
        return obtenerPosicionRespuesta(false)
      }

      let currIdx = mejorOffset
      for (let i = 0; i < frase.length; i++) {
        while (currIdx < tokens.length && tokens[currIdx].esAcotacion) {
          currIdx++
        }
        if (i < frase.length - 1 && currIdx < tokens.length) {
          currIdx++
        }
      }

      const candPos = Math.min(currIdx, tokens.length - 1)

      posTentativa = Math.max(posTentativa, candPos)
      pendientes = []
      fallosParcialesSeguidos = 0

      const idxRes = Math.min(Math.round(candPos), tokens.length - 1)
      const tokCand = tokens[idxRes]
      return {
        bloque: tokCand.bloque,
        linea: tokCand.linea,
        palabra: tokCand.indiceEnLinea,
        desdeToken: mejorOffset,
        hastaToken: candPos,
        movio: true
      }
    },

    irAToken(token: number) {
      const destino = Math.max(0, Math.min(token, Math.max(0, tokens.length - 1)))
      pos = destino
      posTentativa = destino
      fallosSeguidos = 0
      fallosParcialesSeguidos = 0
      ultimoParcial = ''
      pendientes = []
    },

    reiniciar() {
      pos = 0
      posTentativa = 0
      fallosSeguidos = 0
      ultimoParcial = ''
      pendientes = []
    },

    posicionToken() {
      return pos
    }
  }
}
