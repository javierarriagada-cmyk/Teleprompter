import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
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
import { Pantalla, movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_NORMAL } from './components/movimiento'
import { hapticaToqueMedio, hapticaToqueSuave } from './haptica'
import { IdMotor, MotorDeVoz } from './motor/MotorDeVoz'
import { Guion, ResumenGuion, guionNuevo, PAREJAS_COLOR } from './datos/modelo'
import { RepositorioGuiones } from './datos/RepositorioGuiones'
import { RepositorioIndexedDB } from './datos/RepositorioIndexedDB'
import { RepositorioMemoria } from './datos/RepositorioMemoria'
import { importarArchivo } from './datos/importarArchivo'

// Cuanto se quedan los controles a la vista despues de un toque, mientras se lee.
const MS_CONTROLES_A_LA_VISTA = 4000

interface AppProps {
  motor?: MotorDeVoz
  repoOverride?: RepositorioGuiones
}

type Vista = 'biblioteca' | 'editor' | 'lectura'

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

export default function App({ motor, repoOverride }: AppProps) {
  const repoRef = useRef<RepositorioGuiones>(repoOverride || new RepositorioIndexedDB())
  const [usandoMemoriaFallback, setUsandoMemoriaFallback] = useState<boolean>(false)
  const [errorRepositorio, setErrorRepositorio] = useState<string | null>(null)

  const [vista, setVista] = useState<Vista>('biblioteca')
  const origenLecturaRef = useRef<'biblioteca' | 'editor'>('editor')
  const prevVistaRef = useRef<Vista | null>(null)
  const [direccion, setDireccion] = useState<'adentro' | 'atras' | 'inicial'>('inicial')
  const guionModificadoRef = useRef<boolean>(false)
  const [avisoTexto, setAvisoTexto] = useState<string | null>(null)
  const timerAvisoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarAviso = useCallback((msg: string) => {
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
    setAvisoTexto(msg)
    timerAvisoRef.current = setTimeout(() => {
      setAvisoTexto(null)
      timerAvisoRef.current = null
    }, 2000)
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
  const [marginPercent, setMarginPercent] = useState<number>(ajustesPrevios.marginPercent !== undefined ? Number(ajustesPrevios.marginPercent) : 5)
  const [mirror, setMirror] = useState<boolean>(Boolean(ajustesPrevios.mirror))
  const [lineasZona, setLineasZona] = useState<number>(ajustesPrevios.lineasZona !== undefined ? Number(ajustesPrevios.lineasZona) : 3)
  const [anclajeZona, setAnclajeZona] = useState<'arriba' | 'medio' | 'abajo'>(ajustesPrevios.anclajeZona || 'arriba')
  const [tema, setTema] = useState<'sistema' | 'claro' | 'oscuro'>(
    ajustesPrevios.tema === 'claro' || ajustesPrevios.tema === 'oscuro' || ajustesPrevios.tema === 'sistema'
      ? ajustesPrevios.tema
      : 'sistema'
  )

  // COLUMNA ANCHA POR OMISION. Estaba en angosta y Javier lo pregunto el 13 de septiembre
  // de 2026: la angosta es una opcion para quien la quiera, no el punto de partida. En un
  // telefono la angosta deja tres o cuatro palabras por renglon y obliga a saltar de linea
  // todo el tiempo. Y ahora la eleccion se recuerda, como el resto de los ajustes.
  const [columnaAngosta, setColumnaAngosta] = useState<boolean>(
    ajustesPrevios.columnaAngosta !== undefined ? Boolean(ajustesPrevios.columnaAngosta) : false
  )

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
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false)
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState<boolean>(false)

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
        tipoFuente
      }
      localStorage.setItem('teleprompter_ajustes', JSON.stringify(objetoAjustes))
    } catch (e) {
    }
  }, [fontSize, marginPercent, mirror, lineasZona, anclajeZona, mostrarTiempo, verTranscripcion, tema, engine, columnaAngosta, colorFondo, colorLetra, tipoFuente])

  const cargarBiblioteca = useCallback(async () => {
    let repo = repoRef.current
    try {
      const lista = await repo.listar()
      setGuionesResumen(lista)
    } catch (e) {
      console.warn('[App] Error al acceder a RepositorioIndexedDB, cayendo a RepositorioMemoria:', e)
      repo = new RepositorioMemoria()
      repoRef.current = repo
      setUsandoMemoriaFallback(true)
      setErrorRepositorio('IndexedDB no está disponible; se está usando almacenamiento en memoria.')
      try {
        const lista = await repo.listar()
        setGuionesResumen(lista)
      } catch (err) {
        console.warn('[App] Error al listar de RepositorioMemoria:', err)
      }
    }
  }, [])

  // Cargar/Migrar al arrancar
  useEffect(() => {
    async function inicializar() {
      // Verificar si el repositorio funciona o caer a fallback si no está disponible
      try {
        await repoRef.current.listar()
      } catch (e) {
        console.warn('[App] Error al acceder a RepositorioIndexedDB, cayendo a RepositorioMemoria:', e)
        repoRef.current = new RepositorioMemoria()
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
          titulo: 'Guion importado',
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
            titulo: 'Hola',
            idioma: 'es',
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
            bloques: [
              {
                id: 'b-bienvenida-1',
                nombre: '',
                texto: [
                  'Hola. Lee esto en voz alta, con o sin apuro, como prefieras.',
                  '',
                  'Ahora fíjate en el texto. Se está moviendo solo, al ritmo en que hablas, sin que toques nada.',
                  '',
                  'Te acompaña para darte la comodidad y la tranquilidad que necesitas. Queremos que toda tu concentración esté donde debe estar. Cuando quieras, puedes recorrer los ajustes y dejar la experiencia a tu medida.',
                  '',
                  'Nuestra tarea es que puedas mirar la cámara y no la pantalla. No tienes que memorizar. No tienes que apurarte para alcanzar el texto. Puedes transmitir la emoción que quieras, en el momento que quieras.',
                  '',
                  'Sirve para grabar un video, dar una clase o preparar una entrevista.',
                  '',
                  'Cuando termines, borra esto y escribe tu propio guion.'
                ].join('\n')
              }
            ]
          }

          try {
            await repoRef.current.guardar(guionBienvenida)
          } catch (e) {
            console.warn('[App] Error al crear guion de bienvenida:', e)
          }
        }
      }

      await cargarBiblioteca()
      setCargado(true)
    }

    inicializar()
  }, [cargarBiblioteca, repoOverride])

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

  async function handleCrearNuevoGuion() {
    const nuevo = guionNuevo('es')
    try {
      await repoRef.current.guardar(nuevo)
      setGuionActual(nuevo)
      await cargarBiblioteca()
      setVista('editor')
    } catch (e) {
      console.warn('[App] Error al crear nuevo guion:', e)
    }
  }

  async function handleImportarArchivo(file: File) {
    try {
      const res = await importarArchivo(file)
      const nuevo: Guion = {
        id: 'g-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        titulo: res.titulo,
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        archivado: false,
        bloques: res.bloques
      }
      await repoRef.current.guardar(nuevo)
      setGuionActual(nuevo)
      await cargarBiblioteca()
      setVista('editor')
    } catch (e) {
      console.warn('[App] Error al importar archivo:', e)
    }
  }

  async function handleRenombrarGuion(id: string, nuevoTitulo: string) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        g.titulo = nuevoTitulo
        await repoRef.current.guardar(g)
        if (guionActual && guionActual.id === id) {
          setGuionActual({ ...g })
        }
        await cargarBiblioteca()
      }
    } catch (e) {
      console.warn('[App] Error al renombrar guion:', e)
    }
  }

  async function handleBorrarGuion(id: string) {
    try {
      await repoRef.current.borrar(id)
      if (guionActual && guionActual.id === id) {
        setGuionActual(null)
        setVista('biblioteca')
      }
      await cargarBiblioteca()
    } catch (e) {
      console.warn('[App] Error al borrar guion:', e)
    }
  }

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
    if (vista !== 'lectura') {
      cancelarCuentaRegresiva()
    }
  }, [vista, cancelarCuentaRegresiva])

  const guionParaSeguidor = guionActual || GUION_VACIO

  const {
    bloqueActual,
    lineaActual,
    palabraActual,
    totalTokens,
    alRecibirParcial: seguidorParcial,
    alRecibirFinal: seguidorFinal,
    alNotificarVoz: seguidorVoz,
    reiniciar,
    irAToken,
    motorAvance
  } = useSeguidor(guionParaSeguidor)

  const {
    start,
    stop,
    clear,
    isRecording,
    transcript,
    estadoMotor,
    ultimoError,
    motorActivo
  } = useASR({
    engine,
    lang: guionActual && guionActual.idioma ? `${guionActual.idioma}-${guionActual.idioma.toUpperCase()}` : 'es-ES',
    motor,
    acumularTexto: verTranscripcion,
    alRecibirParcial: seguidorParcial,
    alRecibirFraseFinal: seguidorFinal,
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
      }
    }, 1000)
  }

  async function handleEntrarLectura(origen: 'biblioteca' | 'editor' = 'editor') {
    origenLecturaRef.current = origen
    hapticaToqueMedio()
    setVista('lectura')
    setControlesVisibles(false)
    await handleStart()
  }

  async function handleLeerDirecto(id: string) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        setGuionActual(g)
        await handleEntrarLectura('biblioteca')
      }
    } catch (e) {
      console.warn('[App] Error al abrir directo para lectura:', e)
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

  async function handleStop() {
    cancelarCuentaRegresiva()
    setTInicioLecturaMs(null)
    setEnPausa(false)
    await stop()
    // El audio se corta DESPUES del motor, no antes: si se cortara primero, los ultimos
    // calces quedarian anotados con un milisegundo que ya no existe en el archivo.
    await detenerGrabacion()
    await soltarWakeLock()

    // LOS CONTROLES VUELVEN AL PARAR, sin tener que tocar la pantalla.
    //
    // Volver con el toque ya existia -onToggleControles, que TeleprompterView dispara y que
    // sabe distinguir un toque de un arrastre; lo cuida T91-. Esto es otra cosa: al APRETAR
    // DETENER la lectura termino, y lo primero que uno quiere ver es justamente lo que hay
    // ahi -que quedo grabado, como sigue-. Pedirle un toque de mas en ese momento es pedirle
    // que adivine que los controles se traen tocando.
    setControlesVisibles(true)
  }

  // Ref para manejar el evento de botón de atrás en Android
  const handleVolverAtrasRef = useRef<() => Promise<void> | void>(() => {})
  useEffect(() => {
    handleVolverAtrasRef.current = async () => {
      // 1. Si hay un modal abierto, cerrarlo
      if (cerrarModalRef.current && cerrarModalRef.current()) {
        return
      }
      // 2. Durante la lectura, hacer exactamente lo mismo que "Salir": handleStop y volver al origen
      if (vista === 'lectura') {
        await handleStop()
        setVista(origenLecturaRef.current)
        return
      }
      // 3. En el editor, volver a la biblioteca
      if (vista === 'editor') {
        setVista('biblioteca')
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

  function handleClear() {
    clear()
    reiniciar()
  }

  const handleTogglePausa = async () => {
    if (enPausa) {
      setEnPausa(false)
      await start()
    } else {
      setEnPausa(true)
      await stop()
    }
  }

  function toggleFullscreen() {
    if (!prompterContainerRef.current) return
    if (!document.fullscreenElement) {
      prompterContainerRef.current.requestFullscreen().then(() => {
        setEsPantallaCompleta(true)
      }).catch((err) => {
        console.warn('Error al activar pantalla completa:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setEsPantallaCompleta(false)
      }).catch(() => {})
    }
  }

  useEffect(() => {
    const handleFSChange = () => {
      setEsPantallaCompleta(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

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

  const tituloMostrar = (guionActual && guionActual.titulo && guionActual.titulo.trim()) ? guionActual.titulo : 'Sin título'

  return (
    <div
      style={{
        paddingTop: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-top, 0px))',
        paddingBottom: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-left, 0px))',
        paddingRight: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-right, 0px))',
        fontFamily: 'sans-serif',
        maxWidth: vista === 'lectura' ? 'none' : 1200,
        margin: '0 auto'
      }}
    >

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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {estadoPrecarga === 'descargando' && (
            <span>
              ⏬ Descargando modelo de voz para uso offline: <strong>{Math.round(progresoPrecarga * 100)}%</strong>
            </span>
          )}
          {estadoPrecarga === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)', width: '100%', justifyContent: 'space-between' }}>
              <span>
                ⚠️ Error descargando modelo de voz Vosk: {errorPrecarga || 'Desconocido'}.
              </span>
              <button
                onClick={reintentarPrecarga}
                style={{ padding: 'var(--aire-1) var(--aire-2)', fontSize: 'var(--texto-meta)', cursor: 'pointer' }}
              >
                Reintentar
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
            border: '1px solid var(--color-borde)'
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
        </div>
      )}

      {(vista === 'biblioteca' || (vista === 'lectura' && origenLecturaRef.current === 'biblioteca')) && (
        <Pantalla direccion={direccion}>
          <BibliotecaView
            guiones={guionesResumen}
            onAbrir={handleAbrirGuion}
            onLeerDirecto={handleLeerDirecto}
            onCrearNuevo={handleCrearNuevoGuion}
            onImportarArchivo={handleImportarArchivo}
            onRenombrar={handleRenombrarGuion}
            onBorrar={handleBorrarGuion}
            onArchivar={handleArchivarGuion}
            onBuscarGuionCompleto={(id) => repoRef.current.abrir(id)}
            onToggleDiagnostico={() => setMostrarDiagnostico((prev) => !prev)}
            medirLectura={medirLectura}
            setMedirLectura={setMedirLectura}
            engine={engine}
            setEngine={setEngine}
            verTranscripcion={verTranscripcion}
            setVerTranscripcion={setVerTranscripcion}
            tema={tema}
            setTema={setTema}
            onRegistrarCerrarModal={(fn) => { cerrarModalRef.current = fn }}
            style={{
              filter: vista === 'lectura' ? 'brightness(0.15)' : 'none',
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
            onVolverBiblioteca={() => {
              if (guionModificadoRef.current) {
                mostrarAviso('Guardado')
                guionModificadoRef.current = false
              }
              setVista('biblioteca')
            }}
            onEntrarLectura={() => handleEntrarLectura('editor')}
            fontSize={fontSize}
            onLetraMenos={handleLetraMenos}
            onLetraMas={handleLetraMas}
            marginPercent={marginPercent}
            setMarginPercent={setMarginPercent}
            mirror={mirror}
            setMirror={setMirror}
            anclajeZona={anclajeZona}
            setAnclajeZona={setAnclajeZona}
            verTranscripcion={verTranscripcion}
            setVerTranscripcion={setVerTranscripcion}
            mostrarTiempo={mostrarTiempo}
            setMostrarTiempo={setMostrarTiempo}
            columnaAngosta={columnaAngosta}
            setColumnaAngosta={setColumnaAngosta}
            colorFondo={colorFondo}
            setColorFondo={setColorFondo}
            colorLetra={colorLetra}
            setColorLetra={setColorLetra}
            tipoFuente={tipoFuente}
            setTipoFuente={setTipoFuente}
            tema={tema}
            setTema={setTema}
            engine={engine}
            setEngine={setEngine}
            onRegistrarCerrarModal={(fn) => { cerrarModalRef.current = fn }}
          />
        </Pantalla>
      )}

      {vista === 'lectura' && guionActual && (
        <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}>
          {controlesVisibles && (
            <div
              data-testid="panel-controles-lectura"
              data-duracion-entra={MS_CHICO}
              data-duracion-sale={MS_PANTALLA}
              style={{
                position: 'absolute',
                bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                left: 'calc(16px + env(safe-area-inset-left, 0px))',
                right: 'calc(16px + env(safe-area-inset-right, 0px))',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-superficie)',
                border: '1px solid var(--color-borde)',
                borderRadius: 'var(--redondeo)',
                padding: 'var(--aire-2) var(--aire-3)',
                color: 'var(--color-texto)',
                animation: movimientoApagado()
                  ? 'none'
                  : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`,
                transition: movimientoApagado()
                  ? 'none'
                  : `opacity ${MS_CHICO}ms ${CURVA_NORMAL}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)' }}>
                <button
                  onClick={async () => {
                    hapticaToqueMedio()
                    const duracionMs = tInicioLecturaMs ? performance.now() - tInicioLecturaMs : null
                    await handleStop()
                    if (duracionMs !== null && duracionMs > 0) {
                      const totalSeg = Math.floor(duracionMs / 1000)
                      const mins = Math.floor(totalSeg / 60)
                      const segs = String(totalSeg % 60).padStart(2, '0')
                      mostrarAviso(`Grabado: ${mins}:${segs}`)
                    } else {
                      mostrarAviso('Grabado')
                    }
                    setVista(origenLecturaRef.current)
                  }}
                  style={{
                    padding: 'var(--aire-2) var(--aire-3)',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-suelo)',
                    border: '1px solid var(--color-borde)',
                    borderRadius: 'var(--redondeo)',
                    color: 'var(--color-texto)',
                    fontWeight: 600,
                    fontSize: 'var(--texto-cuerpo)'
                  }}
                >
                  ← Salir
                </button>

                <button
                  data-testid="btn-pausa-lectura"
                  onClick={handleTogglePausa}
                  style={{
                    padding: 'var(--aire-2) var(--aire-3)',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-suelo)',
                    border: '1px solid var(--color-borde)',
                    borderRadius: 'var(--redondeo)',
                    color: 'var(--color-texto)',
                    fontWeight: 600,
                    fontSize: 'var(--texto-cuerpo)'
                  }}
                >
                  {enPausa ? 'Seguir' : 'Pausa'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)' }}>
                <span className="texto-meta" style={{ color: 'var(--color-apagado)', fontWeight: 600 }}>Letra:</span>
                <button
                  onClick={handleLetraMenos}
                  aria-label="Disminuir letra"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 'var(--texto-titulo)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: 'var(--redondeo)',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--bg-suelo)',
                    color: 'var(--color-texto)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  -
                </button>
                <span data-testid="valor-letra" style={{ minWidth: 32, textAlign: 'center', fontWeight: 'bold', fontSize: 'var(--texto-cuerpo)', color: 'var(--color-texto)' }}>
                  {fontSize}
                </span>
                <button
                  onClick={handleLetraMas}
                  aria-label="Aumentar letra"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 'var(--texto-titulo)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: 'var(--redondeo)',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--bg-suelo)',
                    color: 'var(--color-texto)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div
            ref={prompterContainerRef}
            style={{
              width: '100%',
              height: '100dvh',
              background: colorFondo,
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
              colorFondo={colorFondo}
              colorLetra={colorLetra}
              tipoFuente={tipoFuente}
              isRecording={isRecording || cuentaRegresiva !== null}
              enPausa={enPausa}
              onToggleControles={() => setControlesVisibles((prev) => !prev)}
              onNavegacionManual={irAToken}
              onModoManualChange={setModoManual}
              onEstadoAvanceChange={handleEstadoAvanceChange}
            />
            <CuentaRegresiva valor={cuentaRegresiva} />
          </div>

          {mostrarTiempo && (
            <BarraDeTiempo
              motorAvance={motorAvance}
              totalTokens={totalTokens}
              tInicioLecturaMs={tInicioLecturaMs}
            />
          )}
        </div>
      )}

      {/* Toast / Aviso Breve */}
      {avisoTexto && (
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
            pointerEvents: 'none',
            animation: movimientoApagado() ? 'none' : `panelSube ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
          }}
        >
          {avisoTexto}
        </div>
      )}
    </div>
  )
}
