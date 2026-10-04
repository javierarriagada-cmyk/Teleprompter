import React from 'react'
import { ResumenGrabacion, ResumenGuion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs, nombreDeToma } from './TiraGrabaciones'
import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo } from '../lib/archivosNativos'
import { armarSubtitulos, estiloSubtituloGuardado, guardarEstiloSubtitulo, EstiloSubtitulo, Subtitulo } from '../lib/subtitulos'
import { CapaSubtitulos, SelectorSubtitulos } from './SubtitulosVisor'
import { t, useTextos } from '../textos'
import { IconoGuardar, IconoCompartir, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar, IconoPausa } from './IconosApp'
// EL VISOR DE LADO -tarea 90-. Ver lib/visorDeLado.ts y styles-visor-de-lado.css.
import useLayout from '../hooks/useLayout'
import useBordesSeguros, { LecturaBordes } from '../hooks/useBordesSeguros'
import { FormaVideo, formaDeVideo, medidasVisorDeLado, TOQUE_MINIMO, ROTULO_MINIMO, ALTO_BARRA_REPRODUCCION } from '../lib/visorDeLado'
import { tomarBarrasParaElVisor, soltarBarrasDelVisor, msDesdeQueSeOculto } from '../lib/barrasDelSistema'
import { anotarVisorLado, volcarRegistroVisorLado } from '../lib/registroVisorLado'

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
    const alAvanzar = () => setActual(video.currentTime)
    const alCargar = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) setTotal(video.duration)
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

  // Se guarda lo que se ve: con el estilo elegido, la copia lleva los subtitulos
  // quemados -Media3, CapaDeSubtitulos.java-; con "No", va la toma tal cual.
  const handleGuardar = async () => {
    if (guardando) return
    setGuardando(true)
    setAvance(null)
    const conSubtitulos = estilo !== 'no' && subtitulos.length > 0
    try {
      const res = conSubtitulos
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
        onCambio?.({ ...grabacion, ruta: res.uri, galeriaUri: res.uri, estiloGaleria: conSubtitulos ? estilo : 'no' })
        onGuardadoEnGaleria?.(true, t('galeriaGuardada'))
      } else {
        onGuardadoEnGaleria?.(false, t('galeriaNoSeGuardo'))
      }
    } catch (e: any) {
      // El motivo va a la vista, con la frase en el idioma de la app. El detalle lo escribe
      // el plugin nativo -CamaraNativaPlugin.java- y hoy esta en espanol: traducir esos
      // rechazos es trabajo del lado nativo.
      onGuardadoEnGaleria?.(false, t('galeriaNoSeGuardoPorque', { detalle: e?.message || String(e) }))
    } finally {
      setGuardando(false)
      setAvance(null)
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
  const deLado = layout === 'tel-h'

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
          {formatearDuracionMs(grabacion.duracionMs)}
          {grabacion.incompleta ? ` · ${t('incompleta')}` : ''}
          {grabacion.errorMudo ? ` · ${t('metaErrorMudo')}` : ''}
          {grabacion.avisoMudo ? ` · ${t('metaAvisoMudo')}` : ''}
        </div>
      </div>
    )
    const cajaVideo = (estilo: React.CSSProperties) => (
      <div className="visor-video" data-testid="visor-lado-video" onClick={alternarVideo} style={{ position: 'absolute', ...estilo }}>
        <video ref={setVideo} data-testid="video-grabacion" src={srcDeRuta(grabacion.ruta)} playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} />
        {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} />}
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
            if (video) video.currentTime = s
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
        onCambiar={(e) => {
          setEstilo(e)
          guardarEstiloSubtitulo(e)
        }}
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
            <button type="button" className="accion-toma" data-testid="btn-compartir-toma" aria-label={t('compartir')} title={t('compartir')} onClick={handleCompartir} style={estiloFila} {...fila}>
              <IconoCompartir tamano={26} />
            </button>
          ) : (
            <>
              <button type="button" className="accion-toma" data-testid="guardar-galeria-desde-reproductor" aria-label={t('guardarEnGaleria')} disabled={guardando} onClick={handleGuardar} style={estiloFila} {...fila}>
                <IconoGuardar tamano={26} />
                <span data-rotulo="guardar" style={{ fontSize: ROTULO_MINIMO }}>{guardando ? (avance !== null ? t('guardandoAvance', { n: Math.round(avance) }) : t('guardando')) : t('guardar')}</span>
              </button>
              {enColumna && selector && (
                <div className="visor-lado-subtitulos" data-testid="visor-lado-subtitulos" style={{ ...toque, fontSize: ROTULO_MINIMO }} {...fila}>
                  {selector}
                </div>
              )}
              {onRepetir && (
                <button type="button" className="accion-toma" data-testid="btn-repetir-toma" aria-label={t('repetirToma')} title={t('repetirToma')} onClick={onRepetir} style={estiloFila} {...fila}>
                  <IconoRepetir tamano={26} />
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="accion-toma"
            data-testid="borrar-desde-reproductor"
            data-confirmando={confirmando ? 'si' : 'no'}
            aria-label={confirmando ? t('seguro') : t('borrar')}
            title={t('borrar')}
            onClick={() => { if (confirmando) { onBorrar(grabacion.id) } else { setConfirmando(true) } }}
            style={estiloFila}
            {...fila}
          >
            <IconoTacho tamano={26} strokeWidth={1.6} />
            {confirmando && <span data-rotulo="seguro" style={{ fontSize: ROTULO_MINIMO }}>{t('seguro')}</span>}
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
    <div data-testid="reproductor-grabacion" onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: '#111111', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'calc(var(--aire-4) + env(safe-area-inset-top, 0px))', paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))', paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))', paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* La tarjeta del visor con el borde y la sombra de las cajas -.tarjeta-elevada, 28-09-2026-. */}
      <div className="tarjeta-elevada" onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)', margin: 'auto', flexShrink: 0, background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', overflow: 'hidden' }}>
        {/* LOS CONTROLES DEL VIDEO SON NUESTROS -28-09-2026-. Los del sistema -atributo controls-
            en el moto g86 casi no se veian: ni play ni barra, solo un "0:00 / 0:19" desvanecido
            sobre la imagen. Ahora: tocar el video lo pausa o lo sigue, el play grande al centro
            cuando esta quieto, y debajo del video -no encima, para no tapar los subtitulos- una
            barra con los tiempos que se puede arrastrar. */}
        <div className="visor-video" onClick={alternarVideo}>
          {/* Cerrar es la X de la esquina -28-09-2026-: tocar fuera de la tarjeta tambien cierra. */}
          <button type="button" className="cerrar-visor" data-testid="btn-cerrar-reproductor" aria-label={t('cerrar')} title={t('cerrar')} onClick={(e) => { e.stopPropagation(); onCerrar() }}>
            <IconoCerrar tamano={22} />
          </button>
          <video ref={setVideo} data-testid="video-grabacion" src={srcDeRuta(grabacion.ruta)} playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }} />
          {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} />}
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
            <SelectorSubtitulos
              estilo={estilo}
              onCambiar={(e) => {
                setEstilo(e)
                guardarEstiloSubtitulo(e)
              }}
            />
          </div>
        )}
        <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
          <div style={{ fontWeight: 700 }}>{nombreDeToma(grabacion, guiones)}</div>
          <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
            {formatearDuracionMs(grabacion.duracionMs)}
            {grabacion.incompleta ? ` · ${t('incompleta')}` : ''}
            {grabacion.errorMudo ? ` · ${t('metaErrorMudo')}` : ''}
            {grabacion.avisoMudo ? ` · ${t('metaAvisoMudo')}` : ''}
          </div>
        </div>
        {/* LAS ACCIONES CON SIMBOLOS -28-09-2026-. Ver .acciones-toma en styles.css. Los que van
            con el simbolo solo llevan su nombre en aria-label: es lo que lee TalkBack. Recien
            grabada: Guardar, Repetir, Borrar. Guardada: Compartir, Borrar. Antes Compartir era el
            unico boton relleno -acento-: en una fila de simbolos iguales ya no hace falta, porque
            en la toma guardada es la primera de solo dos acciones. */}
        <div className="acciones-toma">
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
                disabled={guardando}
                onClick={handleGuardar}
              >
                <IconoGuardar tamano={26} />
                <span>{guardando ? (avance !== null ? t('guardandoAvance', { n: Math.round(avance) }) : t('guardando')) : t('guardar')}</span>
              </button>
              {onRepetir && (
                <button
                  type="button"
                  className="accion-toma"
                  data-testid="btn-repetir-toma"
                  aria-label={t('repetirToma')}
                  title={t('repetirToma')}
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
