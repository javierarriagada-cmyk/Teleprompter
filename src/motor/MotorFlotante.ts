// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

import { publicarNivelVoz } from '../lib/nivelVoz'
import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'
import { textoDe } from './textoDeVosk'

export type EventoVozFlotante = {
  sesion: number
  evento: 'parcial' | 'final'
  json: string
  rms?: number
}

// Recibe los eventos que el nativo reenvía a la ventana. No abre el micrófono:
// eso lo hace App con MotorNativo, en la actividad.
export class MotorFlotante implements MotorDeVoz {
  readonly id = 'nativo' as const
  readonly nombre = 'Vosk flotante'

  private listenersParcial: ((e: EventoParcial) => void)[] = []
  private listenersFinal: ((e: EventoFinal) => void)[] = []
  private listenersError: ((e: Error) => void)[] = []
  private activo = false
  private sesion = 0

  fijarSesion(n: number) {
    this.sesion = n
  }

  async disponible(): Promise<boolean> {
    return true
  }

  async listo(): Promise<boolean> {
    return true
  }

  async iniciar(_opciones: { lang: string }): Promise<void> {
    this.activo = true
  }

  async detener(): Promise<void> {
    this.activo = false
    publicarNivelVoz(0)
  }

  recibir(mensaje: EventoVozFlotante): void {
    if (!this.activo) return
    if (mensaje.sesion !== this.sesion) return
    const campo = mensaje.evento === 'final' ? 'text' : 'partial'
    const texto = textoDe(mensaje.json, campo)
    if (typeof mensaje.rms === 'number') publicarNivelVoz(mensaje.rms)
    if (!texto.trim()) return
    if (mensaje.evento === 'final') {
      const ahora = Date.now()
      this.listenersFinal.forEach((cb) => cb({ texto, inicioMs: ahora, finMs: ahora }))
    } else {
      this.listenersParcial.forEach((cb) => cb({ texto }))
    }
  }

  onParcial(cb: (e: EventoParcial) => void): () => void {
    this.listenersParcial.push(cb)
    return () => {
      this.listenersParcial = this.listenersParcial.filter((x) => x !== cb)
    }
  }

  onFinal(cb: (e: EventoFinal) => void): () => void {
    this.listenersFinal.push(cb)
    return () => {
      this.listenersFinal = this.listenersFinal.filter((x) => x !== cb)
    }
  }

  onError(cb: (e: Error) => void): () => void {
    this.listenersError.push(cb)
    return () => {
      this.listenersError = this.listenersError.filter((x) => x !== cb)
    }
  }
}
