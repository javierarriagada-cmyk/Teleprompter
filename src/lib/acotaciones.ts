export const CARACTERES_APERTURA = ['[', '('] as const
export const CARACTERES_CIERRE = [']', ')'] as const

export function esCaracterApertura(ch: string): boolean {
  return ch === '[' || ch === '('
}

export function esCaracterCierre(ch: string): boolean {
  return ch === ']' || ch === ')'
}

export const REGEX_ACOTACION = /\[[^\]\n]*\]|\([^)\n]*\)/g
