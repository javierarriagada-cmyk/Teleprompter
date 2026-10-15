// -pulido-1- El auto-guardado que falla se avisa UNA vez por racha: el primer fallo avisa, los que
// siguen no, y un guardado que sale bien cierra la racha para que el próximo fallo vuelva a avisar.
// Puro para poder probarlo sin montar App.
export function pasoRachaGuardado(yaAvisado: boolean, salioBien: boolean): { avisar: boolean; avisado: boolean } {
  if (salioBien) return { avisar: false, avisado: false }
  return { avisar: !yaAvisado, avisado: true }
}
