import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// SI NO SE SIENTE NADA, ANTES DE BUSCAR UN DEFECTO ACA: MIRAR EL TELEFONO.
//
// El 21 de septiembre de 2026 Javier no sentia ninguna vibracion en toda la
// aplicacion. Comprobado en su telefono por el depurador: Capacitor era nativo,
// el plugin Haptics estaba registrado, nuestro interruptor de Vibracion estaba
// en si -la clave ni siquiera existia, o sea el valor por omision-, y las tres
// llamadas salieron sin error: vibrate de 400 ms, impact HEAVY y
// selectionChanged. No sintio ninguna de las tres.
//
// O sea que el codigo estaba bien y lo apagado era el aparato -la vibracion
// del sistema, el modo silencio, o la respuesta tactil en Ajustes de Android-.
// Contra eso no hay nada que hacer desde aca y no hay que intentarlo: si el
// usuario apago la vibracion de su telefono, la decision es suya.
//
// El metodo para volver a distinguirlo en un minuto: disparar las tres por
// separado, con una pausa entre medio, y preguntar cuales se sintieron. Si se
// siente la cruda y no las otras dos, lo apagado es la respuesta tactil del
// sistema, que suprime impactos y tics pero deja pasar vibrate(). Si no se
// siente ninguna, es la vibracion general del telefono.
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
