// Tres senales para saber si una toma salio muda.
//
// No es una comprobacion mas: es lo que nos protege en los telefonos
// que no repartan el audio como el de Javier. Medido el 21 de septiembre
// de 2026: con la grabacion tomando audio y el motor nativo escuchando
// al mismo tiempo, las dos cosas funcionaron y el archivo quedo con voz
// a -25.0 dB contra -60.2 dB de la misma corrida en silencio.
//
// 1. el contenedor: ¿el mp4 tiene pista de audio?
// 2. el nivel:      ¿esa pista tiene algo? RMS de unos segundos
// 3. el cruce:      si el motor reconocio frases durante la toma y
//                   el archivo no tiene sonido, la tuberia fallo.
//                   Eso es un error duro. Si el motor tampoco oyo
//                   nada, probablemente no hablo nadie: aviso, no error.

export const UMBRAL_RMS_DB = -50

export type SenalesMudo = {
  tienePistaAudio: boolean | null
  nivelRmsDb: number | null
  frasesOidas: number
}

export type VeredictoMudo = {
  mudo: boolean
  errorDuro: boolean
  aviso: boolean
  motivo: string
}

export function pistaSinNivel(nivelRmsDb: number | null): boolean {
  if (nivelRmsDb === null || Number.isNaN(nivelRmsDb)) return false
  return nivelRmsDb < UMBRAL_RMS_DB
}

export function veredictoMudo(s: SenalesMudo): VeredictoMudo {
  const sinPista = s.tienePistaAudio === false
  const pistaVacia = pistaSinNivel(s.nivelRmsDb ?? null)
  const mudo = sinPista || pistaVacia
  const hablo = (s.frasesOidas || 0) > 0

  if (mudo && hablo) {
    return {
      mudo: true,
      errorDuro: true,
      aviso: false,
      motivo: 'El motor oyo frases y el archivo no tiene sonido'
    }
  }
  if (mudo && !hablo) {
    return {
      mudo: true,
      errorDuro: false,
      aviso: true,
      motivo: 'No se oye audio en este archivo'
    }
  }
  return {
    mudo: false,
    errorDuro: false,
    aviso: false,
    motivo: ''
  }
}
