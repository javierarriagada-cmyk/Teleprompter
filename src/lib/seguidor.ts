import leven from 'leven'

export type Token = {
  palabra: string        // normalizada
  linea: number          // índice de línea en el guion original
  indiceEnLinea: number  // índice de palabra dentro de esa línea
}

export type Posicion = { linea: number; palabra: number; movio: boolean }

export interface Seguidor {
  avanzar(fraseFinal: string): Posicion
  reiniciar(): void
  posicionToken(): number
}

export const VENTANA_ATRAS = 5
export const VENTANA_ADELANTE = 40
export const MAX_PALABRAS_FRASE = 12
export const MIN_COINCIDENCIA = 0.5
export const MAX_FALLOS = 3
export const RETROCESO_MAX = 2

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizarGuion(guion: string): Token[] {
  const lineas = guion.split(/\r?\n/)
  const tokens: Token[] = []

  for (let l = 0; l < lineas.length; l++) {
    const palabras = lineas[l].split(/\s+/).filter(Boolean)
    let idxEnLinea = 0
    for (let p = 0; p < palabras.length; p++) {
      const norm = normalizar(palabras[p])
      if (norm) {
        tokens.push({
          palabra: norm,
          linea: l,
          indiceEnLinea: idxEnLinea++
        })
      }
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

  function obtenerPosicionRespuesta(movio: boolean): Posicion {
    if (tokens.length === 0) {
      return { linea: 0, palabra: 0, movio: false }
    }
    const idx = Math.min(pos, tokens.length - 1)
    const t = tokens[idx]
    return { linea: t.linea, palabra: t.indiceEnLinea, movio }
  }

  function buscarMejorOffset(frase: string[], desde: number, hasta: number): { mejorOffset: number; mejorPuntaje: number } {
    let mejorOffset = -1
    let mejorPuntaje = -1

    for (let offset = desde; offset <= hasta; offset++) {
      let coincidencias = 0
      for (let i = 0; i < frase.length; i++) {
        const tokenIdx = offset + i
        if (tokenIdx >= 0 && tokenIdx < tokens.length) {
          if (similar(frase[i], tokens[tokenIdx].palabra)) {
            coincidencias++
          }
        }
      }
      const puntaje = coincidencias / frase.length
      const nuevaPosCandidate = offset + frase.length - 1

      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje
        mejorOffset = offset
      } else if (puntaje === mejorPuntaje && mejorOffset >= 0) {
        const prevCandidatePos = mejorOffset + frase.length - 1
        const esPrevInvalido = prevCandidatePos < pos - RETROCESO_MAX
        const esNuevoValido = nuevaPosCandidate >= pos - RETROCESO_MAX
        if (esPrevInvalido && esNuevoValido) {
          mejorOffset = offset
        }
      }
    }

    return { mejorOffset, mejorPuntaje }
  }

  return {
    avanzar(fraseFinal: string): Posicion {
      if (tokens.length === 0) {
        return { linea: 0, palabra: 0, movio: false }
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
          console.warn('[Seguidor] Disparando búsqueda global de recuperación')
          const resGlobal = buscarMejorOffset(frase, 0, tokens.length - 1)
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

      const nuevaPos = mejorOffset + frase.length - 1
      if (nuevaPos < pos - RETROCESO_MAX) {
        console.warn(`[Seguidor] Retroceso descartado: nuevaPos (${nuevaPos}) < pos (${pos}) - RETROCESO_MAX (${RETROCESO_MAX})`)
        return obtenerPosicionRespuesta(false)
      }

      pos = nuevaPos
      fallosSeguidos = 0
      return obtenerPosicionRespuesta(true)
    },

    reiniciar() {
      pos = 0
      fallosSeguidos = 0
    },

    posicionToken() {
      return pos
    }
  }
}
