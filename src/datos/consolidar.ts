import { Guion, Bloque, TramoFormato } from './modelo'

function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

/**
 * Consolida un guion para que tenga SIEMPRE UN SOLO BLOQUE sin líneas en blanco
 * al principio ni al final.
 * - Combina múltiples bloques en uno solo, separándolos con '\n\n'.
 * - Omite bloques sin nombre cuyo texto esté vacío.
 * - Si un bloque tiene nombre, conserva '[nombre]\n' al principio de su texto.
 * - Recorta espacios y saltos de línea al inicio y al final del texto resultante.
 * - Ajusta los índices de 'tramos' (negrita/color) para que no se desplacen.
 * - Si el guion ya tiene 1 solo bloque y su texto no cambia, retorna el guion intacto
 *   sin modificar su fecha de modificación.
 */
export function consolidarGuion(guion: Guion): Guion {
  if (!guion || !guion.bloques || guion.bloques.length === 0) {
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

  let textoAcumulado = ''
  const tramosAcumulados: TramoFormato[] = []

  if (guion.bloques.length === 1) {
    const b = guion.bloques[0]
    const tieneNombre = Boolean(b.nombre && b.nombre.trim() !== '')
    const lineaNombre = tieneNombre ? `[${b.nombre.trim()}]\n` : ''
    const textoBloque = b.texto || ''

    textoAcumulado = lineaNombre + textoBloque

    if (b.tramos && b.tramos.length > 0) {
      for (const tr of b.tramos) {
        tramosAcumulados.push({
          ...tr,
          desde: tr.desde + lineaNombre.length,
          hasta: tr.hasta + lineaNombre.length
        })
      }
    }
  } else {
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
  }

  // Recortar bordes (inicio y final)
  const recortaInicio = textoAcumulado.length - textoAcumulado.trimStart().length
  const textoLimpio = textoAcumulado.trim()

  const tramosAjustados: TramoFormato[] = []
  for (const tr of tramosAcumulados) {
    const nuevoDesde = Math.max(0, tr.desde - recortaInicio)
    const nuevoHasta = Math.max(0, tr.hasta - recortaInicio)
    if (nuevoHasta > nuevoDesde) {
      tramosAjustados.push({
        ...tr,
        desde: nuevoDesde,
        hasta: nuevoHasta
      })
    }
  }

  // Si ya tenía 1 solo bloque y nada cambió, retornar el guion original sin modificar
  if (guion.bloques.length === 1) {
    const b0 = guion.bloques[0]
    const nombreLimpio = (b0.nombre || '').trim()
    const tramosOriginales = b0.tramos || []

    const tramosIguales = tramosOriginales.length === tramosAjustados.length &&
      tramosOriginales.every((tr, idx) => {
        const trA = tramosAjustados[idx]
        return tr.desde === trA.desde && tr.hasta === trA.hasta && tr.color === trA.color && tr.negrita === trA.negrita
      })

    if (b0.texto === textoLimpio && nombreLimpio === '' && tramosIguales) {
      return guion
    }
  }

  const bloqueConsolidado: Bloque = {
    id: guion.bloques[0].id || generarUuid(),
    nombre: '',
    texto: textoLimpio,
    tramos: tramosAjustados.length > 0 ? tramosAjustados : []
  }

  return {
    ...guion,
    bloques: [bloqueConsolidado],
    modificado: Date.now()
  }
}
