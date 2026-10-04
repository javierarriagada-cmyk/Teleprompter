// LA RECETA COMÚN DE EXPORTACIÓN -tarea 87, parte B, 04-10-2026-. Es lo que el visor le pide al
// nativo al guardar una toma: con qué estilo, qué subtítulos y -después- qué tramos y qué filtro.
// Los tramos son del plan 2 y el filtro del plan 3, y aquí quedan en null. El nativo la lee en
// RecetaExportacion.java con las MISMAS reglas de validarReceta: si se cambia una, se cambia la otra.
// -04-10-2026, Javier simplifica la 87- La receta ya no lleva la altura -margenAbajo, 0,125 en
// "Normal" y 0,35 en "Para redes"-: el subtítulo va siempre a 1/6 -MARGEN_ABAJO_SUBTITULOS en
// lib/subtitulos.ts y UbicacionSubtitulos.MARGEN_ABAJO en Java-.
// -tarea 88, 04-10-2026- Los tramos ya no quedan en null: con pausas, la receta lleva los que quedan
// -recetaDe, abajo-. El filtro sigue en null.
import type { EstiloSubtitulo, Subtitulo } from './subtitulos'

// -tarea 88, 04-10-2026- Los tramos ya se usan: los que QUEDAN de una toma con pausas -tramos.ts,
// tramosQueQuedan-, en el reloj del archivo. Antes: "plan 2; aquí siempre null".
export type TramoMs = { desdeMs: number; hastaMs: number }
export type RecetaExportacion = {
  version: 1
  estilo: EstiloSubtitulo // de subtitulos.ts
  subtitulos: Subtitulo[] // [] si no lleva
  tramos: TramoMs[] | null // plan 2; null = la toma entera
  filtro: null // plan 3; en esta tarea, siempre null. Su forma la define el plan 3: no se inventa
}

// Sin estilo o sin subtítulos no hay nada que dibujar: la receta lleva la lista vacía y es copia.
// -tarea 88- tramos: los que quedan de una toma con pausas. Sin pausas no viene -o viene vacío- y la
// receta lleva null, como hasta hoy: el camino de guardado es el de siempre. Con tramos la receta
// NUNCA es copia, aunque el estilo sea "No" -esCopia, abajo-.
export function recetaDe(o: { estilo: EstiloSubtitulo; subtitulos: Subtitulo[]; tramos?: TramoMs[] | null }): RecetaExportacion {
  const lleva = o.estilo !== 'no' && Array.isArray(o.subtitulos) && o.subtitulos.length > 0
  return {
    version: 1,
    estilo: o.estilo,
    subtitulos: lleva ? o.subtitulos : [],
    // Antes: tramos: null, siempre.
    tramos: o.tramos && o.tramos.length > 0 ? o.tramos : null,
    filtro: null
  }
}

// Nada que dibujar, cortar ni filtrar: el nativo copia la toma tal cual, sin recodificar.
export function esCopia(r: RecetaExportacion): boolean {
  const sinSubtitulos = r.estilo === 'no' || !r.subtitulos || r.subtitulos.length === 0
  return sinSubtitulos && r.tramos === null && r.filtro === null
}

// null si sirve; si no, por qué no. Los tramos, si vienen, van ordenados y sin encimarse.
export function validarReceta(r: RecetaExportacion): string | null {
  if (!r || r.version !== 1) return 'versión desconocida'
  if (!['no', 'amarillo', 'rojo', 'formal'].includes(r.estilo)) return 'estilo desconocido'
  if (!Array.isArray(r.subtitulos)) return 'subtítulos no es una lista'
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
