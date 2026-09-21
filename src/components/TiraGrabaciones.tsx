import React from 'react'
import { Capacitor } from '@capacitor/core'
import { ResumenGrabacion } from '../datos/modelo'

// UNA RUTA DE DISCO TAMBIEN HAY QUE CONVERTIRLA. El WebView no puede abrir
// /storage/... directo: necesita la direccion que arma convertFileSrc.
//
// Antes esta funcion devolvia tal cual cualquier ruta que empezara con "/", y
// eso partia las grabaciones en dos clases sin que se notara: las que cierran
// bien guardan file:///storage/... -lo que devuelve el plugin- y se veian; las
// RECUPERADAS guardan /storage/... -lo que devuelve el barrido de huerfanos- y
// salian con el icono de archivo roto, aunque el mp4 estuviera intacto.
// Comprobado el 21 de septiembre de 2026: el archivo de la toma cortada se
// abre sin problemas fuera de la aplicacion.
//
// Solo se devuelven sin tocar las direcciones que YA son direcciones: http,
// blob y data.
export function srcDeRuta(ruta: string): string {
  if (!ruta) return ''
  if (ruta.startsWith('http') || ruta.startsWith('blob:') || ruta.startsWith('data:')) return ruta
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

import { useMantenerApretado } from './mantenerApretado'
import { hapticaToqueSuave } from '../haptica'

interface Props {
  grabaciones: ResumenGrabacion[]
  onAbrir: (g: ResumenGrabacion) => void
  onBorrar: (id: string) => void
}

// BORRAR PREGUNTA UNA VEZ, Y ES LA UNICA ACCION DE LA APLICACION QUE NO SE
// PUEDE DESHACER. Un video grabado no se recupera.
//
// Antes se iba con un solo toque sobre una palabra chica y gris, del tamano de
// una nota al pie. Esa palabra ya no esta: para llegar a Eliminar hay que
// MANTENER APRETADA la toma, que es el gesto de esta aplicacion y el mismo que
// la fila de guion -MS_MANTENER_APRETADO, 500 ms, un solo lugar-.
//
// Lo que NO cambio es que despues de abrir el menu sigue preguntando: el boton
// pasa a decir "¿Seguro?" y hay que tocarlo otra vez. Si la persona no vuelve,
// a los cuatro segundos se arrepiente solo. Un toque sin querer no borra nada.
//
// Y una toma no se archiva, asi que su menu lleva Eliminar y Cerrar, no los
// tres de la fila. Tampoco hay deslizar: la tira se desplaza en horizontal y
// los dos gestos chocarian.
const MS_PARA_ARREPENTIRSE = 4000

function TarjetaToma({
  g, menuAbierto, confirmando, onAbrir, onPedirMenu, onCerrarMenu, onPedirBorrar, onConfirmarBorrar
}: {
  g: any
  menuAbierto: boolean
  confirmando: boolean
  onAbrir: () => void
  onPedirMenu: () => void
  onCerrarMenu: () => void
  onPedirBorrar: () => void
  onConfirmarBorrar: () => void
}) {
  const gesto = useMantenerApretado({
    onMantener: () => {
      hapticaToqueSuave()
      onPedirMenu()
    }
  })
  return (
    <div
      data-testid={`tarjeta-grabacion-${g.id}`}
      data-incompleta={g.incompleta ? 'si' : 'no'}
      style={{ flex: '0 0 auto', width: 132, position: 'relative', zIndex: menuAbierto ? 6 : 1 }}
    >
      <button
        type="button"
        {...gesto.props}
        onClick={(e) => {
          e.stopPropagation()
          if (gesto.fueLongPressRef.current) return
          onAbrir()
        }}
        style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--color-borde)', borderRadius: 'var(--redondeo)', overflow: 'hidden', background: 'var(--bg-suelo)', cursor: 'pointer' }}
      >
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
      {menuAbierto && (
        <div data-testid={`menu-toma-${g.id}`} onClick={(e) => e.stopPropagation()} style={{ marginTop: 4, display: 'flex', gap: 8, position: 'relative', zIndex: 7 }}>
          <button
            type="button"
            data-testid={`borrar-grabacion-${g.id}`}
            data-confirmando={confirmando ? 'si' : 'no'}
            onClick={(e) => {
              e.stopPropagation()
              if (confirmando) onConfirmarBorrar()
              else onPedirBorrar()
            }}
            style={{ background: 'transparent', border: 'none', color: confirmando ? '#e11d2e' : 'var(--color-texto)', fontWeight: confirmando ? 700 : 600, fontSize: 'var(--texto-meta)', cursor: 'pointer', padding: '4px 0' }}
          >
            {confirmando ? '¿Seguro?' : 'Eliminar'}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onCerrarMenu() }} style={{ background: 'transparent', border: 'none', color: 'var(--color-apagado)', fontSize: 'var(--texto-meta)', cursor: 'pointer', padding: '4px 0' }}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}

export default function TiraGrabaciones({ grabaciones, onAbrir, onBorrar }: Props) {
  const [menuId, setMenuId] = React.useState<string | null>(null)
  const [confirmando, setConfirmando] = React.useState<string | null>(null)
  const temporizador = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    return () => { if (temporizador.current) clearTimeout(temporizador.current) }
  }, [])
  function pedirConfirmacion(id: string) {
    setConfirmando(id)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setConfirmando(null), MS_PARA_ARREPENTIRSE)
  }
  return (
    <div data-testid="tira-grabaciones" style={{ marginTop: 'var(--aire-4)', marginBottom: 'var(--aire-3)' }}>
      <div className="texto-meta" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-2)', fontWeight: 600 }}>Tomas</div>
      {(!grabaciones || grabaciones.length === 0) ? null : (
        <div style={{ display: 'flex', gap: 'var(--aire-3)', overflowX: 'auto', paddingBottom: 'var(--aire-2)', WebkitOverflowScrolling: 'touch' }}>
          {grabaciones.map((g) => (
            <TarjetaToma
              key={g.id}
              g={g}
              menuAbierto={menuId === g.id}
              confirmando={confirmando === g.id}
              onAbrir={() => onAbrir(g)}
              onPedirMenu={() => { setMenuId(g.id); setConfirmando(null) }}
              onCerrarMenu={() => { setMenuId(null); setConfirmando(null) }}
              onPedirBorrar={() => pedirConfirmacion(g.id)}
              onConfirmarBorrar={() => {
                if (temporizador.current) clearTimeout(temporizador.current)
                setConfirmando(null)
                setMenuId(null)
                onBorrar(g.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
