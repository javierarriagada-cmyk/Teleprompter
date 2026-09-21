import React from 'react'
import { Token } from '../lib/seguidor'
import { TramoFormato } from '../datos/modelo'
import { esCaracterApertura, esCaracterCierre } from '../lib/acotaciones'

export function renderFormattedLine(
  linea: string,
  lineaStart: number = 0,
  lineTokens: Token[] = [],
  tramos: TramoFormato[] = []
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

export function renderSegmentContent(
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

export function renderNonTokenText(
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
