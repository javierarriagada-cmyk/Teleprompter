// -motor-largo- Solo lógica: el vigía de la detención, la línea del banco largo, el pedido y el armado
// del pedido en scripts/banco-largo.mjs. Lo del teléfono -el lazo, la cámara, adb- no se prueba aquí.
import { describe, expect, test } from 'vitest'
import { crearVigiaDetencion, MS_QUIETO } from '../lib/vigiaDetencion'
import { leerPedidoBancoLargo, lineaDelMinuto } from '../lib/bancoLargo'
import type { EntradaDiagnostico } from '../lib/diagnostico'
// @ts-ignore -módulo .mjs de scripts/, sin tipos-
import { armarPedido, audioYTextoDeRegistro, resumirTabla } from '../../scripts/banco-largo.mjs'

const cuadro = (ms: number, calce: number): EntradaDiagnostico => ({ ms, tipo: 'cuadro', posicion: calce, calce, scroll: 0, freno: '-', trabado: 0 })
const llegada = (ms: number, atraso = 200): EntradaDiagnostico => ({ ms, tipo: 'llegada', final: false, nativo: ms, audio: ms - atraso, rms: 0.05 })

function correr(entradas: EntradaDiagnostico[]) {
  const mirar = crearVigiaDetencion()
  return entradas.map((e) => mirar(e)).filter(Boolean)
}

describe('vigía de la detención', () => {
  test('avanzando no anota nada', () => {
    const e: EntradaDiagnostico[] = []
    for (let ms = 0; ms < 30000; ms += 100) e.push(llegada(ms), cuadro(ms, Math.floor(ms / 500)))
    expect(correr(e)).toEqual([])
  })

  test('quieto con resultados atrasados: una sola línea, con el atraso', () => {
    const e: EntradaDiagnostico[] = [cuadro(0, 10)]
    for (let ms = 100; ms < 30000; ms += 100) e.push(llegada(ms, 3500), { ms, tipo: 'oyo', texto: 'hola', final: false }, cuadro(ms, 10))
    const r = correr(e)
    expect(r).toHaveLength(1)
    expect(r[0]!.motivo).toBe('resultado con 3.5 s de atraso')
    expect(r[0]!.quietoMs).toBeGreaterThan(MS_QUIETO)
  })

  test('quieto sin texto: sin resultados; con texto que no calza: sin calce', () => {
    const sinTexto: EntradaDiagnostico[] = [cuadro(0, 5)]
    for (let ms = 100; ms < 12000; ms += 100) sinTexto.push(llegada(ms), cuadro(ms, 5))
    expect(correr(sinTexto)[0]!.motivo).toBe('sin resultados')
    const sinCalce: EntradaDiagnostico[] = [cuadro(0, 5)]
    for (let ms = 100; ms < 12000; ms += 100) sinCalce.push(llegada(ms), { ms, tipo: 'oyo', texto: 'otra cosa', final: false }, { ms, tipo: 'calce', token: null, texto: 'otra cosa' }, cuadro(ms, 5))
    expect(correr(sinCalce)[0]!.motivo).toBe('sin calce')
  })

  test('sin llegadas -el lazo no entrega- no anota; y vuelve a anotar tras avanzar', () => {
    const e: EntradaDiagnostico[] = [cuadro(0, 1)]
    for (let ms = 100; ms < 12000; ms += 100) e.push(cuadro(ms, 1))
    expect(correr(e)).toEqual([])
    const dos: EntradaDiagnostico[] = [cuadro(0, 1)]
    for (let ms = 100; ms < 10000; ms += 100) dos.push(llegada(ms), cuadro(ms, 1))
    dos.push(cuadro(10000, 2))
    for (let ms = 10100; ms < 20000; ms += 100) dos.push(llegada(ms), cuadro(ms, 2))
    expect(correr(dos)).toHaveLength(2)
  })
})

describe('banco largo', () => {
  test('la línea del minuto: medida, calce, estado y temperatura; el relevo aparte', () => {
    const m = { minuto: 3, msVoskPorSegundo: 412.345, atrasoMs: 180.4, relevos: 0, temperatura: 'sin temperatura' }
    expect(lineaDelMinuto(m, { calce: 120, freno: 'silencio', trabado: 4, posicion: 120.5 })).toBe('minuto=3 vosk_ms_por_s=412.3 atraso_ms=180 calce=120 estado=silencio pos=120.5 temp=sin_temperatura')
    expect(lineaDelMinuto({ ...m, relevos: 2, temperatura: '41.0C(cpu-0)' }, null)).toBe('minuto=3 vosk_ms_por_s=412.3 atraso_ms=180 calce=NA estado=NA pos=NA temp=41.0C(cpu-0) relevo=2')
  })

  test('el pedido: sin guion no hay pedido; nombre raro se cambia', () => {
    expect(leerPedidoBancoLargo('{"minutos":35}')).toBeNull()
    expect(leerPedidoBancoLargo('no es json')).toBeNull()
    const p = leerPedidoBancoLargo('{"guion":"hola","nombre":"../x"}')!
    expect(p.minutos).toBe(35)
    expect(p.nombre).toMatch(/^tabla-\d+$/)
  })

  test('el script arma el guion con lo oído en cada audio, repetido hasta los minutos', () => {
    const reg = (pcm: string, frases: string[]) => ['ms\ttipo\tdetalle', `5\toido\tinicio=0 trozo=320 ruta=/data/user/0/x/files/oido/${pcm}`, ...frases.map((f) => `9\toyo\tFINAL: ${f}`), '10\toyo\tparcial: no']
      .join('\n')
    expect(audioYTextoDeRegistro(reg('1.pcm', ['hola', 'chao']))).toEqual({ pcm: '1.pcm', texto: 'hola chao' })
    const min = 16000 * 2 * 60
    const r = armarPedido({ audios: [{ nombre: '2.pcm', bytes: 10 * min }, { nombre: '1.pcm', bytes: 5 * min }, { nombre: '3.pcm', bytes: min }], registros: [reg('1.pcm', ['uno']), reg('2.pcm', ['dos'])], minutos: 35, nombre: 't' })
    expect(r.pedido.archivos).toEqual(['1.pcm', '2.pcm'])
    expect(r.sinTexto).toEqual(['3.pcm'])
    expect(r.vueltas).toBe(3)
    expect(r.pedido.guion).toBe('uno\n\ndos\n\nuno\n\ndos\n\nuno\n\ndos')
    expect(armarPedido({ audios: [{ nombre: '3.pcm', bytes: min }], registros: [], minutos: 35, nombre: 't' }).pedido).toBeNull()
    expect(resumirTabla('# x\nminuto=1 vosk_ms_por_s=300.0 atraso_ms=20 calce=5 estado=- temp=sin_temperatura')).toContain('300.0')
  })
})
