import React, { useEffect, useRef, useState } from 'react'
import { MotorDeAvance, EstadoModo } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { agruparEnRenglones, indiceDeRenglon, Renglon, MedidaToken } from '../lib/renglones'
import { renderFormattedLine } from './renglones'
import { anotar, diagnosticoActivo, generacionDiagnostico } from '../lib/diagnostico'
import { anclaCompensada, crearCompensacion } from '../lib/compensacion'
import { palabrasDelDestacado, segmentosDelDestacado, CajaPalabra } from '../lib/destacado'

// CERO DESDE EL 24-09-2026, MEDIDO. Era 2, puesto con el motor WASM -tarea 36-: el
// renglon vivo no pasaba al siguiente hasta que el motor llevaba 2 palabras adentro.
// Con el reconocedor nativo, en dos tomas de Javier -letra 18 columna completa, y
// letra 24 columna angosta-, eso dejaba el renglon vivo atras de la posicion del
// motor el 41% y el 52% del tiempo, encima de las 2 a 4 palabras que el motor ya va
// atras de la voz. Repetido sobre esas mismas tomas -scratchpad simtrabado.mjs, que
// reproduce exacto lo grabado con 2-:
//
//                          donde se lee (objetivo: renglon 2)
//   columna completa  2 ->  2: 26%  3: 74%
//                     0 ->  2: 64%  3: 35%
//   columna angosta   2 ->  2: 6%  3: 41%  4: 48%  5: 5%
//                     0 ->  2: 19%  3: 62%  4: 18%
//
// Y sin un solo salto hacia atras ni un cambio de renglon de mas: la proteccion ya
// la da el seguidor -3 palabras seguidas para ubicar- y conduccion.ts, que no deja
// pasar del renglon siguiente.
export const PALABRAS_DE_SEGURIDAD = 0

// El panel de la ventana de lectura -solo con la camara detras-: cuanto tapa,
// y cuanto se sale de la columna a cada lado.
export const ALPHA_PANEL_LECTURA = 0.45
export const MARGEN_PANEL_PX = 14

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

