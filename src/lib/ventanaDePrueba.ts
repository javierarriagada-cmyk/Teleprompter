// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface OpcionesPruebaFlotante { servicio: boolean; ventana: boolean }
export interface AccionPruebaFlotante { tipo: 'alternar' | 'cerrar'; sesion: number }
interface PluginVentanaDePrueba {
  estado(): Promise<{ accesibilidad: boolean }>
  abrirAjustesAccesibilidad(): Promise<void>
  abrir(opciones: OpcionesPruebaFlotante): Promise<{ sesion: number }>
  cerrar(): Promise<void>
  addListener(evento: 'accion', oyente: (accion: AccionPruebaFlotante) => void): Promise<PluginListenerHandle>
}
export const VentanaDePrueba = /* @__PURE__ */ registerPlugin<PluginVentanaDePrueba>('VentanaDePrueba')

// Solo consulta el permiso ya existente. No lo pide otra vez ni cambia MotorNativo:
// si falta, se desarma la intención ANTES del diálogo que abre el camino normal de Empezar.
const VoskParaPrueba = /* @__PURE__ */ registerPlugin<{ checkPermissions(): Promise<{ microfono: string }> }>('VoskNativo')
export async function microfonoYaConcedidoParaPrueba(): Promise<boolean> {
  return (await VoskParaPrueba.checkPermissions()).microfono === 'granted'
}
