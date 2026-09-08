// Siete palabras. Lo pidio Javier el 6 de septiembre de 2026 leyendo a camara.
// NO reemplazar por una derivacion de renglones, tamano de letra ni ancho de
// columna: ya se hizo una vez y se desfondó al cambiar la tipografia.
export const PALABRAS_PARA_ARRANCAR = 7

export type EstadoModo = 'SIGUIENDO' | 'BUSCANDO' | 'DETENIDO'

export type ParametrosAvance = {
  correaPalabras: number        // 12
  msSilencioParaFrenar: number  // 600
  fallosParaFrenar: number      // 2
  ppmInicial: number            // 150  palabras por minuto, hasta medir
  suavizadoVelocidad: number    // 0.3  media movil exponencial
  msVentanaVelocidad: number    // 3000 ventana de tiempo real
  msDeBusquedaCiega: number     // 2500 hablando sin calzar (desacelerando)
  anticipacionPalabras: number  // 3
  msSinCalceParaFrenar: number  // 2500
  adelantoComodo: number        // 1   tokens de adelanto sin ningun freno
  adelantoMaximo: number        // 3   aqui la velocidad ya es cero
}

export type EstadoAvance = {
  posicion: number            // en tokens, CON DECIMALES: es continua
  avanzando: boolean
  estado: EstadoModo
  motivoFreno: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null
  ppmEstimadas: number
  ultimoCalce: number   // ultima palabra que el seguidor confirmo o dio por tentativa
  tUltimoCalceMs: number // marca de tiempo ms de la ultima confirmacion/tentativo
}

export interface MotorDeAvance {
  confirmar(token: number, tMs: number): void   // el seguidor calzo
  tentativo(token: number, tMs: number): void   // vino de un parcial
  falloCalce(tMs: number, esParcial?: boolean): void  // el seguidor no calzo
  voz(hayVoz: boolean, tMs: number): void       // del VAD o del motor
  estadoEn(tMs: number): EstadoAvance           // que mostrar AHORA
  irAToken(token: number, tMs: number): void    // el usuario movio el texto a mano
  reiniciar(): void
}

const DEFAULT_PARAMETROS: ParametrosAvance = {
  correaPalabras: 12,
  msSilencioParaFrenar: 600,
  fallosParaFrenar: 2,
  ppmInicial: 150,
  suavizadoVelocidad: 0.3,
  msVentanaVelocidad: 3000,
  msDeBusquedaCiega: 2500,
  anticipacionPalabras: 3,
  msSinCalceParaFrenar: 2500,
  adelantoComodo: 1,
  adelantoMaximo: 3
}

