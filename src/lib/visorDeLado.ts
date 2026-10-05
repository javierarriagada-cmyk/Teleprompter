// EL VISOR DE LADO -tarea 90, 04-10-2026-. Las medidas del boceto aprobado -PR #67, rama
// tarea89-tres-defectos, docs/pantallas/tarea89/medidas-implementacion.md, cuarta versión, más el
// ajuste de Javier del 04-10-2026, 11:35: el botón y el avance de la barra de reproducción también en
// 48-. El boceto es el PISO: nada de lo que sale de aquí puede quedar por debajo.
//
// Con el teléfono de lado -useLayout() === 'tel-h'- la disposición la decide la forma del VIDEO, no la
// del teléfono:
//   CASO 1 -toma horizontal 16:9-: el video a todo el alto que deja la barra de reproducción, la barra
//     debajo a todo su ancho, y una columna angosta de controles al costado.
//   CASO 2 -toma vertical 9:16-: el video a todo el alto y una tarjeta compacta de 320 a su lado; el
//     grupo centrado sobre --bg-suelo, sin bordes que marquen el hueco.
// De pie el visor no cambia: este archivo solo se usa en 'tel-h'.
// -tarea 83, parte B, 04-10-2026- Y en 'tab-h', la tableta de lado, con estas mismas cuentas: ahí la
// columna queda en COLUMNA_MINIMA y el video se ajusta -ajustado = true-, porque un 16:9 a todo el alto
// mide más que el ancho de la pantalla. Antes: solo 'tel-h'.
//
// Todo en dp -px de CSS en la WebView-. Los bordes seguros llegan de env(safe-area-inset-*): el
// recorte de la cámara del moto g86 -125 px a 450 dpi = 44 dp- y la barra de tres botones -48 dp-,
// cada uno del lado que le toca según el giro. Con la barra de estado oculta -SystemBars.hide-, arriba
// llega 0.

export type FormaVideo = 'horizontal' | 'vertical'

// La barra de reproducción: el botón y el avance de 48 -ajuste de Javier- más el aire de arriba
// --aire-1, 4-. Era 48 en el boceto, con botón y avance de 44.
export const TOQUE_MINIMO = 48
export const ALTO_BARRA_REPRODUCCION = 4 + TOQUE_MINIMO
// El rótulo más chico de los controles de lado -«Guardar», «Amarillo»-: 12. --texto-etiqueta es 11
// -styles.css:34- y no se toca, porque lo usan otras pantallas.
export const ROTULO_MINIMO = 12
// La columna nunca baja del riel izquierdo de Leer -styles-horizontal.css:20, --riel-izq-leer 112-.
export const COLUMNA_MINIMA = 112
// -04-10-2026, (4)- Javier lo vio en su moto: la columna era demasiado ancha. Ahora es el 70% de lo que
// deja el video de 16:9 -antes era todo eso-: 185 → 130 a 915x411 y 160 → 112 a 800x360. El mínimo de
// 112 se queda: a 800 justo lo toca, y en una ventana más angosta sigue mandando.
export const FRACCION_COLUMNA = 0.7
// La tarjeta del caso 2: el ancho de los paneles de ficha de lado -docs/tarea82.txt:90-93-, y su
// separación del video.
export const ANCHO_TARJETA = 320
export const SEPARACION_TARJETA = 16

export interface Bordes {
  arriba: number
  derecha: number
  abajo: number
  izquierda: number
}

export interface Caja {
  x: number
  y: number
  ancho: number
  alto: number
}

export type MedidasVisorDeLado =
  | { caso: 1; util: number; video: Caja; barra: Caja; columna: Caja; franjas: { izquierda: Caja; derecha: Caja }; ajustado: boolean }
  | { caso: 2; util: number; video: Caja; tarjeta: { x: number; ancho: number }; margen: number; ajustado: boolean }

// LA FORMA DEL VIDEO. Ancho mayor que alto: horizontal. Un cuadrado o sin datos -0 x 0, el video aún
// sin cargar- cuenta como vertical, el caso 2, que es el que menos supone: deja el video entero.
export function formaDeVideo(ancho: number | undefined | null, alto: number | undefined | null): FormaVideo | null {
  if (!ancho || !alto || !Number.isFinite(ancho) || !Number.isFinite(alto)) return null
  return ancho > alto ? 'horizontal' : 'vertical'
}

