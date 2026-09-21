// Sidecar de una toma. Vive al lado del .mp4.part / .mp4.
//
// stopRecordVideo no alcanza: si el sistema mata la aplicacion a mitad
// de la toma esa llamada no ocurre nunca. El patron de las camaras serias
// es este: se escribe {id}.mp4.part y al lado un {id}.json que se va
// actualizando. Al terminar limpio se renombra a .mp4 y queda marcado
// listo. Al arrancar, si hay un .part o un sidecar sin "lista", se
// promueve o se marca INCOMPLETA. Nunca se borra en silencio.

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
}

export function sidecarInicial(parcial: {
  id: string
  guionId?: string
  tituloGuion: string
  creado?: number
  rutaPart?: string
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
    rutaPart: parcial.rutaPart
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
      rutaPlugin: typeof o.rutaPlugin === 'string' ? o.rutaPlugin : undefined
    }
  } catch {
    return null
  }
}
