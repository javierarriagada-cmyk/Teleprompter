// EL ATRÁS PREDICTIVO DE ANDROID -rama atras-predictivo, 11-10-2026-. Referencias:
// developer.android.com/guide/navigation/custom-back/predictive-back-gesture y
// developer.android.com/design/ui/mobile/guides/patterns/predictive-back.
//
// UN SOLO RECEPTOR DEL GESTO: el OnBackPressedCallback de MainActivity.java. El plugin AtrasPredictivo
// -AtrasPredictivoPlugin.java- lleva y trae:
//   - del nativo a la web, 'inicio' con el borde, 'avance' de 0 a 1, 'cancelado' y 'confirmado';
//   - de la web al nativo, hayAdondeVolver(boolean): con true el callback queda activo; con false,
//     inactivo, y Android hace su propia animación de volver al inicio del teléfono.
//     -corrección del PR 94, 11-10-2026- Ahora { hay, camara }: con camara en true, MainActivity achica
//     también la vista previa nativa con el mismo avance -ver camaraConElGesto-.
//
// Lo que hace el atrás NO cambia: 'confirmado' corre handleVolverAtras de App.tsx, el mismo que antes
// corría el 'backButton' de Capacitor. Lo nuevo es la animación mientras el dedo se desliza.
//
// Acá vive lo que no se ve -qué decide si hay adónde volver, cuándo se anima, cómo se lee lo que manda
// el nativo- y el acceso al plugin. El cableado está en App.tsx, donde estaba el 'backButton'.
import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core'

export type BordeAtras = 'izquierdo' | 'derecho' | 'ninguno'
export type EventoAtras = 'inicio' | 'avance' | 'cancelado' | 'confirmado'

export interface PluginAtrasPredictivo {
  // camara es opcional: si no viene, el nativo la toma como false -AtrasPredictivoPlugin.java-. Antes:
  // hayAdondeVolver(opciones: { hay: boolean }): Promise<void>
  hayAdondeVolver(opciones: { hay: boolean; camara?: boolean }): Promise<void>
  addListener(evento: EventoAtras, oyente: (datos: unknown) => void): Promise<PluginListenerHandle>
}

// registerPlugin se llama UNA vez -Capacitor avisa si el mismo plugin se registra dos-, y solo si el
// nativo lo trae: en el navegador y en las pruebas no hay gesto de atrás y no se registra nada. Mismo
// camino que pluginIdioma -lib/idioma.ts-.
let plugin: PluginAtrasPredictivo | null | undefined
export function pluginAtras(): PluginAtrasPredictivo | null {
  if (plugin !== undefined) return plugin
  try {
    plugin = Capacitor.isPluginAvailable('AtrasPredictivo')
      ? registerPlugin<PluginAtrasPredictivo>('AtrasPredictivo')
      : null
  } catch (e) {
    console.warn('[atras] no se pudo preguntar por el plugin AtrasPredictivo:', e)
    plugin = null
  }
  if (plugin === null) console.info('[atras] sin plugin AtrasPredictivo: no hay gesto de atrás que recibir')
  return plugin
}

// Lo que mira el atrás para decidir. Es lo mismo que recorre handleVolverAtras de App.tsx, en el mismo
// orden: primero lo abierto, después la toma, después la vista.
export interface EstadoAtras {
  vista: 'biblioteca' | 'editor' | 'lectura'
  // El panel de ajustes, un menú, el visor de una toma o un diálogo: el atrás lo cierra.
  algoAbierto: boolean
  // Leyendo, grabando o en la cuenta regresiva: el atrás detiene.
  tomaAndando: boolean
  movimientoApagado: boolean
}

// ¿Hay adónde volver? En la biblioteca sin nada abierto, no: el atrás es de Android y sale al inicio del
// teléfono. En cualquier otro caso el gesto es de Sigo.
export function hayAdondeVolver(e: EstadoAtras): boolean {
  return e.vista !== 'biblioteca' || e.algoAbierto
}

// ¿Se anima mientras el dedo se desliza? Solo cuando el atrás va a cambiar de pantalla: desde el editor,
// o desde Leer o Grabar en LISTO. Sin animación, el atrás funciona como siempre al soltar: con algo
// abierto -lo cierra-, durante una lectura o una toma -la detiene- y con el movimiento reducido.
export function conAnimacionAtras(e: EstadoAtras): boolean {
  if (e.movimientoApagado || e.algoAbierto || e.tomaAndando) return false
  return e.vista === 'editor' || e.vista === 'lectura'
}

// ¿La vista previa nativa se achica con el gesto? -corrección del PR 94, 11-10-2026- Cuando el gesto se
// anima y la cámara está prendida con el fondo detrás del texto o en el recuadro: esa imagen no es de la
// web -la dibuja Capgo detrás del WebView- y la web no la puede achicar. La achica MainActivity, con el
// mismo cálculo que escalaAtras y corrimientoAtras, directo en cada avance. Con el movimiento reducido o
// con la toma andando, conAnimacionAtras ya dice que no: la cámara tampoco se anima.
export function camaraConElGesto(e: EstadoAtras, camaraAlFondo: boolean): boolean {
  return camaraAlFondo && conAnimacionAtras(e)
}

// Lo que llega del nativo, validado. Un borde desconocido es 'ninguno': la pantalla se achica sin correrse.
export function leerBorde(d: unknown): BordeAtras {
  const b = d && typeof d === 'object' ? (d as { borde?: unknown }).borde : undefined
  return b === 'izquierdo' || b === 'derecho' ? b : 'ninguno'
}

// El avance, entre 0 y 1. Lo que no es un número se descarta -null- y quien lo recibe lo anota.
export function leerAvance(d: unknown): number | null {
  const a = d && typeof d === 'object' ? (d as { avance?: unknown }).avance : undefined
  if (typeof a !== 'number' || !Number.isFinite(a)) return null
  return Math.min(1, Math.max(0, a))
}

// CÓMO SE VE. La pantalla actual se achica hasta 90 % según el avance -la escala de salida de la guía de
// Material para superficies a pantalla completa- y se corre hacia el borde opuesto al dedo: ancho / 20 - 8,
// la misma cuenta de la guía para el corrimiento. Con el dedo desde la izquierda se corre a la derecha.
// -corrección del PR 94- La misma cuenta está en MainActivity.achicarCamara, para la vista previa nativa:
// si se cambia acá, se cambia allá.
export const ESCALA_MINIMA_ATRAS = 0.9
export function escalaAtras(avance: number): number {
  return 1 - (1 - ESCALA_MINIMA_ATRAS) * avance
}
export function corrimientoAtras(avance: number, borde: BordeAtras, anchoPantalla: number): number {
  if (borde === 'ninguno') return 0
  const maximo = Math.max(0, anchoPantalla / 20 - 8)
  return (borde === 'izquierdo' ? 1 : -1) * maximo * avance
}
