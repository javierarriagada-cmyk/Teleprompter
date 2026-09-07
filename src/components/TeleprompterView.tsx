import React, { useEffect, useRef } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'

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
  onEstadoAvanceChange
}: TeleprompterViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
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
            containerRef.current.scrollTop = Math.max(0, top)
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
          // Sin margen extra entre bloques: el ritmo vertical tiene que ser UNIFORME. Con
          // 24 px de margen, el paso entre parrafos era de 100.8 px contra 76.8 px entre
          // lineas, y ese excedente se recorria durante la ultima linea del parrafo: el
          // texto subia 31% mas rapido justo ahi, que es lo que se sentia brusco al pasar
          // de un parrafo a otro. Para separarlos a la vista va una linea en blanco en el
          // texto, que ocupa un renglon y se recorre a la misma velocidad que el resto.
          return (
            <div key={bloque.id || bIdx} className="block-container">
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
