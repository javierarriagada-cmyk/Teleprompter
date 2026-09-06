import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'
import { crearSeguidor, tokenizarGuion } from '../lib/seguidor'
import { ResultadoSimulacion } from './lectorSimulado'

export type Metricas = {
  retardoMedioPalabras: number
  retardoMaximoPalabras: number
  segundosDeRecuperacion: number | null   // null = NUNCA se recuperó
  vecesQueRetrocedio: number
  segundosFrenadoIndebido: number          // siempre medible
  segundosHastaFrenar: number | null      // null = NUNCA frenó
  muestras: number                        // cuántas muestras de 50 ms se tomaron
  confirmaciones: number                  // cuántos finales movieron
  tentativos: number                      // cuántos parciales se procesaron
  retardoMedioAtras: number               // posReal - posMostrada > 0
  retardoMaximoAtras: number
  adelantoMedio: number                   // posReal - posMostrada < 0 (magnitud positiva)
  adelantoMaximo: number
}

export function medir(
  sim: ResultadoSimulacion,
  guion: string,
  motorCustom?: MotorDeAvance
): Metricas {
  const { eventos, verdad, salto } = sim
  const tokens = tokenizarGuion(guion)
  const seguidor = crearSeguidor(tokens)

  const limitesMap = new Map<number, number>()
  for (let i = 0; i < tokens.length; i++) {
    limitesMap.set(tokens[i].linea, i)
  }
  const limitesDeLinea = Array.from(limitesMap.values()).sort((a, b) => a - b)

  const motor = motorCustom ?? crearMotorDeAvance(undefined, limitesDeLinea)

  if (eventos.length === 0 || verdad.length === 0) {
    return {
      retardoMedioPalabras: 0,
      retardoMaximoPalabras: 0,
      segundosDeRecuperacion: null,
      vecesQueRetrocedio: 0,
      segundosFrenadoIndebido: 0,
      segundosHastaFrenar: null,
      muestras: 0,
      confirmaciones: 0,
      tentativos: 0,
      retardoMedioAtras: 0,
      retardoMaximoAtras: 0,
      adelantoMedio: 0,
      adelantoMaximo: 0
    }
  }

  function obtenerPosReal(t: number): number {
    if (verdad.length === 0) return 0
    if (t <= verdad[0].t) return verdad[0].token

    for (let i = 0; i < verdad.length; i++) {
      if (verdad[i].t >= t) {
        if (i === 0) return verdad[0].token
        const p1 = verdad[i - 1]
        const p2 = verdad[i]
        const dur = Math.max(1, p2.t - p1.t)
        const prop = (t - p1.t) / dur
        return p1.token + prop * (p2.token - p1.token)
      }
    }
    return verdad[verdad.length - 1].token
  }

  const maxT = Math.max(...eventos.map((e) => e.t))
  const stepMs = 50

  let finLecturaT = -1
  for (let i = eventos.length - 1; i >= 0; i--) {
    const ev = eventos[i]
    if (ev.tipo === 'voz' && !ev.hayVoz) {
      finLecturaT = ev.t
      break
    }
  }
  if (finLecturaT < 0) finLecturaT = maxT

  let eventoIdx = 0
  let prevPosMostrada = 0
  let vecesQueRetrocedio = 0
  let tSaliodeVozAtEnd = -1
  let tiempoFrenadoIndebidoMs = 0

  let sumRetardo = 0
  let countRetardo = 0
  let maxRetardo = 0

  let sumAtras = 0
  let countAtras = 0
  let maxAtras = 0

  let sumAdelanto = 0
  let countAdelanto = 0
  let maxAdelanto = 0

  let recuperadoMs = -1
  let hayVozActual = false

  let countMuestras = 0
  let countConfirmaciones = 0
  let countTentativos = 0
  let tiempoHastaFrenarMs = -1

  for (let t = 0; t <= maxT + 3000; t += stepMs) {
    countMuestras++

    while (eventoIdx < eventos.length && eventos[eventoIdx].t <= t) {
      const ev = eventos[eventoIdx]
      if (ev.tipo === 'voz') {
        hayVozActual = ev.hayVoz
        motor.voz(ev.hayVoz, ev.t)
        if (!ev.hayVoz && ev.t >= finLecturaT - 50) {
          tSaliodeVozAtEnd = ev.t
        }
      } else if (ev.tipo === 'parcial') {
        hayVozActual = true
        const pos = seguidor.avanzarTentativo(ev.texto)
        if (pos.movio) {
          countTentativos++
          motor.tentativo(pos.hastaToken, ev.t)
        } else {
          // Igual que useSeguidor.ts:95. Si el arnes no conduce el motor como lo conduce
          // la aplicacion, mide un camino que en la practica no ocurre.
          motor.falloCalce(ev.t, true)
        }
      } else if (ev.tipo === 'final') {
        hayVozActual = true
        const pos = seguidor.avanzar(ev.texto)
        if (pos.movio) {
          countConfirmaciones++
          motor.confirmar(pos.hastaToken, ev.t)
        } else {
          motor.falloCalce(ev.t)
        }
      }
      eventoIdx++
    }

    const st = motor.estadoEn(t)
    const posReal = obtenerPosReal(t)

    const leyendo = t <= finLecturaT && t >= eventos[0].t

    if (leyendo) {
      const diffAbs = Math.abs(posReal - st.posicion)
      sumRetardo += diffAbs
      countRetardo++
      if (diffAbs > maxRetardo) {
        maxRetardo = diffAbs
      }

      const diffConSigno = posReal - st.posicion
      if (diffConSigno > 0) {
        sumAtras += diffConSigno
        countAtras++
        if (diffConSigno > maxAtras) {
          maxAtras = diffConSigno
        }
      } else if (diffConSigno < 0) {
        const magAdelanto = -diffConSigno
        sumAdelanto += magAdelanto
        countAdelanto++
        if (magAdelanto > maxAdelanto) {
          maxAdelanto = magAdelanto
        }
      }

      if (hayVozActual && !st.avanzando && st.motivoFreno !== 'correa' && st.motivoFreno !== 'fin-de-linea') {
        tiempoFrenadoIndebidoMs += stepMs
      }
    }

    if (tSaliodeVozAtEnd >= 0 && st.motivoFreno === 'silencio' && tiempoHastaFrenarMs < 0) {
      tiempoHastaFrenarMs = t - tSaliodeVozAtEnd
    }

    if (salto && t > salto.tMs + 100 && recuperadoMs < 0) {
      if (Math.abs(st.posicion - posReal) <= 12) {
        recuperadoMs = t - salto.tMs
      }
    }

    if (t > 0 && st.posicion < prevPosMostrada - 0.0001) {
      vecesQueRetrocedio++
    }
    prevPosMostrada = st.posicion
  }

  const retardoMedioPalabras = countRetardo > 0 ? sumRetardo / countRetardo : 0
  const segundosHastaFrenar = tiempoHastaFrenarMs >= 0 ? tiempoHastaFrenarMs / 1000 : null
  const segundosFrenadoIndebido = tiempoFrenadoIndebidoMs / 1000
  const segundosDeRecuperacion = recuperadoMs >= 0 ? recuperadoMs / 1000 : null

  const retardoMedioAtras = countAtras > 0 ? sumAtras / countAtras : 0
  const adelantoMedio = countAdelanto > 0 ? sumAdelanto / countAdelanto : 0

  return {
    retardoMedioPalabras,
    retardoMaximoPalabras: maxRetardo,
    segundosDeRecuperacion,
    vecesQueRetrocedio,
    segundosFrenadoIndebido,
    segundosHastaFrenar,
    muestras: countMuestras,
    confirmaciones: countConfirmaciones,
    tentativos: countTentativos,
    retardoMedioAtras,
    retardoMaximoAtras: maxAtras,
    adelantoMedio,
    adelantoMaximo: maxAdelanto
  }
}
