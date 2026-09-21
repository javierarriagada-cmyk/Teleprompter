import React from 'react'
import { ResumenGrabacion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs } from './TiraGrabaciones'

export default function ReproductorGrabacion({ grabacion, onCerrar, onBorrar }: { grabacion: ResumenGrabacion; onCerrar: () => void; onBorrar: (id: string) => void }) {
  return (
    <div data-testid="reproductor-grabacion" onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--aire-4)' }}>
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
          <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
            <button type="button" data-testid="borrar-desde-reproductor" onClick={() => onBorrar(grabacion.id)} style={{ background: 'var(--bg-suelo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', padding: 'var(--aire-2) var(--aire-3)', cursor: 'pointer' }}>Borrar</button>
            <button type="button" onClick={onCerrar} style={{ background: 'var(--bg-suelo)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', padding: 'var(--aire-2) var(--aire-3)', cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
