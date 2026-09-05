import { tokenizarGuion } from '../lib/seguidor'

export type EventoLector =
  | { t: number; tipo: 'voz'; hayVoz: boolean }
  | { t: number; tipo: 'parcial'; texto: string }
  | { t: number; tipo: 'final'; texto: string }

export type OpcionesLectura = {
  guion: string
  ppm: number                    // palabras por minuto, 150 es normal
  msEntreParciales?: number      // 250 por omision
  pausaCadaNPalabras?: number    // cada cuantas palabras hace pausa y sale un final
  msDePausa?: number             // 500 por omision
  saltarDesdeHasta?: [number, number]   // se saltea de la palabra A a la B
  improvisarEnPalabra?: number   // dice 8 palabras que no estan en el guion
  porcentajeErrores?: number     // % de palabras que el reconocedor entrega mal
}

export function simularLectura(o: OpcionesLectura): EventoLector[] {
  const tokens = tokenizarGuion(o.guion)
  if (tokens.length === 0) return []

  const ppmTarget = o.ppm || 150
  const totalWords = tokens.length
  const msEntreParciales = o.msEntreParciales ?? 250
  const pausaCadaNPalabras = o.pausaCadaNPalabras ?? 8
  const msDePausa = o.msDePausa ?? 500
  const porcentajeErrores = o.porcentajeErrores ?? 0

  // Calibración exacta de tiempo para que la velocidad global (palabras / duracion) sea exactamente ppmTarget
  const duracionTotalTargetMs = (totalWords / ppmTarget) * 60000
  const numPauses = Math.max(0, Math.floor((totalWords - 1) / pausaCadaNPalabras))
  const totalPauseTimeMs = numPauses * msDePausa
  const netSpeechTimeMs = Math.max(100, duracionTotalTargetMs - totalPauseTimeMs)
  const msPorPalabra = netSpeechTimeMs / totalWords

  let seed = 123456789
  function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const eventos: EventoLector[] = []
  let tActual = 0
  let idxToken = 0

  // Evento inicial de voz
  eventos.push({ t: tActual, tipo: 'voz', hayVoz: true })

  while (idxToken < tokens.length) {
    // Salto
    if (o.saltarDesdeHasta && idxToken >= o.saltarDesdeHasta[0] && idxToken < o.saltarDesdeHasta[1]) {
      idxToken = o.saltarDesdeHasta[1]
      if (idxToken >= tokens.length) break
    }

    // Improvisación
    let palabrasFrase: string[] = []
    if (o.improvisarEnPalabra !== undefined && idxToken === o.improvisarEnPalabra) {
      for (let k = 1; k <= 8; k++) {
        palabrasFrase.push(`palabraimprovisada${k}`)
      }
      // No avanzamos idxToken de guion durante improvisación
    } else {
      const finChunk = Math.min(tokens.length, idxToken + pausaCadaNPalabras)
      for (let i = idxToken; i < finChunk; i++) {
        let w = tokens[i].palabra
        if (porcentajeErrores > 0 && random() * 100 < porcentajeErrores) {
          w = w + 'x'
        }
        palabrasFrase.push(w)
      }
      idxToken += palabrasFrase.length
    }

    const tInicioFrase = tActual
    const duracionFrase = palabrasFrase.length * msPorPalabra
    const tFinFrase = tInicioFrase + duracionFrase

    // Emitir parciales durante la frase
    let tParcial = tInicioFrase + msEntreParciales
    while (tParcial < tFinFrase) {
      const prop = (tParcial - tInicioFrase) / duracionFrase
      const numPalabrasLeidas = Math.max(1, Math.floor(prop * palabrasFrase.length))
      const textoAcumulado = palabrasFrase.slice(0, numPalabrasLeidas)

      eventos.push({
        t: tParcial,
        tipo: 'parcial',
        texto: textoAcumulado.join(' ')
      })
      tParcial += msEntreParciales
    }

    // Emitir final de frase
    eventos.push({
      t: tFinFrase,
      tipo: 'final',
      texto: palabrasFrase.join(' ')
    })

    // Pausa y fin de voz
    eventos.push({ t: tFinFrase, tipo: 'voz', hayVoz: false })

    tActual = tFinFrase + msDePausa

    if (idxToken < tokens.length) {
      eventos.push({ t: tActual, tipo: 'voz', hayVoz: true })
    }
  }

  // Ordenar eventos por tiempo y por prioridad de tipo si son simultáneos (parcial -> final -> voz false)
  const ordenTipo = { parcial: 0, final: 1, voz: 2 }
  eventos.sort((a, b) => {
    if (Math.abs(a.t - b.t) > 1e-5) return a.t - b.t
    return ordenTipo[a.tipo] - ordenTipo[b.tipo]
  })

  return eventos
}
