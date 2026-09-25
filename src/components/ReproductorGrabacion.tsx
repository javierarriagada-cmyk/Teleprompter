import React from 'react'
import { ResumenGrabacion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs } from './TiraGrabaciones'
import { guardarEnGaleria, guardarEnGaleriaConSubtitulos, compartirDeGaleria, leerTexto, directorioGrabaciones, juntos, borrarArchivo } from '../lib/archivosNativos'
import { armarSubtitulos, estiloSubtituloGuardado, guardarEstiloSubtitulo, EstiloSubtitulo, Subtitulo } from '../lib/subtitulos'
import { CapaSubtitulos, SelectorSubtitulos } from './SubtitulosVisor'

export default function ReproductorGrabacion({
  grabacion,
  onCerrar,
  onBorrar,
  onRepetir,
  onGuardadoEnGaleria,
  onCambio
}: {
  grabacion: ResumenGrabacion
  onCerrar: () => void
  onBorrar: (id: string) => void
  onRepetir?: () => void
  onGuardadoEnGaleria?: (ok: boolean, detalle?: string) => void
  // La toma cambio -se guardo en la galeria, o su copia ya no esta-: App la
  // anota en el indice.
  onCambio?: (g: ResumenGrabacion) => void
}) {
  // Misma regla que en la tira: borrar pregunta una vez. Ver el comentario de
  // TiraGrabaciones. Aca no hace falta el temporizador porque al cerrar el
  // reproductor se desmonta todo.
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
        onGuardadoEnGaleria?.(true, 'Quedó en la galería del teléfono, en Películas.')
      } else {
        onGuardadoEnGaleria?.(false, 'No se pudo guardar en la galería')
      }
    } catch (e: any) {
      onGuardadoEnGaleria?.(false, e?.message || String(e))
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
        onGuardadoEnGaleria?.(false, 'No se pudo compartir')
      }
    }
  }

  const estiloBoton: React.CSSProperties = {
    background: 'var(--bg-suelo)',
    border: '1px solid var(--color-borde)',
    color: 'var(--color-texto)',
    fontWeight: 600,
    borderRadius: 'var(--redondeo)',
    padding: 'var(--aire-2) var(--aire-3)',
    cursor: 'pointer'
  }
  return (
    <div data-testid="reproductor-grabacion" onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: '#111111', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--aire-4)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)', background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', border: '1px solid var(--color-borde)', overflow: 'hidden' }}>
        <div className="visor-video">
          <video ref={setVideo} data-testid="video-grabacion" src={srcDeRuta(grabacion.ruta)} controls playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }} />
          {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} />}
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
        <div style={{ padding: 'var(--aire-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--aire-3)' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{grabacion.tituloGuion || 'Toma'}</div>
            <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
              {formatearDuracionMs(grabacion.duracionMs)}
              {grabacion.incompleta ? ' · incompleta' : ''}
              {grabacion.errorMudo ? ' · el motor oyo y el archivo no tiene sonido' : ''}
              {grabacion.avisoMudo ? ' · no se oye audio en este archivo' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--aire-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {guardada ? (
              <button
                type="button"
                data-testid="btn-compartir-toma"
                onClick={handleCompartir}
                style={{ ...estiloBoton, background: 'var(--color-acento)', borderColor: 'var(--color-acento)', color: 'var(--color-texto-acento)' }}
              >
                Compartir
              </button>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="guardar-galeria-desde-reproductor"
                  disabled={guardando}
                  onClick={handleGuardar}
                  style={{ ...estiloBoton, cursor: guardando ? 'default' : 'pointer', opacity: guardando ? 0.7 : 1 }}
                >
                  {guardando ? (avance !== null ? `Guardando… ${Math.round(avance)}%` : 'Guardando…') : 'Guardar en galería'}
                </button>
                {onRepetir && (
                  <button
                    type="button"
                    data-testid="btn-repetir-toma"
                    onClick={onRepetir}
                    style={estiloBoton}
                  >
                    Repetir toma
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              data-testid="borrar-desde-reproductor"
              data-confirmando={confirmando ? 'si' : 'no'}
              onClick={() => { if (confirmando) { onBorrar(grabacion.id) } else { setConfirmando(true) } }}
              style={{
                background: 'var(--bg-suelo)',
                border: `1px solid ${confirmando ? '#e11d2e' : 'var(--color-borde)'}`,
                color: confirmando ? '#e11d2e' : 'var(--color-texto)',
                fontWeight: confirmando ? 700 : 400,
                borderRadius: 'var(--redondeo)',
                padding: 'var(--aire-2) var(--aire-3)',
                cursor: 'pointer'
              }}
            >
              {confirmando ? '¿Seguro?' : 'Borrar'}
            </button>
            <button type="button" onClick={onCerrar} style={{ background: 'var(--bg-suelo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', padding: 'var(--aire-2) var(--aire-3)', cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
