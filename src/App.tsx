import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import useASR from './hooks/useASR'
import { useSeguidor } from './hooks/useSeguidor'
import { useWakeLock } from './hooks/useWakeLock'
import { usePrecargaModelo } from './hooks/usePrecargaModelo'
import useLayout from './hooks/useLayout'
import type { EsquinaRecuadroH } from './components/RecuadroCamara'
import TeleprompterView, { VeloControles } from './components/TeleprompterView'
import BarraDeTiempo from './components/BarraDeTiempo'
import { PanelCorpus } from './components/PanelCorpus'
import { bloquearRecargaAutomatica } from './lib/actualizacion'
import { iniciarGrabacion, detenerGrabacion } from './lib/grabadorCorpus'
import BibliotecaView from './components/BibliotecaView'
import EditorView from './components/EditorView'
import CuentaRegresiva from './components/CuentaRegresiva'
import { Entrada } from './components/Entrada'
import { Pantalla, movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_NORMAL, CURVA_RESORTE } from './components/movimiento'
import { encenderCamara, apagarCamara, camaraEncendida, ladoActual, LadoCamara, obtenerCalidadesSoportadas, fijarCalidadVideo, alNegarseLaCamara } from './lib/camara'
import { obtenerEspacioLibre } from './lib/archivosNativos'
import { calcularMinutosDisponibles } from './lib/espacio'
import { hapticaToqueMedio, hapticaToqueSuave, hapticaSeleccion } from './haptica'
import { IdMotor, MotorDeVoz, ResultadoVoz } from './motor/MotorDeVoz'
import { Guion, Bloque, ResumenGuion, ResumenGrabacion, guionNuevo, generarUuid, PAREJAS_COLOR } from './datos/modelo'
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
import { idiomaApp, leerIdiomaDelTelefono } from './lib/idioma'
import { PASOS_LETRA } from './components/estiloLectura'
import { PantallaAjustes } from './components/PantallaAjustes'
import { DialogoMicrofono } from './components/DialogoMicrofono'
import { DialogoPermiso } from './components/DialogoPermiso'
import { tituloDeBienvenida, bloqueDeBienvenida } from './app/bienvenida'
import { GUION_VACIO, sanitizarColores, sanitizarEngine, cargarAjustesGuardados, ajustarFuenteValida } from './app/ajustesIniciales'
import { useAviso } from './hooks/useAviso'
import { AvisoBreve } from './components/AvisoBreve'
import { IndicadorPrecarga } from './components/IndicadorPrecarga'
import { PanelDiagnostico } from './components/PanelDiagnostico'
// Las herramientas de prueba no viajan a Play -tarea 84, src/lib/herramientas.ts-.
import { HERRAMIENTAS } from './lib/herramientas'

// Cuanto se quedan los controles a la vista despues de un toque, mientras se lee.
const MS_CONTROLES_A_LA_VISTA = 4000

interface AppProps {
  motor?: MotorDeVoz
  repoOverride?: RepositorioGuiones
}

type Vista = 'biblioteca' | 'editor' | 'lectura'
type EstadoToma = 'listo' | 'leyendo'

export type FondoToma = 'detras' | 'recuadro' | 'oculta'

export { PAREJAS_COLOR }

