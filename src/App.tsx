import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import useASR from './hooks/useASR'
import { useSeguidor } from './hooks/useSeguidor'
import { useWakeLock } from './hooks/useWakeLock'
import { usePrecargaModelo } from './hooks/usePrecargaModelo'
import TeleprompterView from './components/TeleprompterView'
import BarraDeTiempo from './components/BarraDeTiempo'
import { PanelCorpus } from './components/PanelCorpus'
import { bloquearRecargaAutomatica } from './lib/actualizacion'
import { iniciarGrabacion, detenerGrabacion } from './lib/grabadorCorpus'
import BibliotecaView from './components/BibliotecaView'
import EditorView from './components/EditorView'
import CuentaRegresiva from './components/CuentaRegresiva'
import { Entrada } from './components/Entrada'
import { Pantalla, movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_NORMAL, CURVA_RESORTE } from './components/movimiento'
import { encenderCamara, apagarCamara, camaraEncendida, ladoActual, LadoCamara, obtenerCalidadesSoportadas, fijarCalidadVideo } from './lib/camara'
import { obtenerEspacioLibre } from './lib/archivosNativos'
import { calcularMinutosDisponibles } from './lib/espacio'
import { hapticaToqueMedio, hapticaToqueSuave, hapticaSeleccion } from './haptica'
import { IdMotor, MotorDeVoz } from './motor/MotorDeVoz'
import { Guion, Bloque, TramoFormato, ResumenGuion, ResumenGrabacion, guionNuevo, generarUuid, PAREJAS_COLOR } from './datos/modelo'
import { RepositorioGuiones } from './datos/RepositorioGuiones'
import { RepositorioIndexedDB } from './datos/RepositorioIndexedDB'
import { RepositorioMemoria } from './datos/RepositorioMemoria'
import { RepositorioGrabaciones } from './datos/RepositorioGrabaciones'
import { RepositorioGrabacionesIndexedDB } from './datos/RepositorioGrabacionesIndexedDB'
import { RepositorioGrabacionesMemoria } from './datos/RepositorioGrabacionesMemoria'
import ReproductorGrabacion from './components/ReproductorGrabacion'
import {
  iniciarTomaVideo,
  cortarTomaVideo,
  recuperarTomasPendientes,
  quitarTomasSinVideo,
  tomaEnCurso,
  anotarFraseOida,
  borrarGrabacionEnDisco
} from './lib/tomaVideo'
import { IconoAtras, IconoPausa, IconoParar, IconoTacho, IconoEmpezar } from './components/IconosApp'
import { t, useTextos, TITULO_SIN_NOMBRE } from './textos'
import { IdiomaApp, idiomaApp, leerIdiomaDelTelefono } from './lib/idioma'

// Cuanto se quedan los controles a la vista despues de un toque, mientras se lee.
const MS_CONTROLES_A_LA_VISTA = 4000

interface AppProps {
  motor?: MotorDeVoz
  repoOverride?: RepositorioGuiones
}

type Vista = 'biblioteca' | 'editor' | 'lectura'
type EstadoToma = 'listo' | 'leyendo'

const GUION_VACIO: Guion = {
  id: 'vacio',
  titulo: '',
  idioma: 'es',
  creado: 0,
  modificado: 0,
  archivado: false,
  bloques: []
}

const PASOS_LETRA = [14, 18, 24, 32, 42]
const MOTORES_VALIDOS: IdMotor[] = ['vosk', 'nativo', 'fake']

export type FondoToma = 'detras' | 'recuadro' | 'oculta'

export { PAREJAS_COLOR }

export function sanitizarColores(rawFondo: any, rawLetra: any): { colorFondo: string; colorLetra: string } {
  if (typeof rawFondo === 'string' && typeof rawLetra === 'string') {
    const f = rawFondo.toUpperCase()
    const l = rawLetra.toUpperCase()
    const coincide = PAREJAS_COLOR.find((p) => p.fondo.toUpperCase() === f && p.letra.toUpperCase() === l)
    if (coincide) {
      return { colorFondo: coincide.fondo, colorLetra: coincide.letra }
    }
  }
  return { colorFondo: PAREJAS_COLOR[0].fondo, colorLetra: PAREJAS_COLOR[0].letra }
}

function sanitizarEngine(rawEngine: any): IdMotor {
  if (rawEngine && MOTORES_VALIDOS.includes(rawEngine)) {
    return rawEngine
  }
  return Capacitor.isNativePlatform() ? 'nativo' : 'vosk'
}

function cargarAjustesGuardados() {
  try {
    const raw = localStorage.getItem('teleprompter_ajustes')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
  }
  return null
}

function ajustarFuenteValida(val: any): number {
  const num = Number(val)
  if (isNaN(num)) return 24
  if (PASOS_LETRA.includes(num)) return num
  const masCercano = PASOS_LETRA.reduce((prev, curr) =>
    Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
  )
  return masCercano
}

// EL GUION "HOLA": el que ya viene puesto la primera vez. Los tramos se calculan buscando
// las palabras en el texto, asi el texto se puede retocar sin contar caracteres a mano.
//
// EN LOS DOS IDIOMAS -tarea 75, 27-09-2026-: se crea en el idioma de la app. El ingles es el de
// docs/ingles.txt, seccion 5, LETRA POR LETRA -lo escribio Claude y lo revisa la traductora de
// Javier-; si se retoca, se retoca alla primero. Mismos formatos que el espanol, sobre las
// palabras que los nombran.
export function tituloDeBienvenida(idioma: IdiomaApp): string {
  return idioma === 'es' ? 'Hola' : 'Hi'
}

export function bloqueDeBienvenida(idioma: IdiomaApp): Bloque {
  return idioma === 'es' ? bienvenidaEspanol() : bienvenidaIngles()
}

function tramosSobre(texto: string, marcas: Array<[string, Omit<TramoFormato, 'desde' | 'hasta'>]>): TramoFormato[] {
  const tramo = (frase: string, formato: Omit<TramoFormato, 'desde' | 'hasta'>): TramoFormato => {
    const desde = texto.indexOf(frase)
    return { desde, hasta: desde + frase.length, ...formato }
  }
  // Si alguien retoca el texto y una de estas palabras deja de estar, su tramo se cae en vez
  // de pintar desde el caracter -1.
  return marcas.map(([frase, formato]) => tramo(frase, formato)).filter((t) => t.desde >= 0).sort((a, b) => a.desde - b.desde)
}

function bienvenidaEspanol(): Bloque {
  const texto = [
    'Hola. Lee esto en voz alta, con o sin apuro, como prefieras.',
    '',
    'Ahora fíjate en el texto. Se está moviendo solo, al ritmo en que hablas, sin que toques nada. La línea suave bajo las palabras te muestra por dónde vas.',
    '',
    'Si te detienes a pensar, el texto te espera. Cuando vuelves a hablar, sigue contigo.',
    '',
    'Lo que escribes entre corchetes es una nota solo para ti. Se ve en la pantalla, pero no hace falta leerla en voz alta. [Como esta: respira y sonríe.]',
    '',
    'Tu guion también puede ayudarte a leer mejor. Marca en negrita lo que quieres decir con más fuerza. Pinta palabras en ámbar, en celeste o en verde para distinguir ideas o cambios de tono. Y usa el destacado amarillo para lo que no se te puede pasar. Basta con seleccionar el texto en el editor y elegir.',
    '',
    'En el botón Aa eliges el tamaño de la letra, la tipografía, el ancho de la columna y los colores de la pantalla. Déjalo como te resulte más cómodo.',
    '',
    'Cuando quieras grabarte, toca Grabar. La cámara filma mientras lees, y el texto queda justo bajo el lente, para que tu mirada vaya a la cámara y no a la pantalla. Puedes verte a pantalla completa, detrás del texto, o en un recuadro pequeño. Así sabes cómo te están viendo, sin perder la comodidad para leer.',
    '',
    // SUBTITULOS -26-09-2026, Javier-: el Hola tenia que contarlos antes de la grabacion de
    // prueba. Salen del guion con los tiempos de la voz -lib/subtitulos.ts- y se guardan como se
    // ven -una sola copia en la galeria-.
    'Al terminar, tu video puede llevar subtítulos. Salen de tu guion, al ritmo de tu voz. Elige el estilo que más te guste y guárdalo en tu galería tal como lo ves.',
    '',
    'Te acompaña para darte la comodidad y la tranquilidad que necesitas. Queremos que toda tu concentración esté donde debe estar. No tienes que memorizar. No tienes que apurarte para alcanzar el texto. Puedes transmitir la emoción que quieras, en el momento que quieras.',
    '',
    'Sirve para grabar un video, dar una clase o preparar una entrevista.',
    '',
    'Cuando termines, borra esto y escribe tu propio guion, o pega uno que ya tengas.',
    '',
    // CORREO -26-09-2026-: el del dominio, que Namecheap reenvia al Gmail de Javier. Hasta el
    // 24-09 era el ficticio hola@ejemplo.com que el pidio mientras tanto.
    'Y si algo te gusta, te molesta o se te ocurre cómo mejorarlo, cuéntanos. Tus comentarios son muy valiosos para nosotros. Escríbenos a hola@sigoteleprompter.com. Que te vaya muy bien.'
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    // Si alguien retoca el texto y una de estas palabras deja de estar, su tramo se cae en vez
    // de pintar desde el caracter -1 -tramosSobre, arriba-.
    // Los cinco primeros caen sobre la palabra que nombra su formato. Los demas -26-09-2026,
    // Javier: "ponle colores"- muestran el guion pintado como se usaria de verdad, para la
    // grabacion de prueba. Van ordenados por posicion y sin pisarse.
    tramos: tramosSobre(texto, [
      ['negrita', { negrita: true }],
      ['ámbar', { color: 'ambar' }],
      ['celeste', { color: 'celeste' }],
      ['verde', { color: 'salvia' }],
      ['destacado amarillo', { destacado: true }],
      ['sin que toques nada', { negrita: true }],
      ['el texto te espera', { color: 'celeste' }],
      ['para que tu mirada vaya a la cámara', { color: 'ambar' }],
      ['tal como lo ves', { color: 'salvia' }],
      ['No tienes que memorizar.', { negrita: true }],
      ['en el momento que quieras', { destacado: true }],
      ['hola@sigoteleprompter.com', { color: 'celeste' }]
    ])
  }
}

