// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

export function limitarTransparencia(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function limitarTamanoLetra(n: unknown, pasos: readonly number[]): number {
  if (pasos.length === 0) return 24
  if (typeof n !== 'number' || !Number.isFinite(n)) return pasos[0]
  if (pasos.includes(n)) return n
  return pasos.reduce((mejor, p) => Math.abs(p - n) < Math.abs(mejor - n) ? p : mejor)
}

export function tokenAlVolver(token: unknown, totalTokens: number): number {
  if (typeof token !== 'number' || !Number.isFinite(token) || totalTokens <= 0) return 0
  return Math.max(0, Math.min(Math.floor(token), totalTokens - 1))
}

export function colorConAlfa(hex: string, alfa: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alfa))})`
}
