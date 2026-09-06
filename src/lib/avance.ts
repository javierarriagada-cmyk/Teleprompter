export type ParametrosAvance = {
  correaPalabras: number        // 12
  msSilencioParaFrenar: number  // 600
  fallosParaFrenar: number      // 2
  ppmInicial: number            // 150  palabras por minuto, hasta medir
  suavizadoVelocidad: number    // 0.3  media movil exponencial
  msDeCorreccion: number        // 400  en cuanto se absorbe una correccion
  anticipacionPalabras: number  // 3
  msTransicion: number          // 600
  msSinCalceParaFrenar: number  // 6000  hablando sin calzar nada
  adelantoComodo: number        // 6   tokens de adelanto sin ningun freno
  adelantoMaximo: number        // 15  aqui la velocidad ya es cero
}

export type EstadoAvance = {
  posicion: number            // en tokens, CON DECIMALES: es continua
  avanzando: boolean
  motivoFreno: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null
  ppmEstimadas: number
}

export interface MotorDeAvance {
  confirmar(token: number, tMs: number): void   // el seguidor calzo
  tentativo(token: number, tMs: number): void   // vino de un parcial
  falloCalce(tMs: number, esParcial?: boolean): void  // el seguidor no calzo
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
  msDeCorreccion: 400,
  anticipacionPalabras: 3,
  msTransicion: 600,
  msSinCalceParaFrenar: 6000,
  adelantoComodo: 6,
  adelantoMaximo: 15
}

