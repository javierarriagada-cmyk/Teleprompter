import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'

export class MotorFake implements MotorDeVoz {
  readonly id = 'fake'
  readonly nombre = 'Motor Fake para Pruebas'

  private frases: string[]
  private indice = 0
  private listenersParcial: Array<(e: EventoParcial) => void> = []
  private listenersFinal: Array<(e: EventoFinal) => void> = []
  private listenersError: Array<(e: Error) => void> = []

  constructor(frases: string[] = []) {
    this.frases = frases
  }

  async disponible(): Promise<boolean> {
    return true
  }

  async iniciar(_opciones: { lang: string }): Promise<void> {
    this.indice = 0
  }

  async detener(): Promise<void> {
    // no-op
  }

  emitirSiguiente(): boolean {
    if (this.indice >= this.frases.length) return false
    const texto = this.frases[this.indice]
    const inicioMs = this.indice * 1000
    const finMs = (this.indice + 1) * 1000
    this.indice++
    this.listenersFinal.forEach((cb) => cb({ texto, inicioMs, finMs }))
    return true
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
