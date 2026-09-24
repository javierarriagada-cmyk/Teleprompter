import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core'
import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'
import { anotar, msDelRegistro } from '../lib/diagnostico'

// EL RECONOCEDOR NATIVO DE ANDROID. Es Vosk igual que la version web, pero compilado.
//
// POR QUE EXISTE, MEDIDO Y NO SUPUESTO.
//
// La version WASM baja 34 MB por internet en CADA lectura. Comprobado el 14 de
// septiembre de 2026 con el telefono en modo avion: no arranca. Y en el corpus se ve
// el efecto: el reconocedor no entrega NADA durante los primeros 11 a 13 segundos, y
// la primera palabra que ubica es la 13 o la 15 del guion. Javier lee tres renglones
// a ciegas, cada vez.
//
// Aca el modelo viaja adentro del APK y la biblioteca es codigo compilado: no hay
// descarga y no hay que armar nada en tiempo de ejecucion.
//
// LO QUE NO CAMBIA, Y ES A PROPOSITO.
//
// El seguidor, avance.ts, el renglon trabado y la banda no se enteran de que cambio
// quien les habla. Este archivo entrega parciales y finales en el mismo formato que
// entregaba MotorVosk, y ahi termina su trabajo. Si algo se rompe al cambiar de
// motor, se rompe en esta frontera y no en lo que costo un mes afinar.

interface VoskNativoPlugin {
  disponible(): Promise<{ disponible: boolean }>
  iniciar(): Promise<void>
  escuchar(): Promise<{ inicioEpochMs?: number } | void>
  detener(): Promise<void>
  addListener(
    eventName: 'parcial' | 'final',
    listener: (data: { json: string; llegadaEpochMs?: number }) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'error',
    listener: (data: { mensaje: string }) => void
  ): Promise<PluginListenerHandle>
  addListener(eventName: 'silencio', listener: () => void): Promise<PluginListenerHandle>
}

const Nativo = registerPlugin<VoskNativoPlugin>('VoskNativo')

// Vosk contesta en JSON: {"partial": "..."} mientras hablas y {"text": "..."} al
// cerrar una frase. Se parsea de este lado a proposito -el plugin pasa la cadena tal
// cual-, para no tener el formato escrito en dos lenguajes y tener que recompilar el
// APK cada vez que Vosk agregue un campo.
function textoDe(json: string, campo: 'partial' | 'text'): string {
  try {
    const o = JSON.parse(json)
    const t = o[campo]
    return typeof t === 'string' ? t : ''
  } catch {
    return ''
  }
}

export class MotorNativo implements MotorDeVoz {
  readonly id = 'nativo' as const
  readonly nombre = 'Vosk Nativo (Android)'

  private listenersParcial: ((e: EventoParcial) => void)[] = []
  private listenersFinal: ((e: EventoFinal) => void)[] = []
  private listenersError: ((e: Error) => void)[] = []
  private suscripciones: PluginListenerHandle[] = []
  private modeloCargado = false
  // El cero de los tiempos de Vosk -el arranque del audio-, en el reloj de
  // performance.now(), que es el de la aplicacion y el del registro.
  private ceroAudioPerf: number | null = null

  async disponible(): Promise<boolean> {
    // La comprobacion es de capacidades reales, nunca del user-agent: este motor
    // existe solo cuando la aplicacion corre como APK, no en el navegador.
    if (!Capacitor.isNativePlatform()) return false
    if (!Capacitor.isPluginAvailable('VoskNativo')) return false
    try {
      const r = await Nativo.disponible()
      return r.disponible === true
    } catch {
      return false
    }
  }

  async listo(): Promise<boolean> {
    return this.modeloCargado
  }

  // COPIA EL MODELO Y LO DEJA CARGADO, SIN ABRIR EL MICROFONO.
  //
  // Esto es lo unico lento que queda -la primera vez copia el modelo de los assets a
  // la memoria interna- y esta separado a proposito, para poder llamarlo al ABRIR la
  // aplicacion. Que todo el trabajo caro cayera al apretar Leer fue exactamente el
  // error de la version web.
  //
  // PENDIENTE: engancharlo al arranque de la aplicacion. Hoy usePrecargaModelo crea
  // un MotorVosk a mano y no mira este. Va en su propia tarea, no en esta.
  async precargarModelo(): Promise<void> {
    await Nativo.iniciar()
    this.modeloCargado = true
  }

