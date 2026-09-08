import React, { useEffect, useRef } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { esCaracterApertura, esCaracterCierre } from '../lib/acotaciones'

import { AnclajeZona, calcularBanda, opacidadDeLinea } from './banda'

// El texto no se mueve mientras el lector va por el primer renglon de la linea en curso:
// el disparo es al pasar al segundo. Cuantas palabras son eso se calcula con los renglones
// que ocupa el elemento, porque depende del tamano de letra.

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
  // El usuario movio el texto a mano hasta esa palabra. No es una recuperacion: es
  // navegacion, y la ventana de contexto se muda con el.
  onNavegacionManual?: (token: number) => void
  onModoManualChange?: (manual: boolean) => void
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

  // MODO MANUAL. Mientras el usuario arrastra la barra o el dedo, la voz suelta el control
  // del desplazamiento: si no, el bucle de animacion le devuelve el scroll a su lugar
  // sesenta veces por segundo y mover el texto a mano es imposible.
  //
  // Al soltar, se mira que palabra quedo en la banda de lectura y esa pasa a ser la
  // posicion del seguidor: la ventana de contexto se muda con el movimiento.
  const modoManualRef = useRef(false)
  const finManualRef = useRef<number | null>(null)
  // Palabras que entran en un renglon, medidas sobre la linea que se esta mostrando.
  const palabrasPorRenglonRef = useRef<number>(8)

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
  const alturaLineaPx = filaPx + 16 // fontSize * lineHeight (1.4) + vertical margin (16px)
  const [altoLineaViva, setAltoLineaViva] = React.useState<number>(filaPx)
  const { topBanda, altoBanda } = calcularBanda(480, filaPx, lineasZona, anclajeZona, 20, 20, altoLineaViva)

  const isWhiteBg = colorFondo.toUpperCase() === '#FFFFFF'
  const colorTextoEfectivo = isWhiteBg ? '#000000' : colorLetra
  const fontFamilyCss = tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'

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

  // Medir la altura real de la linea viva para ajustar la banda
  useEffect(() => {
    if (!containerRef.current) return
    const target = containerRef.current.querySelector(`[data-block="${currentBlockIndex}"][data-line="${currentLineIndex}"]`) as HTMLElement
    if (target) {
      const h = target.clientHeight || filaPx
      setAltoLineaViva(h)
    }
  }, [currentBlockIndex, currentLineIndex, filaPx])

  // Deteccion de la navegacion a mano. Se miran los eventos de puntero, tacto y rueda, no
  // el scroll: el scroll tambien lo mueve el motor, y no se podria distinguir quien fue.
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

      const tPrimero = tokens[0]
      const elPrimero = cont.querySelector(
        `[data-block="${tPrimero.bloque}"][data-line="${tPrimero.linea}"]`
      ) as HTMLElement | null
      const origen = elPrimero ? elPrimero.offsetTop : 0

      // Se invierte la cuenta del desplazamiento: donde quedo el scroll, mas el renglon de
      // atraso, es el punto del texto que esta en la banda de lectura.
      const buscado = cont.scrollTop + origen + alturaLineaPx

      let mejor = 0
      let mejorDist = Infinity
      const vistas = new Set<string>()
      for (let i = 0; i < tokens.length; i++) {
        const clave = `${tokens[i].bloque}-${tokens[i].linea}`
        if (vistas.has(clave)) continue
        vistas.add(clave)
        const elLinea = cont.querySelector(`[data-block="${tokens[i].bloque}"][data-line="${tokens[i].linea}"]`) as HTMLElement | null
        if (!elLinea) continue
        const d = Math.abs(elLinea.offsetTop - buscado)
        if (d < mejorDist) {
          mejorDist = d
          mejor = i
        }
      }
      return mejor
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
  }, [onNavegacionManual, onModoManualChange, alturaLineaPx, onToggleControles])

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
        // EL ATRASO DE UN RENGLON SE APLICA UNA SOLA VEZ, sobre la posicion global.
        //
        // Aplicado linea por linea, con lineas de un solo renglon retener un renglon es
        // retener la linea entera: el desplazamiento valia cero mientras se leia la linea
        // y solo cambiaba al cambiar de linea. Eso es la cuantizacion de nuevo, y con ella
        // los saltos que se habian sacado.
        // EL ATRASO DE UN RENGLON SE RESTA EN PIXELES, AL FINAL, no en palabras sobre la
        // posicion. Medido: en palabras da hasta 30 px de escalon al cruzar de linea,
        // porque cuantas palabras entran en un renglon cambia de una linea a otra y el
        // atraso cambia de golpe. Un renglon mide siempre lo mismo; restarlo en pixeles da
        // cero saltos.
        //
        // Ademas, calcular el atraso en palabras a partir de la linea cerraba un lazo -el
        // atraso decide la linea y la linea decide el atraso- que hacia temblar el
        // desplazamiento 11 px en fotogramas alternos, 238 veces en una lectura.
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

            const cantidad = Math.max(1, ultimo - primero + 1)

            // Se interpola entre el borde de ESTA linea y el borde de la SIGUIENTE, no
            // dentro del alto de esta. Interpolar dentro del elemento reinicia la cuenta
            // en cada cambio de linea, y como entre bloques hay margen aparecia un escalon
            // justo al terminar el parrafo: el "saltito" al pasar de uno a otro.
            //
            // Tomando el borde del siguiente, al llegar al final de una linea el valor
            // coincide exactamente con el de arranque de la que sigue, y el movimiento no
            // se corta en ningun lado.
            const tSig = ultimo + 1 < tokens.length ? tokens[ultimo + 1] : null
            const elSig = tSig
              ? containerRef.current.querySelector(`[data-block="${tSig.bloque}"][data-line="${tSig.linea}"]`) as HTMLElement | null
              : null
            const topSiguiente = elSig ? elSig.offsetTop : target.offsetTop + target.offsetHeight

            // Y el desplazamiento va UN RENGLON atrasado: mientras se lee un renglon el
            // texto no se mueve, y el movimiento sirve para traer el siguiente. Sin esto,
            // el renglon que uno esta leyendo se va subiendo bajo los ojos.
            //
            // Va en renglones y no en un numero de palabras a proposito: cuantas palabras
            // entran en un renglon depende del tamano de letra.
            // La altura de un renglon se LEE del navegador. La estimacion fontSize * 1.4
            // + 16 incluye el margen entre elementos, que no existe entre los renglones de
            // un mismo parrafo.
            const filaPx = parseFloat(getComputedStyle(target).lineHeight) || alturaLineaPx

            // Todo se mide DESDE EL PRIMER RENGLON del guion, no desde el borde del
            // contenedor. Usar offsetTop contra topBanda arrastraba el relleno superior y
            // cualquier cosa dibujada encima -el nombre del bloque, por ejemplo-, y con
            // eso el desplazamiento arrancaba en la segunda o tercera palabra en vez de
            // esperar a que se termine el primer renglon.
            const tPrimero = tokens[0]
            const elPrimero = containerRef.current.querySelector(
              `[data-block="${tPrimero.bloque}"][data-line="${tPrimero.linea}"]`
            ) as HTMLElement | null
            const origen = elPrimero ? elPrimero.offsetTop : target.offsetTop

            // LA REGLA ESTA EN PALABRAS, no en pixeles: el texto no se mueve hasta que el
            // lector termino las palabras del renglon que esta leyendo. Los pixeles son
            // solo como se dibuja despues.
            //
            // Antes esto estaba escrito en pixeles -restar la altura de un renglon al
            // recorrido- y estaba mal por un factor: el recorrido avanza el paso de linea
            // completo, con el margen entre elementos incluido, y la altura del texto de
            // un renglon es menor. La resta se volvia positiva a media linea, asi que el
            // desplazamiento arrancaba en la segunda o tercera palabra.
            // La retencion se cuenta sobre lo que el LECTOR dijo -el ultimo calce-, no
            // sobre la posicion mostrada. La posicion mostrada puede ir hasta
            // adelantoMaximo palabras adelante del lector, y contando sobre ella los dos
            // numeros se anulaban: con 8 de adelanto y 7 de retencion, el texto arrancaba
            // en la tercera palabra.
            // El disparo es al pasar al SEGUNDO RENGLON, no a una cantidad fija de
            // palabras: cuantas palabras entran en un renglon depende del tamano de letra.
            // Se calcula con los renglones que ocupa el elemento, que el navegador ya sabe.
            const filas = Math.max(1, Math.round(target.clientHeight / filaPx))
            const palabrasPorRenglon = cantidad / filas

            // Se cuenta sobre la posicion MOSTRADA, que es la continua: ultimoCalce solo
            // cambia cuando el reconocedor entrega algo, y usarlo para todo el calculo
            // devolvia el salto -el texto quieto entre calce y calce- y ademas disparaba
            // tarde, porque el reconocedor llega despues de la voz.
            //
            // Para que la posicion mostrada no corra muy por delante de lo que el lector
            // dijo, el adelanto del motor esta acotado en avance.ts.
            const dentroDeLinea = Math.min(1, Math.max(0, (st.posicion - primero) / cantidad))

            if (diagnostico) {
              const el = document.getElementById('diag-prompter')
              if (el) el.textContent = `pos=${st.posicion.toFixed(1)} calce=${st.ultimoCalce} linea=${t.linea} dentro=${dentroDeLinea.toFixed(2)} scroll=${Math.round(containerRef.current!.scrollTop)} freno=${st.motivoFreno || "-"}`
            }

            const pasoDeLinea = topSiguiente - target.offsetTop
            const continuo = (target.offsetTop - origen) + dentroDeLinea * pasoDeLinea
            const top = continuo - filaPx
            // Mientras el usuario manda, la voz no escribe el scroll.
            if (!modoManualRef.current) {
              containerRef.current.scrollTop = Math.max(0, top)
            }
          }
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [motorAvance, onEstadoAvanceChange, topBanda, alturaLineaPx, diagnostico])

  if (!guionObj.bloques || guionObj.bloques.length === 0) {
    return (
      <div style={{ background: colorFondo, color: '#888', padding: 20, textAlign: 'center', fontFamily: fontFamilyCss }}>
        <em>Guión sin bloques</em>
      </div>
    )
  }

  let lineCountGlobal = 0

  const bgBanda = isWhiteBg
    ? 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.03) 25%, rgba(0, 0, 0, 0.075) 50%, rgba(0, 0, 0, 0.03) 75%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.075) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%)'

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
            maxWidth: columnaAngosta ? '22ch' : '100%',
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

                  let targetCurrentLineGlobal = 0
                  for (let b = 0; b < guionObj.bloques.length; b++) {
                    if (b < currentBlockIndex) {
                      targetCurrentLineGlobal += (guionObj.bloques[b].texto || '').split(/\r?\n/).length
                    } else if (b === currentBlockIndex) {
                      targetCurrentLineGlobal += currentLineIndex
                      break
                    }
                  }

                  const distLineas = lineCountGlobal - targetCurrentLineGlobal
                  const opacidad = opacidadDeLinea(distLineas)
                  lineCountGlobal++

                  return (
                    <div
                      key={lIdx}
                      className="line"
                      data-block={bIdx}
                      data-line={lIdx}
                      style={{
                        fontSize,
                        opacity: opacidad,
                        margin: '16px 0',
                        lineHeight: 1.4,
                        transition: 'opacity 200ms'
                      }}
                    >
                      {renderFormattedLine(linea, lineStart, bloque.tramos)}
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

  type SpanGroup = {
    text: string
    attr: CharAttr
  }

  const spans: SpanGroup[] = []
  let currText = ''
  let currAttr: CharAttr | null = null

  for (let i = 0; i < linea.length; i++) {
    const a = attrs[i]
    if (
      !currAttr ||
      currAttr.esAcotacion !== a.esAcotacion ||
      currAttr.negrita !== a.negrita ||
      currAttr.color !== a.color
    ) {
      if (currText && currAttr) {
        spans.push({ text: currText, attr: currAttr })
      }
      currText = linea[i]
      currAttr = a
    } else {
      currText += linea[i]
    }
  }
  if (currText && currAttr) {
    spans.push({ text: currText, attr: currAttr })
  }

  return (
    <>
      {spans.map((sp, idx) => {
        if (sp.attr.esAcotacion) {
          return (
            <span
              key={idx}
              style={{
                opacity: 0.5,
                fontStyle: 'italic',
                color: '#aaa',
                margin: '0 2px',
                fontWeight: sp.attr.negrita ? 'bold' : 'normal'
              }}
            >
              {sp.text}
            </span>
          )
        }

        const style: React.CSSProperties = {}
        if (sp.attr.negrita) {
          style.fontWeight = 'bold'
        }
        if (sp.attr.color) {
          style.color = sp.attr.color
        }

        return (
          <span key={idx} style={Object.keys(style).length > 0 ? style : undefined}>
            {sp.text}
          </span>
        )
      })}
    </>
  )
}
