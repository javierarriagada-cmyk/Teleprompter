import { registerPlugin, Capacitor } from '@capacitor/core'
import { t } from '../textos'

export interface AccesosDirectosPluginContract {
  tomarAccionPendiente(): Promise<{ accion: string }>
  fijarAccesoGrabar(opciones: { etiquetaCorta: string; etiquetaLarga: string }): Promise<void>
  quitarAccesoGrabar(): Promise<void>
  addListener(
    evento: 'accionShortcut',
    listener: (datos: { accion: string }) => void
  ): Promise<{ remove: () => void }>
}

const pluginNativo = registerPlugin<AccesosDirectosPluginContract>('AccesosDirectos')

export function recortarTituloAcceso(titulo: string, maxLen = 16): string {
  const texto = (titulo || '').trim()
  if (!texto) return ''
  if (texto.length <= maxLen) return texto
  return texto.slice(0, maxLen - 1) + '…'
}

export async function actualizarAccesoGrabar(guion: { titulo: string } | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    if (!guion) {
      await pluginNativo.quitarAccesoGrabar()
      return
    }
    const titulo = recortarTituloAcceso(guion.titulo, 16)
    const etiquetaCorta = t('accesoGrabar').slice(0, 10)
    let etiquetaLarga = t('accesoGrabarTitulo', { titulo })
    if (etiquetaLarga.length > 25) {
      etiquetaLarga = etiquetaLarga.slice(0, 24) + '…'
    }
    await pluginNativo.fijarAccesoGrabar({ etiquetaCorta, etiquetaLarga })
  } catch (e) {
    console.warn('[accesosDirectos] Error al actualizar acceso Grabar:', e)
  }
}

export async function tomarAccionPendiente(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return ''
  try {
    const res = await pluginNativo.tomarAccionPendiente()
    return res && res.accion ? res.accion : ''
  } catch {
    return ''
  }
}

export async function escucharAccionShortcut(cb: (accion: string) => void): Promise<{ remove: () => void }> {
  if (!Capacitor.isNativePlatform()) return { remove: () => {} }
  try {
    return await pluginNativo.addListener('accionShortcut', (datos) => {
      if (datos && datos.accion) cb(datos.accion)
    })
  } catch {
    return { remove: () => {} }
  }
}

export function pluginAccesos(): AccesosDirectosPluginContract {
  return pluginNativo
}
