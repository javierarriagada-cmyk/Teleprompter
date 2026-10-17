// Antes -tomas-grandes-: el corte por tamaño y abrirConReproductor.
// -visor-servidor- Todas las tomas van por el servidor local. Una de más de 2^31 ya no pide el
// reproductor del sistema. Prueba de lógica: el módulo ya no exporta el salto.
import { describe, expect, test } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('El visor ya no corta por tamaño', () => {
  test('archivosNativos ya no tiene el tope ni el salto al reproductor del sistema', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../lib/archivosNativos.ts'), 'utf8')
    expect(src.includes('export const TOPE_BYTES_WEBVIEW')).toBe(false)
    expect(src.includes('export function seVeConReproductorDelSistema')).toBe(false)
    expect(src.includes('export async function abrirConReproductor')).toBe(false)
    expect(src.includes('export async function direccionDeToma')).toBe(true)
  })
})
