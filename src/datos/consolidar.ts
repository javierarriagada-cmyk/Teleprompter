import { Guion, Bloque, TramoFormato } from './modelo'

function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

/**
 * Consolida un guion para que tenga SIEMPRE UN SOLO BLOQUE.
 * Combine multiple blocks into a single block.
 * Blocks whose text is empty (after trim) and have no name contribute nothing (neither text nor separator).
 * If a block has a non-empty `nombre`, prepends `[nombre]\n` to its text.
 * Separator `\n\n` is only added when existing `textoAcumulado` is not empty.
 * Adjusts character indices in `tramos` so formatting remains on the exact same words.
 */
export function consolidarGuion(guion: Guion): Guion {
  if (!guion || !guion.bloques || guion.bloques.length <= 1) {
    if (guion && (!guion.bloques || guion.bloques.length === 0)) {
      return {
        ...guion,
        bloques: [
          {
            id: generarUuid(),
            nombre: '',
            texto: '',
            tramos: []
          }
        ]
      }
    }
    return guion
  }

  let textoAcumulado = ''
  const tramosAcumulados: TramoFormato[] = []

  for (let i = 0; i < guion.bloques.length; i++) {
    const b = guion.bloques[i]
    const tieneNombre = Boolean(b.nombre && b.nombre.trim() !== '')
    const lineaNombre = tieneNombre ? `[${b.nombre.trim()}]\n` : ''
    const textoBloque = b.texto || ''
    const esTextoVacio = textoBloque.trim() === ''

    // Bloque sin nombre y sin texto no aporta nada
    if (!tieneNombre && esTextoVacio) {
      continue
    }

    const separador = textoAcumulado.length > 0 ? '\n\n' : ''
    const offsetBloque = textoAcumulado.length + separador.length + lineaNombre.length

    textoAcumulado += separador + lineaNombre + textoBloque

    if (b.tramos && b.tramos.length > 0) {
      for (const tr of b.tramos) {
        tramosAcumulados.push({
          ...tr,
          desde: tr.desde + offsetBloque,
          hasta: tr.hasta + offsetBloque
        })
      }
    }
  }

  const bloqueConsolidado: Bloque = {
    id: guion.bloques[0].id || generarUuid(),
    nombre: '',
    texto: textoAcumulado,
    tramos: tramosAcumulados.length > 0 ? tramosAcumulados : []
  }

  return {
    ...guion,
    bloques: [bloqueConsolidado],
    modificado: Date.now()
  }
}
