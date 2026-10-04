// EL TIEMPO ESTIMADO ANTES DE GUARDAR -tarea 87, E2, 04-10-2026-. Guardar con subtítulos recodifica
// la toma: en una de 5 minutos es casi un minuto mirando un porcentaje. Se anuncia antes, con la
// cifra medida. No cambia el guardado ni su avance.
// Moto g86, paso 0 de la tarea 87 -04-10-2026-: ~11,2 s por minuto de toma, parejo.
export const MS_GUARDADO_POR_MINUTO = 11200
// Bajo 1 minuto de toma el guardado dura menos de ~12 s y el porcentaje del botón alcanza; además
// 1 min es la toma medida más corta: bajo eso no hay cifra.
export const UMBRAL_TIEMPO_ESTIMADO_MS = 60000

// Redondeado HACIA ARRIBA al múltiplo de 5 s: con 11,2 s/min lineal, 5 min quedaría 2,7 s bajo lo
// medido -NO CALZA 1 del paso 0-. Así las dos cifras medidas quedan dentro y el número no finge una
// precisión que no tiene. Si se ajusta la cifra, cambia solo MS_GUARDADO_POR_MINUTO.
export function segundosEstimados(duracionMs: number): number | null {
  if (typeof duracionMs !== 'number' || !Number.isFinite(duracionMs)) return null
  if (duracionMs < UMBRAL_TIEMPO_ESTIMADO_MS) return null
  const estimadoMs = (duracionMs * MS_GUARDADO_POR_MINUTO) / 60000
  return Math.ceil(estimadoMs / 5000) * 5
}

// "15 s", "1 min", "3 min 45 s". Las unidades son iguales en español y en inglés.
export function textoTiempo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  if (s < 60) return `${s} s`
  const min = Math.floor(s / 60)
  const resto = s % 60
  return resto === 0 ? `${min} min` : `${min} min ${resto} s`
}
