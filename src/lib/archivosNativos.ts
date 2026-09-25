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

export function juntos(dir: string, nombre: string): string {
  if (!dir) return nombre
  if (dir.endsWith('/')) return dir + nombre
  return dir + '/' + nombre
}