// El Hola en ingles. Es de docs/ingles.txt, seccion 5, letra por letra -tambien los
// apostrofos rectos: son los que escribe el teclado del telefono-. Los formatos son los que
// esa seccion lista, con el mismo mecanismo. El correo es el ingles -D6-.
function bienvenidaIngles(): Bloque {
  const texto = [
    'Hi. Read this out loud, as slowly or as quickly as you like.',
    '',
    "Now look at the text. It's moving on its own, at the pace you speak, without you touching anything. The soft line under the words shows you where you are.",
    '',
    'If you stop to think, the text waits for you. When you start talking again, it picks up right where you left off.',
    '',
    "Anything you write in square brackets is a note just for you. It shows on the screen, but you don't need to read it out loud. [Like this one: breathe, and smile.]",
    '',
    "Your script can also help you read better. Use bold for what you want to say with more force. Color words in amber, light blue or green to set apart ideas or shifts in tone. And use the yellow highlight for what you can't afford to miss. Just select the text in the editor and pick one.",
    '',
    'With the Aa button you choose the text size, the typeface, the column width and the screen colors. Set it up however feels most comfortable.',
    '',
    'When you want to record yourself, tap Record. The camera films while you read, and the text sits right under the lens, so your eyes go to the camera and not to the screen. You can see yourself full screen, behind the text, or in a small window. That way you know how you look, without giving up the comfort of reading.',
    '',
    "When you're done, your video can have captions. They come from your script, in time with your voice. Pick the style you like best and save it to your gallery just as you see it.",
    '',
    "Sigo is here to give you the comfort and the calm you need. We want all your focus to be where it belongs. You don't have to memorize anything. You don't have to rush to keep up with the text. You can bring whatever emotion you want, whenever you want.",
    '',
    'It works for recording a video, teaching a class or getting ready for an interview.',
    '',
    "When you're done, delete this and write your own script, or paste one you already have.",
    '',
    "And if there's something you like, something that bugs you, or an idea to make it better, let us know. Your feedback means a lot to us. Write to hello@sigoteleprompter.com. All the best."
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    tramos: tramosSobre(texto, [
      ['bold', { negrita: true }],
      ['amber', { color: 'ambar' }],
      ['light blue', { color: 'celeste' }],
      ['green', { color: 'salvia' }],
      ['yellow highlight', { destacado: true }],
      ['without you touching anything', { negrita: true }],
      ['the text waits for you', { color: 'celeste' }],
      ['so your eyes go to the camera', { color: 'ambar' }],
      ['just as you see it', { color: 'salvia' }],
      ["You don't have to memorize anything.", { negrita: true }],
      ['whenever you want', { destacado: true }],
      ['hello@sigoteleprompter.com', { color: 'celeste' }]
    ])
  }
}

