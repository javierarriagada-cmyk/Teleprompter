import { CameraPreview } from '@capgo/camera-preview'
import { registerPlugin } from '@capacitor/core'

export interface CamaraNativaPlugin {
  fijarModoSuperficie(options: { modo: 'sistema' | 'textura' }): Promise<{ encontrado: boolean; modo: string }>
  directorioGrabaciones(): Promise<{ ruta: string }>
  escribirTexto(options: { ruta: string; contenido: string }): Promise<{ ok: boolean }>
  leerTexto(options: { ruta: string }): Promise<{ contenido: string }>
  listar(options: { directorio: string }): Promise<{ nombres: string[] }>
  mover(options: { desde: string; hasta: string }): Promise<{ ruta: string }>
  borrarArchivo(options: { ruta: string }): Promise<{ ok: boolean }>
  bytesDe(options: { ruta: string }): Promise<{ bytes: number }>
  analizarVideo(options: { ruta: string }): Promise<{
    duracionMs: number
    bytes: number
    tienePistaAudio: boolean
    nivelRmsDb: number | null
  }>
  extraerMiniatura(options: { ruta: string; destino: string; atMs?: number }): Promise<{ ruta: string }>
  buscarMp4Recientes(): Promise<{ rutas: string[] }>
}

// Un solo registerPlugin. PruebaCamaraNativaView importa este mismo
// export: registrar el plugin dos veces tira un warning de Capacitor
// y no agrega nada.
export const CamaraNativa = registerPlugin<CamaraNativaPlugin>('CamaraNativa')

export type LadoCamara = 'frontal' | 'trasera'
export type ModoCamara = 'apagada' | 'frontal' | 'trasera'
export type FondoToma = 'detras' | 'recuadro' | 'oculta'

export interface OpcionesConfigCamara {
  fondoToma?: FondoToma
  recuadroX?: number // fracción 0..1
  recuadroY?: number // fracción 0..1
  vistaW?: number    // ancho px de la pantalla/vista
  vistaH?: number    // alto px de la pantalla/vista
}

let estaEncendida = false
let ladoEstado: LadoCamara = 'frontal'
let fondoEstado: FondoToma = 'detras'
let grabandoVideoNativo = false

export function camaraEncendida(): boolean {
  return estaEncendida
}

export function ladoActual(): LadoCamara {
  return ladoEstado
}

export function fondoActual(): FondoToma {
  return fondoEstado
}

/**
 * streamActual se mantiene por compatibilidad de firma con la interfaz previa (retorna null),
 * ya que con la cámara nativa no se utiliza MediaStream web.
 */
export function streamActual(): MediaStream | null {
  return null
}

export async function apagarCamara(): Promise<void> {
  if (grabandoVideoNativo) {
    try {
      await cortarGrabacionVideo()
    } catch (e) {
      console.warn('[Camara] Error al cortar grabacion antes de apagar:', e)
    }
  }
  if (estaEncendida) {
    try {
      await CameraPreview.stop()
    } catch (e) {
      console.warn('[Camara] Error al apagar CameraPreview:', e)
    }
  }
  estaEncendida = false
}

/**
 * Arranca la grabacion nativa. disableAudio SIEMPRE false: si se arranca
 * sin audio, el archivo sale MUDO Y SIN NINGUN ERROR. Medido.
 * No elige calidad: sale lo que da el telefono (H.264 1080p / AAC).
 */
export async function empezarGrabacionVideo(): Promise<void> {
  if (typeof (CameraPreview as any).startRecordVideo !== 'function') {
    throw new Error('startRecordVideo no esta disponible')
  }
  await CameraPreview.startRecordVideo({ disableAudio: false })
  grabandoVideoNativo = true
}

export async function cortarGrabacionVideo(): Promise<string | null> {
  if (!grabandoVideoNativo && typeof (CameraPreview as any).stopRecordVideo !== 'function') {
    return null
  }
  grabandoVideoNativo = false
  try {
    const res = await CameraPreview.stopRecordVideo()
    return (res && (res as any).videoFilePath) || null
  } catch (e) {
    console.warn('[Camara] Error al cortar grabacion:', e)
    return null
  }
}

export function grabacionNativaEnCurso(): boolean {
  return grabandoVideoNativo
}

/**
 * Enciende la sesión de cámara nativa con CameraPreview.
 * REGLA FUNDAMENTAL: disableAudio SIEMPRE en false para evitar que futuras grabaciones salgan mudas.
 */
