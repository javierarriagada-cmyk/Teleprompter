import React, { useEffect, useRef } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { AnclajeZona, calcularBanda, opacidadDeLinea } from './banda'

interface TeleprompterViewProps {
  script: Guion | string
  currentBlockIndex?: number
  currentLineIndex: number
  currentWordIndex: number
  fontSize?: number
  marginPercent?: number
  mirror?: boolean
  lineasZona?: number
  anclajeZona?: AnclajeZona
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
  lineasZona = 3,
  anclajeZona = 'arriba',
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

  const alturaLineaPx = fontSize * 1.4 + 16 // fontSize * lineHeight (1.4) + vertical margin (16px)
  const { topBanda, altoBanda } = calcularBanda(480, alturaLineaPx, lineasZona, anclajeZona, 20, 20)

  useEffect(() => {
    if (motorAvance) return
    const el = containerRef.current
    if (!el) return
    const target = el.querySelector(`[data-block="${currentBlockIndex}"][data-line="${currentLineIndex}"]`) as HTMLElement
    if (target) {
      const top = target.offsetTop - topBanda
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top, behavior: 'smooth' })
      } else {
        el.scrollTop = top
      }
    }
  }, [currentBlockIndex, currentLineIndex, motorAvance, topBanda])

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
            // El desplazamiento se INTERPOLA dentro de la linea. Antes se centraba el
            // elemento de la linea, o sea que el scroll estaba cuantizado: mientras la
            // posicion recorria las palabras de una misma linea no se movia ni un pixel,
            // y al cambiar de linea saltaba de golpe al elemento siguiente.
            //
            // Importa sobre todo cuando una linea logica es un parrafo entero que en
            // pantalla ocupa varios renglones: sin interpolar, se lee el parrafo completo
            // sin que el texto se mueva y despues pega el tiron.
            let primero = idx
            while (primero > 0 && tokens[primero - 1].linea === t.linea && tokens[primero - 1].bloque === t.bloque) {
              primero--
            }
            let ultimo = idx
            while (ultimo < tokens.length - 1 && tokens[ultimo + 1].linea === t.linea && tokens[ultimo + 1].bloque === t.bloque) {
              ultimo++
            }

            const cantidad = ultimo - primero + 1
            const avanceEnLinea = cantidad > 0
              ? Math.min(1, Math.max(0, (st.posicion - primero) / cantidad))
              : 0

            const top = target.offsetTop + avanceEnLinea * target.clientHeight - topBanda
            containerRef.current.scrollTop = top
          }
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [motorAvance, onEstadoAvanceChange, topBanda])

  if (!guionObj.bloques || guionObj.bloques.length === 0) {
    return (
      <div style={{ background: '#000', color: '#888', padding: 20, textAlign: 'center' }}>
        <em>Guión sin bloques</em>
      </div>
    )
  }

  let lineCountGlobal = 0

  return (
    <div
      style={{
        overflow: 'hidden',
        height: '100%',
        minHeight: 360,
        background: '#000',
        color: '#fff',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Overlay Visual de la Banda de Lectura */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: topBanda,
          height: altoBanda,
          pointerEvents: 'none',
          zIndex: 2,
          background: 'rgba(255, 255, 255, 0.06)',
          maskImage: 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)'
        }}
      />

      <div
        ref={containerRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          paddingLeft: `${marginPercent}%`,
          paddingRight: `${marginPercent}%`,
          paddingTop: topBanda,
          paddingBottom: `calc(100% - ${topBanda + altoBanda}px)`,
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
                let targetCurrentLineGlobal = 0
                for (let b = 0; b < guionObj.bloques.length; b++) {
                  if (b < currentBlockIndex) {
                    targetCurrentLineGlobal += (guionObj.bloques[b].texto || '').split(/\r?\n/).length
                  } else if (b === currentBlockIndex) {
                    targetCurrentLineGlobal += currentLineIndex
                    break
                  }
                }

                const distLineas = Math.abs(lineCountGlobal - targetCurrentLineGlobal)
                const opacidad = opacidadDeLinea(distLineas)
                lineCountGlobal++

                return (
                  <div
                    key={lIdx}
                    className="line"
                    data-block={bIdx}
                    data-line={lIdx}
                    style={{
                      fontSize: isCurrent ? fontSize : Math.max(16, fontSize * 0.7),
                      opacity: opacidad,
                      margin: '16px 0',
                      lineHeight: 1.4,
                      transition: 'all 200ms'
                    }}
                  >
                    {renderFormattedLine(linea)}
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

function renderFormattedLine(linea: string) {
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

              globalTokenWordIdx++

              return (
                <span key={wIdx}>
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
