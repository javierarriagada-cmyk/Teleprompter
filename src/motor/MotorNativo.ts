// Esqueleto de MotorNativo para Android/Capacitor.
// En la Tarea 2 se implementa sobre @capacitor-community/speech-recognition.
import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'

export class MotorNativo implements MotorDeVoz {
  readonly id = 'nativo'
  readonly nombre = 'Reconocimiento Nativo (Android)'

  async disponible(): Promise<boolean> {
    return false
  }

  async iniciar(_opciones: { lang: string }): Promise<void> {
    throw new Error('no implementado')
  }

  async detener(): Promise<void> {
    throw new Error('no implementado')
  }

  onParcial(_cb: (e: EventoParcial) => void): () => void {
    throw new Error('no implementado')
  }

  onFinal(_cb: (e: EventoFinal) => void): () => void {
    throw new Error('no implementado')
  }

  onError(_cb: (e: Error) => void): () => void {
    throw new Error('no implementado')
  }
}
