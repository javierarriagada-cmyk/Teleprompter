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

  async disponible(): Promise<boolean> {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return false

    return new Promise((resolve) => {
      let resolved = false
      try {
        const testRec = new SpeechRecognition()
        testRec.lang = 'es-ES'

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            try { testRec.abort() } catch (e) {}
            resolve(true)
          }
        }, 1500)

        testRec.onerror = (event: any) => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            try { testRec.abort() } catch (e) {}
            if (event.error === 'service-not-allowed' || event.error === 'not-allowed') {
              resolve(false)
            } else {
              resolve(true)
            }
          }
        }

        testRec.onstart = () => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            try { testRec.stop() } catch (e) {}
            resolve(true)
          }
        }

        testRec.start()
      } catch (err) {
        if (!resolved) {
          resolved = true
          resolve(false)
        }
      }
    })
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
      let finalStr = ''
      let interimStr = ''
      const ahora = Date.now()

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i]
        if (res.isFinal) {
          finalStr += res[0].transcript
        } else {
          interimStr += res[0].transcript
        }
      }

      if (interimStr) {
        this.listenersParcial.forEach((cb) => cb({ texto: interimStr }))
      }
      if (finalStr) {
        this.listenersFinal.forEach((cb) => cb({ texto: finalStr, inicioMs: ahora - 1000, finMs: ahora }))
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
