import { tokenizarGuion } from '../lib/seguidor'

export type EventoLector =
  | { t: number; tipo: 'voz'; hayVoz: boolean }
  | { t: number; tipo: 'parcial'; texto: string }
  | { t: number; tipo: 'final'; texto: string }

export type PuntoVerdad = { t: number; token: number }

export type ResultadoSimulacion = {
  eventos: EventoLector[]
  verdad: PuntoVerdad[]              // muestreada cada 50 ms
  salto: { tMs: number; tokenDestino: number } | null
}

export type OpcionesLectura = {
  guion: string
  ppm: number                    // palabras por minuto, 150 es normal
  msEntreParciales?: number      // 250 por omision
  pausaCadaNPalabras?: number | null // null = NO hace ninguna pausa
  msDePausa?: number             // 500 por omision
  saltarDesdeHasta?: [number, number]   // se saltea de la palabra A a la B
  improvisarEnPalabra?: number   // dice 8 palabras que no estan en el guion
  porcentajeErrores?: number     // % de palabras que el reconocedor entrega mal
}

export function simularLectura(o: OpcionesLectura): ResultadoSimulacion {
  const tokens = tokenizarGuion(o.guion)
  if (tokens.length === 0) {
    return { eventos: [], verdad: [], salto: null }
  }

  const ppmTarget = o.ppm || 150
  const totalWords = tokens.length
  const msEntreParciales = o.msEntreParciales ?? 250
  const pausaCadaNPalabras = o.pausaCadaNPalabras === undefined ? 8 : o.pausaCadaNPalabras
  const msDePausa = o.msDePausa ?? 500
  const porcentajeErrores = o.porcentajeErrores ?? 0

  // Calibración exacta de tiempo
  const duracionTotalTargetMs = (totalWords / ppmTarget) * 60000
  const numPauses = (pausaCadaNPalabras !== null && pausaCadaNPalabras > 0)
    ? Math.max(0, Math.floor((totalWords - 1) / pausaCadaNPalabras))
    : 0
  const totalPauseTimeMs = numPauses * msDePausa
  const netSpeechTimeMs = Math.max(100, duracionTotalTargetMs - totalPauseTimeMs)
  const msPorPalabra = netSpeechTimeMs / totalWords

  let seed = 123456789
  function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const eventos: EventoLector[] = []
  let saltoDetec: { tMs: number; tokenDestino: number } | null = null

  let tActual = 0
  let idxToken = 0

  // Evento inicial de voz
  eventos.push({ t: tActual, tipo: 'voz', hayVoz: true })

  // Rango de marcas temporales para construir la curva de la verdad
  type TramoVerdad = { tInicio: number; tFin: number; tokenInicio: number; tokenFin: number }
  const tramosVerdad: TramoVerdad[] = []

  while (idxToken < tokens.length) {
    // Salto
    if (o.saltarDesdeHasta && idxToken >= o.saltarDesdeHasta[0] && idxToken < o.saltarDesdeHasta[1]) {
      const tokenOrigen = idxToken
      idxToken = o.saltarDesdeHasta[1]
      if (idxToken >= tokens.length) break
      saltoDetec = { tMs: tActual, tokenDestino: idxToken }
    }

    // Improvisación
    let palabrasFrase: string[] = []
    const tokenInicioFrase = idxToken

    if (o.improvisarEnPalabra !== undefined && idxToken === o.improvisarEnPalabra) {
      for (let k = 1; k <= 8; k++) {
        palabrasFrase.push(`palabraimprovisada${k}`)
      }
      // Durante improvisación no avanza el token real de guion
    } else {
      const chunkSize = (pausaCadaNPalabras !== null && pausaCadaNPalabras > 0)
        ? pausaCadaNPalabras
        : tokens.length - idxToken
      const finChunk = Math.min(tokens.length, idxToken + chunkSize)

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
    const tokenFinFrase = o.improvisarEnPalabra !== undefined && tokenInicioFrase === o.improvisarEnPalabra
      ? tokenInicioFrase
      : idxToken - 1

    tramosVerdad.push({
      tInicio: tInicioFrase,
      tFin: tFinFrase,
      tokenInicio: tokenInicioFrase,
      tokenFin: tokenFinFrase
    })

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

    if (pausaCadaNPalabras === null && idxToken < tokens.length) {
      tActual = tFinFrase
    } else {
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
  }

  if (pausaCadaNPalabras === null) {
    const maxTVal = Math.max(...eventos.map((e) => e.t), tActual)
    eventos.push({ t: maxTVal, tipo: 'voz', hayVoz: false })
  }

  // Ordenar eventos por tiempo
  const ordenTipo = { parcial: 0, final: 1, voz: 2 }
  eventos.sort((a, b) => {
    if (Math.abs(a.t - b.t) > 1e-5) return a.t - b.t
    return ordenTipo[a.tipo] - ordenTipo[b.tipo]
  })

  // Muestrear la VERDAD cada 50 ms
  const maxSimT = Math.max(...eventos.map((e) => e.t))
  const verdad: PuntoVerdad[] = []

  function obtenerTokenVerdadEn(t: number): number {
    if (tramosVerdad.length === 0) return 0
    if (t <= tramosVerdad[0].tInicio) return tramosVerdad[0].tokenInicio

    for (let i = 0; i < tramosVerdad.length; i++) {
      const tr = tramosVerdad[i]
      if (t >= tr.tInicio && t <= tr.tFin) {
        const dur = Math.max(1, tr.tFin - tr.tInicio)
        const prop = (t - tr.tInicio) / dur
        const totalTok = tr.tokenFin - tr.tokenInicio + 1
        return tr.tokenInicio + prop * totalTok
      }
      if (i < tramosVerdad.length - 1 && t > tr.tFin && t < tramosVerdad[i + 1].tInicio) {
        return tr.tokenFin
      }
    }
    return tramosVerdad[tramosVerdad.length - 1].tokenFin
  }

  for (let t = 0; t <= maxSimT + 3000; t += 50) {
    verdad.push({ t, token: obtenerTokenVerdadEn(t) })
  }

  return {
    eventos,
    verdad,
    salto: saltoDetec
  }
}
