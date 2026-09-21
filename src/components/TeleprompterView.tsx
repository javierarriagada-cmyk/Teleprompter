import React, { useEffect, useRef } from 'react'
import { MotorDeAvance, EstadoModo } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { agruparEnRenglones, indiceDeRenglon, pixelDePosicion, pixelDeRenglon, Renglon, MedidaToken } from '../lib/renglones'
import { renderFormattedLine } from './renglones'
import { anotar } from '../lib/diagnostico'

export const PALABRAS_DE_SEGURIDAD = 2

export function avanzarTrabado(
  trabado: number | null,
  idxAncla: number,
  anclaRenglon: number,
  renglones: Renglon[],
  palabrasDeSeguridad = PALABRAS_DE_SEGURIDAD
): number {
  if (trabado === null) return idxAncla
  if (idxAncla < trabado) return idxAncla
  if (idxAncla - trabado >= 2) return idxAncla - 1
  if (idxAncla === trabado + 1) {
    const rSiguiente = renglones[trabado + 1]
    if (!rSiguiente) return idxAncla
    const palabrasRenglon = rSiguiente.hastaToken + 1 - rSiguiente.desdeToken
    const palabrasAdentro = Math.floor(anclaRenglon) - rSiguiente.desdeToken
    const umbral = Math.min(palabrasDeSeguridad, palabrasRenglon - 1)
    if (palabrasAdentro >= umbral) {
      return idxAncla
    }
  }
  return trabado
}

import { AnclajeZona, calcularBanda, calcularBgVelo, opacidadDeLinea } from './banda'
import { RecuadroCamara } from './RecuadroCamara'
import { FondoToma } from '../App'

export const MARGEN_RENGLONES_ARRIBA = 1
export const MS_DESLIZAR = 70

export function calcularScrollTop(
  pixelPos: number,
  origen: number,
  filaPx: number,
  margenRenglonesArriba = MARGEN_RENGLONES_ARRIBA
): number {
  return Math.max(0, pixelPos - origen - margenRenglonesArriba * filaPx)
}

