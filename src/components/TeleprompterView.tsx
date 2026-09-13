import React, { useEffect, useRef } from 'react'
import { MotorDeAvance, EstadoModo } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { esCaracterApertura, esCaracterCierre } from '../lib/acotaciones'
import { agruparEnRenglones, pixelDePosicion, Renglon, MedidaToken } from '../lib/renglones'

import { AnclajeZona, calcularBanda, calcularBgVelo, opacidadDeLinea } from './banda'

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
  diagnostico?: boolean
  columnaAngosta?: boolean
  colorFondo?: string
  colorLetra?: string
  tipoFuente?: 'sans' | 'serif'
  isRecording?: boolean
  onToggleControles?: () => void
  onNavegacionManual?: (token: number) => void
  onModoManualChange?: (manual: boolean) => void
  onEstadoAvanceChange?: (
    motivoFreno: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null,
    avanzando: boolean,
    estado?: EstadoModo
  ) => void
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  const num = parseInt(clean, 16)
  if (isNaN(num)) return { r: 0, g: 0, b: 0 }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

export default function TeleprompterView({
  script,
  currentBlockIndex = 0,
  currentLineIndex,
  fontSize = 28,
  marginPercent = 10,
  mirror = false,
  lineasZona = 3,
  anclajeZona = 'arriba',
  motorAvance,
  diagnostico = false,
  columnaAngosta = true,
  colorFondo = '#000000',
  colorLetra = '#FFFFFF',
  tipoFuente = 'sans',
  isRecording = false,
  onToggleControles,
  onNavegacionManual,
  onModoManualChange,
  onEstadoAvanceChange
}: TeleprompterViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const modoManualRef = useRef(false)
  const finManualRef = useRef<number | null>(null)
  const [textoEstadoLector, setTextoEstadoLector] = React.useState<string | null>(null)
  const tInicioBuscandoRef = useRef<number | null>(null)

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

  const filaPx = fontSize * 1.4
  const alturaLineaPx = filaPx + 16
  const [altoLineaViva, setAltoLineaViva] = React.useState<number>(filaPx)
  const { topBanda, altoBanda } = calcularBanda(480, filaPx, lineasZona, anclajeZona, 20, 20, altoLineaViva)

  const isWhiteBg = colorFondo.toUpperCase() === '#FFFFFF'
  const colorTextoEfectivo = isWhiteBg ? '#000000' : colorLetra
  const fontFamilyCss = tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'

  const renglonesRef = useRef<Renglon[]>([])
  const origenRef = useRef<number>(0)

  const recalcularGeometria = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const els = container.querySelectorAll('[data-token]')
    const medidas: MedidaToken[] = Array.from(els).map(el => ({
      token: Number((el as HTMLElement).dataset.token),
      top: (el as HTMLElement).offsetTop
    }))
    const r = agruparEnRenglones(medidas, filaPx)
    renglonesRef.current = r
    origenRef.current = medidas.length > 0 ? medidas[0].top : 0
  }, [filaPx])

  useEffect(() => {
    recalcularGeometria()
    const container = containerRef.current
    if (!container) return
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        recalcularGeometria()
      })
      observer.observe(container)
      return () => observer.disconnect()
    }
  }, [script, fontSize, columnaAngosta, marginPercent, recalcularGeometria])

  useEffect(() => {
    if (motorAvance || isRecording) return
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
  }, [currentBlockIndex, currentLineIndex, motorAvance, isRecording, topBanda])

  useEffect(() => {
    if (!containerRef.current) return
    const target = containerRef.current.querySelector(`[data-block="${currentBlockIndex}"][data-line="${currentLineIndex}"]`) as HTMLElement
    if (target) {
      const h = target.clientHeight || filaPx
      setAltoLineaViva(h)
    }
  }, [currentBlockIndex, currentLineIndex, filaPx])

  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingGestureRef = useRef<boolean>(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const MS_PARA_SOLTAR = 350

    function tokenEnLaBanda(): number {
      const tokens = tokensRef.current
      const cont = containerRef.current
      if (!cont || tokens.length === 0) return 0

      const origen = origenRef.current
      const buscado = cont.scrollTop + origen + filaPx

      const renglones = renglonesRef.current
      if (renglones.length > 0) {
        let mejorToken = 0
        let mejorDist = Infinity
        for (const r of renglones) {
          const d = Math.abs(r.top - buscado)
          if (d < mejorDist) {
            mejorDist = d
            mejorToken = r.desdeToken
          }
        }
        return mejorToken
      }

      return 0
    }

    function empezar(e: Event) {
      isDraggingGestureRef.current = false
      if ('clientX' in (e as PointerEvent)) {
        const pe = e as PointerEvent
        pointerStartPosRef.current = { x: pe.clientX, y: pe.clientY }
      } else if ('touches' in (e as TouchEvent) && (e as TouchEvent).touches.length > 0) {
        const te = (e as TouchEvent).touches[0]
        pointerStartPosRef.current = { x: te.clientX, y: te.clientY }
      }

      if (finManualRef.current !== null) {
        window.clearTimeout(finManualRef.current)
        finManualRef.current = null
      }
      if (!modoManualRef.current) {
        modoManualRef.current = true
        if (onModoManualChange) onModoManualChange(true)
      }
    }

    function mover(e: Event) {
      if (pointerStartPosRef.current) {
        let cx = 0
        let cy = 0
        if ('clientX' in (e as PointerEvent)) {
          const pe = e as PointerEvent
          cx = pe.clientX
          cy = pe.clientY
        } else if ('touches' in (e as TouchEvent) && (e as TouchEvent).touches.length > 0) {
          const te = (e as TouchEvent).touches[0]
          cx = te.clientX
          cy = te.clientY
        }
        const dist = Math.hypot(cx - pointerStartPosRef.current.x, cy - pointerStartPosRef.current.y)
        if (dist > 8) {
          isDraggingGestureRef.current = true
        }
      }
    }

    function terminar(e: Event) {
      if ('type' in e && (e.type === 'wheel' || e.type === 'touchmove')) {
        isDraggingGestureRef.current = true
      }

      if (!isDraggingGestureRef.current && onToggleControles) {
        onToggleControles()
      }

      pointerStartPosRef.current = null

      if (finManualRef.current !== null) window.clearTimeout(finManualRef.current)
      finManualRef.current = window.setTimeout(() => {
        finManualRef.current = null
        modoManualRef.current = false
        if (onModoManualChange) onModoManualChange(false)
        if (onNavegacionManual) onNavegacionManual(tokenEnLaBanda())
      }, MS_PARA_SOLTAR)
    }

    el.addEventListener('pointerdown', empezar)
    el.addEventListener('touchstart', empezar, { passive: true })
    el.addEventListener('pointermove', mover)
    el.addEventListener('touchmove', mover, { passive: true })
    el.addEventListener('wheel', empezar, { passive: true })
    el.addEventListener('pointerup', terminar)
    el.addEventListener('touchend', terminar)
    el.addEventListener('wheel', terminar, { passive: true })

    return () => {
      el.removeEventListener('pointerdown', empezar)
      el.removeEventListener('touchstart', empezar)
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('touchmove', mover)
      el.removeEventListener('wheel', empezar)
      el.removeEventListener('pointerup', terminar)
      el.removeEventListener('touchend', terminar)
      el.removeEventListener('wheel', terminar)
      if (finManualRef.current !== null) window.clearTimeout(finManualRef.current)
    }
  }, [onNavegacionManual, onModoManualChange, alturaLineaPx, onToggleControles, filaPx])

  useEffect(() => {
    if (!motorAvance) return

    let animId: number
    const animate = () => {
      const tAhora = performance.now()
      const st = motorAvance.estadoEn(tAhora)
      if (onEstadoAvanceChange) {
        onEstadoAvanceChange(st.motivoFreno, st.avanzando, st.estado)
      }

      if (st.estado === 'BUSCANDO') {
        if (tInicioBuscandoRef.current === null) {
          tInicioBuscandoRef.current = tAhora
        }
        if (tAhora - tInicioBuscandoRef.current >= 1000) {
          setTextoEstadoLector('Buscando tu posición')
        } else {
          setTextoEstadoLector(null)
        }
      } else if (st.estado === 'DETENIDO') {
        tInicioBuscandoRef.current = null
        setTextoEstadoLector('Detenido')
      } else {
        tInicioBuscandoRef.current = null
        setTextoEstadoLector(null)
      }

      let renglones = renglonesRef.current
      if (renglones.length === 0) {
        recalcularGeometria()
        renglones = renglonesRef.current
      }

      const origen = origenRef.current
      const top = Math.max(0, pixelDePosicion(renglones, st.posicion) - origen - filaPx)

      if (diagnostico && containerRef.current) {
        const el = document.getElementById('diag-prompter')
        if (el) el.textContent = `pos=${st.posicion.toFixed(1)} calce=${st.ultimoCalce} scroll=${Math.round(top)} freno=${st.motivoFreno || "-"}`
      }

      if (!modoManualRef.current && containerRef.current) {
        containerRef.current.scrollTop = top
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [motorAvance, onEstadoAvanceChange, topBanda, filaPx, diagnostico, recalcularGeometria])

  if (!guionObj.bloques || guionObj.bloques.length === 0) {
    return (
      <div style={{ background: colorFondo, color: '#888', padding: 20, textAlign: 'center', fontFamily: fontFamilyCss }}>
        <em>Guión sin bloques</em>
      </div>
    )
  }

  const bgBanda = isWhiteBg
    ? 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.03) 25%, rgba(0, 0, 0, 0.075) 50%, rgba(0, 0, 0, 0.03) 75%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.075) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%)'

  const rgbFondo = hexToRgb(colorFondo)
  const bgVelo = calcularBgVelo(topBanda, filaPx, lineasZona, rgbFondo)

  const allTokens = tokensRef.current

  return (
    <div
      data-testid="teleprompter-view-container"
      data-columna={columnaAngosta ? 'angosta' : 'completo'}
      data-fondo={colorFondo}
      data-letra={colorTextoEfectivo}
      onClick={() => {
        if (!isDraggingGestureRef.current && onToggleControles) {
          onToggleControles()
        }
      }}
      style={{
        overflow: 'hidden',
        height: '100%',
        minHeight: 360,
        background: colorFondo,
        color: colorTextoEfectivo,
        fontFamily: fontFamilyCss,
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Punto Rojo de Estado (Grabando) */}
      {isRecording && (
        <div
          data-testid="punto-grabando"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#ff2d55',
            zIndex: 10,
            boxShadow: '0 0 6px rgba(255, 45, 85, 0.8)'
          }}
          title="Grabando"
        />
      )}

      {/* Overlay Visual de la Banda de Lectura (Luz/Sombra degradado) */}
      <div
        data-testid="banda-lectura"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: topBanda,
          height: altoBanda,
          pointerEvents: 'none',
          zIndex: 2,
          background: bgBanda
        }}
      />

      {/* Velo de opacidad asimétrica según la distancia en renglones a la banda */}
      <div
        data-testid="velo-lectura"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 3,
          background: bgVelo
        }}
      />

      {/* Indicador sobrio de estado para el lector */}
      {textoEstadoLector && (
        <div
          data-testid="indicador-estado-lector"
          style={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            fontSize: 13,
            color: isWhiteBg ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          {textoEstadoLector}
        </div>
      )}

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
        <div
          data-testid="columna-texto"
          style={{
            fontSize,
            maxWidth: columnaAngosta ? '22ch' : '90%',
            margin: '0 auto',
            width: '100%'
          }}
        >
          {guionObj.bloques.map((bloque, bIdx) => {
            const lineas = (bloque.texto || '').split(/\r?\n/)
            let charOffset = 0

            return (
              <div key={bloque.id || bIdx} className="block-container" style={{ marginBottom: 24 }}>
                {bloque.nombre && (
                  <div style={{ fontSize: Math.max(14, fontSize * 0.5), color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    [{bloque.nombre}]
                  </div>
                )}
                {lineas.map((linea: string, lIdx: number) => {
                  const lineStart = charOffset
                  let newlineLen = 1
                  if (bloque.texto && bloque.texto.substring(lineStart + linea.length, lineStart + linea.length + 2) === '\r\n') {
                    newlineLen = 2
                  }
                  charOffset = lineStart + linea.length + newlineLen

                  const lineTokens = allTokens.filter(t => t.bloque === bIdx && t.linea === lIdx)

                  return (
                    <div
                      key={lIdx}
                      className="line"
                      data-block={bIdx}
                      data-line={lIdx}
                      style={{
                        fontSize,
                        margin: '16px 0',
                        lineHeight: 1.4
                      }}
                    >
                      {renderFormattedLine(linea, lineStart, lineTokens, bloque.tramos)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function renderFormattedLine(
  linea: string,
  lineaStart: number = 0,
  lineTokens: Token[] = [],
  tramos: import('../datos/modelo').TramoFormato[] = []
) {
  if (!linea) return null

  const isBracket = new Array<boolean>(linea.length).fill(false)
  let inBracket = false
  for (let i = 0; i < linea.length; i++) {
    if (esCaracterApertura(linea[i])) {
      inBracket = true
      isBracket[i] = true
    } else if (esCaracterCierre(linea[i])) {
      isBracket[i] = true
      inBracket = false
    } else {
      isBracket[i] = inBracket
    }
  }

  const COLOR_MAP: Record<string, string> = {
    ambar: '#F0C070',
    celeste: '#8FB8DE',
    salvia: '#9CC5A1'
  }

  type CharAttr = {
    esAcotacion: boolean
    negrita: boolean
    color?: string
  }

  const attrs: CharAttr[] = []
  for (let i = 0; i < linea.length; i++) {
    const globalIdx = lineaStart + i
    let negrita = false
    let colorName: 'ambar' | 'celeste' | 'salvia' | undefined = undefined

    for (const tr of tramos) {
      if (globalIdx >= tr.desde && globalIdx < tr.hasta) {
        if (tr.negrita) negrita = true
        if (tr.color) colorName = tr.color
      }
    }

    attrs.push({
      esAcotacion: isBracket[i],
      negrita,
      color: colorName ? COLOR_MAP[colorName] : undefined
    })
  }

  // Segmentar la línea en tramos de acotación (esAcotacion) y no-acotación
  type SegmentoAcotacion = {
    esAcotacion: boolean
    startInLine: number
    endInLine: number
  }

  const segmentos: SegmentoAcotacion[] = []
  let segStart = 0
  let segInAcotacion = isBracket[0] || false

  for (let i = 1; i < linea.length; i++) {
    if (isBracket[i] !== segInAcotacion) {
      segmentos.push({
        esAcotacion: segInAcotacion,
        startInLine: segStart,
        endInLine: i
      })
      segStart = i
      segInAcotacion = isBracket[i]
    }
  }
  segmentos.push({
    esAcotacion: segInAcotacion,
    startInLine: segStart,
    endInLine: linea.length
  })

  return (
    <>
      {segmentos.map((seg, idx) => {
        const segText = linea.substring(seg.startInLine, seg.endInLine)
        const segGlobalStart = lineaStart + seg.startInLine
        const segGlobalEnd = lineaStart + seg.endInLine

        const segTokens = lineTokens
          .filter(t => t.desdeChar >= segGlobalStart && t.hastaChar <= segGlobalEnd)
          .sort((a, b) => a.desdeChar - b.desdeChar)

        const content = renderSegmentContent(
          segText,
          segGlobalStart,
          seg.startInLine,
          segTokens,
          attrs
        )

        if (seg.esAcotacion) {
          return (
            <span
              key={idx}
              style={{
                opacity: 0.5,
                fontStyle: 'italic',
                color: '#aaa',
                margin: '0 2px'
              }}
            >
              {content}
            </span>
          )
        }

        return <React.Fragment key={idx}>{content}</React.Fragment>
      })}
    </>
  )
}

function renderSegmentContent(
  text: string,
  globalStart: number,
  localStartInLine: number,
  tokens: Token[],
  attrs: { esAcotacion: boolean; negrita: boolean; color?: string }[]
) {
  const globalEnd = globalStart + text.length
  const nodes: React.ReactNode[] = []
  let currGlobal = globalStart

  for (const tok of tokens) {
    if (tok.desdeChar > currGlobal) {
      const segText = text.substring(currGlobal - globalStart, tok.desdeChar - globalStart)
      const offsetInLine = localStartInLine + (currGlobal - globalStart)
      nodes.push(renderNonTokenText(`nt-${currGlobal}`, segText, offsetInLine, attrs))
    }

    const tokText = text.substring(tok.desdeChar - globalStart, tok.hastaChar - globalStart)
    const tokAttr = attrs[localStartInLine + (tok.desdeChar - globalStart)] || { esAcotacion: false, negrita: false }

    const style: React.CSSProperties = {}
    if (tokAttr.negrita) style.fontWeight = 'bold'
    if (tokAttr.color) style.color = tokAttr.color

    nodes.push(
      <span
        key={`tok-${tok.tokenAbsoluto}`}
        data-token={tok.tokenAbsoluto}
        style={Object.keys(style).length > 0 ? style : undefined}
      >
        {tokText}
      </span>
    )

    currGlobal = tok.hastaChar
  }

  if (currGlobal < globalEnd) {
    const segText = text.substring(currGlobal - globalStart, globalEnd - globalStart)
    const offsetInLine = localStartInLine + (currGlobal - globalStart)
    nodes.push(renderNonTokenText(`nt-${currGlobal}`, segText, offsetInLine, attrs))
  }

  return <>{nodes}</>
}

function renderNonTokenText(
  keyPrefix: string,
  text: string,
  offsetInLine: number,
  attrs: { esAcotacion: boolean; negrita: boolean; color?: string }[]
) {
  if (!text) return null

  type Group = { text: string; negrita: boolean; color?: string }
  const groups: Group[] = []
  let currText = ''
  let currNeg = attrs[offsetInLine]?.negrita || false
  let currCol = attrs[offsetInLine]?.color

  for (let i = 0; i < text.length; i++) {
    const a = attrs[offsetInLine + i] || { negrita: false }
    if (a.negrita !== currNeg || a.color !== currCol) {
      if (currText) groups.push({ text: currText, negrita: currNeg, color: currCol })
      currText = text[i]
      currNeg = a.negrita
      currCol = a.color
    } else {
      currText += text[i]
    }
  }
  if (currText) groups.push({ text: currText, negrita: currNeg, color: currCol })

  return (
    <React.Fragment key={keyPrefix}>
      {groups.map((g, idx) => {
        const style: React.CSSProperties = {}
        if (g.negrita) style.fontWeight = 'bold'
        if (g.color) style.color = g.color

        return Object.keys(style).length > 0 ? (
          <span key={idx} style={style}>
            {g.text}
          </span>
        ) : (
          <React.Fragment key={idx}>{g.text}</React.Fragment>
        )
      })}
    </React.Fragment>
  )
}
