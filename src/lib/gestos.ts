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
  preparar(): Promise<{ ok: boolean; motivo?: string }>
  revisarCuadro(): Promise<RevisionCuadro>
  // Cierra el reconocedor.
  soltar(): Promise<void>
}

export const Gestos = registerPlugin<GestosPlugin>('Gestos')
