// DÓNDE VAN LOS SUBTÍTULOS EN LA TOMA -tarea 87, parte D, 04-10-2026-. "Normal" es lo de siempre;
// "Para redes" los sube para que la interfaz de Reels, TikTok y Shorts no los tape.
//
// Zona de Meta para Reels: facebook.com/business/ads-guide/update/image/instagram-reels,
// leída el 29-09-2026 -~14 % arriba, ~35 % abajo, ~6 % por lado; es para anuncios-.
// Es la única que vale en esta tarea: YouTube Shorts y TikTok se miden después -03-10-.
export const ZONA_REDES = { arriba: 0.14, abajo: 0.35, lados: 0.06 } as const

// El margen de abajo de hoy, contado desde el borde de abajo de la imagen y como fracción de su
// alto. Antes vivía en dos lugares -SubtitulosVisor.tsx y CapaDeSubtitulos.java-: en TypeScript
// sale de aquí y a Java llega en la receta -lib/recetaExportacion.ts-.
export const MARGEN_ABAJO_NORMAL = 0.125

export type PosicionSubtitulos = 'normal' | 'redes'

const CLAVE_POSICION = 'sigo_subtitulos_posicion'

// 0,125 en "Normal" y 0,35 en "Para redes". En el archivo, el 0,35 es el píxel PINTADO más bajo
// -con el contorno y, en formal, la franja-; lo ajusta CapaDeSubtitulos.java -docs/tarea87.txt, D0-.
export function margenAbajo(p: PosicionSubtitulos): number {
  return p === 'redes' ? ZONA_REDES.abajo : MARGEN_ABAJO_NORMAL
}

// La última posición elegida. Con cualquier otra cosa guardada -o sin almacenamiento-, "Normal".
export function posicionGuardada(): PosicionSubtitulos {
  try {
    const v = localStorage.getItem(CLAVE_POSICION)
    return v === 'redes' ? 'redes' : 'normal'
  } catch {
    return 'normal'
  }
}

export function guardarPosicion(p: PosicionSubtitulos): void {
  try {
    localStorage.setItem(CLAVE_POSICION, p === 'redes' ? 'redes' : 'normal')
  } catch {
    // sin almacenamiento, la elección vale mientras el visor está abierto
  }
}
