// LO NATIVO, FINGIDO PARA LAS CAPTURAS DE LA APP IMPLEMENTADA -tarea 87, 04-10-2026-. Las mismas
// funciones que src/lib/archivosNativos.ts exporta, sin Capacitor -como archivosNativosFingido.ts
// del boceto, más las que sumó la 87-. Lo controla la página:
//   ?subs=si           leerTexto devuelve el registro de palabras de la toma del corpus 008a7133;
//   ?guardar=colgado   el guardado no termina y avisa un avance de 37 % -estado 7-;
//   ?compartir=falla   el guardado sale bien y compartir falla -estado 8-.
// También lo usa, servida por el mismo vite, la página de la tarea 90 -docs/pantallas/tarea90/
// herramientas/app-real.html- para las capturas del visor de lado con el subtítulo a 1/6.
// NO es código de la app: solo lo usa vite.app.config.mjs.
import registro from '../../../../../src/pruebas/corpus/toma-008a7133-palabras.motor.txt?raw'

const q = new URLSearchParams(location.search)
export type AnalisisVideo = { duracionMs: number; bytes: number; tienePistaAudio: boolean | null; nivelRmsDb: number | null; anchoPx?: number; altoPx?: number; rotacion?: number }
export type FormaDeToma = Record<string, unknown>
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
function guardado(alAvanzar?: (n: number) => void): Promise<{ ok: boolean; uri?: string }> {
  if (q.get('guardar') === 'colgado') {
    setTimeout(() => alAvanzar?.(37), 50)
    return new Promise(() => {})
  }
  return Promise.resolve({ ok: true, uri: 'content://media/app' })
}
export async function guardarEnGaleria(_r: string): Promise<{ ok: boolean; uri?: string }> { return guardado() }
export async function existeEnGaleria(_u: string): Promise<boolean> { return true }
export async function compartirDeGaleria(_u: string): Promise<void> {
  if (q.get('compartir') === 'falla') throw new Error('el menú no se abrió')
}
export async function guardarEnGaleriaConSubtitulos(_r: string, _s: unknown, _e: string, alAvanzar?: (n: number) => void): Promise<{ ok: boolean; uri?: string }> {
  return guardado(alAvanzar)
}
export async function exportarAGaleria(): Promise<{ ok: boolean; uri?: string }> { return guardado() }
// -04-10-2026, Javier simplifica la 87- Sin tieneExportarToma ni olvidarCapacidades: se sacaron de
// src/lib/archivosNativos.ts con "Normal / Para redes".
export async function medirToma(): Promise<FormaDeToma> { return {} }
export async function anotarMedicion(_l: string): Promise<boolean> { return false }
export async function equipoMedicion(): Promise<null> { return null }
export async function borrarCopiasDeMedicion(): Promise<{ borradas: string[]; fallidas: string[] }> { return { borradas: [], fallidas: [] } }
export async function escucharMediciones(): Promise<() => Promise<void>> { return async () => {} }
export function juntos(dir: string, nombre: string): string { return `${dir}/${nombre}` }
