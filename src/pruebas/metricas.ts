import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'
import { crearSeguidor, tokenizarGuion } from '../lib/seguidor'
import { EventoLector } from './lectorSimulado'

export type Metricas = {
  retardoMedioPalabras: number
  retardoMaximoPalabras: number
  segundosDeRecuperacion: number   // tras un salto, hasta volver a acertar
  vecesQueRetrocedio: number
  segundosFrenadoIndebido: number  // frenado mientras el lector seguia leyendo
  segundosHastaFrenar: number      // tras callarse, cuanto tarda en detenerse
}

type IntervaloFrase = {
  tInicio: number
  tFin: number
  desdeToken: number
  hastaToken: number
}

export function medir(
  eventos: EventoLector[],
  guion: string,
  motorCustom?: MotorDeAvance
): Metricas {
  const tokens = tokenizarGuion(guion)
  const seguidorAux = crearSeguidor(tokens)
  const seguidor = crearSeguidor(tokens)
  const motor = motorCustom ?? crearMotorDeAvance()

  if (eventos.length === 0) {
    return {
      retardoMedioPalabras: 0,
      retardoMaximoPalabras: 0,
      segundosDeRecuperacion: 0,
      vecesQueRetrocedio: 0,
      segundosFrenadoIndebido: 0,
      segundosHastaFrenar: 0
    }
  }

  // Pre-procesar eventos para determinar intervalos reales de lectura en tokens del guion
  const intervalos: IntervaloFrase[] = []
  let tInicioActual = -1

  for (let i = 0; i < eventos.length; i++) {
    const ev = eventos[i]
    if (ev.tipo === 'voz' && ev.hayVoz) {
      if (tInicioActual < 0) tInicioActual = ev.t
    } else if (ev.tipo === 'final') {
      const pos = seguidorAux.avanzar(ev.texto)
      if (pos.movio) {
        intervalos.push({
          tInicio: tInicioActual >= 0 ? tInicioActual : ev.t - 1000,
          tFin: ev.t,
          desdeToken: pos.desdeToken,
          hastaToken: pos.hastaToken
        })
      }
      tInicioActual = -1
    }
  }

  function calcularPosReal(t: number): number {
    if (intervalos.length === 0) return 0
    if (t < intervalos[0].tInicio) return 0

    for (let i = 0; i < intervalos.length; i++) {
      const inter = intervalos[i]
      if (t >= inter.tInicio && t <= inter.tFin) {
        const dur = Math.max(1, inter.tFin - inter.tInicio)
        const prop = (t - inter.tInicio) / dur
        const totalTokens = inter.hastaToken - inter.desdeToken + 1
        return inter.desdeToken + prop * totalTokens
      }
      if (i < intervalos.length - 1 && t > inter.tFin && t < intervalos[i + 1].tInicio) {
        return inter.hastaToken
      }
    }
    return intervalos[intervalos.length - 1].hastaToken
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
  let tSaliodeVoz = -1
  let tiempoFrenadoIndebidoMs = 0
  let tiempoHastaFrenarMs = -1

  let sumRetardo = 0
  let countRetardo = 0
  let maxRetardo = 0

  let tSalto = -1
  let recuperadoMs = -1
  let posRealPrev = 0
  let hayVozActual = false

  for (let t = 0; t <= maxT + 3000; t += stepMs) {
    while (eventoIdx < eventos.length && eventos[eventoIdx].t <= t) {
      const ev = eventos[eventoIdx]
      if (ev.tipo === 'voz') {
        hayVozActual = ev.hayVoz
        motor.voz(ev.hayVoz, ev.t)
        if (!ev.hayVoz) {
          tSaliodeVoz = ev.t
        }
      } else if (ev.tipo === 'parcial') {
        hayVozActual = true
        const pos = seguidor.avanzarTentativo(ev.texto)
        if (pos.movio) {
          motor.tentativo(pos.hastaToken, ev.t)
        }
      } else if (ev.tipo === 'final') {
        hayVozActual = true
        const pos = seguidor.avanzar(ev.texto)
        if (pos.movio) {
          motor.confirmar(pos.hastaToken, ev.t)
        } else {
          motor.falloCalce(ev.t)
        }
      }
      eventoIdx++
    }

    const st = motor.estadoEn(t)
    const posReal = calcularPosReal(t)

    // Detectar salto del lector (> 5 tokens)
    if (posReal - posRealPrev > 5) {
      tSalto = t
      recuperadoMs = -1
    }
    posRealPrev = posReal

    const leyendo = t <= finLecturaT && t >= eventos[0].t

    if (leyendo) {
      const diff = Math.abs(posReal - st.posicion)
      sumRetardo += diff
      countRetardo++
      if (diff > maxRetardo) {
        maxRetardo = diff
      }

      if (hayVozActual && !st.avanzando) {
        tiempoFrenadoIndebidoMs += stepMs
      }
    }

    if (t >= finLecturaT && tSaliodeVoz >= 0 && tiempoHastaFrenarMs < 0) {
      if (!st.avanzando) {
        tiempoHastaFrenarMs = t - tSaliodeVoz
      }
    }

    if (tSalto >= 0 && recuperadoMs < 0) {
      if (Math.abs(posReal - st.posicion) <= 3) {
        recuperadoMs = t - tSalto
      }
    }

    if (t > 0 && st.posicion < prevPosMostrada - 0.0001) {
      vecesQueRetrocedio++
    }
    prevPosMostrada = st.posicion
  }

  const retardoMedioPalabras = countRetardo > 0 ? sumRetardo / countRetardo : 0
  const segundosHastaFrenar = tiempoHastaFrenarMs >= 0 ? tiempoHastaFrenarMs / 1000 : 0
  const segundosFrenadoIndebido = tiempoFrenadoIndebidoMs / 1000
  const segundosDeRecuperacion = recuperadoMs >= 0 ? recuperadoMs / 1000 : 0

  return {
    retardoMedioPalabras,
    retardoMaximoPalabras: maxRetardo,
    segundosDeRecuperacion,
    vecesQueRetrocedio,
    segundosFrenadoIndebido,
    segundosHastaFrenar
  }
}
