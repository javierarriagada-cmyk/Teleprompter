// -orden 1, los cimientos del cobro, 26-10-2026- Solo lógica, con RevenueCat, Capacitor y la cuenta
// simulados. Nada de posiciones ni de orden en la pantalla.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sim = vi.hoisted(() => ({
  nativo: true,
  plugin: true,
  cuenta: { tipo: 'sinSesion' } as { tipo: string },
  uid: 'uid-123' as string | null,
  oyenteCuenta: null as null | (() => void),
  oyenteRC: null as null | ((info: any) => void),
  anonimo: false,
  configure: vi.fn(),
  getCustomerInfo: vi.fn(),
  addCustomerInfoUpdateListener: vi.fn(),
  removeCustomerInfoUpdateListener: vi.fn(),
  logIn: vi.fn(),
  logOut: vi.fn(),
  isAnonymous: vi.fn()
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => sim.nativo,
    isPluginAvailable: (n: string) => sim.plugin && n === 'Purchases'
  }
}))
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: sim.configure,
    getCustomerInfo: sim.getCustomerInfo,
    addCustomerInfoUpdateListener: sim.addCustomerInfoUpdateListener,
    removeCustomerInfoUpdateListener: sim.removeCustomerInfoUpdateListener,
    logIn: sim.logIn,
    logOut: sim.logOut,
    isAnonymous: sim.isAnonymous
  }
}))
vi.mock('../lib/cuenta', () => ({
  estadoCuenta: () => sim.cuenta,
  suscribirCuenta: (f: () => void) => {
    sim.oyenteCuenta = f
    return () => { sim.oyenteCuenta = null }
  },
  sesionActual: async () => (sim.uid ? { uid: sim.uid, app: {} } : null)
}))

const ID = 'sigo_teleprompter_pro'
const conDerecho = (vence: string | null) => ({ entitlements: { active: { [ID]: { identifier: ID, expirationDate: vence } }, all: {} } })
const sinDerecho = () => ({ entitlements: { active: { otro: { identifier: 'otro', expirationDate: null } }, all: {} } })

// Deja correr las promesas encadenadas.
const esperar = () => new Promise((r) => setTimeout(r, 0))

async function cargar() {
  vi.resetModules()
  return import('../lib/suscripcion')
}

