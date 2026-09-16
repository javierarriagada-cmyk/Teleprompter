import React from 'react'
import { ResumenGuion } from '../datos/modelo'
import { PAREJAS_COLOR } from '../datos/modelo'
import { movimientoApagado } from './movimiento'

interface TarjetaLecturaProps {
  guionResumen?: ResumenGuion
  textoCompleto?: string
  esInicial?: boolean
  onLeer: () => void
  onCrearNuevo: () => void
}

function formatearDuracion(palabras: number): string {
  const totalSegundos = Math.round((palabras / 150) * 60)
  const mins = Math.floor(totalSegundos / 60)
  const segs = totalSegundos % 60
  const mStr = String(mins).padStart(2, '0')
  const sStr = String(segs).padStart(2, '0')
  return `${mStr}:${sStr}`
}

export default function TarjetaLectura({
  guionResumen,
  textoCompleto,
  esInicial = false,
  onLeer,
  onCrearNuevo
}: TarjetaLecturaProps) {
  const parejaColor = PAREJAS_COLOR[0] || { fondo: '#000000', letra: '#FFFFFF' }
  const hayGuion = Boolean(guionResumen)

  const palabras = guionResumen?.palabras || 0
  const timecode = formatearDuracion(palabras)
  const tituloText = hayGuion
    ? guionResumen?.titulo && guionResumen.titulo.trim()
      ? guionResumen.titulo
      : 'Sin título'
    : 'Sin guiones todavía'

  const lineasTexto = textoCompleto
    ? textoCompleto.split('\n').filter((l) => l.trim().length > 0)
    : []

  const animacionTextoStyle: React.CSSProperties =
    esInicial && !movimientoApagado() && hayGuion
      ? {
          animation: 'avanceTextoTarjeta 6s linear forwards'
        }
      : hayGuion && !movimientoApagado()
      ? {
          transform: 'translateY(-30px)'
        }
      : {}

  return (
    <div
      data-testid="tarjeta-lectura-portada"
      style={{
        backgroundColor: '#000000',
        borderRadius: 24,
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: 'var(--aire-4)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 340,
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: parejaColor.letra
      }}
    >
      {/* Zona superior: Timecode */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: 24, zIndex: 5 }}>
        {hayGuion && (
          <span
            data-testid="time-code-tarjeta"
            style={{
              fontFamily: 'monospace',
              fontSize: 'var(--texto-meta)',
              opacity: 0.7,
              letterSpacing: '0.05em'
            }}
          >
            {timecode}
          </span>
        )}
      </div>

      {/* Zona Central: Simulación de Pantalla de Lectura */}
      <div
        style={{
          position: 'relative',
          height: 140,
          margin: 'var(--aire-2) 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Velo Superior */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 35,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%)',
            zIndex: 3,
            pointerEvents: 'none'
          }}
        />

        {/* Velo Inferior */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 35,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%)',
            zIndex: 3,
            pointerEvents: 'none'
          }}
        />

        {/* Dos renglones claros en el centro (Banda de Lectura) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            height: 56,
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />

        {/* Bloque de Texto de Lectura */}
        {hayGuion ? (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0 var(--aire-2)',
              fontSize: 18,
              lineHeight: 1.4,
              fontFamily: 'var(--fuente-sans)',
              color: parejaColor.letra,
              ...animacionTextoStyle
            }}
          >
            {lineasTexto.length > 0 ? (
              lineasTexto.slice(0, 8).map((linea, idx) => (
                <div key={idx} style={{ marginBottom: 4, opacity: idx >= 1 && idx <= 3 ? 1 : 0.45 }}>
                  {linea}
                </div>
              ))
            ) : (
              <>
                <div style={{ opacity: 0.45 }}>Reciente lectura en teleprompter...</div>
                <div style={{ opacity: 1 }}>Preparado para iniciar la toma en cámara.</div>
                <div style={{ opacity: 1 }}>El texto avanzará automáticamente según tu voz.</div>
                <div style={{ opacity: 0.45 }}>Mantén un ritmo claro y constante.</div>
              </>
            )}
          </div>
        ) : (
          /* Estado Vacío: Cursor Parpadeando sin iconos ni ilustraciones */
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0 var(--aire-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 24,
                backgroundColor: 'var(--color-acento)',
                animation: 'parpadeoCursor 1s infinite'
              }}
            />
          </div>
        )}
      </div>

      {/* Zona Inferior: Título de 44px y Botón de Acción */}
      <div style={{ zIndex: 5, display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.1,
            color: hayGuion ? parejaColor.letra : 'var(--color-apagado)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em'
          }}
          title={tituloText}
        >
          {tituloText}
        </h2>

        {hayGuion ? (
          <button
            onClick={onLeer}
            className="btn-deformable"
            style={{
              width: '100%',
              padding: 'var(--aire-3) var(--aire-4)',
              backgroundColor: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              border: 'none',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-2)'
            }}
          >
            ▶ Leer
          </button>
        ) : (
          <button
            onClick={onCrearNuevo}
            className="btn-deformable"
            style={{
              width: '100%',
              padding: 'var(--aire-3) var(--aire-4)',
              backgroundColor: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              border: 'none',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Escribe tu primer guión
          </button>
        )}
      </div>
    </div>
  )
}
