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
  motivoFreno: 'silencio' | 'sin-calce' | 'correa' | null
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

export function crearMotorDeAvance(p?: Partial<ParametrosAvance>): MotorDeAvance {
  const params: ParametrosAvance = { ...DEFAULT_PARAMETROS, ...p }

  let ppmEstimadas = params.ppmInicial
  let ultimaConfirmada = 0
  let tUltimaConfirmacion = 0
  let fallosSeguidos = 0
  let hayVoz = false
  let tUltimaVozTrue = 0

  let posicionMostrada = 0
  let tUltimaActualizacion = 0

  let objetivoPosicion = 0
  let inicioGlidePosicion = 0
  let inicioGlideTiempo = 0
  let gliding = false

  function ajustarPosicionTarget(token: number, tMs: number, esConfirmacion = false) {
    const maxPermitido = ultimaConfirmada + params.correaPalabras
    const targetAcotado = Math.min(token, maxPermitido)
    const diff = token - posicionMostrada

    if (posicionMostrada === 0 && esConfirmacion) {
      posicionMostrada = targetAcotado
      objetivoPosicion = targetAcotado
      gliding = false
      return
    }

    if (esConfirmacion && diff > params.correaPalabras * 2) {
      // Salto grande instantáneo en confirmación
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
        if (tUltimaConfirmacion > 0 && tMs > tUltimaConfirmacion) {
          const tokensDelta = token - ultimaConfirmada
          const timeDeltaMs = tMs - tUltimaConfirmacion
          if (timeDeltaMs > 0) {
            const measuredPpm = (tokensDelta / timeDeltaMs) * 60000
            ppmEstimadas = params.suavizadoVelocidad * measuredPpm + (1 - params.suavizadoVelocidad) * ppmEstimadas
          }
        } else if (tUltimaConfirmacion === 0 && tMs > 0) {
          const measuredPpm = (token / tMs) * 60000
          ppmEstimadas = measuredPpm
        }

        if (ppmEstimadas < 40 || ppmEstimadas > 400) {
          console.warn(`[MotorDeAvance] Velocidad estimada fuera de rango (${ppmEstimadas.toFixed(1)} ppm), acotando a 40-400 ppm`)
          ppmEstimadas = Math.min(400, Math.max(40, ppmEstimadas))
        }
      }

      ultimaConfirmada = Math.max(ultimaConfirmada, token)
      tUltimaConfirmacion = tMs
      fallosSeguidos = 0

      ajustarPosicionTarget(token, tMs, true)
    },

    tentativo(token: number, tMs: number) {
      hayVoz = true
      tUltimaVozTrue = tMs
      ajustarPosicionTarget(token, tMs, false)
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

      // Verificar freno por sin calce
      const esSinCalce = fallosSeguidos >= params.fallosParaFrenar
      if (esSinCalce) {
        return {
          posicion: posicionMostrada,
          avanzando: false,
          motivoFreno: 'sin-calce',
          ppmEstimadas
        }
      }

      // Si no hay voz, no avanzar más
      if (!hayVoz) {
        const esSilencio = (tMs - tUltimaVozTrue) > params.msSilencioParaFrenar
        return {
          posicion: posicionMostrada,
          avanzando: false,
          motivoFreno: esSilencio ? 'silencio' : null,
          ppmEstimadas
        }
      }

      // Avance lineal continuo durante la voz
      const v = ppmEstimadas / 60000 // tokens por milisegundo
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

      // Regla de correa: NUNCA supera ultimaConfirmada + correaPalabras
      const maxPermitido = ultimaConfirmada + params.correaPalabras
      let motivoFreno: 'silencio' | 'sin-calce' | 'correa' | null = null
      let avanzando = true

      if (nuevaPos >= maxPermitido) {
        nuevaPos = maxPermitido
        motivoFreno = 'correa'
        avanzando = false
      }

      // Regla f: NUNCA RETROCEDE
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
      tUltimaConfirmacion = 0
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