  async iniciar(_opciones: { lang: string }): Promise<void> {
    // El idioma no se elige: el modelo que viaja en el APK es el de espanol. Recibir
    // el parametro y no usarlo es correcto -lo pide la interfaz-, inventar que se
    // puede cambiar seria mentir.
    void _opciones

    await this.precargarModelo()

    this.suscripciones.push(
      await Nativo.addListener('parcial', (d) => {
        const texto = textoDe(d.json, 'partial')
        this.anotarLlegada(d.llegadaEpochMs, false)
        this.anotarPalabras(d.json, false)
        if (texto.trim()) {
          this.listenersParcial.forEach((cb) => cb({ texto }))
        }
      })
    )

    this.suscripciones.push(
      await Nativo.addListener('final', (d) => {
        const texto = textoDe(d.json, 'text')
        this.anotarLlegada(d.llegadaEpochMs, true)
        this.anotarPalabras(d.json, true)
        if (texto.trim()) {
          // Vosk nativo no entrega marcas de tiempo por palabra salvo que se le pida
          // -setWords(true)-, y no se le pide: el motor de lectura no las usa. Se
          // marca el instante de llegada, igual que hacia la version WASM.
          const ahora = Date.now()
          this.listenersFinal.forEach((cb) => cb({ texto, inicioMs: ahora, finMs: ahora }))
        }
      })
    )

    this.suscripciones.push(
      await Nativo.addListener('error', (d) => {
        const err = new Error(d.mensaje || 'Error del reconocedor nativo')
        this.listenersError.forEach((cb) => cb(err))
      })
    )

    // SpeechService corta solo tras un rato sin voz. En una lectura a camara hay
    // pausas largas, asi que NO se trata como error ni se detiene nada: se ignora.
    // Si esto resulta ser un problema en una lectura larga, se vera midiendo.
    this.suscripciones.push(await Nativo.addListener('silencio', () => {}))

    const r = await Nativo.escuchar()
    // Date.now() y performance.now() avanzan juntos: la diferencia entre los dos
    // pasa el instante del telefono al reloj de la aplicacion.
    const inicioEpochMs = r && typeof r.inicioEpochMs === 'number' ? r.inicioEpochMs : Date.now()
    this.ceroAudioPerf = inicioEpochMs - (Date.now() - performance.now())
  }

  // CUANDO SALIO DEL LADO NATIVO, AL REGISTRO. Con 'oyo' -cuando llego aca- separa
  // lo que tarda Vosk de lo que tarda el cruce a JavaScript.
  private anotarLlegada(llegadaEpochMs: number | undefined, final: boolean): void {
    if (typeof llegadaEpochMs !== 'number') return
    anotar({ tipo: 'llegada', final, nativo: msDelRegistro(llegadaEpochMs - (Date.now() - performance.now())) })
  }

  // LAS PALABRAS CON SU TIEMPO, AL REGISTRO. Vosk las entrega con setWords en
  // "result" -finales- y con setPartialWords en "partial_result" -parciales-, en
  // segundos desde el arranque del audio. No cambian nada de lo que hace el motor:
  // son la vara para medirlo.
  //
  // Los parciales ya no traen palabras con tiempo: setPartialWords los retrasaba 1,4 s
  // -VoskNativoPlugin.java-. Solo los finales las traen.
  private anotarPalabras(json: string, final: boolean): void {
    if (this.ceroAudioPerf === null) return
    try {
      const o = JSON.parse(json)
      const lista = final ? o.result : o.partial_result
      if (!Array.isArray(lista) || lista.length === 0) return
      const cero = this.ceroAudioPerf
      anotar({
        tipo: 'palabras',
        final,
        palabras: lista.map((p: { word: string; start: number; end: number }) => ({
          w: String(p.word),
          ini: msDelRegistro(cero + p.start * 1000),
          fin: msDelRegistro(cero + p.end * 1000)
        }))
      })
    } catch {
      // Un JSON raro no puede tumbar la lectura: la vara es opcional.
    }
  }

  async detener(): Promise<void> {
    this.ceroAudioPerf = null
    await Nativo.detener()
    for (const s of this.suscripciones) {
      await s.remove()
    }
    this.suscripciones = []
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