export function crearMotorDeAvance(
  p?: Partial<ParametrosAvance>,
  limitesDeLinea?: number[],
  limitesDeBloque?: number[]
): MotorDeAvance {
  const params: ParametrosAvance = { ...DEFAULT_PARAMETROS, ...p }

  let ppmEstimadas = params.ppmInicial
  let ultimaConfirmada = 0
  let anclaTentativa = 0
  let tUltimaConfirmacion = 0
  let tUltimoTentativo = 0

  let fallosFinalesSeguidos = 0
  let tUltimoCalce = 0
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

  function obtenerLimiteLineaSiguiente(refToken: number): number {
    if (!limitesDeLinea || limitesDeLinea.length === 0) return Infinity
    for (let i = 0; i < limitesDeLinea.length; i++) {
      if (limitesDeLinea[i] >= refToken) {
        return i + 1 < limitesDeLinea.length ? limitesDeLinea[i + 1] : limitesDeLinea[i]
      }
    }
    return limitesDeLinea[limitesDeLinea.length - 1]
  }

  function obtenerLimiteBloqueActual(refToken: number): number {
    if (!limitesDeBloque || limitesDeBloque.length === 0) return Infinity
    for (const lim of limitesDeBloque) {
      if (lim >= refToken) return lim
    }
    return limitesDeBloque[limitesDeBloque.length - 1]
  }

  function actualizarVelocidad(tokensDelta: number, timeDeltaMs: number) {
    if (timeDeltaMs < 150 || tokensDelta <= 0) return
    const measuredPpm = (tokensDelta / timeDeltaMs) * 60000
    const clamped = Math.min(400, Math.max(40, measuredPpm))

    const alpha = clamped > ppmEstimadas ? 0.5 : 0.15
    ppmEstimadas = alpha * clamped + (1 - alpha) * ppmEstimadas
  }

  function ajustarPosicionTarget(token: number, tMs: number, esConfirmacion: boolean) {
    // El destino es la palabra que el seguidor calzo. No se recorta contra el fin de la
    // linea ni del bloque: ese recorte hacia que el destino del deslizamiento se quedara
    // clavado en el final del renglon o del parrafo, y el texto no se movia hasta que
    // llegaba un final que corriera el limite. Era la tercera copia de la misma regla,
    // despues de la de estadoEn y la de useSeguidor.
    //
    // Lo que impide que el prompter se vaya solo es el freno por falta de calce y el
    // freno por adelanto sobre el ultimo calce, los dos en estadoEn.
    const targetAcotado = token
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
      fallosFinalesSeguidos = 0
      tUltimoCalce = tMs

      ajustarPosicionTarget(token, tMs, true)
    },

    tentativo(token: number, tMs: number) {
      hayVoz = true
      tUltimaVozTrue = tMs

      const tokenAcotado = token

      if (tokenAcotado > anclaTentativa) {
        const refTime = tUltimoTentativo > 0 ? tUltimoTentativo : tUltimaConfirmacion
        if (refTime > 0) {
          actualizarVelocidad(tokenAcotado - anclaTentativa, tMs - refTime)
        }
        anclaTentativa = tokenAcotado
        tUltimoTentativo = tMs
      }

      // Un parcial que SI calzo dice que el lector esta en el guion. Sin esto, leyendo de
      // corrido -donde llegan parciales y casi ningun final- nada limpiaba el estado de
      // fallo y el motor terminaba frenando por sin-calce en medio de una lectura buena.
      tUltimoCalce = tMs
      fallosFinalesSeguidos = 0

      ajustarPosicionTarget(tokenAcotado, tMs, false)
    },

    falloCalce(tMs: number, esParcial?: boolean) {
      // Un final que no calza es evidencia fuerte y se cuenta. Un parcial que no calza no
      // se cuenta: el reconocedor entrega texto provisional y se corrige solo, asi que
      // fallar es normal aun leyendo bien. Lo que si importa de un parcial fallido es que
      // NO actualiza tUltimoCalce, y de ese silencio se encarga msSinCalceParaFrenar.
      if (!esParcial) fallosFinalesSeguidos++
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

      const hablandoSinCalzar =
        hayVoz && tUltimoCalce > 0 && tMs - tUltimoCalce > params.msSinCalceParaFrenar

      const esSinCalce =
        fallosFinalesSeguidos >= params.fallosParaFrenar || hablandoSinCalzar
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

      const refToken = Math.max(ultimaConfirmada, anclaTentativa)
      const distAdelanto = Math.max(0, posicionMostrada - refToken)
      const comodo = params.adelantoComodo
      const maximo = Math.max(comodo + 1, params.adelantoMaximo)
      const factorFreno = distAdelanto <= comodo
        ? 1
        : Math.max(0, 1 - (distAdelanto - comodo) / (maximo - comodo))

      let v = (ppmEstimadas / 60000) * factorFreno
      let nuevaPos = posicionMostrada + v * dt

      if (gliding) {
        const duracion = Math.max(1, params.msTransicion || params.msDeCorreccion)
        const elapsed = tMs - inicioGlideTiempo
        const progress = Math.min(1, Math.max(0, elapsed / duracion))
        const linearPos = inicioGlidePosicion + v * elapsed
        const targetEst = objetivoPosicion + v * elapsed
        const conDeslizamiento = linearPos + progress * (targetEst - linearPos)
        nuevaPos = Math.max(nuevaPos, conDeslizamiento)
        if (progress >= 1) {
          gliding = false
        }
      }

      let maxTokenGuion = Infinity
      if (limitesDeBloque && limitesDeBloque.length > 0) {
        maxTokenGuion = limitesDeBloque[limitesDeBloque.length - 1]
      } else if (limitesDeLinea && limitesDeLinea.length > 0) {
        maxTokenGuion = limitesDeLinea[limitesDeLinea.length - 1]
      }

      nuevaPos = Math.min(maxTokenGuion, Math.max(posicionMostrada, nuevaPos))
      posicionMostrada = nuevaPos

      return {
        posicion: posicionMostrada,
        avanzando: true,
        motivoFreno: null,
        ppmEstimadas
      }
    },

    reiniciar() {
      ppmEstimadas = params.ppmInicial
      ultimaConfirmada = 0
      anclaTentativa = 0
      tUltimaConfirmacion = 0
      tUltimoTentativo = 0
      fallosFinalesSeguidos = 0
      tUltimoCalce = 0
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
