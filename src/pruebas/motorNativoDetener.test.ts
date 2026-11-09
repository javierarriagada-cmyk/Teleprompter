// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026, orden t160u, punto 3. Esta rama no va a main ni a Play.
//
// MotorNativo.detener: una orden vieja de detener no corta la voz de una lectura nueva. Cada iniciar es un turno con
// sus oyentes y la captura que devolvió escuchar; detener() nombra esa captura -VoskNativoPlugin.detener solo cierra si
// lo abierto es esa: MicrofonoDeVentanaTest- y suelta solo sus oyentes. El plugin nativo es falso: guarda los oyentes
// vivos, las órdenes de detener y deja las respuestas de escuchar y detener en las manos de la prueba.
import { describe, test, expect, vi, beforeEach } from 'vitest'

const n = vi.hoisted(() => {
  const estado = {
    oyentes: new Set<{ evento: string; cb: (d: any) => void }>(),
    detenidos: [] as Array<{ captura?: number } | undefined>,
    escuchados: 0,
    // La respuesta de escuchar: la prueba la decide. Por defecto, inmediata con la captura que toque.
    escuchar: null as null | (() => Promise<any>),
    detener: null as null | (() => Promise<any>),
    siguienteCaptura: 1
  }
  const plugin = {
    disponible: async () => ({ disponible: true }),
    iniciar: async () => {},
    escuchar: async () => {
      estado.escuchados++
      if (estado.escuchar) return estado.escuchar()
      return { inicioEpochMs: Date.now(), captura: estado.siguienteCaptura++ }
    },
    detener: async (o?: { captura?: number }) => {
      estado.detenidos.push(o)
      if (estado.detener) return estado.detener()
      return { detenido: true }
    },
    addListener: async (evento: string, cb: (d: any) => void) => {
      const o = { evento, cb }
      estado.oyentes.add(o)
      return { remove: async () => { estado.oyentes.delete(o) } }
    }
  }
  return { estado, plugin }
})
vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return { ...actual, registerPlugin: () => n.plugin, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})

import { MotorNativo } from '../motor/MotorNativo'

function diferido<T>() {
  let resolver!: (v: T) => void
  const promesa = new Promise<T>((r) => { resolver = r })
  return { promesa, resolver }
}
const parciales = (texto: string) => {
  for (const o of [...n.estado.oyentes]) if (o.evento === 'parcial') o.cb({ json: JSON.stringify({ partial: texto }) })
}

