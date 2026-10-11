import React from 'react'
import { Token } from '../lib/seguidor'
import { TramoFormato, DESTACADO } from '../datos/modelo'
import { colorDeTramo } from './estiloLectura'
import { esCaracterApertura, esCaracterCierre } from '../lib/acotaciones'
import { MARGEN_ACOTACION_PX } from '../lib/cortesDeRenglon'

export function renderFormattedLine(
  linea: string,
  lineaStart: number = 0,
  lineTokens: Token[] = [],
  tramos: TramoFormato[] = [],
  colorFondo: string = '#000000'
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

  // Los colores de los tramos salen de colorDeTramo -estiloLectura.ts-: hasta
  // el 24-09-2026 estaban copiados aca, fijos para fondo negro, y sobre la
  // pareja blanca el ambar no se leia.

  type CharAttr = {
    esAcotacion: boolean
    negrita: boolean
    color?: string
    destacado?: boolean
  }

  const attrs: CharAttr[] = []
  for (let i = 0; i < linea.length; i++) {
    const globalIdx = lineaStart + i
    let negrita = false
    let destacado = false
    let colorName: 'ambar' | 'celeste' | 'salvia' | undefined = undefined

    for (const tr of tramos) {
      if (globalIdx >= tr.desde && globalIdx < tr.hasta) {
        if (tr.negrita) negrita = true
        if (tr.destacado) destacado = true
        if (tr.color) colorName = tr.color
      }
    }

    attrs.push({
      esAcotacion: isBracket[i],
      negrita,
      destacado,
      color: colorName ? colorDeTramo(colorName, colorFondo) : undefined
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
            // 29-09-2026, tarea 82: la clase acotacion-lectura es para la cámara detrás. El estilo
            // en línea queda igual; styles.css lo pisa solo dentro de .lectura-sobre-imagen.
            <span
              key={idx}
              className="acotacion-lectura"
              style={{
                opacity: 0.5,
                fontStyle: 'italic',
                color: '#aaa',
                // Antes: margin: '0 2px'
                // -editor-ancho-texto, segunda vuelta- El mismo valor, ahora compartido con el editor
                // -MARGEN_ACOTACION_PX, lib/cortesDeRenglon.ts-. La lectura no cambia.
                margin: `0 ${MARGEN_ACOTACION_PX}px`
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
  attrs: AtributosCaracter[]
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

    const style = estiloDeAtributos(tokAttr)

    nodes.push(
      <span
        key={`tok-${tok.tokenAbsoluto}`}
        data-token={tok.tokenAbsoluto}
        className={claseDeAtributos(tokAttr)}
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
  attrs: AtributosCaracter[]
) {
  if (!text) return null

  type Group = { text: string; negrita: boolean; color?: string; destacado?: boolean }
  const groups: Group[] = []
  let currText = ''
  let currNeg = attrs[offsetInLine]?.negrita || false
  let currCol = attrs[offsetInLine]?.color
  let currDes = attrs[offsetInLine]?.destacado || false

  for (let i = 0; i < text.length; i++) {
    const a: Partial<AtributosCaracter> = attrs[offsetInLine + i] || { negrita: false }
    const des = a.destacado || false
    if (a.negrita !== currNeg || a.color !== currCol || des !== currDes) {
      if (currText) groups.push({ text: currText, negrita: currNeg, color: currCol, destacado: currDes })
      currText = text[i]
      currNeg = a.negrita || false
      currCol = a.color
      currDes = des
    } else {
      currText += text[i]
    }
  }
  if (currText) groups.push({ text: currText, negrita: currNeg, color: currCol, destacado: currDes })

  return (
    <React.Fragment key={keyPrefix}>
      {groups.map((g, idx) => {
        const style = estiloDeAtributos(g)

        return Object.keys(style).length > 0 ? (
          <span key={idx} className={claseDeAtributos(g)} style={style}>
            {g.text}
          </span>
        ) : (
          <React.Fragment key={idx}>{g.text}</React.Fragment>
        )
      })}
    </React.Fragment>
  )
}

export type AtributosCaracter = { esAcotacion: boolean; negrita: boolean; color?: string; destacado?: boolean }

// Un solo lugar para pasar de atributos a estilo, para el texto que el motor
// sigue -tokens- y para el que no -puntuacion, acotaciones-. El destacado es
// fondo amarillo con letra negra. 24-09-2026.
// SIN ESQUINAS REDONDEADAS NI RELLENO, a diferencia del editor: aca cada
// palabra y cada espacio son un span aparte -el motor sigue palabra por
// palabra-, y con esquinas cada uno era una cajita. Visto en el telefono:
// entre palabra y palabra quedaban muescas y el destacado se leia cortado.
// Rectangulos pegados forman una sola banda. En el editor el tramo es un
// solo elemento y ahi las esquinas si quedan bien.
function estiloDeAtributos(a: { negrita?: boolean; color?: string; destacado?: boolean }): React.CSSProperties {
  const style: React.CSSProperties = {}
  if (a.negrita) style.fontWeight = 'bold'
  if (a.color) style.color = a.color
  if (a.destacado) {
    style.backgroundColor = DESTACADO.fondo
    style.color = DESTACADO.letra
  }
  return style
}

// EL DESTACADO SE MARCA CON UNA CLASE, ADEMÁS DEL ESTILO -tarea 82, 29-09-2026-. Con la cámara
// detrás el texto lleva el halo E -styles.css, .lectura-sobre-imagen-, y el destacado amarillo
// tiene que ir sin halo: un halo negro sobre el amarillo lo ensucia. El estilo en línea no puede
// quitar una sombra heredada según dónde esté; la clase deja que la hoja de estilos lo haga solo
// sobre la imagen. Sin destacado no hay clase: el DOM de siempre queda igual.
function claseDeAtributos(a: { destacado?: boolean }): string | undefined {
  return a.destacado ? 'destacado-lectura' : undefined
}
