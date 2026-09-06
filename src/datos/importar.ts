import { Bloque } from './modelo'

function generarIdBloque(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

function tokenizarLinea(linea: string): string[] {
  const tokens: string[] = []
  // Coincide con acotaciones cerradas entre corchetes dentro de la misma línea
  const regexCorchetes = /\[[^\]\n]+\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regexCorchetes.exec(linea)) !== null) {
    const textoAntes = linea.slice(lastIndex, match.index)
    if (textoAntes) {
      const palabras = textoAntes.trim().split(/\s+/).filter(Boolean)
      tokens.push(...palabras)
    }
    tokens.push(match[0])
    lastIndex = regexCorchetes.lastIndex
  }

  const textoRestante = linea.slice(lastIndex)
  if (textoRestante) {
    const palabras = textoRestante.trim().split(/\s+/).filter(Boolean)
    tokens.push(...palabras)
  }

  return tokens
}

function formatearTokensEnLineas(tokens: string[], maxChars: number): string[] {
  if (tokens.length === 0) return []
  const lineas: string[] = []
  let lineaActual = ''

  for (const token of tokens) {
    if (!lineaActual) {
      lineaActual = token
    } else {
      if (lineaActual.length + 1 + token.length <= maxChars) {
        lineaActual += ' ' + token
      } else {
        lineas.push(lineaActual)
        lineaActual = token
      }
    }
  }

  if (lineaActual) {
    lineas.push(lineaActual)
  }

  return lineas
}

/**
 * Recibe un texto pegado y lo convierte en bloques de guión con líneas
 * de como máximo maxCaracteresPorLinea caracteres.
 */
export function importarTexto(
  texto: string,
  maxCaracteresPorLinea: number = 42
): Bloque[] {
  if (!texto || !texto.trim()) {
    return []
  }

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
