import React from 'react'
import { ResumenGrabacion, ResumenGuion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs, nombreDeToma } from './TiraGrabaciones'
import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo, analizarVideo, tieneExportarToma } from '../lib/archivosNativos'
import { margenAbajo, posicionGuardada, guardarPosicion, type PosicionSubtitulos } from '../lib/posicionSubtitulos'
import { orientacionDeToma } from '../lib/orientacion'
import { segundosEstimados, textoTiempo } from '../lib/tiempoGuardado'
import { anotar87, medirBordesSeguros, anotarOrientacion } from '../lib/medicionesTarea87'
import { SelectorPosicion } from './SelectorPosicion'
import { armarSubtitulos, estiloSubtituloGuardado, guardarEstiloSubtitulo, EstiloSubtitulo, Subtitulo } from '../lib/subtitulos'
import { CapaSubtitulos, SelectorSubtitulos } from './SubtitulosVisor'
import { t, useTextos } from '../textos'
import { IconoGuardar, IconoCompartir, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar, IconoPausa } from './IconosApp'

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
  const [subtitulos, setSubtitulos] = React.useState<Subtitulo[]>([])
  const [estilo, setEstilo] = React.useState<EstiloSubtitulo>(() => estiloSubtituloGuardado())
  React.useEffect(() => {
    let vigente = true
    setSubtitulos([])
    ;(async () => {
      try {
        const dir = await directorioGrabaciones()
        const registro = await leerTexto(juntos(dir, `${grabacion.id}.motor.txt`))
        const subs = armarSubtitulos(registro)
        if (vigente) setSubtitulos(subs)
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
  const [total, setTotal] = React.useState(grabacion.duracionMs / 1000)
  React.useEffect(() => {
    if (!video) return
    const alReproducir = () => setReproduciendo(true)
    const alPausar = () => setReproduciendo(false)
    const alAvanzar = () => setActual(video.currentTime)
    const alCargar = () => { if (Number.isFinite(video.duration) && video.duration > 0) setTotal(video.duration) }
    video.addEventListener('play', alReproducir)
    video.addEventListener('pause', alPausar)
    video.addEventListener('ended', alPausar)
    video.addEventListener('timeupdate', alAvanzar)
    video.addEventListener('loadedmetadata', alCargar)
    return () => {
      video.removeEventListener('play', alReproducir)
      video.removeEventListener('pause', alPausar)
      video.removeEventListener('ended', alPausar)
      video.removeEventListener('timeupdate', alAvanzar)
      video.removeEventListener('loadedmetadata', alCargar)
    }
  }, [video])
  const alternarVideo = (e: React.MouseEvent) => {
    e.stopPropagation()
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
  const [avance, setAvance] = React.useState<number | null>(null)

  // -tarea 87, 04-10-2026- Cuál de los dos botones de guardar se apretó: solo ese muestra el avance
  // y los demás -el otro de guardar, Repetir, Borrar y la ficha- quedan desactivados. La X de cerrar
  // sigue activa y NO cancela: el guardado sigue y al terminar sale el aviso aunque el visor ya no
  // esté -respuesta de Claude del 04-10-.
  const [apretado, setApretado] = React.useState<'guardar' | 'compartir' | null>(null)
  const cerrado = React.useRef(false)
  React.useEffect(() => () => { cerrado.current = true }, [])

  // LA POSICIÓN -parte D-: la última elegida; "Para redes" solo se ofrece en una toma vertical
  // recién grabada, con subtítulos, con un estilo y con un APK que tiene exportarToma. Si no se
  // ofrece, se guarda en "Normal" aunque lo recordado sea "Para redes".
  const [posicion, setPosicion] = React.useState<PosicionSubtitulos>(() => posicionGuardada())
  const [orientacion, setOrientacion] = React.useState(grabacion.orientacion)
  const [puedeExportar, setPuedeExportar] = React.useState(false)
  React.useEffect(() => {
    let vigente = true
    void tieneExportarToma().then((si) => { if (vigente) setPuedeExportar(si) })
    return () => { vigente = false }
  }, [])
  // Una toma vieja sin el dato -o de un APK viejo-: se analiza una vez al abrirla y se guarda por
  // onCambio -parte C-. Si el APK no manda ancho y alto, sigue sin el dato y no hay selector.
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
        // sin análisis la toma se ve igual, sin "Para redes"
      }
    })()
    return () => { vigente = false }
  }, [grabacion.id])
  const conPosicion = !guardada && subtitulos.length > 0 && estilo !== 'no' && orientacion === 'vertical' && puedeExportar
  const posicionEfectiva: PosicionSubtitulos = conPosicion ? posicion : 'normal'

  // El panel de Subtítulos abierto esconde el nombre de la toma: el video gana ~52 dp -respuesta de
  // Claude del 04-10-.
  const [panelAbierto, setPanelAbierto] = React.useState(false)
  const conFicha = subtitulos.length > 0 && !guardada
  const nombreVisible = !(conFicha && panelAbierto)

  // E2: el tiempo estimado, antes de guardar y desde 1 minuto de toma.
  const segundos = !guardada && !guardando && subtitulos.length > 0 && estilo !== 'no' ? segundosEstimados(grabacion.duracionMs) : null

  // EL LAYOUT -A4- y lo que mide para Claude.
  const raizRef = React.useRef<HTMLDivElement>(null)
  const tarjetaRef = React.useRef<HTMLDivElement>(null)
  const videoCajaRef = React.useRef<HTMLDivElement>(null)
  const anotadoVisor = React.useRef<string>('')
  const altoVideo = usarAltoDelVideo(raizRef, tarjetaRef, videoCajaRef, ({ disponible, alto }) => {
    // Una línea evento=visor por cada forma en que se acomoda -abrir, panel abierto o cerrado,
    // posición-: dónde quedaron el video y las acciones de verdad. Solo en la APK de prueba.
    const clave = `${panelAbierto}|${alto}|${posicionEfectiva}|${apretado}`
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
        posicion: posicionEfectiva,
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
  // Lleva la posición -parte D- y anota lo que tardó contra lo estimado -E2-.
  const guardarToma = async (boton: 'guardar' | 'compartir'): Promise<{ ok: boolean; uri?: string } | null> => {
    if (guardando) return null
    setGuardando(true)
    setApretado(boton)
    setPanelAbierto(false)
    setAvance(null)
    const conSubtitulos = estilo !== 'no' && subtitulos.length > 0
    const inicio = Date.now()
    const estimado = conSubtitulos ? segundosEstimados(grabacion.duracionMs) : null
    let resultado = 'error'
    try {
      // -tarea 87, parte D- El quinto parámetro es la posición. Antes:
      // guardarEnGaleriaConSubtitulos(grabacion.ruta, subtitulos, estilo, (pct) => setAvance(pct)).
      const res = conSubtitulos
        ? await guardarEnGaleriaConSubtitulos(grabacion.ruta, subtitulos, estilo, (pct) => setAvance(pct), posicionEfectiva)
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
        // -tarea 87- Con la orientación y la posición. Antes: onCambio?.({ ...grabacion, ruta:
        // res.uri, galeriaUri: res.uri, estiloGaleria: conSubtitulos ? estilo : 'no' }).
        onCambio?.({
          ...grabacion,
          ruta: res.uri,
          galeriaUri: res.uri,
          estiloGaleria: conSubtitulos ? estilo : 'no',
          ...(orientacion ? { orientacion } : {}),
          ...(conSubtitulos ? { posicionGaleria: posicionEfectiva } : {})
        })
        onGuardadoEnGaleria?.(true, t('galeriaGuardada'))
        resultado = 'ok'
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
      // E2 -para Claude-: lo anunciado contra lo que de verdad tardó, visto desde el visor.
      anotar87('tiempo_guardado', {
        id: grabacion.id,
        dur_toma_ms: grabacion.duracionMs,
        estimado_s: estimado,
        real_ms: Date.now() - inicio,
        resultado,
        boton,
        estilo: conSubtitulos ? estilo : 'no',
        posicion: conSubtitulos ? posicionEfectiva : null
      })
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
          <video ref={setVideo} data-testid="video-grabacion" src={srcDeRuta(grabacion.ruta)} playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} style={{ width: '100%', maxHeight: altoVideo ?? '70vh', background: '#000', display: 'block' }} />
          {/* -tarea 87, parte D- Con la posición elegida: "Para redes" sube el subtítulo a 0,35. */}
          {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} margenAbajo={margenAbajo(posicionEfectiva)} />}
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
              if (video) video.currentTime = s
              setActual(s)
            }}
            style={{ ['--avance' as any]: `${total > 0 ? (actual / total) * 100 : 0}%` }}
          />
          <span>{formatearSegundos(total)}</span>
        </div>
        {subtitulos.length > 0 && !guardada && (
          <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
            {/* -tarea 87, A4 y D3- Posición va DENTRO del panel, debajo de los cuatro estilos; la
                píldora la resume -«Amarillo · Para redes»-. Mientras se guarda, la ficha no se abre. */}
            <SelectorSubtitulos
              estilo={estilo}
              onCambiar={(e) => {
                setEstilo(e)
                guardarEstiloSubtitulo(e)
              }}
              abierto={panelAbierto}
              onAbrir={setPanelAbierto}
              desactivado={guardando}
              resumen={conPosicion && posicion === 'redes' ? t('posicionRedes') : undefined}
              extra={conPosicion ? (
                <SelectorPosicion
                  posicion={posicion}
                  onCambiar={(p) => {
                    setPosicion(p)
                    guardarPosicion(p)
                  }}
                />
              ) : undefined}
            />
          </div>
        )}
        {/* -tarea 87- Con el panel de Subtítulos abierto, el nombre se esconde -respuesta de Claude
            del 04-10-: el video gana ~52 dp-. */}
        {nombreVisible && (
          <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
            <div style={{ fontWeight: 700 }}>{nombreDeToma(grabacion, guiones)}</div>
            <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
              {formatearDuracionMs(grabacion.duracionMs)}
              {grabacion.incompleta ? ` · ${t('incompleta')}` : ''}
              {grabacion.errorMudo ? ` · ${t('metaErrorMudo')}` : ''}
              {grabacion.avisoMudo ? ` · ${t('metaAvisoMudo')}` : ''}
            </div>
            {/* -tarea 87, E2- El tiempo estimado antes de guardar, en una segunda línea meta. */}
            {segundos !== null && (
              <div data-testid="tiempo-estimado-guardado" className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
                {t('tiempoEstimadoGuardado', { tiempo: textoTiempo(segundos) })}
              </div>
            )}
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
              className="accion-toma"
              data-testid="btn-compartir-toma"
              aria-label={t('compartir')}
              title={t('compartir')}
              onClick={handleCompartir}
            >
              <IconoCompartir tamano={26} />
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
                </button>
              )}
            </>
          )}
          {/* Borrar pregunta una vez: el tacho se pone rojo y dice "¿Seguro?" debajo. */}
          <button
            type="button"
            className="accion-toma"
            data-testid="borrar-desde-reproductor"
            data-confirmando={confirmando ? 'si' : 'no'}
            aria-label={confirmando ? t('seguro') : t('borrar')}
            title={t('borrar')}
            disabled={guardando}
            onClick={() => { if (confirmando) { onBorrar(grabacion.id) } else { setConfirmando(true) } }}
          >
            <IconoTacho tamano={26} strokeWidth={1.6} />
            {confirmando && <span>{t('seguro')}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
