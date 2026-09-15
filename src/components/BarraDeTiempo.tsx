import React, { useEffect, useState } from 'react'
import { MotorDeAvance } from '../lib/avance'

export interface BarraDeTiempoProps {
  motorAvance: MotorDeAvance | null
  totalTokens: number
  tInicioLecturaMs: number | null
}

function formatearTiempo(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  const mm = mins.toString().padStart(2, '0')
  const ss = secs.toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export default function BarraDeTiempo({
  motorAvance,
  totalTokens,
  tInicioLecturaMs
}: BarraDeTiempoProps) {
  const [ahora, setAhora] = useState<number>(() => performance.now())

  useEffect(() => {
    if (!tInicioLecturaMs || totalTokens === 0 || !motorAvance) return

    const interval = setInterval(() => {
      setAhora(performance.now())
    }, 250)

    return () => clearInterval(interval)
  }, [tInicioLecturaMs, totalTokens, motorAvance])

  if (!tInicioLecturaMs || totalTokens === 0 || !motorAvance) {
    return null
  }

  const estado = motorAvance.estadoEn(ahora)

  const transcurridoSeg = (ahora - tInicioLecturaMs) / 1000
  const palabrasQueFaltan = Math.max(0, totalTokens - estado.posicion)
  const ppm = estado.ppmEstimadas > 0 ? estado.ppmEstimadas : 150
  const segundosQueFaltan = palabrasQueFaltan / (ppm / 60)
  const totalEstimadoSeg = transcurridoSeg + segundosQueFaltan

  const progresoPct = Math.min(100, Math.max(0, (estado.posicion / totalTokens) * 100))

  return (
    <div
      style={{
        marginTop: 'var(--aire-2)',
        color: 'var(--color-apagado)',
        fontSize: 'var(--texto-meta)',
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
        userSelect: 'none'
      }}
      aria-label="tiempo transcurrido y total estimado"
    >
      <div style={{ marginBottom: 'var(--aire-1)' }}>
        {formatearTiempo(transcurridoSeg)} / {formatearTiempo(totalEstimadoSeg)}
      </div>
      <div
        data-testid="barra-progreso-pista"
        style={{
          width: '100%',
          height: 2,
          backgroundColor: 'var(--color-borde)',
          overflow: 'hidden'
        }}
      >
        <div
          data-testid="barra-progreso"
          style={{
            width: `${progresoPct}%`,
            height: '100%',
            backgroundColor: 'var(--color-grabando)',
            transition: 'width 0.25s linear'
          }}
        />
      </div>
    </div>
  )
}
