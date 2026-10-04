import React from 'react'
import { ResumenGrabacion, ResumenGuion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs, nombreDeToma } from './TiraGrabaciones'
import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo } from '../lib/archivosNativos'
import { armarSubtitulos, estiloSubtituloGuardado, guardarEstiloSubtitulo, EstiloSubtitulo, Subtitulo } from '../lib/subtitulos'
import { CapaSubtitulos, SelectorSubtitulos } from './SubtitulosVisor'
import { t, useTextos } from '../textos'
import { IconoGuardar, IconoCompartir, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar, IconoPausa } from './IconosApp'

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
