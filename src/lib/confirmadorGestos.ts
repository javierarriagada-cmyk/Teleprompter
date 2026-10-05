// EL CONFIRMADOR DE GESTOS -tarea 88, 04-10-2026, docs/tarea88.txt, sección 6.3-. TypeScript puro.
//
// Cada revisión de un cuadro -lib/gestos.ts, revisarCuadro- trae la etiqueta de MediaPipe y su puntaje.
// Un gesto se confirma con REVISIONES_PARA_CONFIRMAR revisiones seguidas que dicen lo mismo, y se emite
// UNA vez por racha: la palma sostenida no vuelve a emitir hasta que la racha se corta. vistoDesdeMs es
// la hora -tMs- de la primera revisión de la racha: de ahí sale el margen de 1 s de la pausa por palma
// -pausaToma.ts, MARGEN_MANO_MS-.
// -tarea 88, segunda vuelta, 04-10-2026- Ese margen ya no corta: el corte sale del fin de la última
// palabra, acotado a 5 s antes de vistoDesdeMs -pausaToma.ts, desdeDePalma-.
//
// 'ninguno' también se confirma -tres revisiones sin palma ni V-: es lo que la máquina llama "bajar la
// mano" -manoBajada- antes de que otra palma pueda seguir.
import type { Gesto } from './pausaToma'
import type { RevisionCuadro } from './gestos'

// Valores de partida: Claude los ajusta con lo medido en el moto g86.
export const REVISIONES_PARA_CONFIRMAR = 3
export const PUNTAJE_MINIMO = 0.6

export type Confirmador = { gesto: Gesto; cuenta: number; desdeMs: number; emitido: boolean }
export type Confirmado = { gesto: Gesto; tMs: number; vistoDesdeMs: number }

// Open_Palm -> palma; Victory -> victoria; todo lo demás, 'sinCuadro' o puntaje bajo -> ninguno.
export function gestoDe(r: Pick<RevisionCuadro, 'etiqueta' | 'puntaje'>): Gesto {
  if (!r || !(r.puntaje >= PUNTAJE_MINIMO)) return 'ninguno'
  if (r.etiqueta === 'Open_Palm') return 'palma'
  if (r.etiqueta === 'Victory') return 'victoria'
  return 'ninguno'
}

export function confirmadorNuevo(): Confirmador {
  return { gesto: 'ninguno', cuenta: 0, desdeMs: 0, emitido: false }
}

export function revisar(c: Confirmador, r: RevisionCuadro): { confirmador: Confirmador; confirmado: Confirmado | null } {
  const g = gestoDe(r)
  // Otro gesto -o el primero-: empieza una racha nueva en esta revisión.
  const sigue = c.cuenta > 0 && c.gesto === g
  const n: Confirmador = sigue
    ? { ...c, cuenta: c.cuenta + 1 }
    : { gesto: g, cuenta: 1, desdeMs: r.tMs, emitido: false }
  if (!n.emitido && n.cuenta >= REVISIONES_PARA_CONFIRMAR) {
    return { confirmador: { ...n, emitido: true }, confirmado: { gesto: g, tMs: r.tMs, vistoDesdeMs: n.desdeMs } }
  }
  return { confirmador: n, confirmado: null }
}
