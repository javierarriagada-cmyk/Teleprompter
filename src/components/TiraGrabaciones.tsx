import React from 'react'
import { Capacitor } from '@capacitor/core'
import { ResumenGrabacion } from '../datos/modelo'

export function srcDeRuta(ruta: string): string {
  if (!ruta) return ''
  if (ruta.startsWith('http') || ruta.startsWith('blob:') || ruta.startsWith('data:') || ruta.startsWith('/')) return ruta
  try { return Capacitor.convertFileSrc(ruta) } catch { return ruta }
}

export function formatearDuracionMs(ms: number): string {
  const total = Math.max(0, Math.floor((ms || 0) / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatearFechaCorta(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  grabaciones: ResumenGrabacion[]
  onAbrir: (g: ResumenGrabacion) => void
  onBorrar: (id: string) => void
}

export default function TiraGrabaciones({ grabaciones, onAbrir, onBorrar }: Props) {
  if (!grabaciones || grabaciones.length === 0) return null
  return (
    <div data-testid="tira-grabaciones" style={{ marginTop: 'var(--aire-4)', marginBottom: 'var(--aire-3)' }}>
      <div className="texto-meta" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-2)', fontWeight: 600 }}>Tomas</div>
      <div style={{ display: 'flex', gap: 'var(--aire-3)', overflowX: 'auto', paddingBottom: 'var(--aire-2)', WebkitOverflowScrolling: 'touch' }}>
        {grabaciones.map((g) => (
          <div key={g.id} data-testid={`tarjeta-grabacion-${g.id}`} data-incompleta={g.incompleta ? 'si' : 'no'} style={{ flex: '0 0 auto', width: 132 }}>
            <button type="button" onClick={() => onAbrir(g)} style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--color-borde)', borderRadius: 'var(--redondeo)', overflow: 'hidden', background: 'var(--bg-suelo)', cursor: 'pointer' }}>
              <div style={{ width: '100%', height: 88, background: 'var(--bg-superficie)', position: 'relative' }}>
                {g.rutaMiniatura ? <img src={srcDeRuta(g.rutaMiniatura)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />}
                <span style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, padding: '1px 5px', borderRadius: 4 }}>{formatearDuracionMs(g.duracionMs)}</span>
                {g.incompleta && <span data-testid={`marca-incompleta-${g.id}`} style={{ position: 'absolute', left: 6, top: 6, background: 'rgba(180, 40, 40, 0.9)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>incompleta</span>}
                {g.errorMudo && <span style={{ position: 'absolute', left: 6, bottom: 6, background: 'rgba(180, 40, 40, 0.9)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4 }}>sin audio</span>}
              </div>
              <div style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--color-texto)', fontSize: 'var(--texto-meta)' }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.tituloGuion || 'Toma'}</div>
                <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>{formatearFechaCorta(g.creado)}</div>
              </div>
            </button>
            <button type="button" data-testid={`borrar-grabacion-${g.id}`} onClick={(e) => { e.stopPropagation(); onBorrar(g.id) }} style={{ marginTop: 4, background: 'transparent', border: 'none', color: 'var(--color-apagado)', fontSize: 12, cursor: 'pointer', padding: 0 }}>Borrar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
