import { VENTANA_ADELANTE } from './seguidor'
// Siete palabras. Lo pidio Javier el 6 de septiembre de 2026 leyendo a camara.
// NO reemplazar por una derivacion de renglones, tamano de letra ni ancho de
// columna: ya se hizo una vez y se desfondó al cambiar la tipografia.
//
// TRES DESDE EL 24-09-2026, MEDIDO, Y CON JAVIER. El siete se pidio con el reconocedor web,
// que al empezar entregaba a rafagas y a destiempo. Con el nativo, en dieciseis tomas reales
// -teleprom/02-lecturas/motor-24-sep, arranque3.mjs-, el primer cambio de renglon llegaba
// 0,81 s despues de la voz con siete y 0,48 s con cinco o con tres; los cambios siguientes
// no se mueven, y en ninguna toma la pantalla salio del primer renglon antes de tiempo. Tres
// es lo mismo que ya exige el seguidor -tres palabras seguidas para ubicar-.
//
// Y ES UNA SOLA REGLA PARA CUALQUIER LETRA, que es lo que Javier pidio -"alguna distorsion
// deberia tener de acuerdo al tamano de la letra"- sin reglas por version: la pantalla nunca
// sale del primer renglon antes de que la voz lo termine, asi que con letra chica -siete u
// ocho palabras por renglon- el arranque no se nota y con letra grande deja de retener un
// renglon de mas. No es la derivacion de renglones que advierte el comentario de arriba.
export const PALABRAS_PARA_ARRANCAR = 3

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
  // -motor sin pastilla, 13-10-2026- el estado del ultimo cuadro, SIN avanzar el motor. Para quien
  // solo mira -la pastilla del tiempo-: el unico que avanza el motor es el cuadro de la vista.
  leerEstado(): EstadoAvance
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

  let fallosFinalesSeguidos = 0
  let tUltimoCalce = 0
  let hayVoz = false
  let tUltimaVozTrue = 0

  let posicionMostrada = 0
  let tUltimaActualizacion = 0
  // -motor sin pastilla- lo ultimo que devolvio estadoEn: estado, freno y si avanzaba. La posicion,
  // el calce y el ritmo se leen siempre de las variables de arriba.
  let ultimoEstado: Pick<EstadoAvance, 'avanzando' | 'estado' | 'motivoFreno'> = { avanzando: false, estado: 'DETENIDO', motivoFreno: 'silencio' }
  // LA VELOCIDAD ES ESTADO, NO UNA CUENTA DE CADA CUADRO. Esto es lo que le da inercia al
  // motor: sin esto la velocidad puede saltar de 0 a 3x entre dos cuadros, y eso es lo que
  // se ve como un tiron aunque la velocidad nunca pase del tope.
  let vActual = 0
  let tInicioBuscando = 0

  let palabrasConfirmadasDesdeArranque = 0
  let arranqueCumplido = false

  // -24-09-2026: aca estaban obtenerLimiteLineaActual, obtenerLimiteLineaSiguiente y
  // obtenerLimiteBloqueActual, del freno de fin de linea y de bloque. Nadie las llamaba: el
  // tope de avance por renglon lo pone conduccion.ts. limitesDeLinea y limitesDeBloque siguen
  // sirviendo para saber donde termina el guion -mas abajo-.

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

  // EL ANCLA DE UN PARCIAL QUE NINGÚN FINAL CONFIRMA -motor-parentesis, 15-10-2026-. Si quedó más de
  // VENTANA_ADELANTE -40; antes correaPalabras, 12- adelante de lo confirmado, se suelta: vuelve a ultimaConfirmada, y con ella
  // ultimoCalce, la ventana de conduccion.ts y el tope de adelantoMaximo. Con menos no: entre un
  // parcial y su final es normal que difieran unas palabras -en inglés, 6b354819, el final cerró 5
  // detrás del parcial (161 → 156) y soltarla tiraba el texto 3 palabras atrás: tirón de 152,6
  // palabras/s en el banco-. En la toma de 25 min el ancla sin confirmar estaba 62 adelante (260
  // con 198 confirmado) y 45 (1361 con 1316). Ver docs/mediciones/motor-parentesis/EXPLICACION.txt.
  // -revisión del PR #126- el tope es VENTANA_ADELANTE -40-, no correaPalabras -12-: con 12 se
  // soltaban anclas que iban bien. Sin paréntesis, a-mano=20, tres detenciones nuevas de 11-12 s:
  // 4:48 (ancla 236, confirmado 204: 32), 6:11 (316 y 291: 25) y 8:30 (485 y 455: 30), con la voz
  // en 216, 317-329 y 485-499: el ancla estaba más cerca del lector que lo confirmado. Las dos
  // detenciones reales iban 62 (260/198) y 45 (1361/1316) adelante. Más de 40 tampoco cabe en la
  // ventana del seguidor -hasta = basePos + VENTANA_ADELANTE-. Ver EXPLICACION.txt, punto 4.
  function soltarAnclaSinConfirmar() {
    // Antes: if (anclaTentativa - ultimaConfirmada > params.correaPalabras) anclaTentativa = ultimaConfirmada
    if (anclaTentativa - ultimaConfirmada > VENTANA_ADELANTE) anclaTentativa = ultimaConfirmada
  }

  // -motor sin pastilla- el estado sin integrar tiempo: la posicion donde quedo, el calce y el ritmo
  // de ahora, y el estado y el freno del ultimo cuadro.
  function estadoSinAvanzar(): EstadoAvance {
    return {
      posicion: posicionMostrada,
      ...ultimoEstado,
      ppmEstimadas,
      ultimoCalce: Math.max(ultimaConfirmada, anclaTentativa),
      tUltimoCalceMs: tUltimoCalce
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
      // -motor-parentesis- el final cerró en otro lado: ver soltarAnclaSinConfirmar.
      anclaTentativa = Math.max(anclaTentativa, token)
      soltarAnclaSinConfirmar()
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
      }
      registrarAvanceArranque(token, anclaTentativa)

      tUltimoCalce = tMs
      fallosFinalesSeguidos = 0
    },

    falloCalce(tMs: number, esParcial?: boolean) {
      // UN FINAL SIN CALCE TAMPOCO CONFIRMA EL PARCIAL -motor-parentesis, 15-10-2026-. En la toma de
      // 25 min un parcial con tres palabras solo parecidas llevó el ancla de 237 a 260 a los 283,8 s;
      // el final de 284,0 no calzó, el ancla se quedó en 260 y ultimoCalce -max(ultimaConfirmada,
      // anclaTentativa)- dejó la ventana de conduccion.ts en 251..301 con Javier leyendo en 218-239,
      // hasta que movió el texto a mano 61 s después. Ahora, desde el segundo final seguido sin calce
      // -fallosParaFrenar, cuando el motor ya busca-, el ancla vuelve a lo confirmado si estaba más
      // de una correa adelante -ver soltarAnclaSinConfirmar- y la ventana se mide otra vez desde ahí.
      // Desde el primero, no: en Larralde de pie -tarea89, toma 3- los finales no calzan y los
      // parciales llevan bien el texto hasta 31; soltar el ancla ahí lo devolvía a 3.
      // Antes: if (!esParcial) fallosFinalesSeguidos++
      if (!esParcial) {
        fallosFinalesSeguidos++
        if (fallosFinalesSeguidos >= params.fallosParaFrenar) soltarAnclaSinConfirmar()
      }
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

      // EL RELOJ DEL MOTOR NO VA PARA ATRAS -motor sin pastilla, 13-10-2026-.
      //
      // La pastilla del tiempo -BarraDeTiempo.tsx- llamaba aca con una hora que se refresca cada
      // 250 ms y que, en cada redibujo por un calce, era MAS VIEJA que la del ultimo cuadro. El
      // max(0, ...) de abajo no integraba nada, pero la linea siguiente dejaba tUltimaActualizacion
      // en esa hora vieja, y el cuadro siguiente volvia a integrar el mismo tramo: el texto saltaba
      // hasta el blanco con cada calce. Mostrar u ocultar la pastilla cambiaba donde iba el texto
      // -medido en el banco del motor, PR #97: 0,4 palabras en todas las tomas en espanol-.
      // Una hora anterior a la ultima no integra nada y no mueve el reloj: devuelve lo que hay.
      if (tMs < tUltimaActualizacion) return estadoSinAvanzar()

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

      ultimoEstado = { avanzando: vActual > 0, estado, motivoFreno }
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

    leerEstado(): EstadoAvance {
      return estadoSinAvanzar()
    },

    irAToken(token: number, tMs: number) {
      const destino = Math.max(0, token)
      posicionMostrada = destino
      vActual = 0
      ultimaConfirmada = destino
      anclaTentativa = destino
      fallosFinalesSeguidos = 0
      tUltimoCalce = tMs
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
