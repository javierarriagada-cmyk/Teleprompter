import { describe, expect, test } from 'vitest'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  armarJwt, leerNotas, leerBloques, cuerpoDePista, pistaPedida, juntarConPista, rangoDe28Dias
} from '../../scripts/playApi.mjs'

describe('play', () => {
  test('arma el JWT con una llave de prueba', () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
    const jwt = armarJwt({ email: 'prueba@ejemplo.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, 1_700_000_000)
    const [cabecera, cuerpo, firma] = jwt.split('.')
    expect(JSON.parse(Buffer.from(cabecera, 'base64url').toString()).alg).toBe('RS256')
    expect(JSON.parse(Buffer.from(cuerpo, 'base64url').toString()).iss).toBe('prueba@ejemplo.iam.gserviceaccount.com')
    expect(firma.length).toBeGreaterThan(20)
  })

  test('lee las notas en los dos idiomas', () => {
    const notas = leerNotas(readFileSync(resolve('docs/play/notas-version.txt'), 'utf8'))
    expect(notas['es-419']).toContain('sigue la voz')
    expect(notas['en-US']).toContain('follows your voice')
  })

  test('lee los tres bloques de la ficha', () => {
    const b = leerBloques(readFileSync(resolve('docs/play/ficha/textos-es-419.txt'), 'utf8'))
    expect(b.nombre).toBe('Sigo — Teleprompter de voz')
    expect(b.breve.length).toBeGreaterThan(0)
    expect(b.completa.length).toBeGreaterThan(b.breve.length)
  })

  test('arma el cuerpo de la pista interna, en borrador o publicada', () => {
    const notas = { 'es-419': 'hola', 'en-US': 'hi' }
    const borrador = cuerpoDePista({ versionName: '0.9.0', notas, lanzar: false, versionCode: 12 })
    expect(borrador.track).toBe('internal')
    expect(borrador.releases[0].status).toBe('draft')
    expect(borrador.releases[0].name).toBe('0.9.0 – prueba interna')
    expect(borrador.releases[0].releaseNotes).toEqual([
      { language: 'es-419', text: 'hola' },
      { language: 'en-US', text: 'hi' }
    ])
    expect(cuerpoDePista({ versionName: '0.9.0', notas, lanzar: true }).releases[0].status).toBe('completed')
  })

  test('un borrador conserva la version que tienen los testers; lanzar la reemplaza', () => {
    const notas = { 'es-419': 'hola', 'en-US': 'hi' }
    const actuales = [{ status: 'completed', versionCodes: ['597'] }, { status: 'draft', versionCodes: ['598'] }]
    const borrador = juntarConPista(cuerpoDePista({ versionName: '0.9.1', notas, lanzar: false, versionCode: 599 }), actuales, false)
    expect(borrador.releases.map((r: { versionCodes: string[] }) => r.versionCodes[0])).toEqual(['597', '599'])
    const lanzada = juntarConPista(cuerpoDePista({ versionName: '0.9.1', notas, lanzar: true, versionCode: 599 }), actuales, true)
    expect(lanzada.releases.map((r: { versionCodes: string[] }) => r.versionCodes[0])).toEqual(['599'])
  })

  test('el rango de calidad son 28 dias calendario hasta el ultimo con datos', () => {
    const r = rangoDe28Dias({ year: 2026, month: 3, day: 10 })
    expect(r.startTime).toMatchObject({ year: 2026, month: 2, day: 10 })
    expect(r.endTime).toMatchObject({ year: 2026, month: 3, day: 10 })
    expect(r.endTime.timeZone.id).toBe('America/Los_Angeles')
  })

  test('se niega a producción', () => {
    expect(() => pistaPedida('production')).toThrow(/producción/)
  })

  test('simular no llama a fetch', async () => {
    const original = globalThis.fetch
    let llamadas = 0
    globalThis.fetch = () => { llamadas++; return Promise.resolve({ ok: true, json: async () => ({}) }) }
    const { subirAInterna } = await import('../../scripts/playSubir.mjs')
    await subirAInterna({ aab: 'no-existe.aab', lanzar: false, simular: true })
    expect(llamadas).toBe(0)
    globalThis.fetch = original
  })
})
