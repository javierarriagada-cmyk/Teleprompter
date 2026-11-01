// -borrar-cuenta-suscripcion, 31-10-2026- Lógica pura: 200/404 ok, 500 lanza, uid codificado.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { borrarSuscriptorRevenueCat } from './borrarSuscriptorRevenueCat.ts'

describe('borrarSuscriptorRevenueCat', () => {
  it('trata 200 como hecho', async () => {
    const llamadas: { url: string; init?: { method?: string; headers?: Record<string, string> } }[] = []
    await borrarSuscriptorRevenueCat('uid-a', 'sk_test', async (url, init) => {
      llamadas.push({ url, init })
      return { status: 200 }
    })
    assert.equal(llamadas.length, 1)
    assert.equal(llamadas[0].init?.method, 'DELETE')
    assert.equal(llamadas[0].init?.headers?.Authorization, 'Bearer sk_test')
  })

  it('trata 404 como hecho (cliente inexistente)', async () => {
    await borrarSuscriptorRevenueCat('uid-b', 'sk_test', async () => ({ status: 404 }))
  })

  it('lanza error con 500 para reintentar', async () => {
    await assert.rejects(
      () => borrarSuscriptorRevenueCat('uid-c', 'sk_test', async () => ({ status: 500 })),
      /500/
    )
  })

  it('codifica el uid en la URL', async () => {
    let vista = ''
    await borrarSuscriptorRevenueCat('a/b c', 'sk_test', async (url) => {
      vista = url
      return { status: 200 }
    })
    assert.equal(vista, 'https://api.revenuecat.com/v1/subscribers/a%2Fb%20c')
    assert.ok(!vista.includes('a/b c'))
  })
})
