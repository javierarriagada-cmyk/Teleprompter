// EL GRABADOR DEL CORPUS. Paso 1 del plan del motor, acordado con Javier el 13 de
// septiembre de 2026.
//
// NO MEJORA NADA EN PANTALLA. Es el instrumento de medir, y existe porque hasta ahora no
// habia ninguno: todo lo que se midio del motor salio de un simulador escrito por mi, con
// supuestos puestos por mi. Asi no se converge nunca.
//
// Lo que guarda es UNA LECTURA REAL con tres capas sobre EL MISMO RELOJ:
//
//   1. EL AUDIO de lo que se dijo. Sirve para sacar despues, fuera de linea y con la
//      grabacion entera sobre la mesa, en que milisegundo se dijo cada palabra. Eso se
//      llama alineamiento forzado y NO es transcripcion: el guion ya se conoce, lo unico
//      que hay que decidir es CUANDO cae cada palabra que ya esta escrita. Es un problema
//      mucho mas facil, y el que alinea puede mirar hacia adelante y hacia atras, cosa que
//      el motor en vivo no puede. Por eso sirve de vara y el motor no puede medirse solo.
//
//   2. QUE ENTREGO EL RECONOCEDOR y QUE HIZO EL SEGUIDOR con eso. Ya lo guardaba
//      diagnostico.ts -capas 'oyo' y 'calce'-; aca solo se enciende.
//
//   3. QUE ESTABA MOSTRANDO EL TELEPROMPTER en cada cuadro. Esta capa -'cuadro'- estaba
//      definida en diagnostico.ts pero NADIE LA ESCRIBIA. Se agrega la llamada en el lazo
//      de animacion de la vista.
//
// Con las tres, la medida que importa es una resta: posicion mostrada menos posicion
// realmente dicha, cada decima de segundo. Positivo adelantado, negativo atrasado. Eso
// reemplaza "se siente mal" por una curva.
//
//
// EL RELOJ, QUE ES LA PARTE DELICADA
// ==================================
//
// Si las tres capas no comparten origen, todo lo demas mide mentiras. La regla es una
// sola: EL CERO ES EL INSTANTE EN QUE EMPIEZA EL AUDIO. Por eso activarDiagnostico(true)
// -que reinicia su propio t0- se llama DENTRO de onstart del grabador, no antes ni
// despues. A partir de ahi, el milisegundo N del registro es el milisegundo N del archivo
// de audio.
//
// Queda un error residual conocido y lo digo en vez de esconderlo: entre que el navegador
// dice "empece a grabar" y la primera muestra de sonido que de verdad queda escrita hay
// una latencia que no se puede leer desde aca. En los navegadores que probamos es de unas
// decenas de milisegundos; a 150 palabras por minuto una palabra dura 400 ms, asi que eso
// es como un octavo de palabra. NO SE DA POR BUENO: el plan incluye comprobar a mano diez
// palabras repartidas contra el audio antes de creerle a esta vara. Si apareciera un
// desfase parejo, se corrige con un corrimiento y se anota aca.

import { activarDiagnostico, comoTexto, cantidadEntradas } from './diagnostico'
import { bloquearRecargaAutomatica } from './actualizacion'
import { guardarLectura } from './almacenCorpus'

export type EstadoGrabador = 'inactivo' | 'pidiendo-permiso' | 'grabando' | 'guardando' | 'listo' | 'error'

export type MetadatosCorpus = {
  guionTitulo: string
  guionTexto: string
  motor: string
  ppmNominal?: number
}

let estadoActual: EstadoGrabador = 'inactivo'
let grabador: MediaRecorder | null = null
let pistas: MediaStreamTrack[] = []
let trozos: BlobPart[] = []
let audioBlob: Blob | null = null
let tipoAudio = ''
let metadatos: MetadatosCorpus | null = null
let inicioReloj = ''
let ultimoError = ''
let tArranqueMs = 0
let promesaGuardado: Promise<void> | null = null

