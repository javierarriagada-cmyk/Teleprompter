import React from 'react'
import { ResumenGuion, PAREJAS_COLOR } from '../datos/modelo'
import { movimientoApagado } from './movimiento'

interface TarjetaLecturaProps {
  guionResumen?: ResumenGuion
  textoCompleto?: string
  esInicial?: boolean
  onLeer: (rect?: DOMRect) => void
  onCrearNuevo: () => void
  onDiagTouchStart?: () => void
  onDiagTouchEnd?: () => void
  onDiagClick?: () => void
  tipoFuente?: 'sans' | 'serif'
  colorFondo?: string
  colorLetra?: string
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
  onCrearNuevo,
  onDiagTouchStart,
  onDiagTouchEnd,
  onDiagClick,
  tipoFuente = 'sans',
  colorFondo = PAREJAS_COLOR[0].fondo,
  colorLetra = PAREJAS_COLOR[0].letra
}: TarjetaLecturaProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const parejaColor = { fondo: colorFondo, letra: colorLetra }
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

  const fuentefamily = tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'

  return (
    <div
      ref={cardRef}
      data-testid="tarjeta-lectura-portada"
      className="tarjeta-lectura-borde-iluminado"
      style={{
        backgroundColor: parejaColor.fondo,
        borderRadius: 24,
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
        {/* Velo Superior e Inferior */}
        <div className="tarjeta-lectura-velo-superior" />
        <div className="tarjeta-lectura-velo-inferior" />

        {/* Bloque de Texto de Lectura */}
        {hayGuion ? (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0 var(--aire-2)',
              fontSize: 18,
              lineHeight: 1.4,
              fontFamily: fuentefamily,
              color: parejaColor.letra,
              ...animacionTextoStyle
            }}
          >
            {lineasTexto.slice(0, 8).map((linea, idx) => (
              <div key={idx} style={{ marginBottom: 4, opacity: idx >= 1 && idx <= 2 ? 1 : 0.45 }}>
                {linea}
              </div>
            ))}
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
                animation: movimientoApagado() ? 'none' : 'parpadeoCursor 1s infinite'
              }}
            />
          </div>
        )}
      </div>

      {/* Zona Inferior: Título de 44px y Botón de Acción */}
      <div style={{ zIndex: 5, display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
        <h2
          data-testid="titulo-tarjeta-lectura"
          onTouchStart={onDiagTouchStart}
          onTouchEnd={onDiagTouchEnd}
          onMouseDown={onDiagTouchStart}
          onMouseUp={onDiagTouchEnd}
          onClick={onDiagClick}
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.1,
            color: hayGuion ? parejaColor.letra : 'var(--color-apagado)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          title={tituloText}
        >
          {tituloText}
        </h2>

        {hayGuion ? (
          <button
            onClick={() => {
              const rect = cardRef.current?.getBoundingClientRect()
              onLeer(rect)
            }}
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
            Escribe tu primer guion
          </button>
        )}
      </div>
    </div>
  )
}
