export type ParametrosAvance = {
  correaPalabras: number        // 12
  msSilencioParaFrenar: number  // 600
  fallosParaFrenar: number      // 2
  ppmInicial: number            // 150  palabras por minuto, hasta medir
  suavizadoVelocidad: number    // 0.3  media movil exponencial
  msDeCorreccion: number        // 400  en cuanto se absorbe una correccion
}

export type EstadoAvance = {
  posicion: number            // en tokens, CON DECIMALES: es continua
  avanzando: boolean
  motivoFreno: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | null
  ppmEstimadas: number
}

export interface MotorDeAvance {
  confirmar(token: number, tMs: number): void   // el seguidor calzo
  tentativo(token: number, tMs: number): void   // vino de un parcial
  falloCalce(tMs: number): void                 // el seguidor no calzo
  voz(hayVoz: boolean, tMs: number): void       // del VAD o del motor
  estadoEn(tMs: number): EstadoAvance           // que mostrar AHORA
  reiniciar(): void
}

const DEFAULT_PARAMETROS: ParametrosAvance = {
  correaPalabras: 12,
  msSilencioParaFrenar: 600,
  fallosParaFrenar: 2,
  ppmInicial: 150,
  suavizadoVelocidad: 0.3,
  msDeCorreccion: 400
}

