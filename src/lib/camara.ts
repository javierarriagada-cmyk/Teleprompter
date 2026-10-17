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
    tienePistaAudio: boolean | null
    nivelRmsDb: number | null
    // -tarea 87, parte C, 04-10-2026- La forma del archivo, con el MediaMetadataRetriever que ya
    // abre. Opcionales: un APK viejo no los manda.
    anchoPx?: number
    altoPx?: number
    rotacion?: number
  }>
  extraerMiniatura(options: { ruta: string; destino: string; atMs?: number }): Promise<{ ruta: string }>
  buscarMp4Recientes(): Promise<{ rutas: string[] }>
  espacioLibre(): Promise<{ bytesLibres: number }>
  guardarEnGaleria(options: { ruta: string }): Promise<{ ok: boolean; uri?: string }>
  compartir(options: { uri: string }): Promise<void>
  // Antes -tomas-grandes-: abrirConReproductor. El visor ya no lo usa.
  // -visor-servidor- Anota la toma y devuelve su dirección en el servidor local.
  direccionDeToma(options: { ruta: string }): Promise<{ url: string }>
  existeEnGaleria(options: { uri: string }): Promise<{ existe: boolean }>
  guardarConSubtitulos(options: { ruta: string; subtitulos: string; estilo: string }): Promise<{ ok: boolean; uri?: string }>
  // LA RECETA COMÚN -tarea 87, parte B, 04-10-2026-. La receta va como JSON -lib/recetaExportacion.ts-;
  // el nativo la lee en RecetaExportacion.java. Un APK viejo no la tiene: rechaza "not implemented"
  // y guardarEnGaleriaConSubtitulos cae a guardarConSubtitulos.
  exportarToma(options: { ruta: string; receta: string }): Promise<{ ok: boolean; uri?: string; recodifico: boolean; msGuardado: number }>
  addListener(evento: 'progresoGuardado', cb: (d: { porcentaje: number }) => void): Promise<{ remove: () => Promise<void> }>
  // LAS MEDICIONES DE EXPORTACIÓN -tarea 87, paso 0, 03-10-2026-. Solo las usa el panel de
  // mediciones de la APK de prueba -PanelMediciones.tsx-. El nativo escribe al logcat con la
  // etiqueta SigoExport solo si la app es depurable; en Play no escribe nada.
  // Cada línea que el nativo escribe -guardado_inicio, capa, guardado_fin- llega también acá.
  addListener(evento: 'medicion', cb: (d: { linea: string }) => void): Promise<{ remove: () => Promise<void> }>
  // La forma real del archivo: lo que analizarVideo no da. 0 o vacío si no se pudo leer.
  medirToma(options: { ruta: string }): Promise<{
    existe: boolean
    bytes: number
    duracionMs: number
    anchoPx: number
    altoPx: number
    rotacion: number
    fps: number
    bitrateBps: number
    mimeVideo: string
    mimeAudio: string
    audioHz: number
    audioCanales: number
  }>
  // Escribe UNA línea al logcat -etiqueta SigoExport-. La arma lib/medicionesExport.ts.
  anotarMedicion(options: { linea: string }): Promise<{ escrita: boolean }>
  equipoMedicion(): Promise<{ modelo: string; android: string; app: string; depurable: boolean }>
  // Borra de la galería SOLO las uris que se le pasan -las copias que dejó el panel-.
  borrarCopiasDeMedicion(options: { uris: string[] }): Promise<{ borradas: string[]; fallidas: string[] }>
  fijarBrillo(options: { valor: number }): Promise<{ ok: boolean }>
  restaurarBrillo(): Promise<{ ok: boolean }>
  leerBrillo(): Promise<{ valor: number }>
  // -tarea 91- La orientación fija mientras dura la toma: lib/orientacionToma.ts.
  fijarOrientacion(options: { repetir?: boolean }): Promise<{ rotacion: number; orientacion: string; valor: number; anterior: string; natural: string }>
  soltarOrientacion(options: { olvidar?: boolean }): Promise<{ orientacion: string; rotacion: number }>
  // -tarea 83, parte B, LS-M2- La cámara o el micrófono tomados por otra app en plena toma:
  // lib/recursosToma.ts y PerdidaDeRecursos.java.
  vigilarRecursos(options: { camara: boolean }): Promise<{ camara: boolean; microfono: boolean }>
  soltarRecursos(): Promise<void>
  addListener(evento: 'recursoPerdido', cb: (d: { recurso: 'camara' | 'microfono'; motivo: string }) => void): Promise<{ remove: () => Promise<void> }>
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
  estabilizar?: boolean
  // EL HUECO TAL COMO SE DIBUJO -28-09-2026-, en px de la pantalla -getBoundingClientRect del
  // recuadro-. Cuando viene, la camara va exactamente ahi. Antes se recalculaba con la fraccion
  // por vistaH, y vistaH -el alto del contenedor que hace scroll- no es el alto donde se dibuja
  // el hueco -el lienzo entero-: en el moto g86 la camara quedaba 26 px mas arriba que el hueco
  // y abajo se veia una franja negra.
  rectRecuadro?: { x: number; y: number; width: number; height: number }
  // LA VENTANA MEDIDA, EN TABLETA -tarea 83, 30-09-2026-. El rectángulo de la superficie de la
  // lectura, en px de la pantalla. Con la cámara detrás -u oculta- la vista previa cubre esto y no
  // window.screen: en una tableta con ventana dividida o en un plegable, la pantalla física no es
  // la ventana de la app. Solo la manda la tableta; en el teléfono no viene y queda lo de la 82.
  ventanaMedida?: { x: number; y: number; width: number; height: number }
}

