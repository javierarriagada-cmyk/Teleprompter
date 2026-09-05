import React, { useEffect, useRef } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { tokenizarGuion } from '../lib/seguidor'

interface TeleprompterViewProps {
  script: string
  currentLineIndex: number
  currentWordIndex: number
  fontSize?: number
  marginPercent?: number
  mirror?: boolean
  motorAvance?: MotorDeAvance | null
  onEstadoAvanceChange?: (motivoFreno: 'silencio' | 'sin-calce' | 'correa' | null, avanzando: boolean) => void
}

export default function TeleprompterView({
  script,
  currentLineIndex,
  currentWordIndex,
  fontSize = 28,
  marginPercent = 10,
  mirror = false,
  motorAvance,
  onEstadoAvanceChange
}: TeleprompterViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const tokensRef = useRef(tokenizarGuion(script))

  useEffect(() => {
    tokensRef.current = tokenizarGuion(script)
  }, [script])

  // Desplazamiento por cambio discreto de línea (fallback)
  useEffect(() => {
    if (motorAvance) return // Si hay motor de avance, se encarga el rAF loop
    const el = containerRef.current
    if (!el) return
    const lines = Array.from(el.querySelectorAll('.line'))
    const target = lines[currentLineIndex] as HTMLElement
    if (target) {
      const top = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top, behavior: 'smooth' })
      } else {
        el.scrollTop = top
      }
    }
  }, [currentLineIndex, motorAvance])

  // Desplazamiento continuo con requestAnimationFrame usando MotorDeAvance
  useEffect(() => {
    if (!motorAvance) return

    let animId: number
    const animate = () => {
      const st = motorAvance.estadoEn(performance.now())
      if (onEstadoAvanceChange) {
        onEstadoAvanceChange(st.motivoFreno, st.avanzando)
      }

      const tokens = tokensRef.current
      if (tokens.length > 0 && containerRef.current) {
        const idx = Math.min(Math.max(0, Math.floor(st.posicion)), tokens.length - 1)
        const t = tokens[idx]
        if (t) {
          const lines = Array.from(containerRef.current.querySelectorAll('.line'))
          const target = lines[t.linea] as HTMLElement
          if (target) {
            const top = target.offsetTop - containerRef.current.clientHeight / 2 + target.clientHeight / 2
            containerRef.current.scrollTop = top
          }
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [motorAvance, onEstadoAvanceChange])

  return (
    <div
      style={{
        overflow: 'hidden',
        height: '100%',
        minHeight: 360,
        background: '#000',
        color: '#fff',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={containerRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          paddingLeft: `${marginPercent}%`,
          paddingRight: `${marginPercent}%`,
          paddingTop: '20vh',
          paddingBottom: '40vh',
          transform: mirror ? 'scaleX(-1)' : 'none',
          boxSizing: 'border-box'
        }}
      >
        {script.split(/\r?\n/).map((line: string, i: number) => {
          const isCurrent = i === currentLineIndex
          return (
            <div
              key={i}
              className="line"
              style={{
                fontSize: isCurrent ? fontSize : Math.max(16, fontSize * 0.7),
                opacity: isCurrent ? 1 : 0.4,
                margin: '16px 0',
                lineHeight: 1.4,
                transition: 'all 200ms'
              }}
            >
              {renderHighlightedLine(line, isCurrent ? currentWordIndex : -1)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderHighlightedLine(line: string, highlightIndex: number) {
  if (highlightIndex < 0) return <>{line}</>
  const words = line.split(/(\s+)/)
  let idx = 0
  return (
    <>
      {words.map((w, i) => {
        if (/\s+/.test(w)) return <span key={i}>{w}</span>
        const is = idx === highlightIndex
        idx++
        return (
          <span
            key={i}
            style={{
              background: is ? 'yellow' : 'transparent',
              color: is ? '#000' : 'inherit',
              padding: is ? '2px 4px' : 0,
              borderRadius: is ? 2 : 0
            }}
          >
            {w}
          </span>
        )
      })}
    </>
  )
}