beforeEach(() => {
  sim.nativo = true
  sim.plugin = true
  sim.cuenta = { tipo: 'sinSesion' }
  sim.uid = 'uid-123'
  sim.oyenteCuenta = null
  sim.oyenteRC = null
  sim.anonimo = false
  sim.configure.mockReset().mockResolvedValue(undefined)
  sim.getCustomerInfo.mockReset().mockResolvedValue({ customerInfo: sinDerecho() })
  sim.addCustomerInfoUpdateListener.mockReset().mockImplementation(async (f: any) => { sim.oyenteRC = f; return 'oyente-1' })
  sim.removeCustomerInfoUpdateListener.mockReset().mockResolvedValue(undefined)
  sim.logIn.mockReset().mockResolvedValue({ customerInfo: sinDerecho(), created: false })
  sim.logOut.mockReset().mockResolvedValue({ customerInfo: sinDerecho() })
  sim.isAnonymous.mockReset().mockImplementation(async () => ({ isAnonymous: sim.anonimo }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('suscripcion: sin teléfono o sin plugin no corre', () => {
  it('sin plataforma nativa, configure no se llama y no hay suscripción', async () => {
    sim.nativo = false
    sim.getCustomerInfo.mockResolvedValue({ customerInfo: conDerecho(null) })
    const s = await cargar()
    const parar = s.vigilarSuscripcion()
    await esperar()
    expect(sim.configure).not.toHaveBeenCalled()
    expect(s.tieneSuscripcion()).toBe(false)
    parar()
  })
  it('sin el plugin Purchases, configure no se llama y no hay suscripción', async () => {
    sim.plugin = false
    sim.getCustomerInfo.mockResolvedValue({ customerInfo: conDerecho(null) })
    const s = await cargar()
    const parar = s.vigilarSuscripcion()
    await esperar()
    expect(sim.configure).not.toHaveBeenCalled()
    expect(s.tieneSuscripcion()).toBe(false)
    parar()
  })
})

describe('suscripcion: el estado sale de entitlements.active', () => {
  it('configura una vez con la clave de Play y sin appUserID', async () => {
    const s = await cargar()
    s.vigilarSuscripcion()()
    s.vigilarSuscripcion()
    await esperar()
    expect(sim.configure).toHaveBeenCalledTimes(1)
    expect(sim.configure).toHaveBeenCalledWith({ apiKey: 'goog_PZWFLDXazqFJddcGKimfIslLFOK' })
  })
  it("'sinDatos' mientras no hay respuesta, y cuenta como sin suscripción", async () => {
    sim.getCustomerInfo.mockReturnValue(new Promise(() => {}))
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    expect(s.estadoSuscripcion()).toEqual({ tipo: 'sinDatos' })
    expect(s.tieneSuscripcion()).toBe(false)
  })
  it("con ID_DERECHO activo, 'conSuscripcion' con su vence", async () => {
    sim.getCustomerInfo.mockResolvedValue({ customerInfo: conDerecho('2026-11-26T00:00:00Z') })
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    expect(s.estadoSuscripcion()).toEqual({ tipo: 'conSuscripcion', vence: '2026-11-26T00:00:00Z' })
    expect(s.tieneSuscripcion()).toBe(true)
  })
  it("con ID_DERECHO activo y sin expirationDate, vence es null", async () => {
    sim.getCustomerInfo.mockResolvedValue({ customerInfo: conDerecho(null) })
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    expect(s.estadoSuscripcion()).toEqual({ tipo: 'conSuscripcion', vence: null })
  })
  it("sin ID_DERECHO activo, 'sinSuscripcion'", async () => {
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    expect(s.estadoSuscripcion()).toEqual({ tipo: 'sinSuscripcion' })
    expect(s.tieneSuscripcion()).toBe(false)
  })
})

describe('suscripcion: el oyente de RevenueCat', () => {
  it('actualiza el estado y avisa a los suscritos', async () => {
    const s = await cargar()
    const aviso = vi.fn()
    s.suscribirSuscripcion(aviso)
    s.vigilarSuscripcion()
    await esperar()
    aviso.mockClear()
    sim.oyenteRC!(conDerecho('2027-01-01T00:00:00Z'))
    expect(s.estadoSuscripcion()).toEqual({ tipo: 'conSuscripcion', vence: '2027-01-01T00:00:00Z' })
    expect(aviso).toHaveBeenCalled()
  })
  it('al dejar de vigilar se quita el oyente', async () => {
    const s = await cargar()
    const parar = s.vigilarSuscripcion()
    await esperar()
    parar()
    await esperar()
    expect(sim.removeCustomerInfoUpdateListener).toHaveBeenCalledWith({ listenerToRemove: 'oyente-1' })
  })
})

describe('suscripcion: la identidad sigue a la cuenta de Google', () => {
  it("'conSesion' llama logIn con el uid", async () => {
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    sim.cuenta = { tipo: 'conSesion' }
    sim.oyenteCuenta!()
    await esperar()
    expect(sim.logIn).toHaveBeenCalledWith({ appUserID: 'uid-123' })
  })
  it("'sinSesion' llama logOut", async () => {
    sim.cuenta = { tipo: 'conSesion' }
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    sim.cuenta = { tipo: 'sinSesion' }
    sim.oyenteCuenta!()
    await esperar()
    expect(sim.logOut).toHaveBeenCalled()
  })
  it("el 'sinSesion' con que arranca la cuenta no es una salida: no llama logOut", async () => {
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    expect(sim.isAnonymous).not.toHaveBeenCalled()
    expect(sim.logOut).not.toHaveBeenCalled()
  })
  it('si isAnonymous dice anónimo, logOut no se llama', async () => {
    sim.cuenta = { tipo: 'conSesion' }
    sim.anonimo = true
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    sim.cuenta = { tipo: 'sinSesion' }
    sim.oyenteCuenta!()
    await esperar()
    expect(sim.isAnonymous).toHaveBeenCalled()
    expect(sim.logOut).not.toHaveBeenCalled()
  })
})

describe('suscripcion: un error de RevenueCat no rompe nada', () => {
  it('deja el estado como estaba y no lanza', async () => {
    sim.getCustomerInfo.mockResolvedValue({ customerInfo: conDerecho('2026-12-01T00:00:00Z') })
    const s = await cargar()
    s.vigilarSuscripcion()
    await esperar()
    const antes = s.estadoSuscripcion()
    sim.logIn.mockRejectedValue(new Error('sin red'))
    sim.cuenta = { tipo: 'conSesion' }
    expect(() => sim.oyenteCuenta!()).not.toThrow()
    await esperar()
    expect(s.estadoSuscripcion()).toEqual(antes)
    expect(console.warn).toHaveBeenCalledWith('[suscripcion]', expect.anything())
  })
  it('si configure falla, no lanza y el estado queda en sinDatos', async () => {
    sim.configure.mockRejectedValue(new Error('clave mala'))
    const s = await cargar()
    expect(() => s.vigilarSuscripcion()).not.toThrow()
    await esperar()
    expect(s.estadoSuscripcion()).toEqual({ tipo: 'sinDatos' })
    expect(console.warn).toHaveBeenCalledWith('[suscripcion]', expect.anything())
  })
})
