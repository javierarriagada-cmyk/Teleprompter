// LO NATIVO, FINGIDO PARA EL BOCETO -tarea 87-. Las mismas funciones que src/lib/archivosNativos.ts
// exporta, sin Capacitor. leerTexto devuelve el registro de palabras de la toma del corpus
// toma-008a7133 -el mismo que usan las pruebas de subtítulos- si la página pide subtítulos
// -?subs=si-; si no, falla como una toma sin registro. Guardar no hace nada: el boceto muestra
// los estados, no los recorre.
import registro from '../../../../src/pruebas/corpus/toma-008a7133-palabras.motor.txt?raw'

const q = new URLSearchParams(location.search)
export type AnalisisVideo = { duracionMs: number; bytes: number; tienePistaAudio: boolean; nivelRmsDb: number | null }
export async function directorioGrabaciones(): Promise<string> { return '/grabaciones' }
export async function escribirTexto(_r: string, _c: string): Promise<void> {}
export async function leerTexto(_ruta: string): Promise<string> {
  if (q.get('subs') === 'si') return registro
  throw new Error('sin registro')
}
export async function listarDirectorio(_d: string): Promise<string[]> { return [] }
export async function moverArchivo(_d: string, h: string): Promise<string> { return h }
export async function borrarArchivo(_r: string): Promise<void> {}
export async function bytesDe(_r: string): Promise<number> { return 0 }
export async function analizarVideo(_r: string): Promise<AnalisisVideo> { return { duracionMs: 0, bytes: 0, tienePistaAudio: true, nivelRmsDb: null } }
export async function extraerMiniatura(_r: string, d: string): Promise<string> { return d }
export async function buscarMp4Recientes(): Promise<string[]> { return [] }
export async function obtenerEspacioLibre(): Promise<number> { return 1e10 }
export async function guardarEnGaleria(_r: string): Promise<{ ok: boolean; uri?: string }> { return new Promise(() => {}) }
export async function existeEnGaleria(_u: string): Promise<boolean> { return true }
export async function compartirDeGaleria(_u: string): Promise<void> {}
export async function guardarEnGaleriaConSubtitulos(..._a: any[]): Promise<{ ok: boolean; uri?: string }> { return new Promise(() => {}) }
export function juntos(dir: string, nombre: string): string { return `${dir}/${nombre}` }
