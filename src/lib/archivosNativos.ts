import { CamaraNativa } from './camara'

export type AnalisisVideo = {
  duracionMs: number
  bytes: number
  tienePistaAudio: boolean | null
  nivelRmsDb: number | null
}

function boolONulo(v: unknown): boolean | null {
  if (v === true) return true
  if (v === false) return false
  return null
}

export async function directorioGrabaciones(): Promise<string> {
  const r = await CamaraNativa.directorioGrabaciones()
  return r.ruta
}

export async function escribirTexto(ruta: string, contenido: string): Promise<void> {
  await CamaraNativa.escribirTexto({ ruta, contenido })
}

export async function leerTexto(ruta: string): Promise<string> {
  const r = await CamaraNativa.leerTexto({ ruta })
  return r.contenido
}

export async function listarDirectorio(directorio: string): Promise<string[]> {
  const r = await CamaraNativa.listar({ directorio })
  return r.nombres || []
}

export async function moverArchivo(desde: string, hasta: string): Promise<string> {
  const r = await CamaraNativa.mover({ desde, hasta })
  return r.ruta
}

export async function borrarArchivo(ruta: string): Promise<void> {
  if (!ruta) return
  try {
    await CamaraNativa.borrarArchivo({ ruta })
  } catch (e) {
    console.warn('[archivos] no se pudo borrar', ruta, e)
  }
}

export async function bytesDe(ruta: string): Promise<number> {
  const r = await CamaraNativa.bytesDe({ ruta })
  return Number(r.bytes) || 0
}

export async function analizarVideo(ruta: string): Promise<AnalisisVideo> {
  const r = await CamaraNativa.analizarVideo({ ruta })
  return {
    duracionMs: Number(r.duracionMs) || 0,
    bytes: Number(r.bytes) || 0,
    tienePistaAudio: boolONulo(r.tienePistaAudio),
    nivelRmsDb: typeof r.nivelRmsDb === 'number' ? r.nivelRmsDb : null
  }
}

export async function extraerMiniatura(ruta: string, destino: string, atMs = 1000): Promise<string> {
  const r = await CamaraNativa.extraerMiniatura({ ruta, destino, atMs })
  return r.ruta
}

export async function buscarMp4Recientes(): Promise<string[]> {
  try {
    const r = await CamaraNativa.buscarMp4Recientes()
    return r.rutas || []
  } catch {
    return []
  }
}

export async function obtenerEspacioLibre(): Promise<number> {
  try {
    const r = await CamaraNativa.espacioLibre()
    return Number(r.bytesLibres) || 0
  } catch (e) {
    console.warn('[archivos] espacioLibre no disponible:', e)
    return 10 * 1024 * 1024 * 1024
  }
}

export async function guardarEnGaleria(ruta: string): Promise<{ ok: boolean; uri?: string }> {
  return await CamaraNativa.guardarEnGaleria({ ruta })
}

export async function existeEnGaleria(uri: string): Promise<boolean> {
  const r = await CamaraNativa.existeEnGaleria({ uri })
  return r.existe
}

// Comparte la copia de la galeria por el menu de Android. Rechaza con "no existe"
// si esa copia se borro desde la galeria.
export async function compartirDeGaleria(uri: string): Promise<void> {
  await CamaraNativa.compartir({ uri })
}

// Guarda en la galeria una copia con los subtitulos quemados -Media3, en el
// telefono-. alAvanzar recibe de 0 a 100 mientras se codifica.
export async function guardarEnGaleriaConSubtitulos(
  ruta: string,
  subtitulos: unknown,
  estilo: string,
  alAvanzar?: (porcentaje: number) => void
): Promise<{ ok: boolean; uri?: string }> {
  const escucha = alAvanzar ? await CamaraNativa.addListener('progresoGuardado', (d) => alAvanzar(d.porcentaje)) : null
  try {
    return await CamaraNativa.guardarConSubtitulos({ ruta, subtitulos: JSON.stringify(subtitulos), estilo })
  } finally {
    await escucha?.remove()
  }
}

// LAS MEDICIONES DE EXPORTACIÓN -tarea 87, paso 0, 03-10-2026-. Solo para el panel de mediciones
// de la APK de prueba -components/PanelMediciones.tsx-. Ver lib/medicionesExport.ts.
export type FormaDeToma = {
  existe: boolean
  bytes: number
  duracionMs: number
  anchoPx: number
  altoPx: number
  rotacion: number
  fps: number
  bitrateBps: number
  mimeVideo: string
  mimeAudio: string
  audioHz: number
  audioCanales: number
}

export async function medirToma(ruta: string): Promise<FormaDeToma> {
  const r = await CamaraNativa.medirToma({ ruta })
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
  return {
    existe: r.existe === true,
    bytes: n(r.bytes),
    duracionMs: n(r.duracionMs),
    anchoPx: n(r.anchoPx),
    altoPx: n(r.altoPx),
    rotacion: n(r.rotacion),
    fps: n(r.fps),
    bitrateBps: n(r.bitrateBps),
    mimeVideo: typeof r.mimeVideo === 'string' ? r.mimeVideo : '',
    mimeAudio: typeof r.mimeAudio === 'string' ? r.mimeAudio : '',
    audioHz: n(r.audioHz),
    audioCanales: n(r.audioCanales)
  }
}

// Una línea al logcat. Si el nativo no la tiene -un APK viejo, o el navegador-, no pasa nada: el
// panel igual la guarda en su registro.
export async function anotarMedicion(linea: string): Promise<boolean> {
  try {
    const r = await CamaraNativa.anotarMedicion({ linea })
    return r.escrita === true
  } catch {
    return false
  }
}

export async function equipoMedicion(): Promise<{ modelo: string; android: string; app: string; depurable: boolean } | null> {
  try {
    return await CamaraNativa.equipoMedicion()
  } catch {
    return null
  }
}

export async function borrarCopiasDeMedicion(uris: string[]): Promise<{ borradas: string[]; fallidas: string[] }> {
  if (!uris.length) return { borradas: [], fallidas: [] }
  const r = await CamaraNativa.borrarCopiasDeMedicion({ uris })
  return { borradas: r.borradas || [], fallidas: r.fallidas || [] }
}

// Escucha las líneas que escribe el nativo -guardado_inicio, capa, guardado_fin-. Devuelve con
// qué dejar de escuchar.
export async function escucharMediciones(cb: (linea: string) => void): Promise<() => Promise<void>> {
  try {
    const h = await CamaraNativa.addListener('medicion', (d) => { if (d && typeof d.linea === 'string') cb(d.linea) })
    return () => h.remove()
  } catch {
    return async () => {}
  }
}

export function juntos(dir: string, nombre: string): string {
  if (!dir) return nombre
  if (dir.endsWith('/')) return dir + nombre
  return dir + '/' + nombre
}
