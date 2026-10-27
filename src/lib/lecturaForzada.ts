// Decisiones de la lectura al límite sin Sigo+.
// -pasada teléfono PR 157, 27-10-2026-
// Antes (26-10-2026, arreglos PR 157): este archivo tenía pausaUsaMotorFijo y
// tokenSeguidorAlVolverAVoz para la lectura forzada a fija (lecturaForzadaAFija).
// Esa vía salió: al límite la lectura se pausa; al suscribirse desde el aviso queda en pausa.
// La decisión vive en limites.ts → accionAlLimiteLectura().

/* Antes — pausaUsaMotorFijo (retirada 27-10-2026):
export function pausaUsaMotorFijo(fija: boolean, lecturaForzadaAFija: boolean): boolean {
  // Antes (bug): return fija — con lectura forzada el texto seguía corriendo al pausar.
  return fija || lecturaForzadaAFija
}
*/

/* Antes — tokenSeguidorAlVolverAVoz (retirada 27-10-2026):
export function tokenSeguidorAlVolverAVoz(posicionMotorFijo: number): number {
  // Antes (bug): no se movía el seguidor; la voz partía del token del límite.
  return Math.floor(posicionMotorFijo)
}
*/
