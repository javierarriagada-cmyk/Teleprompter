// -corrección teléfono PR 157, 2026-10-27- Aviso propio «queda 1 minuto» (lectura y grabación).
// Antes: la frase de lectura iba DENTRO de la pastilla (BarraDeTiempo, faseLimiteVoz === 'aviso')
// y se veía chica y abajo; la de grabación ya era AvisoBreve pero en el tercio superior.

/** Opciones del aviso flotante «queda 1 minuto». Misma forma en lectura y grabación. */
export function opcionesAvisoQuedaMinuto(): {
  duracionMs: number
  colocacion: 'limite'
  contrasteGrabacion: boolean
} {
  // 8 s; colocacion 'limite' = borde inferior a 1/3 desde abajo; contraste claro como grabación.
  return { duracionMs: 8000, colocacion: 'limite', contrasteGrabacion: true }
}

/**
 * Qué texto lleva la pastilla del tiempo cuando hay fase de límite de voz.
 * Antes (hasta 2026-10-27): 'aviso' → frase avisoQuedaMinutoVoz; 'queda' → textoQuedaConVoz.
 * Ahora: siempre el tiempo (mm:ss / mm:ss); la frase va en AvisoBreve.
 */
export type ModoTextoPastillaLimite = 'tiempo' | 'fraseAviso' | 'quedaConVoz'
export function modoTextoPastillaLimite(
  _fase: 'aviso' | 'queda' | null
): ModoTextoPastillaLimite {
  return 'tiempo'
}
