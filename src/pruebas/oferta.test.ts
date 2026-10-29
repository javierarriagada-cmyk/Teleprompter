// -orden 2, punto 11- oferta.ts: con suscripción no abre; inicial una sola vez.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sim = vi.hoisted(() => ({
  nativo: true,
  plugin: true,
  tiene: false,
  asegurarConfigurado: vi.fn(),
  sincronizarLocaleUiPurchases: vi.fn(),
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
  tieneSuscripcion: () => sim.tiene,
  asegurarConfigurado: () => sim.asegurarConfigurado(),
  sincronizarLocaleUiPurchases: () => sim.sincronizarLocaleUiPurchases()
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
  sim.asegurarConfigurado.mockReset().mockResolvedValue(true)
  sim.sincronizarLocaleUiPurchases.mockReset().mockResolvedValue(undefined)
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

  it('no llama presentPaywall antes de que termine configurar', async () => {
    // Sin el arreglo (abrirOferta no await asegurarConfigurado) el orden sería solo 'paywall'
    // — o presentPaywall correría sin haber llamado a asegurarConfigurado.
    const orden: string[] = []
    let liberar!: (v: boolean) => void
    sim.asegurarConfigurado.mockImplementation(() => new Promise<boolean>((resolve) => {
      orden.push('config-start')
      liberar = (v) => { orden.push('config-end'); resolve(v) }
    }))
    sim.sincronizarLocaleUiPurchases.mockImplementation(async () => {
      orden.push('override')
    })
    sim.presentPaywall.mockImplementation(async () => {
      orden.push('paywall')
      return { result: 'PURCHASED' }
    })
    const o = await cargar()
    const promesa = o.abrirOferta('ajustes')
    await vi.waitFor(() => { expect(orden).toContain('config-start') })
    expect(orden).not.toContain('paywall')
    expect(sim.presentPaywall).not.toHaveBeenCalled()
    liberar(true)
    expect(await promesa).toBe(true)
    // -idioma RevenueCat UI, 2026-10-29- configure → override → present.
    expect(orden).toEqual(['config-start', 'config-end', 'override', 'paywall'])
  })

  it('si Purchases no quedó configurado, no abre la oferta', async () => {
    sim.asegurarConfigurado.mockResolvedValue(false)
    const o = await cargar()
    expect(await o.abrirOferta('ajustes')).toBe(false)
    expect(sim.presentPaywall).not.toHaveBeenCalled()
  })

  it('abrirCentroDeCliente: configure → override → presentCustomerCenter', async () => {
    const orden: string[] = []
    sim.asegurarConfigurado.mockImplementation(async () => {
      orden.push('config')
      return true
    })
    sim.sincronizarLocaleUiPurchases.mockImplementation(async () => {
      orden.push('override')
    })
    sim.presentCustomerCenter.mockImplementation(async () => {
      orden.push('center')
    })
    const o = await cargar()
    await o.abrirCentroDeCliente()
    expect(orden).toEqual(['config', 'override', 'center'])
  })
})

describe('decidirOfertaAlLimite', () => {
  // -pasada teléfono PR 157, 27-10-2026- Al llegar a cada límite, la oferta se pide una sola vez.
  // Sin el cambio (devolver siempre null / no abrir sola) esta prueba falla.
  it('al llegar a cada límite, la oferta se pide una sola vez', async () => {
    const o = await cargar()
    expect(o.decidirOfertaAlLimite('lectura', false)).toBe('limiteLectura')
    expect(o.decidirOfertaAlLimite('lectura', true)).toBeNull()
    expect(o.decidirOfertaAlLimite('grabacion', false)).toBe('limiteGrabacion')
    expect(o.decidirOfertaAlLimite('grabacion', true)).toBeNull()
  })
})
