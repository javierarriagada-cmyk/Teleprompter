import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export function vibracionHabilitada(): boolean {
  try {
    const raw = localStorage.getItem('teleprompter_vibracion')
    if (raw !== null) {
      return JSON.parse(raw) === true
    }
  } catch (e) {
  }
  return true
}

export function guardarVibracionHabilitada(habilitada: boolean): void {
  try {
    localStorage.setItem('teleprompter_vibracion', JSON.stringify(habilitada))
  } catch (e) {
  }
}

export function hapticaSeleccion(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.selectionChanged().catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueSuave(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  } catch (e) {
  }
}


// EL AVISO DEL GESTO DE MANTENER, Y SU DURACION VIVE ACA Y EN NINGUN OTRO LADO.
//
// Es mas corto que hapticaToqueSuave -el impacto Light, unos 20 ms- porque no
// confirma nada: solo dice "te senti" a los 300 ms, mientras el dedo sigue
// apoyado. Un golpe largo ahi se lee como que ya paso algo, y todavia no paso.
//
// El numero se exporta en vez de quedar suelto adentro del vibrate. Venia
// escrito en dos lugares -aca y como MS_VIBRACION_AVISO en mantenerApretado-,
// que es justo lo que esta tarea vino a impedir: dos numeros que tienen que
// moverse juntos y no se mueven. La DURACION de una vibracion es de la
// haptica; los TIEMPOS del gesto -300 y 500- son de mantenerApretado.
export const MS_VIBRACION_AVISO = 15

export function hapticaAvisoMantener(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.vibrate({ duration: MS_VIBRACION_AVISO }).catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueMedio(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueFuerte(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
  } catch (e) {
  }
}
