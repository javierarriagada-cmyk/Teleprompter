// LA VOZ, GUIADA DESDE EL GUION DE CAPTURAS -tarea 86-.
//
// En el navegador de las capturas no hay nadie hablando. Este motor cumple la misma interfaz que
// el reconocedor -src/motor/MotorDeVoz.ts- y "oye" las palabras del guion cuando capturar.cjs se lo
// pide: el seguidor, la línea bajo las palabras y el avance son los de la app, sin cambios. Es lo
// mismo que hacen las pruebas con MotorFake, pero manejado desde afuera.
import type { EventoFinal, EventoParcial, MotorDeVoz } from '../../../../src/motor/MotorDeVoz'

export class VozGuiada implements MotorDeVoz {
  readonly id = 'fake' as const
  readonly nombre = 'Voz guiada de las capturas'
  private parciales: Array<(e: EventoParcial) => void> = []
  private finales: Array<(e: EventoFinal) => void> = []
  private reloj = 0

  async disponible() { return true }
  async listo() { return true }
  async iniciar() { this.reloj = 0 }
  async detener() {}
  async pedirMicrofono() { return true }
  async asegurarVoz() { return 'lista' as const }

  // Dice estas palabras como una frase cerrada, a unos 350 ms por palabra.
  decir(texto: string) {
    const palabras = texto.split(/\s+/).filter(Boolean)
    const inicioMs = this.reloj
    this.reloj += palabras.length * 350
    this.parciales.forEach((cb) => cb({ texto }))
    this.finales.forEach((cb) => cb({ texto, inicioMs, finMs: this.reloj }))
  }

  onParcial(cb: (e: EventoParcial) => void) { this.parciales.push(cb); return () => { this.parciales = this.parciales.filter((x) => x !== cb) } }
  onFinal(cb: (e: EventoFinal) => void) { this.finales.push(cb); return () => { this.finales = this.finales.filter((x) => x !== cb) } }
  onError() { return () => {} }
}
