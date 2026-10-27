// Decisiones de la lectura forzada a fija al llegar al límite sin Sigo+.
// -arreglo PR 157, 26-10-2026-

/** ¿Pausar/reanudar va al motor fijo? Preferencia «fija» O lectura forzada al límite. */
export function pausaUsaMotorFijo(fija: boolean, lecturaForzadaAFija: boolean): boolean {
  // Antes (bug): return fija — con lectura forzada el texto seguía corriendo al pausar.
  return fija || lecturaForzadaAFija
}
