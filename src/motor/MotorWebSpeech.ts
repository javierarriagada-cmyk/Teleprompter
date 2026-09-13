import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'

// Cuanto tiene que durar un reconocedor para que su cierre cuente como normal y no como
// fallo. Chrome cierra solo tras unos segundos de silencio, asi que un cierre despues de
// este rato es el ciclo sano de la API. Uno inmediato, en cambio, es que algo no anda:
// el microfono se desconecto, se revoco el permiso, no hay red.
const MS_DE_VIDA_SANA = 5000

export class MotorWebSpeech implements MotorDeVoz {
  readonly id = 'webspeech'
  readonly nombre = 'Web Speech API (Navegador)'

  private recognition: any = null
  private queremosEscuchar = false
  private reconexionesSeguidas = 0
  private opciones: { lang: string } = { lang: 'es-ES' }
  private timerReconexion: any = null
  private tUltimoArranque = 0

  private listenersParcial: Array<(e: EventoParcial) => void> = []
  private listenersFinal: Array<(e: EventoFinal) => void> = []
  private listenersError: Array<(e: Error) => void> = []

  // DISPONIBLE ES "EL NAVEGADOR SABE HACER ESTO", NO "YA ME DIERON PERMISO".
  //
  // Antes esta funcion ARRANCABA UNA SESION DE RECONOCIMIENTO DE VERDAD solo para probar, y
  // devolvia false si el navegador contestaba 'not-allowed'. Pero 'not-allowed' en la
  // primera visita no significa que el navegador no sepa: significa QUE TODAVIA NADIE
  // PIDIO EL MICROFONO. El permiso se pide cuando la persona aprieta grabar, no al abrir.
  //
  // La consecuencia era seria y se veia en el sitio publicado: alguien entra por primera
  // vez, todavia no dio permiso, Web Speech se descarta, y elegirMotor cae en el siguiente
  // de la lista, que es Whisper Local. Whisper Local se baja whisper-base entero desde
  // Hugging Face. O sea que el que entraba por primera vez se llevaba una descarga enorme
  // a espaldas suyas, sin un aviso, en vez de usar el reconocedor del telefono que no pesa
  // nada.
  //
  // Y ademas disparaba el cartel de permiso del microfono AL CARGAR LA PAGINA, antes de
  // que la persona hubiera hecho nada.
  //
  // Ahora se responde lo que la pregunta dice: si la interfaz existe, el motor esta
  // disponible. Si despues, al empezar a grabar de verdad, el permiso se niega o el
  // servicio falla, eso se informa ahi -que es donde la persona entiende por que se lo
  // estan preguntando- en vez de cambiarle el motor sin decirle nada.
  async disponible(): Promise<boolean> {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    return !!SpeechRecognition
  }

  async iniciar(opciones: { lang: string }): Promise<void> {
    this.opciones = opciones
    this.reconexionesSeguidas = 0
    if (this.timerReconexion) {
      clearTimeout(this.timerReconexion)
      this.timerReconexion = null
    }

    this.queremosEscuchar = true
    this.recognition = this.crearReconocedor(this.opciones)
    this.arrancar()
  }

  // Un solo lugar donde se llama start(), para que la marca de tiempo no se olvide en
  // ninguno de los dos caminos (arranque y reconexion).
  private arrancar(): void {
    this.tUltimoArranque = Date.now()
    this.recognition.start()
  }

  async detener(): Promise<void> {
    this.queremosEscuchar = false
    if (this.timerReconexion) {
      clearTimeout(this.timerReconexion)
      this.timerReconexion = null
    }
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (e) {}
      this.recognition = null
    }
  }

  private crearReconocedor(opciones: { lang: string }): any {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      throw new Error('Web Speech API no está soportada en este navegador.')
    }

    const rec = new SpeechRecognition()
    rec.lang = opciones.lang || 'es-ES'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: any) => {
      this.reconexionesSeguidas = 0
      let interimStr = ''
      const ahora = performance.now()

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i]
        if (res.isFinal) {
          const textFinal = res[0] && res[0].transcript ? res[0].transcript.trim() : ''
          if (textFinal) {
            this.listenersFinal.forEach((cb) => cb({ texto: textFinal, inicioMs: ahora - 1000, finMs: ahora }))
          }
        } else {
          interimStr += res[0] && res[0].transcript ? res[0].transcript : ''
        }
      }

      if (interimStr) {
        this.listenersParcial.forEach((cb) => cb({ texto: interimStr }))
      }
    }

    rec.onerror = (event: any) => {
      const errorType = event?.error
      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        this.queremosEscuchar = false
        const err = new Error(`Error en Web Speech API: ${errorType}`)
        this.listenersError.forEach((cb) => cb(err))
      }
      // Errores normales ('no-speech', 'aborted', 'network', etc.) no se emiten por onError
      // para permitir que onend realice la reconexión.
    }

    rec.onend = () => {
      if (!this.queremosEscuchar) {
        return
      }

      // Un reconocedor que estuvo vivo un rato normal y se cerro solo NO es un fallo: es
      // Chrome cerrando por silencio, que pasa todo el tiempo cuando el que lee hace una
      // pausa. Sin esta distincion, seis pausas seguidas -menos de un minuto callado-
      // matan el motor y el lector vuelve a encontrarse con un error.
      if (Date.now() - this.tUltimoArranque >= MS_DE_VIDA_SANA) {
        this.reconexionesSeguidas = 0
      }

      this.reconexionesSeguidas++
      if (this.reconexionesSeguidas >= 6) {
        this.queremosEscuchar = false
        const err = new Error('El reconocimiento de voz se detuvo tras varios intentos sin respuesta. Por favor vuelva a iniciarlo.')
        this.listenersError.forEach((cb) => cb(err))
        return
      }

      this.timerReconexion = setTimeout(() => {
        this.timerReconexion = null
        if (!this.queremosEscuchar) return

        try {
          this.arrancar()
        } catch (e) {
          try {
            this.recognition = this.crearReconocedor(opciones)
            this.arrancar()
          } catch (err2) {
            // Ignorar
          }
        }
      }, 250)
    }

    return rec
  }

  onParcial(cb: (e: EventoParcial) => void): () => void {
    this.listenersParcial.push(cb)
    return () => {
      this.listenersParcial = this.listenersParcial.filter((l) => l !== cb)
    }
  }

  onFinal(cb: (e: EventoFinal) => void): () => void {
    this.listenersFinal.push(cb)
    return () => {
      this.listenersFinal = this.listenersFinal.filter((l) => l !== cb)
    }
  }

  onError(cb: (e: Error) => void): () => void {
    this.listenersError.push(cb)
    return () => {
      this.listenersError = this.listenersError.filter((l) => l !== cb)
    }
  }
}
