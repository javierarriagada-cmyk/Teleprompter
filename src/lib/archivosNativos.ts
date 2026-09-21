import { CamaraNativa } from './camara'

export type AnalisisVideo = {
  duracionMs: number
  bytes: number
  tienePistaAudio: boolean
  nivelRmsDb: number | null
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
    tienePistaAudio: Boolean(r.tienePistaAudio),
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

export function juntos(dir: string, nombre: string): string {
  if (!dir) return nombre
  if (dir.endsWith('/')) return dir + nombre
  return dir + '/' + nombre
}
