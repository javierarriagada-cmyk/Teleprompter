import React, { useEffect, useRef } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'

interface TeleprompterViewProps {
  script: Guion | string
  currentBlockIndex?: number
  currentLineIndex: number
  currentWordIndex: number
  fontSize?: number
  marginPercent?: number
  mirror?: boolean
  motorAvance?: MotorDeAvance | null
  onEstadoAvanceChange?: (motivoFreno: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null, avanzando: boolean) => void
}

export default function TeleprompterView({
  script,
  currentBlockIndex = 0,
  currentLineIndex,
  currentWordIndex,
  fontSize = 28,
  marginPercent = 10,
  mirror = false,
  motorAvance,
  onEstadoAvanceChange
}: TeleprompterViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const guionObj: Guion = typeof script === 'string' ? {
    id: 'temp',
    titulo: 'Temp',
    idioma: 'es',
    creado: 0,
    modificado: 0,
    bloques: [{ id: 'b1', nombre: '', texto: script }]
  } : script

  const tokensRef = useRef<Token[]>(tokenizarGuion(guionObj))

  useEffect(() => {
    tokensRef.current = tokenizarGuion(guionObj)
  }, [script])

  useEffect(() => {
    if (motorAvance) return
    const el = containerRef.current
    if (!el) return
    const target = el.querySelector(`[data-block="${currentBlockIndex}"][data-line="${currentLineIndex}"]`) as HTMLElement
    if (target) {
      const top = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top, behavior: 'smooth' })
      } else {
        el.scrollTop = top
      }
    }
  }, [currentBlockIndex, currentLineIndex, motorAvance])

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
          const target = containerRef.current.querySelector(`[data-block="${t.bloque}"][data-line="${t.linea}"]`) as HTMLElement
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

  if (!guionObj.bloques || guionObj.bloques.length === 0) {
    return (
      <div style={{ background: '#000', color: '#888', padding: 20, textAlign: 'center' }}>
        <em>Guión sin bloques</em>
      </div>
    )
  }

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
        {guionObj.bloques.map((bloque, bIdx) => {
          const lineas = (bloque.texto || '').split(/\r?\n/)
          return (
            <div key={bloque.id || bIdx} className="block-container" style={{ marginBottom: 24 }}>
              {bloque.nombre && (
                <div style={{ fontSize: Math.max(14, fontSize * 0.5), color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  [{bloque.nombre}]
                </div>
              )}
              {lineas.map((linea: string, lIdx: number) => {
                const isCurrent = bIdx === currentBlockIndex && lIdx === currentLineIndex
                return (
                  <div
                    key={lIdx}
                    className="line"
                    data-block={bIdx}
                    data-line={lIdx}
                    style={{
                      fontSize: isCurrent ? fontSize : Math.max(16, fontSize * 0.7),
                      opacity: isCurrent ? 1 : 0.4,
                      margin: '16px 0',
                      lineHeight: 1.4,
                      transition: 'all 200ms'
                    }}
                  >
                    {renderFormattedLine(linea, isCurrent ? currentWordIndex : -1)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderFormattedLine(linea: string, highlightWordIdx: number) {
  const parts: { texto: string; esAcotacion: boolean }[] = []
  let pos = 0
  let enAcotacion = false
  let currentBuffer = ''

  while (pos < linea.length) {
    const char = linea[pos]
    if (char === '[') {
      if (currentBuffer) {
        parts.push({ texto: currentBuffer, esAcotacion: enAcotacion })
        currentBuffer = ''
      }
      enAcotacion = true
      currentBuffer += char
    } else if (char === ']') {
      currentBuffer += char
      parts.push({ texto: currentBuffer, esAcotacion: enAcotacion })
      currentBuffer = ''
      enAcotacion = false
    } else {
      currentBuffer += char
    }
    pos++
  }

  if (currentBuffer) {
    parts.push({ texto: currentBuffer, esAcotacion: enAcotacion })
  }

  let globalTokenWordIdx = 0

  return (
    <>
      {parts.map((p, pIdx) => {
        if (p.esAcotacion) {
          return (
            <span key={pIdx} style={{ opacity: 0.5, fontStyle: 'italic', color: '#aaa', margin: '0 2px' }}>
              {p.texto}
            </span>
          )
        }

        const words = p.texto.split(/(\s+)/)
        return (
          <span key={pIdx}>
            {words.map((w, wIdx) => {
              if (/\s+/.test(w)) return <span key={wIdx}>{w}</span>
              if (!w) return null

              const isHighlighted = globalTokenWordIdx === highlightWordIdx
              globalTokenWordIdx++

              return (
                <span
                  key={wIdx}
                  style={{
                    background: isHighlighted ? 'yellow' : 'transparent',
                    color: isHighlighted ? '#000' : 'inherit',
                    padding: isHighlighted ? '2px 4px' : 0,
                    borderRadius: isHighlighted ? 2 : 0
                  }}
                >
                  {w}
                </span>
              )
            })}
          </span>
        )
      })}
    </>
  )
}
