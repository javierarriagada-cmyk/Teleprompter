import { ResumenGrabacion } from '../datos/modelo'

export const RESERVA_BYTES = 300 * 1024 * 1024 // 300 MB de reserva para el sistema y la toma en curso

export const TABLA_ARRANQUE_BPS: Record<string, number> = {
  '1080p': (20 * 1_000_000) / 8, // 20 Mbps = 2,500,000 bytes/seg
  '720p': (9 * 1_000_000) / 8,   // 9 Mbps  = 1,125,000 bytes/seg
  '480p': (3 * 1_000_000) / 8,   // 3 Mbps  = 375,000 bytes/seg
  'high': (20 * 1_000_000) / 8,
  'medium': (9 * 1_000_000) / 8,
  'low': (3 * 1_000_000) / 8
}

const RITMO_DEFECTO_BPS = (20 * 1_000_000) / 8

/**
 * Calcula los minutos disponibles para grabar en la calidad elegida.
 * - Descuenta una reserva de 300 MB.
 * - Si existen grabaciones propias en esa calidad, usa su ritmo real (bytes / duracionMs).
 * - De lo contrario, usa la tabla de arranque (1080p 20 Mbps, 720p 9 Mbps, 480p 3 Mbps).
 */
export function calcularMinutosDisponibles(
  bytesLibres: number,
  calidad: string,
  grabaciones: ResumenGrabacion[] = []
): number {
  const bytesDisponibles = Math.max(0, bytesLibres - RESERVA_BYTES)
  if (bytesDisponibles <= 0) return 0

  const grabacionesMismaCalidad = grabaciones.filter(
    (g) => g.calidad === calidad && g.duracionMs > 0 && g.bytes > 0
  )

  let ritmoBytesPorSegundo: number

  if (grabacionesMismaCalidad.length > 0) {
    const totalBytes = grabacionesMismaCalidad.reduce((acc, g) => acc + g.bytes, 0)
    const totalDuracionMs = grabacionesMismaCalidad.reduce((acc, g) => acc + g.duracionMs, 0)
    ritmoBytesPorSegundo = (totalBytes / totalDuracionMs) * 1000
  } else {
    ritmoBytesPorSegundo = TABLA_ARRANQUE_BPS[calidad] ?? RITMO_DEFECTO_BPS
  }

  if (ritmoBytesPorSegundo <= 0) return 0

  const ritmoBytesPorMinuto = ritmoBytesPorSegundo * 60
  return bytesDisponibles / ritmoBytesPorMinuto
}
