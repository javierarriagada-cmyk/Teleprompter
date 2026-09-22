import React, { useEffect, useRef, useState } from 'react'
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
import { IconoAtras, IconoEscena } from './IconosApp'
import { actualizarConfigCamara } from '../lib/camara'
import { App as CapacitorApp } from '@capacitor/app'
import { aplicarBrillo, PASOS_BRILLO, PasoBrillo, restaurarBrillo } from '../lib/brillo'

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
  // Punto rojo: GRABANDO VIDEO. No es isRecording del ASR.
  grabandoVideo?: boolean
  enPausa?: boolean
  camaraEncendida?: boolean
  ladoCamara?: 'frontal' | 'trasera'
  fondoToma?: FondoToma
  recuadroX?: number
  recuadroY?: number
  estadoToma?: 'listo' | 'leyendo'
  conCamara?: boolean
  setAnclajeZona?: (a: AnclajeZona) => void
  setMirror?: (v: boolean) => void
  mostrarTiempo?: boolean
  setMostrarTiempo?: (v: boolean) => void
  setFondoToma?: (f: FondoToma) => void
  setRecuadroX?: (x: number) => void
  setRecuadroY?: (y: number) => void
  calidadVideo?: string
  setCalidadVideo?: (q: string) => void
  calidadesSoportadas?: string[]
  minutosDisponibles?: number | null
  onVoltear?: () => void
  onEmpezar?: () => void
  onVolverListo?: () => void
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
  grabandoVideo = false,
  enPausa = false,
  camaraEncendida = false,
  ladoCamara = 'frontal',
  fondoToma = 'detras',
  recuadroX = 0.64,
  recuadroY = 0.52,
  estadoToma = 'leyendo',
  conCamara = false,
  setAnclajeZona,
  setMirror,
  mostrarTiempo = true,
  setMostrarTiempo,
  setFondoToma,
  setRecuadroX,
  setRecuadroY,
  calidadVideo = '1080p',
  setCalidadVideo,
  calidadesSoportadas = [],
  minutosDisponibles = null,
  onVoltear,
  onEmpezar,
  onVolverListo,
  onToggleControles,
  onNavegacionManual,
  onModoManualChange,
  onEstadoAvanceChange
}: TeleprompterViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [brillo, setBrillo] = useState<PasoBrillo>('automatico')

  // EL BRILLO SE DEVUELVE AL SISTEMA EN LOS DOS CAMINOS DE SALIDA, NO EN UNO.
  //
  // Al desmontar el lienzo, que es salir por la puerta. Y AL IRSE A SEGUNDO
  // PLANO, que no desmonta nada: si entra una llamada o se cambia de
  // aplicacion con el brillo en Alto, la pantalla se queda encendida a tope en
  // otra parte y gastando bateria, sin que nadie entienda por que.
  //
  // Al volver se repone el paso elegido, porque la persona no abandono la toma:
  // la interrumpieron. Si volviera en automatico, tendria que acordarse de
  // ajustarlo otra vez justo cuando retoma.
  useEffect(() => {
    const sub: any = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) restaurarBrillo()
      else if (brillo !== 'automatico') aplicarBrillo(brillo)
    })
    return () => {
      try {
        if (sub && typeof sub.then === 'function') sub.then((s: any) => s.remove())
        else if (sub && typeof sub.remove === 'function') sub.remove()
      } catch (e) {}
    }
  }, [brillo])

  useEffect(() => {
    return () => {
      restaurarBrillo()
    }
  }, [])

  const modoManualRef = useRef(false)
  const finManualRef = useRef<number | null>(null)
  const [textoEstadoLector, setTextoEstadoLector] = React.useState<string | null>(null)
  const [arrastrandoRecuadro, setArrastrandoRecuadro] = React.useState(false)
  const [panelTomaAbierto, setPanelTomaAbierto] = React.useState(false)
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
  const [anchoContenedor, setAnchoContenedor] = React.useState<number>(0)
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
    setAnchoContenedor(container.clientWidth || 0)
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
    if (!conCamara) return
    actualizarConfigCamara({
      fondoToma,
      recuadroX,
      recuadroY,
      vistaW: anchoContenedor || (typeof window !== 'undefined' ? window.innerWidth : 360),
      vistaH: altoContenedor || (typeof window !== 'undefined' ? window.innerHeight : 640)
    })
  }, [conCamara, fondoToma, recuadroX, recuadroY, anchoContenedor, altoContenedor])

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
      data-estado-toma={estadoToma}
      data-con-camara={conCamara ? 'si' : 'no'}
      data-columna={columnaAngosta ? 'angosta' : 'completo'}
      data-fondo={colorFondo}
      data-letra={colorTextoEfectivo}
      onClick={() => {
        if (estadoToma !== 'leyendo') return
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
        background: (camaraEncendida && (fondoToma === 'detras' || fondoToma === 'recuadro')) ? 'transparent' : colorFondo,
        color: colorTextoEfectivo,
        fontFamily: fontFamilyCss,
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >

      {/* Recuadro chico de cámara */}
      {camaraEncendida && fondoToma === 'recuadro' && (
        <RecuadroCamara
          modoCamara={ladoCamara}
          recuadroX={recuadroX}
          recuadroY={recuadroY}
          colorFondo={colorFondo}
          arrastrable={estadoToma === 'listo'}
          onChangePosicion={(x, y) => {
            setRecuadroX?.(x)
            setRecuadroY?.(y)
          }}
          onArrastrandoChange={setArrastrandoRecuadro}
        />
      )}

      {/* PUNTO ROJO: GRABANDO VIDEO, no "el motor esta escuchando".
          Hasta la tarea 64 este punto lo encendia isRecording, que viene del
          reconocedor de voz -src/hooks/useASR.ts- y quiere decir que el motor
          esta oyendo. Osea que se prendia cada vez que se leia, hubiera camara
          o no, y B14 dice que el punto rojo es GRABANDO. Ahora lo enciende
          grabandoVideo, que solo es cierto despues de la cuenta regresiva y si
          el grabador arranco de verdad. */}
      {grabandoVideo && (
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

      {/* El cartel del motor ("Detenido") no pertenece a esta pantalla.
          El que lee mira el lente. textoEstadoLector se sigue calculando
          por si el diagnostico lo quiere; no se pinta encima del renglon. */}

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
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          // EN LISTO EL TEXTO NO RECIBE EL DEDO, Y ES POR EL RECUADRO.
          //
          // RecuadroCamara vive en zIndex 0 -tiene que estar debajo para que se
          // vea la camara nativa, RecuadroCamara.tsx:176-. Esta capa esta en 1.
          // Si ademas recibe punteros, se traga el pointerdown y el recuadro no
          // se entera: deja de seguir al dedo.
          //
          // PrepararView tenia pointerEvents 'none' fijo y por eso el arrastre
          // andaba -medido en la tarea 59: de 260,289 a 55,511-. Al mudar el
          // chrome aca en la 66 se perdio, porque en LEYENDO esta capa SI
          // necesita los punteros para la navegacion manual, que PrepararView
          // no tenia. Javier lo vio en el telefono: "el recuadro ya no sigue al
          // dedo".
          //
          // Entonces depende del estado, no es un valor fijo: en LISTO el texto
          // es una vista previa y nadie lo navega; en LEYENDO manda el gesto.
          pointerEvents: estadoToma === 'listo' ? 'none' : 'auto'
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

      {estadoToma === 'listo' && (
        <>
          <button
            data-testid="btn-volver-listo"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onVolverListo?.()
            }}
            aria-label="Volver"
            style={{
              position: 'absolute',
              top: 'calc(8px + env(safe-area-inset-top, 0px))',
              left: 'calc(8px + env(safe-area-inset-left, 0px))',
              zIndex: 10,
              width: 32,
              height: 32,
              padding: 0,
              cursor: 'pointer',
              backgroundColor: 'var(--bg-superficie)',
              border: '1px solid var(--color-borde)',
              borderRadius: 'var(--redondeo-pildora)',
              color: 'var(--color-texto)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconoAtras />
          </button>

          {conCamara && (
            <button
              data-testid="btn-voltear-camara"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onVoltear?.()
              }}
              aria-label="Voltear cámara"
              style={{
                position: 'absolute',
                top: 'calc(8px + env(safe-area-inset-top, 0px))',
                right: 'calc(8px + env(safe-area-inset-right, 0px))',
                zIndex: 10,
                width: 40,
                height: 40,
                padding: 0,
                cursor: 'pointer',
                backgroundColor: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 'var(--redondeo-pildora)',
                color: '#fff',
                fontSize: 16
              }}
            >
              ⟳
            </button>
          )}

          <div
            data-testid="panel-controles-listo"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              left: 'calc(16px + env(safe-area-inset-left, 0px))',
              right: 'calc(16px + env(safe-area-inset-right, 0px))',
              zIndex: 10,
              display: arrastrandoRecuadro ? 'none' : 'flex',
              flexDirection: 'column',
              gap: 'var(--aire-3)',
              backgroundColor: 'var(--bg-superficie)',
              border: '1px solid var(--color-borde)',
              borderRadius: 'var(--redondeo-grande)',
              padding: 'var(--aire-3)',
              color: 'var(--color-texto)'
            }}
          >
            {conCamara && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--aire-3)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)' }}>
                  <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', fontWeight: 600 }}>
                    Imagen:
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--aire-1)' }}>
                    {[
                      { val: 'detras' as const, label: 'Detrás' },
                      { val: 'recuadro' as const, label: 'Recuadro' },
                      { val: 'oculta' as const, label: 'Oculta' }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        data-testid={`btn-fondo-${opt.val}`}
                        className="btn-deformable"
                        onClick={() => {
                          setFondoToma?.(opt.val)
                        }}
                        style={{
                          padding: 'var(--aire-1) var(--aire-2)',
                          fontSize: 'var(--texto-meta)',
                          borderRadius: 'var(--redondeo-pildora)',
                          border: '1px solid var(--color-borde)',
                          backgroundColor: fondoToma === opt.val ? 'var(--color-acento)' : 'var(--bg-suelo)',
                          color: fondoToma === opt.val ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                          fontWeight: fondoToma === opt.val ? 'bold' : 'normal',
                          cursor: 'pointer'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {calidadesSoportadas.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)' }}>
                      <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', fontWeight: 600 }}>
                        Calidad:
                      </span>
                      <div style={{ display: 'flex', gap: 'var(--aire-1)' }}>
                        {calidadesSoportadas.map((q) => (
                          <button
                            key={q}
                            type="button"
                            data-testid={`btn-calidad-${q}`}
                            className="btn-deformable"
                            onClick={() => {
                              setCalidadVideo?.(q)
                            }}
                            style={{
                              padding: 'var(--aire-1) var(--aire-2)',
                              fontSize: 'var(--texto-meta)',
                              borderRadius: 'var(--redondeo-pildora)',
                              border: '1px solid var(--color-borde)',
                              backgroundColor: calidadVideo === q ? 'var(--color-acento)' : 'var(--bg-suelo)',
                              color: calidadVideo === q ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                              fontWeight: calidadVideo === q ? 'bold' : 'normal',
                              cursor: 'pointer'
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                    {typeof minutosDisponibles === 'number' && (
                      <div
                        data-testid="linea-minutos-disponibles"
                        style={{
                          fontSize: 'var(--texto-meta)',
                          color: minutosDisponibles < 2 ? '#FF5A5A' : 'var(--color-apagado)',
                          fontWeight: minutosDisponibles < 2 ? 700 : 400
                        }}
                      >
                        {minutosDisponibles >= 2
                          ? `Te alcanzan unos ${Math.floor(minutosDisponibles)} minutos`
                          : 'Quedan menos de 2 minutos de espacio'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {conCamara && fondoToma === 'oculta' && (
              <div
                data-testid="aviso-camara-encendida"
                style={{
                  fontSize: 'var(--texto-meta)',
                  color: 'var(--color-apagado)',
                  fontStyle: 'italic'
                }}
              >
                la cámara sigue encendida
              </div>
            )}

            {panelTomaAbierto && (
              <div data-testid="panel-ajustes-toma" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', fontWeight: 600 }}>
                    Dónde lees:
                  </span>
                  {(['arriba', 'medio', 'abajo'] as const).map((z) => (
                    <button
                      key={z}
                      type="button"
                      data-testid={`btn-anclaje-${z}`}
                      onClick={() => {
                        setAnclajeZona?.(z)
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)', fontSize: 'var(--texto-meta)' }}>
                  <input
                    type="checkbox"
                    checked={mirror}
                    onChange={(e) => setMirror?.(e.target.checked)}
                  />
                  Espejo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)', fontSize: 'var(--texto-meta)' }}>
                  <input
                    type="checkbox"
                    checked={mostrarTiempo}
                    onChange={(e) => setMostrarTiempo?.(e.target.checked)}
                  />
                  Mostrar tiempo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', fontWeight: 600 }}>
                    Brillo:
                  </span>
                  {PASOS_BRILLO.map((paso) => (
                    <button
                      key={paso.id}
                      type="button"
                      data-testid={`btn-brillo-${paso.id}`}
                      onClick={() => {
                        setBrillo(paso.id)
                        aplicarBrillo(paso.id)
                      }}
                      style={{
                        padding: 'var(--aire-1) var(--aire-2)',
                        fontSize: 'var(--texto-meta)',
                        borderRadius: 'var(--redondeo-pildora)',
                        border: '1px solid var(--color-borde)',
                        backgroundColor: brillo === paso.id ? 'var(--color-acento)' : 'var(--bg-suelo)',
                        color: brillo === paso.id ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                        fontWeight: brillo === paso.id ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {paso.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
              <button
                data-testid="btn-engranaje-toma"
                type="button"
                onClick={() => setPanelTomaAbierto((v) => !v)}
                aria-label="Ajustes de la escena"
                style={{
                  width: 44,
                  padding: 'var(--aire-3)',
                  borderRadius: 'var(--redondeo-pildora)',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: panelTomaAbierto ? 'var(--color-acento)' : 'var(--bg-suelo)',
                  color: panelTomaAbierto ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconoEscena tamano={18} />
              </button>
              <button
                data-testid="btn-empezar-toma"
                type="button"
                className="btn-deformable"
                onClick={() => {
                  onEmpezar?.()
                }}
                style={{
                  flex: 1,
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
        </>
      )}
    </div>
  )
}

