import React from 'react'
import { Capacitor } from '@capacitor/core'
import { ResumenGrabacion, ResumenGuion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs, nombreDeToma } from './TiraGrabaciones'
// -tomas-grandes- Antes: import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, exportarAGaleria, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo, analizarVideo } from '../lib/archivosNativos'
import { textoDeSubtitulos } from '../lib/archivosDeToma'
// -visor-servidor- Antes: import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, exportarAGaleria, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo, analizarVideo, seVeConReproductorDelSistema, abrirConReproductor } from '../lib/archivosNativos'
import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, exportarAGaleria, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo, analizarVideo, direccionDeToma } from '../lib/archivosNativos'
import { orientacionDeToma } from '../lib/orientacion'
import { anotar87, medirBordesSeguros, anotarOrientacion } from '../lib/medicionesTarea87'
// -tomas-largas- Antes: import { subtitulosConCortes, estiloSubtituloGuardado, guardarEstiloSubtitulo, EstiloSubtitulo, Subtitulo, FormaCuadro } from '../lib/subtitulos'
import { subtitulosConCortes, EstiloSubtitulo, Subtitulo, FormaCuadro } from '../lib/subtitulos'
import { CapaSubtitulos, SelectorSubtitulos } from './SubtitulosVisor'
import { MarcaGuia } from './MarcaGuia'
import { debeMostrarMarcaSubtitulos, abrirMarcaSiCorresponde, marcarComoVista, marcaYaVista, registrarCierreAfuera } from '../lib/marcasGuia'
// EL FILTRO DE LA TOMA -tarea 96-. Ver lib/filtros.ts y SelectorFiltro.tsx.
import { SelectorFiltro } from './SelectorFiltro'
// -tomas-largas- Antes: import { filtroGuardado, guardarFiltro, filtroCss, esNeutro, FiltroToma, TonoFiltro } from '../lib/filtros'
import { FILTRO_NATURAL, filtroCss, esNeutro, FiltroToma, TonoFiltro } from '../lib/filtros'
import { cortesDe, aSalidaCercana, aArchivo, duracionFinal, duracionVisible, tramosQueQuedan } from '../lib/tramos'
// -tomas-largas- Antes: import { recetaDe, TramoMs } from '../lib/recetaExportacion'
import { recetaDe, caminoDeGuardado, TramoMs } from '../lib/recetaExportacion'
import { t, useTextos } from '../textos'
import { IconoGuardar, IconoCompartir, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar, IconoPausa } from './IconosApp'
// EL VISOR DE LADO -tarea 90-. Ver lib/visorDeLado.ts y styles-visor-de-lado.css.
import useLayout from '../hooks/useLayout'
import useBordesSeguros, { LecturaBordes } from '../hooks/useBordesSeguros'
import { FormaVideo, formaDeVideo, medidasVisorDeLado, TOQUE_MINIMO, ROTULO_MINIMO, ALTO_BARRA_REPRODUCCION } from '../lib/visorDeLado'
import { tomarBarrasParaElVisor, soltarBarrasDelVisor, msDesdeQueSeOculto } from '../lib/barrasDelSistema'
import { anotarVisorLado, volcarRegistroVisorLado } from '../lib/registroVisorLado'

// EL ALTO DEL VIDEO -tarea 87, A4, corrección (1), 04-10-2026-. Como en el boceto aprobado
// -docs/pantallas/tarea87/herramientas/boceto.tsx, usarAltoDelVideo-: la tarjeta mide como mucho el
// alto disponible -la raíz menos sus bordes seguros y su aire-; lo que no es video -barra de avance,
// ficha, nombre y acciones- se mide, y el video toma lo que queda, sin pasar de 70vh -como antes- ni
// bajar de VIDEO_MIN. Si ni con el video en VIDEO_MIN cabe, lo de arriba se desplaza y las acciones
// no. Sin ResizeObserver -jsdom- queda el 70vh de antes.
const VIDEO_MIN = 240
function usarAltoDelVideo(
  raiz: React.RefObject<HTMLDivElement>,
  tarjeta: React.RefObject<HTMLDivElement>,
  videoCaja: React.RefObject<HTMLDivElement>,
  alMedir?: (m: { disponible: number; alto: number }) => void
): number | null {
  const [alto, setAlto] = React.useState<number | null>(null)
  React.useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const r = raiz.current, c = tarjeta.current, v = videoCaja.current
      if (!r || !c || !v) return
      const arriba = c.querySelector('[data-testid="visor-arriba"]') as HTMLElement | null
      const acciones = c.querySelector('.acciones-toma') as HTMLElement | null
      if (!arriba || !acciones) return
      const cs = getComputedStyle(r)
      const disponible = r.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      // Lo de arriba completo -aunque se esté desplazando- más las acciones con su margin-top
      // -var(--aire-3), styles.css-, más los bordes de la tarjeta, menos el video.
      const resto = arriba.scrollHeight - v.offsetHeight + acciones.offsetHeight + (parseFloat(getComputedStyle(acciones).marginTop) || 0) + (c.offsetHeight - c.clientHeight)
      const tope = Math.round(window.innerHeight * 0.7)
      const nuevo = Math.max(VIDEO_MIN, Math.min(tope, Math.floor(disponible - resto)))
      setAlto((previo) => (previo === nuevo ? previo : nuevo))
      alMedir?.({ disponible, alto: nuevo })
    }
    medir()
    const obs = new ResizeObserver(medir)
    if (tarjeta.current) obs.observe(tarjeta.current)
    if (raiz.current) obs.observe(raiz.current)
    return () => obs.disconnect()
  })
  return alto
}

