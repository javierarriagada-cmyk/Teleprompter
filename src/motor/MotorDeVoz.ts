export type EventoParcial = { texto: string }
export type EventoFinal = { texto: string; inicioMs: number; finMs: number }

export type IdMotor = 'vosk' | 'nativo' | 'fake'

export interface MotorDeVoz {
  readonly id: IdMotor
  readonly nombre: string

  // comprueba capacidades reales, nunca el user-agent
  disponible(): Promise<boolean>
  listo?(): Promise<boolean>

  iniciar(opciones: { lang: string }): Promise<void>
  detener(): Promise<void>

  // Deja cargado el modelo del idioma SIN abrir el microfono -28-09-2026-: se llama en
  // silencio al abrir la app y al cambiar de guion, para que Leer no espere.
  precargar?(lang: string): Promise<void>
  // Pide el permiso del microfono si falta, ANTES de la cuenta regresiva. true si quedo dado.
  pedirMicrofono?(): Promise<boolean>

  // cada suscripción devuelve su propia función para darse de baja
  onParcial(cb: (e: EventoParcial) => void): () => void
  onFinal(cb: (e: EventoFinal) => void): () => void
  onError(cb: (e: Error) => void): () => void
  onProgreso?(cb: (pct: number) => void): () => void
}
