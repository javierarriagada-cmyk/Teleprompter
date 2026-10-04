// LOS REGISTROS DE LA TAREA 87 PARA EL MOTO G86 -04-10-2026-. Lo que no se pudo medir en Chrome y
// Claude verifica en el teléfono: la forma de cada toma -también la de 480p y la de 1920x1080 con
// rotación 90/270-, los bordes seguros reales -la barra de estado y la franja de gestos-, dónde
// quedan el video, las acciones y el subtítulo en el visor. Son líneas
// SigoExport con el MISMO formato del paso 0 -lib/medicionesExport.ts, docs/tarea87.txt P0-5-: van
// al registro del panel de mediciones y al logcat. Solo en la APK de prueba -HERRAMIENTAS-; en Play
// esta rama no existe. Una medición que falla no puede romper nada: todo va en try.
import { HERRAMIENTAS } from './herramientas'
import { lineaSigoExport, conEtiqueta, agregarAlRegistro, EVENTO_DOM_MEDICION, type ValorMedicion } from './medicionesExport'
import { anotarMedicion } from './archivosNativos'
import type { AnalisisVideo } from './archivosNativos'
import { orientacionDeToma } from './orientacion'

// El orden fijo de las claves de cada evento nuevo. Los del paso 0 siguen en EVENTOS.
export const EVENTOS_87 = {
  // Al cortar o recuperar una toma, y al analizar una toma vieja en el visor.
  orientacion: ['id', 'ancho_px', 'alto_px', 'rot_grados', 'orientacion', 'calidad_toma', 'origen'],
  // Al abrir el visor: env(safe-area-inset-*) medidos en la página, en dp -px de CSS-.
  bordes: ['arriba_dp', 'abajo_dp', 'izquierda_dp', 'derecha_dp', 'ventana_ancho_dp', 'ventana_alto_dp', 'dpr'],
  // Cada vez que el visor se acomoda -abrir, abrir o cerrar el panel-: lo que de verdad quedó.
  visor: ['id', 'panel', 'disponible_dp', 'video_alto_dp', 'imagen_ancho_dp', 'imagen_alto_dp', 'acciones_arriba_dp',
    'acciones_abajo_dp', 'limite_abajo_dp', 'arriba_se_desplaza', 'nombre_visible', 'subtitulo_abajo_dp']
  // -04-10-2026, Javier simplifica la 87- Se sacaron la clave posicion de visor y la línea
  // tiempo_guardado -el tiempo estimado contra el real-, con la posición y el tiempo estimado.
} as const

export type Evento87 = keyof typeof EVENTOS_87

export function lineaEvento87(evento: Evento87, datos: Partial<Record<string, ValorMedicion>>, tMs: number = Date.now()): string {
  const claves = EVENTOS_87[evento] as readonly string[]
  return lineaSigoExport(evento, claves.map((c) => [c, datos[c]] as [string, ValorMedicion]), tMs)
}

// Al registro del panel y al logcat. Devuelve la línea -null si no se anotó-.
export function anotar87(evento: Evento87, datos: Partial<Record<string, ValorMedicion>>): string | null {
  if (!HERRAMIENTAS) return null
  try {
    const mensaje = lineaEvento87(evento, datos)
    agregarAlRegistro(conEtiqueta(mensaje))
    try {
      window.dispatchEvent(new Event(EVENTO_DOM_MEDICION))
    } catch {
      // sin ventana no hay a quién avisar
    }
    void anotarMedicion(mensaje).catch(() => {})
    return mensaje
  } catch {
    return null
  }
}

// Los bordes seguros reales: un elemento con padding env(safe-area-inset-*) y se lee lo que quedó.
// En Chrome de escritorio dan 0. En el moto g86, arriba es la barra de estado y abajo la barra de
// tres botones o la franja de gestos: esa la mide Claude, no se fija en el código.
export function medirBordesSeguros(): { arriba: number; abajo: number; izquierda: number; derecha: number } | null {
  try {
    const d = document.createElement('div')
    d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);' +
      'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)'
    document.body.appendChild(d)
    const cs = getComputedStyle(d)
    const n = (v: string) => Math.round((parseFloat(v) || 0) * 10) / 10
    const r = { arriba: n(cs.paddingTop), abajo: n(cs.paddingBottom), izquierda: n(cs.paddingLeft), derecha: n(cs.paddingRight) }
    d.remove()
    return r
  } catch {
    return null
  }
}

// La línea evento=orientacion: el ancho, el alto y la rotación del archivo, y cómo se ve. Así se
// verifica en el moto g86 la forma de 480p y el 1920x1080 con rotación 90/270 visto como 1080x1920.
// origen: corte, recuperada o visor -una toma vieja que se analiza al abrirla-.
export function anotarOrientacion(id: string, a: Partial<AnalisisVideo>, calidad: string | undefined, origen: string): void {
  anotar87('orientacion', {
    id,
    ancho_px: a.anchoPx,
    alto_px: a.altoPx,
    rot_grados: a.rotacion,
    orientacion: orientacionDeToma(a),
    calidad_toma: calidad,
    origen
  })
}
