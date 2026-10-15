// CUÁNDO Y POR QUÉ SE DETUVO EL MOTOR -motor-largo, 15-10-2026-. Solo mira el registro de diagnóstico:
// no toca el seguidor, el avance ni la conducción, y el motor hace exactamente lo mismo con o sin esto
// -npm run banco igual a main-.
//
// Motivo: en una toma de 25:34 en el moto g86 el texto dejó de avanzar a los ~25 min con el lazo de
// Vosk vivo hasta Parar. El .motor.txt tiene todo, pero no dice CUÁNDO se quedó quieto ni POR QUÉ.
//
// LA REGLA. Si pasan más de MS_QUIETO sin que el último calce aplicado -'cuadro', calce- suba, y en
// esos segundos siguen llegando resultados del lazo -'llegada', cada ~100 ms aunque haya silencio-,
// se anota UNA línea 'detenido' con el motivo; la siguiente, recién después de que vuelva a avanzar.
// Los motivos, en este orden:
//   resultado con X s de atraso   alguna llegada de la ventana salió del lazo X s después de que
//                                  terminó su audio -nativo menos audio- con X >= ATRASO_GRANDE_MS.
//   sin resultados                el lazo entrega, pero ningún 'oyo' con texto: Vosk no reconoce
//                                  nada -o la persona está callada: va el rms máximo para separarlo-.
//   sin calce                     hubo texto, pero ningún calce lo ubicó o cayó fuera de la ventana.
//
// N = 8 s -MS_QUIETO-. Una pausa entre párrafos de Javier dura 2 a 5 s -las pausas largas de las
// tomas, docs/registros-; con 8 s una pausa normal no se anota, y lo que se busca -el texto quieto
// ~40 s después del último relevo- se anota con su motivo a los 8 s. 2 s de atraso: el oído entrega
// en 0,1 a 0,8 s -VoskNativoPlugin, el relevo-; más de 2 s ya es más de una frase tarde.
import type { EntradaDiagnostico } from './diagnostico'

export const MS_QUIETO = 8000
export const ATRASO_GRANDE_MS = 2000

export type EntradaDetenido = Extract<EntradaDiagnostico, { tipo: 'detenido' }>

export function crearVigiaDetencion(msQuieto = MS_QUIETO, atrasoGrandeMs = ATRASO_GRANDE_MS) {
  let maxCalce = -Infinity
  let msUltimoAvance: number | null = null
  let reportado = false
  // Lo de los últimos msQuieto: cuándo llegó cada resultado y con cuánto atraso, los 'oyo' con
  // texto, y los calces -aplicados, NO CALZO y fuera de la ventana-.
  let llegadas: Array<{ ms: number; atraso: number | null; rms: number }> = []
  let oidos: number[] = []
  let calces: Array<{ ms: number; tipo: 'ok' | 'no' | 'fuera' }> = []

  function recortar(ms: number) {
    const desde = ms - msQuieto
    llegadas = llegadas.filter((l) => l.ms >= desde)
    oidos = oidos.filter((m) => m >= desde)
    calces = calces.filter((c) => c.ms >= desde)
  }

  // Mira una entrada recién anotada; si corresponde, devuelve la línea 'detenido' para anotar.
  return function mirar(e: EntradaDiagnostico): EntradaDetenido | null {
    if (e.tipo === 'llegada') {
      llegadas.push({ ms: e.ms, atraso: typeof e.audio === 'number' ? e.nativo - e.audio : null, rms: e.rms ?? 0 })
      return null
    }
    if (e.tipo === 'oyo') {
      if (e.texto.trim()) oidos.push(e.ms)
      return null
    }
    if (e.tipo === 'calce') {
      calces.push({ ms: e.ms, tipo: e.token === null ? 'no' : 'ok' })
      return null
    }
    if (e.tipo === 'ventana') {
      // El calce de recién no se aplicó.
      const ultimo = calces[calces.length - 1]
      if (ultimo && ultimo.tipo === 'ok') ultimo.tipo = 'fuera'
      return null
    }
    if (e.tipo !== 'cuadro') return null
    recortar(e.ms)
    if (msUltimoAvance === null || e.calce > maxCalce) {
      maxCalce = Math.max(maxCalce, e.calce)
      msUltimoAvance = e.ms
      reportado = false
      return null
    }
    const quieto = e.ms - msUltimoAvance
    if (reportado || quieto <= msQuieto || llegadas.length === 0) return null
    reportado = true
    const atrasos = llegadas.map((l) => l.atraso).filter((a): a is number => a !== null)
    const atrasoMax = atrasos.length ? Math.max(...atrasos) : 0
    const rmsMax = Math.max(...llegadas.map((l) => l.rms))
    const cuenta = (t: 'ok' | 'no' | 'fuera') => calces.filter((c) => c.tipo === t).length
    let motivo: string
    if (atrasoMax >= atrasoGrandeMs) motivo = `resultado con ${(atrasoMax / 1000).toFixed(1)} s de atraso`
    else if (oidos.length === 0) motivo = 'sin resultados'
    else motivo = 'sin calce'
    return {
      ms: e.ms,
      tipo: 'detenido',
      motivo,
      quietoMs: quieto,
      calce: e.calce,
      detalle: `llegadas=${llegadas.length} oyo=${oidos.length} calces=${cuenta('ok')} no_calzo=${cuenta('no')} fuera=${cuenta('fuera')} atraso_max_ms=${Math.round(atrasoMax)} rms_max=${rmsMax.toFixed(4)} freno=${e.freno}`
    }
  }
}