export function crearMotorDeAvance(
  p?: Partial<ParametrosAvance>,
  limitesDeLinea?: number[]
): MotorDeAvance {
  const params: ParametrosAvance = { ...DEFAULT_PARAMETROS, ...p }

  let ppmEstimadas = params.ppmInicial
  let ultimaConfirmada = 0
  let anclaTentativa = 0
  let tUltimaConfirmacion = 0
  let tUltimoTentativo = 0

  let fallosSeguidos = 0
  let hayVoz = false
  let tUltimaVozTrue = 0

  let posicionMostrada = 0
  let tUltimaActualizacion = 0

  let objetivoPosicion = 0
  let inicioGlidePosicion = 0
  let inicioGlideTiempo = 0
  let gliding = false

  function obtenerLimiteLineaActual(refToken: number): number {
    if (!limitesDeLinea || limitesDeLinea.length === 0) return Infinity
    for (const lim of limitesDeLinea) {
      if (lim >= refToken) return lim
    }
    return limitesDeLinea[limitesDeLinea.length - 1]
  }

  function actualizarVelocidad(tokensDelta: number, timeDeltaMs: number) {
    if (timeDeltaMs < 150 || tokensDelta <= 0) return
    const measuredPpm = (tokensDelta / timeDeltaMs) * 60000
    const clamped = Math.min(400, Math.max(40, measuredPpm))

    const alpha = clamped > ppmEstimadas ? 0.5 : 0.15
    ppmEstimadas = alpha * clamped + (1 - alpha) * ppmEstimadas
  }

  function ajustarPosicionTarget(token: number, tMs: number, esConfirmacion: boolean) {
    const refToken = Math.max(ultimaConfirmada, anclaTentativa)
    const limiteLinea = obtenerLimiteLineaActual(refToken)
    const maxPermitido = esConfirmacion
      ? Math.min(ultimaConfirmada + params.correaPalabras, limiteLinea)
      : Math.min(refToken, limiteLinea)
    const targetAcotado = Math.min(token, maxPermitido)
    const diff = token - posicionMostrada

    if (posicionMostrada === 0 && esConfirmacion) {
      posicionMostrada = targetAcotado
      objetivoPosicion = targetAcotado
      gliding = false
      return
    }

    if (diff > params.correaPalabras * 2) {
      posicionMostrada = targetAcotado
      objetivoPosicion = targetAcotado
      gliding = false
    } else if (targetAcotado > posicionMostrada) {
      if (!gliding || targetAcotado !== objetivoPosicion) {
        inicioGlidePosicion = posicionMostrada
        objetivoPosicion = targetAcotado
        inicioGlideTiempo = tMs
        gliding = true
      }
    }
  }

  return {
    confirmar(token: number, tMs: number) {
      hayVoz = true
      tUltimaVozTrue = tMs

      if (token > ultimaConfirmada) {
        if (tUltimaConfirmacion > 0) {
          actualizarVelocidad(token - ultimaConfirmada, tMs - tUltimaConfirmacion)
        } else if (tMs > 0) {
          actualizarVelocidad(token, tMs)
        }
      }

      ultimaConfirmada = Math.max(ultimaConfirmada, token)
      anclaTentativa = Math.max(anclaTentativa, token)
      tUltimaConfirmacion = tMs
      fallosSeguidos = 0

      ajustarPosicionTarget(token, tMs, true)
    },

    tentativo(token: number, tMs: number) {
      hayVoz = true
      tUltimaVozTrue = tMs

      const refToken = Math.max(ultimaConfirmada, anclaTentativa)
      const limiteLinea = obtenerLimiteLineaActual(refToken)
      const delta = token - anclaTentativa
      const maxPermitidoTentativo = delta <= params.correaPalabras
        ? limiteLinea
        : ultimaConfirmada + params.correaPalabras
      const tokenAcotado = Math.min(token, maxPermitidoTentativo)

      if (tokenAcotado > anclaTentativa) {
        const refTime = tUltimoTentativo > 0 ? tUltimoTentativo : tUltimaConfirmacion
        if (refTime > 0) {
          actualizarVelocidad(tokenAcotado - anclaTentativa, tMs - refTime)
        }
        anclaTentativa = tokenAcotado
        tUltimoTentativo = tMs
      }

      ajustarPosicionTarget(tokenAcotado, tMs, false)
    },

    falloCalce(tMs: number) {
      fallosSeguidos++
      hayVoz = true
      tUltimaVozTrue = tMs
    },

    voz(nuevaHayVoz: boolean, tMs: number) {
      hayVoz = nuevaHayVoz
      if (hayVoz) {
        tUltimaVozTrue = tMs
      }
    },

    estadoEn(tMs: number): EstadoAvance {
      if (tUltimaActualizacion === 0) {
        tUltimaActualizacion = tMs
      }

      const dt = Math.max(0, tMs - tUltimaActualizacion)
      tUltimaActualizacion = tMs

      const esSinCalce = fallosSeguidos >= params.fallosParaFrenar
      if (esSinCalce) {
        return {
          posicion: posicionMostrada,
          avanzando: false,
          motivoFreno: 'sin-calce',
          ppmEstimadas
        }
      }

      if (!hayVoz) {
        const esSilencio = (tMs - tUltimaVozTrue) > params.msSilencioParaFrenar
        return {
          posicion: posicionMostrada,
          avanzando: false,
          motivoFreno: esSilencio ? 'silencio' : null,
          ppmEstimadas
        }
      }

      const v = ppmEstimadas / 60000
      let nuevaPos = posicionMostrada + v * dt

      if (gliding) {
        const elapsed = tMs - inicioGlideTiempo
        const progress = Math.min(1, Math.max(0, elapsed / params.msDeCorreccion))
        const linearPos = inicioGlidePosicion + v * elapsed
        const targetEst = objetivoPosicion + v * elapsed
        nuevaPos = linearPos + progress * (targetEst - linearPos)
        if (progress >= 1) {
          gliding = false
        }
      }

      const limiteLinea = obtenerLimiteLineaActual(ultimaConfirmada)
      const maxCorrea = (limitesDeLinea && limitesDeLinea.length > 0)
        ? limiteLinea
        : (ultimaConfirmada + params.correaPalabras)

      let motivoFreno: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | null = null
      let avanzando = true

      if (limitesDeLinea && limitesDeLinea.length > 0 && nuevaPos >= limiteLinea) {
        nuevaPos = limiteLinea
        motivoFreno = 'fin-de-linea'
        avanzando = false
      } else if (nuevaPos >= maxCorrea) {
        nuevaPos = maxCorrea
        motivoFreno = 'correa'
        avanzando = false
      }

      nuevaPos = Math.max(posicionMostrada, nuevaPos)
      posicionMostrada = nuevaPos

      return {
        posicion: posicionMostrada,
        avanzando,
        motivoFreno,
        ppmEstimadas
      }
    },

    reiniciar() {
      ppmEstimadas = params.ppmInicial
      ultimaConfirmada = 0
      anclaTentativa = 0
      tUltimaConfirmacion = 0
      tUltimoTentativo = 0
      fallosSeguidos = 0
      hayVoz = false
      tUltimaVozTrue = 0
      posicionMostrada = 0
      tUltimaActualizacion = 0
      objetivoPosicion = 0
      inicioGlidePosicion = 0
      inicioGlideTiempo = 0
      gliding = false
    }
  }
}
