// EL PLUGIN DE GESTOS -tarea 88, 04-10-2026, docs/tarea88.txt, sección 6.1-. El lado nativo es
// android/app/src/main/java/com/sigoteleprompter/app/GestosPlugin.java: mira la vista previa de la cámara
// -PreviewView.getBitmap(), sin parche a capgo- y reconoce la mano con MediaPipe.
//
// Una llamada a la vez, nunca en paralelo, y sin eventos: el que pide es el lazo de App, guiado por el
// vigía -lib/vigiaGestos.ts-. Con el interruptor apagado no se llama a nada de esto: ni preparar.
import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core'
import { descargaForzada } from './forzado104'

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
  // -tarea 104- El modelo de gestos, en el teléfono antes de preparar. En la APK de prueba viene en
  // assets y vuelve al instante. En la de Play viaja en su propio paquete a pedido -android/gestos- y
  // se baja la primera vez que alguien enciende el interruptor, avisando con 'progresoGestos'. Sin
  // internet rechaza con code 'SIN_CONEXION'; si la persona dice que no al diálogo de Play, 'RECHAZADA'.
  // Opcionales en el tipo para que el plugin fingido de las pruebas -GestosFake- siga sirviendo tal cual.
  asegurarModelo?(): Promise<{ estado: string }>
  addListener?(eventName: 'progresoGestos', listener: (data: { progreso: number }) => void): Promise<PluginListenerHandle>
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
//   'sinModelo'      -tarea 104- el modelo de gestos no está en el teléfono -su paquete de Play no se
//                    bajó-. App lo pide antes con asegurarModeloGestos; si igual llega, «No disponible».
// Antes: export type EstadoPreparar = 'listo' | 'sinVistaPrevia' | 'negro' | 'reconocedor'
export type EstadoPreparar = 'listo' | 'sinVistaPrevia' | 'negro' | 'reconocedor' | 'sinModelo'
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
  // -tarea 104- Sin el modelo no tiene sentido reintentar cada segundo.
  if (r.estado === 'sinModelo') return 'no'
  if (r.estado === 'negro') return negrosSeguidos >= NEGROS_PARA_NO_DISPONIBLE ? 'no' : 'reintentar'
  return 'reintentar'
}

// EL MODELO DE GESTOS A PEDIDO -tarea 104, PASO 2, 06-10-2026-.
//
// gesture_recognizer.task -8 MB- salió de la instalación de Play: va en un paquete a pedido y se baja
// la primera vez que alguien enciende Control por gestos. Mientras baja, la fila dice "Preparando los
// gestos… 70 %" con una barra fina y el interruptor se ve encendido. Sin internet la fila lo dice y el
// interruptor NO se enciende -lámina c-.
//
// Diálogo de Play -opción B, Javier, 06-10-2026-: al encender el interruptor SÍ se muestra
// showConfirmationDialog si Play pide Wi-Fi / datos -WAITING_FOR_WIFI o REQUIRES_USER_CONFIRMATION-,
// igual que Empezar con la voz. Si dice que no, el interruptor queda apagado y la fila muestra el aviso
// en el color normal -gestosRechazados-. No hay precarga silenciosa de gestos al abrir la app: no hay
// otro camino que omita el diálogo.
export type ResultadoModeloGestos = 'lista' | 'sin-conexion' | 'rechazada'

export type EstadoModeloGestos =
  | { estado: 'nada' }
  | { estado: 'bajando'; progreso: number }
  | { estado: 'sin-conexion' }
  | { estado: 'rechazada' }
  | { estado: 'error'; mensaje: string }

export async function asegurarModeloGestos(alProgreso: (fraccion: number) => void): Promise<ResultadoModeloGestos> {
  const forzado = descargaForzada('t104gestos', alProgreso)
  if (forzado) return forzado as Promise<ResultadoModeloGestos>
  // En el navegador no hay modelo que bajar: preparar dirá lo suyo, como antes.
  if (!Capacitor.isNativePlatform()) return 'lista'
  if (!Gestos.asegurarModelo || !Gestos.addListener) return 'lista'
  let oyente: PluginListenerHandle | null = null
  try {
    oyente = await Gestos.addListener('progresoGestos', (d) => {
      if (d && typeof d.progreso === 'number') alProgreso(d.progreso)
    })
    await Gestos.asegurarModelo()
    return 'lista'
  } catch (e: any) {
    if (e && e.code === 'SIN_CONEXION') return 'sin-conexion'
    if (e && e.code === 'RECHAZADA') return 'rechazada'
    // Un lado nativo anterior a la tarea 104 no tiene el método: el modelo viene en assets.
    if (e && e.code === 'UNIMPLEMENTED') return 'lista'
    throw e
  } finally {
    if (oyente) oyente.remove()
  }
}

// ENCENDER EL INTERRUPTOR SOLO CON EL MODELO EN EL TELÉFONO. encender() se llama únicamente si el
// modelo quedó listo y la persona sigue queriendo gestos -no lo apagó mientras bajaba-. El avance se
// muestra recién con el primer progreso: si el modelo ya está, no parpadea "Preparando…". Devuelve si
// se encendió.
export async function encenderGestos(dep: {
  asegurar: (alProgreso: (fraccion: number) => void) => Promise<ResultadoModeloGestos>
  alCambiar: (e: EstadoModeloGestos) => void
  encender: () => void
  sigueQueriendo: () => boolean
}): Promise<boolean> {
  let r: ResultadoModeloGestos
  try {
    r = await dep.asegurar((fraccion) => dep.alCambiar({ estado: 'bajando', progreso: fraccion }))
  } catch (e: any) {
    dep.alCambiar({ estado: 'error', mensaje: e?.message || String(e) })
    return false
  }
  if (r === 'sin-conexion') {
    dep.alCambiar({ estado: 'sin-conexion' })
    return false
  }
  if (r === 'rechazada') {
    dep.alCambiar({ estado: 'rechazada' })
    return false
  }
  dep.alCambiar({ estado: 'nada' })
  if (!dep.sigueQueriendo()) return false
  dep.encender()
  return true
}