const redondo = (n: number) => Math.round(n)

// LAS MEDIDAS DE CADA CASO. Las mismas cuentas del boceto -boceto.tsx de la tarea 89, Caso1 y Caso2-,
// con la barra de 52.
export function medidasVisorDeLado(p: { ancho: number; alto: number; bordes: Bordes; forma: FormaVideo }): MedidasVisorDeLado {
  const { ancho, alto, bordes: b, forma } = p
  const util = Math.max(0, ancho - b.izquierda - b.derecha)
  const altoUtil = Math.max(0, alto - b.arriba - b.abajo)
  if (forma === 'horizontal') {
    // El video a todo el alto que deja la barra, en 16:9; la columna con el resto.
    let altoVideo = Math.max(0, altoUtil - ALTO_BARRA_REPRODUCCION)
    let anchoVideo = redondo((altoVideo * 16) / 9)
    let columna = util - anchoVideo
    let ajustado = false
    // -(4)- La columna es el 70% de ese resto, con el mínimo de 112. Lo demás queda a los dos lados del
    // video, que se centra en el espacio entre el borde seguro y la columna.
    if (columna >= COLUMNA_MINIMA) columna = Math.max(COLUMNA_MINIMA, redondo(columna * FRACCION_COLUMNA))
    if (columna < COLUMNA_MINIMA) {
      // Si no alcanza, primero la columna llega a 112 y después se achica el video, en 16:9 y centrado
      // en el alto -no se recorta-. En 915x411 y 800x360 no pasa.
      ajustado = true
      columna = COLUMNA_MINIMA
      anchoVideo = Math.max(0, util - columna)
      altoVideo = redondo((anchoVideo * 9) / 16)
    }
    const y = b.arriba + redondo((altoUtil - altoVideo - ALTO_BARRA_REPRODUCCION) / 2)
    // -(4)- El espacio del video y su franja de cada lado: a 915x411, 693 = 28 + 638 + 27; a 800x360,
    // 596 = 24 + 548 + 24. La franja izquierda incluye el borde seguro -el recorte o la barra de tres
    // botones-, como la de antes.
    const espacio = Math.max(0, util - columna)
    const xVideo = b.izquierda + Math.max(0, redondo((espacio - anchoVideo) / 2))
    const xColumna = b.izquierda + espacio
    return {
      caso: 1,
      util,
      video: { x: xVideo, y, ancho: anchoVideo, alto: altoVideo },
      barra: { x: xVideo, y: y + altoVideo, ancho: anchoVideo, alto: ALTO_BARRA_REPRODUCCION },
      columna: { x: xColumna, y: b.arriba, ancho: columna, alto: altoUtil },
      franjas: {
        izquierda: { x: 0, y, ancho: xVideo, alto: altoVideo },
        derecha: { x: xVideo + anchoVideo, y, ancho: Math.max(0, xColumna - xVideo - anchoVideo), alto: altoVideo }
      },
      ajustado
    }
  }
  // CASO 2: el video a todo el alto en 9:16, la tarjeta de 320 a 16, y el grupo centrado.
  let altoVideo = altoUtil
  let anchoVideo = redondo((altoVideo * 9) / 16)
  let ajustado = false
  const resto = ANCHO_TARJETA + SEPARACION_TARJETA
  if (anchoVideo + resto > util) {
    // Una ventana más angosta que el grupo -600 de ancho, el mínimo de 'tel-h'-: se achica el video, no
    // la tarjeta, y queda centrado en el alto.
    ajustado = true
    anchoVideo = Math.max(0, util - resto)
    altoVideo = redondo((anchoVideo * 16) / 9)
  }
  const grupo = anchoVideo + resto
  const margen = Math.max(0, redondo((util - grupo) / 2))
  const x = b.izquierda + margen
  return {
    caso: 2,
    util,
    video: { x, y: b.arriba + redondo((altoUtil - altoVideo) / 2), ancho: anchoVideo, alto: altoVideo },
    tarjeta: { x: x + anchoVideo + SEPARACION_TARJETA, ancho: ANCHO_TARJETA },
    margen,
    ajustado
  }
}
