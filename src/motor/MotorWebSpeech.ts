import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'

export class MotorWebSpeech implements MotorDeVoz {
  readonly id = 'webspeech'
  readonly nombre = 'Web Speech API (Navegador)'

  private recognition: any = null
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      throw new Error('Web Speech API no está soportada en este navegador.')
    }

    const rec = new SpeechRecognition()
    rec.lang = opciones.lang || 'es-ES'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: any) => {
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
      const err = new Error(`Error en Web Speech API: ${event.error}`)
      this.listenersError.forEach((cb) => cb(err))
    }

    this.recognition = rec
    rec.start()
  }

  async detener(): Promise<void> {
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (e) {}
      this.recognition = null
    }
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
