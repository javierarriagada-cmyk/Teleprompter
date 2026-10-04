// UN PLUGIN DE GESTOS FINGIDO -tarea 88, 04-10-2026-. Para las pruebas a través de <App>: anota cada
// llamada y contesta con la etiqueta que la prueba le ponga. Ver lib/gestos.ts.
import type { GestosPlugin, RevisionCuadro, RespuestaPreparar } from '../lib/gestos'

export class GestosFake implements GestosPlugin {
  llamadas: string[] = []
  etiqueta = 'None'
  puntaje = 0.9
  prepararResponde: RespuestaPreparar = { ok: true }
  // -tarea 88, segunda vuelta- Respuestas en orden para los primeros preparar; después, prepararResponde.
  prepararCola: RespuestaPreparar[] = []
  enVuelo = 0
  maxEnVuelo = 0

  reiniciar() {
    this.llamadas = []
    this.etiqueta = 'None'
    this.puntaje = 0.9
    this.prepararResponde = { ok: true }
    this.prepararCola = []
    this.enVuelo = 0
    this.maxEnVuelo = 0
  }

  async preparar() {
    this.llamadas.push('preparar')
    // -tarea 88, segunda vuelta- Antes: return this.prepararResponde
    return this.prepararCola.length ? this.prepararCola.shift()! : this.prepararResponde
  }

  async revisarCuadro(): Promise<RevisionCuadro> {
    this.llamadas.push('revisarCuadro')
    this.enVuelo++
    this.maxEnVuelo = Math.max(this.maxEnVuelo, this.enVuelo)
    await new Promise((r) => setTimeout(r, 10))
    this.enVuelo--
    return { etiqueta: this.etiqueta, puntaje: this.puntaje, tMs: Date.now(), msCuadro: 4, msReconocer: 6 }
  }

  async soltar() {
    this.llamadas.push('soltar')
  }
}