export async function encenderCamara(
  lado: LadoCamara,
  config?: OpcionesConfigCamara
): Promise<MediaStream | null> {
  if (estaEncendida) {
    await apagarCamara()
  }

  ladoEstado = lado
  if (config?.fondoToma) {
    fondoEstado = config.fondoToma
  }

  const posNativa = lado === 'frontal' ? 'front' : 'rear'

  // Calcular dimensiones para el modo de inicio
  const { x, y, width, height } = calcularDimensionesPreview(config)

  try {
    await CameraPreview.start({
      position: posNativa,
      toBack: true,            // SIEMPRE DETRÁS DEL WEBVIEW EN TODOS LOS FONDOS
      aspectMode: 'cover',     // ¡CUBRIR LA PANTALLA SIN BANDAS NEGRAS!
      includeSafeAreaInsets: false,
      disableAudio: false,      // ¡REGLA DE ORO! Habilitar audio desde el día 1
      enableOpacity: true,     // Permite cambiar opacidad (usado en modo OCULTA)
      enableVideoMode: true,   // Habilita modo video nativo
      force: true,             // Fuerza el reinicio si la sesión estaba atascada
      x,
      y,
      width,
      height,
      storeToFile: false
    })

    // Fijar superficie de sistema inmediatamente tras arrancar
    try {
      await CamaraNativa.fijarModoSuperficie({ modo: 'sistema' })
    } catch (e) {
      console.warn('[Camara] fijarModoSuperficie no disponible en esta plataforma:', e)
    }

    estaEncendida = true

    // Si el fondo es 'oculta', fijar opacidad a 0 de inmediato
    if (fondoEstado === 'oculta') {
      try {
        await CameraPreview.setOpacity({ opacity: 0 })
      } catch (e) {
        console.warn('[Camara] Error al fijar opacidad 0 en encenderCamara:', e)
      }
    } else {
      try {
        await CameraPreview.setOpacity({ opacity: 1 })
      } catch (e) {}
    }

    return null
  } catch (err) {
    console.error('[Camara] Error al encender cámara nativa:', err)
    estaEncendida = false
    return null
  }
}

export async function cambiarLadoCamara(config?: OpcionesConfigCamara): Promise<MediaStream | null> {
  const nuevoLado: LadoCamara = ladoEstado === 'frontal' ? 'trasera' : 'frontal'
  return await encenderCamara(nuevoLado, config)
}

/**
 * Actualiza la configuración de fondo / recuadro sin reiniciar la sesión nativa de cámara.
 */
export async function actualizarConfigCamara(config: OpcionesConfigCamara): Promise<void> {
  if (!estaEncendida) return

  if (config.fondoToma) {
    fondoEstado = config.fondoToma
  }

  if (fondoEstado === 'oculta') {
    // Modo OCULTA: la cámara SIGUE ENCENDIDA pero invisible (opacidad 0)
    try {
      await CameraPreview.setOpacity({ opacity: 0 })
    } catch (e) {
      console.warn('[Camara] Error al setear opacidad 0:', e)
    }
    return
  }

  // Modos DETRAS y RECUADRO: opacidad en 1
  try {
    await CameraPreview.setOpacity({ opacity: 1 })
  } catch (e) {}

  const { x, y, width, height } = calcularDimensionesPreview(config)

  try {
    await CameraPreview.setPreviewSize({ x, y, width, height })
  } catch (e) {
    console.warn('[Camara] Error al actualizar setPreviewSize:', e)
  }
}

/**
 * Función auxiliar para calcular las coordenadas y tamaño en px para CameraPreview.
 * Para pantalla completa se utiliza window.screen.width/height que mide la pantalla real.
 */
function calcularDimensionesPreview(config?: OpcionesConfigCamara): {
  x: number
  y: number
  width: number
  height: number
} {
  const fondo = config?.fondoToma || fondoEstado
  const winW = config?.vistaW || (typeof window !== 'undefined' ? (window.screen?.width || window.innerWidth) : 360)
  const winH = config?.vistaH || (typeof window !== 'undefined' ? (window.screen?.height || window.innerHeight) : 640)

  if (fondo === 'recuadro') {
    const rx = config?.recuadroX ?? 0.64
    const ry = config?.recuadroY ?? 0.52
    const w = Math.round(winW * 0.32)
    const h = Math.round(w * (4 / 3))
    const x = Math.round(rx * winW)
    const y = Math.round(ry * winH)

    return { x, y, width: w, height: h }
  }

  // Fondo DETRÁS u OCULTA: ocupa toda la pantalla de borde a borde
  const screenW = typeof window !== 'undefined' ? (window.screen?.width || winW) : winW
  const screenH = typeof window !== 'undefined' ? (window.screen?.height || winH) : winH

  return { x: 0, y: 0, width: screenW, height: screenH }
}
