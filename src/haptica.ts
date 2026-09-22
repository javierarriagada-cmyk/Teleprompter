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


// EL AVISO DEL GESTO DE MANTENER, Y POR QUE NO ES UNA DURACION EN MILISEGUNDOS.
//
// Dice "te senti" a los 300 ms, con el dedo todavia apoyado y sin que haya
// pasado nada aun. Tiene que ser un toquecito seco y corto.
//
// PRIMERO SE HIZO CON Haptics.vibrate({ duration: 15 }) Y NO SE SENTIA NADA.
// Javier en el telefono, el 21 de septiembre de 2026: "en el menu del sol no
// siento la vibracion". El motivo es de hardware: vibrate() enciende el motor
// durante ese tiempo en crudo, y 15 ms no alcanzan para que la masa arranque y
// se note. Subir el numero hasta sentirlo daria un golpe torpe, que es justo
// lo contrario de lo que este aviso quiere decir.
//
// selectionChanged() es el primitivo correcto: el sistema lo resuelve con su
// propio efecto de tic -EFFECT_TICK en Android-, disenado para ser breve y
// perceptible. No se pide una duracion porque la duracion no es nuestra.
//
// Por eso aca no hay ninguna constante de milisegundos. Los tiempos del GESTO
// -300 y 500- viven en mantenerApretado.ts y son otra cosa.
export function hapticaAvisoMantener(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.selectionChanged().catch(() => {})
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
