// LO QUE CAPGO DICE DE LA CÁMARA -tarea 87, paso 0, 03-10-2026-. Para la línea evento=camara:
// la relación de aspecto que se le pidió a la vista previa, la calidad de video que tiene, las que
// ofrece y el tamaño de la vista. Sirve para contestar "¿la vista previa es 4:3 y el video 16:9?"
// -docs/tarea87.txt, ensayo vista-4x3-. Solo lee: no cambia nada de la cámara ni de capgo.
import { CameraPreview } from '@capgo/camera-preview'
import { lineaDeEvento, conEtiqueta, agregarAlRegistro, EVENTO_DOM_MEDICION } from './medicionesExport'
import { anotarMedicion } from './archivosNativos'

export async function leerCamaraParaMedir(calidadPedida: string): Promise<Record<string, string | number | null | undefined>> {
  const cp = CameraPreview as any
  const pedir = async <T,>(f: string): Promise<T | null> => {
    try {
      return typeof cp[f] === 'function' ? await cp[f]() : null
    } catch {
      return null
    }
  }
  const aspecto = await pedir<{ aspectRatio: string }>('getAspectRatio')
  const calidad = await pedir<{ quality: string }>('getVideoQuality')
  const calidades = await pedir<{ qualities: string[] }>('getSupportedVideoQualities')
  const vista = await pedir<{ width: number; height: number }>('getPreviewSize')
  return {
    aspecto_pedido: aspecto?.aspectRatio,
    calidad_pedida: calidadPedida,
    calidad_capgo: calidad?.quality,
    calidades: Array.isArray(calidades?.qualities) ? calidades!.qualities.join(',') : null,
    vista_ancho_px: vista && Number.isFinite(vista.width) ? Math.round(vista.width) : null,
    vista_alto_px: vista && Number.isFinite(vista.height) ? Math.round(vista.height) : null
  }
}

// Lee y anota: al registro del panel y al logcat. App lo llama solo -APK de prueba- cada vez que
// la cámara se enciende, porque con la cámara encendida detrás la franja de diagnóstico se esconde
// y el panel no se puede abrir en LISTO.
export async function anotarCamara(calidadPedida: string): Promise<string> {
  const datos = await leerCamaraParaMedir(calidadPedida)
  const mensaje = lineaDeEvento('camara', datos)
  agregarAlRegistro(conEtiqueta(mensaje))
  try {
    window.dispatchEvent(new Event(EVENTO_DOM_MEDICION))
  } catch {
    // sin ventana no hay a quién avisar
  }
  await anotarMedicion(mensaje)
  return mensaje
}