export default function App({ motor, repoOverride }: AppProps) {
  // El idioma de la app: al cambiarlo en el cajon de la portada, App y todo lo que cuelga de
  // ella se redibuja con los textos nuevos -textos/index.ts-.
  useTextos()
  const repoRef = useRef<RepositorioGuiones>(repoOverride || new RepositorioIndexedDB())
  const repoGrabacionesRef = useRef<RepositorioGrabaciones>(
    repoOverride ? new RepositorioGrabacionesMemoria() : new RepositorioGrabacionesIndexedDB()
  )
  // LA CARGA INICIAL ES ASINCRONA Y PUEDE TERMINAR CON App YA DESMONTADA. Paso en el CI el
  // 26-09-2026 -corridas 290 y 291-: tarea47 termino, se desarmo el entorno de prueba, y
  // recien ahi la carga de la biblioteca llamo a un setState; React busco window y no estaba.
  // Las 341 pruebas pasaban igual y el CI quedo rojo por ese error suelto, a veces si y a
  // veces no. Cada await de la carga mira esto antes de tocar el estado.
  const montadoRef = useRef<boolean>(true)
  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])
  const [usandoMemoriaFallback, setUsandoMemoriaFallback] = useState<boolean>(false)
  const [errorRepositorio, setErrorRepositorio] = useState<string | null>(null)

  const [mostrarEntrada, setMostrarEntrada] = useState<boolean>(false)
  const [vista, setVista] = useState<Vista>('biblioteca')
  const origenLecturaRef = useRef<'biblioteca' | 'editor'>('editor')
  const [rectTarjeta, setRectTarjeta] = useState<DOMRect | null>(null)
  const prevVistaRef = useRef<Vista | null>(null)
  const [direccion, setDireccion] = useState<'adentro' | 'atras' | 'inicial'>('inicial')
  const guionModificadoRef = useRef<boolean>(false)
  interface AvisoInfo {
    texto: string
    accionTexto?: string
    alEjecutarAccion?: () => void
  }
  const [avisoInfo, setAvisoInfo] = useState<AvisoInfo | null>(null)
  const timerAvisoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarAviso = useCallback((
    msg: string,
    opciones?: { accionTexto?: string; alEjecutarAccion?: () => void; duracionMs?: number }
  ) => {
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
    setAvisoInfo({
      texto: msg,
      accionTexto: opciones?.accionTexto,
      alEjecutarAccion: opciones?.alEjecutarAccion
    })
    const dur = opciones?.duracionMs ?? 2000
    timerAvisoRef.current = setTimeout(() => {
      setAvisoInfo(null)
      timerAvisoRef.current = null
    }, dur)
  }, [])

  const getNivelVista = (v: Vista): number => {
    if (v === 'biblioteca') return 1
    if (v === 'editor') return 2
    return 3
  }

  useEffect(() => {
    if (prevVistaRef.current !== null && prevVistaRef.current !== vista) {
      const prevNivel = getNivelVista(prevVistaRef.current)
      const actualNivel = getNivelVista(vista)
      setDireccion(actualNivel >= prevNivel ? 'adentro' : 'atras')
    }
    prevVistaRef.current = vista
  }, [vista])

  const [guionesResumen, setGuionesResumen] = useState<ResumenGuion[]>([])
  const [guionActual, setGuionActual] = useState<Guion | null>(null)
  const [cargado, setCargado] = useState<boolean>(false)

  // Ajustes persistentes
  const ajustesPrevios = cargarAjustesGuardados() || {}

  // EL MOTOR POR OMISION LO DECIDE EL ENTORNO.
  //
  // Corriendo como APK: VOSK NATIVO. El modelo viaja adentro de la aplicacion y la
  // biblioteca es codigo compilado, asi que no se baja nada y no se arma nada al
  // apretar Leer.
  //
  // Corriendo en un navegador: Vosk WASM, que es lo unico que hay ahi.
  //
  // POR QUE NO SE DEJA VOSK WASM DE OMISION TAMBIEN EN ANDROID. Porque baja 34 MB
  // en CADA lectura. Comprobado el 14 de septiembre de 2026 poniendo el telefono en
  // modo avion: no arranca. En el corpus se ve el efecto -el reconocedor no entrega
  // nada durante los primeros 11 a 13 segundos y la primera palabra que ubica es la
  // 13 o la 15 del guion-, y Javier leia tres renglones a ciegas cada vez.
  //
  // Antes de esto habia que elegir "Nativo (Android)" a mano en el selector. Javier
  // lo hizo y por eso funciono; cualquier otra persona arrancaba con el WASM.
  //
  // Y ANTES DE VOSK, la omision era Web Speech, que en su telefono entrega frases
  // enteras en las pausas y no los parciales densos con los que el motor fue medido:
  // leia con un reconocedor distinto del que estabamos midiendo y ninguno de los dos
  // lo sabia. Por eso la omision no se elige por comodidad, se elige por lo que el
  // motor necesita para funcionar como fue medido.
  //
  // La eleccion guardada del usuario manda sobre todo esto (siempre que sea un motor valido).
  const [engine, setEngine] = useState<IdMotor>(
    sanitizarEngine(ajustesPrevios.engine)
  )
  const [verTranscripcion, setVerTranscripcion] = useState<boolean>(Boolean(ajustesPrevios.verTranscripcion))
  const [mostrarTiempo, setMostrarTiempo] = useState<boolean>(ajustesPrevios.mostrarTiempo !== undefined ? Boolean(ajustesPrevios.mostrarTiempo) : true)
  const [fontSize, setFontSize] = useState<number>(ajustarFuenteValida(ajustesPrevios.fontSize))
  // MARGEN 5% POR OMISION. Javier lo eligio mirando, el 13 de septiembre de 2026: puso 5 y
  // dijo que asi queda bien. Con el tope de 90% que lleva la columna por dentro, 5% de
  // padding deja el texto en el 81% del ancho de la pantalla. Estaba en 10, que da 72%.
  // Desde el 27-09-2026 el tope es 93% -estiloLectura.ts- y el texto queda en ~83,5%.
  const [marginPercent, setMarginPercent] = useState<number>(ajustesPrevios.marginPercent !== undefined ? Number(ajustesPrevios.marginPercent) : 5)
  const [mirror, setMirror] = useState<boolean>(Boolean(ajustesPrevios.mirror))
  const [lineasZona] = useState<number>(ajustesPrevios.lineasZona !== undefined ? Number(ajustesPrevios.lineasZona) : 3)
  // "DONDE LEES" YA NO OFRECE ABAJO. Se fue el 24 de septiembre de 2026; el dueno:
  // "nadie lee abajo". El boton salio de TeleprompterView. Aca queda la consecuencia:
  // a quien lo tenia guardado le cae en arriba, que ya era el valor por omision.
  // banda.ts sigue sabiendo calcular 'abajo' -esta congelado y sus pruebas lo miden-,
  // pero desde la pantalla ya no se puede elegir.
  const [anclajeZona, setAnclajeZona] = useState<'arriba' | 'medio' | 'abajo'>(
    ajustesPrevios.anclajeZona === 'medio' ? 'medio' : 'arriba'
  )
  // DOS TEMAS, NO TRES. "Sistema" se fue el 21 de septiembre de 2026; el motivo
  // esta escrito en BibliotecaView, donde vive el control. Aca solo queda la
  // consecuencia: a quien lo tenia guardado le cae en oscuro, que ya era el
  // valor por omision.
  const [tema, setTema] = useState<'claro' | 'oscuro'>(() => {
    let yaImpuesto = false
    try {
      yaImpuesto = localStorage.getItem('teleprompter_oscuro_impuesto') === 'true'
    } catch (e) {}

    if (!yaImpuesto) {
      try {
        localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
      } catch (e) {}
      return 'oscuro'
    }

    if (ajustesPrevios.tema === 'claro' || ajustesPrevios.tema === 'oscuro') {
      return ajustesPrevios.tema
    }
    return 'oscuro'
  })

  // COLUMNA ANCHA POR OMISION. Estaba en angosta y Javier lo pregunto el 13 de septiembre
  // de 2026: la angosta es una opcion para quien la quiera, no el punto de partida. En un
  // telefono la angosta deja tres o cuatro palabras por renglon y obliga a saltar de linea
  // todo el tiempo. Y ahora la eleccion se recuerda, como el resto de los ajustes.
  const [columnaAngosta, setColumnaAngosta] = useState<boolean>(
    ajustesPrevios.columnaAngosta !== undefined ? Boolean(ajustesPrevios.columnaAngosta) : false
  )

  // lado: lo que recuerda Voltear. Se persiste.
  // conCamara: de ESTA entrada. Lo pone la puerta. No se persiste.
  // El que solo lee no pide permiso ni enciende la camara.
  const [ladoCamara, setLadoCamara] = useState<LadoCamara>(() => {
    if (ajustesPrevios.ladoCamara === 'trasera' || ajustesPrevios.ladoCamara === 'frontal') {
      return ajustesPrevios.ladoCamara
    }
    if (ajustesPrevios.modoCamara === 'trasera' || ajustesPrevios.modoCamara === 'frontal') {
      return ajustesPrevios.modoCamara
    }
    return 'frontal'
  })
  const [conCamara, setConCamara] = useState<boolean>(false)
  const [estadoToma, setEstadoToma] = useState<EstadoToma>('listo')
  const [fondoToma, setFondoToma] = useState<FondoToma>(
    (ajustesPrevios.fondoToma === 'recuadro' || ajustesPrevios.fondoToma === 'oculta')
      ? ajustesPrevios.fondoToma
      : 'detras'
  )
  const [recuadroX, setRecuadroX] = useState<number>(
    typeof ajustesPrevios.recuadroX === 'number' ? ajustesPrevios.recuadroX : 0.64
  )
  const [recuadroY, setRecuadroY] = useState<number>(
    typeof ajustesPrevios.recuadroY === 'number' ? ajustesPrevios.recuadroY : 0.52
  )
  const [calidadVideo, setCalidadVideo] = useState<string>(
    typeof ajustesPrevios.calidadVideo === 'string' ? ajustesPrevios.calidadVideo : '1080p'
  )
  const [calidadesSoportadas, setCalidadesSoportadas] = useState<string[]>(['1080p', '720p', '480p'])
  const [bytesLibres, setBytesLibres] = useState<number | null>(null)

  const coloresIniciales = sanitizarColores(ajustesPrevios.colorFondo, ajustesPrevios.colorLetra)
  const [colorFondo, setColorFondo] = useState<string>(coloresIniciales.colorFondo)
  const [colorLetra, setColorLetra] = useState<string>(coloresIniciales.colorLetra)
  const [tipoFuente, setTipoFuente] = useState<'sans' | 'serif'>(
    ajustesPrevios.tipoFuente === 'serif' ? 'serif' : 'sans'
  )

  // Mientras estemos arreglando el motor, toda lectura se mide. Se puede apagar si
  // alguna vez estorba, pero la omision es medir.
  const [medirLectura, setMedirLectura] = useState<boolean>(true)
  const [modoManual, setModoManual] = useState<boolean>(false)
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState<boolean>(false)
  const [mostrarPanelCorpus, setMostrarPanelCorpus] = useState<boolean>(false)
  const [camaraActiva, setCamaraActiva] = useState<boolean>(false)
  const [grabaciones, setGrabaciones] = useState<ResumenGrabacion[]>([])
  const [grabandoVideo, setGrabandoVideo] = useState<boolean>(false)
  const [grabacionAbierta, setGrabacionAbierta] = useState<ResumenGrabacion | null>(null)
  const grabandoVideoRef = useRef<boolean>(false)

  const { estado: estadoPrecarga, progreso: progresoPrecarga, error: errorPrecarga, reintentar: reintentarPrecarga } = usePrecargaModelo(engine)

  // Sincronizar tema con documentElement
  useEffect(() => {
    if (tema === 'claro' || tema === 'oscuro') {
      document.documentElement.setAttribute('data-tema', tema)
    } else {
      document.documentElement.removeAttribute('data-tema')
    }
  }, [tema])

  // Guardar ajustes en localStorage ante cambios
  useEffect(() => {
    try {
      const objetoAjustes = {
        fontSize,
        marginPercent,
        mirror,
        lineasZona,
        anclajeZona,
        mostrarTiempo,
        verTranscripcion,
        tema,
        engine,
        columnaAngosta,
        colorFondo,
        colorLetra,
        tipoFuente,
        ladoCamara,
        modoCamara: ladoCamara,
        fondoToma,
        recuadroX,
        recuadroY,
        calidadVideo
      }
      localStorage.setItem('teleprompter_ajustes', JSON.stringify(objetoAjustes))
    } catch (e) {
    }
  }, [fontSize, marginPercent, mirror, lineasZona, anclajeZona, mostrarTiempo, verTranscripcion, tema, engine, columnaAngosta, colorFondo, colorLetra, tipoFuente, ladoCamara, fondoToma, recuadroX, recuadroY, calidadVideo])

  useEffect(() => {
    if (vista === 'lectura' && estadoToma === 'listo' && conCamara) {
      obtenerCalidadesSoportadas().then((s) => {
        setCalidadesSoportadas(s)
        if (!s.includes(calidadVideo)) {
          const nueva = s.includes('1080p') ? '1080p' : s[0] || '1080p'
          setCalidadVideo(nueva)
          fijarCalidadVideo(nueva)
        } else {
          fijarCalidadVideo(calidadVideo)
        }
      })
      obtenerEspacioLibre().then((b) => setBytesLibres(b))
    }
  }, [vista, estadoToma, conCamara, calidadVideo])

  const cargarBiblioteca = useCallback(async () => {
    let repo = repoRef.current
    try {
      const lista = await repo.listar()
      if (!montadoRef.current) return
      setGuionesResumen(lista)
    } catch (e) {
      if (!montadoRef.current) return
      console.warn('[App] Error al acceder a RepositorioIndexedDB, cayendo a RepositorioMemoria:', e)
      repo = new RepositorioMemoria()
      repoRef.current = repo
      repoGrabacionesRef.current = new RepositorioGrabacionesMemoria()
      setUsandoMemoriaFallback(true)
      setErrorRepositorio('IndexedDB no está disponible; se está usando almacenamiento en memoria.')
      try {
        const lista = await repo.listar()
        if (!montadoRef.current) return
        setGuionesResumen(lista)
      } catch (err) {
        console.warn('[App] Error al listar de RepositorioMemoria:', err)
      }
    }
  }, [])

  // Cargar/Migrar al arrancar
  useEffect(() => {
    async function inicializar() {
      // Primero el idioma que Android tiene para la app -si esta el plugin-: el guion Hola
      // de mas abajo se crea en ese idioma.
      await leerIdiomaDelTelefono()
      if (!montadoRef.current) return
      // Verificar si el repositorio funciona o caer a fallback si no está disponible
      try {
        await repoRef.current.listar()
      } catch (e) {
        if (!montadoRef.current) return
        console.warn('[App] Error al acceder a RepositorioIndexedDB, cayendo a RepositorioMemoria:', e)
        repoRef.current = new RepositorioMemoria()
        repoGrabacionesRef.current = new RepositorioGrabacionesMemoria()
        setUsandoMemoriaFallback(true)
        setErrorRepositorio('IndexedDB no está disponible; se está usando almacenamiento en memoria.')
      }

      let textoViejo: string | null = null
      try {
        textoViejo = localStorage.getItem('teleprompter_script')
      } catch (e) {
      }

      if (textoViejo && textoViejo.trim()) {
        const gMigrado: Guion = {
          id: 'migrado-' + Date.now(),
          titulo: t('guionImportado'),
          // El guion migrado de la version web vieja queda en espanol: esa version solo
          // existio en espanol. El titulo si va en el idioma de la app, que es quien lo pone.
          idioma: 'es',
          creado: Date.now(),
          modificado: Date.now(),
          archivado: false,
          bloques: [
            {
              id: 'b-migrado',
              nombre: '',
              texto: textoViejo
            }
          ]
        }

        try {
          await repoRef.current.guardar(gMigrado)
          try {
            localStorage.removeItem('teleprompter_script')
          } catch (e) {}
        } catch (e) {
          console.warn('[App] Error al migrar guion desde localStorage:', e)
          setErrorRepositorio('Falló la migración del guion desde localStorage.')
        }
      }

      // GUION DE BIENVENIDA: Se crea una sola vez la primera vez que se abre la aplicacion.
      // Se omite si repoOverride fue provisto (evita romper pruebas con RepositorioMemoria).
      if (!repoOverride) {
        let yaPuesta = false
        try {
          yaPuesta = localStorage.getItem('teleprompter_bienvenida_puesta') === 'true'
        } catch (e) {}

        if (!yaPuesta) {
          try {
            localStorage.setItem('teleprompter_bienvenida_puesta', 'true')
          } catch (e) {}

          const guionBienvenida: Guion = {
            id: 'bienvenida-' + Date.now(),
            // "Hola" y no "Bienvenida": Javier, el 15 de septiembre de 2026, "me parece
            // muy formal". Y hace eco con la primera linea del propio guion.
            // La marca de localStorage sigue llamandose teleprompter_bienvenida_puesta a
            // proposito: si se le cambia el nombre, a quien ya lo tenia le aparece un
            // segundo guion.
            // Desde la tarea 75 en el idioma de la app: "Hola" o "Hi", con su texto.
            titulo: tituloDeBienvenida(idiomaApp()),
            idioma: idiomaApp(),
            creado: Date.now(),
            modificado: Date.now(),
            archivado: false,
            // UN SOLO BLOQUE, NO SEIS.
            //
            // El encargo de la tarea 46 decia "cada parrafo es un bloque" y fue un error
            // mio: el editor dibuja cada bloque con su encabezado numerado y sus botones
            // de mover y borrar, asi que lo PRIMERO que veia alguien al instalar eran
            // seis "Bloque #N" -justamente la funcion que Javier dejo congelada hasta
            // definir para que sirve-.
            //
            // No hace falta: la pantalla de lectura respeta los saltos de linea del
            // autor, asi que un bloque con los parrafos separados por una linea en blanco
            // se lee exactamente igual y el editor queda limpio.
            //
            // MAS LARGO Y MOSTRANDO LO QUE SE PUEDE HACER -24-09-2026-. Javier: "ese texto
            // deberia ser mas largo, en el mismo tono, pero aprovechando mas de explicar mejor
            // las funcionalidades de la app, por ejemplo los colores", y "debe ser un texto
            // amable". Explica leyendo: la negrita, los tres colores y el destacado van puestos
            // sobre las mismas palabras que los nombran, y la nota entre corchetes es una nota
            // de verdad -el seguidor se la salta-. Lo que dice es lo que hace la aplicacion hoy.
            bloques: [bloqueDeBienvenida(idiomaApp())]
          }

          try {
            await repoRef.current.guardar(guionBienvenida)
          } catch (e) {
            console.warn('[App] Error al crear guion de bienvenida:', e)
          }
        }
      }

      await cargarBiblioteca()
      if (!montadoRef.current) return
      try {
        const idsAntes = new Set((await repoGrabacionesRef.current.listar()).map((g) => g.id))
        const recuperadas = await recuperarTomasPendientes(repoGrabacionesRef.current)
        const conVideo = await quitarTomasSinVideo(repoGrabacionesRef.current)
        if (!montadoRef.current) return
        setGrabaciones(conVideo)
        const nuevas = recuperadas.filter((g) => !idsAntes.has(g.id))
        if (nuevas.length > 0) {
          const masReciente = [...nuevas].sort((a, b) => b.creado - a.creado)[0]
          const una = nuevas.length === 1
          mostrarAviso(
            una
              ? t('avisoTomaRecuperada')
              : t('avisoTomasRecuperadas', { n: nuevas.length }),
            {
              accionTexto: t('verla'),
              alEjecutarAccion: () => setGrabacionAbierta(masReciente),
              duracionMs: 5000
            }
          )
        }
      } catch (e) {
        console.warn('[App] no se pudieron recuperar grabaciones:', e)
        try {
          const todas = await repoGrabacionesRef.current.listar()
          if (!montadoRef.current) return
          setGrabaciones(todas)
        } catch {}
      }
      if (!montadoRef.current) return
      setCargado(true)
    }

    inicializar()
  }, [cargarBiblioteca, repoOverride])

  const disparoEntradaRef = useRef<boolean>(false)

  // Relevo del splash nativo al espejo SIGO en la web
  useEffect(() => {
    if (movimientoApagado() || disparoEntradaRef.current) {
      return
    }

    if (!Capacitor.isNativePlatform()) {
      disparoEntradaRef.current = true
      setMostrarEntrada(true)
      return
    }

    let cancelado = false
    const timerTope = setTimeout(() => {
      if (!cancelado && !disparoEntradaRef.current) {
        disparoEntradaRef.current = true
        setMostrarEntrada(true)
      }
    }, 3000)

    if (cargado) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          registerPlugin<any>('Arranque')
            .listo()
            .then(() => {
              if (!cancelado && !disparoEntradaRef.current) {
                disparoEntradaRef.current = true
                setMostrarEntrada(true)
              }
            })
            .catch(() => {
              if (!cancelado && !disparoEntradaRef.current) {
                disparoEntradaRef.current = true
                setMostrarEntrada(true)
              }
            })
            .finally(() => {
              clearTimeout(timerTope)
            })
        })
      })
    }

    return () => {
      cancelado = true
      clearTimeout(timerTope)
    }
  }, [cargado])

  // Auto-guardado debounced (500ms) al modificar guionActual
  useEffect(() => {
    if (!cargado || !guionActual) return
    const timer = setTimeout(async () => {
      try {
        await repoRef.current.guardar(guionActual)
        await cargarBiblioteca()
      } catch (e) {
        console.warn('[App] Error al guardar guion en repositorio:', e)
        setErrorRepositorio('Error al guardar cambios en el repositorio.')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [guionActual, cargado, cargarBiblioteca])

  async function handleAbrirGuion(id: string) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        setGuionActual(g)
        setVista('editor')
      } else {
        await cargarBiblioteca()
      }
    } catch (e) {
      console.warn('[App] Error al abrir guion:', e)
    }
  }

  // Un guion nuevo nace en el idioma de la app -D2-. Al escribir o pegar, el editor lo
  // corrige si el texto es de otro idioma -EditorView, detectarIdioma-.
  async function handleCrearNuevoGuion() {
    const nuevo = guionNuevo(idiomaApp())
    try {
      await repoRef.current.guardar(nuevo)
      setGuionActual(nuevo)
      await cargarBiblioteca()
      setVista('editor')
    } catch (e) {
      console.warn('[App] Error al crear nuevo guion:', e)
    }
  }

  // UN GUION QUE NO SE ESCRIBIO NO SE GUARDA.
  //
  // handleCrearNuevoGuion lo guarda en el repositorio ANTES de abrir el editor, para
  // que el guardado automatico tenga contra que guardar desde la primera tecla. El
  // efecto de eso es que apretar "+" y volver atras sin escribir nada deja un guion
  // fantasma. Javier abrio la biblioteca el 16 de septiembre de 2026 y tenia cuatro
  // "Sin titulo" seguidos, todos de haber entrado y salido.
  //
  // No se arregla al entrar -guardar mas tarde obliga a inventar un estado a medias
  // entre "no existe" y "existe"-. Se arregla al salir: si no hay titulo y no hay
  // texto, no hay nada que conservar.
  //
  // OJO: guionNuevo NO deja el titulo vacio, lo deja en 'Sin título' -TITULO_SIN_NOMBRE, que
  // se guarda asi en los dos idiomas-. Comparar contra la cadena vacia no alcanza.
  function guionSinEscribir(g: Guion | null): boolean {
    if (!g) return false
    const titulo = (g.titulo || '').trim()
    if (titulo !== '' && titulo !== TITULO_SIN_NOMBRE) return false
    return (g.bloques || []).every((b) => !b.texto || b.texto.trim() === '')
  }

  // Los dos caminos de vuelta -el boton y el gesto de atras de Android- pasan por
  // aca. Arreglar uno solo deja el fantasma entrando por el otro.
  async function salirDelEditor() {
    const g = guionActual
    if (guionSinEscribir(g)) {
      guionModificadoRef.current = false
      setGuionActual(null)
      try {
        await repoRef.current.borrar(g!.id)
        await cargarBiblioteca()
      } catch (e) {
        console.warn('[App] Error al descartar un guion sin escribir:', e)
      }
      setVista('biblioteca')
      return
    }
    if (guionModificadoRef.current) {
      mostrarAviso(t('guardado'))
      guionModificadoRef.current = false
    }
    setVista('biblioteca')
  }

  // handleImportarArchivo vivia aca: importaba un archivo desde el menu de la
  // portada y creaba un guion nuevo con su titulo. Se fue el 24-09-2026 junto
  // con esa entrada del menu: el editor vacio ofrece "Abrir archivo" y hace lo
  // mismo -EditorView.tsx, handleSeleccionarArchivo-.

  // handleRenombrarGuion vivia aca, para renombrar desde la lista. La lista no lo
  // llamaba -el titulo se cambia en el editor-; se fue el 24-09-2026 con la limpieza.

  const [idsPendientesBorrado, setIdsPendientesBorrado] = useState<string[]>([])
  const timerBorradoRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleBorrarGuion = useCallback((id: string) => {
    setIdsPendientesBorrado((prev) => [...prev, id])

    if (timerBorradoRef.current[id]) {
      clearTimeout(timerBorradoRef.current[id])
    }

    timerBorradoRef.current[id] = setTimeout(async () => {
      delete timerBorradoRef.current[id]
      try {
        await repoRef.current.borrar(id)
        if (guionActual && guionActual.id === id) {
          setGuionActual(null)
          setVista('biblioteca')
        }
        await cargarBiblioteca()
      } catch (e) {
        console.warn('[App] Error al borrar guion:', e)
      } finally {
        setIdsPendientesBorrado((prev) => prev.filter((i) => i !== id))
      }
    }, 5000)

    mostrarAviso(t('guionBorrado'), {
      accionTexto: t('deshacer'),
      duracionMs: 5000,
      alEjecutarAccion: () => {
        if (timerBorradoRef.current[id]) {
          clearTimeout(timerBorradoRef.current[id])
          delete timerBorradoRef.current[id]
        }
        setIdsPendientesBorrado((prev) => prev.filter((i) => i !== id))
      }
    })
  }, [guionActual, cargarBiblioteca, mostrarAviso])

  async function handleArchivarGuion(id: string, archivado: boolean) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        g.archivado = archivado
        await repoRef.current.guardar(g)
        if (guionActual && guionActual.id === id) {
          setGuionActual({ ...g })
        }
        await cargarBiblioteca()
      }
    } catch (e) {
      console.warn('[App] Error al archivar/desarchivar guion:', e)
    }
  }

  const [controlesVisibles, setControlesVisibles] = useState<boolean>(false)
  const timerControlesRef = useRef<number | null>(null)

  const [motivoFreno, setMotivoFreno] = useState<'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null>(null)
  const [avanzando, setAvanzando] = useState<boolean>(false)
  const [estadoModo, setEstadoModo] = useState<'SIGUIENDO' | 'BUSCANDO' | 'DETENIDO'>('SIGUIENDO')
  const [tInicioLecturaMs, setTInicioLecturaMs] = useState<number | null>(null)
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null)
  const [enPausa, setEnPausa] = useState<boolean>(false)
  const [confirmandoDescarte, setConfirmandoDescarte] = useState<boolean>(false)

  // Referencia para la función que cierra el modal abierto si existe
  const cerrarModalRef = useRef<(() => boolean) | null>(null)

  const timerCuentaRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prompterContainerRef = useRef<HTMLDivElement | null>(null)

  const cancelarCuentaRegresiva = useCallback(() => {
    if (timerCuentaRef.current !== null) {
      clearInterval(timerCuentaRef.current)
      timerCuentaRef.current = null
    }
    setCuentaRegresiva(null)
  }, [])

  useEffect(() => {
    return () => {
      cancelarCuentaRegresiva()
    }
  }, [cancelarCuentaRegresiva])

  useEffect(() => {
    const enLienzo = vista === 'lectura'
    if (!enLienzo || !conCamara) {
      if (!enLienzo) cancelarCuentaRegresiva()
      if (!conCamara && camaraEncendida()) {
        apagarCamara()
        setCamaraActiva(false)
      }
      if (!enLienzo && camaraEncendida()) {
        apagarCamara()
        setCamaraActiva(false)
      }
    } else {
      if (!camaraEncendida() || ladoCamara !== ladoActual()) {
        encenderCamara(ladoCamara, { fondoToma, recuadroX, recuadroY }).then(() => {
          setCamaraActiva(camaraEncendida())
        })
      }
    }
  }, [vista, cancelarCuentaRegresiva, conCamara, ladoCamara, fondoToma, recuadroX, recuadroY])

  useEffect(() => {
    if (camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro') && vista === 'lectura') {
      document.body.style.backgroundColor = 'transparent'
      document.documentElement.style.backgroundColor = 'transparent'
    } else {
      document.body.style.backgroundColor = ''
      document.documentElement.style.backgroundColor = ''
    }
    return () => {
      document.body.style.backgroundColor = ''
      document.documentElement.style.backgroundColor = ''
    }
  }, [camaraActiva, fondoToma, vista])

  const guionParaSeguidor = guionActual || GUION_VACIO

  const {
    bloqueActual,
    lineaActual,
    palabraActual,
    totalTokens,
    alRecibirParcial: seguidorParcial,
    alRecibirFinal: seguidorFinal,
    alNotificarVoz: seguidorVoz,
    irAToken,
    motorAvance
  } = useSeguidor(guionParaSeguidor)

  // EL MOTOR ESCUCHA EN EL IDIOMA DEL GUION, NO EN EL DE LA APP -D2-. Hasta la tarea 75 se
  // armaba `${idioma}-${IDIOMA}`, que para el ingles daba 'en-EN', un codigo que no existe.
  // MotorNativo todavia lo ignora: el modelo ingles y la eleccion por idioma los conecta
  // Claude en el telefono -docs/ingles.txt, seccion 3-.
  const idiomaGuion = guionActual && guionActual.idioma ? guionActual.idioma : 'es'
  const langMotor = idiomaGuion === 'en' ? 'en-US' : idiomaGuion === 'es' ? 'es-ES' : idiomaGuion

  const {
    start,
    stop,
    isRecording,
    estadoMotor,
    ultimoError,
    motorActivo
  } = useASR({
    engine,
    lang: langMotor,
    motor,
    acumularTexto: verTranscripcion,
    alRecibirParcial: seguidorParcial,
    alRecibirFraseFinal: (e: any) => {
      if (grabandoVideoRef.current && e && String(e.texto || '').trim()) {
        anotarFraseOida()
      }
      seguidorFinal(e)
    },
    alNotificarVoz: seguidorVoz
  })

  // Los controles vuelven a irse solos. Un toque los trae, y si el que lee no aprieta nada
  // se van otra vez: si se quedaran encendidos hasta el siguiente toque, bastaria con
  // olvidarse una vez para tenerlos en pantalla el resto de la toma, que es exactamente lo
  // que se quiso evitar al hacer que desaparecieran.
  useEffect(() => {
    const leyendo = isRecording || cuentaRegresiva !== null
    if (!leyendo || !controlesVisibles) return

    timerControlesRef.current = window.setTimeout(() => {
      timerControlesRef.current = null
      setControlesVisibles(false)
    }, MS_CONTROLES_A_LA_VISTA)

    return () => {
      if (timerControlesRef.current !== null) {
        window.clearTimeout(timerControlesRef.current)
        timerControlesRef.current = null
      }
    }
  }, [controlesVisibles, isRecording, cuentaRegresiva])

  // Mientras se esta leyendo, la version nueva espera. Recargar a alguien que esta leyendo a
  // camara le arruina la toma; la actualizacion se aplica sola en cuanto termina.
  useEffect(() => {
    bloquearRecargaAutomatica('leyendo', isRecording || cuentaRegresiva !== null)
  }, [isRecording, cuentaRegresiva])

  const { activo: wakeLockActivo, solicitar: solicitarWakeLock, soltar: soltarWakeLock } = useWakeLock()

  const handleEstadoAvanceChange = useCallback((
    motivo: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null,
    isAvanzando: boolean,
    estado?: 'SIGUIENDO' | 'BUSCANDO' | 'DETENIDO'
  ) => {
    setMotivoFreno(motivo)
    setAvanzando(isAvanzando)
    if (estado) setEstadoModo(estado)
  }, [])

  async function handleStart() {
    if (cuentaRegresiva !== null || isRecording) return
    setEnPausa(false)
    await solicitarWakeLock()

    // MEDIR ES PARTE DE LEER, NO UN BOTON APARTE.
    //
    // Tener "Grabar" separado de "Iniciar" no era una incomodidad, era una trampa: grabar
    // sin arrancar el motor da audio sin nada que medir, y arrancar el motor sin grabar
    // deja el cero del reloj tarde y pierde el principio de la lectura. Las dos maneras de
    // equivocarse producen una grabacion inutil, y eso recien se descubre al analizarla.
    // Lo dijo Javier el 13 de septiembre de 2026: "por que el boton de grabar con el de
    // iniciar no son el mismo".
    //
    // El audio arranca ACA, al principio de la cuenta regresiva, no al final: esos tres
    // segundos quedan de margen y ninguna palabra del comienzo se corta. Todo va al mismo
    // reloj igual, asi que el margen no estorba.
    //
    // Y VA SIN await, A PROPOSITO. Esto lo escribi mal la primera vez y rompio la lectura
    // entera: puse `await iniciarGrabacion(...)` justo aca, antes de la cuenta regresiva.
    // Pedir el microfono puede quedarse esperando -el cartel de permiso, un microfono
    // ocupado-, y con el await la cuenta regresiva no arrancaba, el motor no se encendia
    // nunca y no se movia nada. Javier: "no avanza nada y desde el principio aparece abajo
    // detenido". Escribi en el comentario de abajo que medir no puede impedir leer y
    // programe justo lo contrario.
    //
    // Ahora la grabacion arranca EN PARALELO: la lectura empieza igual pase lo que pase con
    // el microfono. Si el permiso tarda dos segundos, se pierden los dos primeros segundos
    // de audio y nada mas; para eso estan los tres segundos de cuenta regresiva de margen.
    //
    // Si no se puede grabar -permiso negado, navegador sin microfono-, la lectura sigue
    // igual. Medir no puede impedir leer; el motivo queda a la vista en el panel.
    if (medirLectura) {
      iniciarGrabacion({
        guionTitulo: guionActual ? guionActual.titulo : '(sin guion)',
        guionTexto: guionActual ? guionActual.bloques.map((b) => b.texto).join('\n') : '',
        motor: motorActivo
      }).catch(() => {
        // El panel muestra el motivo. La lectura no se interrumpe.
      })
    }

    setControlesVisibles(false)
    setCuentaRegresiva(3)

    let c = 3
    timerCuentaRef.current = setInterval(() => {
      c -= 1
      if (c > 0) {
        setCuentaRegresiva(c)
      } else {
        if (timerCuentaRef.current !== null) {
          clearInterval(timerCuentaRef.current)
          timerCuentaRef.current = null
        }
        setCuentaRegresiva(null)
        setTInicioLecturaMs(performance.now())
        start()
        // La grabacion de video empieza DESPUES de la cuenta, no al
        // entrar a lectura: si arranca antes, los primeros segundos
        // son una cara quieta esperando. Y VA SIN await: si el
        // grabador falla, la lectura sigue. La voz manda sobre el video.
        if (camaraEncendida()) {
          const idToma = generarUuid()
          iniciarTomaVideo({
            id: idToma,
            guionId: guionActual ? guionActual.id : undefined,
            tituloGuion: guionActual ? guionActual.titulo : '(sin guion)',
            calidad: calidadVideo,
            // Para leer el registro del motor despues -tomaVideo.ts-: con que motor,
            // que letra, que ancho y que guion se leyo.
            cabeceraMotor: [
              `# motor de voz: ${engine}`,
              `# letra: ${fontSize} px, ${tipoFuente}`,
              `# columna: ${columnaAngosta ? 'angosta' : 'completa'}, margen ${marginPercent}%`,
              `# donde lees: ${anclajeZona}`,
              // El idioma del guion -28-09-2026-: elige el reconocedor y, en ingles, la
              // comparacion por sonido del seguidor. Sin esto habia que deducirlo del texto.
              `# idioma: ${guionActual ? guionActual.idioma : '?'}`,
              '# ---------- GUION, TAL CUAL SE LEYO ----------',
              ...(guionActual ? guionActual.bloques.map((b) => b.texto) : []).join('\n').split('\n').map((l) => `# | ${l}`),
              '# ---------------------------------------------'
            ].join('\n')
          }).then((ok) => {
            grabandoVideoRef.current = ok
            setGrabandoVideo(ok)
          }).catch(() => {
            grabandoVideoRef.current = false
            setGrabandoVideo(false)
          })
        }
      }
    }, 1000)
  }

  async function handleEntrarLectura(
    origen: 'biblioteca' | 'editor' = 'editor',
    rect?: DOMRect,
    conCamaraEstaEntrada = false
  ) {
    origenLecturaRef.current = origen
    setRectTarjeta(rect || null)
    hapticaToqueMedio()
    setConCamara(conCamaraEstaEntrada)
    setEstadoToma('listo')
    setControlesVisibles(false)
    setVista('lectura')
  }

  async function handleEmpezarDesdeListo() {
    if (estadoToma === 'leyendo') return
    hapticaToqueMedio()
    setEstadoToma('leyendo')
    setControlesVisibles(false)
    await handleStart()
  }

  function handleVolverDesdeListo() {
    hapticaToqueMedio()
    setConCamara(false)
    setEstadoToma('listo')
    setVista(origenLecturaRef.current)
  }

  async function handleLeerDirecto(id: string, rect?: DOMRect) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        setGuionActual(g)
        await handleEntrarLectura('biblioteca', rect, false)
      }
    } catch (e) {
      console.warn('[App] Error al abrir directo para lectura:', e)
    }
  }

  async function handleGrabarDirecto(id: string, rect?: DOMRect) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        setGuionActual(g)
        await handleEntrarLectura('biblioteca', rect, true)
      }
    } catch (e) {
      console.warn('[App] Error al abrir directo para grabar:', e)
    }
  }

  function handleLetraMenos() {
    const idx = PASOS_LETRA.indexOf(fontSize)
    if (idx > 0) {
      setFontSize(PASOS_LETRA[idx - 1])
    } else if (idx === 0) {
      hapticaToqueSuave()
    } else if (idx === -1) {
      const menor = PASOS_LETRA.slice().reverse().find((p) => p < fontSize)
      if (menor !== undefined) setFontSize(menor)
      else {
        setFontSize(PASOS_LETRA[0])
        hapticaToqueSuave()
      }
    }
  }

  function handleLetraMas() {
    const idx = PASOS_LETRA.indexOf(fontSize)
    if (idx >= 0 && idx < PASOS_LETRA.length - 1) {
      setFontSize(PASOS_LETRA[idx + 1])
    } else if (idx === PASOS_LETRA.length - 1) {
      hapticaToqueSuave()
    } else if (idx === -1) {
      const mayor = PASOS_LETRA.find((p) => p > fontSize)
      if (mayor !== undefined) setFontSize(mayor)
      else {
        setFontSize(PASOS_LETRA[PASOS_LETRA.length - 1])
        hapticaToqueSuave()
      }
    }
  }

  async function persistirResumenToma(resumen: ResumenGrabacion | null) {
    if (!resumen) return
    try {
      await repoGrabacionesRef.current.guardar(resumen)
      setGrabaciones(await repoGrabacionesRef.current.listar())
    } catch (e) {
      console.warn('[App] no se pudo guardar el indice de la toma:', e)
    }
    if (resumen.errorMudo) {
      mostrarAviso(t('avisoErrorMudo'))
    } else if (resumen.avisoMudo) {
      mostrarAviso(t('avisoMudo'))
    }
  }

  async function cortarTomaSiHay(incompleta = false): Promise<ResumenGrabacion | null> {
    if (!tomaEnCurso() && !grabandoVideoRef.current) return null
    try {
      const resumen = await cortarTomaVideo({ incompleta })
      await persistirResumenToma(resumen)
      return resumen
    } catch (e) {
      console.warn('[App] error al cortar la toma:', e)
      return null
    } finally {
      grabandoVideoRef.current = false
      setGrabandoVideo(false)
    }
  }

  // Descartar es parar y borrar. El archivo ya esta en disco cuando se
  // pausa -el grabador escribe mientras graba, no al final-, asi que no
  // existe un camino de "nunca escribirlo". Se corta igual que en
  // handleStop y recien despues se borra del disco y del indice.
  // A diferencia de handleStop, NO se abre el visor.
  async function handleDescartarToma(): Promise<void> {
    cancelarCuentaRegresiva()
    setTInicioLecturaMs(null)
    setEnPausa(false)
    const resumen = await cortarTomaSiHay(false)
    await stop()
    await detenerGrabacion()
    await soltarWakeLock()
    setEstadoToma('listo')
    setControlesVisibles(false)
    if (resumen) {
      try {
        await borrarGrabacionEnDisco(resumen)
        await repoGrabacionesRef.current.borrar(resumen.id)
        setGrabaciones(await repoGrabacionesRef.current.listar())
      } catch (e) {
        console.warn('[App] no se pudo descartar la toma:', e)
      }
    }
    mostrarAviso(t('tomaDescartada'))
  }

  async function handleStop(): Promise<ResumenGrabacion | null> {
    cancelarCuentaRegresiva()
    setTInicioLecturaMs(null)
    setEnPausa(false)
    const resumen = await cortarTomaSiHay(false)
    await stop()
    // El audio se corta DESPUES del motor, no antes: si se cortara primero, los ultimos
    // calces quedarian anotados con un milisegundo que ya no existe en el archivo.
    await detenerGrabacion()
    await soltarWakeLock()
    setEstadoToma('listo')
    setControlesVisibles(false)
    // Si hubo toma, el visor la confirma. El aviso "Grabado" solo queda
    // para la salida SIN archivo: los dos juntos tapaban el mismo hecho.
    if (resumen) setGrabacionAbierta(resumen)
    return resumen
  }

  // Ciclo de vida de la toma. No hay servicio en primer plano: esta
  // aplicacion se usa mirando el lente. Si la pantalla se va a segundo
  // plano o la actividad se destruye, se corta limpio y se escribe el
  // sidecar. Al volver, recuperarTomasPendientes promociona o marca
  // incompleta lo que haya quedado.
  useEffect(() => {
    const sub: any = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && (tomaEnCurso() || grabandoVideoRef.current)) {
        cortarTomaSiHay(true)
      }
      // Al volver: si mientras tanto se borro de la galeria el video de una toma
      // guardada, la toma deja de aparecer -quitarTomasSinVideo-.
      // Al volver, tambien el idioma: se pudo cambiar en Ajustes del telefono -> Apps -> Sigo
      // -> Idioma mientras la app estaba atras -IdiomaAppPlugin, 27-09-2026-. Leerlo no cambia
      // nada si sigue igual.
      if (isActive) leerIdiomaDelTelefono()
      if (isActive && !tomaEnCurso()) {
        quitarTomasSinVideo(repoGrabacionesRef.current)
          .then((quedan) => {
            setGrabaciones(quedan)
            setGrabacionAbierta((abierta) => (abierta && !quedan.some((g) => g.id === abierta.id) ? null : abierta))
          })
          .catch(() => {})
      }
    })
    return () => {
      try {
        if (sub && typeof sub.then === 'function') {
          sub.then((h: any) => h && h.remove && h.remove()).catch(() => {})
        } else if (sub && typeof sub.remove === 'function') {
          sub.remove()
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    return () => {
      if (tomaEnCurso()) {
        cortarTomaVideo({ incompleta: true }).catch(() => {})
      }
    }
  }, [])

  // Ref para manejar el evento de botón de atrás en Android
  const handleVolverAtrasRef = useRef<() => Promise<void> | void>(() => {})
  useEffect(() => {
    handleVolverAtrasRef.current = async () => {
      // 1. Si hay un modal abierto, cerrarlo
      if (cerrarModalRef.current && cerrarModalRef.current()) {
        return
      }
      if (mostrarPanelCorpus) {
        setMostrarPanelCorpus(false)
        return
      }
      if (grabacionAbierta) {
        setGrabacionAbierta(null)
        return
      }
      // Dos pisos. Nunca salta los dos.
      // LEYENDO -> LISTO: corta la toma por el camino que ya existe.
      // LISTO -> origen: ahi se apaga la camara.
      if (vista === 'lectura') {
        if (estadoToma === 'leyendo' || isRecording || cuentaRegresiva !== null) {
          await handleStop()
          return
        }
        handleVolverDesdeListo()
        return
      }
      // 3. En el editor, volver a la biblioteca -descartando el guion si no se escribio
      if (vista === 'editor') {
        await salirDelEditor()
        return
      }
      // 4. En la biblioteca, salir de la aplicación
      if (vista === 'biblioteca') {
        CapacitorApp.exitApp()
      }
    }
  })

  // EL GESTO DE ATRAS DE ANDROID.
  //
  // Antes de esto no habia ningun manejo del gesto en todo el proyecto, y durante
  // la lectura se llevaba la grabacion entera: se iba de la aplicacion sin pasar
  // por handleStop, asi que detenerGrabacion no corria y la lectura se perdia sin
  // ningun aviso.
  //
  // ACA NO SE EXPONE NINGUN ATAJO PARA PROBAR. La primera version colgaba este
  // mismo handler de window.__simularBotonAtras para que las pruebas lo llamaran.
  // Ademas de viajar en el APK, eso hacia que la prueba tocara una COPIA y nunca
  // comprobara que estuviera conectada al gesto: borrando el addListener de abajo,
  // el gesto quedaba muerto y T188 seguia verde. La prueba finge el plugin -ver el
  // vi.mock de pantallas.test.tsx- y captura ESTE listener.
  useEffect(() => {
    let listenerHandle: any = null
    const handler = () => {
      if (handleVolverAtrasRef.current) {
        handleVolverAtrasRef.current()
      }
    }

    const sub = CapacitorApp.addListener('backButton', handler)
    if (sub && typeof sub.then === 'function') {
      sub.then((h: any) => { listenerHandle = h })
    } else {
      listenerHandle = sub
    }

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove()
      }
    }
  }, [])

  // -24-09-2026: aca estaba handleClear -vaciar lo oido y reiniciar el seguidor-, sin uso desde
  // que la Tarea 34 saco el boton "Volver al inicio". Cuando B24 -detener a mitad: continuar o
  // empezar de nuevo- se haga, el reinicio es reiniciar() de useSeguidor mas clear() de useASR.

  const handleTogglePausa = async () => {
    if (enPausa) {
      setEnPausa(false)
      await start()
    } else {
      setEnPausa(true)
      await stop()
    }
  }

  let textoFreno = ''
  if (estadoModo === 'BUSCANDO') {
    textoFreno = 'Buscando tu posición...'
  } else if (estadoModo === 'DETENIDO') {
    textoFreno = 'Detenido'
  } else if (!avanzando && motivoFreno) {
    if (motivoFreno === 'silencio') textoFreno = 'esperando voz'
    else if (motivoFreno === 'sin-calce') textoFreno = 'no reconozco lo que lees'
    else if (motivoFreno === 'correa') textoFreno = 'adelantado, espero'
    else if (motivoFreno === 'fin-de-linea') textoFreno = 'fin de línea, espero'
    else if (motivoFreno === 'fin-de-bloque') textoFreno = 'fin de bloque, espero'
  }

  // LA TARJETA O LA PILDORA SE CONVIERTE EN LA PANTALLA DE LECTURA.
  //
  // La medicion es una sola, en el toque: BibliotecaView o EditorView manda el
  // rectangulo de la tarjeta o del boton "Leer", y aca se traduce a los cuatro huecos
  // que pide inset(). El motivo de recortar en vez de agrandar esta escrito arriba de
  // @keyframes revelarLectura.
  const huecoEntrada = (rectTarjeta && typeof window !== 'undefined')
    ? {
        arriba: Math.max(0, rectTarjeta.top),
        izquierda: Math.max(0, rectTarjeta.left),
        derecha: Math.max(0, window.innerWidth - rectTarjeta.right),
        abajo: Math.max(0, window.innerHeight - rectTarjeta.bottom)
      }
    : null

  const hayTransformacionDeEntrada = !movimientoApagado()
    && huecoEntrada !== null

  return (
    <div
      style={{
        paddingTop: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-top, 0px))',
        paddingBottom: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-left, 0px))',
        paddingRight: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-right, 0px))',
        // SIN fontFamily AQUI, A PROPOSITO.
        //
        // Esta linea decia fontFamily: 'sans-serif' -la palabra generica- y pisaba
        // la pila del body para TODA la aplicacion. Medido en el navegador el 20 de
        // septiembre de 2026: el body calculaba "Source Sans 3" y todo lo que colgaba
        // de aca calculaba el sans generico del navegador.
        //
        // Aparecio revisando la tarea 55: el boton "Aa" paso de serif a sans y seguia
        // sin ser el nuestro. La familia se define en un solo sitio, el body.
        maxWidth: vista === 'lectura' ? 'none' : 1200,
        margin: '0 auto'
      }}
    >

      {mostrarEntrada && (
        <Entrada onFinish={() => setMostrarEntrada(false)} desdeSplashNativo={Capacitor.isNativePlatform()} />
      )}

      {/* Indicador de precarga de modelo Vosk */}
      {(estadoPrecarga === 'descargando' || estadoPrecarga === 'error') && (
        <div
          style={{
            background: 'var(--bg-suelo)',
            color: estadoPrecarga === 'error' ? 'var(--color-grabando)' : 'var(--color-texto)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo)',
            marginBottom: 'var(--aire-4)',
            fontSize: 'var(--texto-meta)',
            border: '1px solid var(--color-borde)',
            display: (camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro') && vista === 'lectura') ? 'none' : 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {estadoPrecarga === 'descargando' && (
            <span>
              ⏬ {t('descargandoModelo')} <strong>{Math.round(progresoPrecarga * 100)}%</strong>
            </span>
          )}
          {estadoPrecarga === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)', width: '100%', justifyContent: 'space-between' }}>
              <span>
                ⚠️ {t('errorModelo', { detalle: errorPrecarga || t('desconocido') })}
              </span>
              <button
                onClick={reintentarPrecarga}
                style={{ padding: 'var(--aire-1) var(--aire-2)', fontSize: 'var(--texto-meta)', cursor: 'pointer' }}
              >
                {t('reintentar')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Franja de estado escondida por omision - se activa mediante toque largo en el resumen de la biblioteca */}
      {mostrarDiagnostico && (
        <div
          data-testid="franja-de-estado-diagnostico"
          style={{
            background: (ultimoError || errorRepositorio) ? 'var(--bg-suelo)' : 'var(--bg-superficie)',
            color: (ultimoError || errorRepositorio) ? 'var(--color-grabando)' : 'var(--color-texto)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo)',
            marginBottom: 'var(--aire-4)',
            fontSize: 'var(--texto-meta)',
            border: '1px solid var(--color-borde)',
            display: (camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro') && vista === 'lectura') ? 'none' : 'block'
          }}
        >
          <strong>Franja de Estado:</strong>
          <div style={{ marginTop: 'var(--aire-1)' }}>
            <span>Estado del Motor: <strong>{estadoMotor}</strong></span>
            {modoManual && <span style={{ marginLeft: 'var(--aire-4)', color: 'var(--color-acento)', fontWeight: 600 }}>MODO MANUAL: mandas tú</span>}
            <span style={{ marginLeft: 'var(--aire-4)' }}>Motor Activo: <strong>{motorActivo}</strong></span>
            <span style={{ marginLeft: 'var(--aire-4)' }}>Bloqueo Pantalla: <strong>{wakeLockActivo ? 'Sí' : 'No'}</strong></span>
            {textoFreno && (
              <span style={{ marginLeft: 'var(--aire-4)', color: 'var(--color-grabando)', fontWeight: 'bold' }}>
                Estado Avance: {textoFreno}
              </span>
            )}
            {usandoMemoriaFallback && (
              <span style={{ marginLeft: 'var(--aire-4)', color: 'var(--color-grabando)', fontWeight: 'bold' }}>
                ⚠️ Almacenamiento: En Memoria (IndexedDB no disponible)
              </span>
            )}
          </div>
          {ultimoError && (
            <div style={{ marginTop: 'var(--aire-2)', fontWeight: 'bold' }}>
              Último Error Motor: {ultimoError}
            </div>
          )}
          {errorRepositorio && (
            <div style={{ marginTop: 'var(--aire-2)', fontWeight: 'bold', color: 'var(--color-grabando)' }}>
              Aviso Repositorio: {errorRepositorio}
            </div>
          )}
          {/* Lo nuestro: motor, transcripcion y medicion. No van en el
              menu de la portada. Esta franja es la unica puerta. */}
          <div data-testid="apartado-nuestro" style={{ marginTop: 'var(--aire-3)', paddingTop: 'var(--aire-2)', borderTop: '1px solid var(--color-separador)' }}>
            <div className="texto-meta" style={{ color: 'var(--color-apagado)', fontWeight: 600, marginBottom: 'var(--aire-2)' }}>
              Motor de voz y transcripción
            </div>
            <label className="texto-meta" style={{ display: 'block', color: 'var(--color-apagado)', marginBottom: 'var(--aire-2)' }}>
              Motor de voz:
              <select
                aria-label="Motor de Voz"
                value={engine}
                onChange={(e) => setEngine(e.target.value as IdMotor)}
                style={{
                  width: '100%',
                  marginTop: 'var(--aire-1)',
                  padding: 'var(--aire-1) var(--aire-2)',
                  fontSize: 'var(--texto-meta)',
                  borderRadius: 'var(--redondeo)',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--bg-suelo)',
                  color: 'var(--color-texto)'
                }}
              >
                <option value="vosk">Vosk (Offline)</option>
                <option value="nativo">Nativo</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 'var(--texto-meta)', color: 'var(--color-texto)', marginBottom: 'var(--aire-2)' }}>
              <span>Ver transcripción en vivo</span>
              <input
                type="checkbox"
                checked={verTranscripcion}
                onChange={(e) => {
                  hapticaToqueSuave()
                  setVerTranscripcion(e.target.checked)
                }}
                style={{ width: 16, height: 16, accentColor: 'var(--color-acento)' }}
              />
            </label>
            <button
              type="button"
              data-testid="btn-abrir-corpus"
              onClick={() => setMostrarPanelCorpus(true)}
              style={{
                padding: 'var(--aire-2) 0',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-texto)',
                fontSize: 'var(--texto-cuerpo)',
                cursor: 'pointer'
              }}
            >
              Medición / Panel Corpus
            </button>
          </div>
        </div>
      )}

      {(vista === 'biblioteca' || (vista === 'lectura' && origenLecturaRef.current === 'biblioteca')) && (
        <Pantalla direccion={direccion}>
          <BibliotecaView
            guiones={guionesResumen.filter((g) => !idsPendientesBorrado.includes(g.id))}
            onAbrir={handleAbrirGuion}
            onLeerDirecto={handleLeerDirecto}
            onGrabarDirecto={handleGrabarDirecto}
            onCrearNuevo={handleCrearNuevoGuion}
            mostrarBotonCrear={vista === 'biblioteca'}
            onBorrar={handleBorrarGuion}
            onArchivar={handleArchivarGuion}
            onBuscarGuionCompleto={(id) => repoRef.current.abrir(id)}
            onToggleDiagnostico={() => setMostrarDiagnostico((prev) => !prev)}
            medirLectura={medirLectura}
            setMedirLectura={setMedirLectura}
            tema={tema}
            setTema={setTema}
            onRegistrarCerrarModal={(fn) => { cerrarModalRef.current = fn }}
            grabaciones={grabaciones}
            onAbrirGrabacion={(g) => setGrabacionAbierta(g)}
            onBorrarGrabacion={async (id) => {
              const actual = grabaciones.find((g) => g.id === id)
              try {
                if (actual) await borrarGrabacionEnDisco(actual)
                await repoGrabacionesRef.current.borrar(id)
                setGrabaciones(await repoGrabacionesRef.current.listar())
              } catch (e) {
                console.warn('[App] no se pudo borrar la toma:', e)
              }
              if (grabacionAbierta && grabacionAbierta.id === id) setGrabacionAbierta(null)
            }}
            style={{
              // La biblioteca se oscurece MIENTRAS crece la ventana, no de golpe: un
              // apagon instantaneo se lee como un corte, que es justo lo que la
              // transformacion existe para evitar.
              filter: vista === 'lectura' ? 'brightness(0.15)' : 'none',
              display: (camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro') && vista === 'lectura') ? 'none' : undefined,
              transition: movimientoApagado() ? 'none' : `filter ${MS_PANTALLA}ms ${CURVA_ENTRA}`,
              pointerEvents: vista === 'lectura' ? 'none' : 'auto'
            }}
          />
        </Pantalla>
      )}

      {vista === 'editor' && guionActual && (
        <Pantalla direccion={direccion}>
          <EditorView
            guion={guionActual}
            onChangeGuion={(nuevoG) => {
              guionModificadoRef.current = true
              setGuionActual(nuevoG)
            }}
            onVolverBiblioteca={() => { salirDelEditor() }}
            onEntrarLectura={(rect) => handleEntrarLectura('editor', rect, false)}
            onEntrarGrabar={(rect) => handleEntrarLectura('editor', rect, true)}
            fontSize={fontSize}
            onLetraMenos={handleLetraMenos}
            onLetraMas={handleLetraMas}
            marginPercent={marginPercent}
            setMarginPercent={setMarginPercent}
            columnaAngosta={columnaAngosta}
            setColumnaAngosta={setColumnaAngosta}
            colorFondo={colorFondo}
            setColorFondo={setColorFondo}
            colorLetra={colorLetra}
            setColorLetra={setColorLetra}
            tipoFuente={tipoFuente}
            setTipoFuente={setTipoFuente}
            onRegistrarCerrarModal={(fn) => { cerrarModalRef.current = fn }}
          />
        </Pantalla>
      )}

      {vista === 'lectura' && guionActual && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100dvh',
            zIndex: 150,
            overflow: 'hidden',
            borderRadius: 0,
            animation: hayTransformacionDeEntrada
              ? `revelarLectura ${MS_PANTALLA}ms ${CURVA_ENTRA}`
              : 'none',
            // Los cuatro huecos que hay entre el borde de la pantalla y la tarjeta o pildora:
            // eso es el recorte del que arranca la ventana.
            '--tarjeta-arriba': huecoEntrada ? `${huecoEntrada.arriba}px` : '0px',
            '--tarjeta-derecha': huecoEntrada ? `${huecoEntrada.derecha}px` : '0px',
            '--tarjeta-abajo': huecoEntrada ? `${huecoEntrada.abajo}px` : '0px',
            '--tarjeta-izquierda': huecoEntrada ? `${huecoEntrada.izquierda}px` : '0px'
          } as React.CSSProperties}
        >
          {estadoToma === 'leyendo' && controlesVisibles && (
            <>
              {/* Cada boton flotante lleva data-duracion-entra y data-duracion-sale: son
                  los tiempos de su entrada y su salida, y T201 de tarea45 los lee de aca.
                  Antes los llevaba el cajon panel-controles-lectura, que la 70 elimino.
                  Si se sacan, esa prueba se pone roja: no ponerle valores por omision. */}
              {!conCamara && (
                <button
                  data-testid="btn-salir-lectura"
                  data-duracion-entra={MS_CHICO}
                  data-duracion-sale={MS_PANTALLA}
                  type="button"
                  className="btn-deformable btn-flotante-40"
                  aria-label={t('salir')}
                  onClick={async (e) => {
                    e.stopPropagation()
                    hapticaToqueMedio()
                    const duracionMs = tInicioLecturaMs ? performance.now() - tInicioLecturaMs : null
                    const resumen = await handleStop()
                    if (!resumen) {
                      if (duracionMs !== null && duracionMs > 0) {
                        const totalSeg = Math.floor(duracionMs / 1000)
                        const mins = Math.floor(totalSeg / 60)
                        const segs = String(totalSeg % 60).padStart(2, '0')
                        mostrarAviso(t('grabadoDuracion', { duracion: `${mins}:${segs}` }))
                      } else {
                        mostrarAviso(t('grabado'))
                      }
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 'calc(8px + env(safe-area-inset-top, 0px))',
                    left: 'calc(8px + env(safe-area-inset-left, 0px))',
                    zIndex: 100,
                    animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
                  }}
                >
                  <IconoAtras tamano={20} />
                </button>
              )}

              {conCamara && enPausa && (
                <button
                  data-testid="btn-descartar-toma"
                  data-duracion-entra={MS_CHICO}
                  data-duracion-sale={MS_PANTALLA}
                  data-confirmando={confirmandoDescarte ? 'si' : 'no'}
                  type="button"
                  className="btn-deformable btn-flotante-40"
                  aria-label={t('descartarToma')}
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!confirmandoDescarte) {
                      setConfirmandoDescarte(true)
                    } else {
                      setConfirmandoDescarte(false)
                      await handleDescartarToma()
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 'calc(8px + env(safe-area-inset-top, 0px))',
                    left: 'calc(8px + env(safe-area-inset-left, 0px))',
                    zIndex: 100,
                    // Ancho fijo y no 'auto': CSS no anima un ancho hacia 'auto', salta de golpe,
                    // y la 11.6 pide que el tacho se abra con una transicion de MS_CHICO.
                    // 96 le alcanza a '¿Seguro?' en negrita con su aire a los lados; 'Sure?' es
                    // mas corto.
                    // 40 cerrado desde el 24-09-2026: las esquinas de arriba miden lo
                    // mismo que la pausa de la otra esquina -btn-flotante-40-.
                    width: confirmandoDescarte ? 96 : 40,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    padding: confirmandoDescarte ? '0 var(--aire-2)' : 0,
                    borderColor: confirmandoDescarte ? 'var(--color-grabando)' : undefined,
                    color: confirmandoDescarte ? 'var(--color-grabando-texto)' : undefined,
                    fontSize: 'var(--texto-meta)',
                    fontWeight: confirmandoDescarte ? 'bold' : 'normal',
                    // Un transition en linea pisa el de .btn-deformable -styles.css- y el
                    // tacho se apretaria de golpe, sin el resorte de sus hermanos. Por eso
                    // se repiten aca el border-radius y el transform con la misma curva.
                    transition: movimientoApagado()
                      ? 'none'
                      : `width ${MS_CHICO}ms ${CURVA_ENTRA}, border-radius ${MS_CHICO}ms ${CURVA_RESORTE}, transform ${MS_CHICO}ms ${CURVA_RESORTE}`,
                    animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
                  }}
                >
                  {confirmandoDescarte ? t('seguro') : <IconoTacho tamano={20} />}
                </button>
              )}

              <button
                data-testid="btn-pausa-lectura"
                data-duracion-entra={MS_CHICO}
                data-duracion-sale={MS_PANTALLA}
                type="button"
                className="btn-deformable btn-flotante-40"
                aria-label={enPausa ? t('seguir') : t('pausa')}
                onClick={async (e) => {
                  e.stopPropagation()
                  setConfirmandoDescarte(false)
                  await handleTogglePausa()
                }}
                style={{
                  position: 'absolute',
                  top: 'calc(8px + env(safe-area-inset-top, 0px))',
                  right: 'calc(8px + env(safe-area-inset-right, 0px))',
                  zIndex: 100,
                  animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
                }}
              >
                {enPausa ? <IconoEmpezar tamano={20} /> : <IconoPausa tamano={20} />}
              </button>

              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(var(--circulo-desde-abajo) + env(safe-area-inset-bottom, 0px))',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  display: 'flex',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <button
                  data-testid="btn-parar-lectura"
                  data-duracion-entra={MS_CHICO}
                  data-duracion-sale={MS_PANTALLA}
                  type="button"
                  className="btn-deformable btn-flotante-72 btn-flotante-rojo"
                  aria-label={t('parar')}
                  onClick={async (e) => {
                    e.stopPropagation()
                    hapticaToqueMedio()
                    const duracionMs = tInicioLecturaMs ? performance.now() - tInicioLecturaMs : null
                    const resumen = await handleStop()
                    if (!resumen) {
                      if (duracionMs !== null && duracionMs > 0) {
                        const totalSeg = Math.floor(duracionMs / 1000)
                        const mins = Math.floor(totalSeg / 60)
                        const segs = String(totalSeg % 60).padStart(2, '0')
                        mostrarAviso(t('grabadoDuracion', { duracion: `${mins}:${segs}` }))
                      } else {
                        mostrarAviso(t('grabado'))
                      }
                    }
                  }}
                  style={{
                    pointerEvents: 'auto',
                    animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
                  }}
                >
                  {/* 44 y no 26: IconoParar dibuja su cuadrado en 12 de las 24 unidades de la
                      grilla, como los demas iconos dejan aire. A 44 el cuadrado mide los 22 px
                      que pide la 11.3 del encargo 70, y el redondeo queda en unos 3 px. */}
                  <IconoParar tamano={44} />
                </button>
              </div>
            </>
          )}

          <div
            ref={prompterContainerRef}
            style={{
              width: '100%',
              height: '100dvh',
            background: (camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro')) ? 'transparent' : colorFondo,
              overflow: 'hidden',
              position: 'relative',
              transition: movimientoApagado() ? 'none' : `background-color ${MS_PANEL}ms ${CURVA_NORMAL}`
            }}
          >
            <TeleprompterView
              script={guionActual}
              currentBlockIndex={bloqueActual}
              currentLineIndex={lineaActual}
              currentWordIndex={palabraActual}
              fontSize={fontSize}
              marginPercent={marginPercent}
              mirror={mirror}
              lineasZona={lineasZona}
              anclajeZona={anclajeZona}
              motorAvance={motorAvance}
              diagnostico={verTranscripcion}
              columnaAngosta={columnaAngosta}
              onLetraMenos={handleLetraMenos}
              onLetraMas={handleLetraMas}
              setColumnaAngosta={setColumnaAngosta}
              setMarginPercent={setMarginPercent}
              colorFondo={colorFondo}
              colorLetra={colorLetra}
              tipoFuente={tipoFuente}
              isRecording={isRecording || cuentaRegresiva !== null}
              grabandoVideo={grabandoVideo}
              camaraEncendida={camaraActiva}
            fondoToma={fondoToma}
            recuadroX={recuadroX}
            recuadroY={recuadroY}
              estadoToma={estadoToma}
              conCamara={conCamara}
              setAnclajeZona={(a) => {
                hapticaSeleccion()
                setAnclajeZona(a)
              }}
              setMirror={setMirror}
              mostrarTiempo={mostrarTiempo}
              setMostrarTiempo={setMostrarTiempo}
              setFondoToma={(f) => {
                hapticaSeleccion()
                setFondoToma(f)
              }}
              setRecuadroX={setRecuadroX}
              setRecuadroY={setRecuadroY}
              calidadVideo={calidadVideo}
              setCalidadVideo={(q) => {
                hapticaSeleccion()
                setCalidadVideo(q)
                fijarCalidadVideo(q)
              }}
              calidadesSoportadas={calidadesSoportadas}
              minutosDisponibles={
                bytesLibres !== null
                  ? calcularMinutosDisponibles(bytesLibres, calidadVideo, grabaciones)
                  : null
              }
              onVoltear={() => {
                hapticaSeleccion()
                setLadoCamara((l) => (l === 'frontal' ? 'trasera' : 'frontal'))
              }}
              onEmpezar={handleEmpezarDesdeListo}
              onVolverListo={handleVolverDesdeListo}
              onToggleControles={() => {
                if (estadoToma !== 'leyendo') return
                setControlesVisibles((prev) => !prev)
              }}
              onNavegacionManual={irAToken}
              onModoManualChange={setModoManual}
              onEstadoAvanceChange={handleEstadoAvanceChange}
            />
            {/* EL RELEVO del texto chico de la tarjeta al texto grande de la lectura.
                Es un velo del mismo color de fondo que se desvanece por encima, NO un
                envoltorio alrededor de TeleprompterView: envolverlo mete un elemento
                entre el contenedor y la superficie de lectura, y hay pruebas que suben
                por el arbol desde ahi. Un hermano no cambia ese camino. */}
            {hayTransformacionDeEntrada && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: colorFondo,
                  pointerEvents: 'none',
                  animation: `veloRelevoSale ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
                }}
              />
            )}
            {/* LA CUENTA ES UN ESCENARIO, NO UN STICKER -parte 4 de la tarea 50-.
                Mientras corren los tres segundos, el guion no se lee y el cartel de
                estado del motor no se ve: un parrafo atravesado por un 3, con
                "Detenido" abajo, es lo que hacia que la cuenta pareciera pegada
                encima en vez de ser un momento propio.

                Es un velo hermano, del mismo color de fondo, NO un cambio adentro de
                TeleprompterView: ese archivo esta congelado desde la tarea 43, y el
                cartel es suyo. Tapar desde afuera no le toca una linea.

                El zIndex 6 no es decorativo: el cartel de estado esta en 5 y la
                cuenta en 10. Seis es el unico hueco que tapa el cartel sin tapar el
                numero. */}
            {cuentaRegresiva !== null && (
              <div
                data-testid="velo-cuenta-regresiva"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: colorFondo,
                  pointerEvents: 'none',
                  zIndex: 6
                }}
              />
            )}
            <CuentaRegresiva valor={cuentaRegresiva} />

            {/* La barra de tiempo va ADENTRO del lienzo -position relative, 100dvh-
                y se ubica sola abajo a la derecha. Afuera quedaba debajo del borde
                de la pantalla y no se veia nunca. Tarea 72. */}
            {mostrarTiempo && (
              <BarraDeTiempo
                motorAvance={motorAvance}
                totalTokens={totalTokens}
                tInicioLecturaMs={tInicioLecturaMs}
                vistaPrevia={estadoToma === 'listo'}
              />
            )}
          </div>
        </div>
      )}

      {mostrarPanelCorpus && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-suelo)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 'var(--aire-4)'
          }}
          onClick={() => setMostrarPanelCorpus(false)}
        >
          <div
            className="panel-superficie"
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--color-texto)',
              padding: 'var(--aire-4)',
              borderRadius: 'var(--redondeo)',
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-3)' }}>
              <h3 className="texto-titulo" style={{ margin: 0 }}>Medición / Panel de Corpus</h3>
              <button
                type="button"
                onClick={() => setMostrarPanelCorpus(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-texto)', fontSize: 'var(--texto-titulo)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <PanelCorpus medir={medirLectura} setMedir={setMedirLectura} />
          </div>
        </div>
      )}

      {grabacionAbierta && (
        <ReproductorGrabacion
          grabacion={grabacionAbierta}
          onCerrar={() => setGrabacionAbierta(null)}
          onRepetir={() => {
            setGrabacionAbierta(null)
            handleEmpezarDesdeListo()
          }}
          onGuardadoEnGaleria={(ok, detalle) => {
            if (ok) {
              hapticaToqueMedio()
              mostrarAviso(detalle || t('galeriaGuardada'))
            } else {
              mostrarAviso(detalle || t('galeriaNoSeGuardo'))
            }
          }}
          onCambio={async (g) => {
            // Guardada en la galeria -o su copia ya no esta-: se anota en el
            // indice, y el visor abierto cambia de botones al tiro.
            setGrabacionAbierta(g)
            try {
              await repoGrabacionesRef.current.guardar(g)
              setGrabaciones(await repoGrabacionesRef.current.listar())
            } catch (e) {
              console.warn('[App] no se pudo anotar la toma:', e)
            }
          }}
          onBorrar={async (id) => {
            const actual = grabaciones.find((g) => g.id === id) || grabacionAbierta
            try {
              if (actual) await borrarGrabacionEnDisco(actual)
              await repoGrabacionesRef.current.borrar(id)
              setGrabaciones(await repoGrabacionesRef.current.listar())
            } catch (e) {
              console.warn('[App] no se pudo borrar la toma:', e)
            }
            setGrabacionAbierta(null)
          }}
        />
      )}

      {/* Toast / Aviso Breve */}
      {avisoInfo && (
        <div
          data-testid="aviso-flotante"
          style={{
            position: 'fixed',
            bottom: 'var(--aire-5)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--bg-superficie)',
            color: 'var(--color-texto)',
            border: '1px solid var(--color-borde)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo-pildora)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 600,
            zIndex: 999,
            pointerEvents: avisoInfo.accionTexto ? 'auto' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--aire-3)',
            animation: movimientoApagado() ? 'none' : `panelSube ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
          }}
        >
          <span>{avisoInfo.texto}</span>
          {avisoInfo.accionTexto && (
            <button
              onClick={() => {
                if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
                setAvisoInfo(null)
                if (avisoInfo.alEjecutarAccion) avisoInfo.alEjecutarAccion()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-acento)',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 'var(--texto-cuerpo)',
                padding: 0
              }}
            >
              {avisoInfo.accionTexto}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