export function crearMotorDeAvance(
  p?: Partial<ParametrosAvance>,
  limitesDeLinea?: number[],
  limitesDeBloque?: number[]
): MotorDeAvance {
  const params: ParametrosAvance = { ...DEFAULT_PARAMETROS, ...p }

  let ppmEstimadas = params.ppmInicial
  let muestrasVelocidad: Array<{ tMs: number; token: number }> = []
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

  let palabrasConfirmadasDesdeArranque = 0
  let arranqueCumplido = false

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

  function actualizarVelocidad(token: number, tMs: number) {
    muestrasVelocidad.push({ tMs, token })
    const limiteTiempo = tMs - params.msVentanaVelocidad
    muestrasVelocidad = muestrasVelocidad.filter((m) => m.tMs >= limiteTiempo)

    if (muestrasVelocidad.length < 2) return

    const masViejo = muestrasVelocidad[0]
    const masNuevo = muestrasVelocidad[muestrasVelocidad.length - 1]
    const dt = masNuevo.tMs - masViejo.tMs
    const dToken = masNuevo.token - masViejo.token

    if (dt < 1500 || dToken <= 0) return

    const measuredPpm = (dToken / dt) * 60000
    const clamped = Math.min(400, Math.max(40, measuredPpm))

    const alpha = params.suavizadoVelocidad
    ppmEstimadas = alpha * clamped + (1 - alpha) * ppmEstimadas
  }

  function registrarAvanceArranque(tokenActual: number, tokenPrevio: number) {
    if (!arranqueCumplido) {
      const delta = (tokenPrevio === 0 && tokenActual >= 0 && palabrasConfirmadasDesdeArranque === 0)
        ? tokenActual + 1
        : Math.max(1, tokenActual - tokenPrevio)
      palabrasConfirmadasDesdeArranque += delta
      if (palabrasConfirmadasDesdeArranque >= PALABRAS_PARA_ARRANCAR) {
        arranqueCumplido = true
      }
    }
  }

  return {
    confirmar(token: number, tMs: number) {
      hayVoz = true
      tUltimaVozTrue = tMs
      if (tUltimaActualizacion === 0) {
        tUltimaActualizacion = tMs
      }

      if (token > ultimaConfirmada) {
        actualizarVelocidad(token, tMs)
      }
      registrarAvanceArranque(token, ultimaConfirmada)

      ultimaConfirmada = Math.max(ultimaConfirmada, token)
      anclaTentativa = Math.max(anclaTentativa, token)
      tUltimaConfirmacion = tMs
      fallosFinalesSeguidos = 0
      tUltimoCalce = tMs
    },

    tentativo(token: number, tMs: number) {
      hayVoz = true
      tUltimaVozTrue = tMs
      if (tUltimaActualizacion === 0) {
        tUltimaActualizacion = tMs
      }

      if (token > anclaTentativa) {
        actualizarVelocidad(token, tMs)
        anclaTentativa = token
        tUltimoTentativo = tMs
      }
      registrarAvanceArranque(token, anclaTentativa)

      tUltimoCalce = tMs
      fallosFinalesSeguidos = 0
    },

    falloCalce(tMs: number, esParcial?: boolean) {
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

      const refToken = Math.max(ultimaConfirmada, anclaTentativa)

      // Evaluacion de Silencio
      if (!hayVoz) {
        const esSilencio = (tMs - tUltimaVozTrue) > params.msSilencioParaFrenar
        if (esSilencio) {
          return {
            posicion: posicionMostrada,
            avanzando: false,
            estado: 'DETENIDO',
            motivoFreno: 'silencio',
            ppmEstimadas,
            ultimoCalce: refToken,
            tUltimoCalceMs: tUltimoCalce
          }
        }
      }

      const dtSinCalce = tMs - tUltimoCalce
      const vBase = ppmEstimadas / 60000
      const vMax = 3 * vBase

      const esSinCalce = fallosFinalesSeguidos >= params.fallosParaFrenar || (hayVoz && dtSinCalce > params.msSinCalceParaFrenar)

      if (esSinCalce) {
        const dtBuscando = dtSinCalce
        if (dtBuscando < params.msDeBusquedaCiega) {
          // 3. BUSCANDO: dejó de calzar. El texto NO se congela: sigue avanzando a la velocidad
          // PREDICHA pero FRENANDO (desacelerando) hasta detenerse en msDeBusquedaCiega.
          const progress = Math.min(1, dtBuscando / params.msDeBusquedaCiega)
          const factorDesaceleracion = Math.max(0, 1 - progress)

          const distAdelanto = Math.max(0, posicionMostrada - refToken)
          const comodo = params.adelantoComodo
          const maximo = Math.max(comodo + 1, params.adelantoMaximo)
          const factorFreno = distAdelanto <= comodo
            ? 1
            : Math.max(0, 1 - (distAdelanto - comodo) / (maximo - comodo))

          const v = arranqueCumplido ? vBase * factorDesaceleracion * factorFreno : 0
          let nuevaPos = posicionMostrada + v * dt

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
            avanzando: v > 0,
            estado: 'BUSCANDO',
            motivoFreno: 'sin-calce',
            ppmEstimadas,
            ultimoCalce: refToken,
            tUltimoCalceMs: tUltimoCalce
          }
        } else {
          // DETENIDO: pasó el margen y no encontró
          return {
            posicion: posicionMostrada,
            avanzando: false,
            estado: 'DETENIDO',
            motivoFreno: 'sin-calce',
            ppmEstimadas,
            ultimoCalce: refToken,
            tUltimoCalceMs: tUltimoCalce
          }
        }
      }

      // SIGUIENDO: calza y avanza.
      let vEffective = vBase
      const dist = refToken - posicionMostrada

      if (dist > 0) {
        // La posicion mostrada recupera/avanza hacia refToken a una velocidad acotada (hasta 3x)
        const vCatchup = Math.min(vMax, dt > 0 ? dist / dt : vMax)
        vEffective = Math.max(vBase, vCatchup)
      } else if (dist < -1.0) {
        // Solo retrocede si refToken esta mas de 1.0 token atras (para evitar micro-oscilaciones)
        const vBack = Math.min(vMax, dt > 0 ? Math.abs(dist) / dt : vMax)
        vEffective = -vBack
      } else if (dist < 0) {
        vEffective = 0
      }

      const distAdelanto = Math.max(0, posicionMostrada - refToken)
      if (distAdelanto > params.adelantoComodo) {
        const comodo = params.adelantoComodo
        const maximo = Math.max(comodo + 1, params.adelantoMaximo)
        const factorFreno = distAdelanto <= comodo
          ? 1
          : Math.max(0, 1 - (distAdelanto - comodo) / (maximo - comodo))
        vEffective = vEffective * factorFreno
      }

      // 4. EL ARRANQUE: SIETE PALABRAS, UNA SOLA VEZ
      // El texto NO se mueve hasta que se confirmaron 7 palabras DESDE QUE EMPEZO LA LECTURA.
      if (!arranqueCumplido || tUltimoCalce === 0) {
        vEffective = 0
      }

      let nuevaPos = posicionMostrada + vEffective * dt
      if (dist > 0) {
        nuevaPos = Math.min(refToken, nuevaPos)
      } else if (dist < -1.0) {
        nuevaPos = Math.max(refToken, nuevaPos)
      }

      let maxTokenGuion = Infinity
      if (limitesDeBloque && limitesDeBloque.length > 0) {
        maxTokenGuion = limitesDeBloque[limitesDeBloque.length - 1]
      } else if (limitesDeLinea && limitesDeLinea.length > 0) {
        maxTokenGuion = limitesDeLinea[limitesDeLinea.length - 1]
      }

      nuevaPos = Math.min(maxTokenGuion, Math.max(0, nuevaPos))
      posicionMostrada = nuevaPos

      return {
        posicion: posicionMostrada,
        avanzando: arranqueCumplido,
        estado: 'SIGUIENDO',
        motivoFreno: null,
        ppmEstimadas,
        ultimoCalce: refToken,
        tUltimoCalceMs: tUltimoCalce
      }
    },

    irAToken(token: number, tMs: number) {
      const destino = Math.max(0, token)
      posicionMostrada = destino
      ultimaConfirmada = destino
      anclaTentativa = destino
      fallosFinalesSeguidos = 0
      tUltimoCalce = tMs
      tUltimaConfirmacion = tMs
      tUltimoTentativo = 0
      tUltimaActualizacion = 0
      muestrasVelocidad = []
      palabrasConfirmadasDesdeArranque = 0
      arranqueCumplido = false
    },

    reiniciar() {
      ppmEstimadas = params.ppmInicial
      muestrasVelocidad = []
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
      palabrasConfirmadasDesdeArranque = 0
      arranqueCumplido = false
    }
  }
}
