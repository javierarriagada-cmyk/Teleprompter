// -proxima-version, 2026-11-07- Las pruebas de lógica de los cuatro cambios de la próxima versión: el nombre
// de cada calidad, el enlace de compartir, el formato de los números del aviso de límite y la decisión de
// mostrarlo. Solo lógica: cómo se ve lo juzga Javier en el teléfono.
import { describe, expect, test } from 'vitest'
import { etiquetaCalidad } from '../lib/camara'
import { ENLACE_PLAY, enlaceCompartirSigo } from '../lib/enlacesSitio'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'

describe('proxima-version punto 2 - etiquetaCalidad', () => {
  test('las tres calidades llevan su nombre, con un punto medio', () => {
    expect(etiquetaCalidad('1080p')).toBe('1080p · Full HD')
    expect(etiquetaCalidad('720p')).toBe('720p · HD')
    expect(etiquetaCalidad('480p')).toBe('480p · SD')
  })
  test('una calidad que no está en la lista se muestra tal cual', () => {
    expect(etiquetaCalidad('high')).toBe('high')
    expect(etiquetaCalidad('2160p')).toBe('2160p')
  })
})

describe('proxima-version punto 3 - el enlace de compartir', () => {
  test('exacto, carácter por carácter', () => {
    expect(enlaceCompartirSigo()).toBe(
      'https://play.google.com/store/apps/details?id=com.sigoteleprompter.app&referrer=utm_source%3Dapp%26utm_campaign%3Dcompartir'
    )
    expect(ENLACE_PLAY).toBe('https://play.google.com/store/apps/details?id=com.sigoteleprompter.app')
  })
  test('el texto de compartir trae el enlace en los tres idiomas', () => {
    for (const textos of [es, en, pt]) {
      for (const clave of ['calificarSigo', 'compartirSigo', 'textoCompartirSigo'] as const) {
        expect(typeof textos[clave], clave).toBe('string')
        expect(textos[clave].length, clave).toBeGreaterThan(0)
      }
      expect(textos.textoCompartirSigo).toContain('{url}')
    }
  })
})
