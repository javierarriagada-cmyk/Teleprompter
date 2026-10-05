import React from 'react'
import { Capacitor } from '@capacitor/core'
import { ResumenGrabacion, ResumenGuion } from '../datos/modelo'
import { t, useTextos, tituloVisible, tituloOInicio, fechaCortaDosDigitos } from '../textos'
import { IconoSinVideos, IconoEmpezar } from './IconosApp'
import { duracionVisible } from '../lib/tramos'

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

// EL NOMBRE DE UNA TOMA -28-09-2026-: el de su guion HOY, con la misma regla que la lista -titulo,
// o sus primeras palabras-. En el moto g86 la tira y el reproductor decian "Sin titulo" mientras
// la lista mostraba "Hay una idea antigua...": la toma guarda el titulo del momento en que se
// grabo. Sin el guion -se borro, o no se paso la lista- queda lo guardado, como antes.
export function nombreDeToma(g: ResumenGrabacion, guiones?: ResumenGuion[]): string {
  const guion = guiones?.find((x) => x.id === g.guionId)
  if (guion) return tituloOInicio(guion.titulo, guion.inicio)
  return g.tituloGuion ? tituloVisible(g.tituloGuion) : t('toma')
}

export function formatearDuracionMs(ms: number): string {
  const total = Math.max(0, Math.floor((ms || 0) / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Por idioma desde la tarea 75: 07/09 en espanol, Sep 7 en ingles -textos/index.ts-.
export function formatearFechaCorta(ts: number): string {
  if (!ts) return ''
  return fechaCortaDosDigitos(ts)
}

import { estiloComprimirPorAviso, useMantenerApretado } from './mantenerApretado'

interface Props {
  grabaciones: ResumenGrabacion[]
  onAbrir: (g: ResumenGrabacion) => void
  onBorrar: (id: string) => void
  // Para nombrar cada toma por su guion -nombreDeToma-.
  guiones?: ResumenGuion[]
  // -tarea 94- null: modo normal. Con ids: modo selección. El menú chico se fue.
  seleccion?: string[] | null
  onEntrarSeleccion?: (id: string) => void
  onAlternarSeleccion?: (id: string) => void
}

// BORRAR UNA TOMA -tarea 94, 05-10-2026-. Mantener apretada entra al modo
// selección y la marca. El menú chico -tacho y X- se fue.
// Antes: para llegar a Eliminar hay que MANTENER APRETADA la toma, y el menú
// pregunta "¿Seguro?" una segunda vez. Un video grabado no se recupera.
// Ahora el tacho de la barra saca las marcadas y Deshacer las devuelve 5 s.

function TarjetaToma({
  g, nombre, marcada, enSeleccion, onAbrir, onMantener, onAlternar
}: {
  g: any
  nombre: string
  marcada: boolean
  enSeleccion: boolean
  onAbrir: () => void
  onMantener: () => void
  onAlternar: () => void
}) {
  useTextos()
  const gesto = useMantenerApretado({ onMantener })
  return (
    <div
      data-testid={`tarjeta-grabacion-${g.id}`}
      data-incompleta={g.incompleta ? 'si' : 'no'}
      style={{ flex: '0 0 auto', width: 132, position: 'relative' }}
    >
      <button
        type="button"
        {...gesto.props}
        onClick={(e) => {
          e.stopPropagation()
          if (gesto.fueLongPressRef.current) return
          if (enSeleccion) onAlternar()
          else onAbrir()
        }}
        aria-pressed={enSeleccion ? marcada : undefined}
        // 28-09-2026: el borde gris -color-borde- paso a uno de un pelo, el de las cajas: .borde-suave.
        className="borde-suave"
        style={{ display: 'block', width: '100%', padding: 0, borderRadius: 'var(--redondeo)', overflow: 'hidden', background: 'var(--bg-suelo)', cursor: 'pointer', ...estiloComprimirPorAviso(gesto.avisado) }}
      >
        <div style={{ width: '100%', height: 88, background: 'var(--bg-superficie)', position: 'relative' }}>
          {g.rutaMiniatura ? <img src={srcDeRuta(g.rutaMiniatura)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />}
          <span className="play-miniatura" aria-hidden="true"><IconoEmpezar tamano={16} /></span>
          <span style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, padding: '1px 5px', borderRadius: 4 }}>{/* -tarea 88- La duración FINAL, sin lo pausado. Antes: formatearDuracionMs(g.duracionMs). */}{formatearDuracionMs(duracionVisible(g))}</span>
          {marcada && (
            <span data-testid={`marca-seleccion-${g.id}`} className="marca-seleccion" aria-hidden="true">✓</span>
          )}
          {g.incompleta && <span data-testid={`marca-incompleta-${g.id}`} style={{ position: 'absolute', left: 6, top: 6, background: 'rgba(180, 40, 40, 0.9)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{t('incompleta')}</span>}
          {g.errorMudo && <span style={{ position: 'absolute', left: 6, bottom: 6, background: 'rgba(180, 40, 40, 0.9)', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4 }}>{t('sinAudio')}</span>}
        </div>
        <div style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--color-texto)', fontSize: 'var(--texto-meta)' }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</div>
          <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>{formatearFechaCorta(g.creado)}</div>
        </div>
      </button>
    </div>
  )
}

export default function TiraGrabaciones({ grabaciones, onAbrir, onBorrar: _onBorrar, guiones, seleccion = null, onEntrarSeleccion, onAlternarSeleccion }: Props) {
  useTextos()
  const enSeleccion = seleccion !== null
  return (
    <div data-testid="tira-grabaciones" style={{ marginTop: 'var(--aire-4)', marginBottom: 'var(--aire-3)' }}>
      {/* "Videos" y no "Tomas": hermano de "Guiones" en la portada, mismo
          escalon y mismo peso. */}
      <div className="texto-titulo titulo-seccion" style={{ color: 'var(--color-texto)', marginBottom: 'var(--aire-3)', fontWeight: 600 }}>{t('videos')}</div>
      {/* SIN VIDEOS, UNA LINEA -27-09-2026-. El titulo solo, sin nada debajo, se leia como algo
          roto o a medio cargar. Una auditoria proponia dibujo, titulo y dos lineas; Javier eligio
          una linea que diga donde van a quedar. */}
      {/* -28-09-2026, tarea 76: CAMBIA. Javier vuelve a la propuesta de la auditoría, hecha con
          el estilo de Sigo: el dibujo de una cámara dentro de un visor de esquinas rojas
          -IconoSinVideos-, un título y una línea que dice qué hacer y dónde van a quedar. El
          motivo de la línea del 27-09 sigue en pie -el título solo se leía roto-; lo que cambia
          es cuánto se dice. La clave videosVacio queda en los textos; el testid también. Con
          videos, la tira queda exactamente como estaba. Medidas y aire en .videos-vacio,
          styles.css. */}
      {(!grabaciones || grabaciones.length === 0) ? (
        <div data-testid="videos-vacio" className="videos-vacio">
          <IconoSinVideos />
          <div className="videos-vacio-titulo">{t('videosVacioTitulo')}</div>
          <div className="videos-vacio-linea">{t('videosVacioLinea')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--aire-3)', overflowX: 'auto', paddingBottom: 'var(--aire-2)', WebkitOverflowScrolling: 'touch' }}>
          {grabaciones.map((g) => (
            <TarjetaToma
              key={g.id}
              g={g}
              nombre={nombreDeToma(g, guiones)}
              marcada={!!seleccion?.includes(g.id)}
              enSeleccion={enSeleccion}
              onAbrir={() => onAbrir(g)}
              onMantener={() => onEntrarSeleccion?.(g.id)}
              onAlternar={() => onAlternarSeleccion?.(g.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
