import { Guion, Bloque, TramoFormato } from './modelo'

function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

/**
 * Consolida un guion para que tenga SIEMPRE UN SOLO BLOQUE.
 * If guion has > 1 blocks, combines their texts separated by a blank line (\n\n).
 * If a block has a non-empty `nombre`, prepends `[nombre]\n` to its text.
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
    const separador = i > 0 ? '\n\n' : ''
    const lineaNombre = b.nombre && b.nombre.trim() !== '' ? `[${b.nombre.trim()}]\n` : ''
    const textoBloque = b.texto || ''

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
