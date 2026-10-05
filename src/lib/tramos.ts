// LOS TRAMOS DE UNA TOMA CON PAUSAS -tarea 88, 04-10-2026, docs/tarea88.txt, sección 4-. Puro.
//
// Una pausa queda en el sidecar como PausaToma, en el RELOJ DEL VIDEO: epoch - inicioVideoEpochMs
// -tomaVideo.ts, el mismo cero que el registro del motor-. Al guardar se cortan; el visor las salta.
//
// Los márgenes ya vienen puestos por la máquina -pausaToma.ts: 1 s antes de la palma, 0 con el botón-:
// aquí NO se suman márgenes. Solo se acota a [0, duración], se ordena y se juntan los cortes que se
// tocan o se pisan. Una pausa de 0 ms no corta nada.
//
// "Salida" es el reloj del archivo ya cortado -lo que se guarda y lo que ve la persona-; "archivo" es el
// reloj de la toma entera, con lo pausado adentro.
import type { OrigenPausa } from './pausaToma'
import type { TramoMs } from './recetaExportacion'

export type PausaToma = { desdeMs: number; hastaMs: number | null; origen: OrigenPausa }

// Lo que se corta. Una pausa abierta -hastaMs null- corta hasta el final.
export function tramosACortar(pausas: PausaToma[], duracionMs: number): TramoMs[] {
  const dur = Math.max(0, duracionMs)
  const cortes = (pausas || [])
    .map((p) => ({
      desdeMs: Math.min(dur, Math.max(0, p.desdeMs)),
      hastaMs: Math.min(dur, Math.max(0, p.hastaMs === null ? dur : p.hastaMs))
    }))
    .filter((c) => c.hastaMs > c.desdeMs)
    .sort((a, b) => a.desdeMs - b.desdeMs)
  const juntos: TramoMs[] = []
  for (const c of cortes) {
    const ultimo = juntos[juntos.length - 1]
    if (ultimo && c.desdeMs <= ultimo.hastaMs) ultimo.hastaMs = Math.max(ultimo.hastaMs, c.hastaMs)
    else juntos.push({ ...c })
  }
  return juntos
}

// Lo que queda: el complemento de los cortes en [0, duración]. Va a la receta -tramos-.
export function tramosQueQuedan(cortes: TramoMs[], duracionMs: number): TramoMs[] {
  const quedan: TramoMs[] = []
  let desde = 0
  for (const c of cortes) {
    if (c.desdeMs > desde) quedan.push({ desdeMs: desde, hastaMs: c.desdeMs })
    desde = Math.max(desde, c.hastaMs)
  }
  if (duracionMs > desde) quedan.push({ desdeMs: desde, hastaMs: duracionMs })
  return quedan
}

// Del reloj del archivo al de la salida. null si el instante cae en un corte.
export function aSalida(tMs: number, cortes: TramoMs[]): number | null {
  let menos = 0
  for (const c of cortes) {
    if (tMs >= c.hastaMs) { menos += c.hastaMs - c.desdeMs; continue }
    if (tMs >= c.desdeMs) return null
    break
  }
  return tMs - menos
}

// La inversa, para la barra del visor: del reloj de la salida al del archivo. Una unión cae en lo que
// sigue al corte.
export function aArchivo(tSalidaMs: number, cortes: TramoMs[]): number {
  let t = tSalidaMs
  for (const c of cortes) {
    if (t >= c.desdeMs) t += c.hastaMs - c.desdeMs
    else break
  }
  return t
}

// Como aSalida, pero un instante dentro de un corte cae en la unión -para la barra del visor mientras
// salta-.
export function aSalidaCercana(tMs: number, cortes: TramoMs[]): number {
  const s = aSalida(tMs, cortes)
  if (s !== null) return s
  const c = cortes.find((x) => tMs >= x.desdeMs && tMs < x.hastaMs)!
  return aSalida(c.hastaMs, cortes) as number
}

export function duracionFinal(cortes: TramoMs[], duracionMs: number): number {
  return Math.max(0, duracionMs - cortes.reduce((s, c) => s + (c.hastaMs - c.desdeMs), 0))
}

// Los cortes de una toma, con su duración del índice -ResumenGrabacion-. Sin pausas, ninguno.
export function cortesDe(g: { pausas?: PausaToma[]; duracionMs: number } | null | undefined): TramoMs[] {
  if (!g || !g.pausas || g.pausas.length === 0) return []
  return tramosACortar(g.pausas, g.duracionMs)
}

// La duración que se le muestra a la persona: la FINAL, sin lo pausado.
export function duracionVisible(g: { pausas?: PausaToma[]; duracionMs: number }): number {
  return duracionFinal(cortesDe(g), g.duracionMs)
}

// Lo que queda después de cortar dura menos que esto: la toma se trata como una sin video
// -docs/tarea88.txt, sección 1, punto 9-.
export const MS_MINIMO_QUE_QUEDA = 1000