export function estadoGrabador(): EstadoGrabador {
  return estadoActual
}

export function errorGrabador(): string {
  return ultimoError
}

// De los formatos que el navegador acepte, el primero que sirva. En Chrome de Android sale
// webm/opus; en otros, mp4. Cualquiera vale: el alineador de la otra punta los abre.
function elegirTipo(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidatos = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ]
  for (const t of candidatos) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t
    } catch (e) {
      // seguir probando
    }
  }
  return ''
}

export async function iniciarGrabacion(meta: MetadatosCorpus): Promise<void> {
  if (estadoActual === 'grabando') return

  ultimoError = ''
  tArranqueMs = 0
  promesaGuardado = null
  audioBlob = null
  trozos = []
  metadatos = meta
  estadoActual = 'pidiendo-permiso'

  try {
    // El audio se pide CRUDO a proposito. La cancelacion de eco y la supresion de ruido
    // recortan el comienzo de las palabras, y eso corre en el tiempo justo lo que venimos
    // a medir. Para escuchar no importa; para alinear si.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
    pistas = stream.getTracks()

    tipoAudio = elegirTipo()
    grabador = tipoAudio ? new MediaRecorder(stream, { mimeType: tipoAudio }) : new MediaRecorder(stream)

    grabador.ondataavailable = (ev: BlobEvent) => {
      if (ev.data && ev.data.size > 0) trozos.push(ev.data)
    }

    grabador.onstart = () => {
      // ACA, Y SOLO ACA, ARRANCA EL RELOJ COMPARTIDO. Ver la nota de arriba.
      inicioReloj = new Date().toISOString()
      tArranqueMs = performance.now()
      activarDiagnostico(true)
      bloquearRecargaAutomatica('grabando-corpus', true)
      estadoActual = 'grabando'
    }

    grabador.onerror = (ev: any) => {
      ultimoError = (ev && ev.error && ev.error.message) || 'fallo del grabador'
      estadoActual = 'error'
    }

    grabador.onstop = () => {
      audioBlob = new Blob(trozos, { type: tipoAudio || 'audio/webm' })
      const textoRegistro = registroComoTexto()
      const segundos = Math.round((performance.now() - tArranqueMs) / 1000)
      activarDiagnostico(false)
      for (const p of pistas) {
        try { p.stop() } catch (e) {}
      }
      pistas = []
      estadoActual = 'guardando'

      // SE GUARDA APENAS TERMINA, SIN ESPERAR A QUE NADIE APRIETE NADA.
      //
      // El 13 de septiembre de 2026 se perdieron dos o tres lecturas de Javier porque la
      // grabacion vivia solo en memoria y el boton para bajarla estaba dentro de los
      // controles, que se esconden al leer y no volvian nunca. Una lectura leida en voz
      // alta no se puede repetir a voluntad: cuesta minutos de una persona, no un clic.
      // Asi que se guarda sola, y bajarla despues es opcional.
      promesaGuardado = guardarLectura({
        id: `${Date.now()}`,
        fecha: Date.now(),
        guionTitulo: meta.guionTitulo,
        motor: meta.motor,
        audio: audioBlob,
        extension: tipoAudio.includes('mp4') ? 'm4a' : tipoAudio.includes('ogg') ? 'ogg' : 'webm',
        registro: textoRegistro,
        segundos
      })
        .then(() => {
          estadoActual = 'listo'
        })
        .catch((e) => {
          ultimoError = 'la lectura se grabó pero no se pudo guardar: ' + (e && e.message ? e.message : String(e))
          estadoActual = 'listo'
        })
        .finally(() => {
          // La recarga se suelta DESPUES de guardar, no antes: si se soltara antes, una
          // actualizacion pendiente podria recargar la pagina justo mientras se escribe.
          bloquearRecargaAutomatica('grabando-corpus', false)
        })
    }

    grabador.start(1000)
  } catch (e: any) {
    ultimoError = e && e.message ? e.message : String(e)
    estadoActual = 'error'
    throw e
  }
}

