// MEDICIÓN DEL SERVIDOR LOCAL -medir-servidor-local, 16-10-2026-. Solo en esta rama: el visor carga
// las tomas por un servidor HTTP en 127.0.0.1 -ServidorLocal.java- en vez de convertFileSrc, para ver
// si el tope de 2^31 está en la vía del interceptor -ClienteWebDeTomas- o en el reproductor. Lo que el
// visor ve del <video> va a logcat con la etiqueta MEDIR-SERVIDOR -anotar-.
import { Capacitor, registerPlugin } from '@capacitor/core'

interface MedirServidorContract {
  direccion(options: { ruta: string }): Promise<{ url: string }>
  anotar(options: { texto: string }): Promise<void>
}

const MedirServidor = registerPlugin<MedirServidorContract>('MedirServidor')

// En esta rama, true: el visor no salta al reproductor del sistema y carga TODO por el servidor.
export const MEDIR_SERVIDOR_LOCAL = true

// La dirección http de la toma, o null fuera del teléfono o si el servidor no contesta.
export async function direccionLocal(ruta: string): Promise<string | null> {
  if (!MEDIR_SERVIDOR_LOCAL || !Capacitor.isNativePlatform() || !ruta) return null
  try {
    return (await MedirServidor.direccion({ ruta })).url
  } catch (e: any) {
    anotar('sin dirección: ' + String(e?.message || e))
    return null
  }
}

export function anotar(texto: string): void {
  if (!Capacitor.isNativePlatform()) return
  void MedirServidor.anotar({ texto }).catch(() => {})
}

// El texto de un error del <video>: código y mensaje de MediaError.
export function textoDeErrorDeVideo(error: { code?: number; message?: string } | null | undefined, enSegundo: number): string {
  if (!error) return `error del <video> sin MediaError en t=${enSegundo.toFixed(1)}`
  return `error del <video> code=${error.code ?? '?'} message=${error.message || ''} en t=${enSegundo.toFixed(1)}`
}