// tituloDeBienvenida y bloqueDeBienvenida viven en app/bienvenida.ts desde el 29-09-2026
// -tarea 81-; se vuelven a exportar desde aca porque las pruebas las importan de '../App'.
export { tituloDeBienvenida, bloqueDeBienvenida } from './app/bienvenida'

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
  const { avisoInfo, mostrarAviso, cerrarAviso } = useAviso()

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
  // Ajustes es capa, no piso -tarea 77, 28-09-2026-. Encima de todo; atras solo la cierra.
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false)
  // Desde donde se abrio: cada puerta muestra lo suyo -PantallaAjustes, origen-.
  const [origenAjustes, setOrigenAjustes] = useState<'portada' | 'editor' | 'leer' | 'grabar'>('portada')
  const [mostrarDialogoMicrofono, setMostrarDialogoMicrofono] = useState(false)
  // La cámara negada, igual que el micrófono -tarea 84, F-: lib/camara.ts avisa y se abre el
  // mismo diálogo, con su título y su explicación.
  const [mostrarDialogoCamara, setMostrarDialogoCamara] = useState(false)
  useEffect(() => alNegarseLaCamara(() => setMostrarDialogoCamara(true)), [])
  // LA VOZ DEL IDIOMA, BAJÁNDOSE ANTES DE LEER -tarea 84, D3-. Solo en la versión de Play y solo
  // para el inglés, la primera vez: el avance real de la descarga, o el aviso de que falta
  // conexión. null es "no hay nada que mostrar", que es lo de siempre en la APK de prueba.
  const [descargaVoz, setDescargaVoz] = useState<
    { estado: 'descargando' | 'sin-conexion' | 'error'; progreso: number; error: string | null } | null
  >(null)
  const bajandoVozRef = useRef(false)
  // Sube al volver de LISTO: si la descarga termina después, la cuenta ya no parte en otra pantalla.
  const intentoVozRef = useRef(0)
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
  // LA ESQUINA DEL RECUADRO CON EL TELÉFONO DE LADO -tarea 82, A5, 29-09-2026-. Se guarda aparte,
  // en su propia clave: la posición en vertical -recuadroX, recuadroY- es un punto de la pantalla
  // vertical y no se toca al girar. Por omisión abajo a la derecha, como en la hoja de medidas.
  const [esquinaRecuadroH, setEsquinaRecuadroH] = useState<EsquinaRecuadroH>(() => {
    try {
      const v = localStorage.getItem('sigo_recuadro_esquina_h')
      if (v === 'der-arriba' || v === 'der-abajo' || v === 'izq-arriba' || v === 'izq-abajo') return v
    } catch (e) {}
    return 'der-abajo'
  })
  const elegirEsquinaRecuadroH = useCallback((e: EsquinaRecuadroH) => {
    setEsquinaRecuadroH(e)
    try {
      localStorage.setItem('sigo_recuadro_esquina_h', e)
    } catch (err) {}
  }, [])
  // EL DISEÑO DE LA VENTANA -tarea 82, A1-: 'tel-h' es el teléfono de lado. Ver hooks/useLayout.ts.
  const layout = useLayout()
  const horizontal = layout === 'tel-h'
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
  // EN PLAY NO SE MIDE -tarea 84, B4, 29-09-2026-. Medir es grabar el audio de cada lectura con
  // el micrófono del navegador y guardarlo en el teléfono -lib/grabadorCorpus.ts, guardarLectura-:
  // un instrumento de prueba, que en la versión de Play ni siquiera se puede apagar, porque el
  // panel de corpus no viaja. En la APK de prueba y en el navegador sigue en true, como siempre.
  const [medirLectura, setMedirLectura] = useState<boolean>(HERRAMIENTAS)
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

  // LAS BARRAS DE ANDROID SIGUEN A SIGO, NO AL TELEFONO -28-09-2026-. En el moto g86 de Javier,
  // con el modo noche en automatico y de dia, la hora y la bateria salian en iconos oscuros sobre
  // el fondo oscuro de Sigo -casi invisibles- y la barra de navegacion blanca, tambien debajo del
  // texto de la lectura. Capacitor 8 pinta las barras segun el tema del TELEFONO -SystemBars,
  // estilo DEFAULT- y los styles.xml no alcanzan. La lectura es siempre oscura: ahi, iconos claros.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const oscuro = tema !== 'claro' || vista === 'lectura'
    SystemBars.setStyle({ style: oscuro ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {
      // sin el plugin -WebView muy viejo- quedan las barras del telefono, como antes
    })
  }, [tema, vista])

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
  // Sin guion abierto -al abrir la app- vale el idioma de la app: es el del guion de bienvenida
  // y el que la persona usa, y asi la precarga silenciosa carga el modelo correcto -28-09-2026-.
  const idiomaGuion = guionActual && guionActual.idioma ? guionActual.idioma : idiomaApp()
  const langMotor = idiomaGuion === 'en' ? 'en-US' : idiomaGuion === 'es' ? 'es-ES' : idiomaGuion

  const {
    start,
    stop,
    isRecording,
    estadoMotor,
    ultimoError,
    motorActivo,
    precargar,
    pedirMicrofono,
    abrirAjustesDeLaApp,
    asegurarVoz,
    motorListo
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

  // EL MODELO DEL IDIOMA DEL GUION, CARGADO EN SILENCIO -28-09-2026-. Al abrir la app y cada vez
  // que cambia el idioma del guion en uso. Asi Empezar no espera a desempaquetar: en una
  // instalacion limpia eso tardaba mas que los tres segundos de la cuenta. Nunca mientras se
  // lee: cambiar de modelo con el microfono abierto no se puede -VoskNativoPlugin.iniciar-.
  useEffect(() => {
    if (!motorListo || isRecording || cuentaRegresiva !== null) return
    precargar(langMotor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorListo, langMotor])

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

    // EL RECONOCEDOR ARRANCA CON LA CUENTA, NO AL TERMINARLA -28-09-2026-. Arrancaba al final,
    // y eso es cargar el modelo del idioma del guion y abrir el microfono justo cuando la
    // persona empieza a hablar. Medido en todas las tomas con Grabar: el oido empezaba 1,2 s
    // despues del "1" en el moto g86 y 3,3 s en el Redmi 13C. En la lectura en vivo de la
    // traductora se perdio "Hi. Read this out loud, as" entero y el texto quedo quieto 5 s.
    // Con la cuenta de por medio, esos segundos quedan adentro de los tres de la cuenta.
    // Javier: "usualmente las personas cuando empieza la cuenta se concentran y guardan
    // silencio" -lo que se oiga en la cuenta no mueve nada que no se haya dicho-.
    // Va SIN await, como la grabacion de audio de arriba: si el motor tarda, la cuenta sigue.
    start()
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
        // start() ya no va aca: arranca al empezar la cuenta -ver arriba, 28-09-2026-.
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
    // EL PERMISO DEL MICROFONO, ANTES DE LA CUENTA -28-09-2026-. Ver MotorNativo.pedirMicrofono:
    // en la primera lectura el cartel de Android aparecia con la toma andando y tapaba el guion.
    // Si la persona lo niega, se lee igual, como antes: el motivo queda a la vista.
    // CAMBIO Y MOTIVO (28-09-2026): si pedirMicrofono() devuelve false, NO se empieza -no se llama
    // setEstadoToma('leyendo') ni handleStart()-: se abre el dialogo explicativo y la pantalla
    // queda en LISTO. Motivo: sin microfono el texto no avanza y, con camara, la toma saldria muda.
    const concedido = await pedirMicrofono()
    if (!concedido) {
      setMostrarDialogoMicrofono(true)
      return
    }
    // LA VOZ DEL GUION TIENE QUE ESTAR EN EL TELÉFONO ANTES DE LA CUENTA -tarea 84, D3, 29-09-2026-.
    // En la versión de Play el modelo inglés no viene con la instalación: la primera vez se baja
    // aquí, con el avance a la vista -IndicadorPrecarga-, y la cuenta parte cuando termina. Sin
    // internet se dice que hace falta conexión una vez, y la lectura NO parte: sin modelo el texto
    // no avanzaría y nadie sabría por qué. En la APK de prueba los dos modelos vienen dentro y
    // esto vuelve al instante, sin mostrar nada. Un segundo toque mientras baja no pide otra
    // descarga.
    if (bajandoVozRef.current) return
    bajandoVozRef.current = true
    const intento = ++intentoVozRef.current
    let voz: ResultadoVoz
    try {
      voz = await asegurarVoz(langMotor, (fraccion) => {
        setDescargaVoz({ estado: 'descargando', progreso: fraccion, error: null })
      })
    } catch (e: any) {
      setDescargaVoz({ estado: 'error', progreso: 0, error: e?.message || String(e) })
      return
    } finally {
      bajandoVozRef.current = false
    }
    if (intento !== intentoVozRef.current) return
    if (voz === 'sin-conexion') {
      setDescargaVoz({ estado: 'sin-conexion', progreso: 0, error: null })
      return
    }
    setDescargaVoz(null)
    setEstadoToma('leyendo')
    setControlesVisibles(false)
    await handleStart()
  }

  function handleVolverDesdeListo() {
    hapticaToqueMedio()
    // Si la voz en inglés se estaba bajando, sigue bajando -Play la termina igual y queda para la
    // próxima-, pero la lectura ya no parte sola al terminar -tarea 84, D3-.
    intentoVozRef.current++
    setDescargaVoz(null)
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

  function handleElegirLetra(n: number) {
    if (!PASOS_LETRA.includes(n) || n === fontSize) return
    hapticaSeleccion()
    setFontSize(n)
  }

  function handleAbrirAjustes(origen: 'portada' | 'editor' | 'leer' | 'grabar' = 'portada') {
    hapticaToqueSuave()
    setOrigenAjustes(origen)
    setAjustesAbiertos(true)
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

  // EL AVISO AL PARAR SIN VIDEO -28-09-2026-. Decia "Grabado: 1:29" tambien al parar una
  // LECTURA, donde no se grabo nada -visto en el moto g86 de Javier-. Leer dice cuanto se leyo;
  // "Grabado" queda para una toma que no llego al reproductor. Era el mismo bloque copiado en
  // Salir y en Parar: ahora vive aca.
  function avisarFinDeToma(duracionMs: number | null) {
    if (duracionMs !== null && duracionMs > 0) {
      const totalSeg = Math.floor(duracionMs / 1000)
      const mins = Math.floor(totalSeg / 60)
      const segs = String(totalSeg % 60).padStart(2, '0')
      mostrarAviso(t(conCamara ? 'grabadoDuracion' : 'lecturaDuracion', { duracion: `${mins}:${segs}` }))
    } else {
      mostrarAviso(t(conCamara ? 'grabado' : 'lecturaTerminada'))
    }
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
      // El dialogo de microfono abierto es lo PRIMERO que se cierra -28-09-2026-.
      if (mostrarDialogoMicrofono) {
        setMostrarDialogoMicrofono(false)
        return
      }
      // Y el de la cámara, igual -tarea 84, F1-.
      if (mostrarDialogoCamara) {
        setMostrarDialogoCamara(false)
        return
      }
      // 1. Si hay un modal abierto, cerrarlo
      if (cerrarModalRef.current && cerrarModalRef.current()) {
        return
      }
      // Ajustes es capa, no piso: el atras solo la cierra. 28-09-2026.
      if (ajustesAbiertos) {
        setAjustesAbiertos(false)
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

  // PAUSA Y SEGUIR VAN EN FILA -tarea 85, 29-09-2026-. Cada toque esperaba solo lo suyo: si
  // Seguir llegaba mientras Pausa todavía estaba apagando el micrófono, start() corría en
  // paralelo con el stop() anterior. En el teléfono, MotorNativo.detener() termina sacando las
  // suscripciones que tenga en ese momento, y ahí ya estaban las que el iniciar() de Seguir
  // acababa de poner: Vosk escuchaba y nadie recibía sus frases, así que ese primer Seguir no
  // arrancaba y había que pausar y seguir otra vez. Ahora cada encendido o apagado espera a que
  // termine el anterior. El botón cambia al tiro -setEnPausa- para que el toque se vea atendido.
  // El .catch es para que un fallo no deje la fila trabada: start() y stop() ya avisan el error
  // por su cuenta -ultimoError-.
  const filaPausaRef = useRef<Promise<void>>(Promise.resolve())
  const handleTogglePausa = async () => {
    const paso = enPausa ? start : stop
    setEnPausa(!enPausa)
    const turno = filaPausaRef.current.then(() => paso()).catch(() => {})
    filaPausaRef.current = turno
    await turno
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

  // UN RIEL DEL TELÉFONO DE LADO AL LEER -tarea 82, A4, 29-09-2026-. De lado envuelve los botones
  // en su riel -el fondo del tema, o vidrio con la cámara detrás-; en vertical los deja tal cual,
  // sin envoltorio, para que la pantalla vertical no cambie ni un elemento. hayBoton: el riel
  // izquierdo de Grabar sin pausa no tiene nada que mostrar y no se dibuja.
  const enRiel = (lado: 'izquierdo' | 'derecho', hayBoton: boolean, hijos: React.ReactNode) => {
    if (!horizontal) return hijos
    if (!hayBoton) return null
    const sobreImagen = camaraActiva && fondoToma === 'detras'
    return (
      <div
        data-testid={`riel-${lado}`}
        className={`riel-lectura riel-${lado}${lado === 'izquierdo' && conCamara ? ' riel-grabar' : ''}${sobreImagen ? ' sobre-imagen' : ''}`}
      >
        <div className="riel-fondo" aria-hidden="true" />
        {hijos}
      </div>
    )
  }

  // Dónde empieza y termina la columna, para centrar el aviso en ella -AvisoBreve-. Las mismas
  // variables que usa TeleprompterView para el relleno de la columna.
  const columnaDelAviso = () => {
    const rielIzq = conCamara ? 'var(--riel-izq-grabar)' : 'var(--riel-izq-leer)'
    const conRecuadro = camaraActiva && fondoToma === 'recuadro'
    const recuadroIzq = conRecuadro && esquinaRecuadroH.startsWith('izq')
    return {
      izquierda: `calc(${rielIzq}${recuadroIzq ? ' + var(--carril-recuadro-h)' : ''} + env(safe-area-inset-left, 0px))`,
      derecha: `calc(var(--riel-der)${conRecuadro && !recuadroIzq ? ' + var(--carril-recuadro-h)' : ''} + env(safe-area-inset-right, 0px))`
    }
  }

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

      {(estadoPrecarga === 'descargando' || estadoPrecarga === 'error') && (
        <IndicadorPrecarga
          estadoPrecarga={estadoPrecarga}
          progresoPrecarga={progresoPrecarga}
          errorPrecarga={errorPrecarga}
          reintentarPrecarga={reintentarPrecarga}
          oculto={camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro') && vista === 'lectura'}
        />
      )}

      {/* HERRAMIENTAS delante -tarea 84, B1-: con --mode play la condición queda en false al armar
          y PanelDiagnostico no llega al paquete. */}
      {HERRAMIENTAS && mostrarDiagnostico && (
        <PanelDiagnostico
          ultimoError={ultimoError}
          errorRepositorio={errorRepositorio}
          camaraActiva={camaraActiva}
          fondoToma={fondoToma}
          vista={vista}
          estadoMotor={estadoMotor}
          modoManual={modoManual}
          motorActivo={motorActivo}
          wakeLockActivo={wakeLockActivo}
          textoFreno={textoFreno}
          usandoMemoriaFallback={usandoMemoriaFallback}
          engine={engine}
          setEngine={setEngine}
          verTranscripcion={verTranscripcion}
          setVerTranscripcion={setVerTranscripcion}
          setMostrarPanelCorpus={setMostrarPanelCorpus}
        />
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
            onAbrirAjustes={() => handleAbrirAjustes('portada')}
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
            onAbrirAjustes={() => handleAbrirAjustes('editor')}
            onRegistrarCerrarModal={(fn) => { cerrarModalRef.current = fn }}
            // LAS TOMAS DE ESTE GUION, de la más nueva a la más vieja -tarea 76, 28-09-2026-.
            // Salen de grabaciones, el mismo estado de la tira: al borrar la última desde el
            // reproductor, la lista se vuelve a leer y la banda se va sola. El reproductor se
            // dibuja encima de cualquier vista -ReproductorGrabacion, más abajo-: el editor queda
            // montado debajo, con su texto y su desplazamiento, y al cerrarlo está como estaba.
            tomas={grabaciones
              .filter((g) => g.guionId === guionActual.id)
              .sort((a, b) => b.creado - a.creado)}
            onAbrirToma={(g) => setGrabacionAbierta(g)}
          />
        </Pantalla>
      )}

      {vista === 'lectura' && guionActual && (
        <div
          className="alto-pantalla"
          // 29-09-2026, tarea 82: con el teléfono de lado la superficie lleva .layout-tel-h y los
          // estilos del riel cuelgan de ella -styles-horizontal.css-. Va como un className que
          // pisa al de arriba solo de lado, y no en una sola cadena armada, porque A3
          // -altoPantalla.test.ts- busca el texto className="alto-pantalla" en este archivo y las
          // pruebas de hoy no se tocan. En vertical el elemento queda idéntico.
          {...((horizontal ? { className: 'alto-pantalla layout-tel-h' } : {}) as { className?: string })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            // El alto va por la clase .alto-pantalla -100vh y despues 100dvh, styles.css-: 100dvh
            // escrito aca dejaba sin Empezar a los navegadores viejos. 28-09-2026.
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
              {/* El velo de abajo, el mismo de LISTO -VeloControles, TeleprompterView.tsx-. */}
              {/* 29-09-2026, tarea 82: de lado no va: los controles aparecen en los rieles,
                  nunca sobre el texto. */}
              {!horizontal && <VeloControles colorFondo={colorFondo} />}
              {/* LOS RIELES AL LEER, DE LADO -tarea 82, A4, 29-09-2026-. Con los controles a la
                  vista aparecen los rieles: a la izquierda salir -Leer- o el tacho -Grabar en
                  pausa-, en el lugar del ‹ de LISTO; a la derecha la pausa arriba y parar al
                  centro, en el lugar de Empezar. El riel izquierdo solo se dibuja si tiene un
                  botón. Los botones son los mismos de vertical, con sus testid: enRiel solo los
                  envuelve. Sin controles no hay rieles, pero la columna no se ensancha: su
                  relleno es el mismo -TeleprompterView-. */}
              {enRiel('izquierdo', (!conCamara || enPausa), <>
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
                    if (!resumen) avisarFinDeToma(duracionMs)
                  }}
                  style={{
                    position: 'absolute',
                    top: 'calc(8px + env(safe-area-inset-top, 0px))',
                    // 29-09-2026, tarea 82: de lado, a 12 del borde, donde está el ‹ de LISTO.
                    left: horizontal ? 'calc(12px + env(safe-area-inset-left, 0px))' : 'calc(8px + env(safe-area-inset-left, 0px))',
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
                    // 29-09-2026, tarea 82: de lado, a 12 del borde, en el riel izquierdo.
                    left: horizontal ? 'calc(12px + env(safe-area-inset-left, 0px))' : 'calc(8px + env(safe-area-inset-left, 0px))',
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
              </>)}

              {enRiel('derecho', true, <>
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
                  // 29-09-2026, tarea 82: de lado, centrada en el riel derecho -(124 - 40) / 2-.
                  right: horizontal ? 'calc((var(--riel-der) - 40px) / 2 + env(safe-area-inset-right, 0px))' : 'calc(8px + env(safe-area-inset-right, 0px))',
                  zIndex: 100,
                  animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
                }}
              >
                {enPausa ? <IconoEmpezar tamano={20} /> : <IconoPausa tamano={20} />}
              </button>

              {/* 29-09-2026, tarea 82: de lado, parar va al centro del riel derecho, donde estaba
                  Empezar -riel-lugar-centro, styles-horizontal.css-. */}
              <div
                className={horizontal ? 'riel-lugar-centro riel-lugar-leyendo' : undefined}
                style={horizontal ? undefined : {
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
                    if (!resumen) avisarFinDeToma(duracionMs)
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
              </>)}
            </>
          )}

          <div
            ref={prompterContainerRef}
            className="alto-pantalla"
            style={{
              width: '100%',
              // Alto: .alto-pantalla, mismo motivo que el contenedor de arriba. 28-09-2026.
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
              onElegirLetra={handleElegirLetra}
              onAbrirAjustes={() => handleAbrirAjustes(conCamara ? 'grabar' : 'leer')}
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
              horizontal={horizontal}
              esquinaRecuadroH={esquinaRecuadroH}
              setEsquinaRecuadroH={elegirEsquinaRecuadroH}
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
                // 29-09-2026, tarea 82: de lado, abajo del riel derecho.
                enRiel={horizontal}
              />
            )}
          </div>
        </div>
      )}

      {/* Igual que el diagnóstico: el panel de corpus no viaja a Play -tarea 84, B1-. */}
      {HERRAMIENTAS && mostrarPanelCorpus && (
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
          guiones={guionesResumen}
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

      {mostrarDialogoMicrofono && (
        <DialogoMicrofono
          onCerrar={() => setMostrarDialogoMicrofono(false)}
          onAbrirAjustes={() => {
            abrirAjustesDeLaApp()
          }}
        />
      )}

      {/* La cámara negada -tarea 84, F-: el mismo diálogo. "Abrir ajustes" abre la misma pantalla
          de Sigo en Android -VoskNativoPlugin.abrirAjustesDeLaApp-, donde están los dos permisos. */}
      {mostrarDialogoCamara && (
        <DialogoPermiso
          tipo="camara"
          onCerrar={() => setMostrarDialogoCamara(false)}
          onAbrirAjustes={() => {
            abrirAjustesDeLaApp()
          }}
        />
      )}

      {/* La voz en inglés bajándose, o el aviso de que falta conexión -tarea 84, D3-. El mismo
          IndicadorPrecarga de siempre, en una capa fija arriba -.aviso-voz, styles.css-: se abre
          desde LISTO, donde el indicador del flujo de la página queda tapado por la lectura. */}
      {descargaVoz && (
        <div className="aviso-voz" data-testid="aviso-voz">
          <IndicadorPrecarga
            estadoPrecarga={descargaVoz.estado}
            progresoPrecarga={descargaVoz.progreso}
            errorPrecarga={descargaVoz.error}
            reintentarPrecarga={() => {
              setDescargaVoz(null)
              handleEmpezarDesdeListo()
            }}
            oculto={false}
          />
        </div>
      )}

      {ajustesAbiertos && (
        <PantallaAjustes
          onCerrar={() => setAjustesAbiertos(false)}
          origen={origenAjustes}
          fontSize={fontSize}
          onElegirLetra={handleElegirLetra}
          tipoFuente={tipoFuente}
          setTipoFuente={(v) => {
            hapticaSeleccion()
            setTipoFuente(v)
          }}
          columnaAngosta={columnaAngosta}
          marginPercent={marginPercent}
          setColumnaAngosta={setColumnaAngosta}
          setMarginPercent={setMarginPercent}
          colorFondo={colorFondo}
          colorLetra={colorLetra}
          setColorFondo={setColorFondo}
          setColorLetra={setColorLetra}
          mirror={mirror}
          setMirror={(v) => {
            hapticaSeleccion()
            setMirror(v)
          }}
          mostrarTiempo={mostrarTiempo}
          setMostrarTiempo={(v) => {
            hapticaSeleccion()
            setMostrarTiempo(v)
          }}
          tema={tema}
          setTema={(v) => {
            hapticaSeleccion()
            setTema(v)
          }}
        />
      )}

      {/* LA FRANJA DE LA HORA -28-09-2026-. Con las barras de Android transparentes, al bajar la
          portada el titulo de la tarjeta pasaba por detras de la hora y la bateria -visto en el
          moto g86-. Una franja del color del suelo, del alto del area segura, tapa lo que sube.
          En la lectura no: ahi manda el lienzo, de borde a borde. */}
      {vista !== 'lectura' && <div className="franja-hora" aria-hidden="true" />}

      {/* 29-09-2026, tarea 82: de lado el aviso va centrado en la columna, entre los rieles. Los
          anchos son las variables del riel -styles-horizontal.css-; el carril del recuadro se suma
          del lado donde está, igual que en TeleprompterView. */}
      <AvisoBreve
        avisoInfo={avisoInfo}
        enLectura={vista === 'lectura'}
        cerrarAviso={cerrarAviso}
        columnaHorizontal={horizontal ? columnaDelAviso() : null}
      />
    </div>
  )
}