export async function detenerGrabacion(): Promise<void> {
  if (!grabador || estadoActual !== 'grabando') return
  await new Promise<void>((resolve) => {
    const g = grabador as MediaRecorder
    const previo = g.onstop
    g.onstop = (ev: Event) => {
      if (previo) (previo as any).call(g, ev)
      resolve()
    }
    try {
      g.stop()
    } catch (e) {
      resolve()
    }
  })
  grabador = null

  // Y NO SE VUELVE HASTA QUE LA LECTURA ESTA GUARDADA.
  //
  // La primera version devolvia apenas paraba el grabador y dejaba el guardado corriendo
  // por su cuenta. Eso es una promesa rota: quien llama a detenerGrabacion() y espera cree
  // que al volver ya esta todo a salvo, y no lo estaba. Peor todavia con la recarga
  // automatica de por medio, que podia aplicarse justo en el hueco.
  if (promesaGuardado) {
    await promesaGuardado
  }
}

// El texto que acompana al audio. Va aparte y en texto plano a proposito: tiene que poder
// leerse sin la aplicacion, dentro de seis meses, sin depender de nada nuestro.
export function registroComoTexto(): string {
  const m = metadatos
  const cabecera = [
    '# CORPUS DE LECTURA - Teleprompter',
    '#',
    '# El milisegundo 0 de este registro es el milisegundo 0 del archivo de audio que lo',
    '# acompana. Las dos cosas arrancan juntas, en onstart del grabador.',
    '#',
    `# grabado:        ${inicioReloj}`,
    `# guion:          ${m ? m.guionTitulo : '(sin titulo)'}`,
    `# motor de voz:   ${m ? m.motor : '(desconocido)'}`,
    `# formato audio:  ${tipoAudio || '(por omision del navegador)'}`,
    `# navegador:      ${typeof navigator !== 'undefined' ? navigator.userAgent : '(desconocido)'}`,
    `# entradas:       ${cantidadEntradas()}`,
    '#',
    '# capas:  oyo    = lo que entrego el reconocedor, textual',
    '#         calce  = en que palabra del guion lo ubico el seguidor, o si no lo ubico',
    '#         cuadro = que posicion estaba mostrando la pantalla en ese instante',
    '#',
    '# ---------- GUION, TAL CUAL SE LEYO ----------',
    ...(m ? m.guionTexto.split(/\r?\n/).map((l) => `# | ${l}`) : []),
    '# ---------------------------------------------',
    ''
  ].join('\n')

  return cabecera + comoTexto()
}

function nombreBase(): string {
  const f = new Date()
  const dd = (n: number) => String(n).padStart(2, '0')
  return `lectura-${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}-${dd(f.getHours())}${dd(f.getMinutes())}`
}

function bajarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Dos archivos con el mismo nombre y distinta extension, para que no se despareje el par.
export function descargarCorpus(): void {
  const base = nombreBase()
  if (audioBlob) {
    const ext = tipoAudio.includes('mp4') ? 'm4a' : tipoAudio.includes('ogg') ? 'ogg' : 'webm'
    bajarBlob(audioBlob, `${base}.${ext}`)
  }
  bajarBlob(new Blob([registroComoTexto()], { type: 'text/plain;charset=utf-8' }), `${base}.txt`)
}

export function hayCorpus(): boolean {
  return !!audioBlob
}

// El grabador guarda su estado a nivel de modulo -es uno solo por pagina, como el
// microfono-, asi que entre una prueba y la siguiente ese estado queda vivo y la segunda
// hereda lo que dejo la primera. Esto lo borra. No lo usa la aplicacion.
export function reiniciarGrabadorParaPruebas(): void {
  estadoActual = 'inactivo'
  grabador = null
  pistas = []
  trozos = []
  audioBlob = null
  tipoAudio = ''
  metadatos = null
  inicioReloj = ''
  ultimoError = ''
  promesaGuardado = null
}
