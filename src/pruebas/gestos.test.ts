// TAREA 88 -04-10-2026-: el confirmador y el vigía de los gestos -docs/tarea88.txt, 6.3 y 6.4-. Puros.
import { describe, expect, test } from 'vitest'
import { confirmadorNuevo, revisar, gestoDe, Confirmado, REVISIONES_PARA_CONFIRMAR } from '../lib/confirmadorGestos'
import { vigiaNuevo, oirParcial, oirFinal, debePedir, alPedir, alResponder, Vigia, Situacion } from '../lib/vigiaGestos'

function pasar(etiquetas: Array<[string, number, number]>): Confirmado[] {
  let c = confirmadorNuevo()
  const salen: Confirmado[] = []
  for (const [etiqueta, puntaje, tMs] of etiquetas) {
    const r = revisar(c, { etiqueta, puntaje, tMs })
    c = r.confirmador
    if (r.confirmado) salen.push(r.confirmado)
  }
  return salen
}

// Un lazo como el de App: cada 100 ms pregunta; si toca, pide y la respuesta llega en `demoraMs`.
function correr(v0: Vigia, sit: Situacion, desdeMs: number, hastaMs: number, opciones: { demoraMs?: number; voz?: (t: number, v: Vigia) => Vigia } = {}) {
  let v = v0
  const pedidos: number[] = []
  let respondeEn: number | null = null
  let maxEnVuelo = 0
  let enVuelo = 0
  for (let t = desdeMs; t <= hastaMs; t += 100) {
    if (opciones.voz) v = opciones.voz(t, v)
    if (respondeEn !== null && t >= respondeEn) { v = alResponder(v); enVuelo--; respondeEn = null }
    if (debePedir(v, sit, t)) {
      v = alPedir(v, t)
      pedidos.push(t)
      enVuelo++
      maxEnVuelo = Math.max(maxEnVuelo, enVuelo)
      respondeEn = t + (opciones.demoraMs ?? 50)
      if ((opciones.demoraMs ?? 50) < 100) { v = alResponder(v); enVuelo--; respondeEn = null }
    }
  }
  return { pedidos, maxEnVuelo }
}

describe('Tarea 88: el confirmador', () => {
  test('tres Open_Palm confirman con la hora de la primera', () => {
    expect(REVISIONES_PARA_CONFIRMAR).toBe(3)
    const salen = pasar([['Open_Palm', 0.9, 1000], ['Open_Palm', 0.8, 1500], ['Open_Palm', 0.7, 2000]])
    expect(salen).toEqual([{ gesto: 'palma', tMs: 2000, vistoDesdeMs: 1000 }])
    expect(gestoDe({ etiqueta: 'Victory', puntaje: 0.9 })).toBe('victoria')
    expect(gestoDe({ etiqueta: 'Open_Palm', puntaje: 0.5 })).toBe('ninguno')
    expect(gestoDe({ etiqueta: 'Thumb_Up', puntaje: 0.99 })).toBe('ninguno')
    expect(gestoDe({ etiqueta: 'sinCuadro', puntaje: 0 })).toBe('ninguno')
  })

  test('un None reinicia', () => {
    const salen = pasar([['Open_Palm', 0.9, 1000], ['Open_Palm', 0.9, 1500], ['None', 0.9, 2000], ['Open_Palm', 0.9, 2500], ['Open_Palm', 0.9, 3000]])
    expect(salen.filter((s) => s.gesto === 'palma')).toEqual([])
    const otra = pasar([['Open_Palm', 0.9, 1000], ['Open_Palm', 0.9, 1500], ['None', 0.9, 2000], ['Open_Palm', 0.9, 2500], ['Open_Palm', 0.9, 3000], ['Open_Palm', 0.9, 3500]])
    expect(otra.filter((s) => s.gesto === 'palma')).toEqual([{ gesto: 'palma', tMs: 3500, vistoDesdeMs: 2500 }])
  })

  test('emite una vez por racha', () => {
    const salen = pasar([1000, 1500, 2000, 2500, 3000, 3500].map((t) => ['Open_Palm', 0.9, t] as [string, number, number]))
    expect(salen).toHaveLength(1)
    // Otra racha -después de bajar la mano- vuelve a emitir.
    const dos = pasar([['Victory', 0.9, 0], ['Victory', 0.9, 500], ['Victory', 0.9, 1000], ['None', 0.9, 1500], ['None', 0.9, 2000], ['None', 0.9, 2500], ['Victory', 0.9, 3000], ['Victory', 0.9, 3500], ['Victory', 0.9, 4000]])
    expect(dos.map((s) => s.gesto)).toEqual(['victoria', 'ninguno', 'victoria'])
  })
})

