// Decisiones de la lectura forzada a fija al llegar al límite sin Sigo+.
// -arreglo PR 157, 26-10-2026-

/** ¿Pausar/reanudar va al motor fijo? Preferencia «fija» O lectura forzada al límite. */
export function pausaUsaMotorFijo(fija: boolean, lecturaForzadaAFija: boolean): boolean {
  // Antes (bug): return fija — con lectura forzada el texto seguía corriendo al pausar.
  return fija || lecturaForzadaAFija
}

/**
 * Token entero al que llevar el seguidor antes de volver a la voz si la persona
 * se suscribe desde el aviso del límite. El motor fijo ya avanzó; sin esto la
 * voz reanudaba donde estaba al cortar.
 */
export function tokenSeguidorAlVolverAVoz(posicionMotorFijo: number): number {
  // Antes (bug): no se movía el seguidor; la voz partía del token del límite.
  return Math.floor(posicionMotorFijo)
}
