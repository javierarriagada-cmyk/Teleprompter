import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core'
import { EventoFinal, EventoParcial, MotorDeVoz, ResultadoVoz } from './MotorDeVoz'
import { anotar, msDelRegistro, generacionDiagnostico } from '../lib/diagnostico'
import { HERRAMIENTAS } from '../lib/herramientas'

// EL AUDIO QUE ESCUCHO VOSK, GUARDADO -24-09-2026-. Es el instrumento del plan del
// motor: con el se afina el reconocedor en el PC contra lecturas reales. Quedan los
// ultimos 12 en files/oido, 1,9 MB por minuto. Se revisa antes de llevar esto a una
// version para usuarios.
// EN PLAY, NUNCA -tarea 84, B2, 29-09-2026-: ese audio no se guarda en el teléfono de la gente.
// Sigue en true en la APK de prueba -src/lib/herramientas.ts-.
const GUARDAR_AUDIO_DEL_OIDO = HERRAMIENTAS

type DatosResultado = {
  json: string
  llegadaEpochMs?: number
  audioFinMs?: number
  leidoEpochMs?: number
  procesadoEpochMs?: number
  rms?: number
  relevos?: number
}

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
  // 'es' o 'en': el plugin carga assets/model-es o assets/model-en -docs/ingles.txt D3-.
  iniciar(opciones?: { idioma?: 'es' | 'en' }): Promise<void>
  escuchar(opciones?: { guardarAudio?: boolean; fuente?: string; frecuenciaMic?: number }): Promise<{ inicioEpochMs?: number; rutaAudio?: string; muestrasPorTrozo?: number } | void>
  detener(): Promise<void>
  abrirAjustesDeLaApp(): Promise<void>
  // Los pone Capacitor solo, por el @Permission del plugin -alias 'microfono'-.
  checkPermissions(): Promise<{ microfono: string }>
  requestPermissions(opciones?: { permissions: Array<'microfono'> }): Promise<{ microfono: string }>
  addListener(
    eventName: 'parcial' | 'final',
    listener: (data: DatosResultado) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'error',
    listener: (data: { mensaje: string }) => void
  ): Promise<PluginListenerHandle>
  addListener(eventName: 'silencio', listener: () => void): Promise<PluginListenerHandle>
  // El avance de la descarga del modelo desde Play, de 0 a 1 -tarea 84, D3-.
  addListener(eventName: 'progresoVoz', listener: (data: { idioma: string; progreso: number }) => void): Promise<PluginListenerHandle>
  // Resuelve cuando el modelo del idioma está en el teléfono; rechaza con code 'SIN_CONEXION' si
  // hay que bajarlo y no hay internet -VoskNativoPlugin.asegurarVoz, tarea 84-.
  asegurarVoz(opciones: { idioma: 'es' | 'en' }): Promise<{ estado: string; descargada?: boolean }>
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
  // Para anotar el arranque del oido en cada registro nuevo: la toma enciende el
  // registro DESPUES de que el oido arranco.
  private oidoInfo: { ruta: string; muestrasPorTrozo: number } | null = null
  private oidoAnotadoEn = -1

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
  // HECHO el 28-09-2026: precargar(), mas abajo, lo llama App.tsx al abrir y al cambiar de guion.
  async precargarModelo(idioma: 'es' | 'en' = 'es'): Promise<void> {
    // El plugin sabe que modelo tiene cargado: si es el mismo idioma no hace nada, y si es
    // otro lo cambia -VoskNativoPlugin.iniciar-.
    //
    // EN FILA, NUNCA DOS A LA VEZ -28-09-2026-. Desde que el modelo se precarga al abrir la
    // app, Leer puede pedirlo mientras la precarga todavia desempaqueta. El plugin guarda UNA
    // sola llamada pendiente -llamadaIniciar-: la segunda pisaria a la primera, que no
    // terminaria nunca, y se cargarian dos modelos. Encadenadas, la segunda espera y, si es el
    // mismo idioma, vuelve al instante.
    const turno = this.filaDeCarga.then(() => Nativo.iniciar({ idioma }))
    this.filaDeCarga = turno.catch(() => {})
    await turno
    this.modeloCargado = true
  }

  private filaDeCarga: Promise<void> = Promise.resolve()

  // PRECARGA EN SILENCIO -28-09-2026-. Medido con una instalacion limpia en el emulador: la
  // primera lectura desempaquetaba el modelo DESPUES de apretar Empezar, y el permiso del
  // microfono aparecia con el reloj de la lectura ya en 00:04, tapando el guion. Ahora se
  // carga al abrir la app y al cambiar de guion. Si falla no se dice nada: Leer lo vuelve a
  // intentar y ahi el error si se ve.
  async precargar(lang: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    const idioma: 'es' | 'en' = (lang || '').toLowerCase().startsWith('en') ? 'en' : 'es'
    try {
      await this.precargarModelo(idioma)
    } catch {
      // Tambien llega aca si piden otro idioma con el microfono abierto: no toca nada.
    }
  }

  // EL PERMISO ANTES DE LA CUENTA -28-09-2026-. Lo pedia escuchar(), que llega despues de
  // desempaquetar el modelo: en la primera lectura el cartel aparecia con la toma andando.
  // Pedido aca, la persona lo ve al apretar Empezar, lo resuelve, y recien ahi parte el 3, 2, 1.
  // Android no lo vuelve a mostrar una vez dado.
  async pedirMicrofono(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true
    try {
      const ya = await Nativo.checkPermissions()
      if (ya.microfono === 'granted') return true
      const r = await Nativo.requestPermissions({ permissions: ['microfono'] })
      return r.microfono === 'granted'
    } catch {
      // Si no se puede preguntar, escuchar() lo pide como siempre: leer no se bloquea.
      return true
    }
  }

  // EL MODELO DEL IDIOMA, EN EL TELÉFONO ANTES DE LA CUENTA -tarea 84, D3, 29-09-2026-.
  //
  // En la APK de prueba los dos modelos vienen dentro y esto vuelve al instante. En la versión de
  // Play el inglés viaja aparte y se pide a Play la primera vez: el plugin avisa el avance con
  // 'progresoVoz' y App lo muestra en el IndicadorPrecarga. Sin internet responde 'sin-conexion' y
  // App dice que hace falta conexión una vez; la lectura no parte. Cualquier otro error se lanza:
  // App lo muestra, nunca en silencio.
  async asegurarVoz(lang: string, alProgreso: (fraccion: number) => void): Promise<ResultadoVoz> {
    if (!Capacitor.isNativePlatform()) return 'lista'
    const idioma: 'es' | 'en' = (lang || '').toLowerCase().startsWith('en') ? 'en' : 'es'
    const oyente = await Nativo.addListener('progresoVoz', (d) => {
      if (d && typeof d.progreso === 'number') alProgreso(d.progreso)
    })
    try {
      await Nativo.asegurarVoz({ idioma })
      return 'lista'
    } catch (e: any) {
      if (e && e.code === 'SIN_CONEXION') return 'sin-conexion'
      throw e
    } finally {
      oyente.remove()
    }
  }

  // Abre la pantalla de ajustes de la app en Android si se nego el permiso -28-09-2026-.
  async abrirAjustesDeLaApp(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Nativo.abrirAjustesDeLaApp()
    } catch (e) {
      console.warn('[MotorNativo] Error al abrir ajustes de la app:', e)
    }
  }

  async iniciar(opciones: { lang: string }): Promise<void> {
    // EL IDIOMA DEL GUION ELIGE EL MODELO -27-09-2026, docs/ingles.txt-. Hasta ese dia
    // el APK traia solo el espanol y este parametro se ignoraba a proposito: "inventar
    // que se puede cambiar seria mentir". Ahora viajan los dos, y lang llega de App.tsx
    // como 'es-ES' o 'en-EN' -guion.idioma-. Cualquier otro idioma cae en espanol.
    const idioma: 'es' | 'en' = (opciones?.lang || '').toLowerCase().startsWith('en') ? 'en' : 'es'

    await this.precargarModelo(idioma)

    this.suscripciones.push(
      await Nativo.addListener('parcial', (d) => {
        const texto = textoDe(d.json, 'partial')
        this.anotarLlegada(d, false)
        this.anotarPalabras(d.json, false)
        if (texto.trim()) {
          this.listenersParcial.forEach((cb) => cb({ texto }))
        }
      })
    )

    this.suscripciones.push(
      await Nativo.addListener('final', (d) => {
        const texto = textoDe(d.json, 'text')
        this.anotarLlegada(d, true)
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

    const r = await Nativo.escuchar({ guardarAudio: GUARDAR_AUDIO_DEL_OIDO })
    this.oidoInfo = r && r.rutaAudio ? { ruta: r.rutaAudio, muestrasPorTrozo: r.muestrasPorTrozo ?? 0 } : null
    this.oidoAnotadoEn = -1
    // Date.now() y performance.now() avanzan juntos: la diferencia entre los dos
    // pasa el instante del telefono al reloj de la aplicacion.
    const inicioEpochMs = r && typeof r.inicioEpochMs === 'number' ? r.inicioEpochMs : Date.now()
    this.ceroAudioPerf = inicioEpochMs - (Date.now() - performance.now())
  }

  // CUANDO SALIO DEL LADO NATIVO, AL REGISTRO. Con 'oyo' -cuando llego aca- separa
  // lo que tarda Vosk de lo que tarda el cruce a JavaScript.
  private anotarLlegada(d: DatosResultado, final: boolean): void {
    if (typeof d.llegadaEpochMs !== 'number') return
    const aRegistro = (epoch: number) => msDelRegistro(epoch - (Date.now() - performance.now()))
    if (this.oidoInfo && this.ceroAudioPerf !== null && this.oidoAnotadoEn !== generacionDiagnostico()) {
      anotar({ tipo: 'oido', inicio: msDelRegistro(this.ceroAudioPerf), ruta: this.oidoInfo.ruta, muestrasPorTrozo: this.oidoInfo.muestrasPorTrozo })
      this.oidoAnotadoEn = generacionDiagnostico()
    }
    anotar({
      tipo: 'llegada',
      final,
      nativo: aRegistro(d.llegadaEpochMs),
      audio: typeof d.audioFinMs === 'number' && this.ceroAudioPerf !== null ? msDelRegistro(this.ceroAudioPerf + d.audioFinMs) : undefined,
      leido: typeof d.leidoEpochMs === 'number' ? aRegistro(d.leidoEpochMs) : undefined,
      procesado: typeof d.procesadoEpochMs === 'number' ? aRegistro(d.procesadoEpochMs) : undefined,
      rms: d.rms,
      relevos: d.relevos
    })
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
