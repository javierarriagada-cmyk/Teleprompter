import { tokenizarGuion } from './seguidor'
import { crearSeguidor } from './seguidor'
import { crearMotorDeAvance } from './avance'
import { Conduccion, procesarFinal, procesarParcial } from './conduccion'
import { detectarIdioma } from './detectarIdioma'

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
  // -13-10-2026, banco del motor-: freno es st.motivoFreno, solo anotado -la vista lo usa para
  // decidir si compensa el renglon vivo y el banco lo necesita para simularlo-. No cambia nada.
  // Antes: serie: Array<{ ms: number; pos: number; calce: number; estado: string }>
  // -correccion-: aMano marca el cuadro donde se aplico un arrastre deducido -comoElTelefono-.
  // Antes: serie: Array<{ ms: number; pos: number; calce: number; estado: string; freno: string | null }>
  serie: Array<{ ms: number; pos: number; calce: number; estado: string; freno: string | null; aMano?: boolean }>
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

// REPETIR COMO EL TELEFONO -13-10-2026, banco del motor-. Sin opciones, repetirLectura hace lo de
// siempre -reloj propio de 16 ms, los 'oyo' en el paso siguiente-, y lo que miran las pruebas no
// cambia. Con comoElTelefono reproduce lo que el telefono hizo en esa toma, sin tocar el motor:
//
//   - EL RELOJ ES EL DE LOS 'cuadro' DEL REGISTRO, y cada 'oyo' entra en su milisegundo. Con 16 ms
//     fijos cada calce llegaba hasta 16 ms tarde.
//   - LA PASTILLA DEL TIEMPO -components/BarraDeTiempo.tsx- TAMBIEN LLAMA A estadoEn, con una hora
//     que refresca cada 250 ms -setAhora(performance.now())- y que en cada redibujo intermedio va
//     ATRASADA: la vista se redibuja con cada calce -setPosicion de useSeguidor-. estadoEn hace
//     dt = max(0, tMs - tUltimaActualizacion) y deja tUltimaActualizacion en esa hora vieja, asi que
//     el cuadro siguiente vuelve a integrar ese tramo. Medido en las 28 tomas en espanol: sin esto
//     la repeticion iba 0,4 palabras detras del telefono en TODAS; con esto, 0,0 a 0,2. Se asume la
//     pastilla visible -"Mostrar tiempo"-: el registro no lo dice, y las cifras calzan con ella.
//   - EL IDIOMA DEL SEGUIDOR, como useSeguidor: crearSeguidor(tokens, { idioma }). El registro no
//     lo trae; se saca del guion con detectarIdioma.
//   - DONDE EMPEZO DE VERDAD Y LOS ARRASTRES A MANO. Si el primer 'cuadro' no esta en 0 -la toma
//     heredo la posicion de la anterior- o si la posicion salta mas de SALTO_A_MANO palabras de
//     un cuadro al siguiente -el motor no salta: eso es el texto movido con el dedo-, se pone el
//     seguidor y el motor en el calce de ese cuadro con irAToken, como useSeguidor.irAToken.
//     Los registros de antes de la tarea 89 no anotan esos movimientos; por eso se deducen.
export type OpcionesRepeticion = { comoElTelefono?: boolean }
export const MS_RELOJ_PASTILLA = 250
export const SALTO_A_MANO = 3

export function repetirLectura(corpus: Corpus, opciones: OpcionesRepeticion = {}): ResultadoRepeticion {
  const comoTelefono = opciones.comoElTelefono === true
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
  // Antes: const seguidor = crearSeguidor(tokens)
  const idioma = comoTelefono ? detectarIdioma(corpus.guion) ?? undefined : undefined
  const seguidor = crearSeguidor(tokens, idioma ? { idioma } : {})
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

  // Los pasos del reloj: cada 16 ms, o -como el telefono- los 'cuadro' del registro.
  // Antes: for (let t = 0; t <= maxMs + stepMs; t += stepMs) {
  const cuadrosTel = corpus.eventos.filter((e): e is Extract<EventoCorpus, { tipo: 'cuadro' }> => e.tipo === 'cuadro')
  const pasos: number[] = []
  if (comoTelefono && cuadrosTel.length > 0) for (const c of cuadrosTel) pasos.push(c.ms)
  else for (let t = 0; t <= maxMs + stepMs; t += stepMs) pasos.push(t)

  // La hora de la pastilla del tiempo -ver arriba-.
  let horaPastilla = pasos.length > 0 ? pasos[0] : 0
  let proximaPastilla = horaPastilla + MS_RELOJ_PASTILLA
  const avanzarPastilla = (hasta: number) => {
    while (proximaPastilla <= hasta) {
      horaPastilla = proximaPastilla
      motor.estadoEn(horaPastilla)
      proximaPastilla += MS_RELOJ_PASTILLA
    }
  }
  const aMano = (token: number, tMs: number) => {
    seguidor.irAToken(token)
    motor.irAToken(token, tMs)
  }
  if (comoTelefono && cuadrosTel.length > 0 && cuadrosTel[0].calce > 0) aMano(cuadrosTel[0].calce, cuadrosTel[0].ms)

  let tPrevio = pasos.length > 0 ? pasos[0] - stepMs : 0
  for (let k = 0; k < pasos.length; k++) {
    const t = pasos[k]
    let movidoAMano = false
    if (comoTelefono && k > 0 && Math.abs(cuadrosTel[k].posicion - cuadrosTel[k - 1].posicion) > SALTO_A_MANO) {
      aMano(cuadrosTel[k].calce, t)
      movidoAMano = true
    }
    while (eventoIdx < eventosOyo.length && eventosOyo[eventoIdx].ms <= t) {
      const ev = eventosOyo[eventoIdx]
      // Antes: const res = ev.final ? procesarFinal(cond, ev.texto, t) : procesarParcial(cond, ev.texto, t)
      const tEv = comoTelefono ? ev.ms : t
      if (comoTelefono) avanzarPastilla(tEv)
      const res = ev.final ? procesarFinal(cond, ev.texto, tEv) : procesarParcial(cond, ev.texto, tEv)
      if (res !== null) {
        ubicados++
        // El redibujo por setPosicion: la pastilla vuelve a preguntar con su hora atrasada.
        if (comoTelefono) motor.estadoEn(horaPastilla)
      }
      eventoIdx++
    }
    if (comoTelefono) avanzarPastilla(t)

    const st = motor.estadoEn(t)
    // Antes: const dtSec = stepMs / 1000
    const dtSec = Math.max(1, t - tPrevio) / 1000
    tPrevio = t
    const vActualSec = (st.posicion - prevPos) / dtSec
    const vBaseSec = st.ppmEstimadas / 60
    const vRel = vBaseSec > 0 ? vActualSec / vBaseSec : 0

    // Antes: if (t > 0) {
    if (k > 0) {
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
      estado: st.estado,
      freno: st.motivoFreno,
      ...(movidoAMano ? { aMano: true } : {})
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
