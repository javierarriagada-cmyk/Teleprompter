// LA RECETA COMÚN DE EXPORTACIÓN -tarea 87, parte B, 04-10-2026-. Es lo que el visor le pide al
// nativo al guardar una toma: con qué estilo, qué subtítulos, a qué altura y -después- qué tramos
// y qué filtro. Hoy solo cambia la altura -"Para redes"-; los tramos son del plan 2 y el filtro del
// plan 3, y aquí quedan en null. El nativo la lee en RecetaExportacion.java con las MISMAS reglas
// de validarReceta: si se cambia una, se cambia la otra.
import type { EstiloSubtitulo, Subtitulo } from './subtitulos'
import { margenAbajo, type PosicionSubtitulos } from './posicionSubtitulos'

export type { PosicionSubtitulos } from './posicionSubtitulos'
export type TramoMs = { desdeMs: number; hastaMs: number } // plan 2; aquí siempre null
export type RecetaExportacion = {
  version: 1
  estilo: EstiloSubtitulo // de subtitulos.ts
  subtitulos: Subtitulo[] // [] si no lleva
  margenAbajo: number // de posicionSubtitulos.ts; 0.125 en "Normal", 0.35 en "Para redes"
  tramos: TramoMs[] | null // plan 2; null = la toma entera
  filtro: null // plan 3; en esta tarea, siempre null. Su forma la define el plan 3: no se inventa
}

// Sin estilo o sin subtítulos no hay nada que dibujar: la receta lleva la lista vacía y es copia.
export function recetaDe(o: { estilo: EstiloSubtitulo; subtitulos: Subtitulo[]; posicion?: PosicionSubtitulos }): RecetaExportacion {
  const lleva = o.estilo !== 'no' && Array.isArray(o.subtitulos) && o.subtitulos.length > 0
  return {
    version: 1,
    estilo: o.estilo,
    subtitulos: lleva ? o.subtitulos : [],
    margenAbajo: margenAbajo(o.posicion ?? 'normal'),
    tramos: null,
    filtro: null
  }
}

// Nada que dibujar, cortar ni filtrar: el nativo copia la toma tal cual, sin recodificar.
export function esCopia(r: RecetaExportacion): boolean {
  const sinSubtitulos = r.estilo === 'no' || !r.subtitulos || r.subtitulos.length === 0
  return sinSubtitulos && r.tramos === null && r.filtro === null
}

// null si sirve; si no, por qué no. El margen va de 0 a 0,5 -más arriba de la mitad deja de ser
// "abajo"-, y los tramos, si vienen, van ordenados y sin encimarse.
export function validarReceta(r: RecetaExportacion): string | null {
  if (!r || r.version !== 1) return 'versión desconocida'
  if (!['no', 'amarillo', 'rojo', 'formal'].includes(r.estilo)) return 'estilo desconocido'
  if (!Array.isArray(r.subtitulos)) return 'subtítulos no es una lista'
  if (typeof r.margenAbajo !== 'number' || !Number.isFinite(r.margenAbajo) || r.margenAbajo < 0 || r.margenAbajo > 0.5) {
    return 'margen fuera de 0 a 0,5'
  }
  if (r.tramos !== null) {
    if (!Array.isArray(r.tramos)) return 'tramos no es una lista'
    let fin = -1
    for (const t of r.tramos) {
      if (!t || !Number.isFinite(t.desdeMs) || !Number.isFinite(t.hastaMs)) return 'tramo sin cifras'
      if (t.desdeMs < 0 || t.hastaMs <= t.desdeMs) return 'tramo al revés'
      if (t.desdeMs < fin) return 'tramos desordenados'
      fin = t.hastaMs
    }
  }
  if (r.filtro !== null) return 'filtro no va en esta tarea'
  return null
}
