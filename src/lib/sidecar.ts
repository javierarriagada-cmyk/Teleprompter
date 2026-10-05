// Sidecar de una toma. Vive al lado del .mp4.part / .mp4.
//
// stopRecordVideo no alcanza: si el sistema mata la aplicacion a mitad
// de la toma esa llamada no ocurre nunca. El patron de las camaras serias
// es este: se escribe {id}.mp4.part y al lado un {id}.json que se va
// actualizando. Al terminar limpio se renombra a .mp4 y queda marcado
// listo. Al arrancar, si hay un .part o un sidecar sin "lista", se
// promueve o se marca INCOMPLETA. Nunca se borra en silencio.

import type { PausaToma } from './tramos'

export type EstadoSidecar = 'grabando' | 'lista' | 'incompleta'

export type SidecarToma = {
  id: string
  guionId?: string
  tituloGuion: string
  creado: number
  milisegundos: number
  bytes: number
  tienePistaAudio?: boolean | null
  frasesOidas: number
  estado: EstadoSidecar
  rutaPart?: string
  rutaMp4?: string
  rutaPlugin?: string
  calidad?: string
  // -tarea 87, parte C, 04-10-2026- Cómo se ve el archivo -lib/orientacion.ts-. Sin el dato si el
  // APK no manda ancho y alto.
  orientacion?: 'vertical' | 'horizontal' | 'cuadrada'
  // -tarea 88, 04-10-2026- Las pausas de la toma, en el reloj del video -lib/tramos.ts-. Una abierta
  // tiene hastaMs null. Sin pausas, el campo no va.
  pausas?: PausaToma[]
}

// -tarea 88- Lo que no sea una lista de objetos con números se descarta ENTERO, con el motivo en la
// consola: mejor una toma sin cortes que una cortada mal.
export function pausasValidas(v: unknown): PausaToma[] | undefined {
  if (v === undefined || v === null) return undefined
  const malo = (motivo: string) => {
    console.warn('[sidecar] pausas descartadas:', motivo)
    return undefined
  }
  if (!Array.isArray(v)) return malo('no es una lista')
  const fuera: PausaToma[] = []
  for (const p of v) {
    if (!p || typeof p !== 'object') return malo('una pausa no es un objeto')
    const o = p as Record<string, unknown>
    if (typeof o.desdeMs !== 'number' || !Number.isFinite(o.desdeMs)) return malo('desdeMs no es un número')
    if (o.hastaMs !== null && (typeof o.hastaMs !== 'number' || !Number.isFinite(o.hastaMs))) return malo('hastaMs no es un número')
    if (o.origen !== 'boton' && o.origen !== 'palma') return malo('origen desconocido')
    fuera.push({ desdeMs: o.desdeMs, hastaMs: o.hastaMs as number | null, origen: o.origen })
  }
  return fuera
}

export function sidecarInicial(parcial: {
  id: string
  guionId?: string
  tituloGuion: string
  creado?: number
  rutaPart?: string
  calidad?: string
}): SidecarToma {
  return {
    id: parcial.id,
    guionId: parcial.guionId,
    tituloGuion: parcial.tituloGuion,
    creado: parcial.creado ?? Date.now(),
    milisegundos: 0,
    bytes: 0,
    tienePistaAudio: null,
    frasesOidas: 0,
    estado: 'grabando',
    rutaPart: parcial.rutaPart,
    calidad: parcial.calidad
  }
}

export function reconocerPendiente(s: SidecarToma | null | undefined): boolean {
  if (!s || !s.id) return false
  return s.estado === 'grabando' || s.estado === 'incompleta'
}

export function marcarLista(s: SidecarToma, extra?: Partial<SidecarToma>): SidecarToma {
  return { ...s, ...extra, estado: 'lista' }
}

export function marcarIncompleta(s: SidecarToma, extra?: Partial<SidecarToma>): SidecarToma {
  return { ...s, ...extra, estado: 'incompleta' }
}

// Capgo nombra video_<epochMs>.mp4 al arrancar. El sidecar se escribe
// unos milisegundos antes. Si stopRecordVideo no vuelve, rutaPlugin
// queda vacia y rutaMp4 apunta a un .part que nunca se creo.
export const MARGEN_EMPAREJAR_MS = 20_000

export function marcaTiempoDeNombreMp4(ruta: string): number | null {
  const nombre = ruta.split(/[/\\]/).pop() || ''
  const m = nombre.match(/(\d{10,13})/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return n < 1e12 ? n * 1000 : n
}

function claveRuta(ruta: string): string {
  return ruta.replace(/^file:\/\//, '').replace(/\/+$/, '')
}

export function emparejarMp4PorTiempo(opts: {
  creado: number
  milisegundos: number
  candidatos: string[]
  ocupadas?: Iterable<string>
  margenMs?: number
}): string | null {
  const margen = opts.margenMs ?? MARGEN_EMPAREJAR_MS
  const inicio = opts.creado
  const fin = opts.creado + Math.max(opts.milisegundos, 0)
  const ocupadas = new Set(Array.from(opts.ocupadas || []).map(claveRuta))

  const dentro: { ruta: string; dist: number }[] = []
  for (const ruta of opts.candidatos) {
    if (!ruta || ocupadas.has(claveRuta(ruta))) continue
    const marca = marcaTiempoDeNombreMp4(ruta)
    if (marca == null) continue
    if (marca < inicio - margen || marca > fin + margen) continue
    dentro.push({ ruta, dist: Math.abs(marca - inicio) })
  }
  if (dentro.length === 0) return null
  dentro.sort((a, b) => a.dist - b.dist)
  return dentro[0].ruta
}

export function parsearSidecar(texto: string): SidecarToma | null {
  try {
    const o = JSON.parse(texto)
    if (!o || typeof o.id !== 'string') return null
    return {
      id: o.id,
      guionId: typeof o.guionId === 'string' ? o.guionId : undefined,
      tituloGuion: typeof o.tituloGuion === 'string' ? o.tituloGuion : '',
      creado: Number(o.creado) || 0,
      milisegundos: Number(o.milisegundos) || 0,
      bytes: Number(o.bytes) || 0,
      tienePistaAudio: typeof o.tienePistaAudio === 'boolean' ? o.tienePistaAudio : null,
      frasesOidas: Number(o.frasesOidas) || 0,
      estado: o.estado === 'lista' || o.estado === 'incompleta' ? o.estado : 'grabando',
      rutaPart: typeof o.rutaPart === 'string' ? o.rutaPart : undefined,
      rutaMp4: typeof o.rutaMp4 === 'string' ? o.rutaMp4 : undefined,
      rutaPlugin: typeof o.rutaPlugin === 'string' ? o.rutaPlugin : undefined,
      calidad: typeof o.calidad === 'string' ? o.calidad : undefined,
      orientacion: o.orientacion === 'vertical' || o.orientacion === 'horizontal' || o.orientacion === 'cuadrada' ? o.orientacion : undefined,
      // -tarea 88- Solo si viene: el sidecar sin pausas queda como hoy.
      ...(o.pausas !== undefined ? { pausas: pausasValidas(o.pausas) } : {})
    }
  } catch {
    return null
  }
}
