import { Bloque } from './modelo'

export type OpcionesImportar = {
  maxCaracteresPorLinea?: number
}

function generarIdBloque(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

/**
 * Tokeniza una línea separando por espacios fuera de acotaciones cerradas [].
 * Si hay una acotación [acotacion] o [acotacion]pegada o pegada[acotacion],
 * se mantiene unida como un único token sin dividir los corchetes ni agregar espacios artificiales.
 * Un corchete abierto sin cerrar no lanza error y se trata como texto normal.
 */
function tokenizarLinea(linea: string): string[] {
  const matches: { start: number; end: number }[] = []
  const regex = /\[[^\]\n]*\]/g
  let m: RegExpExecArray | null

  while ((m = regex.exec(linea)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length })
  }

  function isInsideClosedBracket(idx: number): boolean {
    return matches.some((b) => idx >= b.start && idx < b.end)
  }

  const result: string[] = []
  let currentToken = ''
  let i = 0

  while (i < linea.length) {
    const ch = linea[i]
    if (/\s/.test(ch) && !isInsideClosedBracket(i)) {
      if (currentToken) {
        result.push(currentToken)
        currentToken = ''
      }
      i++
    } else {
      currentToken += ch
      i++
    }
  }

  if (currentToken) {
    result.push(currentToken)
  }

  return result
}

/**
 * Formatea un arreglo de tokens en líneas de texto respetando maxChars
 * según el orden de preferencia de cortes:
 * 1. Fin de oración: ., ?, !, :, ;
 * 2. Fin de cláusula: ,
 * 3. Límite de palabra (espacio)
 */
function formatearTokensEnLineas(tokens: string[], maxChars: number): string[] {
  if (tokens.length === 0) return []

  const lineas: string[] = []
  let tokensRestantes = [...tokens]

  while (tokensRestantes.length > 0) {
    // Si el primer token por sí solo supera maxChars, queda solo en su línea
    if (tokensRestantes[0].length >= maxChars) {
      lineas.push(tokensRestantes.shift()!)
      continue
    }

    // Acumular tokens que quepan dentro de maxChars
    let lenAcumulado = tokensRestantes[0].length
    let maxIdx = 0

    for (let i = 1; i < tokensRestantes.length; i++) {
      const nuevoLen = lenAcumulado + 1 + tokensRestantes[i].length
      if (nuevoLen <= maxChars) {
        lenAcumulado = nuevoLen
        maxIdx = i
      } else {
        break
      }
    }

    // Si entran todos los tokens restantes
    if (maxIdx === tokensRestantes.length - 1) {
      lineas.push(tokensRestantes.join(' '))
      break
    }

    // Buscar el mejor punto de corte dentro de 0..maxIdx
    // Preferencia 1: Fin de oración (., ?, !, :, ;)
    let corteElegido = -1
    const regexOracion = /[.?!:;][)\]"']?$/

    for (let i = maxIdx; i >= 0; i--) {
      if (regexOracion.test(tokensRestantes[i])) {
        corteElegido = i
        break
      }
    }

    // Preferencia 2: Fin de cláusula (,)
    if (corteElegido === -1) {
      const regexClausula = /[,][)\]"']?$/
      for (let i = maxIdx; i >= 0; i--) {
        if (regexClausula.test(tokensRestantes[i])) {
          corteElegido = i
          break
        }
      }
    }

    // Preferencia 3: Límite de palabra (usar maxIdx completo)
    if (corteElegido === -1) {
      corteElegido = maxIdx
    }

    // Formar la línea con tokensRestantes[0..corteElegido]
    const lineaActualTokens = tokensRestantes.slice(0, corteElegido + 1)
    lineas.push(lineaActualTokens.join(' '))
    tokensRestantes = tokensRestantes.slice(corteElegido + 1)
  }

  return lineas
}

/**
 * Recibe un texto pegado y lo convierte en bloques de guión con líneas
 * formateadas según las opciones provistas.
 */
export function importarTexto(
  texto: string,
  opciones?: OpcionesImportar
): Bloque[] {
  if (!texto || !texto.trim()) {
    return []
  }

  const maxCaracteresPorLinea = opciones?.maxCaracteresPorLinea ?? 42

  // Normalizar saltos de línea de Windows (\r\n) y de Mac antiguo (\r) a \n
  const textoNormalizado = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  // Separar en párrafos (un párrafo por cada separación de una o más líneas en blanco)
  const parrafos = textoNormalizado.split(/\n\s*\n+/).filter((p) => p.trim().length > 0)

  const bloques: Bloque[] = []

  for (const parrafo of parrafos) {
    const lineasFisicas = parrafo.split('\n')
    const lineasFormateadas: string[] = []

    for (const lineaFisica of lineasFisicas) {
      const tokens = tokenizarLinea(lineaFisica)
      const lineasResultado = formatearTokensEnLineas(tokens, maxCaracteresPorLinea)
      lineasFormateadas.push(...lineasResultado)
    }

    if (lineasFormateadas.length > 0) {
      bloques.push({
        id: generarIdBloque(),
        nombre: '',
        texto: lineasFormateadas.join('\n')
      })
    }
  }

  return bloques
}
