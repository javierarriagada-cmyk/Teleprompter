// EL PLUGIN DE GESTOS -tarea 88, 04-10-2026, docs/tarea88.txt, sección 6.1-. El lado nativo es
// android/app/src/main/java/com/sigoteleprompter/app/GestosPlugin.java: mira la vista previa de la cámara
// -PreviewView.getBitmap(), sin parche a capgo- y reconoce la mano con MediaPipe.
//
// Una llamada a la vez, nunca en paralelo, y sin eventos: el que pide es el lazo de App, guiado por el
// vigía -lib/vigiaGestos.ts-. Con el interruptor apagado no se llama a nada de esto: ni preparar.
import { registerPlugin } from '@capacitor/core'

// La etiqueta es la de MediaPipe -Open_Palm, Victory, None, ...- o 'sinCuadro' si la vista previa no
// entregó imagen o entregó un cuadro negro. tMs = Date.now() del cuadro.
export type RevisionCuadro = {
  etiqueta: string
  puntaje: number
  tMs: number
  msCuadro?: number
  msReconocer?: number
}

export interface GestosPlugin {
  // Crea el reconocedor -RunningMode.IMAGE, una mano- y prueba un cuadro. ok false con el motivo si el
  // equipo no puede: el interruptor se ve deshabilitado con "No disponible en este teléfono.".
  // -tarea 88, segunda vuelta- Además estado -ver RespuestaPreparar-. Antes:
  // preparar(): Promise<{ ok: boolean; motivo?: string }>
  preparar(): Promise<RespuestaPreparar>
  revisarCuadro(): Promise<RevisionCuadro>
  // Cierra el reconocedor.
  soltar(): Promise<void>
}

export const Gestos = registerPlugin<GestosPlugin>('Gestos')

// «NO DISPONIBLE» FALSO -tarea 88, segunda vuelta, 04-10-2026-. En la primera vuelta un cuadro nulo al
// primer preparar -la vista previa todavía no estaba- dejaba el interruptor apagado el resto de la sesión.
// Ahora GestosPlugin.preparar dice en qué quedó, y el reconocedor creado se queda: volver a llamar a
// preparar no crea un segundo.
//   'listo'          reconocedor creado y un cuadro con imagen.
//   'sinVistaPrevia' todavía no hay vista previa, o no entregó cuadro: se vuelve a intentar, sin límite,
//                    mientras la cámara siga encendida -App, cada MS_ENTRE_INTENTOS_PREPARAR-.
//   'negro'          hay vista previa pero el cuadro es negro: se vuelve a intentar; «No disponible» recién
//                    cuando sigue negro NEGROS_PARA_NO_DISPONIBLE veces seguidas.
//   'reconocedor'    MediaPipe no arranca: «No disponible» al tiro.
export type EstadoPreparar = 'listo' | 'sinVistaPrevia' | 'negro' | 'reconocedor'
export type RespuestaPreparar = { ok: boolean; motivo?: string; estado?: EstadoPreparar }
export const MS_ENTRE_INTENTOS_PREPARAR = 1000
export const NEGROS_PARA_NO_DISPONIBLE = 3

// Qué hace App con una respuesta. negrosSeguidos: cuántos 'negro' seguidos van, contando éste. Sin
// estado -un lado nativo de la primera vuelta-: ok decide, como antes.
export function decidirPreparar(r: RespuestaPreparar | null | undefined, negrosSeguidos: number): 'si' | 'no' | 'reintentar' {
  if (!r) return 'no'
  if (r.estado === undefined) return r.ok ? 'si' : 'no'
  if (r.estado === 'listo') return 'si'
  if (r.estado === 'reconocedor') return 'no'
  if (r.estado === 'negro') return negrosSeguidos >= NEGROS_PARA_NO_DISPONIBLE ? 'no' : 'reintentar'
  return 'reintentar'
}
