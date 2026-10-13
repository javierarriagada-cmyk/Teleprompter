// Tipos de alinearToma.js -13-10-2026, banco del motor-. El modulo es JavaScript plano para que
// scripts/medir-toma.mjs lo siga usando con node a secas; esto deja que el banco lo use con tipos.
export type PalabraOida = { w: string; ini: number; fin: number; llegada: number }
export type CuadroRegistro = { ms: number; pos: number; trabado: number | null }
export type TokenGuion = { w: string; acot: boolean }
export type Registro = {
  guion: string[]
  cab: Record<string, string>
  oidas: PalabraOida[]
  cuadros: CuadroRegistro[]
  renglones: number[] | null
  retrasos: number[]
  cruces: number[]
  capturas: number[]
  procesos: number[]
  oido: string | null
}
export type MedicionContraLaVoz = {
  tokens: TokenGuion[]
  pares: Array<[number, number]>
  conocidos: Array<[number, number]>
  atrasoPal: number[]
  atrasoRen: number[]
  muestras: Array<{ t: number; tok: number; pos: number }>
  primerMov: CuadroRegistro | null
  dichoAntes: number | null
  tokenDichoEn?: (t: number) => number | null
}
export const CERCANIA: number
export function normalizar(s: string): string
export function leven(a: string, b: string): number
export function similar(a: string, b: string): boolean
export function tokensDelGuion(lineas: string[]): TokenGuion[]
export function leerRegistro(texto: string): Registro
export function alinear(oidas: PalabraOida[], tokens: TokenGuion[], calceEn: ((t: number) => number) | null): Array<[number, number]>
export function percentil(arr: number[], p: number): number
export function medirContraLaVoz(reg: Registro, cuadros?: CuadroRegistro[]): MedicionContraLaVoz