describe('MotorNativo.detener solo detiene lo suyo', () => {
  beforeEach(() => {
    n.estado.oyentes.clear()
    n.estado.detenidos = []
    n.estado.escuchados = 0
    n.estado.escuchar = null
    n.estado.detener = null
    n.estado.siguienteCaptura = 1
  })

  test('el detener de la lectura vieja nombra su captura y no se lleva los oyentes de la lectura nueva', async () => {
    const motor = new MotorNativo()
    const oidos: string[] = []
    motor.onParcial((e) => oidos.push(e.texto))
    await motor.iniciar({ lang: 'es-ES' })
    // El detener de la vieja queda pendiente en el puente mientras empieza la nueva.
    const respuesta = diferido<any>()
    n.estado.detener = () => respuesta.promesa
    const viejo = motor.detener()
    n.estado.detener = null
    await motor.iniciar({ lang: 'es-ES' })
    respuesta.resolver({ detenido: true })
    await viejo
    expect(n.estado.detenidos).toEqual([{ captura: 1 }])
    // Los cuatro oyentes de la nueva siguen: la voz sigue llegando.
    expect(n.estado.oyentes.size).toBe(4)
    parciales('hola')
    expect(oidos).toEqual(['hola'])
    // Y su detener nombra la suya.
    await motor.detener()
    expect(n.estado.detenidos).toEqual([{ captura: 1 }, { captura: 2 }])
    expect(n.estado.oyentes.size).toBe(0)
  })

  test('solo los oyentes: los de la lectura nueva siguen después del detener viejo', async () => {
    const motor = new MotorNativo()
    const oidos: string[] = []
    motor.onParcial((e) => oidos.push(e.texto))
    await motor.iniciar({ lang: 'es-ES' })
    const respuesta = diferido<any>()
    n.estado.detener = () => respuesta.promesa
    const viejo = motor.detener()
    n.estado.detener = null
    await motor.iniciar({ lang: 'es-ES' })
    respuesta.resolver({ detenido: true })
    await viejo
    parciales('sigo')
    expect(oidos).toEqual(['sigo'])
  })

  test('detener con escuchar pendiente: la respuesta tardía es del turno cancelado y cierra solo esa captura', async () => {
    const motor = new MotorNativo()
    const tarde = diferido<any>()
    n.estado.escuchar = () => tarde.promesa
    const viejo = motor.iniciar({ lang: 'es-ES' })
    await vi.waitFor(() => expect(n.estado.escuchados).toBe(1))
    await motor.detener()
    // Todavía no se sabe qué captura abrió: no se manda un detener a ciegas.
    expect(n.estado.detenidos).toEqual([])
    n.estado.escuchar = null
    n.estado.siguienteCaptura = 8
    await motor.iniciar({ lang: 'es-ES' })
    tarde.resolver({ inicioEpochMs: Date.now(), captura: 7 })
    await viejo
    expect(n.estado.detenidos).toEqual([{ captura: 7 }])
    // Quedan solo los cuatro oyentes de la lectura nueva.
    expect(n.estado.oyentes.size).toBe(4)
  })

  test('detenido mientras se prepara: no abre el micrófono ni deja oyentes', async () => {
    const motor = new MotorNativo()
    const viejo = motor.iniciar({ lang: 'es-ES' })
    await motor.detener()
    await viejo
    expect(n.estado.escuchados).toBe(0)
    expect(n.estado.oyentes.size).toBe(0)
  })

  test('un APK sin captura: detener va sin captura, como antes', async () => {
    const motor = new MotorNativo()
    n.estado.escuchar = async () => ({ inicioEpochMs: Date.now() })
    await motor.iniciar({ lang: 'es-ES' })
    await motor.detener()
    expect(n.estado.detenidos).toEqual([undefined])
    expect(n.estado.oyentes.size).toBe(0)
  })

  test('captura 0 -el oído abierto es de otra sesión-: su detener no cierra nada', async () => {
    const motor = new MotorNativo()
    n.estado.escuchar = async () => ({ captura: 0 })
    await motor.iniciar({ lang: 'es-ES' })
    await motor.detener()
    expect(n.estado.detenidos).toEqual([])
    expect(n.estado.oyentes.size).toBe(0)
  })

  // -9-nov-2026, segunda vuelta- El recorrido normal de Leer y Grabar, y un cierre repetido.
  test('Leer o Grabar normal: el detener cierra su captura y suelta sus oyentes; repetido, no manda nada', async () => {
    const motor = new MotorNativo()
    await motor.iniciar({ lang: 'es-ES' })
    expect(n.estado.oyentes.size).toBe(4)
    await motor.detener()
    expect(n.estado.detenidos).toEqual([{ captura: 1 }])
    expect(n.estado.oyentes.size).toBe(0)
    // Pausa y Seguir: una lectura nueva del mismo motor, su propia captura.
    await motor.iniciar({ lang: 'es-ES' })
    await motor.detener()
    expect(n.estado.detenidos).toEqual([{ captura: 1 }, { captura: 2 }])
    // El cierre repetido -stop() dos veces, o la limpieza del hook después de stop()- no manda un detener a ciegas.
    await motor.detener()
    await motor.detener()
    expect(n.estado.detenidos).toEqual([{ captura: 1 }, { captura: 2 }])
  })

  test('el cierre repetido de un motor viejo no corta la lectura del motor nuevo', async () => {
    // useASR crea un motor nuevo al cambiar de motor y, al desmontarse, detiene el viejo otra vez.
    const viejo = new MotorNativo()
    await viejo.iniciar({ lang: 'es-ES' })
    await viejo.detener()
    const nuevo = new MotorNativo()
    const oidos: string[] = []
    nuevo.onParcial((e) => oidos.push(e.texto))
    await nuevo.iniciar({ lang: 'es-ES' })
    await viejo.detener()
    // Sin un detener sin captura -que en Android cierra lo que haya abierto-.
    expect(n.estado.detenidos).toEqual([{ captura: 1 }])
    parciales('sigue')
    expect(oidos).toEqual(['sigue'])
  })
})
