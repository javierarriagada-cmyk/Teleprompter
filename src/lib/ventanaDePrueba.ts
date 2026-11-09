// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface OpcionesPruebaFlotante { servicio: boolean; ventana: boolean }
// Antes: tipo: 'alternar' | 'cerrar'
export interface AccionPruebaFlotante {
  tipo: 'pausa' | 'seguir' | 'volver' | 'cerrar' | 'alternar'
  sesion: number
  token?: number
}
export interface PreferenciasFlotante {
  transparencia?: number
  fontSize?: number
  x?: number
  y?: number
  w?: number
  h?: number
  // -banda A, 09-11-2026- El ancho en dp de la banda que se abriría ahora: la guardada de esta orientación o la de A.
  anchoVentana?: number
}
// -09-11-2026- Lo que Android dejó de la sesión de la ventana, para la vuelta a Sigo. hay=false si nunca hubo una.
export interface EstadoSesionFlotante {
  hay: boolean
  sesion?: number
  abierta?: boolean
  enPausa?: boolean
  leidosSeg?: number
  llegoAlLimite?: boolean
  token?: number
}
export interface EstadoFlotante {
  accesibilidad: boolean
  volvioSolo?: boolean
  paginaAjustes?: string
}
interface PluginVentanaDePrueba {
  estado(): Promise<EstadoFlotante>
  abrirAjustesAccesibilidad(): Promise<{ pagina: string }>
  abrir(opciones: OpcionesPruebaFlotante): Promise<{ sesion: number }>
  cerrar(): Promise<void>
  preferencias(): Promise<PreferenciasFlotante>
  guardarPreferencias(prefs: PreferenciasFlotante): Promise<void>
  enviar(mensaje: Record<string, unknown>): Promise<void>
  estadoSesion(): Promise<EstadoSesionFlotante>
  addListener(evento: 'accion', oyente: (accion: AccionPruebaFlotante) => void): Promise<PluginListenerHandle>
}
export const VentanaDePrueba = /* @__PURE__ */ registerPlugin<PluginVentanaDePrueba>('VentanaDePrueba')

// Antes: se consultaba el permiso aquí para descartar la intención si faltaba, antes del diálogo.
// Ese gancho se fue: Empezar pide el permiso por el camino de siempre y el intento sigue si lo da.
