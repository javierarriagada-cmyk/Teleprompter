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

export interface RenglonEspejo {
  id: string
  x1: number
  x2: number
  y: number
  color: string
  grosor: number
}

export const RENGLONES_ESPEJO: RenglonEspejo[] = [
  { id: 'R1', x1: (152 - 216) * FACTOR_ESPEJO, x2: (304 - 216) * FACTOR_ESPEJO, y: (136 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO_APAGADO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R2', x1: (112 - 216) * FACTOR_ESPEJO, x2: (268 - 216) * FACTOR_ESPEJO, y: (176 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R3', x1: (112 - 216) * FACTOR_ESPEJO, x2: (304 - 216) * FACTOR_ESPEJO, y: (216 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R4', x1: (112 - 216) * FACTOR_ESPEJO, x2: (252 - 216) * FACTOR_ESPEJO, y: (256 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO_APAGADO, grosor: 20 * FACTOR_ESPEJO },
  { id: 'R5', x1: (112 - 216) * FACTOR_ESPEJO, x2: (288 - 216) * FACTOR_ESPEJO, y: (296 - 216) * FACTOR_ESPEJO, color: COLOR_MARCA_TRAZO_APAGADO, grosor: 20 * FACTOR_ESPEJO }
]

export const PUNTO_ESPEJO = {
  cx: (285 - 216) * FACTOR_ESPEJO, // 46.0
  cy: (168 - 216) * FACTOR_ESPEJO, // -32.0
  r: 13 * FACTOR_ESPEJO,           // 8.6667
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

    // Inicio de salida fade-out a los 700 ms
    const timerSalida = setTimeout(() => {
      setFaseSalida(true)
    }, 700)

    // Desmontaje normal a los 1000 ms
    const timerFin = setTimeout(() => {
      setDesmontado(true)
      if (onFinish) onFinish()
    }, 1000)

    // Timer de seguridad por si acaso a los 2000 ms
    const timerTope = setTimeout(() => {
      setDesmontado(true)
      if (onFinish) onFinish()
    }, 2000)

    return () => {
      clearTimeout(timerSalida)
      if (timerFin) clearTimeout(timerFin)
      clearTimeout(timerTope)
    }
  }, [onFinish])

  if (movimientoApagado() || desmontado) {
    return null
  }

  // Trazos de SIGO:
  // Mayúsculas, color COLOR_MARCA_TRAZO, grosor trazo ~12px (0.9x de renglones)
  const strokeNombre = 12

  // Letras definidas como paths con pathLength="100" para control exacto de stroke-dashoffset
  const letras = [
    { id: 'S', retardo: 250, d: 'M -40 88 C -58 88, -58 99, -50 99 C -42 99, -42 112, -60 112' },
    { id: 'I', retardo: 340, d: 'M -18 88 L -18 112' },
    { id: 'G', retardo: 430, d: 'M 24 92 C 22 88, 2 88, 2 100 C 2 112, 24 112, 24 100 L 14 100' },
    { id: 'O', retardo: 520, d: 'M 50 88 C 36 88, 36 112, 50 112 C 64 112, 64 88, 50 88 Z' }
  ]

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
        transition: faseSalida ? 'opacity 300ms ease-out' : 'none'
      }}
    >
      <style>{`
        @keyframes escribirLetra {
          from { stroke-dashoffset: 100; }
          to   { stroke-dashoffset: 0; }
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

        {/* El punto rojo ya encendido */}
        <circle
          data-testid="punto-espejo"
          cx={PUNTO_ESPEJO.cx}
          cy={PUNTO_ESPEJO.cy}
          r={PUNTO_ESPEJO.r}
          fill={PUNTO_ESPEJO.color}
        />

        {/* El nombre SIGO en trazo animado por CSS */}
        <g data-testid="nombre-sigo">
          {letras.map((letra) => (
            <path
              key={letra.id}
              data-testid={`letra-${letra.id}`}
              d={letra.d}
              fill="none"
              stroke={COLOR_MARCA_TRAZO}
              strokeWidth={strokeNombre}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: `escribirLetra 180ms ${CURVA_ENTRA} ${letra.retardo}ms forwards`
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
