// -orden 2, punto 11- oferta.ts: con suscripción no abre; inicial una sola vez.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sim = vi.hoisted(() => ({
  nativo: true,
  plugin: true,
  tiene: false,
  presentPaywall: vi.fn(),
  presentCustomerCenter: vi.fn()
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => sim.nativo,
    isPluginAvailable: (n: string) => sim.plugin && n === 'RevenueCatUI'
  }
}))
vi.mock('@revenuecat/purchases-capacitor-ui', () => ({
  RevenueCatUI: {
    presentPaywall: sim.presentPaywall,
    presentCustomerCenter: sim.presentCustomerCenter
  }
}))
vi.mock('../lib/suscripcion', () => ({
  tieneSuscripcion: () => sim.tiene
}))

async function cargar() {
  vi.resetModules()
  return import('../lib/oferta')
}

beforeEach(() => {
  localStorage.clear()
  sim.nativo = true
  sim.plugin = true
  sim.tiene = false
  sim.presentPaywall.mockReset().mockResolvedValue({ result: 'PURCHASED' })
  sim.presentCustomerCenter.mockReset().mockResolvedValue(undefined)
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks() })

describe('oferta', () => {
  it('con suscripción no abre nada', async () => {
    sim.tiene = true
    const o = await cargar()
    expect(await o.abrirOferta('ajustes')).toBe(false)
    expect(sim.presentPaywall).not.toHaveBeenCalled()
  })

  it("'inicial' sale una sola vez", async () => {
    const o = await cargar()
    expect(o.yaSalioOfertaInicial()).toBe(false)
    expect(await o.abrirOfertaInicialSiCorresponde()).toBe(true)
    expect(sim.presentPaywall).toHaveBeenCalledTimes(1)
    expect(o.yaSalioOfertaInicial()).toBe(true)
    expect(await o.abrirOfertaInicialSiCorresponde()).toBe(false)
    expect(sim.presentPaywall).toHaveBeenCalledTimes(1)
  })

  it("si presentPaywall falla, no marca la inicial como vista", async () => {
    // Antes: se marcaba siempre; se perdía la única oferta si el plugin fallaba o no estaba publicada.
    sim.presentPaywall.mockRejectedValue(new Error('paywall no publicada'))
    const o = await cargar()
    expect(await o.abrirOfertaInicialSiCorresponde()).toBe(false)
    expect(o.yaSalioOfertaInicial()).toBe(false)
  })

  it("si no hay plugin nativo, no marca la inicial como vista", async () => {
    sim.plugin = false
    const o = await cargar()
    expect(await o.abrirOfertaInicialSiCorresponde()).toBe(false)
    expect(o.yaSalioOfertaInicial()).toBe(false)
  })
})
