import React, { useEffect, useRef } from 'react'
import { Guion } from '../datos/modelo'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { esCaracterApertura, esCaracterCierre } from '../lib/acotaciones'
import { calcularBanda, calcularBgVelo } from './banda'
import { IconoAtras } from './IconosApp'
import { hapticaSeleccion, hapticaToqueMedio } from '../haptica'

interface PrepararViewProps {
  script: Guion | string
  fontSize?: number
  marginPercent?: number
  mirror?: boolean
  lineasZona?: number
  anclajeZona: 'arriba' | 'medio' | 'abajo'
  setAnclajeZona: (a: 'arriba' | 'medio' | 'abajo') => void
  columnaAngosta?: boolean
  colorFondo?: string
  colorLetra?: string
  tipoFuente?: 'sans' | 'serif'
  modoCamara: 'frontal' | 'trasera'
  setModoCamara: (m: 'frontal' | 'trasera') => void
  streamCamara: MediaStream | null
  onVolver: () => void
  onEmpezar: () => void
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  if (isNaN(num)) return { r: 0, g: 0, b: 0 }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

export default function PrepararView({
  script,
  fontSize = 28,
  marginPercent = 10,
  mirror = false,
  lineasZona = 3,
  anclajeZona,
  setAnclajeZona,
  columnaAngosta = true,
  colorFondo = '#000000',
  colorLetra = '#FFFFFF',
  tipoFuente = 'sans',
  modoCamara,
  setModoCamara,
  streamCamara,
  onVolver,
  onEmpezar
}: PrepararViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [altoContenedor, setAltoContenedor] = React.useState<number>(0)

  useEffect(() => {
    if (videoRef.current && streamCamara) {
      videoRef.current.srcObject = streamCamara
      const res = videoRef.current.play()
      if (res && typeof res.catch === 'function') {
        res.catch(() => {})
      }
    }
  }, [streamCamara])

  const recalcularGeometria = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    setAltoContenedor(container.clientHeight || 0)
  }, [])

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
  }, [recalcularGeometria])

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
  const { topBanda, altoBanda } = altoContenedor > 0
    ? calcularBanda(altoContenedor, filaPx, lineasZona, anclajeZona, 20, 20)
    : { topBanda: 0, altoBanda: 0 }

  const isWhiteBg = colorFondo.toUpperCase() === '#FFFFFF'
  const colorTextoEfectivo = isWhiteBg ? '#000000' : colorLetra
  const fontFamilyCss = tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'

  const bgBanda = isWhiteBg
    ? 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.03) 25%, rgba(0, 0, 0, 0.075) 50%, rgba(0, 0, 0, 0.03) 75%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.075) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%)'

  const rgbFondo = hexToRgb(colorFondo)
  const bgVelo = calcularBgVelo(topBanda, filaPx, rgbFondo, true)

  const allTokens = tokensRef.current

  return (
    <div
      data-testid="preparar-view-container"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100dvh',
        zIndex: 150,
        overflow: 'hidden',
        paddingTop: 'calc(env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(env(safe-area-inset-right, 0px))',
        background: '#000000',
        color: colorTextoEfectivo,
        fontFamily: fontFamilyCss,
        boxSizing: 'border-box'
      }}
    >
      {/* Botón de volver arriba a la izquierda */}
      <button
        data-testid="btn-volver-preparar"
        type="button"
        onClick={() => {
          hapticaToqueMedio()
          onVolver()
        }}
        aria-label="Volver"
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          left: 'calc(16px + env(safe-area-inset-left, 0px))',
          zIndex: 10,
          padding: 'var(--aire-2) var(--aire-3)',
          cursor: 'pointer',
          backgroundColor: 'var(--bg-superficie)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--redondeo)',
          color: 'var(--color-texto)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--aire-2)',
          fontWeight: 600,
          fontSize: 'var(--texto-cuerpo)'
        }}
      >
        <IconoAtras />
      </button>

      {/* Imagen de la cámara al fondo */}
      {streamCamara && (
        <video
          ref={videoRef}
          data-testid="video-camara-preparar"
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: modoCamara === 'frontal' ? 'scaleX(-1)' : 'none',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Overlay Visual de la Banda */}
      {altoContenedor > 0 && (
        <div
          data-testid="banda-preparar"
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
      )}

      {/* Velo de opacidad */}
      {altoContenedor > 0 && (
        <div
          data-testid="velo-preparar"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            maxWidth: columnaAngosta ? '22ch' : '90%',
            margin: '0 auto',
            width: '100%',
            fontSize,
            pointerEvents: 'none',
            zIndex: 3,
            background: bgVelo
          }}
        />
      )}

      {/* Contenedor de Texto Quieto */}
      <div
        ref={containerRef}
        data-testid="contenedor-preparar"
        style={{
          height: '100%',
          overflow: 'hidden',
          paddingLeft: `${marginPercent}%`,
          paddingRight: `${marginPercent}%`,
          paddingTop: topBanda,
          transform: mirror ? 'scaleX(-1)' : 'none',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div
          data-testid="columna-texto"
          style={{
            fontSize,
            maxWidth: columnaAngosta ? '22ch' : '90%',
            margin: '0 auto',
            width: '100%',
            textAlign: columnaAngosta ? 'center' : 'left'
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

      {/* Controles de Preparación */}
      <div
        data-testid="panel-controles-preparar"
        style={{
          position: 'absolute',
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          left: 'calc(16px + env(safe-area-inset-left, 0px))',
          right: 'calc(16px + env(safe-area-inset-right, 0px))',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--aire-3)',
          backgroundColor: 'var(--bg-superficie)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--redondeo-grande)',
          padding: 'var(--aire-3)',
          color: 'var(--color-texto)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--aire-3)', flexWrap: 'wrap' }}>
          {/* DÓNDE LEES */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)' }}>
            <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', fontWeight: 600 }}>
              Dónde lees:
            </span>
            <div style={{ display: 'flex', gap: 'var(--aire-1)' }}>
              {(['arriba', 'medio', 'abajo'] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  className="btn-deformable"
                  onClick={() => {
                    hapticaSeleccion()
                    setAnclajeZona(z)
                  }}
                  style={{
                    padding: 'var(--aire-1) var(--aire-2)',
                    fontSize: 'var(--texto-meta)',
                    borderRadius: 'var(--redondeo-pildora)',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: anclajeZona === z ? 'var(--color-acento)' : 'var(--bg-suelo)',
                    color: anclajeZona === z ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                    fontWeight: anclajeZona === z ? 'bold' : 'normal',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* CÁMARA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)' }}>
            <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', fontWeight: 600 }}>
              Cámara:
            </span>
            <div style={{ display: 'flex', gap: 'var(--aire-1)' }}>
              {(['frontal', 'trasera'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="btn-deformable"
                  onClick={() => {
                    hapticaSeleccion()
                    setModoCamara(m)
                  }}
                  style={{
                    padding: 'var(--aire-1) var(--aire-2)',
                    fontSize: 'var(--texto-meta)',
                    borderRadius: 'var(--redondeo-pildora)',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: modoCamara === m ? 'var(--color-acento)' : 'var(--bg-suelo)',
                    color: modoCamara === m ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                    fontWeight: modoCamara === m ? 'bold' : 'normal',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* EMPEZAR */}
        <button
          data-testid="btn-empezar-preparar"
          type="button"
          className="btn-deformable"
          onClick={() => {
            hapticaToqueMedio()
            onEmpezar()
          }}
          style={{
            width: '100%',
            padding: 'var(--aire-3)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 'bold',
            borderRadius: 'var(--redondeo-pildora)',
            border: 'none',
            backgroundColor: 'var(--color-acento)',
            color: 'var(--color-texto-acento)',
            cursor: 'pointer'
          }}
        >
          Empezar
        </button>
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
