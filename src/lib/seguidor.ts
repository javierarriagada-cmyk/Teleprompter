import leven from 'leven'
import { Guion } from '../datos/modelo'

export type Token = {
  palabra: string        // normalizada
  bloque: number         // índice en Guion.bloques
  linea: number          // índice de línea DENTRO del bloque
  indiceEnLinea: number  // índice de palabra dentro de esa línea
  esAcotacion: boolean   // indica si es una acotación entre corchetes [...]
  tokenAbsoluto: number
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
  avanzar(fraseFinal: string): Posicion
  avanzarTentativo(fraseParcial: string): Posicion
  reiniciar(): void
  posicionToken(): number
}

export const VENTANA_ATRAS = 5
export const VENTANA_ADELANTE = 40
export const MAX_PALABRAS_FRASE = 12
export const MIN_COINCIDENCIA = 0.5
export const MAX_FALLOS = 3
// Palabras CONSECUTIVAS que tienen que calzar para aceptar una posicion. Es la regla que
// separa "esta leyendo el guion" de "esta hablando de otra cosa": palabras sueltas calzan
// por casualidad, tres seguidas no.
export const PALABRAS_SEGUIDAS_MINIMO = 3
// Para MUDARSE a otra parte del guion -la busqueda global de recuperacion- hace falta
// evidencia mucho mas fuerte que para seguir avanzando donde ya se esta. Con tres palabras
// seguidas, un guion largo ofrece coincidencias por casualidad y el prompter saltaba a
// otro parrafo cuando el lector improvisaba.
export const PALABRAS_SEGUIDAS_PARA_SALTAR = 6
// Cuanto puede alejarse la recuperacion de donde va el lector.
//
// Cubre lo que de verdad pasa cuando alguien se pierde leyendo: repetir la linea en curso
// -unas 8 palabras atras-, saltarse una linea -unas 8 adelante- o irse al parrafo siguiente
// -20 o 30 adelante-. Deja fuera el caso de saltarse a otra parte del guion, que se decidio
// no servir: el riesgo de un salto equivocado no lo compensa.
//
// Antes eran 100, un numero que no salio de ninguna medicion sino de estimar un parrafo en
// 60 palabras. Cuanto mas ancha la ventana, mas lugares donde una frase inventada puede
// pegar seis palabras seguidas por casualidad y llevarse el prompter a otro lado.
export const RECUPERACION_TOKENS = 40
// Cuantas palabras nuevas sin calzar se guardan mientras el seguidor esta perdido. Con la
// bolsa mas grande, lo que el lector dijo fuera del guion queda adentro mas tiempo y le
// exige mas palabras limpias para reenganchar. Medido: con 5 alcanzan TRES palabras
// seguidas, con 6 hacen falta cuatro, con 8 hacen falta seis.
export const MAX_PENDIENTES = 5
export const RETROCESO_MAX = 2

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
        for (let i = 0; i < fragmento.length; i++) {
          const char = fragmento[i]
          if (char === '[') {
            if (bufferWord) {
              const norm = normalizar(bufferWord)
              if (norm) {
                tokens.push({
                  palabra: norm,
                  bloque: bIdx,
                  linea: lIdx,
                  indiceEnLinea: idxEnLinea++,
                  esAcotacion: enAcotacion,
                  tokenAbsoluto: tokenAbsoluto++
                })
              }
              bufferWord = ''
            }
            enAcotacion = true
          } else if (char === ']') {
            if (bufferWord) {
              const norm = normalizar(bufferWord)
              if (norm) {
                tokens.push({
                  palabra: norm,
                  bloque: bIdx,
                  linea: lIdx,
                  indiceEnLinea: idxEnLinea++,
                  esAcotacion: enAcotacion,
                  tokenAbsoluto: tokenAbsoluto++
                })
              }
              bufferWord = ''
            }
            enAcotacion = false
          } else {
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
              tokenAbsoluto: tokenAbsoluto++
            })
          }
        }
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
  let pos = 0
  let fallosSeguidos = 0
  let posTentativa = 0
  // Ultimo parcial visto, normalizado, para saber que parte es nueva.
  let ultimoParcial = ''
  // Palabras nuevas todavia sin calzar. Las viejas se caen solas.
  let pendientes: string[] = []
  // Parciales seguidos sin calzar. Al pasar de MAX_FALLOS se entra en recuperacion.
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

  function buscarMejorOffset(frase: string[], desde: number, hasta: number, seguidasMinimo: number = PALABRAS_SEGUIDAS_MINIMO): { mejorOffset: number; mejorPuntaje: number } {
    let mejorOffset = -1
    let mejorPuntaje = -1

    for (let offset = desde; offset <= hasta; offset++) {
      let coincidencias = 0
      let tokensEmparejados = 0
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
            racha++
            if (racha > rachaMaxima) rachaMaxima = racha
          } else {
            racha = 0
          }
          tokensEmparejados++
          currTokenIdx++
        }
      }

      if (frase.length === 0) continue
      let puntaje = coincidencias / frase.length

      // NO basta con que coincida una fraccion de palabras sueltas: hacen falta
      // PALABRAS_SEGUIDAS_MINIMO palabras CONSECUTIVAS. Contando palabras dispersas, un
      // texto que no esta en el guion calza igual, porque "de", "que", "la" y "un"
      // aparecen por todas partes; con eso, hablar de otra cosa no detenia el prompter.
      //
      // En frases mas cortas que ese minimo se exige que calce la frase entera.
      const seguidasNecesarias = Math.min(seguidasMinimo, frase.length)
      if (rachaMaxima < seguidasNecesarias) {
        puntaje = 0
      }

      // La distancia se penaliza EN LOS DOS SENTIDOS: entre dos lugares que calzan igual
      // de bien, gana el mas cercano a donde se cree que va el lector.
      //
      // Antes solo se penalizaba hacia atras, asi que una frase suelta que pegara tres
      // palabras seguidas treinta palabras mas adelante ganaba y el prompter se iba ahi.
      // Es lo que pasaba al decir algo que no estaba en el guion: continuaba en otro lado.
      const tokenDist = Math.abs(pos - offset)
      puntaje = Math.max(0, puntaje - tokenDist * PENALIZACION_POR_TOKEN)

      const nuevaPosCandidate = Math.max(offset, currTokenIdx - 1)

      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje
        mejorOffset = offset
      } else if (Math.abs(puntaje - mejorPuntaje) < 1e-5 && mejorOffset >= 0) {
        if (offset >= pos && mejorOffset < pos) {
          mejorPuntaje = puntaje
          mejorOffset = offset
        } else {
          const prevCandidatePos = mejorOffset + frase.length - 1
          const esPrevInvalido = prevCandidatePos < pos - RETROCESO_MAX
          const esNuevoValido = nuevaPosCandidate >= pos - RETROCESO_MAX
          if (esPrevInvalido && esNuevoValido) {
            mejorOffset = offset
          }
        }
      }
    }

    return { mejorOffset, mejorPuntaje }
  }

  return {
    avanzar(fraseFinal: string): Posicion {
      // Un FINAL cierra la intervencion: el acumulado del parcial arranca de cero.
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

      const desde = Math.max(0, pos - VENTANA_ATRAS)
      const hasta = Math.min(tokens.length - 1, pos + VENTANA_ADELANTE)

      let { mejorOffset, mejorPuntaje } = buscarMejorOffset(frase, desde, hasta)

      if (mejorPuntaje < MIN_COINCIDENCIA) {
        fallosSeguidos++
        console.warn(`[Seguidor] Puntaje bajo (${mejorPuntaje.toFixed(2)} < ${MIN_COINCIDENCIA}), fallos seguidos: ${fallosSeguidos}`)
        if (fallosSeguidos >= MAX_FALLOS) {
          console.warn('[Seguidor] Disparando recuperación acotada al entorno')
          const desdeRec = Math.max(0, pos - RECUPERACION_TOKENS)
          const hastaRec = Math.min(tokens.length - 1, pos + RECUPERACION_TOKENS)
          const resGlobal = buscarMejorOffset(frase, desdeRec, hastaRec, PALABRAS_SEGUIDAS_PARA_SALTAR)
          if (resGlobal.mejorPuntaje >= MIN_COINCIDENCIA) {
            mejorOffset = resGlobal.mejorOffset
            mejorPuntaje = resGlobal.mejorPuntaje
            fallosSeguidos = 0
            console.warn(`[Seguidor] Recuperación global exitosa con puntaje ${mejorPuntaje.toFixed(2)} en offset ${mejorOffset}`)
          } else {
            console.warn('[Seguidor] Recuperación global fallida')
            fallosSeguidos = 0
            return obtenerPosicionRespuesta(false)
          }
        } else {
          return obtenerPosicionRespuesta(false)
        }
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
      const nuevaPos = Math.min(currIdx, tokens.length - 1)

      if (nuevaPos < pos - RETROCESO_MAX) {
        console.warn(`[Seguidor] Retroceso descartado: nuevaPos (${nuevaPos}) < pos (${pos}) - RETROCESO_MAX (${RETROCESO_MAX})`)
        return obtenerPosicionRespuesta(false)
      }

      pos = nuevaPos
      fallosSeguidos = 0
      return obtenerPosicionRespuesta(true, mejorOffset, nuevaPos)
    },

    avanzarTentativo(fraseParcial: string): Posicion {
      if (tokens.length === 0) {
        return { bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false }
      }

      const fraseNorm = normalizar(fraseParcial)
      if (!fraseNorm) {
        return obtenerPosicionRespuesta(false)
      }

      // SOLO SE EVALUAN LAS PALABRAS NUEVAS.
      //
      // El parcial de Web Speech es acumulativo: no entrega la palabra recien dicha sino
      // todo lo que va de la intervencion, cada vez mas largo. Tomando las ultimas doce de
      // ese acumulado, lo que el lector dijo fuera del guion volvia a entrar en la cuenta
      // una y otra vez, hundiendo el puntaje hasta que su propia longitud lo empujaba
      // afuera. Por eso, despues de improvisar, ni leyendo un parrafo entero reenganchaba.
      //
      // Lo ya evaluado y descartado no se vuelve a considerar. Las palabras nuevas se
      // acumulan en una bolsa chica donde las viejas se caen a medida que entran otras, y
      // un calce la vacia.
      const palabrasAhora = fraseNorm.split(' ').filter(Boolean)
      if (palabrasAhora.length === 0) {
        return obtenerPosicionRespuesta(false)
      }

      let nuevas: string[]
      if (ultimoParcial && fraseNorm.startsWith(ultimoParcial)) {
        nuevas = fraseNorm.slice(ultimoParcial.length).split(' ').filter(Boolean)
      } else {
        // El reconocedor se corrigio a si mismo y reescribio lo anterior: se evalua todo.
        nuevas = palabrasAhora
        pendientes = []
      }
      ultimoParcial = fraseNorm

      if (nuevas.length > 0) {
        pendientes = pendientes.concat(nuevas).slice(-MAX_PENDIENTES)
      }

      // MIENTRAS VIENE CALZANDO se usa el contexto completo: mas palabras ubican mejor.
      // Solo cuando varios parciales seguidos fallan -el lector se fue del guion- el
      // seguidor deja de confiar en lo acumulado y mira unicamente lo nuevo.
      const enRecuperacion = fallosParcialesSeguidos >= MAX_FALLOS
      const palabrasAEvaluar = enRecuperacion ? pendientes : palabrasAhora

      if (enRecuperacion && palabrasAEvaluar.length < PALABRAS_SEGUIDAS_MINIMO) {
        fallosParcialesSeguidos++
        return obtenerPosicionRespuesta(false)
      }

      const palabrasFrase = palabrasAEvaluar
      const frase = palabrasFrase.slice(-MAX_PALABRAS_FRASE)
      const base = Math.max(pos, posTentativa)
      const tokActual = tokens[base] || tokens[tokens.length - 1]
      const lineaActual = tokActual.linea
      const lineaLimite = lineaActual + VENTANA_LINEAS_ADELANTE
      let hasta = Math.min(tokens.length - 1, base + VENTANA_ADELANTE)

      for (let i = base; i < tokens.length; i++) {
        if (tokens[i].linea > lineaLimite) {
          hasta = i - 1
          break
        }
      }

      const desde = Math.max(0, base - VENTANA_ATRAS)
      hasta = Math.max(desde, hasta)

      const { mejorOffset, mejorPuntaje } = buscarMejorOffset(frase, desde, hasta)

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
      if (candPos < base - RETROCESO_MAX) {
        fallosParcialesSeguidos++
        return obtenerPosicionRespuesta(false)
      }

      posTentativa = Math.max(posTentativa, candPos)
      pendientes = []
      fallosParcialesSeguidos = 0

      const tokCand = tokens[candPos]
      return {
        bloque: tokCand.bloque,
        linea: tokCand.linea,
        palabra: tokCand.indiceEnLinea,
        desdeToken: mejorOffset,
        hastaToken: candPos,
        movio: true
      }
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