import { AnclajeZona, calcularBanda, calcularBgVelo, calcularTramosVelo } from './banda'
import { RecuadroCamara } from './RecuadroCamara'
import { FondoToma } from '../App'
import {
  IconoAtras, IconoEngranaje, IconoEmpezar, IconoVoltear, IconoImagenDetras, IconoImagenRecuadro,
  IconoImagenOculta, IconoFranja, IconoEspejo, IconoReloj, IconoSol
} from './IconosApp'
import { movimientoApagado, MS_CHICO, MS_PANEL, CURVA_RESORTE } from './movimiento'
import { familiaLectura, colorLetraEfectiva, columnaLectura, INTERLINEADO_LECTURA, MARGEN_RENGLON_LECTURA_PX } from './estiloLectura'
import { actualizarConfigCamara } from '../lib/camara'
import { App as CapacitorApp } from '@capacitor/app'
import { aplicarBrillo, leerBrilloSistema, restaurarBrillo, BRILLO_MINIMO } from '../lib/brillo'
import { SelectorLetra, SelectorAncho } from './ControlesAa'

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
//   0.5, ventana de 4   PUESTO el 24 de septiembre de 2026, MEDIDO y no con una lectura.
//                     Con el motor ya pegado a la voz -oido propio, relevo del microfono,
//                     compensacion: 1,5 palabras de atraso- Javier leia en el renglon 2 o 3
//                     y lo que pide es "el final del primero y el segundo": lo mas cerca del
//                     lente. Repetido sobre cuatro tomas reales en las VEINTE combinaciones
//                     de letra -14 a 42, serif y sans- y columna -completa y angosta-, con
//                     los renglones medidos en su telefono -teleprom/02-lecturas/motor-24-sep,
//                     matriz.mjs-. Final del renglon 1 o renglon 2 de la ventana:
//
//                       palabras por renglon   con 1        con 0.5
//                       6 a 9                  78-86%       99%
//                       4 a 5                  67-74%       97-98%
//                       ~3,5                   61%          91%
//                       2,5 a 3,3 (letra 42)   43-57%       80-91%
//
//                     Pantalla ADELANTADA -la persona en el renglon de arriba del vivo- 0 a
//                     2% en todas: son la pausa despues de la ultima palabra de un renglon,
//                     cuando la pantalla ya paso al siguiente. El renglon que queda cortado a
//                     medias arriba es el que se acaba de terminar.
//
//                     Un solo numero para todas las combinaciones, a proposito: Javier no
//                     quiere reglas por version, el motor se tiene que adaptar solo. Lo que
//                     falta en los renglones cortos se gana bajando el atraso en PALABRAS.
//
//   0.25, ventana de 4  PUESTO el 24 de septiembre de 2026, a prueba. Javier leyo tres tomas
//                     con 0.5 -letra 18 completa, 24 y 32 angosta-: 100%, 92% y 91% en la zona,
//                     tal como predijo la matriz, ningun adelanto a mitad de renglon, y "quizas
//                     se debe ajustar mas". Con siete tomas y los mismos renglones, renglon 1 /
//                     2 / 3 o mas de la ventana:
//
//                                          0.5           0.25          0
//                       letra 18 completa  34/66/0       58/42/0       79/21/0
//                       angosta 24         19/75/7       38/61/2       62/38/0
//                       letra 42 completa  17/65/18      30/59/11      45/49/7
//
//                     0 deja sin nada visible arriba del renglon que se lee -y en la pausa de
//                     fin de renglon, el recien terminado desaparece entero-. 0.25 gana donde
//                     falta y conserva un cuarto de renglon hacia atras. Si Javier lo siente
//                     bien, el siguiente paso es 0.
//
//   0, ventana de 4     PUESTO el 24 de septiembre de 2026, a prueba. Con 0.25 Javier leyo letra
//                     14 y 24 completa y 32 angosta; "en la letra pequena pude visualizar estar
//                     en varios momentos en el renglon tercero". Y es cierto: medido por
//                     RENGLONES ENTEROS -no por avance dentro del renglon, que fue mi error en
//                     la tabla de 0.25: mezcle lo que se avanza a lo ancho con la altura-, la voz
//                     esta en el renglon de ABAJO del vivo el 16% del tiempo con letra 14, 36%
//                     con 24 completa y 29% con 32 angosta. Y el ojo va delante de la voz. Con
//                     0 el renglon vivo es el primero de la ventana: todo sube un cuarto de
//                     renglon mas. Lo que NO cambia es cuanto tiempo se esta en el renglon de
//                     abajo del vivo: eso se baja con menos atraso en palabras.
//
export const MARGEN_RENGLONES_ARRIBA = 0

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
  camaraEncendida?: boolean
  fondoToma?: FondoToma
  recuadroX?: number
  recuadroY?: number
  estadoToma?: 'listo' | 'leyendo'
  conCamara?: boolean
  setAnclajeZona?: (a: AnclajeZona) => void
  setMirror?: (v: boolean) => void
  // Tamano y ancho tambien en el cajon de la toma -27-09-2026-: ver ControlesAa.tsx.
  onLetraMenos?: () => void
  onLetraMas?: () => void
  setColumnaAngosta?: (v: boolean) => void
  setMarginPercent?: (v: number) => void
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
  camaraEncendida = false,
  fondoToma = 'detras',
  recuadroX = 0.64,
  recuadroY = 0.52,
  estadoToma = 'leyendo',
  conCamara = false,
  setAnclajeZona,
  setMirror,
  onLetraMenos,
  onLetraMas,
  setColumnaAngosta,
  setMarginPercent,
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
  // null = automatico: el brillo es el del sistema hasta que se toca la barra.
  const [brillo, setBrillo] = useState<number | null>(null)
  const [brilloSistema, setBrilloSistema] = useState<number | null>(null)

  // EL BRILLO SE DEVUELVE AL SISTEMA EN LOS DOS CAMINOS DE SALIDA, NO EN UNO.
  //
  // Al desmontar el lienzo, que es salir por la puerta. Y AL IRSE A SEGUNDO
  // PLANO, que no desmonta nada: si entra una llamada o se cambia de
  // aplicacion con el brillo en Alto, la pantalla se queda encendida a tope en
  // otra parte y gastando bateria, sin que nadie entienda por que.
  //
  // Al volver se repone el brillo elegido, porque la persona no abandono la toma:
  // la interrumpieron. Si volviera en automatico, tendria que acordarse de
  // ajustarlo otra vez justo cuando retoma.
  useEffect(() => {
    const sub: any = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) restaurarBrillo()
      else if (brillo !== null) aplicarBrillo(brillo)
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
  const [arrastrandoRecuadro, setArrastrandoRecuadro] = React.useState(false)
  const [panelTomaAbierto, setPanelTomaAbierto] = React.useState(false)
  // Arrastre del cajon de la toma hacia abajo, para cerrarlo -como el Aa-.
  const [arrastreCajonToma, setArrastreCajonToma] = React.useState(0)
  const arrastrandoCajonTomaRef = useRef(false)
  const inicioArrastreCajonTomaRef = useRef<number | null>(null)
  // La barra de brillo parte del brillo que tiene la pantalla ahora.
  useEffect(() => {
    if (!panelTomaAbierto || brillo !== null) return
    let vivo = true
    leerBrilloSistema().then((v) => { if (vivo) setBrilloSistema(v) })
    return () => { vivo = false }
  }, [panelTomaAbierto, brillo])

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
  // Donde esta la columna de texto, a lo ancho: el panel de la ventana de
  // lectura va detras de ella cuando el texto esta sobre la camara.
  const [columnaX, setColumnaX] = React.useState<{ izquierda: number; ancho: number } | null>(null)
  const { topBanda, altoBanda } = altoContenedor > 0
    // ARRIBA, SIN HOLGURA -24-09-2026-. Eran 20 px entre el borde de arriba del texto y
    // la ventana. Ver REFERENCIA DEL RENGLON VIVO, en el lazo.
    ? calcularBanda(altoContenedor, filaPx, lineasZona, anclajeZona, 0, 20, altoLineaViva)
    : { topBanda: 0, altoBanda: 0 }

  const isWhiteBg = colorFondo.toUpperCase() === '#FFFFFF'
  const colorTextoEfectivo = colorLetraEfectiva(colorFondo, colorLetra)
  const fontFamilyCss = familiaLectura(tipoFuente)

  const renglonesRef = useRef<Renglon[]>([])
  // En que encendido del registro se anotaron los renglones. La toma lo enciende
  // DESPUES de que la vista midio sus renglones -el video empieza con la lectura-,
  // asi que el lazo los vuelve a anotar la primera vez que lo ve encendido.
  const renglonesAnotadosRef = useRef<number>(-1)
  const origenRef = useRef<number>(0)
  const scrollSuaveRef = useRef<number | null>(null)
  const renglonTrabadoRef = useRef<number | null>(null)
  // La compensacion de la demora del reconocedor -lib/compensacion.ts-.
  const compensacionRef = useRef(crearCompensacion())
  // EL DESTACADO DE LECTURA -lib/destacado.ts-. Tres capsulas -una por renglon; con la regla
  // de 4 a 6 palabras se usan a lo sumo dos- que el lazo mueve tocando su estilo directo: la
  // vista entera no se vuelve a dibujar en cada palabra. clave evita medir si nada cambio.
  const capsulasRef = useRef<Array<HTMLDivElement | null>>([null, null, null])
  const destacadoPrevRef = useRef<{ clave: string; renglones: Renglon[] | null }>({ clave: '', renglones: null })
  const estadoTomaRef = useRef(estadoToma)
  estadoTomaRef.current = estadoToma
  const ultimoCuadroRef = useRef<number | null>(null)

  const recalcularGeometria = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const alto = container.clientHeight || 0
    setAltoContenedor(alto)
    setAnchoContenedor(container.clientWidth || 0)
    const columna = container.querySelector('[data-testid="columna-texto"]') as HTMLElement | null
    if (columna && columna.offsetWidth > 0) {
      setColumnaX({ izquierda: columna.offsetLeft, ancho: columna.offsetWidth })
    }
    const els = container.querySelectorAll('[data-token]')
    const medidas: MedidaToken[] = Array.from(els).map(el => ({
      token: Number((el as HTMLElement).dataset.token),
      top: (el as HTMLElement).offsetTop
    }))
    const r = agruparEnRenglones(medidas, filaPx)
    renglonesRef.current = r
    // Para medir el atraso en RENGLONES y no solo en palabras -24-09-2026-: el primer
    // token de cada renglon. No cuesta nada con el registro apagado.
    anotar({ tipo: 'renglones', inicios: r.map((x) => x.desdeToken) })
    renglonesAnotadosRef.current = generacionDiagnostico()
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
      // El renglon vivo esta en scrollTop + topBanda + MARGEN_RENGLONES_ARRIBA renglones
      // -REFERENCIA DEL RENGLON VIVO, en el lazo-. Era origen + un renglon, de cuando el
      // margen era 1 y el vivo se media desde el primer token.
      void origen
      const buscado = cont.scrollTop + topBanda + MARGEN_RENGLONES_ARRIBA * filaPx

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
  // topBanda: tokenEnLaBanda la usa desde el 24-09-2026; con anclaje medio o abajo cambia al medir.
  }, [onNavegacionManual, onModoManualChange, alturaLineaPx, onToggleControles, filaPx, topBanda])

  useEffect(() => {
    if (!motorAvance) return

    let animId: number
    const animate = () => {
      const tAhora = performance.now()
      const st = motorAvance.estadoEn(tAhora)
      if (onEstadoAvanceChange) {
        onEstadoAvanceChange(st.motivoFreno, st.avanzando, st.estado)
      }

      // -24-09-2026: aca se calculaba textoEstadoLector -"En pausa", "Detenido"- con un
      // setState en cada cuadro, para un cartel que ya no se pinta -ver el comentario del
      // cartel del motor, mas abajo-. Se saco: cada cambio redibujaba la vista entera. Y
      // tInicioBuscandoRef, que solo se escribia.

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
      //
      // -24-09-2026: y mientras SIGUE, se le suma lo que la persona alcanza a decir en la
      // demora medida del reconocedor -lib/compensacion.ts, con las cifras-. En el
      // arranque, en silencio y en DETENIDO no hay compensacion: queda el min de siempre.
      if (modoManualRef.current) compensacionRef.current = crearCompensacion()
      const anclaRenglon = anclaCompensada(compensacionRef.current, {
        posicion: st.posicion,
        ultimoCalce: st.ultimoCalce,
        siguiendo: st.estado === 'SIGUIENDO' && st.motivoFreno === null,
        tMs: tAhora
      })
      const idxAncla = indiceDeRenglon(renglones, anclaRenglon)
      if (modoManualRef.current) renglonTrabadoRef.current = null
      renglonTrabadoRef.current = avanzarTrabado(
        renglonTrabadoRef.current,
        idxAncla,
        anclaRenglon,
        renglones
      )
      const renglonTrabado = renglones[renglonTrabadoRef.current]
      // REFERENCIA DEL RENGLON VIVO: topBanda, NO origen -24-09-2026, visto en el telefono-.
      //
      // origen es donde descansa el primer token, y trae adentro el paddingTop -topBanda,
      // 20 px- MAS el margen de 16 px de la primera linea. Restarlo dejaba el renglon vivo
      // 36 px por debajo del borde de arriba del texto, SIEMPRE, con cualquier letra. Con
      // la camara detras no hay velo, asi que en esos 36 px se ven los renglones ya leidos:
      // con letra 14 -19,6 px por renglon- casi dos. Grabando la pantalla de Javier con
      // letra 14, cuando decia "que nunca vamos a poder superar" ese renglon era el TERCERO
      // de arriba, y el dijo "la regla general fue el tercer renglon". Con letra 42 los 36
      // px no alcanzan a un renglon: por eso la letra grande andaba mejor y la chica no.
      //
      // Con topBanda de referencia el vivo cae exactamente en topBanda + MARGEN renglones
      // del borde de arriba, que es lo que dice posicionEnPantalla. Y topBanda arriba es 0.
      void origen
      const topObjetivo = calcularScrollTop(
        renglonTrabado ? renglonTrabado.top : 0,
        topBanda,
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
      if (diagnosticoActivo() && renglonesAnotadosRef.current !== generacionDiagnostico() && renglonesRef.current.length > 0) {
        anotar({ tipo: 'renglones', inicios: renglonesRef.current.map((x) => x.desdeToken) })
        renglonesAnotadosRef.current = generacionDiagnostico()
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

      // EL DESTACADO DE LECTURA -lib/destacado.ts-: desde la posicion del motor, N palabras
      // hacia adelante. Solo leyendo. Si el motor perdio el hilo -sin calce- queda tenue: no
      // puede afirmar "aqui estas" con la misma fuerza.
      {
        const cont = containerRef.current
        const leyendo = estadoTomaRef.current === 'leyendo'
        const n = palabrasDelDestacado(tokensRef.current.length / Math.max(1, renglones.length))
        const inicio = Math.max(0, Math.floor(st.posicion))
        const alfa = !leyendo ? 0 : st.motivoFreno === 'sin-calce' ? 0.35 : 1
        const clave = `${alfa}|${inicio}|${n}|${filaPx}`
        const previo = destacadoPrevRef.current
        if (cont && (clave !== previo.clave || previo.renglones !== renglones)) {
          previo.clave = clave
          previo.renglones = renglones
          const cajas: CajaPalabra[] = []
          for (let i = inicio; i < Math.min(tokensRef.current.length, inicio + n); i++) {
            const el = cont.querySelector(`[data-token="${i}"]`) as HTMLElement | null
            if (el) cajas.push({ izquierda: el.offsetLeft, arriba: el.offsetTop, ancho: el.offsetWidth, alto: el.offsetHeight })
          }
          const segs = alfa > 0 ? segmentosDelDestacado(cajas) : []
          // Un poco mas ancha que las palabras, como un resaltador: el aire es del tamano de la
          // letra, asi se ve igual con cualquier letra.
          //
          // -24-09-2026: ahora es una LINEA bajo las palabras -lib/destacado.ts, arriba-. El
          // grosor va con la letra -2 px con letra 14, casi 4 con letra 42- y la linea cae al
          // pie de la caja de la palabra, bajo las letras.
          const letra = filaPx / 1.4
          const aireX = letra * 0.04
          const grosor = Math.max(2, letra * 0.09)
          // CADA LINEA SE QUEDA EN SU RENGLON -24-09-2026-. Se asignaban por orden: la primera
          // linea al primer renglon de la ventana. Al pasar la ventana al renglon siguiente, la
          // linea del renglon viejo cruzaba en diagonal al nuevo y la que ya estaba en el nuevo
          // se apagaba. Javier: "aparecen en el nuevo renglon aproximadamente desde la mitad, eso
          // le quita un poco el efecto de deslizamiento". Ahora cada linea recuerda su renglon
          // -data-renglon, su arriba- y lo sigue: la del renglon nuevo solo se alarga, y la del
          // viejo se encoge hacia el final de su renglon mientras se apaga.
          const caps = capsulasRef.current.filter((c): c is HTMLDivElement => c !== null)
          const usadas = new Set<HTMLDivElement>()
          const asignada = new Map<number, HTMLDivElement>()
          for (let k = 0; k < segs.length; k++) {
            const enSuRenglon = caps.find((c) => !usadas.has(c) && c.style.opacity !== '0' && c.style.opacity !== '' && Number(c.dataset.renglon) === segs[k].arriba)
            if (enSuRenglon) { usadas.add(enSuRenglon); asignada.set(k, enSuRenglon) }
          }
          for (let k = 0; k < segs.length; k++) {
            if (asignada.has(k)) continue
            const libre = caps.find((c) => !usadas.has(c) && (c.style.opacity === '0' || c.style.opacity === ''))
              || caps.find((c) => !usadas.has(c))
            if (libre) { usadas.add(libre); asignada.set(k, libre) }
          }
          for (const c of caps) {
            if (usadas.has(c)) continue
            if (c.style.opacity !== '0' && c.style.opacity !== '') {
              // Se va: se encoge hacia el final de su renglon y se apaga.
              const izq = parseFloat(c.style.left) || 0
              const ancho = parseFloat(c.style.width) || 0
              c.style.left = `${izq + ancho}px`
              c.style.width = '0px'
            }
            c.style.opacity = '0'
          }
          asignada.forEach((c, k) => {
            const s = segs[k]
            // Una capsula que estaba apagada aparece DONDE va, sin barrer desde su lugar viejo.
            // Y nace desde el comienzo de su tramo, con ancho cero, para crecer hacia adelante.
            const estabaApagada = c.style.opacity === '' || c.style.opacity === '0'
            const transicion = c.style.transition
            if (estabaApagada) {
              c.style.transition = 'none'
              c.style.left = `${s.izquierda - aireX}px`
              c.style.top = `${s.arriba + s.alto - grosor / 2}px`
              c.style.width = '0px'
              void c.offsetWidth
              c.style.transition = transicion
            }
            c.dataset.renglon = String(s.arriba)
            c.style.left = `${s.izquierda - aireX}px`
            c.style.top = `${s.arriba + s.alto - grosor / 2}px`
            c.style.width = `${s.ancho + 2 * aireX}px`
            c.style.height = `${grosor}px`
            c.style.borderRadius = `${grosor / 2}px`
            c.style.opacity = String(alfa)
          })
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  // altoContenedor TAMBIEN -24-09-2026-: el lazo solo escribe el scroll con altoContenedor > 0,
  // y hasta hoy se enteraba de rebote, porque al medirse el contenedor cambiaba topBanda -de 0
  // a 20- y eso rehacia el lazo. Con topBanda 0 arriba ya no cambia, y el texto no se movia:
  // lo agarraron T158 y T170.
  }, [motorAvance, onEstadoAvanceChange, topBanda, filaPx, diagnostico, recalcularGeometria, altoContenedor])

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
          el grabador arranco de verdad.
          24-09-2026: ARRIBA A LA DERECHA, AL LADO DE LA PAUSA. Estaba a 16 px de
          la esquina y el boton de pausa -la esquina de 40, App.tsx- lo tapaba
          cada vez que aparecian los controles: pendiente B22. Primero lo movi
          arriba al centro, bajo el lente, y el dueno lo corrigio: "su posicion es
          arriba a la derecha". Queda en la esquina, a la izquierda de la pausa y
          alineado con su centro: siempre a la vista, esten o no los controles.
          Y es el rojo de grabar de la aplicacion, no uno parecido. */}
      {grabandoVideo && (
        <div
          data-testid="punto-grabando"
          className="punto-grabando"
          style={{
            // La pausa: top 8, right 8, 40 x 40. El punto de 10 va a su izquierda,
            // 12 px de aire, con el centro a la misma altura: 8 + 20 - 5.
            top: 'calc(23px + env(safe-area-inset-top, 0px))',
            right: 'calc(60px + env(safe-area-inset-right, 0px))'
          }}
          title="Grabando"
        />
      )}

      {/* Overlay Visual de la Banda de Lectura (Luz/Sombra degradado).
          Tampoco con la camara detras: seria una tercera capa sobre el panel. */}
      {altoContenedor > 0 && !textoSobreImagen && (
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

      {/* EL PANEL DE LA VENTANA DE LECTURA. 24-09-2026.
          Con la camara detras, la ventana clara -donde se lee- era la parte MAS
          transparente de la pantalla: alpha 0.00 del velo, el texto directo sobre
          la imagen. Justo al reves de lo que necesita el que lee.
          Primero se probo una franja vertical en todo el alto, y encima del velo
          horizontal armaba un cuadriculado: "pusiste una franja al medio, sobre
          la otra franja que estaba, ahora se ve muy raro". El dueno aclaro lo que
          mostraba la foto: la franja "abarca orientativamente donde vas leyendo,
          que es arriba". Asi que es un panel del alto de la ventana de lectura
          -los mismos bordes que usa el velo, calcularTramosVelo- y del ancho de
          la columna, con las esquinas redondeadas y el borde difuminado. Queda
          quieto: el texto pasa por el. Marca donde leer y le da contraste justo
          ahi. Solo es la vista del que lee: la camara graba la imagen limpia. */}
      {textoSobreImagen && columnaX && altoContenedor > 0 && (() => {
        const ventana = calcularTramosVelo(topBanda, filaPx, true)[1]
        return (
          <div
            data-testid="panel-lectura"
            className="panel-lectura"
            style={{
              // DOS CORRECCIONES, MEDIDAS EN EL TELEFONO -24-09-2026-. El texto va
              // adentro del area segura -la barra de estado, 45 px en el moto g86- y
              // este panel no: sin sumarla quedaba corrido hacia arriba y cubria dos
              // renglones en vez de cuatro -"llega a dos renglones, deberian ser unos
              // 4"-. Y los cuatro renglones casi siempre cruzan un salto de parrafo,
              // que suma MARGEN_RENGLON_LECTURA_PX: el panel lo incluye.
              top: `calc(env(safe-area-inset-top, 0px) + ${ventana.desdePx}px)`,
              height: ventana.hastaPx - ventana.desdePx + MARGEN_RENGLON_LECTURA_PX,
              left: columnaX.izquierda - MARGEN_PANEL_PX,
              width: columnaX.ancho + 2 * MARGEN_PANEL_PX,
              ['--panel-color' as string]: `rgba(${rgbFondo.r}, ${rgbFondo.g}, ${rgbFondo.b}, ${ALPHA_PANEL_LECTURA})`
            }}
          />
        )
      })()}

      {/* Velo de opacidad asimétrica de borde a borde.
          CON LA CAMARA DETRAS NO VA: la guia de donde leer es el panel de arriba.
          Los dos juntos eran dos sombras distintas sobre el texto -el panel en la
          ventana y el velo debajo-, y el dueno lo vio dos veces: "nuevamente
          estan dos sombras sobre un texto". Una sola capa, como en la foto que
          trajo: el panel donde se lee y el resto del texto sobre la imagen. */}
      {altoContenedor > 0 && !textoSobreImagen && (
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
          por si el diagnostico lo quiere; no se pinta encima del renglon.
          -24-09-2026: ya no se calcula; el diagnostico tiene el freno en cada cuadro. */}

      <div
        ref={containerRef}
        data-testid="contenedor-lectura"
        // Sobre la imagen de la camara las letras llevan una sombra suave, como
        // los subtitulos: separa cada letra de lo que tenga detras. Oscura para
        // letra clara, clara para la letra negra de la pareja blanca.
        className={textoSobreImagen ? `lectura-sobre-imagen${isWhiteBg ? ' letra-oscura' : ''}` : undefined}
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
        {/* EL DESTACADO DE LECTURA -lib/destacado.ts-. Detras del texto: zIndex -1 dentro del
            contenedor, que con position relative y zIndex 1 es su propio contexto de
            apilamiento. Vive adentro del que hace scroll, asi que se desplaza con el texto, y
            las medidas son offsetLeft/offsetTop de las palabras, que no cambian con el scroll
            ni con el espejo. Neutro a proposito: no es el destacado amarillo del editor. */}
        <div
          aria-hidden="true"
          data-testid="capa-destacado"
          style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, zIndex: -1, pointerEvents: 'none' }}
        >
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              ref={(el) => { capsulasRef.current[k] = el }}
              className="capsula-destacado"
              style={{
                position: 'absolute',
                opacity: 0,
                // La linea: el crema de la aplicacion -#E7E1DE, --color-acento- sobre fondo
                // oscuro o la camara; sobre el fondo blanco, oscura.
                background: isWhiteBg ? 'rgba(0, 0, 0, 0.55)' : 'rgba(231, 225, 222, 0.85)',
                transition: movimientoApagado()
                  ? 'none'
                  : 'left 240ms cubic-bezier(0.2, 0.8, 0.2, 1), top 240ms cubic-bezier(0.2, 0.8, 0.2, 1), width 240ms cubic-bezier(0.2, 0.8, 0.2, 1), height 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease'
              }}
            />
          ))}
        </div>
        <div
          data-testid="columna-texto"
          style={{
            fontSize,
            maxWidth: columnaLectura(columnaAngosta).maxWidth,
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
            textAlign: columnaLectura(columnaAngosta).textAlign
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
                        margin: `${MARGEN_RENGLON_LECTURA_PX}px 0`,
                        lineHeight: INTERLINEADO_LECTURA
                      }}
                    >
                      {renderFormattedLine(linea, lineStart, lineTokens, bloque.tramos, colorFondo)}
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
          {/* La flecha usa el tratamiento comun de 32 -btn-flotante-32, styles.css-,
              igual que la flecha del estado leyendo en App.tsx. Hasta la revision
              de la 70 era opaca -bg-superficie y borde gris- con el icono a 22, y
              al lado de la otra se veian dos flechas distintas para la misma
              salida. El encargo 70 decia que este boton no se tocaba y a la vez,
              en la 9.3, que la otra flecha copiaba su tratamiento translucido,
              que no tenia: se resolvio por la seccion 11, que manda. 23-09-2026.
              24-09-2026: sube a 40, el tamano del engranaje de la otra esquina.
              El dueno: "el boton de volver ... esta desproporcionado por ser mas
              pequeno que el engranaje". Las dos esquinas de arriba son el mismo
              objeto y el mismo tamano; el 32 de "esquina secundaria" se fue. */}
          <button
            data-testid="btn-volver-listo"
            type="button"
            className="btn-deformable btn-flotante-40"
            onClick={(e) => {
              e.stopPropagation()
              onVolverListo?.()
            }}
            aria-label="Volver"
            style={{
              position: 'absolute',
              top: 'calc(8px + env(safe-area-inset-top, 0px))',
              left: 'calc(8px + env(safe-area-inset-left, 0px))',
              zIndex: 10
            }}
          >
            <IconoAtras tamano={20} />
          </button>

          {/* ARRIBA A LA DERECHA: EL ENGRANAJE. Las dos puertas, siempre.
              Hasta la 69 este rincon lo peleaban dos botones -el ⟳ en Grabar
              y el de la escena en Leer- y por eso la 69 solo se atrevio con
              Leer. En la 70 el rincon es del engranaje en las dos puertas y
              el ⟳ se mudo adentro del panel: decision de Javier, 23-09-2026. */}
          <button
            data-testid="btn-engranaje-toma"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPanelTomaAbierto((v) => !v)
            }}
            aria-label="Ajustes de la escena"
            className="btn-deformable btn-flotante-40"
            style={{
              position: 'absolute',
              top: 'calc(8px + env(safe-area-inset-top, 0px))',
              right: 'calc(8px + env(safe-area-inset-right, 0px))',
              zIndex: 11,
              display: arrastrandoRecuadro ? 'none' : 'flex',
              // Cerrado, el aspecto lo da btn-flotante-40 -el mismo de la pausa
              // en App.tsx, que ocupa este rincon mientras se lee-. Abierto se
              // pinta con el acento para decir que el panel colgado es suyo.
              backgroundColor: panelTomaAbierto ? 'var(--color-acento)' : undefined,
              color: panelTomaAbierto ? 'var(--color-texto-acento)' : undefined
            }}
          >
            <IconoEngranaje tamano={20} />
          </button>

          {/* EL PANEL DE LA TOMA. Cuelga del engranaje, ya no del suelo.
              Aqui vive TODO lo que antes estaba en panel-controles-listo.
              Nada se perdio: se mudo.
              24-09-2026: y se volvio a mudar, ahora al CAJON DESDE ABAJO, con
              el estandar del cajon Aa del editor -el dueno: "deberia imponer
              un tipo de standar para nuestros otros menu de ajustes"-.
              Colgado del engranaje ocupaba hasta el 62% de la pantalla desde
              arriba, que es donde esta la franja de lectura: al tocar "Donde
              lees" el panel tapaba justo lo que se habia movido. Desde abajo,
              sin velo y sin palabras, lo que se ajusta se ve arriba a plena
              luz. Los nombres siguen en aria-label y title. Mismos testid de
              siempre: lo que cambia es la forma, no las puertas. */}
          {panelTomaAbierto && (
            <div
              className="capa-cajon-aa"
              data-testid="capa-ajustes-toma"
              onClick={(e) => {
                e.stopPropagation()
                setPanelTomaAbierto(false)
              }}
              style={{
                // Se esconde mientras se arrastra el recuadro, igual que el engranaje y el
                // circulo. Hasta la 70 vivia dentro del cajon y se escondia con el; al
                // mudarse al engranaje habia quedado fuera de esa regla.
                display: arrastrandoRecuadro ? 'none' : 'flex'
              }}
            >
              <div
                data-testid="panel-ajustes-toma"
                className="panel-superficie cajon-aa"
                onClick={(e) => e.stopPropagation()}
                style={{
                  paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))',
                  transform: `translateY(${arrastreCajonToma}px)`,
                  transition: arrastrandoCajonTomaRef.current || movimientoApagado() ? 'none' : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`,
                  animation: movimientoApagado() || arrastrandoCajonTomaRef.current || arrastreCajonToma > 0
                    ? 'none'
                    : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
                }}
              >
                <div
                  className="cajon-aa-agarradera"
                  onPointerDown={(e) => {
                    inicioArrastreCajonTomaRef.current = e.clientY
                    arrastrandoCajonTomaRef.current = true
                    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
                  }}
                  onPointerMove={(e) => {
                    if (!arrastrandoCajonTomaRef.current || inicioArrastreCajonTomaRef.current === null) return
                    setArrastreCajonToma(Math.max(0, e.clientY - inicioArrastreCajonTomaRef.current))
                  }}
                  onPointerUp={() => {
                    arrastrandoCajonTomaRef.current = false
                    inicioArrastreCajonTomaRef.current = null
                    // El mismo umbral que el cajon Aa -EditorView.tsx-.
                    if (arrastreCajonToma > 96) setPanelTomaAbierto(false)
                    setArrastreCajonToma(0)
                  }}
                  onPointerCancel={() => {
                    arrastrandoCajonTomaRef.current = false
                    inicioArrastreCajonTomaRef.current = null
                    setArrastreCajonToma(0)
                  }}
                >
                  <div className="cajon-aa-agarradera-raya" />
                </div>

                <div className="cajon-aa-filas">
                  {/* LA IMAGEN Y VOLTEAR. Voltear era un boton flotante arriba a
                      la derecha hasta la 70; despues una fila con "Cámara:".
                      Es una ACCION, no una eleccion: por eso va aparte, redondo,
                      al lado del selector de la imagen. */}
                  {conCamara && (
                    <div className="fila-aa-accion">
                      <div className="selector-aa selector-aa-lleno" role="group" aria-label="Imagen de la cámara">
                        {[
                          { val: 'detras' as const, label: 'Detrás', Icono: IconoImagenDetras },
                          { val: 'recuadro' as const, label: 'Recuadro', Icono: IconoImagenRecuadro },
                          { val: 'oculta' as const, label: 'Oculta', Icono: IconoImagenOculta }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            data-testid={`btn-fondo-${opt.val}`}
                            aria-label={opt.label}
                            title={opt.label}
                            aria-pressed={fondoToma === opt.val}
                            className={`btn-deformable selector-aa-opcion${fondoToma === opt.val ? ' activa' : ''}`}
                            onClick={() => {
                              setFondoToma?.(opt.val)
                            }}
                          >
                            <opt.Icono tamano={24} />
                          </button>
                        ))}
                      </div>
                      <button
                        data-testid="btn-voltear-camara"
                        type="button"
                        className="btn-deformable boton-aa-redondo"
                        onClick={(e) => {
                          e.stopPropagation()
                          onVoltear?.()
                        }}
                        aria-label="Voltear cámara"
                        title="Voltear cámara"
                      >
                        <IconoVoltear tamano={24} />
                      </button>
                    </div>
                  )}

                  {conCamara && fondoToma === 'oculta' && (
                    <div data-testid="aviso-camara-encendida" className="aviso-aa">
                      la cámara sigue encendida
                    </div>
                  )}

                  {/* LETRA Y ANCHO, ARRIBA Y MITAD Y MITAD -27-09-2026-. Javier los extrano aca,
                      justo antes de grabar. El cajon no tiene velo: el texto de atras cambia en
                      vivo. Para que el cajon no creciera, la calidad y el brillo dejaron de ir a
                      todo el ancho: calidad con donde lees, espejo y tiempo con el brillo. */}
                  <div className="fila-aa-par">
                    <SelectorLetra fontSize={fontSize} onMenos={onLetraMenos} onMas={onLetraMas} />
                    <SelectorAncho
                      columnaAngosta={columnaAngosta}
                      marginPercent={marginPercent}
                      setColumnaAngosta={setColumnaAngosta}
                      setMarginPercent={setMarginPercent}
                    />
                  </div>

                  {/* LA CALIDAD VA EN TEXTO: 720p o 1080p es un dato, no una
                      forma, y dibujarlo seria adivinar. Decision del dueno,
                      24-09-2026: "la calidad esta bien que sea texto para que
                      se entienda". */}
                  <div className="fila-aa-par">
                    {conCamara && calidadesSoportadas.length > 0 && (
                      <div className="selector-aa selector-aa-lleno" role="group" aria-label="Calidad del video">
                        {calidadesSoportadas.map((q) => (
                          <button
                            key={q}
                            type="button"
                            data-testid={`btn-calidad-${q}`}
                            aria-pressed={calidadVideo === q}
                            className={`btn-deformable selector-aa-opcion texto-aa${calidadVideo === q ? ' activa' : ''}`}
                            onClick={() => {
                              setCalidadVideo?.(q)
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="selector-aa selector-aa-lleno" role="group" aria-label="Dónde lees">
                      {/* Sin 'abajo' desde el 24-09-2026: "nadie lee abajo". Ver App.tsx, donde
                          se carga anclajeZona. */}
                      {(['arriba', 'medio'] as const).map((z) => (
                        <button
                          key={z}
                          type="button"
                          data-testid={`btn-anclaje-${z}`}
                          aria-label={z === 'arriba' ? 'Leer arriba' : 'Leer al medio'}
                          title={z === 'arriba' ? 'Leer arriba' : 'Leer al medio'}
                          aria-pressed={anclajeZona === z}
                          className={`btn-deformable selector-aa-opcion${anclajeZona === z ? ' activa' : ''}`}
                          onClick={() => {
                            setAnclajeZona?.(z)
                          }}
                        >
                          <IconoFranja posicion={z} tamano={24} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {conCamara && calidadesSoportadas.length > 0 && typeof minutosDisponibles === 'number' && (
                    <div
                      data-testid="linea-minutos-disponibles"
                      className={`aviso-aa${minutosDisponibles < 2 ? ' aviso-aa-urgente' : ''}`}
                    >
                      {minutosDisponibles >= 2
                        ? `Te alcanzan unos ${Math.floor(minutosDisponibles)} minutos`
                        : 'Quedan menos de 2 minutos de espacio'}
                    </div>
                  )}

                  {/* ESPEJO Y TIEMPO CON EL BRILLO, mitad y mitad -hasta el 27-09-2026 espejo y
                      tiempo iban con donde lees, y el brillo a todo el ancho-. Espejo y tiempo
                      son interruptores: cada uno se enciende solo, y encendido
                      se pinta como la opcion elegida. La casilla real sigue en
                      el documento -para el lector de pantalla y el teclado-,
                      escondida con la misma clase que Interruptor.tsx. */}
                  <div className="fila-aa-par">
                    <div className="selector-aa selector-aa-lleno" role="group" aria-label="Espejo y tiempo">
                      {[
                        { etiqueta: 'Espejo', encendido: mirror, cambiar: (v: boolean) => setMirror?.(v), Icono: IconoEspejo },
                        { etiqueta: 'Mostrar tiempo', encendido: mostrarTiempo, cambiar: (v: boolean) => setMostrarTiempo?.(v), Icono: IconoReloj }
                      ].map((t) => (
                        <label
                          key={t.etiqueta}
                          title={t.etiqueta}
                          className={`btn-deformable selector-aa-opcion${t.encendido ? ' activa' : ''}`}
                        >
                          <input
                            type="checkbox"
                            role="switch"
                            className="interruptor-casilla"
                            checked={t.encendido}
                            onChange={(e) => t.cambiar(e.target.checked)}
                          />
                          <t.Icono tamano={24} />
                          <span className="solo-lector">{t.etiqueta}</span>
                        </label>
                      ))}
                    </div>
                    {/* BRILLO: UNA BARRA ENTRE UN SOL CHICO Y UN SOL GRANDE. Ver el
                        porque del cambio en lib/brillo.ts. Parte del brillo que
                        tiene el sistema; mientras no se toca, el brillo es el del
                        sistema -automatico-. El relleno de la pista lo dibuja
                        --relleno, en styles.css. */}
                    <div className="brillo-aa" role="group" aria-label="Brillo">
                      <IconoSol tamano={16} />
                      <input
                        type="range"
                        data-testid="barra-brillo"
                        className="barra-brillo"
                        aria-label="Brillo"
                        min={Math.round(BRILLO_MINIMO * 100)}
                        max={100}
                        step={1}
                        value={Math.round((brillo ?? brilloSistema ?? 0.5) * 100)}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100
                          setBrillo(v)
                          aplicarBrillo(v)
                        }}
                        style={{
                          ['--relleno' as string]: `${((Math.round((brillo ?? brilloSistema ?? 0.5) * 100) - BRILLO_MINIMO * 100) / (100 - BRILLO_MINIMO * 100)) * 100}%`
                        }}
                      />
                      <IconoSol tamano={26} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABAJO AL CENTRO: EMPEZAR. Un circulo translucido flotando sobre
              el fondo, SIN cajon detras. El cajon -panel-controles-listo- se
              elimino en la 70: la foto aprobada no lo tiene y se comia el
              ultimo tercio del texto.

              El centrado lo hace ESTE div, no un transform inline en el
              boton: .btn-deformable hace su efecto de apretado con transform
              -styles.css:255-267- y un transform inline le gana a la hoja de
              estilos y lo deja muerto. pointerEvents none en el contenedor y
              auto en el boton para que la franja invisible no se coma los
              toques del texto que pasa por debajo. */}
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
              left: 0,
              right: 0,
              zIndex: 10,
              display: arrastrandoRecuadro ? 'none' : 'flex',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            {/* EL CIRCULO SIGUE EL ESTANDAR DE LOS BOTONES DE ESA PUERTA.
                24-09-2026, el dueno: "ese boton de play que esta abajo tambien
                deberia estar con el estandar de los botones que graban". Con
                camara es Grabar: borde rojo, relleno rojo tenue y el punto
                rojo en vez del triangulo -.btn-grabar, styles.css-. Sin camara
                es Leer: crema lleno con el triangulo. Antes era un circulo
                negro translucido igual en las dos puertas. */}
            <button
              data-testid="btn-empezar-toma"
              type="button"
              className={`btn-deformable ${conCamara ? 'btn-empezar-grabar' : 'btn-empezar-leer'}`}
              aria-label="Empezar"
              onClick={(e) => {
                e.stopPropagation()
                onEmpezar?.()
              }}
              style={{
                pointerEvents: 'auto',
                width: 72,
                height: 72,
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--redondeo-pildora)'
              }}
            >
              {conCamara ? <span className="punto-grabar" aria-hidden="true" /> : <IconoEmpezar tamano={30} />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