let estaEncendida = false
let ladoEstado: LadoCamara = 'frontal'
let fondoEstado: FondoToma = 'detras'
let estabilizacionSoportadaVal = true

export function estabilizacionSoportada(): boolean {
  return estabilizacionSoportadaVal
}

function esErrorDeEstabilizacion(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '')
  return /Video stabilization mode/i.test(msg) || /stabilization/i.test(msg)
}
// La ultima medida del hueco -rectRecuadro-. Al dar vuelta la camara, encenderCamara arranca de
// nuevo sin ella en la config: se usa esta, o la camara volveria al lugar mal calculado.
let rectRecuadroGuardado: OpcionesConfigCamara['rectRecuadro'] = undefined
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

// Por que fallo el ultimo corte, si fallo: lo anota la toma -tomaVideo.ts-. Sin esto, un
// corte fallido no deja rastro: el registro del sistema se sobrescribe en minutos.
let ultimoErrorCorte: string | null = null
export function errorDelUltimoCorte(): string | null {
  return ultimoErrorCorte
}

export async function cortarGrabacionVideo(): Promise<string | null> {
  if (!grabandoVideoNativo && typeof (CameraPreview as any).stopRecordVideo !== 'function') {
    return null
  }
  grabandoVideoNativo = false
  ultimoErrorCorte = null
  try {
    const res = await CameraPreview.stopRecordVideo()
    const ruta = (res && (res as any).videoFilePath) || null
    if (!ruta) ultimoErrorCorte = 'stopRecordVideo no devolvio la ruta'
    return ruta
  } catch (e) {
    console.warn('[Camara] Error al cortar grabacion:', e)
    ultimoErrorCorte = e instanceof Error ? e.message : String(e)
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
// LA CÁMARA NEGADA SE DICE -tarea 84, F2, 29-09-2026-. Si la persona niega el permiso, Grabar se
// quedaba sin imagen y nadie explicaba por qué: encenderCamara lo anotaba en la consola y devolvía
// null, igual que con cualquier otro error. Ahora, cuando el motivo es el permiso, avisa a quien se
// haya suscrito -App abre el diálogo de permiso, el mismo del micrófono-.
//
// CÓMO SE DISTINGUE "NEGADO" DE LOS DEMÁS ERRORES. El plugin de la cámara -capgo camera-preview,
// CameraPreview.java, handleCameraPermissionResult- rechaza start() con el código
// 'cameraPermissionDenied' cuando Android devuelve el permiso negado; "cámara ocupada" o "no hay
// cámara" traen otros códigos y otros mensajes. Se mira el código, y el mensaje de ese mismo
// rechazo -"camera permission denied"- por si una versión del plugin no pasara el código.
const oyentesCamaraNegada = new Set<() => void>()

export function alNegarseLaCamara(cb: () => void): () => void {
  oyentesCamaraNegada.add(cb)
  return () => {
    oyentesCamaraNegada.delete(cb)
  }
}

export function esPermisoDeCamaraNegado(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null
  if (!e) return false
  if (e.code === 'cameraPermissionDenied') return true
  return typeof e.message === 'string' && /camera permission denied/i.test(e.message)
}

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

  const querraEstabilizar = config?.estabilizar !== undefined ? config.estabilizar : true
  const modoEstabilizacion = (querraEstabilizar && estabilizacionSoportadaVal) ? 'standard' : 'off'

  try {
    // Antes: sin videoStabilizationMode en los parámetros de start
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
      storeToFile: false,
      videoStabilizationMode: modoEstabilizacion
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
    if (modoEstabilizacion === 'standard' && esErrorDeEstabilizacion(err)) {
      estabilizacionSoportadaVal = false
      try {
        await CameraPreview.start({
          position: posNativa,
          toBack: true,
          aspectMode: 'cover',
          includeSafeAreaInsets: false,
          disableAudio: false,
          enableOpacity: true,
          enableVideoMode: true,
          force: true,
          x,
          y,
          width,
          height,
          storeToFile: false,
          videoStabilizationMode: 'off'
        })
        try {
          await CamaraNativa.fijarModoSuperficie({ modo: 'sistema' })
        } catch (e) {}
        estaEncendida = true
        if (fondoEstado === 'oculta') {
          try {
            await CameraPreview.setOpacity({ opacity: 0 })
          } catch (e) {}
        } else {
          try {
            await CameraPreview.setOpacity({ opacity: 1 })
          } catch (e) {}
        }
        return null
      } catch (retryErr) {
        console.error('[Camara] Error al reintentar encender cámara sin estabilización:', retryErr)
        estaEncendida = false
        if (esPermisoDeCamaraNegado(retryErr)) oyentesCamaraNegada.forEach((cb) => cb())
        return null
      }
    }
    estaEncendida = false
    if (esPermisoDeCamaraNegado(err)) oyentesCamaraNegada.forEach((cb) => cb())
    return null
  }
}

// SEIS FICHAS QUE SON TRES COSAS. El plugin devuelve las dos familias de
// nombres que usa CameraX: las resoluciones -480p, 720p, 1080p, 2160p- y las
// relativas -low, medium, high-, que son la MISMA escala nombrada dos veces.
// Javier lo vio en el telefono el 21 de septiembre de 2026: "en vez de 3
// aparecen seis opciones que no son seis opciones".
//
// Se queda con las resoluciones, que son las que dicen algo: "720p" es un dato,
// "medium" es una opinion. Si el telefono SOLO reporta las relativas, se
// quedan esas, porque algo hay que ofrecer.
//
// Y 4K queda fuera aunque el telefono lo soporte: con el motor de voz y el
// WebView encima termina en throttle termico y se pierden cuadros del
// seguimiento, que es lo unico que nos diferencia.
export const CALIDADES_POR_RESOLUCION = ['1080p', '720p', '480p']

export function normalizarCalidades(qualities: string[]): string[] {
  const sinCuatroK = qualities.filter((q) => q !== '2160p' && q !== '4:3')
  const porResolucion = CALIDADES_POR_RESOLUCION.filter((q) => sinCuatroK.includes(q))
  if (porResolucion.length > 0) return porResolucion
  return ['high', 'medium', 'low'].filter((q) => sinCuatroK.includes(q))
}

export async function obtenerCalidadesSoportadas(): Promise<string[]> {
  try {
    if (typeof (CameraPreview as any).getSupportedVideoQualities === 'function') {
      const res = await (CameraPreview as any).getSupportedVideoQualities()
      if (res && Array.isArray(res.qualities)) {
        const filtradas = normalizarCalidades(res.qualities)
        if (filtradas.length > 0) return filtradas
      }
    }
  } catch (e) {
    console.warn('[Camara] Error al obtener calidades soportadas:', e)
  }
  return ['1080p', '720p', '480p']
}

export async function fijarCalidadVideo(calidad: string): Promise<void> {
  try {
    if (typeof (CameraPreview as any).setVideoQuality === 'function') {
      await (CameraPreview as any).setVideoQuality({ quality: calidad })
    }
  } catch (e) {
    console.warn('[Camara] Error al fijar calidad de video:', e)
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

  if (config?.rectRecuadro) rectRecuadroGuardado = config.rectRecuadro
  if (fondo === 'recuadro' && rectRecuadroGuardado) {
    const r = rectRecuadroGuardado
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  }

  if (fondo === 'recuadro') {
    const rx = config?.recuadroX ?? 0.64
    const ry = config?.recuadroY ?? 0.52
    const w = Math.round(winW * 0.32)
    const h = Math.round(w * (4 / 3))
    const x = Math.round(rx * winW)
    const y = Math.round(ry * winH)

    return { x, y, width: w, height: h }
  }

  // 30-09-2026, tarea 83: en tableta, la ventana medida -ver ventanaMedida-.
  const vm = config?.ventanaMedida
  if (vm && vm.width > 0 && vm.height > 0) {
    return { x: Math.round(vm.x), y: Math.round(vm.y), width: Math.round(vm.width), height: Math.round(vm.height) }
  }

  // Fondo DETRÁS u OCULTA: ocupa toda la pantalla de borde a borde
  const screenW = typeof window !== 'undefined' ? (window.screen?.width || winW) : winW
  const screenH = typeof window !== 'undefined' ? (window.screen?.height || winH) : winH

  // AL GIRAR EL TELÉFONO -tarea 82, A6, 29-09-2026-. window.screen mide la pantalla física, y en
  // el WebView de Android sus dos lados se dan vuelta con el giro: por eso "detrás" cubre de borde
  // a borde, barras incluidas. Pero nada garantiza que ya se hayan dado vuelta cuando llega este
  // cálculo -lo dispara el cambio de tamaño de la vista, TeleprompterView-, y hay WebViews que los
  // informan siempre en vertical. Si screen dice vertical y la vista medida dice horizontal -o al
  // revés-, la vista previa quedaría como una franja angosta en la pantalla girada. En ese caso se
  // usa lo medido -vistaW, vistaH-, que es la ventana de ahora mismo. Si coinciden, queda screen
  // como siempre: en vertical nada cambia.
  const vistaW = config?.vistaW
  const vistaH = config?.vistaH
  if (vistaW && vistaH && vistaW !== vistaH && screenW !== screenH && (vistaW > vistaH) !== (screenW > screenH)) {
    return { x: 0, y: 0, width: vistaW, height: vistaH }
  }

  return { x: 0, y: 0, width: screenW, height: screenH }
}