export function posicionEnPantalla(
  pixelPos: number,
  origen: number,
  topBanda: number,
  scrollTop: number
): number {
  return topBanda + (pixelPos - origen) - scrollTop
}

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
  enPausa?: boolean
  camaraEncendida?: boolean
  ladoCamara?: 'frontal' | 'trasera'
  fondoToma?: FondoToma
  recuadroX?: number
  recuadroY?: number
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
  enPausa = false,
  camaraEncendida = false,
  ladoCamara = 'frontal',
  fondoToma = 'detras',
  recuadroX = 0.64,
  recuadroY = 0.52,
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
  const [altoContenedor, setAltoContenedor] = React.useState<number>(0)
  const { topBanda, altoBanda } = altoContenedor > 0
    ? calcularBanda(altoContenedor, filaPx, lineasZona, anclajeZona, 20, 20, altoLineaViva)
    : { topBanda: 0, altoBanda: 0 }

  const isWhiteBg = colorFondo.toUpperCase() === '#FFFFFF'
  const colorTextoEfectivo = isWhiteBg ? '#000000' : colorLetra
  const fontFamilyCss = tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'

  const renglonesRef = useRef<Renglon[]>([])
  const origenRef = useRef<number>(0)
  const scrollSuaveRef = useRef<number | null>(null)
  const renglonTrabadoRef = useRef<number | null>(null)
  const ultimoCuadroRef = useRef<number | null>(null)

  const recalcularGeometria = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const alto = container.clientHeight || 0
    setAltoContenedor(alto)
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
    renglonTrabadoRef.current = null
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
    if (enPausa) {
      setTextoEstadoLector('En pausa')
    }
  }, [enPausa])

  useEffect(() => {
    if (!motorAvance) return

    let animId: number
    const animate = () => {
      const tAhora = performance.now()
      const st = motorAvance.estadoEn(tAhora)
      if (onEstadoAvanceChange) {
        onEstadoAvanceChange(st.motivoFreno, st.avanzando, st.estado)
      }

      if (enPausa) {
        setTextoEstadoLector('En pausa')
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
      const anclaRenglon = Math.min(st.posicion, st.ultimoCalce)
      const idxAncla = indiceDeRenglon(renglones, anclaRenglon)
      if (modoManualRef.current) renglonTrabadoRef.current = null
      renglonTrabadoRef.current = avanzarTrabado(
        renglonTrabadoRef.current,
        idxAncla,
        anclaRenglon,
        renglones
      )
      const renglonTrabado = renglones[renglonTrabadoRef.current]
      const topObjetivo = calcularScrollTop(
        renglonTrabado ? renglonTrabado.top : 0,
        origen,
        filaPx
      )

      const dtCuadro = ultimoCuadroRef.current === null ? 16 : Math.min(100, tAhora - ultimoCuadroRef.current)
      ultimoCuadroRef.current = tAhora
      if (scrollSuaveRef.current === null) scrollSuaveRef.current = topObjetivo
      const acercamiento = 1 - Math.exp(-dtCuadro / MS_DESLIZAR)
      scrollSuaveRef.current += (topObjetivo - scrollSuaveRef.current) * acercamiento
      if (Math.abs(topObjetivo - scrollSuaveRef.current) < 0.5) scrollSuaveRef.current = topObjetivo
      const top = scrollSuaveRef.current

      if (diagnostico && containerRef.current) {
        const el = document.getElementById('diag-prompter')
        if (el) el.textContent = `pos=${st.posicion.toFixed(1)} calce=${st.ultimoCalce} scroll=${Math.round(top)} freno=${st.motivoFreno || "-"}`
      }

      anotar({
        tipo: 'cuadro',
        posicion: st.posicion,
        calce: st.ultimoCalce,
        scroll: Math.round(top),
        freno: st.motivoFreno || '-',
        trabado: renglonTrabadoRef.current ?? idxAncla
      })

      if (!modoManualRef.current && containerRef.current && altoContenedor > 0) {
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

  const textoSobreImagen = camaraEncendida && fondoToma === 'detras'

  const bgBanda = isWhiteBg
    ? 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.03) 25%, rgba(0, 0, 0, 0.075) 50%, rgba(0, 0, 0, 0.03) 75%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.075) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%)'

  const rgbFondo = hexToRgb(colorFondo)
  const bgVelo = calcularBgVelo(topBanda, filaPx, rgbFondo, textoSobreImagen)

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
        paddingTop: 'calc(env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(env(safe-area-inset-right, 0px))',
        background: textoSobreImagen ? 'transparent' : colorFondo,
        color: colorTextoEfectivo,
        fontFamily: fontFamilyCss,
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Marcador DOM para 'detrás' para compatibilidad con guardianes y pruebas */}
      {textoSobreImagen && (
        <div data-testid="video-camara-lectura" style={{ display: 'none' }} />
      )}

      {/* Recuadro chico de cámara */}
      {camaraEncendida && fondoToma === 'recuadro' && (
        <RecuadroCamara
          modoCamara={ladoCamara}
          recuadroX={recuadroX}
          recuadroY={recuadroY}
          arrastrable={false}
        />
      )}

      {/* Punto Rojo de Estado (Grabando) */}
      {isRecording && (
        <div
          data-testid="punto-grabando"
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: 'calc(16px + env(safe-area-inset-right, 0px))',
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
      {altoContenedor > 0 && (
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
      )}

      {/* Velo de opacidad asimétrica de borde a borde */}
      {altoContenedor > 0 && (
        <div
          data-testid="velo-lectura"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            pointerEvents: 'none',
            zIndex: 3,
            background: bgVelo
          }}
        />
      )}

      {/* Indicador sobrio de estado para el lector */}
      {textoEstadoLector && (
        <div
          data-testid="indicador-estado-lector"
          style={{
            position: 'absolute',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            left: 'calc(16px + env(safe-area-inset-left, 0px))',
            fontSize: 15,
            fontWeight: 600,
            color: isWhiteBg ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          {textoEstadoLector}
        </div>
      )}

      <div
        ref={containerRef}
        data-testid="contenedor-lectura"
        style={{
          height: '100%',
          overflowY: 'auto',
          paddingLeft: `${marginPercent}%`,
          paddingRight: `${marginPercent}%`,
          paddingTop: topBanda,
          paddingBottom: `${Math.max(0, altoContenedor - topBanda - (MARGEN_RENGLONES_ARRIBA + 1) * filaPx)}px`,
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
    </div>
  )
}