describe('Tarea 88: el vigía', () => {
  const grabando: Situacion = { activo: true, estado: 'grabando' }

  test('con voz cambiando: cero pedidos', () => {
    let n = 0
    const r = correr(vigiaNuevo(0), grabando, 0, 10000, {
      voz: (t, v) => (t % 1000 === 0 ? oirParcial(v, `palabra ${n++}`, t).vigia : v)
    })
    expect(r.pedidos).toEqual([])
  })

  test('el mismo parcial repetido cuenta como silencio', () => {
    const r = correr(vigiaNuevo(0), grabando, 0, 3000, {
      voz: (t, v) => (t % 300 === 0 ? oirParcial(v, 'hola que tal', t).vigia : v)
    })
    // El texto cambió una sola vez, en t=0: a los 2 s empieza a pedir.
    expect(r.pedidos[0]).toBe(2000)
    // Un final no vacío sí es cambio; uno vacío no.
    const v = vigiaNuevo(0)
    expect(oirFinal(v, 'hola', 100).cambio).toBe(true)
    expect(oirFinal(v, '   ', 100).cambio).toBe(false)
    expect(oirParcial(oirParcial(v, 'hola', 100).vigia, 'hola', 200).cambio).toBe(false)
  })

  test('a los 2 s sin cambio: un pedido cada 500 ms', () => {
    const r = correr(vigiaNuevo(0), grabando, 0, 4000)
    expect(r.pedidos).toEqual([2000, 2500, 3000, 3500, 4000])
  })

  test('en pausa: cada 500 ms', () => {
    // En pausa la voz está apagada: no hace falta esperar el silencio.
    const r = correr(vigiaNuevo(0), { activo: true, estado: 'pausada' }, 0, 1500)
    expect(r.pedidos).toEqual([0, 500, 1000, 1500])
  })

  test('apagado, trasera o confirmando: cero pedidos', () => {
    // Trasera o interruptor apagado llegan como activo: false -lo arma App-.
    expect(correr(vigiaNuevo(0), { activo: false, estado: 'grabando' }, 0, 5000).pedidos).toEqual([])
    expect(correr(vigiaNuevo(0), { activo: false, estado: 'pausada' }, 0, 5000).pedidos).toEqual([])
    expect(correr(vigiaNuevo(0), { activo: true, estado: 'confirmando' }, 0, 5000).pedidos).toEqual([])
  })

  // -tarea 88, segunda vuelta, 04-10-2026- Toma 6cce33b4 del moto g86: «ellos» terminó a los 15 108 y el
  // FINAL llegó a los 16 453 con el mismo texto que el último parcial.
  test('un FINAL con el mismo texto que el último parcial no mueve el reloj de voz', () => {
    let v = oirParcial(vigiaNuevo(0), 'y para ellos', 15_400).vigia
    const f = oirFinal(v, 'y para ellos', 16_453, 15_108)
    expect(f.cambio).toBe(false)
    expect(f.vigia.ultimoCambioMs).toBe(15_400)
    // Con el reloj quieto, a los 2 s del último parcial ya pide -no a los 2 s del FINAL-.
    v = f.vigia
    expect(debePedir(v, grabando, 17_400)).toBe(true)
    // Un FINAL distinto del último parcial sí es cambio.
    expect(oirFinal(oirParcial(vigiaNuevo(0), 'y para', 15_000).vigia, 'y para ellos', 16_453, 15_108).cambio).toBe(true)
  })

  test('finVozMs sale del fin de la última palabra del FINAL', () => {
    const v = oirParcial(vigiaNuevo(0), 'y para ellos', 15_400).vigia
    expect(v.finVozMs).toBe(15_400)
    expect(oirFinal(v, 'y para ellos', 16_453, 15_108).vigia.finVozMs).toBe(15_108)
  })

  test('sin palabras con hora, finVozMs es la hora del último cambio de texto', () => {
    const v = oirParcial(vigiaNuevo(0), 'el poema', 47_900).vigia
    // Mismo texto: el último cambio fue el parcial.
    expect(oirFinal(v, 'el poema', 49_000, null).vigia.finVozMs).toBe(47_900)
    // Texto distinto: el cambio es el FINAL mismo.
    expect(oirFinal(v, 'el poema entero', 49_000, null).vigia.finVozMs).toBe(49_000)
    // Recién empezada la toma -o vuelta la pausa- sin voz: el comienzo.
    expect(vigiaNuevo(30_000).finVozMs).toBe(30_000)
  })

  test('nunca dos pedidos en vuelo', () => {
    // La respuesta tarda 1,2 s: el siguiente pedido espera la respuesta.
    const r = correr(vigiaNuevo(0), { activo: true, estado: 'pausada' }, 0, 5000, { demoraMs: 1200 })
    expect(r.maxEnVuelo).toBe(1)
    expect(r.pedidos).toEqual([0, 1200, 2400, 3600, 4800])
  })
})

// -tarea 88, segunda vuelta, 04-10-2026- «No disponible» falso: lib/gestos.ts, decidirPreparar.
import { decidirPreparar, NEGROS_PARA_NO_DISPONIBLE } from '../lib/gestos'
describe('Tarea 88, segunda vuelta: preparar los gestos', () => {
  test('sin vista previa se reintenta siempre; el reconocedor que no arranca es no disponible', () => {
    expect(decidirPreparar({ ok: false, estado: 'sinVistaPrevia' }, 0)).toBe('reintentar')
    expect(decidirPreparar({ ok: false, estado: 'sinVistaPrevia' }, 0)).toBe('reintentar')
    expect(decidirPreparar({ ok: false, estado: 'reconocedor' }, 0)).toBe('no')
    expect(decidirPreparar({ ok: true, estado: 'listo' }, 0)).toBe('si')
  })
  test('negro: no disponible recién cuando sigue negro', () => {
    expect(NEGROS_PARA_NO_DISPONIBLE).toBe(3)
    expect(decidirPreparar({ ok: false, estado: 'negro' }, 1)).toBe('reintentar')
    expect(decidirPreparar({ ok: false, estado: 'negro' }, 2)).toBe('reintentar')
    expect(decidirPreparar({ ok: false, estado: 'negro' }, 3)).toBe('no')
    // Un lado nativo sin estado: ok decide, como en la primera vuelta.
    expect(decidirPreparar({ ok: true }, 0)).toBe('si')
    expect(decidirPreparar({ ok: false }, 0)).toBe('no')
  })
})
