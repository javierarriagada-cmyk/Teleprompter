import React, { useEffect, useRef } from 'react'
import { MotorDeAvance, EstadoModo } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { esCaracterApertura, esCaracterCierre } from '../lib/acotaciones'
import { agruparEnRenglones, indiceDeRenglon, pixelDePosicion, pixelDeRenglon, Renglon, MedidaToken } from '../lib/renglones'
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

// UN RENGLON DE HOLGURA ARRIBA, Y DOS HACIA ADELANTE.
//
// Este numero se movio tres veces y conviene tener la historia junta:
//
//   1, ventana de 3   el vivo al medio. Servia mientras la marca iba POR DELANTE del lector.
//                     Javier terminaba leyendo en la linea que se borraba.
//   0, ventana de 3   desde que el renglon lo manda la evidencia, la marca va un poco ATRAS
//                     -el reconocedor tarda unas decimas, y el ojo va delante de la voz-, asi
//                     que los dos claros tenian que quedar hacia adelante. Javier: "ahora se
//                     queda usualmente en el cuarto renglon".
//   0, ventana de 4   la ventana crecio a cuatro renglones. Javier, leyendo entero el 13 de
//                     septiembre de 2026: "reacciono bastante bien, pero hacia el final
//                     estaba leyendo en el primer renglon", que es el borde de arriba: cero
//                     holgura hacia atras.
//   1, ventana de 4   PUESTO el 14 de septiembre de 2026, despues de que el arreglo del area
//                     subir junto con el arreglo de la alineacion del area segura, y dos
//                     cambios a la vez no dejan saber cual fue. Javier: "dale con la 1, sube
//                     solo la alineacion". Queda como el proximo movimiento SI despues del
//                     arreglo sigue leyendo en el primer renglon.
//
// SI ESTE NUMERO SE VUELVE A MOVER CON UNA SOLA LECTURA, hay que parar y medir en vez de
// ajustar: tres lecturas distintas pueden pedir tres valores, y ahi estariamos afinando a
// una sesion y no a una regla.
export const MARGEN_RENGLONES_ARRIBA = 1

// Cuanto tarda la pantalla en pasar de un renglon al siguiente. Constante de tiempo de un
// acercamiento exponencial: con 70 ms, el renglon se recorre casi entero en unos 200.
export const MS_DESLIZAR = 70

