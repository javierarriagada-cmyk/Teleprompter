// Siete palabras. Lo pidio Javier el 6 de septiembre de 2026 leyendo a camara.
// NO reemplazar por una derivacion de renglones, tamano de letra ni ancho de
// columna: ya se hizo una vez y se desfondó al cambiar la tipografia.
export const PALABRAS_PARA_ARRANCAR = 7

// Cuanto tarda el reconocedor en entregar una palabra desde que se dijo. Es lo unico que
// hay que compensar para apuntar a donde esta la persona.
export const MS_RETRASO_RECONOCEDOR = 400

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
  // LA VELOCIDAD ES ESTADO, NO UNA CUENTA DE CADA CUADRO. Esto es lo que le da inercia al
  // motor: sin esto la velocidad puede saltar de 0 a 3x entre dos cuadros, y eso es lo que
  // se ve como un tiron aunque la velocidad nunca pase del tope.
  let vActual = 0
  let tInicioBuscando = 0

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

  // LA CORREA, EN UN SOLO LUGAR. Cuanto puede correr el texto por delante de donde estas:
  // libre hasta adelantoComodo, frenando hasta adelantoMaximo, y ahi quieto. Los dos numeros
  // los ajusto Javier leyendo a camara.
  // INVARIANTE: EL TEXTO NUNCA SE MUESTRA MAS DE adelantoMaximo PALABRAS POR DELANTE DE LA ULTIMA PALABRA QUE EL RECONOCEDOR UBICO EN EL GUION.
  function frenoDeCorrea(adelanto: number): number {
    const comodo = params.adelantoComodo
    const maximo = Math.max(comodo + 1, params.adelantoMaximo)
    if (adelanto <= comodo) return 1
    return Math.max(0, 1 - (adelanto - comodo) / (maximo - comodo))
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
      const dtSinCalce = tMs - tUltimoCalce
      const vBase = ppmEstimadas / 60000
      const vMax = 3 * vBase

      // EL BLANCO ES DONDE ESTAS AHORA, NO DONDE TE OYERON.
      //
      // refToken es la ultima palabra que el reconocedor confirmo, y llega TARDE: entre que
      // la dijiste y que nos la entrego pasaron entre 300 y 800 ms, y en el telefono mas.
      // Mientras tanto seguiste hablando. Apuntarle a refToken es apuntarle al pasado.
      //
      // Y hay algo peor que el atraso: refToken es una ESCALERA. Salta de 14 a 15 a 17 en
      // rafagas. Si la posicion mostrada persigue una escalera, se mueve como una escalera:
      // corre, la alcanza, y se queda muerta hasta el proximo escalon. Medido el 8 de
      // septiembre de 2026 con la sonda: 54 cuadros de 80 completamente quietos, el texto
      // detenido el 68% del tiempo. Eso son los saltitos que reporto Javier.
      //
      // El blanco, en cambio, se mueve SOLO y de forma continua, porque es una recta en el
      // tiempo. Persiguiendo una recta, la posicion mostrada avanza parejo.
      //
      // Y NO BAJA NUNCA. El termino que extrapola se reinicia cada vez que llega un calce
      // nuevo, asi que el blanco crudo es un diente de sierra: sube durante 600 ms y cae de
      // golpe cuando el reconocedor entrega. Como refToken es un Math.max y no baja jamas,
      // esa caida es un artefacto de la cuenta, no algo que haya pasado en la sala. Dejarla
      // pasar hacia el movimiento hacia atras. Se corrigio el mismo dia que se escribio,
      // porque la prueba T13 la agarro.
      // Y LA PREDICCION TIENE TECHO: adelantoMaximo palabras por delante de lo ultimo que de
      // verdad oimos. Extrapolar cubre el atraso del reconocedor, que son unas decimas. Si
      // hace cinco segundos que no calza, seguir extrapolando no es predecir: es inventar una
      // posicion que no tiene nada que ver con lo que la persona esta diciendo. El techo es el
      // numero que ya ajusto Javier leyendo a camara, no uno nuevo, y deja escrito el
      // invariante: EL TEXTO NUNCA SE PONE MAS DE TRES PALABRAS ADELANTE DE LA ULTIMA QUE
      // OIMOS.
      const comodo = params.adelantoComodo
      const maximo = Math.max(comodo + 1, params.adelantoMaximo)
      // EL BLANCO ES DONDE CREEMOS QUE ESTA LA PERSONA. NO ES UN MAXIMO PERMITIDO.
      //
      // Aca estaba el defecto que hacia que el texto se le adelantara a Javier lectura tras
      // lectura, y no se veia porque estaba escrito como si fuera una precaucion:
      //
      //     refToken + Math.min(maximo, vBase * (tMs - tUltimoCalce))
      //
      // La extrapolacion estaba topada por LA CORREA -3 palabras- en vez de por el retraso
      // real del reconocedor. Como entre un calce y el siguiente pasa mas de un segundo, ese
      // termino llegaba SIEMPRE al tope. O sea que el motor apuntaba, todo el tiempo, a tres
      // palabras mas alla de lo ultimo que habia oido. Medido sobre cuatro lecturas reales:
      // el 59% del tiempo el texto estaba entre 2 y 3 palabras adelante, y justo antes de
      // cada calce nuevo el adelanto promediaba 2.21. No se adelantaba a veces: iba tan
      // adelante como se le permitia, siempre.
      //
      // La correa nunca fue un limite de seguridad. Era el destino.
      //
      // Lo que hay que extrapolar es el RETRASO DEL RECONOCEDOR: entre que la persona dice
      // una palabra y el reconocedor la entrega pasan unas decimas. Eso, y nada mas, es lo
      // que hay que compensar para apuntar a donde de verdad esta. La correa vuelve a ser lo
      // que decia ser: un limite que casi nunca se toca.
      const blanco = tUltimoCalce === 0
        ? refToken
        : refToken + vBase * Math.min(MS_RETRASO_RECONOCEDOR, tMs - tUltimoCalce)

      // ─── QUE ESTADO, Y A QUE VELOCIDAD QUIERE IR ────────────────────────────────────
      //
      // Cada estado NO mueve el texto. Solo declara la velocidad a la que querria ir. El
      // movimiento pasa una sola vez, mas abajo. Antes cada rama integraba por su cuenta y
      // por eso las transiciones eran escalones.
      let estado: EstadoModo
      let motivoFreno: EstadoAvance['motivoFreno']
      let vObjetivo: number

      const enSilencio = !hayVoz && (tMs - tUltimaVozTrue) > params.msSilencioParaFrenar

      // DOS MANERAS DE DARSE CUENTA DE QUE SE PERDIO, Y SON DISTINTAS.
      //
      // fallosFinalesSeguidos es EVIDENCIA EN CONTRA: llegaron palabras de verdad y no se
      // pudieron ubicar en ninguna parte de la ventana. Eso se sabe altiro y esperar seria
      // desperdiciar informacion.
      //
      // dtSinCalce es AUSENCIA DE EVIDENCIA: pasa el tiempo hablando y no llega nada que sirva.
      // Eso recien significa algo cuando se sostiene.
      //
      // El defecto que reporto Javier -"cada dos o tres palabras lo esta buscando si sabe
      // exactamente donde vamos"- era que las dos se estaban mezclando: useSeguidor llamaba a
      // falloCalce igual para un final del que no se puede sacar nada -"si", "bueno", que
      // Android emite todo el tiempo- que para uno con frase entera que no calza. Dos finales
      // cortos seguidos y el motor se declaraba perdido leyendo perfecto. La separacion se
      // arreglo en useSeguidor, que es donde se sabe la diferencia; la regla de aca esta bien.
      //
      // Lo que si estaba roto aca: msSinCalceParaFrenar y msDeBusquedaCiega valen los dos 2500
      // y se comparaban los dos contra dtSinCalce, asi que por tiempo se saltaba BUSCANDO y se
      // caia derecho en DETENIDO. El segundo ahora se cuenta DESDE que se entro a BUSCANDO,
      // que es lo que su nombre dice.
      if (enSilencio) {
        estado = 'DETENIDO'
        motivoFreno = 'silencio'
        vObjetivo = 0
      } else if (!arranqueCumplido || tUltimoCalce === 0) {
        estado = 'DETENIDO'
        motivoFreno = 'sin-calce'
        vObjetivo = 0
        tInicioBuscando = 0
      } else if (dtSinCalce > params.msSinCalceParaFrenar) {
        // Paso el margen entero sin poder calzar nada. Se detiene y lo dice.
        estado = 'DETENIDO'
        motivoFreno = 'sin-calce'
        vObjetivo = 0
        tInicioBuscando = 0
      } else if (fallosFinalesSeguidos >= params.fallosParaFrenar) {
        estado = 'BUSCANDO'
        motivoFreno = 'sin-calce'
        // EL RELOJ DE LA BUSQUEDA ARRANCA CUANDO ARRANCA LA BUSQUEDA. Parece obvio y me
        // equivoque en esto hace un rato: lo hice contar desde un instante fijo, y como a
        // BUSCANDO se puede entrar de dos maneras distintas, el reloj quedaba corriendo desde
        // antes de haber entrado.
        if (tInicioBuscando === 0) tInicioBuscando = tMs
        const dtBuscando = tMs - tInicioBuscando
        const desaceleracion = Math.max(0, 1 - dtBuscando / params.msDeBusquedaCiega)
        vObjetivo = vBase * desaceleracion * frenoDeCorrea(posicionMostrada - refToken)
      } else {
        tInicioBuscando = 0
        estado = 'SIGUIENDO'
        motivoFreno = null
        const dist = blanco - posicionMostrada
        if (dist > 0) {
          // RECUPERAR SIN TIRON. Antes era `min(vMax, dist/dt)`: con dt de 16 ms, dist/dt es
          // enorme y saturaba en vMax SIEMPRE, o sea que toda recuperacion era una corrida a
          // 3x que empezaba y terminaba de golpe. Ahora la velocidad extra es proporcional a
          // lo que falta: llega a 3x recien cuando falta la correa entera, y se apaga sola a
          // medida que se acerca. No hace falta una constante nueva: el 3x y la correa ya
          // estaban, y de los dos sale la pendiente.
          vObjetivo = Math.min(vMax, vBase + (dist * (vMax - vBase)) / maximo)
        } else {
          // El texto va adelante tuyo. NO SE DETIENE de golpe: sigue a tu ritmo, cada vez mas
          // despacio, y llega a cero recien en adelantoMaximo. Medido SIEMPRE contra refToken.
          vObjetivo = vBase * frenoDeCorrea(posicionMostrada - refToken)
        }
      }

      // 4. EL ARRANQUE: SIETE PALABRAS, UNA SOLA VEZ
      // El texto NO se mueve hasta que se confirmaron 7 palabras DESDE QUE EMPEZO LA LECTURA.
      if (!arranqueCumplido || tUltimoCalce === 0) {
        vObjetivo = 0
      }

      // ─── EL UNICO LUGAR DONDE LA VELOCIDAD CAMBIA Y EL TEXTO SE MUEVE ───────────────
      //
      // LO QUE EL OJO LEE NO ES VELOCIDAD, SON CAMBIOS DE VELOCIDAD. En la tarea 20 pusimos
      // tope a la velocidad -3x- y eso mato los teletransportes, pero la velocidad seguia
      // recalculandose de cero en cada cuadro, asi que podia pasar de 0 a 3x y volver a 0 de
      // un cuadro al siguiente. Aceleracion infinita en los dos extremos. Un auto que salta de
      // 0 a 60 y vuelve al instante se siente violento aunque 60 sea una velocidad modesta.
      // Eso era "por que hace movimientos bruscos si todo deberia ser suavidad".
      //
      // El motor ahora tiene INERCIA: la velocidad es un estado que persiste entre cuadros y
      // solo puede cambiar a un ritmo acotado. Con esto TODA transicion sale suave -entrar y
      // salir de BUSCANDO, detenerse por silencio, corregir despues de una rafaga- sin ningun
      // caso especial para cada una.
      //
      // El tiempo de suavizado NO es una constante nueva: es lo que tarda el lector en decir
      // adelantoComodo palabras a su propio ritmo. A 150 ppm son 400 ms; si lee mas rapido, el
      // motor responde mas rapido. Se ajusta solo a la persona.
      const msSuavizado = Math.max(1, comodo / vBase)
      const cambioMaximo = (vMax / msSuavizado) * dt
      const diferencia = vObjetivo - vActual
      vActual += Math.max(-cambioMaximo, Math.min(cambioMaximo, diferencia))
      if (vActual < 0) vActual = 0

      let nuevaPos = posicionMostrada + vActual * dt

      // EL TEXTO NO SE ADELANTA A LA EVIDENCIA. NUNCA.
      //
      // Antes este tope se aplicaba SOLO cuando el blanco estaba adelante -if (blanco >
      // posicionMostrada)-. O sea que si la posicion ya iba adelante del blanco, seguia
      // corriendo libre hasta chocar con la correa. Y corria a la velocidad ESTIMADA, que al
      // empezar vale 150 palabras por minuto porque todavia no se midio nada. Javier lee a
      // unas 100. Desde la primera palabra el texto iba un 50% mas rapido que el, y por eso
      // preguntaba por que se movia mientras el seguia en el primer renglon.
      //
      // El avance por tiempo existe para TAPAR LOS HUECOS entre calce y calce, no para
      // correr por su cuenta. Se puso cuando el seguidor fallaba el 82% de las veces y habia
      // huecos enormes; ahora falla el 10% y los calces llegan siete veces por segundo, asi
      // que los huecos son cortos y no hace falta ninguna carrera libre.
      //
      // El blanco ya es "donde creemos que estas" -la ultima palabra oida mas el retraso del
      // reconocedor-. Pasarlo no es predecir: es inventar.
      nuevaPos = Math.min(blanco, nuevaPos)

      // PERO NUNCA HACIA ATRAS. El blanco BAJA cada vez que llega un calce nuevo: el termino
      // que compensa el retraso se reinicia y el blanco cae hasta una palabra de golpe. Si
      // se recortara contra eso sin mas, el texto retrocederia. Lo comprobo la prueba T13 en
      // el acto: 82 retrocesos en una lectura simulada.
      //
      // Cuando el blanco queda por detras, el texto NO retrocede: SE QUEDA QUIETO hasta que
      // el blanco lo alcanza. Quedarse quieto medio segundo no se nota; retroceder una
      // palabra te saca del renglon.
      nuevaPos = Math.max(posicionMostrada, nuevaPos)

      let maxTokenGuion = Infinity
      if (limitesDeBloque && limitesDeBloque.length > 0) {
        maxTokenGuion = limitesDeBloque[limitesDeBloque.length - 1]
      } else if (limitesDeLinea && limitesDeLinea.length > 0) {
        maxTokenGuion = limitesDeLinea[limitesDeLinea.length - 1]
      }

      // EL TEXTO NUNCA SE MUESTRA MAS DE adelantoMaximo PALABRAS POR DELANTE DE LA ULTIMA
      // PALABRA QUE EL RECONOCEDOR UBICO EN EL GUION.
      if (arranqueCumplido && tUltimoCalce > 0) {
        nuevaPos = Math.min(refToken + params.adelantoMaximo, nuevaPos)
      }

      nuevaPos = Math.min(maxTokenGuion, Math.max(0, nuevaPos))
      posicionMostrada = nuevaPos

      return {
        posicion: posicionMostrada,
        avanzando: vActual > 0,
        estado,
        motivoFreno,
        ppmEstimadas,
        ultimoCalce: refToken,
        tUltimoCalceMs: tUltimoCalce
      }
    },

    irAToken(token: number, tMs: number) {
      const destino = Math.max(0, token)
      posicionMostrada = destino
      vActual = 0
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
      vActual = 0
      tUltimaActualizacion = 0
      palabrasConfirmadasDesdeArranque = 0
      arranqueCumplido = false
    }
  }
}
