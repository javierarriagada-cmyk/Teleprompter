export type EventoParcial = { texto: string }
export type EventoFinal = { texto: string; inicioMs: number; finMs: number }

export type IdMotor = 'webspeech' | 'whisper-local' | 'nativo' | 'fake'

export interface MotorDeVoz {
  readonly id: IdMotor
  readonly nombre: string

  // comprueba capacidades reales, nunca el user-agent
  disponible(): Promise<boolean>

  iniciar(opciones: { lang: string }): Promise<void>
  detener(): Promise<void>

  // cada suscripción devuelve su propia función para darse de baja
  onParcial(cb: (e: EventoParcial) => void): () => void
  onFinal(cb: (e: EventoFinal) => void): () => void
  onError(cb: (e: Error) => void): () => void
}