// 0:04, 1:25 -como la duracion de la tira-.
function formatearSegundos(s: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

export default function ReproductorGrabacion({
  grabacion,
  onCerrar,
  onBorrar,
  onRepetir,
  onGuardadoEnGaleria,
  onCambio,
  guiones
}: {
  grabacion: ResumenGrabacion
  onCerrar: () => void
  onBorrar: (id: string) => void
  onRepetir?: () => void
  onGuardadoEnGaleria?: (ok: boolean, detalle?: string) => void
  // La toma cambio -se guardo en la galeria, o su copia ya no esta-: App la
  // anota en el indice.
  onCambio?: (g: ResumenGrabacion) => void
  // Para nombrarla por su guion de hoy -nombreDeToma, TiraGrabaciones.tsx-.
  guiones?: ResumenGuion[]
}) {
  // Misma regla que en la tira: borrar pregunta una vez. Ver el comentario de
  // TiraGrabaciones. Aca no hace falta el temporizador porque al cerrar el
  // reproductor se desmonta todo.
  useTextos()
  const [confirmando, setConfirmando] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)

  // LOS SUBTITULOS -24-09-2026-. Se arman con el registro del motor que la toma
  // guardo a su lado -<id>.motor.txt-. Una toma sin registro -anterior al
  // registro, o de la version web- no ofrece el boton: no hay con que armarlos.
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null)
  // -visor-servidor- La toma se sirve por el servidor local, con identificador opaco.
  const [srcServidor, setSrcServidor] = React.useState<string | null>(null)
  const [avisoServidor, setAvisoServidor] = React.useState(false)
  // -visor-servidor, arreglo 17-10-2026- App pasa onGuardadoEnGaleria como flecha nueva en cada
  // render: con ella en las dependencias, cada render de App volvía a pedir la dirección y dejaba el
  // <video> sin src un momento -la toma se recargaba-; y si el servidor fallaba, el aviso hacía
  // renderizar App y se repetía sin fin -así se colgaban las pruebas y el CI del #131-. Ahora el
  // aviso va por una ref y el efecto depende solo de la ruta. Si no hay servidor -versión web, APK
  // viejo, pruebas-, la toma se ve como antes, con srcDeRuta, y el aviso sale una sola vez.
  const avisoRef = React.useRef(onGuardadoEnGaleria)
  avisoRef.current = onGuardadoEnGaleria
  React.useEffect(() => {
    let vivo = true
    setSrcServidor(null)
    setAvisoServidor(false)
    direccionDeToma(grabacion.ruta).then((url) => {
      if (vivo) setSrcServidor(url)
    }).catch(() => {
      if (vivo) {
        setAvisoServidor(true)
        setSrcServidor(srcDeRuta(grabacion.ruta))
        // Antes: onGuardadoEnGaleria?.(false, t('servidorNoArranco'))
        if (Capacitor.isNativePlatform()) avisoRef.current?.(false, t('servidorNoArranco'))
      }
    })
    return () => { vivo = false }
  // Antes: }, [grabacion.ruta, onGuardadoEnGaleria])
  }, [grabacion.ruta])
  // -tarea 87, subtítulos en horizontal- Se guarda el registro y los subtítulos se arman más abajo,
  // con la forma del cuadro -32 o 47 letras por renglón-. Antes: setSubtitulos(armarSubtitulos(registro)).
  const [registroMotor, setRegistroMotor] = React.useState<string | null>(null)
  // -tomas-largas, 15-10-2026, decisión de Javier- EL MISMO CRITERIO QUE EL FILTRO: cada toma parte en
  // «No». El estilo elegido aquí es solo de esta toma y no se recuerda: con el recordado, una toma sin
  // nada elegido para ella se guardaba quemando subtítulos -recodificando, minutos en una toma larga-.
  // Antes: const [estilo, setEstilo] = React.useState<EstiloSubtitulo>(() => estiloSubtituloGuardado())
  const [estilo, setEstilo] = React.useState<EstiloSubtitulo>('no')
  // -tarea 96, 05-10-2026- EL FILTRO: se recuerda como el estilo de subtítulos -lib/filtros.ts,
  // filtroGuardado-. Se ve en el <video> al tiro y se quema al guardar con la misma matriz.
  // -tomas-largas, 15-10-2026, decisión de Javier- CADA TOMA PARTE EN NATURAL. El filtro elegido es solo
  // de esta toma y no se recuerda: con el recordado, una toma sin nada que cambiarle se guardaba
  // recodificando -6,5 min una de 25 min- sin que nadie lo hubiera elegido para ella.
  // Antes: const [filtro, setFiltro] = React.useState<FiltroToma>(() => filtroGuardado())
  const [filtro, setFiltro] = React.useState<FiltroToma>(() => ({ ...FILTRO_NATURAL }))
  // -guia-sigo, corrección- El efecto de la marca de subtítulos estaba aquí, antes de que existieran
  // subtitulos y guardada: su lista de dependencias se evaluaba antes de declararlas y el visor se caía
  // al abrirse -tsc TS2448 en el CI del PR 135-. Ahora va después del useMemo de subtitulos.
  const [filtroAbierto, setFiltroAbierto] = React.useState(false)
  // -guia-sigo- Marca de subtítulos.
  const [marcaSub, setMarcaSub] = React.useState(false)
  const anclaSubRef = React.useRef<HTMLDivElement>(null)
  const cambiarFiltro = (tono: TonoFiltro) => {
    const f: FiltroToma = { version: 1, tono }
    setFiltro(f)
    // -tomas-largas- Ya no se recuerda: es de esta toma. Antes: guardarFiltro(f)
  }
  // -banco-largo, 17-10-2026- De <id>.palabras.txt, que no se corta y va en todas las versiones; una toma
  // de antes, sin él, del .motor.txt como hasta hoy -textoDeSubtitulos, archivosDeToma.ts-. Antes:
  //       const dir = await directorioGrabaciones()
  //       const registro = await leerTexto(juntos(dir, `${grabacion.id}.motor.txt`))
  //       if (vigente) setRegistroMotor(registro)
  React.useEffect(() => {
    let vigente = true
    setRegistroMotor(null)
    ;(async () => {
      try {
        const registro = await textoDeSubtitulos(grabacion.id)
        if (vigente && registro !== null) setRegistroMotor(registro)
      } catch (e) {
        // sin registro no hay subtitulos, y la toma se ve igual
      }
    })()
    return () => { vigente = false }
  }, [grabacion.id])

  // Lo que muestran los controles propios -ver el comentario del visor, abajo-. El total sale del
  // video; si el archivo no lo trae -Infinity en algunos WebView-, de lo que mide el indice.
  const [reproduciendo, setReproduciendo] = React.useState(false)
  const [actual, setActual] = React.useState(0)
  // -tarea 88- La duración que se muestra es la FINAL, sin lo pausado. Antes: grabacion.duracionMs / 1000.
  const [total, setTotal] = React.useState(duracionVisible(grabacion) / 1000)
  // -tarea 88, 04-10-2026- LOS CORTES de una toma con pausas -lib/tramos.ts-, en el reloj del archivo.
  // El visor muestra la toma como quedará: salta cada corte, y la barra y los tiempos van en el reloj
  // de la SALIDA. El efecto del video los lee por esta ref -se arma una vez por elemento-. «saltando»
  // es la traba: entre que se pide el salto y llega seeked no se pide otro.
  const cortesRef = React.useRef<TramoMs[]>([])
  const saltando = React.useRef(false)
  // -tarea 90-: al girar el teléfono el visor cambia de disposición y el <video> es otro elemento. El
  // nuevo sigue desde donde iba el anterior -reanudarEn- en vez de volver a 0.
  // -04-10-2026, después del #68-: además de la posición se guarda si iba reproduciéndose. Antes el
  // nuevo quedaba siempre en pausa; ahora, si el de antes andaba, el nuevo sigue andando -play() al
  // cargar-, y si estaba en pausa, sigue en pausa. «iba» se lleva con los eventos play/pause del
  // elemento MIENTRAS ESTÁ EN LA PÁGINA: al sacarlo, Chromium lo pausa solo -y dispara pause-, y esa
  // pausa no cuenta.
  const reanudarEn = React.useRef(0)
  const ibaReproduciendo = React.useRef(false)
  const reanudarReproduciendo = React.useRef<boolean | null>(null)
  // La forma que trae el archivo -tarea 90, (c)-: la anota el visor de lado.
  const medidaVideo = React.useRef<{ ancho: number; alto: number } | null>(null)
  const [forma, setForma] = React.useState<FormaVideo | null>(null)
  // Cambia cuando carga el video, para que el registro (c) anote videoWidth y videoHeight.
  const [cargasDelVideo, setCargasDelVideo] = React.useState(0)
  React.useEffect(() => {
    if (!video) return
    setReproduciendo(!video.paused && !video.ended)
    // El elemento nuevo empieza con lo suyo: si después el play del giro no resulta, no queda «iba».
    ibaReproduciendo.current = !video.paused && !video.ended
    const alReproducir = () => {
      setReproduciendo(true)
      if (video.isConnected) ibaReproduciendo.current = true
    }
    const alPausar = () => {
      setReproduciendo(false)
      if (video.isConnected) ibaReproduciendo.current = false
    }
    // -tarea 88- Si la hora cae dentro de un corte, salta a su final: una sola vez -la traba se suelta
    // en seeked-. Se anota con la etiqueta Sigo88 para el logcat de Claude.
    const saltarSiToca = () => {
      const c = cortesRef.current
      if (c.length === 0 || saltando.current) return
      const ms = video.currentTime * 1000
      const corte = c.find((x) => ms >= x.desdeMs && ms < x.hastaMs)
      if (!corte) return
      saltando.current = true
      console.info('Sigo88', `visor salta desdeMs=${Math.round(ms)} hastaMs=${corte.hastaMs}`)
      try {
        video.currentTime = corte.hastaMs / 1000
      } catch (e) {
        saltando.current = false
      }
    }
    // Antes: const alAvanzar = () => setActual(video.currentTime).
    const alAvanzar = () => {
      const c = cortesRef.current
      if (c.length === 0) return setActual(video.currentTime)
      saltarSiToca()
      setActual(aSalidaCercana(video.currentTime * 1000, c) / 1000)
    }
    const alTerminarSalto = () => {
      saltando.current = false
      if (cortesRef.current.length > 0) alAvanzar()
    }
    // Mientras reproduce, timeupdate llega unas cuatro veces por segundo: para no mostrar un cuarto de
    // segundo de lo cortado, se revisa también en cada cuadro -solo si hay cortes-.
    let cuadro = 0
    const bucleCortes = () => {
      saltarSiToca()
      if (!video.paused && !video.ended) cuadro = requestAnimationFrame(bucleCortes)
    }
    const alReproducirCortes = () => {
      if (cortesRef.current.length === 0) return
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(bucleCortes)
    }
    const alCargar = () => {
      // -tarea 88- Con cortes, el total es la duración final. Antes: setTotal(video.duration).
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const c = cortesRef.current
        setTotal(c.length === 0 ? video.duration : duracionFinal(c, video.duration * 1000) / 1000)
      }
      // TAREA 90: la forma del video manda en el visor de lado. Chromium entrega videoWidth y
      // videoHeight ya girados según la rotación del mp4 -a verificar en el moto g86, (c)-.
      medidaVideo.current = { ancho: video.videoWidth, alto: video.videoHeight }
      const f = formaDeVideo(video.videoWidth, video.videoHeight)
      if (f) setForma(f)
      setCargasDelVideo((n) => n + 1)
      if (reanudarEn.current > 0) {
        try {
          video.currentTime = reanudarEn.current
        } catch (e) {
          // si no deja, vuelve a empezar: no se pierde nada
        }
        reanudarEn.current = 0
      }
      // Lo de reproduciendo o en pausa -ver reanudarEn-. Se anota en el registro visor-lado, también si
      // Android o la WebView no dejan reproducir sin un toque: Capacitor pone
      // setMediaPlaybackRequiresUserGesture(false) -Bridge.java:592-, así que no debería pasar.
      const retomar = reanudarReproduciendo.current
      if (retomar !== null) {
        reanudarReproduciendo.current = null
        const t = Number(video.currentTime) || 0
        if (!retomar) {
          anotarVisorLado('giro-video', { toma: grabacion.id, estado: 'pausa', t, resultado: 'pausa' })
          volcarRegistroVisorLado()
        } else {
          let promesa: Promise<void> | undefined
          try {
            promesa = video.play()
          } catch (e: any) {
            promesa = Promise.reject(e)
          }
          Promise.resolve(promesa).then(
            () => {
              anotarVisorLado('giro-video', { toma: grabacion.id, estado: 'reproduciendo', t, resultado: 'ok' })
              volcarRegistroVisorLado()
            },
            (e: any) => {
              // Bloqueado: queda en pausa, con el botón de reproducir a la vista, en la misma posición.
              anotarVisorLado('giro-video', { toma: grabacion.id, estado: 'reproduciendo', t, resultado: 'bloqueado', error: (e && e.name) || String(e) })
              volcarRegistroVisorLado()
            }
          )
        }
      }
    }
    video.addEventListener('play', alReproducir)
    video.addEventListener('pause', alPausar)
    video.addEventListener('ended', alPausar)
    video.addEventListener('timeupdate', alAvanzar)
    video.addEventListener('loadedmetadata', alCargar)
    video.addEventListener('seeked', alTerminarSalto)
    video.addEventListener('play', alReproducirCortes)
    // Si el video ya cargó -el mismo elemento de antes, o jsdom-, se lee ya.
    if (video.readyState >= 1) alCargar()
    return () => {
      reanudarEn.current = video.currentTime || 0
      // En pausa y en 0 no hay nada que retomar -pasa cuando la miniatura cambia el caso antes de que
      // la toma empiece-: no se anota.
      reanudarReproduciendo.current = ibaReproduciendo.current || reanudarEn.current > 0 ? ibaReproduciendo.current : null
      video.removeEventListener('play', alReproducir)
      video.removeEventListener('pause', alPausar)
      video.removeEventListener('ended', alPausar)
      video.removeEventListener('timeupdate', alAvanzar)
      video.removeEventListener('loadedmetadata', alCargar)
      video.removeEventListener('seeked', alTerminarSalto)
      video.removeEventListener('play', alReproducirCortes)
      cancelAnimationFrame(cuadro)
      saltando.current = false
    }
  }, [video])
  const alternarVideo = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Antes: -tomas-grandes, 15-10-2026- UNA TOMA DE MÁS DE 2.147.483.647 BYTES no se reproduce aquí: la
    // WebView no lee pasado 2^31 -lib/archivosNativos.ts, TOPE_BYTES_WEBVIEW-. Reproducir la abre con el
    // reproductor del sistema; al volver, el visor sigue igual -Guardar, Filtro, Subtítulos, Borrar-.
    // Antes:
    // if (seVeConReproductorDelSistema(grabacion.bytes)) {
    //   void abrirConReproductor(grabacion.ruta).then((r) => {
    //     if (r === 'sin-aplicacion') onGuardadoEnGaleria?.(false, t('sinAppParaVideo'))
    //     else if (r === 'error') onGuardadoEnGaleria?.(false, t('noSeAbrioVideo'))
    //   })
    //   return
    // }
    // Todas las tomas van por el servidor local al <video>.
    if (!video) return
    if (video.paused || video.ended) {
      video.play()?.catch?.(() => {
        // sin permiso para reproducir, el play sigue a la vista
      })
    } else {
      video.pause()
    }
  }

  // UNA TOMA GUARDADA OFRECE COMPARTIR Y BORRAR, Y NADA MAS -24-09-2026-. Javier:
  // "por que un video que se hace clic desde galeria aparece con exactamente las
  // mismas opciones que cuando se guardo". Guardar ya se hizo; los subtitulos
  // quedaron como se eligieron -"ya se guardaron asi no mas"-; Repetir es de
  // recien grabada. Sin linea de estado: "debemos tender a lo simple".
  const guardada = !!grabacion.galeriaUri
  // Una toma guardada se ve desde su copia de la galeria, que ya trae los
  // subtitulos quemados: encima no se dibuja nada, o saldrian dos veces.
  const estiloVisible: EstiloSubtitulo = guardada ? 'no' : estilo
  // -tarea 96- Lo mismo con el filtro: la copia de la galería ya lo trae; encima no se aplica nada.
  const filtroVideo = guardada ? undefined : filtroCss(filtro.tono)
  // -tarea 88- Una toma guardada ya quedó cortada en la galería: no lleva cortes.
  const cortes = React.useMemo<TramoMs[]>(() => (guardada ? [] : cortesDe(grabacion)), [guardada, grabacion.pausas, grabacion.duracionMs])
  cortesRef.current = cortes
  const [avance, setAvance] = React.useState<number | null>(null)

  // -tarea 87, 04-10-2026- Cuál de los dos botones de guardar se apretó: solo ese muestra el avance
  // y los demás -el otro de guardar, Repetir, Borrar y la ficha- quedan desactivados. La X de cerrar
  // sigue activa y NO cancela: el guardado sigue y al terminar sale el aviso aunque el visor ya no
  // esté -respuesta de Claude del 04-10-.
  const [apretado, setApretado] = React.useState<'guardar' | 'compartir' | null>(null)
  const cerrado = React.useRef(false)
  React.useEffect(() => () => { cerrado.current = true }, [])

  // LA ORIENTACIÓN -parte C-. Una toma vieja sin el dato -o de un APK viejo-: se analiza una vez al
  // abrirla y se guarda por onCambio, con su línea evento=orientacion. Si el APK no manda ancho y
  // alto, sigue sin el dato.
  // -04-10-2026, Javier simplifica la 87- Se sacó la posición "Normal / Para redes": el subtítulo va
  // siempre a 1/6 -MARGEN_ABAJO_SUBTITULOS, lib/subtitulos.ts-. Antes la orientación decidía si se
  // ofrecía "Para redes" -solo en vertical, con un APK con exportarToma-.
  const [orientacion, setOrientacion] = React.useState(grabacion.orientacion)
  React.useEffect(() => {
    setOrientacion(grabacion.orientacion)
    if (grabacion.orientacion || grabacion.galeriaUri) return
    let vigente = true
    ;(async () => {
      try {
        const a = await analizarVideo(grabacion.ruta)
        const o = orientacionDeToma(a)
        anotarOrientacion(grabacion.id, a, grabacion.calidad, 'visor')
        if (!o || !vigente) return
        setOrientacion(o)
        onCambio?.({ ...grabacion, orientacion: o })
      } catch {
        // sin análisis la toma se ve igual
      }
    })()
    return () => { vigente = false }
  }, [grabacion.id])

  // -tarea 87, subtítulos en horizontal- LOS SUBTÍTULOS, con el largo de renglón de la forma del
  // cuadro: la orientación de la toma -parte C, la del archivo visto derecho- y, sin ella, la forma que
  // entrega el video. Sin ninguna, vertical. Los mismos renglones van al archivo guardado.
  const formaCuadro: FormaCuadro = orientacion === 'horizontal' || orientacion === 'vertical' ? orientacion : forma ?? 'vertical'
  const subtitulos = React.useMemo<Subtitulo[]>(() => {
    if (!registroMotor) return []
    try {
      // -tarea 88- Con los cortes: los mismos subtítulos que lleva la receta, en el reloj de la salida.
      // Sin cortes es armarSubtitulos, como antes. Antes: armarSubtitulos(registroMotor, formaCuadro).
      return subtitulosConCortes(registroMotor, formaCuadro, cortes)
    } catch (e) {
      return []
    }
  }, [registroMotor, formaCuadro, cortes])
  // -guia-sigo- La marca de subtítulos: la primera vez que hay subtítulos para elegir y la toma no se guardó.
  React.useEffect(() => {
    const puede = debeMostrarMarcaSubtitulos({
      yaVista: marcaYaVista('subtitulos'),
      tieneSubtitulos: subtitulos.length > 0,
      sinGuardar: !guardada,
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false
    })
    if (abrirMarcaSiCorresponde('subtitulos', puede)) setMarcaSub(true)
  }, [subtitulos.length, guardada])

  // El panel de Subtítulos abierto esconde el nombre de la toma: el video gana ~52 dp -respuesta de
  // Claude del 04-10-.
  const [panelAbierto, setPanelAbierto] = React.useState(false)
  const conFicha = subtitulos.length > 0 && !guardada
  // -tarea 96- La tira de filtros abierta también esconde el nombre, por lo mismo. Antes:
  // const nombreVisible = !(conFicha && panelAbierto).
  const nombreVisible = !((conFicha && panelAbierto) || (!guardada && filtroAbierto))
  // Un panel a la vez: abrir Subtítulos cierra la tira de filtros, y al revés.
  const abrirSubtitulos = (a: boolean) => {
    setPanelAbierto(a)
    if (a) setFiltroAbierto(false)
  }
  const abrirFiltro = (a: boolean) => {
    setFiltroAbierto(a)
    if (a) setPanelAbierto(false)
  }

  // EL LAYOUT -A4- y lo que mide para Claude.
  const raizRef = React.useRef<HTMLDivElement>(null)
  const tarjetaRef = React.useRef<HTMLDivElement>(null)
  const videoCajaRef = React.useRef<HTMLDivElement>(null)
  const anotadoVisor = React.useRef<string>('')
  const altoVideo = usarAltoDelVideo(raizRef, tarjetaRef, videoCajaRef, ({ disponible, alto }) => {
    // Una línea evento=visor por cada forma en que se acomoda -abrir, panel abierto o cerrado-: dónde
    // quedaron el video, las acciones y el subtítulo de verdad. Solo en la APK de prueba.
    // subtitulo_abajo_dp se espera en imagen_alto_dp / 6 -MARGEN_ABAJO_SUBTITULOS-.
    // -tarea 96- Con la tira de filtros. Antes: `${panelAbierto}|${alto}|${apretado}`.
    const clave = `${panelAbierto}|${filtroAbierto}|${alto}|${apretado}`
    if (anotadoVisor.current === clave) return
    anotadoVisor.current = clave
    try {
      const raiz = raizRef.current!
      const acciones = raiz.querySelector('.acciones-toma') as HTMLElement | null
      const arriba = raiz.querySelector('[data-testid="visor-arriba"]') as HTMLElement | null
      const v = raiz.querySelector('[data-testid="video-grabacion"]') as HTMLVideoElement | null
      const capa = raiz.querySelector('.capa-subtitulos') as HTMLElement | null
      const sub = raiz.querySelector('.subtitulo') as HTMLElement | null
      const ra = acciones?.getBoundingClientRect()
      const cs = getComputedStyle(raiz)
      const img = v && v.videoWidth && v.videoHeight ? Math.min(v.clientWidth / v.videoWidth, v.clientHeight / v.videoHeight) : 0
      const r1 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : null)
      anotar87('visor', {
        id: grabacion.id,
        panel: panelAbierto ? 'abierto' : 'cerrado',
        disponible_dp: r1(disponible),
        video_alto_dp: r1(v?.getBoundingClientRect().height),
        imagen_ancho_dp: img ? r1(v!.videoWidth * img) : null,
        imagen_alto_dp: img ? r1(v!.videoHeight * img) : null,
        acciones_arriba_dp: r1(ra?.top),
        acciones_abajo_dp: r1(ra?.bottom),
        limite_abajo_dp: r1(raiz.clientHeight - (parseFloat(cs.paddingBottom) - 20)),
        arriba_se_desplaza: arriba ? arriba.scrollHeight > arriba.clientHeight + 1 : null,
        nombre_visible: nombreVisible,
        subtitulo_abajo_dp: capa && sub ? r1(capa.getBoundingClientRect().bottom - sub.getBoundingClientRect().bottom) : null
      })
    } catch {
      // una medición que falla no rompe el visor
    }
  })
  // Los bordes seguros reales, una vez al abrir: arriba la barra de estado, abajo la barra de tres
  // botones o la franja de gestos. La franja de gestos la mide Claude en el teléfono: no se fija en
  // el código.
  React.useEffect(() => {
    const b = medirBordesSeguros()
    if (!b) return
    anotar87('bordes', {
      arriba_dp: b.arriba,
      abajo_dp: b.abajo,
      izquierda_dp: b.izquierda,
      derecha_dp: b.derecha,
      ventana_ancho_dp: window.innerWidth,
      ventana_alto_dp: window.innerHeight,
      dpr: window.devicePixelRatio
    })
  }, [])

  // Se guarda lo que se ve: con el estilo elegido, la copia lleva los subtitulos
  // quemados -Media3, CapaDeSubtitulos.java-; con "No", va la toma tal cual.
  // -tarea 87, E1- UNA sola función que guarda, para Guardar y para Guardar y compartir: devuelve
  // lo que dio el guardado -null si falló-. Antes era el cuerpo de handleGuardar; no se copia.
  const guardarToma = async (boton: 'guardar' | 'compartir'): Promise<{ ok: boolean; uri?: string } | null> => {
    if (guardando) return null
    setGuardando(true)
    setApretado(boton)
    setPanelAbierto(false)
    setFiltroAbierto(false)
    setAvance(null)
    const conSubtitulos = estilo !== 'no' && subtitulos.length > 0
    // -tarea 96- Con un filtro que no es Natural se guarda SIEMPRE por la receta -recodifica, aunque no
    // haya subtítulos ni pausas-. Natural deja el camino de hoy: sin subtítulos ni pausas, copia.
    const conFiltro = !esNeutro(filtro)
    // -tarea 88- Con cortes se guarda SIEMPRE por la receta con los tramos que quedan -también con
    // estilo "No"-: no hay camino viejo que corte. Un APK sin exportarToma rechaza y sale el aviso.
    const tramos = cortes.length > 0 ? tramosQueQuedan(cortes, grabacion.duracionMs) : null
    try {
      if (tramos) console.info('Sigo88', `guardar tramos=${tramos.map((x) => `${x.desdeMs}-${x.hastaMs}`).join(',')} estilo=${estilo} subtitulos=${conSubtitulos ? subtitulos.length : 0}`)
      // Antes: conSubtitulos ? guardarEnGaleriaConSubtitulos(...) : guardarEnGaleria(...), siempre.
      // -tarea 96- Con filtro, también la receta, con el filtro. Antes: tramos ? exportarAGaleria(...,
      // recetaDe({ estilo, subtitulos: ..., tramos }), ...).
      if (conFiltro) console.info('Sigo96', `guardar filtro=${filtro.tono} estilo=${estilo} subtitulos=${conSubtitulos ? subtitulos.length : 0} tramos=${tramos ? tramos.length : 0}`)
      // -tomas-largas- La decisión, en caminoDeGuardado -recetaExportacion.ts-, la misma de antes.
      // Antes: const res = tramos || conFiltro ? await exportarAGaleria(...) : conSubtitulos ? ... : ...
      const camino = caminoDeGuardado({ estilo, subtitulos, tramos, filtro })
      const res = camino === 'receta'
        ? await exportarAGaleria(grabacion.ruta, recetaDe({ estilo, subtitulos: conSubtitulos ? subtitulos : [], tramos, filtro }), (pct) => setAvance(pct))
        : camino === 'subtitulos'
        ? await guardarEnGaleriaConSubtitulos(grabacion.ruta, subtitulos, estilo, (pct) => setAvance(pct))
        : await guardarEnGaleria(grabacion.ruta)
      if (res && res.ok && res.uri) {
        // UNA SOLA COPIA POR TOMA -24-09-2026-. Javier: "si se guarda con
        // subtitulos, la otra se borre, asi no saturamos el telefono". La de Sigo
        // se borra y la toma queda apuntando a la de la galeria: se sigue viendo
        // y compartiendo desde Sigo, sin nada mas que hacer. Vale tambien sin
        // subtitulos: la copia es la misma toma. Lo que se pierde es la version
        // limpia de una toma guardada con subtitulos.
        try {
          await borrarArchivo(grabacion.ruta)
        } catch (e) {
          // si no se pudo borrar, queda la copia de Sigo: nada se pierde
        }
        // -tarea 87- Con la orientación. Antes: onCambio?.({ ...grabacion, ruta:
        // res.uri, galeriaUri: res.uri, estiloGaleria: conSubtitulos ? estilo : 'no' }).
        onCambio?.({
          ...grabacion,
          ruta: res.uri,
          galeriaUri: res.uri,
          estiloGaleria: conSubtitulos ? estilo : 'no',
          ...(orientacion ? { orientacion } : {}),
          // -tarea 88- La copia ya va cortada: sin pausas y con la duración final.
          ...(tramos ? { pausas: undefined, duracionMs: duracionFinal(cortes, grabacion.duracionMs) } : {})
        })
        onGuardadoEnGaleria?.(true, t('galeriaGuardada'))
        return res
      } else {
        onGuardadoEnGaleria?.(false, t('galeriaNoSeGuardo'))
        return null
      }
    } catch (e: any) {
      // El motivo va a la vista, con la frase en el idioma de la app. El detalle lo escribe
      // el plugin nativo -CamaraNativaPlugin.java- y hoy esta en espanol: traducir esos
      // rechazos es trabajo del lado nativo.
      onGuardadoEnGaleria?.(false, t('galeriaNoSeGuardoPorque', { detalle: e?.message || String(e) }))
      return null
    } finally {
      setGuardando(false)
      setApretado(null)
      setAvance(null)
    }
  }
  const handleGuardar = async () => {
    await guardarToma('guardar')
  }

  // GUARDAR Y COMPARTIR -tarea 87, E1-. La misma función que guarda y, si salió bien, el menú de
  // compartir de Android -sin apuntar a ninguna aplicación-. Si el guardado falla, no se abre nada
  // y van los avisos de siempre. Si compartir falla, la toma YA quedó guardada -una sola copia,
  // onCambio con galeriaUri- y se dice; el visor queda como toma guardada, con su Compartir de
  // siempre para reintentar. Si el visor se cerró mientras guardaba, no se abre el menú: queda el
  // aviso de guardado.
  const handleGuardarYCompartir = async () => {
    const res = await guardarToma('compartir')
    if (!res || !res.ok || !res.uri || cerrado.current) return
    try {
      await compartirDeGaleria(res.uri)
    } catch {
      onGuardadoEnGaleria?.(false, t('compartirTrasGuardar'))
    }
  }

  // Si la copia se borro desde la galeria, la toma vuelve a ofrecer Guardar.
  const handleCompartir = async () => {
    if (!grabacion.galeriaUri) return
    try {
      await compartirDeGaleria(grabacion.galeriaUri)
    } catch (e: any) {
      if (String(e?.message || e).includes('no existe')) {
        // Era la unica copia: sin ella la toma ya no tiene video, y "solo no
        // aparece" -Javier-. Sin aviso: se quita como al borrarla.
        onBorrar(grabacion.id)
      } else {
        onGuardadoEnGaleria?.(false, t('noSeCompartio'))
      }
    }
  }

  // ==================================================================================================
  // EL VISOR DE LADO -tarea 90, 04-10-2026-. Con el teléfono de lado -useLayout() === 'tel-h', la misma
  // consulta de la 82- el visor se arma según el boceto aprobado -PR #67, docs/pantallas/tarea89/
  // medidas-implementacion.md, cuarta versión, con la barra de reproducción de 52-. De pie no cambia nada:
  // el return de más abajo es el de siempre.
  const layout = useLayout()
  // -tarea 83, parte B, 04-10-2026- También en la tableta de lado -'tab-h'-, con la misma regla
  // -medidasVisorDeLado, sin medidas propias-: aprobado por Javier en la parte A.2. A 1180 x 820 la
  // columna queda en el mínimo de 112 y el video de 16:9 se achica a 1068 x 601: un 16:9 a todo el alto
  // no cabe en una pantalla de 1,44. Antes: const deLado = layout === 'tel-h'.
  const deLado = layout === 'tel-h' || layout === 'tab-h'

  // LA FORMA, ANTES DE QUE CARGUE EL VIDEO: la miniatura sale del mismo mp4 -tomaVideo.ts- y trae la
  // misma forma. Sin miniatura, el caso 2 -forma null-, que es el que menos supone. El video, al cargar,
  // manda sobre la miniatura.
  const medidaMiniatura = React.useRef<string>('sin-miniatura')
  React.useEffect(() => {
    const ruta = grabacion.rutaMiniatura
    medidaMiniatura.current = ruta ? 'cargando' : 'sin-miniatura'
    if (!ruta || typeof Image === 'undefined') return
    let vigente = true
    const img = new Image()
    img.onload = () => {
      if (!vigente) return
      medidaMiniatura.current = `${img.naturalWidth}x${img.naturalHeight}`
      const f = formaDeVideo(img.naturalWidth, img.naturalHeight)
      if (f && !medidaVideo.current?.ancho) setForma(f)
    }
    img.onerror = () => { medidaMiniatura.current = 'no-cargo' }
    img.src = srcDeRuta(ruta)
    return () => { vigente = false }
  }, [grabacion.rutaMiniatura])
  const formaUsada: FormaVideo = forma ?? 'vertical'

  // (a), (b) y (d): cada cambio de los bordes, con los ms desde que se ocultó la barra de estado.
  const anotarBordes = React.useCallback((l: LecturaBordes, motivo: string) => {
    anotarVisorLado('bordes', {
      motivo,
      giro: l.giro,
      tipo: l.tipo,
      // Los que usa el visor -de env() o, si no hay, de Capacitor- y después los dos por separado.
      fuente: l.fuente,
      l: l.usados.izquierda, r: l.usados.derecha, t: l.usados.arriba, b: l.usados.abajo,
      envL: l.env.izquierda, envR: l.env.derecha, envT: l.env.arriba, envB: l.env.abajo,
      capL: l.capacitor.izquierda, capR: l.capacitor.derecha, capT: l.capacitor.arriba, capB: l.capacitor.abajo,
      viewport: `${l.ancho}x${l.alto}`,
      visual: l.visual,
      dpr: l.dpr,
      msDesdeHide: msDesdeQueSeOculto()
    })
  }, [])
  const bordes = useBordesSeguros(deLado, anotarBordes)

  // LAS BARRAS DE ANDROID: al abrir el visor de lado, hide({ bar: StatusBar }) y el estilo oscuro; al
  // cerrar, al volver de pie o al desmontar -la limpieza del efecto-, show y el estilo de la app. Ver
  // lib/barrasDelSistema.ts.
  React.useEffect(() => {
    if (!deLado) return
    tomarBarrasParaElVisor()
    anotarVisorLado('abrir', { toma: grabacion.id, layout, ancho: window.innerWidth, alto: window.innerHeight })
    return () => {
      soltarBarrasDelVisor()
      anotarVisorLado('cerrar', { toma: grabacion.id })
      volcarRegistroVisorLado()
    }
  }, [deLado])

  // (c): la forma que entrega el video, la de la miniatura y la rotación del sidecar si la trae. Hoy el
  // sidecar -lib/sidecar.ts- no guarda rotación: se anota qué campos trae, por si el lado nativo la suma.
  React.useEffect(() => {
    if (!deLado) return
    let vigente = true
    ;(async () => {
      let rotacion = 'sin-sidecar'
      let calidad = '-'
      try {
        const dir = await directorioGrabaciones()
        const sc = JSON.parse(await leerTexto(juntos(dir, `${grabacion.id}.json`)))
        const r = sc?.rotacion ?? sc?.rotation ?? sc?.orientacion ?? sc?.orientation
        rotacion = r === undefined ? 'sin-campo' : String(r)
        calidad = sc?.calidad ?? '-'
      } catch (e) {
        // sin sidecar se anota igual
      }
      if (!vigente) return
      const m = medidaVideo.current
      anotarVisorLado('video', {
        toma: grabacion.id,
        videoWidth: m ? m.ancho : null,
        videoHeight: m ? m.alto : null,
        forma: forma ?? 'sin-dato',
        usada: formaUsada,
        miniatura: medidaMiniatura.current,
        rotacionSidecar: rotacion,
        calidad
      })
    })()
    return () => { vigente = false }
  }, [deLado, forma, cargasDelVideo, grabacion.id])

  // (e): la letra del sistema. El tamaño calculado de los rótulos -12 si la escala de letra está en 1- y
  // el alto de cada fila de acción; si alguna baja de 48, se dice.
  const raizLado = React.useRef<HTMLDivElement | null>(null)
  const claveLetra = React.useRef('')
  React.useEffect(() => {
    if (!deLado) return
    const id = requestAnimationFrame(() => {
      const raiz = raizLado.current
      if (!raiz || typeof getComputedStyle !== 'function') return
      const rotulos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-rotulo], .visor-lado-subtitulos .boton-subtitulos-valor, .visor-lado-tarjeta .boton-subtitulos-valor'))
      const px = rotulos.map((r) => parseFloat(getComputedStyle(r).fontSize) || 0)
      const filas = Array.from(raiz.querySelectorAll<HTMLElement>('[data-fila-accion]')).map((f) => Math.round(f.getBoundingClientRect().height))
      const minimo = px.length ? Math.min(...px) : null
      const detalle = {
        rotulos: rotulos.map((r, i) => `${r.dataset.rotulo || 'subtitulos'}:${px[i]}`).join(','),
        escala: minimo ? minimo / ROTULO_MINIMO : null,
        filas: filas.join(','),
        bajo48: filas.some((h) => h > 0 && h < TOQUE_MINIMO) ? 'si' : 'no'
      }
      const k = JSON.stringify(detalle)
      if (k === claveLetra.current) return
      claveLetra.current = k
      anotarVisorLado('letra', detalle)
    })
    return () => cancelAnimationFrame(id)
  })

  if (deLado) {
    const m = medidasVisorDeLado({ ancho: bordes.ancho, alto: bordes.alto, bordes: bordes.usados, forma: formaUsada })
    const parar = (e: React.MouseEvent) => e.stopPropagation()
    const toque = { minWidth: TOQUE_MINIMO, minHeight: TOQUE_MINIMO }
    const cerrar = (
      <button type="button" className="cerrar-visor" data-testid="btn-cerrar-reproductor" aria-label={t('cerrar')} title={t('cerrar')} onClick={(e) => { e.stopPropagation(); onCerrar() }} style={{ width: TOQUE_MINIMO, height: TOQUE_MINIMO }}>
        <IconoCerrar tamano={22} />
      </button>
    )
    const nombre = (
      <div className="visor-lado-nombre">
        <div>{nombreDeToma(grabacion, guiones)}</div>
        <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
          {formatearDuracionMs(duracionVisible(grabacion))}
          {grabacion.incompleta ? ` · ${t('incompleta')}` : ''}
          {grabacion.errorMudo ? ` · ${t('metaErrorMudo')}` : ''}
          {grabacion.avisoMudo ? ` · ${t('metaAvisoMudo')}` : ''}
        </div>
      </div>
    )
    const cajaVideo = (estilo: React.CSSProperties) => (
      <div className="visor-video" data-testid="visor-lado-video" onClick={alternarVideo} style={{ position: 'absolute', ...estilo }}>
        {/* -tarea 96- El filtro elegido, sobre el video y no sobre los subtítulos -van encima, como en el
            archivo-. Antes: sin style. */}
        <video ref={setVideo} data-testid="video-grabacion" src={srcServidor || undefined} playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} style={{ filter: filtroVideo }} />
        {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} cortes={cortes} />}
        {!reproduciendo && (
          <span className="play-visor" aria-hidden="true">
            <IconoEmpezar tamano={30} />
          </span>
        )}
      </div>
    )
    // La barra de reproducción: la de hoy con el botón y el avance de 48 -52 de alto con el aire-.
    const barra = (estilo: React.CSSProperties) => (
      <div className="barra-visor" data-testid="visor-lado-barra" onClick={parar} style={{ height: ALTO_BARRA_REPRODUCCION, ...estilo }}>
        <button type="button" className="boton-visor" data-testid="btn-reproducir-toma" aria-label={reproduciendo ? t('pausa') : t('reproducir')} onClick={alternarVideo} style={{ width: TOQUE_MINIMO, height: TOQUE_MINIMO }}>
          {reproduciendo ? <IconoPausa tamano={20} /> : <IconoEmpezar tamano={20} />}
        </button>
        <span>{formatearSegundos(actual)}</span>
        <input
          type="range"
          className="avance-visor"
          data-testid="avance-toma"
          aria-label={t('avanceDelVideo')}
          min={0}
          max={total || 0}
          step={0.1}
          value={Math.min(actual, total || 0)}
          onChange={(e) => {
            const s = Number(e.target.value)
            // -tarea 88- En el reloj de la salida, como de pie. Antes: video.currentTime = s.
            if (video) video.currentTime = cortes.length > 0 ? aArchivo(s * 1000, cortes) / 1000 : s
            setActual(s)
          }}
          style={{ height: TOQUE_MINIMO, ['--avance' as any]: `${total > 0 ? (actual / total) * 100 : 0}%` }}
        />
        <span>{formatearSegundos(total)}</span>
      </div>
    )
    const selector = subtitulos.length > 0 && !guardada ? (
      <SelectorSubtitulos
        estilo={estilo}
        // -tarea 87, de lado, 04-10-2026- Como de pie: desactivado mientras se guarda.
        desactivado={guardando}
        onCambiar={(e) => {
          setEstilo(e)
          // -tomas-largas- Ya no se recuerda: es de esta toma. Antes: guardarEstiloSubtitulo(e)
        }}
        // -tarea 96- Abierto lo maneja el visor, para que abrir uno cierre la tira de filtros: los dos
        // paneles salen en el mismo lugar. Antes, de lado, sin abierto ni onAbrir.
        abierto={panelAbierto}
        onAbrir={abrirSubtitulos}
      />
    ) : null
    // -tarea 96- EL FILTRO, en toda toma que no está guardada -tenga o no subtítulos-.
    const selectorFiltro = !guardada ? (
      <SelectorFiltro
        tono={filtro.tono}
        onCambiar={cambiarFiltro}
        video={video}
        ruta={grabacion.ruta}
        poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined}
        abierto={filtroAbierto}
        onAbrir={abrirFiltro}
        desactivado={guardando}
      />
    ) : null
    // Las acciones: las mismas de hoy, con los mismos data-testid. fila=true en la columna del caso 1
    // -una por fila, con el rótulo de 12-; en la tarjeta del caso 2 van en fila, como hoy.
    const acciones = (enColumna: boolean) => {
      const fila = enColumna ? { 'data-fila-accion': '' } : {}
      // En los dos casos: toque de 48 como mínimo y rótulo de 12.
      const estiloFila: React.CSSProperties = { ...toque, fontSize: ROTULO_MINIMO }
      return (
        <>
          {guardada ? (
            // -ajustes de pantallas, 10-10-2026- Con su nombre al lado del ícono. Antes: className="accion-toma"
            // y solo <IconoCompartir tamano={26} />.
            <button type="button" className="accion-toma con-nombre" data-testid="btn-compartir-toma" aria-label={t('compartir')} title={t('compartir')} onClick={handleCompartir} style={estiloFila} {...fila}>
              <IconoCompartir tamano={26} />
              <span data-rotulo="compartir-toma" style={{ fontSize: ROTULO_MINIMO }}>{t('compartir')}</span>
            </button>
          ) : (
            <>
              {/* -tarea 87, de lado, 04-10-2026- Lo mismo que de pie: desactivado si se apretó el otro, y
                  solo el apretado muestra el avance. Antes: disabled={guardando} y el avance en Guardar
                  con cualquiera de los dos. */}
              <button type="button" className="accion-toma" data-testid="guardar-galeria-desde-reproductor" aria-label={t('guardarEnGaleria')} disabled={guardando && apretado !== 'guardar'} aria-busy={apretado === 'guardar'} onClick={handleGuardar} style={estiloFila} {...fila}>
                <IconoGuardar tamano={26} />
                <span data-rotulo="guardar" style={{ fontSize: ROTULO_MINIMO }}>{apretado === 'guardar' ? (avance !== null ? t('guardandoAvance', { n: Math.round(avance) }) : t('guardando')) : t('guardar')}</span>
              </button>
              {/* -tarea 87, de lado, 04-10-2026- Guardar y compartir también de lado: en la columna, una
                  fila más debajo de Guardar; en la tarjeta, en la misma fila. La misma acción que de pie
                  -handleGuardarYCompartir-, con el toque de 48 y el rótulo de 12 de la 90. */}
              <button type="button" className="accion-toma" data-testid="btn-compartir-nueva" aria-label={t('guardarYCompartir')} disabled={guardando && apretado !== 'compartir'} aria-busy={apretado === 'compartir'} onClick={handleGuardarYCompartir} style={estiloFila} {...fila}>
                <IconoCompartir tamano={26} />
                <span data-rotulo="compartir" style={{ fontSize: ROTULO_MINIMO }}>{apretado === 'compartir' ? (avance !== null ? t('guardandoAvance', { n: Math.round(avance) }) : t('guardando')) : t('guardarYCompartir')}</span>
              </button>
              {enColumna && selector && (
                <div className="visor-lado-subtitulos" data-testid="visor-lado-subtitulos" style={{ ...toque, fontSize: ROTULO_MINIMO }} {...fila}>
                  {selector}
                </div>
              )}
              {/* -tarea 96- El filtro, una fila más debajo de Subtítulos, vestida igual -las dos clases,
                  styles-visor-de-lado.css-. */}
              {enColumna && selectorFiltro && (
                <div className="visor-lado-subtitulos visor-lado-filtro" data-testid="visor-lado-filtro" style={{ ...toque, fontSize: ROTULO_MINIMO }} {...fila}>
                  {selectorFiltro}
                </div>
              )}
              {onRepetir && (
                // -tarea 87, de lado- Desactivado mientras se guarda, como de pie. Antes sin disabled.
                <button type="button" className="accion-toma" data-testid="btn-repetir-toma" aria-label={t('repetirToma')} title={t('repetirToma')} disabled={guardando} onClick={onRepetir} style={estiloFila} {...fila}>
                  <IconoRepetir tamano={26} />
                  {/* -guia-sigo- Repetir con su nombre, de lado también. */}
                  <span>{t('repetir')}</span>
                </button>
              )}
            </>
          )}
          <button
            type="button"
            // -ajustes de pantallas, 10-10-2026- Con su nombre al lado del ícono. Antes: className="accion-toma".
            // En la toma sin guardar, la fila tiene Guardar y Guardar y compartir con su nombre debajo: ahí
            // Borrar lleva el nombre debajo como ellos, para que la fila no mezcle dos formas.
            className={guardada ? 'accion-toma con-nombre' : 'accion-toma'}
            data-testid="borrar-desde-reproductor"
            data-confirmando={confirmando ? 'si' : 'no'}
            // Antes: aria-label={confirmando ? t('seguro') : t('borrar')}
            aria-label={confirmando ? t('confirmarBorrar') : t('borrar')}
            title={t('borrar')}
            // -tarea 87, de lado- Desactivado mientras se guarda, como de pie. Antes sin disabled.
            disabled={guardando}
            onClick={() => { if (confirmando) { onBorrar(grabacion.id) } else { setConfirmando(true) } }}
            style={estiloFila}
            {...fila}
          >
            <IconoTacho tamano={26} strokeWidth={1.6} />
            {/* -ajustes de pantallas- Dice «Borrar»; al primer toque, «¿Borrar?» en su lugar. Antes:
                {confirmando ? <span data-rotulo="seguro" style={{ fontSize: ROTULO_MINIMO }}>{t('seguro')}</span> : ...} */}
            {confirmando
              ? <span data-rotulo="seguro" style={{ fontSize: ROTULO_MINIMO }}>{t('confirmarBorrar')}</span>
              : <span data-rotulo="borrar" style={{ fontSize: ROTULO_MINIMO }}>{t('borrar')}</span>}
          </button>
        </>
      )
    }
    const raiz: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 400, overflow: 'hidden', background: m.caso === 1 ? 'var(--bg-superficie)' : 'var(--bg-suelo)' }
    if (m.caso === 1) {
      // La franja del recorte o de la barra de tres botones junto al video: negra a la altura del video,
      // como el video -el resto ya es la superficie de la barra-.
      return (
        <div ref={raizLado} data-testid="reproductor-grabacion" data-tema="oscuro" data-visor="lado" data-caso="1" className="visor-lado visor-lado-caso1" onClick={onCerrar} style={raiz}>
          {/* Tocar la franja no cierra: en el caso 1 no hay «afuera», y es justo donde cae el pulgar al
              tomar el teléfono de lado. El caso 2 sí cierra al tocar el fondo, como hoy fuera de la tarjeta. */}
          {m.video.x > 0 && <div aria-hidden="true" data-testid="visor-lado-franja" onClick={parar} style={{ position: 'absolute', left: 0, top: m.video.y, width: m.video.x, height: m.video.alto, background: '#000' }} />}
          {/* -(4), 04-10-2026- Con la columna al 70% el video queda centrado y sobra una franja también
              entre el video y la columna: negra como la otra, a la altura del video, y tampoco cierra. Al
              lado de la barra sigue la superficie oscura de la raíz. */}
          {m.franjas.derecha.ancho > 0 && <div aria-hidden="true" data-testid="visor-lado-franja-derecha" onClick={parar} style={{ position: 'absolute', left: m.franjas.derecha.x, top: m.franjas.derecha.y, width: m.franjas.derecha.ancho, height: m.franjas.derecha.alto, background: '#000' }} />}
          {cajaVideo({ left: m.video.x, top: m.video.y, width: m.video.ancho, height: m.video.alto })}
          {barra({ position: 'absolute', left: m.barra.x, top: m.barra.y, width: m.barra.ancho })}
          <div className="visor-lado-columna" data-testid="visor-lado-columna" onClick={parar} style={{ position: 'absolute', left: m.columna.x, top: m.columna.y, width: m.columna.ancho, height: m.columna.alto }}>
            <div className="visor-lado-cabecera">
              {nombre}
              {cerrar}
            </div>
            <div className="acciones-toma visor-lado-acciones" data-testid="visor-lado-acciones">
              {acciones(true)}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div ref={raizLado} data-testid="reproductor-grabacion" data-tema="oscuro" data-visor="lado" data-caso="2" className="visor-lado visor-lado-caso2" onClick={onCerrar} style={raiz}>
        {cajaVideo({ left: m.video.x, top: m.video.y, width: m.video.ancho, height: m.video.alto })}
        <div style={{ position: 'absolute', left: m.tarjeta.x, top: bordes.usados.arriba, bottom: bordes.usados.abajo, width: m.tarjeta.ancho, display: 'flex', alignItems: 'center' }}>
          <div className="tarjeta-elevada visor-lado-tarjeta" data-testid="visor-lado-tarjeta" onClick={parar}>
            <div className="visor-lado-cabecera">
              {nombre}
              {cerrar}
            </div>
            {barra({})}
            {selector && <div style={{ padding: 'var(--aire-2) var(--aire-3) 0' }}>{selector}</div>}
            {/* -tarea 96- El filtro debajo de Subtítulos, igual. */}
            {selectorFiltro && <div style={{ padding: 'var(--aire-2) var(--aire-3) 0' }}>{selectorFiltro}</div>}
            <div className="acciones-toma">{acciones(false)}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    // TAREA 89 -04-10-2026-, defecto 3: la raíz es fixed e inset 0, o sea llega hasta debajo de la
    // barra de navegación de tres botones -viewport-fit=cover-. Con un padding parejo, Guardar,
    // Repetir y Borrar quedaban detrás de la barra. Ahora cada lado suma su borde seguro: abajo la
    // barra de pie, a un costado la barra de lado, arriba la de estado. Propiedades separadas -no el
    // atajo padding- para que las pruebas las puedan leer.
    // Y si la tarjeta no cabe -de pie con el selector de subtítulos ya no cabe-, la raíz se desplaza
    // -overflowY auto- y la tarjeta va con margin auto: centrada si cabe, desde arriba si no. Antes el
    // centrado la cortaba por los dos lados sin poder llegar a las acciones.
    // -tarea 87, A4- La raíz queda como la dejó la 89; solo se le suma la referencia para medir.
    <div ref={raizRef} data-testid="reproductor-grabacion" onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: '#111111', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'calc(var(--aire-4) + env(safe-area-inset-top, 0px))', paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))', paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))', paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* La tarjeta del visor con el borde y la sombra de las cajas -.tarjeta-elevada, 28-09-2026-. */}
      {/* -tarea 87, A4, corrección (1)- La tarjeta pasa a columna, como mucho del alto disponible
          -maxHeight 100%-, con su margin auto de la 89. Arriba -visor-arriba- lo que se puede
          desplazar; abajo, fuera de eso, las acciones, que nunca se desplazan. Antes: style={{
          width: 'min(720px, 100%)', margin: 'auto', flexShrink: 0, ... overflow: 'hidden' }}, sin
          display ni maxHeight. */}
      <div ref={tarjetaRef} className="tarjeta-elevada" onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)', margin: 'auto', flexShrink: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', overflow: 'hidden' }}>
        <div data-testid="visor-arriba" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
        {/* LOS CONTROLES DEL VIDEO SON NUESTROS -28-09-2026-. Los del sistema -atributo controls-
            en el moto g86 casi no se veian: ni play ni barra, solo un "0:00 / 0:19" desvanecido
            sobre la imagen. Ahora: tocar el video lo pausa o lo sigue, el play grande al centro
            cuando esta quieto, y debajo del video -no encima, para no tapar los subtitulos- una
            barra con los tiempos que se puede arrastrar. */}
        <div ref={videoCajaRef} className="visor-video" onClick={alternarVideo}>
          {/* Cerrar es la X de la esquina -28-09-2026-: tocar fuera de la tarjeta tambien cierra. */}
          <button type="button" className="cerrar-visor" data-testid="btn-cerrar-reproductor" aria-label={t('cerrar')} title={t('cerrar')} onClick={(e) => { e.stopPropagation(); onCerrar() }}>
            <IconoCerrar tamano={22} />
          </button>
          {/* -tarea 87, A4- El alto del video sale de usarAltoDelVideo; sin medir, el 70vh de antes.
              Antes: maxHeight: '70vh'. */}
          {/* -tarea 96- Con el filtro elegido -filtroVideo-, que no alcanza a los subtítulos. */}
          <video ref={setVideo} data-testid="video-grabacion" src={srcServidor || undefined} playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} style={{ width: '100%', maxHeight: altoVideo ?? '70vh', background: '#000', display: 'block', filter: filtroVideo }} />
          {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} cortes={cortes} />}
          {!reproduciendo && (
            <span className="play-visor" aria-hidden="true">
              <IconoEmpezar tamano={30} />
            </span>
          )}
        </div>
        <div className="barra-visor">
          <button type="button" className="boton-visor" data-testid="btn-reproducir-toma" aria-label={reproduciendo ? t('pausa') : t('reproducir')} onClick={alternarVideo}>
            {reproduciendo ? <IconoPausa tamano={20} /> : <IconoEmpezar tamano={20} />}
          </button>
          <span>{formatearSegundos(actual)}</span>
          <input
            type="range"
            className="avance-visor"
            data-testid="avance-toma"
            aria-label={t('avanceDelVideo')}
            min={0}
            max={total || 0}
            step={0.1}
            value={Math.min(actual, total || 0)}
            onChange={(e) => {
              const s = Number(e.target.value)
              // -tarea 88- La barra va en el reloj de la salida: al arrastrar se lleva al del archivo.
              // Antes: video.currentTime = s.
              if (video) video.currentTime = cortes.length > 0 ? aArchivo(s * 1000, cortes) / 1000 : s
              setActual(s)
            }}
            style={{ ['--avance' as any]: `${total > 0 ? (actual / total) * 100 : 0}%` }}
          />
          <span>{formatearSegundos(total)}</span>
        </div>
        {subtitulos.length === 0 && !guardada && (
          <p className="sin-subtitulos" data-testid="sin-subtitulos">{t('sinSubtitulos')}</p>
        )}
        {subtitulos.length > 0 && !guardada && (
          <div ref={anclaSubRef} style={{ padding: 'var(--aire-3) var(--aire-3) 0' }} data-testid="ancla-subtitulos">
            {/* -tarea 87, A4- El visor sabe si el panel está abierto -esconde el nombre-. Mientras se
                guarda, la ficha no se abre. */}
            <SelectorSubtitulos
              estilo={estilo}
              onCambiar={(e) => {
                setEstilo(e)
                // -tomas-largas- Ya no se recuerda: es de esta toma. Antes: guardarEstiloSubtitulo(e)
              }}
              abierto={panelAbierto}
              // -tarea 96- abrirSubtitulos cierra la tira de filtros. Antes: onAbrir={setPanelAbierto}.
              onAbrir={(v) => { abrirSubtitulos(v); if (v) { marcarComoVista('subtitulos'); setMarcaSub(false) } }}
              desactivado={guardando}
            />
          </div>
        )}
        {/* -tarea 96, 05-10-2026- EL FILTRO, junto al de Subtítulos y con su mismo aspecto -o solo, si la
            toma no tiene subtítulos-. Solo si la toma no está guardada. */}
        {!guardada && (
          <div style={{ padding: subtitulos.length > 0 ? 'var(--aire-2) var(--aire-3) 0' : 'var(--aire-3) var(--aire-3) 0' }}>
            <SelectorFiltro
              tono={filtro.tono}
              onCambiar={cambiarFiltro}
              video={video}
              ruta={grabacion.ruta}
        poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined}
              abierto={filtroAbierto}
              onAbrir={abrirFiltro}
              desactivado={guardando}
            />
          </div>
        )}
        {/* -tarea 87- Con el panel de Subtítulos abierto, el nombre se esconde -respuesta de Claude
            del 04-10-: el video gana ~52 dp-. */}
        {nombreVisible && (
          <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
            <div style={{ fontWeight: 700 }}>{nombreDeToma(grabacion, guiones)}</div>
            <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
              {formatearDuracionMs(duracionVisible(grabacion))}
              {grabacion.incompleta ? ` · ${t('incompleta')}` : ''}
              {grabacion.errorMudo ? ` · ${t('metaErrorMudo')}` : ''}
              {grabacion.avisoMudo ? ` · ${t('metaAvisoMudo')}` : ''}
            </div>
          </div>
        )}
        </div>
        {/* LAS ACCIONES CON SIMBOLOS -28-09-2026-. Ver .acciones-toma en styles.css. Los que van
            con el simbolo solo llevan su nombre en aria-label: es lo que lee TalkBack. Recien
            grabada: Guardar, Repetir, Borrar. Guardada: Compartir, Borrar. Antes Compartir era el
            unico boton relleno -acento-: en una fila de simbolos iguales ya no hace falta, porque
            en la toma guardada es la primera de solo dos acciones. */}
        {/* -tarea 87, A4- Las acciones van FUERA de visor-arriba, con flexShrink 0: siempre completas
            sobre la barra del sistema. Antes: <div className="acciones-toma">. */}
        <div className="acciones-toma" style={{ flexShrink: 0 }}>
          {guardada ? (
            <button
              type="button"
              // -ajustes de pantallas, 10-10-2026, boceto 3- Compartir con su nombre al lado del ícono.
              // Antes: className="accion-toma", solo el ícono.
              className="accion-toma con-nombre"
              data-testid="btn-compartir-toma"
              aria-label={t('compartir')}
              title={t('compartir')}
              onClick={handleCompartir}
            >
              <IconoCompartir tamano={26} />
              <span>{t('compartir')}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="accion-toma"
                data-testid="guardar-galeria-desde-reproductor"
                aria-label={t('guardarEnGaleria')}
                // -tarea 87- Desactivado si se apretó el otro; el apretado muestra el avance y no se
                // vuelve a tocar -guardarToma lo ignora-. Antes: disabled={guardando}.
                disabled={guardando && apretado !== 'guardar'}
                aria-busy={apretado === 'guardar'}
                onClick={handleGuardar}
              >
                <IconoGuardar tamano={26} />
                <span>{apretado === 'guardar' ? (avance !== null ? t('guardandoAvance', { n: Math.round(avance) }) : t('guardando')) : t('guardar')}</span>
              </button>
              {/* -tarea 87, E1- Guardar y compartir, en toda toma recién grabada. */}
              <button
                type="button"
                className="accion-toma"
                data-testid="btn-compartir-nueva"
                aria-label={t('guardarYCompartir')}
                disabled={guardando && apretado !== 'compartir'}
                aria-busy={apretado === 'compartir'}
                onClick={handleGuardarYCompartir}
              >
                <IconoCompartir tamano={26} />
                <span>{apretado === 'compartir' ? (avance !== null ? t('guardandoAvance', { n: Math.round(avance) }) : t('guardando')) : t('guardarYCompartir')}</span>
              </button>
              {onRepetir && (
                <button
                  type="button"
                  className="accion-toma"
                  data-testid="btn-repetir-toma"
                  aria-label={t('repetirToma')}
                  title={t('repetirToma')}
                  disabled={guardando}
                  onClick={onRepetir}
                >
                  <IconoRepetir tamano={26} />
                  {/* -guia-sigo- Repetir con su nombre, como Guardar y Borrar en la misma fila. */}
                  <span>{t('repetir')}</span>
                </button>
              )}
            </>
          )}
          {/* Borrar pregunta una vez: el tacho se pone rojo y dice "¿Seguro?" debajo. */}
          {/* -ajustes de pantallas, 10-10-2026, boceto 3- Borrar con su nombre al lado del ícono; sigue
              preguntando una vez: al primer toque dice «¿Seguro?» en lugar de «Borrar». Antes:
              className="accion-toma" y {confirmando && <span>{t('seguro')}</span>} */}
          {/* En la toma sin guardar, el nombre debajo del ícono, como Guardar y Guardar y compartir en la
              misma fila. */}
          <button
            type="button"
            className={guardada ? 'accion-toma con-nombre' : 'accion-toma'}
            data-testid="borrar-desde-reproductor"
            data-confirmando={confirmando ? 'si' : 'no'}
            // Antes: aria-label={confirmando ? t('seguro') : t('borrar')}
            aria-label={confirmando ? t('confirmarBorrar') : t('borrar')}
            title={t('borrar')}
            disabled={guardando}
            onClick={() => { if (confirmando) { onBorrar(grabacion.id) } else { setConfirmando(true) } }}
          >
            <IconoTacho tamano={26} strokeWidth={1.6} />
            {/* Antes: <span>{confirmando ? t('seguro') : t('borrar')}</span> */}
            <span>{confirmando ? t('confirmarBorrar') : t('borrar')}</span>
          </button>
        </div>
      </div>
      {marcaSub && (
        <MarcaGuia
          anclaEl={anclaSubRef.current}
          texto={t('marcaGuiaSubtitulos')}
          idDescripcion="marca-guia-subtitulos-desc"
          onCerrar={(motivo) => { if (motivo === 'entendido') marcarComoVista('subtitulos'); else registrarCierreAfuera('subtitulos'); setMarcaSub(false) }}
          testid="marca-guia-subtitulos"
        />
      )}
    </div>
  )
}
