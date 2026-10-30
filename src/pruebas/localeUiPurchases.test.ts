// -idioma RevenueCat UI, 2026-10-29- Coordinación del locale de la UI de RevenueCat
// con el idioma de la app. Solo lógica: mapa, orden configure→override→present,
// llamada al cambiar idioma, fallo informado sin romper. Nada de posiciones.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sim = vi.hoisted(() => ({
  nativo: true,
  plugin: true,
  configure: vi.fn(),
  overridePreferredUILocale: vi.fn(),
  getCustomerInfo: vi.fn(),
  addCustomerInfoUpdateListener: vi.fn(),
  removeCustomerInfoUpdateListener: vi.fn(),
  logIn: vi.fn(),
  logOut: vi.fn(),
  isAnonymous: vi.fn(),
  then: vi.fn(),
  idioma: 'es' as 'es' | 'en' | 'pt',
  oyentesIdioma: [] as Array<() => void>
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => sim.nativo,
    isPluginAvailable: (n: string) => sim.plugin && n === 'Purchases'
  }
}))
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    then: sim.then,
    configure: sim.configure,
    overridePreferredUILocale: sim.overridePreferredUILocale,
    getCustomerInfo: sim.getCustomerInfo,
    addCustomerInfoUpdateListener: sim.addCustomerInfoUpdateListener,
    removeCustomerInfoUpdateListener: sim.removeCustomerInfoUpdateListener,
    logIn: sim.logIn,
    logOut: sim.logOut,
    isAnonymous: sim.isAnonymous
  }
}))
vi.mock('../lib/cuenta', () => ({
  estadoCuenta: () => ({ tipo: 'sinSesion' }),
  suscribirCuenta: () => () => {},
  sesionActual: async () => null
}))
vi.mock('../lib/idioma', () => ({
  idiomaApp: () => sim.idioma,
  suscribirIdioma: (fn: () => void) => {
    sim.oyentesIdioma.push(fn)
    return () => {
      sim.oyentesIdioma = sim.oyentesIdioma.filter((f) => f !== fn)
    }
  }
}))

async function cargar() {
  vi.resetModules()
  return import('../lib/suscripcion')
}

beforeEach(() => {
  sim.nativo = true
  sim.plugin = true
  sim.idioma = 'es'
  sim.oyentesIdioma = []
  sim.configure.mockReset().mockResolvedValue(undefined)
  sim.overridePreferredUILocale.mockReset().mockResolvedValue(undefined)
  sim.getCustomerInfo.mockReset().mockResolvedValue({
    customerInfo: { entitlements: { active: {}, all: {} }, requestDate: null }
  })
  sim.addCustomerInfoUpdateListener.mockReset().mockResolvedValue('oyente-1')
  sim.removeCustomerInfoUpdateListener.mockReset().mockResolvedValue(undefined)
  sim.logIn.mockReset()
  sim.logOut.mockReset()
  sim.isAnonymous.mockReset().mockResolvedValue({ isAnonymous: true })
  sim.then.mockReset().mockImplementation(() => { throw new Error('no asimilar') })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks() })

describe('localeUiDeIdiomaApp', () => {
  it('mapa es→es, en→en, pt→pt-BR', async () => {
    const s = await cargar()
    expect(s.localeUiDeIdiomaApp('es')).toBe('es')
    expect(s.localeUiDeIdiomaApp('en')).toBe('en')
    expect(s.localeUiDeIdiomaApp('pt')).toBe('pt-BR')
  })
})

describe('sincronizarLocaleUiPurchases', () => {
  it('configura y llama overridePreferredUILocale con el locale de la app', async () => {
    sim.idioma = 'pt'
    const s = await cargar()
    await s.sincronizarLocaleUiPurchases()
    expect(sim.configure).toHaveBeenCalled()
    expect(sim.overridePreferredUILocale).toHaveBeenCalledWith({ locale: 'pt-BR' })
  })

  it('respeta el idioma pasado, no el actual del store', async () => {
    sim.idioma = 'es'
    const s = await cargar()
    await s.sincronizarLocaleUiPurchases('en')
    expect(sim.overridePreferredUILocale).toHaveBeenCalledWith({ locale: 'en' })
  })

  it('si override falla, avisa con console.warn y no lanza', async () => {
    sim.overridePreferredUILocale.mockRejectedValue(new Error('sdk'))
    const s = await cargar()
    await expect(s.sincronizarLocaleUiPurchases()).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalled()
    const args = (console.warn as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === '[suscripcion]' && String(c[1]).includes('overridePreferredUILocale')
    )
    expect(args).toBeTruthy()
  })

  it('sin plugin nativo no llama override ni rompe', async () => {
    sim.nativo = false
    const s = await cargar()
    await s.sincronizarLocaleUiPurchases()
    expect(sim.overridePreferredUILocale).not.toHaveBeenCalled()
  })
})

describe('vigilarLocaleUiPurchases', () => {
  it('al cambiar el idioma de la app llama override de nuevo', async () => {
    const s = await cargar()
    const quitar = s.vigilarLocaleUiPurchases()
    expect(sim.oyentesIdioma.length).toBe(1)
    sim.idioma = 'en'
    sim.oyentesIdioma[0]()
    await vi.waitFor(() => {
      expect(sim.overridePreferredUILocale).toHaveBeenCalledWith({ locale: 'en' })
    })
    quitar()
    expect(sim.oyentesIdioma.length).toBe(0)
  })
})

describe('orden configure → override', () => {
  // abrirOferta / abrirCentroDeCliente: el orden config→override→present está en oferta.test.ts.
  // Aquí: sincronizarLocaleUiPurchases configura antes de override.
  it('sincronizarLocaleUiPurchases: configure termina antes de override', async () => {
    const orden: string[] = []
    let liberar!: () => void
    sim.configure.mockImplementation(() => new Promise<void>((resolve) => {
      orden.push('configure-start')
      liberar = () => { orden.push('configure-end'); resolve() }
    }))
    sim.overridePreferredUILocale.mockImplementation(async () => {
      orden.push('override')
    })
    const s = await cargar()
    const promesa = s.sincronizarLocaleUiPurchases('es')
    await vi.waitFor(() => { expect(orden).toContain('configure-start') })
    expect(orden).not.toContain('override')
    liberar()
    await promesa
    expect(orden).toEqual(['configure-start', 'configure-end', 'override'])
  })
})
