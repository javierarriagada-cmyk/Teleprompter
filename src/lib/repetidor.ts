import { tokenizarGuion } from './seguidor'
import { crearSeguidor } from './seguidor'
import { crearMotorDeAvance } from './avance'
import { Conduccion, procesarFinal, procesarParcial } from './conduccion'

export type EventoCorpus =
  | { ms: number; tipo: 'oyo'; texto: string; final: boolean }
  | { ms: number; tipo: 'cuadro'; posicion: number; calce: number }

export type Corpus = {
  guion: string          // el guion, reconstruido de la cabecera
  motor: string
  eventos: EventoCorpus[]
}

export type ResultadoRepeticion = {
  ubicados: number          // cuantos 'oyo' el seguidor logro ubicar
  totalOyo: number
  porcentajeUbicados: number
  adelantoMaximo: number    // max(posicion mostrada - ultimo calce)
  adelantoMedio: number
  cuadrosQuietos: number    // cuadros sin movimiento habiendo voz
  totalCuadros: number
  cambioVelocidadMaximo: number   // el tiron mas grande, en veces el ritmo base
  serie: Array<{ ms: number; pos: number; calce: number; estado: string }>
}

export function leerCorpus(texto: string): Corpus {
  const lineas = texto.split(/\r?\n/)
  let guionLineas: string[] = []
  let motor = ''
  let enGuion = false

  const eventos: EventoCorpus[] = []

  for (const line of lineas) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# motor de voz:')) {
      motor = trimmed.replace('# motor de voz:', '').trim()
    }

    if (line.includes('---------- GUION, TAL CUAL SE LEYO ----------')) {
      enGuion = true
      continue
    }

    if (enGuion) {
      if (line.startsWith('# ---') || line.startsWith('#---')) {
        enGuion = false
        continue
      }
      if (line.startsWith('# | ')) {
        guionLineas.push(line.slice(4))
        continue
      } else if (line.startsWith('# |')) {
        guionLineas.push(line.slice(3))
        continue
      }
    }

    if (!line.startsWith('#') && line.includes('\t')) {
      const partes = line.split('\t')
      if (partes.length >= 3) {
        const ms = parseInt(partes[0].trim(), 10)
        const tipo = partes[1].trim()
        const detalle = partes[2].trim()

        if (tipo === 'oyo') {
          const isFinal = detalle.startsWith('FINAL:')
          const txt = isFinal ? detalle.slice(6).trim() : (detalle.startsWith('parcial:') ? detalle.slice(8).trim() : detalle)
          eventos.push({
            ms,
            tipo: 'oyo',
            texto: txt,
            final: isFinal
          })
        } else if (tipo === 'cuadro') {
          // pos=12.50 calce=12 scroll=340 freno=-
          let pos = 0
          let calce = 0
          const posMatch = detalle.match(/pos=([\d.]+)/)
          if (posMatch) pos = parseFloat(posMatch[1])
          const calceMatch = detalle.match(/calce=(\d+)/)
          if (calceMatch) calce = parseInt(calceMatch[1], 10)

          eventos.push({
            ms,
            tipo: 'cuadro',
            posicion: pos,
            calce
          })
        }
      }
    }
  }

  return {
    guion: guionLineas.join('\n'),
    motor,
    eventos
  }
}

export function repetirLectura(corpus: Corpus): ResultadoRepeticion {
  const tokens = tokenizarGuion(corpus.guion)

  const limitesLineaMap = new Map<string, number>()
  const limitesBloqueMap = new Map<number, number>()
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    limitesLineaMap.set(`${t.bloque}-${t.linea}`, i)
    limitesBloqueMap.set(t.bloque, i)
  }
  const limitesDeLinea = Array.from(limitesLineaMap.values()).sort((a, b) => a - b)
  const limitesDeBloque = Array.from(limitesBloqueMap.values()).sort((a, b) => a - b)

  const motor = crearMotorDeAvance(undefined, limitesDeLinea, limitesDeBloque)
  const seguidor = crearSeguidor(tokens)
  const cond: Conduccion = { seguidor, motor, tokens, limitesDeLinea }

  const eventosOyo = corpus.eventos.filter((e): e is Extract<EventoCorpus, { tipo: 'oyo' }> => e.tipo === 'oyo')
  const maxMs = corpus.eventos.length > 0 ? Math.max(...corpus.eventos.map((e) => e.ms)) : 0

  let ubicados = 0
  let totalOyo = eventosOyo.length
  let eventoIdx = 0

  let maxAdelanto = 0
  let sumAdelanto = 0
  let countAdelanto = 0

  let cuadrosQuietos = 0
  let totalCuadros = 0

  let prevPos = 0
  let prevVRel = 0
  let maxCambioVelocidad = 0

  const serie: ResultadoRepeticion['serie'] = []
  const stepMs = 16

  for (let t = 0; t <= maxMs; t += stepMs) {
    while (eventoIdx < eventosOyo.length && eventosOyo[eventoIdx].ms <= t) {
      const ev = eventosOyo[eventoIdx]
      const res = ev.final ? procesarFinal(cond, ev.texto, ev.ms) : procesarParcial(cond, ev.texto, ev.ms)
      if (res !== null) {
        ubicados++
      }
      eventoIdx++
    }

    const st = motor.estadoEn(t)
    const dtSec = stepMs / 1000
    const vActualSec = (st.posicion - prevPos) / dtSec
    const vBaseSec = st.ppmEstimadas / 60
    const vRel = vBaseSec > 0 ? vActualSec / vBaseSec : 0

    if (t > 0) {
      const diffV = Math.abs(vRel - prevVRel)
      if (diffV > maxCambioVelocidad) {
        maxCambioVelocidad = diffV
      }
    }
    prevVRel = vRel

    const adelanto = Math.max(0, st.posicion - st.ultimoCalce)
    if (adelanto > maxAdelanto) {
      maxAdelanto = adelanto
    }
    sumAdelanto += adelanto
    countAdelanto++

    // Cuadros quieto habiendo voz: si hay voz / no detenido
    if (st.estado !== 'DETENIDO' || st.avanzando) {
      totalCuadros++
      if (Math.abs(st.posicion - prevPos) < 0.00001) {
        cuadrosQuietos++
      }
    }
    prevPos = st.posicion

    serie.push({
      ms: t,
      pos: st.posicion,
      calce: st.ultimoCalce,
      estado: st.estado
    })
  }

  const porcentajeUbicados = totalOyo > 0 ? (ubicados / totalOyo) * 100 : 0
  const adelantoMedio = countAdelanto > 0 ? sumAdelanto / countAdelanto : 0

  return {
    ubicados,
    totalOyo,
    porcentajeUbicados,
    adelantoMaximo: maxAdelanto,
    adelantoMedio,
    cuadrosQuietos,
    totalCuadros,
    cambioVelocidadMaximo: maxCambioVelocidad,
    serie
  }
}
