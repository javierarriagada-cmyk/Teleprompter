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
//
// CORRECCION DEL 24-09-2026, LEYENDO EL REGISTRO DEL TELEFONO -adb shell
// dumpsys vibrator_manager-: la respuesta tactil de Javier estaba apagada
// -TOUCH = OFF, el resto de las intensidades en MEDIUM- y Android ignoraba
// "por ajustes" las vibraciones de toque de todas las apps: 82 en una hora,
// del sistema, Facebook, WhatsApp y Chrome. Y la cruda tampoco pasa: una
// vibracion de menos de un segundo pedida sin tipo, Android la cuenta como
// tactil. Asi que las tres del 21 las callo el mismo interruptor. Con la
// respuesta tactil encendida, vibran.
//
// POR ESO NO HAY INTERRUPTOR PROPIO DE VIBRACION -24-09-2026-. Estaba en el
// cajon de ajustes de la portada -clave teleprompter_vibracion-. Era un
// segundo interruptor encima del del telefono: el que tiene la respuesta
// tactil encendida la quiere, y el que la apago ya no siente nada aunque la
// app insista. Javier: "que esten activas para quien este activo, por
// defecto". La clave vieja, si quedo guardada, ya no se lee.

// LOS TICS DEL PLUGIN NECESITAN selectionStart ANTES -24-09-2026-.
// @capacitor/haptics, en Android, solo vibra en selectionChanged si antes se
// llamo a selectionStart: tiene una bandera selectionStarted que arranca en
// false -Haptics.java-. Nunca la llamabamos, y los dos avisos hechos con tics
// -elegir una opcion y el de mantener apretado, el del menu del sol- no
// vibraron nunca, en ningun telefono. La seleccion se abre una sola vez y no
// se cierra: aca no hay un gesto de arrastre con principio y fin, cada tic es
// un toque suelto. Los llamados al plugin se atienden en orden, pero igual se
// espera a que la apertura termine antes del primer tic.
let seleccionAbierta: Promise<void> | null = null

function tic(): void {
  try {
    if (!seleccionAbierta) seleccionAbierta = Haptics.selectionStart().catch(() => {})
    seleccionAbierta.then(() => Haptics.selectionChanged()).catch(() => {})
  } catch (e) {
  }
}

export function hapticaSeleccion(): void {
  if (!Capacitor.isNativePlatform()) return
  tic()
}

export function hapticaToqueSuave(): void {
  if (!Capacitor.isNativePlatform()) return
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
  if (!Capacitor.isNativePlatform()) return
  tic()
}

export function hapticaToqueMedio(): void {
  if (!Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueFuerte(): void {
  if (!Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
  } catch (e) {
  }
}
