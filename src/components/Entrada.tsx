import React, { useEffect, useState } from 'react'
import { movimientoApagado, CURVA_ENTRA } from './movimiento'

// COPIA EXACTA DE values-night/colors.xml (marca_trazo_apagado, marca_trazo, marca_punto).
// Se mantienen en constantes declaradas aquí porque representan la marca nativa de Android,
// independientemente del tema activo del WebView.
export const COLOR_MARCA_TRAZO_APAGADO = '#8A837C'
export const COLOR_MARCA_TRAZO = '#E7E1DE'
export const COLOR_MARCA_PUNTO = '#E11D2E'

// Factor y cálculos exactos derivados de marca_arranque.xml
// Canvas nativo: 432x432. Tamaño visual splash en dp/px: 288
export const FACTOR_ESPEJO = 288 / 432 // 0.6666666666666666

// Constantes de tiempos (ms) de la animación de entrada
export const MS_SOSTENIDO_MARCA = 250
export const MS_ESCRIBIR_NOMBRE = 450
export const MS_NOMBRE_QUIETO = 400
export const MS_SALIDA_ENTRADA = 300

export interface RenglonEspejo {
  id: string
  x1: number
  x2: number
  y: number
  color: string
  grosor: number
}

export const RENGLONES_ESPEJO: RenglonEspejo[] = [
  { id: 'R1', x1: (116 - 216) * FACTOR_ESPEJO, x2: (250 - 216) * FACTOR_ESPEJO, y: (158 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO_APAGADO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R2', x1: (116 - 216) * FACTOR_ESPEJO, x2: (236 - 216) * FACTOR_ESPEJO, y: (194 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R3', x1: (116 - 216) * FACTOR_ESPEJO, x2: (272 - 216) * FACTOR_ESPEJO, y: (230 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R4', x1: (116 - 216) * FACTOR_ESPEJO, x2: (220 - 216) * FACTOR_ESPEJO, y: (266 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO_APAGADO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R5', x1: (116 - 216) * FACTOR_ESPEJO, x2: (256 - 216) * FACTOR_ESPEJO, y: (302 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO_APAGADO, grosor: 20 * FACTOR_ESPEJO }
]

export const PUNTO_ESPEJO = {
  cx: (300 - 216) * FACTOR_ESPEJO, // 56.0
  cy: (128 - 216) * FACTOR_ESPEJO, // -58.6667
  r: 20 * FACTOR_ESPEJO,           // 13.3333
  color: COLOR_MARCA_PUNTO
}

interface EntradaProps {
  onFinish?: () => void
}

export function Entrada({ onFinish }: EntradaProps) {
  const [desmontado, setDesmontado] = useState<boolean>(false)
  const [faseSalida, setFaseSalida] = useState<boolean>(false)

  useEffect(() => {
    if (movimientoApagado()) {
      setDesmontado(true)
      if (onFinish) onFinish()
      return
    }

    let cancelado = false
    let fontTimer: ReturnType<typeof setTimeout> | null = null
    let timerSalida: ReturnType<typeof setTimeout> | null = null
    let timerFin: ReturnType<typeof setTimeout> | null = null
    let timerTope: ReturnType<typeof setTimeout> | null = null

    const arrancarLineaTiempo = () => {
      if (cancelado) return

      const msInicioSalida = MS_SOSTENIDO_MARCA + MS_ESCRIBIR_NOMBRE + MS_NOMBRE_QUIETO // 1100 ms
      const msFinTotal = msInicioSalida + MS_SALIDA_ENTRADA // 1400 ms

      // 1100 ms: fase de salida fade-out
      timerSalida = setTimeout(() => {
        if (!cancelado) setFaseSalida(true)
      }, msInicioSalida)

      // 1400 ms: fin normal y desmontaje
      timerFin = setTimeout(() => {
        if (!cancelado) {
          setDesmontado(true)
          if (onFinish) onFinish()
        }
      }, msFinTotal)

      // 2400 ms: tope de seguridad
      timerTope = setTimeout(() => {
        if (!cancelado) {
          setDesmontado(true)
          if (onFinish) onFinish()
        }
      }, 2400)
    }

    let fontResolved = false
    const resolverYArrancar = () => {
      if (fontResolved) return
      fontResolved = true
      if (fontTimer) clearTimeout(fontTimer)
      arrancarLineaTiempo()
    }

    if (document.fonts && document.fonts.ready) {
      fontTimer = setTimeout(() => {
        resolverYArrancar()
      }, 1200)

      document.fonts.ready
        .then(() => resolverYArrancar())
        .catch(() => resolverYArrancar())
    } else {
      arrancarLineaTiempo()
    }

    return () => {
      cancelado = true
      if (fontTimer) clearTimeout(fontTimer)
      if (timerSalida) clearTimeout(timerSalida)
      if (timerFin) clearTimeout(timerFin)
      if (timerTope) clearTimeout(timerTope)
    }
  }, [onFinish])

  if (movimientoApagado() || desmontado) {
    return null
  }

  // Centro horizontal del bloque de renglones: (194 - 216) * FACTOR_ESPEJO = -14.6667 px
  const xCentroBloque = (194 - 216) * FACTOR_ESPEJO
  // 28 px por debajo del último renglón (R5 y = (302 - 216) * FACTOR_ESPEJO)
  const yNombre = (302 - 216) * FACTOR_ESPEJO + 28

  return (
    <div
      data-testid="capa-entrada-espejo"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#151312',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: faseSalida ? 0 : 1,
        transition: faseSalida ? `opacity ${MS_SALIDA_ENTRADA}ms ease-out` : 'none'
      }}
    >
      <style>{`
        @keyframes revelarNombreSigo {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
      `}</style>
      <svg
        width="288"
        height="288"
        viewBox="-144 -144 288 288"
        style={{ overflow: 'visible' }}
      >
        {/* Los 5 renglones de la marca */}
        {RENGLONES_ESPEJO.map((r) => (
          <line
            key={r.id}
            data-testid={`renglon-espejo-${r.id}`}
            x1={r.x1}
            y1={r.y}
            x2={r.x2}
            y2={r.y}
            stroke={r.color}
            strokeWidth={r.grosor}
            strokeLinecap="round"
          />
        ))}

        {/* El punto rojo encendido */}
        <circle
          data-testid="punto-espejo"
          cx={PUNTO_ESPEJO.cx}
          cy={PUNTO_ESPEJO.cy}
          r={PUNTO_ESPEJO.r}
          fill={PUNTO_ESPEJO.color}
        />

        {/* La palabra SIGO como texto */}
        <text
          data-testid="nombre-sigo"
          x={xCentroBloque}
          y={yNombre}
          fill={COLOR_MARCA_TRAZO}
          textAnchor="middle"
          dominantBaseline="hanging"
          style={{
            fontFamily: '"Source Serif 4"',
            fontWeight: 600,
            fontSize: '44px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            clipPath: 'inset(0 100% 0 0)',
            animation: `revelarNombreSigo ${MS_ESCRIBIR_NOMBRE}ms ${CURVA_ENTRA} ${MS_SOSTENIDO_MARCA}ms forwards`
          }}
        >
          SIGO
        </text>
      </svg>
    </div>
  )
}
