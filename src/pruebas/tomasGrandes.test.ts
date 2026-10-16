// LAS TOMAS GRANDES -tomas-grandes, 15-10-2026-. El corte por tamaño: hasta 2.147.483.647 bytes el
// <video> de la WebView; más, el reproductor del sistema. Y qué devuelve abrirConReproductor según lo
// que conteste el nativo. Pruebas de lógica: el Intent se prueba en el teléfono.
import { describe, expect, test, vi, beforeEach } from 'vitest'

const nativo = vi.hoisted(() => ({ respuesta: null as null | Error, llamadas: [] as string[] }))
vi.mock('../lib/camara', () => ({
  CamaraNativa: {
    abrirConReproductor: async ({ ruta }: { ruta: string }) => {
      nativo.llamadas.push(ruta)
      if (nativo.respuesta) throw nativo.respuesta
    }
  }
}))
import { TOPE_BYTES_WEBVIEW, seVeConReproductorDelSistema, abrirConReproductor } from '../lib/archivosNativos'

describe('El corte por tamaño', () => {
  test('el tope es 2^31 - 1', () => {
    expect(TOPE_BYTES_WEBVIEW).toBe(2 ** 31 - 1)
  })
  test('hasta el tope, el <video> de siempre; un byte más, el reproductor del sistema', () => {
    expect(seVeConReproductorDelSistema(0)).toBe(false)
    expect(seVeConReproductorDelSistema(2147483647)).toBe(false)
    expect(seVeConReproductorDelSistema(2147483648)).toBe(true)
    // La toma medida en el Redmi: 5,29 GB.
    expect(seVeConReproductorDelSistema(5_290_000_000)).toBe(true)
  })
  test('sin tamaño conocido -NaN- no se corta', () => {
    expect(seVeConReproductorDelSistema(NaN)).toBe(false)
  })
})

describe('abrirConReproductor', () => {
  beforeEach(() => { nativo.respuesta = null; nativo.llamadas.length = 0 })
  test('pasa la ruta de la toma tal cual -content:// o el archivo privado- y devuelve ok', async () => {
    expect(await abrirConReproductor('content://media/external/video/media/9')).toBe('ok')
    expect(await abrirConReproductor('/data/user/0/com.sigoteleprompter.app/files/grabaciones/t.mp4')).toBe('ok')
    expect(nativo.llamadas).toEqual(['content://media/external/video/media/9', '/data/user/0/com.sigoteleprompter.app/files/grabaciones/t.mp4'])
  })
  test('sin aplicación que abra video: sin-aplicacion; otro problema: error', async () => {
    nativo.respuesta = new Error('sin aplicacion')
    expect(await abrirConReproductor('content://x')).toBe('sin-aplicacion')
    nativo.respuesta = new Error('not implemented')
    expect(await abrirConReproductor('content://x')).toBe('error')
  })
})
