import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'
import { crearSeguidor, tokenizarGuion } from '../lib/seguidor'
import { EventoLector } from './lectorSimulado'

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
      segundosDeRecuperacion: null,
      vecesQueRetrocedio: 0,
      segundosFrenadoIndebido: 0,
      segundosHastaFrenar: null,
      muestras: 0,
      confirmaciones: 0,
      tentativos: 0
    }
  }

  // Detectar salto configurado en la simulación
  let saltoDetec: { tSalto: number; tokenDestino: number } | null = null

  // Pre-procesar eventos para determinar intervalos reales de lectura en tokens del guion
  const intervalos: IntervaloFrase[] = []
  let tInicioActual = -1
  let tokenEsperadoPrev = -1

  for (let i = 0; i < eventos.length; i++) {
    const ev = eventos[i]
    if (ev.tipo === 'voz' && ev.hayVoz) {
      if (tInicioActual < 0) tInicioActual = ev.t
    } else if (ev.tipo === 'final') {
      const pos = seguidorAux.avanzar(ev.texto)
      if (pos.movio) {
        if (tokenEsperadoPrev >= 0 && pos.desdeToken - tokenEsperadoPrev > 5 && !saltoDetec) {
          saltoDetec = { tSalto: ev.t, tokenDestino: pos.hastaToken }
        }
        tokenEsperadoPrev = pos.hastaToken
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
  let tSaliodeVozAtEnd = -1
  let tiempoFrenadoIndebidoMs = 0

  let sumRetardo = 0
  let countRetardo = 0
  let maxRetardo = 0

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
    const posReal = calcularPosReal(t)

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

    if (tSaliodeVozAtEnd >= 0 && st.motivoFreno === 'silencio' && tiempoHastaFrenarMs < 0) {
      tiempoHastaFrenarMs = t - tSaliodeVozAtEnd
    }

    if (saltoDetec && t >= saltoDetec.tSalto && recuperadoMs < 0) {
      if (Math.abs(st.posicion - saltoDetec.tokenDestino) <= 3) {
        recuperadoMs = t - saltoDetec.tSalto
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

  return {
    retardoMedioPalabras,
    retardoMaximoPalabras: maxRetardo,
    segundosDeRecuperacion,
    vecesQueRetrocedio,
    segundosFrenadoIndebido,
    segundosHastaFrenar,
    muestras: countMuestras,
    confirmaciones: countConfirmaciones,
    tentativos: countTentativos
  }
}
