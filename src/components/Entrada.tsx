import React, { useEffect, useState } from 'react'
import { movimientoApagado } from './movimiento'

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
  { id: 'R1', x1: (152 - 216) * FACTOR_ESPEJO, x2: (304 - 216) * FACTOR_ESPEJO, y: (136 - 216) * FACTOR_ESPEJO, color: '#8A837C', grosor: 20 * FACTOR_ESPEJO },
  { id: 'R2', x1: (112 - 216) * FACTOR_ESPEJO, x2: (268 - 216) * FACTOR_ESPEJO, y: (176 - 216) * FACTOR_ESPEJO, color: '#E7E1DE', grosor: 20 * FACTOR_ESPEJO },
  { id: 'R3', x1: (112 - 216) * FACTOR_ESPEJO, x2: (304 - 216) * FACTOR_ESPEJO, y: (216 - 216) * FACTOR_ESPEJO, color: '#E7E1DE', grosor: 20 * FACTOR_ESPEJO },
  { id: 'R4', x1: (112 - 216) * FACTOR_ESPEJO, x2: (252 - 216) * FACTOR_ESPEJO, y: (256 - 216) * FACTOR_ESPEJO, color: '#8A837C', grosor: 20 * FACTOR_ESPEJO },
  { id: 'R5', x1: (112 - 216) * FACTOR_ESPEJO, x2: (288 - 216) * FACTOR_ESPEJO, y: (296 - 216) * FACTOR_ESPEJO, color: '#8A837C', grosor: 20 * FACTOR_ESPEJO }
]

export const PUNTO_ESPEJO = {
  cx: (285 - 216) * FACTOR_ESPEJO, // 46.0
  cy: (168 - 216) * FACTOR_ESPEJO, // -32.0
  r: 13 * FACTOR_ESPEJO,           // 8.6667
  color: '#E11D2E'
}

interface EntradaProps {
  onFinish?: () => void
}

export function Entrada({ onFinish }: EntradaProps) {
  const [fase, setFase] = useState<'sostenido' | 'escritura' | 'salida' | 'fin'>('sostenido')
  const [progresoLetras, setProgresoLetras] = useState<{ [key: string]: number }>({
    S: 100,
    I: 100,
    G: 100,
    O: 100
  })

  useEffect(() => {
    if (movimientoApagado()) {
      if (onFinish) onFinish()
      return
    }

    // Timer de seguridad absoluto a los 2000 ms
    const timerTope = setTimeout(() => {
      setFase('fin')
      if (onFinish) onFinish()
    }, 2000)

    // Timers para entornos con fake timers (Vitest) donde requestAnimationFrame no avanza solo con advanceTimersByTimeAsync
    const timerSostenido = setTimeout(() => {
      setFase('escritura')
    }, 250)

    const timerSalida = setTimeout(() => {
      setFase('salida')
      setProgresoLetras({ S: 0, I: 0, G: 0, O: 0 })
    }, 700)

    const timerFin = setTimeout(() => {
      setFase('fin')
      if (onFinish) onFinish()
    }, 1000)

    const t0 = performance.now()
    let animId: number

    const tick = () => {
      const transcurridos = performance.now() - t0

      if (transcurridos >= 250 && transcurridos < 700) {
        const tEscritura = transcurridos - 250
        const calcProgreso = (inicioMs: number) => {
          if (tEscritura <= inicioMs) return 100
          if (tEscritura >= inicioMs + 180) return 0
          const ratio = (tEscritura - inicioMs) / 180
          return 100 * (1 - ratio)
        }

        setProgresoLetras({
          S: calcProgreso(0),
          I: calcProgreso(90),
          G: calcProgreso(180),
          O: calcProgreso(270)
        })
      }

      if (transcurridos < 1000) {
        animId = requestAnimationFrame(tick)
      }
    }

    animId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animId)
      clearTimeout(timerSostenido)
      clearTimeout(timerSalida)
      clearTimeout(timerFin)
      clearTimeout(timerTope)
    }
  }, [onFinish])

  if (movimientoApagado() || fase === 'fin') {
    return null
  }

  // Trazos de SIGO:
  // Mayúsculas, color #E7E1DE, grosor trazo ~12px (0.9x de renglones)
  const strokeNombre = 12
  const colorNombre = '#E7E1DE'

  // Letras definidas como paths con pathLength="100" para control exacto de stroke-dashoffset
  const letras = [
    {
      id: 'S',
      d: 'M -40 88 C -58 88, -58 99, -50 99 C -42 99, -42 112, -60 112'
    },
    {
      id: 'I',
      d: 'M -18 88 L -18 112'
    },
    {
      id: 'G',
      d: 'M 24 92 C 22 88, 2 88, 2 100 C 2 112, 24 112, 24 100 L 14 100'
    },
    {
      id: 'O',
      d: 'M 50 88 C 36 88, 36 112, 50 112 C 64 112, 64 88, 50 88 Z'
    }
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
        opacity: fase === 'salida' ? 0 : 1,
        transition: fase === 'salida' ? 'opacity 300ms ease-out' : 'none'
      }}
    >
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

        {/* El nombre SIGO en trazo animado */}
        <g data-testid="nombre-sigo">
          {letras.map((letra) => {
            const offset = progresoLetras[letra.id] ?? 100
            return (
              <path
                key={letra.id}
                data-testid={`letra-${letra.id}`}
                d={letra.d}
                fill="none"
                stroke={colorNombre}
                strokeWidth={strokeNombre}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={offset}
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: offset
                }}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}
