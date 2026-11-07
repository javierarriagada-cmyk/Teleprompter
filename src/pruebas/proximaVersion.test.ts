// -proxima-version, 2026-11-07- Las pruebas de lógica de los cuatro cambios de la próxima versión: el nombre
// de cada calidad, el enlace de compartir, el formato de los números del aviso de límite y la decisión de
// mostrarlo. Solo lógica: cómo se ve lo juzga Javier en el teléfono.
import { describe, expect, test } from 'vitest'
import { etiquetaCalidad } from '../lib/camara'
import { ENLACE_PLAY, enlaceCompartirSigo } from '../lib/enlacesSitio'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'
import { decidirAvisoLimiteGratis, formatearLimite, relojDeSegundos, yaSalioAvisoLimite, marcarAvisoLimiteVisto, olvidarAvisosLimite, LIMITES_POR_OMISION, type EntradaAvisoLimite } from '../lib/limites'
import { segundosDeLectura, duracionDeLecturaReloj } from '../datos/modelo'

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

describe('proxima-version punto 4 - los números del aviso', () => {
  test('180 da «3 minutos» y «3 min»; 60 da «1 minuto» y «1 min»; 150 da «2:30»', () => {
    expect(formatearLimite(180, es)).toEqual({ tiempo: '3 minutos', corto: '3 min' })
    expect(formatearLimite(60, es)).toEqual({ tiempo: '1 minuto', corto: '1 min' })
    expect(formatearLimite(150, es)).toEqual({ tiempo: '2:30', corto: '2:30' })
  })
  test('en inglés y en portugués', () => {
    expect(formatearLimite(180, en)).toEqual({ tiempo: '3 minutes', corto: '3 min' })
    expect(formatearLimite(60, en)).toEqual({ tiempo: '1 minute', corto: '1 min' })
    expect(formatearLimite(180, pt)).toEqual({ tiempo: '3 minutos', corto: '3 min' })
    expect(formatearLimite(60, pt)).toEqual({ tiempo: '1 minuto', corto: '1 min' })
  })
  test('{d} en reloj, igual que el dock', () => {
    expect(relojDeSegundos(250)).toBe('4:10')
    // La misma cuenta del dock para cualquier guion: 625 palabras a 150 por minuto.
    expect(relojDeSegundos(segundosDeLectura(625))).toBe(duracionDeLecturaReloj(625))
    expect(relojDeSegundos(segundosDeLectura(77))).toBe(duracionDeLecturaReloj(77))
  })
})

describe('proxima-version punto 4 - la decisión del aviso', () => {
  const lim = { lecturaSeg: 240, grabacionSeg: 180, avisoAntesSeg: 60 }
  const base: EntradaAvisoLimite = { tipo: 'grabacion', fija: false, segundosGuion: 181, limites: lim, conSuscripcion: false, yaVisto: false }

  test('con aviso en Grabar con 181 s y un límite de 180', () => {
    expect(decidirAvisoLimiteGratis(base)).toEqual({ aviso: true, tipo: 'grabacion', limiteSeg: 180, segundosGuion: 181 })
  })
  test('con aviso en Leer con voz con 241 s y un límite de 240', () => {
    expect(decidirAvisoLimiteGratis({ ...base, tipo: 'lectura', segundosGuion: 241 }))
      .toEqual({ aviso: true, tipo: 'lectura', limiteSeg: 240, segundosGuion: 241 })
  })
  test('sin aviso con Sigo+', () => {
    expect(decidirAvisoLimiteGratis({ ...base, conSuscripcion: true }).aviso).toBe(false)
    expect(decidirAvisoLimiteGratis({ ...base, tipo: 'lectura', segundosGuion: 241, conSuscripcion: true }).aviso).toBe(false)
  })
  test('sin aviso en Leer con Velocidad fija', () => {
    expect(decidirAvisoLimiteGratis({ ...base, tipo: 'lectura', fija: true, segundosGuion: 999 }).aviso).toBe(false)
  })
  test('sin aviso si el guion dura igual o menos que el límite', () => {
    expect(decidirAvisoLimiteGratis({ ...base, segundosGuion: 180 }).aviso).toBe(false)
    expect(decidirAvisoLimiteGratis({ ...base, segundosGuion: 100 }).aviso).toBe(false)
    expect(decidirAvisoLimiteGratis({ ...base, tipo: 'lectura', segundosGuion: 240 }).aviso).toBe(false)
  })
  test('el límite sale de los límites que entran, no de un número escrito', () => {
    expect(decidirAvisoLimiteGratis({ ...base, segundosGuion: 200, limites: { ...lim, grabacionSeg: 300 } }).aviso).toBe(false)
    expect(decidirAvisoLimiteGratis({ ...base, segundosGuion: 200, limites: LIMITES_POR_OMISION })).toMatchObject({ aviso: true, limiteSeg: 180 })
  })
  test('sin aviso si ya salió para ese guion y ese tipo', () => {
    expect(decidirAvisoLimiteGratis({ ...base, yaVisto: true }).aviso).toBe(false)
  })
  test('lo visto se recuerda por guion y por tipo: el de Grabar ya visto no apaga el de Leer', () => {
    olvidarAvisosLimite()
    expect(yaSalioAvisoLimite('g1', 'grabacion')).toBe(false)
    marcarAvisoLimiteVisto('g1', 'grabacion')
    expect(yaSalioAvisoLimite('g1', 'grabacion')).toBe(true)
    expect(yaSalioAvisoLimite('g1', 'lectura')).toBe(false)
    expect(yaSalioAvisoLimite('g2', 'grabacion')).toBe(false)
    expect(localStorage.getItem('sigo_aviso_limite_vistos')).toContain('grabacion:g1')
    const leer = decidirAvisoLimiteGratis({ ...base, tipo: 'lectura', segundosGuion: 241, yaVisto: yaSalioAvisoLimite('g1', 'lectura') })
    expect(leer.aviso).toBe(true)
    olvidarAvisosLimite()
  })
})

describe('proxima-version - las claves nuevas existen en es, en y pt', () => {
  const claves = [
    'calificarSigo', 'compartirSigo', 'textoCompartirSigo', 'limiteUnMinuto', 'limiteMinutos', 'limiteMinutosCorto',
    'avisoLimiteTitulo', 'avisoLimiteTextoGrabar', 'avisoLimiteTextoLeer', 'avisoLimitePrueba', 'avisoLimiteGrabar',
    'avisoLimiteLeer', 'avisoLimiteVerSigoMas'
  ] as const
  test.each([['es', es], ['en', en], ['pt', pt]] as const)('%s', (_, textos) => {
    for (const c of claves) expect(typeof textos[c] === 'string' && textos[c].length > 0, c).toBe(true)
  })
})
