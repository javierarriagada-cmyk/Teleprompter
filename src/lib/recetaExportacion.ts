// LA RECETA COMÚN DE EXPORTACIÓN -tarea 87, parte B, 04-10-2026-. Es lo que el visor le pide al
// nativo al guardar una toma: con qué estilo, qué subtítulos y -después- qué tramos y qué filtro.
// Los tramos son del plan 2 y el filtro del plan 3, y aquí quedan en null. El nativo la lee en
// RecetaExportacion.java con las MISMAS reglas de validarReceta: si se cambia una, se cambia la otra.
// -04-10-2026, Javier simplifica la 87- La receta ya no lleva la altura -margenAbajo, 0,125 en
// "Normal" y 0,35 en "Para redes"-: el subtítulo va siempre a 1/6 -MARGEN_ABAJO_SUBTITULOS en
// lib/subtitulos.ts y UbicacionSubtitulos.MARGEN_ABAJO en Java-.
// -tarea 88, 04-10-2026- Los tramos ya no quedan en null: con pausas, la receta lleva los que quedan
// -recetaDe, abajo-. El filtro sigue en null.
// -tarea 96, 05-10-2026- El filtro ya no queda en null: con un filtro que no es Natural, la receta lleva
// su tono y su matriz para Media3 -lib/filtros.ts, matrizParaMedia3-. Natural sigue en null y el camino
// de hoy no cambia.
import type { EstiloSubtitulo, Subtitulo } from './subtitulos'
import { esNeutro, matrizDeTono, matrizParaMedia3, type FiltroToma, type TonoFiltro } from './filtros'

// -tarea 88, 04-10-2026- Los tramos ya se usan: los que QUEDAN de una toma con pausas -tramos.ts,
// tramosQueQuedan-, en el reloj del archivo. Antes: "plan 2; aquí siempre null".
export type TramoMs = { desdeMs: number; hastaMs: number }
export type RecetaExportacion = {
  version: 1
  estilo: EstiloSubtitulo // de subtitulos.ts
  subtitulos: Subtitulo[] // [] si no lleva
  tramos: TramoMs[] | null // plan 2; null = la toma entera
  // -tarea 96, 05-10-2026- La forma del plan 3, 4.4, sin pielSuave -queda para su tarea-: el tono va
  // para el registro del nativo -Sigo96- y la matriz son los 16 números de RgbMatrix, por columnas. El
  // nativo no conoce los nombres: aplica los números. null = Natural, sin filtro.
  // Antes: filtro: null // plan 3; en esta tarea, siempre null. Su forma la define el plan 3: no se inventa
  filtro: FiltroReceta | null
}
export type FiltroReceta = { tono: TonoFiltro; matriz: number[] }

// Sin estilo o sin subtítulos no hay nada que dibujar: la receta lleva la lista vacía y es copia.
// -tarea 88- tramos: los que quedan de una toma con pausas. Sin pausas no viene -o viene vacío- y la
// receta lleva null, como hasta hoy: el camino de guardado es el de siempre. Con tramos la receta
// NUNCA es copia, aunque el estilo sea "No" -esCopia, abajo-.
// -tarea 96- filtro: el elegido en el visor. Natural -o sin filtro- deja null, como hasta hoy.
export function recetaDe(o: { estilo: EstiloSubtitulo; subtitulos: Subtitulo[]; tramos?: TramoMs[] | null; filtro?: FiltroToma | null }): RecetaExportacion {
  const lleva = o.estilo !== 'no' && Array.isArray(o.subtitulos) && o.subtitulos.length > 0
  return {
    version: 1,
    estilo: o.estilo,
    subtitulos: lleva ? o.subtitulos : [],
    // Antes: tramos: null, siempre.
    tramos: o.tramos && o.tramos.length > 0 ? o.tramos : null,
    // Antes: filtro: null, siempre.
    filtro: o.filtro && !esNeutro(o.filtro) ? { tono: o.filtro.tono, matriz: matrizParaMedia3(matrizDeTono(o.filtro.tono)) } : null
  }
}

// Nada que dibujar, cortar ni filtrar: el nativo copia la toma tal cual, sin recodificar.
// -tarea 96- Con filtro, NUNCA es copia: el color se cambia recodificando.
export function esCopia(r: RecetaExportacion): boolean {
  const sinSubtitulos = r.estilo === 'no' || !r.subtitulos || r.subtitulos.length === 0
  return sinSubtitulos && r.tramos === null && r.filtro === null
}

// POR DÓNDE SE GUARDA UNA TOMA -tomas-largas, 15-10-2026-. La decisión de guardarToma
// -ReproductorGrabacion-, sacada aquí para probarla sin el visor: lo mismo que hacía en línea.
//   'receta'      con pausas -tramos- o un filtro que no es Natural: exportarAGaleria, recodifica.
//   'subtitulos'  con subtítulos y sin lo anterior: guardarEnGaleriaConSubtitulos, recodifica.
//   'copia'       sin subtítulos, sin pausas y en Natural: guardarEnGaleria, los mismos bytes, NUNCA
//                 Media3 Transformer. Una toma de 25 min sin nada que cambiarle tardaba 6,5 min en
//                 guardarse porque el filtro recordado de otra toma la mandaba a recodificar.
export type CaminoDeGuardado = 'receta' | 'subtitulos' | 'copia'
export function caminoDeGuardado(o: { estilo: EstiloSubtitulo; subtitulos: Subtitulo[]; tramos?: TramoMs[] | null; filtro?: FiltroToma | null }): CaminoDeGuardado {
  const conSubtitulos = o.estilo !== 'no' && Array.isArray(o.subtitulos) && o.subtitulos.length > 0
  const conTramos = !!o.tramos && o.tramos.length > 0
  if (conTramos || !esNeutro(o.filtro)) return 'receta'
  return conSubtitulos ? 'subtitulos' : 'copia'
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
  // -tarea 96, 05-10-2026- El filtro, si viene: un tono -texto, para el registro- y 16 números finitos.
  // Las mismas reglas en RecetaExportacion.java -desdeValores-. No se exige que el tono sea uno de los
  // seis: el nativo no los conoce, y así un tono nuevo no pide APK. Antes: if (r.filtro !== null)
  // return 'filtro no va en esta tarea'.
  if (r.filtro !== null) {
    const f = r.filtro as any
    if (!f || typeof f !== 'object') return 'filtro no es un objeto'
    if (typeof f.tono !== 'string' || f.tono.length === 0) return 'filtro sin tono'
    if (!Array.isArray(f.matriz) || f.matriz.length !== 16) return 'matriz de filtro sin 16 números'
    if (!f.matriz.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))) return 'matriz de filtro sin cifras'
  }
  return null
}
