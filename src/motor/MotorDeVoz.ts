export type EventoParcial = { texto: string }
export type EventoFinal = { texto: string; inicioMs: number; finMs: number }

export type IdMotor = 'vosk' | 'nativo' | 'fake'

// Lo que responde asegurarVoz -tarea 84-.
export type ResultadoVoz = 'lista' | 'sin-conexion'

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
  // Abre la pantalla de ajustes de Sigo en el sistema si se nego el permiso -28-09-2026-.
  abrirAjustesDeLaApp?(): Promise<void>
  // Deja el modelo del idioma en el teléfono ANTES de la cuenta, bajándolo si hace falta
  // -tarea 84, D3, 29-09-2026-. Solo lo tiene el nativo: en la versión de Play el modelo inglés se
  // pide a Play la primera vez. alProgreso va de 0 a 1 mientras baja. 'sin-conexion' si hace
  // falta internet y no hay. Los motores que no lo tienen se tratan como 'lista'.
  asegurarVoz?(lang: string, alProgreso: (fraccion: number) => void): Promise<ResultadoVoz>

  // cada suscripción devuelve su propia función para darse de baja
  onParcial(cb: (e: EventoParcial) => void): () => void
  onFinal(cb: (e: EventoFinal) => void): () => void
  onError(cb: (e: Error) => void): () => void
  onProgreso?(cb: (pct: number) => void): () => void
}
