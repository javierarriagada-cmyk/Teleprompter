import React from 'react'
import { ResumenGrabacion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs } from './TiraGrabaciones'
import { guardarEnGaleria } from '../lib/archivosNativos'

export default function ReproductorGrabacion({
  grabacion,
  onCerrar,
  onBorrar,
  onRepetir,
  onGuardadoEnGaleria
}: {
  grabacion: ResumenGrabacion
  onCerrar: () => void
  onBorrar: (id: string) => void
  onRepetir?: () => void
  onGuardadoEnGaleria?: (ok: boolean, detalle?: string) => void
}) {
  // Misma regla que en la tira: borrar pregunta una vez. Ver el comentario de
  // TiraGrabaciones. Aca no hace falta el temporizador porque al cerrar el
  // reproductor se desmonta todo.
  const [confirmando, setConfirmando] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)

  const handleGuardar = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      const res = await guardarEnGaleria(grabacion.ruta)
      if (res && res.ok) {
        onGuardadoEnGaleria?.(true, 'Quedó en la galería del teléfono, en Películas.')
      } else {
        onGuardadoEnGaleria?.(false, 'No se pudo guardar en la galería')
      }
    } catch (e: any) {
      onGuardadoEnGaleria?.(false, e?.message || String(e))
    } finally {
      setGuardando(false)
    }
  }
  return (
    <div data-testid="reproductor-grabacion" onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: '#111111', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--aire-4)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)', background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', border: '1px solid var(--color-borde)', overflow: 'hidden' }}>
        <video data-testid="video-grabacion" src={srcDeRuta(grabacion.ruta)} controls playsInline poster={grabacion.rutaMiniatura ? srcDeRuta(grabacion.rutaMiniatura) : undefined} style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }} />
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
            <button
              type="button"
              data-testid="guardar-galeria-desde-reproductor"
              disabled={guardando}
              onClick={handleGuardar}
              style={{
                background: 'var(--bg-suelo)',
                border: '1px solid var(--color-borde)',
                color: 'var(--color-texto)',
                fontWeight: 600,
                borderRadius: 'var(--redondeo)',
                padding: 'var(--aire-2) var(--aire-3)',
                cursor: guardando ? 'default' : 'pointer',
                opacity: guardando ? 0.7 : 1
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar en galería'}
            </button>
            {onRepetir && (
              <button
                type="button"
                data-testid="btn-repetir-toma"
                onClick={onRepetir}
                style={{
                  background: 'var(--bg-suelo)',
                  border: '1px solid var(--color-borde)',
                  color: 'var(--color-texto)',
                  fontWeight: 600,
                  borderRadius: 'var(--redondeo)',
                  padding: 'var(--aire-2) var(--aire-3)',
                  cursor: 'pointer'
                }}
              >
                Repetir toma
              </button>
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