// TOPBANDA SE RESTABA DOS VECES, Y ESO SACABA EL RENGLON VIVO DE LA VENTANA.
//
// El contenedor que hace scroll tiene paddingTop: topBanda (mas abajo, donde se arma).
// Ese padding existe para que la primera linea del guion arranque ya dentro de la ventana
// clara sin tener que desplazar nada.
//
// Pero origen es el offsetTop del primer token, y offsetTop SE MIDE DESDE EL BORDE DEL
// CONTENEDOR, asi que ya trae ese padding adentro. Restar topBanda otra vez aca desplaza de
// menos: el texto queda topBanda pixeles mas abajo de donde deberia.
//
// Medido el 13 de septiembre de 2026 montando el DOM de verdad en el navegador, con la
// palabra 144 del guion que leyo Javier -el renglon exacto donde reporto que se le escapa-:
//
//   pantalla 480, letra 24   la ventana clara va de y=190 a y=290
//                            el renglon vivo deberia caer en y=223 y caia en y=418
//                            = 5.8 renglones FUERA de la ventana
//   pantalla 720, letra 32   4.2 renglones fuera
//   pantalla 720, letra 40   3.1 renglones fuera
//
// Y explica por que "al principio se lee bien": al arrancar, este Math.max clava el scroll
// en 0, y con el padding el texto empieza JUSTO dentro de la ventana. El desfase aparece
// recien cuando el texto empieza a desplazarse, y de ahi no se va mas.
//
// Javier venia diciendo hace dos semanas que terminaba leyendo fuera de la zona marcada.
// Yo busque la causa en el motor: la posicion en palabras estaba bien todo el tiempo -0.13
// palabras de error en esa misma palabra 144-. El defecto estaba en la unica capa que nunca
// habia medido, entre la palabra y el pixel.
//
// ESTO NO LO AGARRABA NINGUNA PRUEBA porque T144 y T146 llaman a esta funcion con renglones
// inventados y nunca montan el contenedor con su padding: comprueban la formula contra si
// misma. La prueba que hace falta monta el DOM.
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
      // LA CUENTA VIVE EN UN SOLO LUGAR. Aca estaba repetida a mano, asi que la funcion
      // calcularScrollTop -la que miran las pruebas- no era la que corria en la pantalla.
      //
      // Y EL BLANCO ES EL PIXEL DEL RENGLON, NO EL INTERPOLADO. Con pixelDePosicion, decir
      // las cuatro palabras de un renglon desplazaba la pantalla un renglon entero repartido
      // desde la primera palabra: el renglon que se esta leyendo se iba subiendo mientras se
      // lo leia. Con pixelDeRenglon la pantalla se queda quieta durante todo el renglon y se
      // mueve una sola vez al cruzar al siguiente.
      // Y NO PASA DEL RENGLON DONDE ESTA LA ULTIMA PALABRA QUE SE OYO.
      //
      // avance.ts ya tiene este invariante escrito, y en mayusculas: "EL TEXTO NUNCA SE
      // MUESTRA MAS DE adelantoMaximo PALABRAS POR DELANTE DE LA ULTIMA PALABRA QUE EL
      // RECONOCEDOR UBICO EN EL GUION", con adelantoMaximo = 3. Se cumple siempre.
      //
      // El problema es la UNIDAD. Tres palabras de adelanto, con los 4.1 palabras por
      // renglon medidos en la lectura de Javier, son tres cuartos de renglon: si la ultima
      // palabra oida cae en cualquiera de las tres ultimas posiciones de un renglon -3 de
      // cada 4 palabras- la pantalla ya tiene permiso para estar en el siguiente. El tope se
      // respeta y el renglon se va igual.
      //
      // Aca se aplica el mismo tope en renglones: el renglon mostrado es el de la evidencia,
      // no el de la posicion estimada. Si no te oyo, no se mueve.
      //
      // El min con st.posicion NO es una precaucion de mas: durante el arranque de 7
      // palabras, y en silencio, y en DETENIDO, es posicion la que se queda quieta mientras
      // ultimoCalce sigue avanzando. Sin ese min, el texto se movia durante el arranque.
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

      // Y ESE CAMBIO SE DESLIZA, NO SALTA.
      //
      // El movimiento continuo se puso en su momento para matar los saltitos que Javier
      // reporto el primer dia -68% de los cuadros congelados y tirones entre medio-. Si el
      // desplazamiento cambia de golpe un renglon, vuelve eso.
      //
      // Aca el blanco cambia una vez por renglon y la pantalla lo alcanza con un acercamiento
      // exponencial: MS_DESLIZAR es la constante de tiempo, asi que un renglon se recorre en
      // algo mas de 200 ms. Regular, siempre igual, y sin parar en el medio.
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

      // LA TERCERA CAPA DEL CORPUS: que estaba mostrando la pantalla en este instante.
      //
      // diagnostico.ts define esta capa desde hace tiempo pero NADIE LA ESCRIBIA: se
      // guardaba lo que oyo el reconocedor y donde calzo el seguidor, y no lo unico que
      // el lector ve de verdad. Sin esta linea no hay con que hacer la resta que mide el
      // motor -posicion mostrada menos posicion realmente dicha-, que es el numero del
      // paso 2 del plan.
      //
      // Va aca, DESPUES de calcular top y ANTES de escribirlo, para que quede anotado el
      // mismo valor que se dibuja. No cuesta nada mientras el diagnostico este apagado:
      // anotar() devuelve en la primera linea si no esta activo.
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

  const bgBanda = isWhiteBg
    ? 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.03) 25%, rgba(0, 0, 0, 0.075) 50%, rgba(0, 0, 0, 0.03) 75%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.075) 50%, rgba(255, 255, 255, 0.03) 75%, transparent 100%)'

  const rgbFondo = hexToRgb(colorFondo)
  const bgVelo = calcularBgVelo(topBanda, filaPx, rgbFondo)

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
        // EL AREA SEGURA SE APLICA UNA SOLA VEZ, Y AQUI: A TODA LA SUPERFICIE DE LECTURA.
        //
        // La tarea 35 se la sumo al paddingTop del contenedor que hace scroll, que es solo el
        // TEXTO. La banda se dibuja en top: topBanda y el velo se calcula con topBanda, los
        // dos SIN area segura. Resultado: en un telefono con muesca o barra de estado, el
        // texto quedaba corrido hacia abajo respecto de la ventana clara por exactamente esos
        // pixeles -del orden de un renglon-, y el renglon vivo dejaba de caer donde la ventana
        // decia.
        //
        // Javier lo detecto comparando dos lecturas: "algo cambio de la lectura anterior, no
        // estaba subiendo a leer al primer renglon".
        //
        // Es la misma forma de error de todo este arreglo: DOS LUGARES CALCULANDO LA MISMA
        // POSICION Y UNO SOLO ACTUALIZADO. Igual que topBanda restado dos veces, que el tope
        // del motor en palabras mientras la pantalla iba en renglones, que el 90% multiplicado
        // por el margen.
        //
        // Poniendola aca, la banda, el velo y el texto se corren JUNTOS y siguen alineados.
        //
        // Va envuelta en calc() a proposito: jsdom descarta un env() suelto -lo deja en cadena
        // vacia- y adentro de calc() lo conserva. Es CSS valido igual y permite que la prueba
        // pueda comprobar que esta puesta.
        paddingTop: 'calc(env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(env(safe-area-inset-right, 0px))',
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

      {/* Velo de opacidad asimétrica según la distancia en renglones a la banda */}
      {altoContenedor > 0 && (
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
          // EL ULTIMO RENGLON TIENE QUE PODER LLEGAR A LA BARRA DE LECTURA.
          //
          // Decia calc(100% - ...), y LOS PORCENTAJES EN padding SE CALCULAN SOBRE EL ANCHO
          // del contenedor, no sobre el alto. En un telefono ese 100% son unos 400 px de
          // ancho y no los 700 y pico de alto que hacen falta: el mismo error de unidad que
          // el alto de pantalla clavado en 480.
          //
          // Javier lo reporto el 13 de septiembre de 2026 despues de leer el guion entero:
          // "cuando llegue al final del guion tuve que seguir leyendo hacia abajo y ya no
          // siguio subiendo, y es obvio por que se le acabo el texto que arrastrar".
          //
          // Cuanto hace falta reservar, exacto: para que el ultimo renglon aparezca a la
          // altura de la barra -que esta en topBanda + MARGEN_RENGLONES_ARRIBA renglones- el
          // desplazamiento tiene que poder llegar a (ultimoTop - origen) - margen. El tope
          // que permite el navegador es scrollHeight - alto del contenedor. Despejando queda
          // esto, y sale del alto MEDIDO, no de una constante.
          paddingBottom: `${Math.max(0, altoContenedor - topBanda - (MARGEN_RENGLONES_ARRIBA + 1) * filaPx)}px`,
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
            width: '100%',
            // EN COLUMNA ANGOSTA EL TEXTO VA CENTRADO.
            //
            // La caja ya estaba centrada -medido en la app publicada, pantalla de 375: 56 px
            // de hueco a cada lado- pero el texto adentro iba a la izquierda. Con renglones
            // de 22 caracteres la bandera derecha queda muy marcada y el bloque se lee
            // corrido. Javier, 13 de septiembre de 2026: "en angosta no esta centrado el
            // texto, sigue orientado desde la izquierda".
            //
            // Es lo habitual en un teleprompter: con el renglon corto, centrar mantiene el
            // ojo anclado en el medio, que es donde esta el lente de la camara.
            //
            // SOLO EN ANGOSTA. En ancho completo el renglon es largo y centrar ahi obliga a
            // buscar donde empieza cada linea.
            //
            // NO TOCA LA GEOMETRIA DE LA LECTURA: agruparEnRenglones y pixelDeRenglon miran
            // offsetTop, que es vertical. Centrar mueve el texto a lo ancho y nada mas.
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
