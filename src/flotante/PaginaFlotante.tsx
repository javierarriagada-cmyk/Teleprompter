// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TeleprompterView from '../components/TeleprompterView'
import BarraDeTiempo from '../components/BarraDeTiempo'
import CuentaRegresiva from '../components/CuentaRegresiva'
import { PASOS_LETRA } from '../components/estiloLectura'
import { IconoCerrar, IconoEmpezar, IconoPausa, IconoTamanoLetra } from '../components/IconosApp'
import { AnclajeZona } from '../components/banda'
import { Guion } from '../datos/modelo'
// Antes -08-11-2026-: import { limitarTamanoLetra, limitarTransparencia } from '../lib/flotante'
import {
  limitarTamanoLetra, limitarTransparencia, colocarMenuAa, disenoVentana, ANCLA_RENGLON_VENTANA,
  ALTO_CABECERA_VENTANA, ALTO_PIE_VENTANA, type AreaSegura
} from '../lib/flotante'
import { mostrarIdiomaSinGuardar, idiomaApp, normalizarIdioma } from '../lib/idioma'
import { controlesSeVanSolos } from '../lib/velocidadFija'
import useASR from '../hooks/useASR'
import { useSeguidor } from '../hooks/useSeguidor'
import { MotorFlotante } from '../motor/MotorFlotante'
// Antes -08-11-2026-: import { AjustesFlotante } from './AjustesFlotante' -el menú de Aa ahora es PanelAaFlotante.tsx-
import { t, useTextos } from '../textos'
import { opcionesAvisoQuedaMinuto } from '../lib/avisoLimite'

type Contrato = {
  tipo: 'contrato'
  sesion: number
  guion: Guion
  idioma: string
  fontSize: number
  tipoFuente: 'sans' | 'serif'
  colorFondo: string
  colorLetra: string
  marginPercent: number
  columnaAngosta: boolean
  lineasZona: number
  anclajeZona: AnclajeZona
  transparencia: number
  tokenInicial: number
  mostrarTiempo: boolean
  // -banda A, 09-11-2026- El idioma de la app: esta página vive en otro origen y no ve el que se eligió en Sigo.
  idiomaApp?: string
  // -09-11-2026- El límite gratis lo cuenta Android -SesionVentana-; null con Sigo+ o velocidad fija.
  limite?: { lecturaSeg: number; avisoAntesSeg: number } | null
  leidosSeg?: number
}

// -09-11-2026- El aviso y el límite de lectura que manda Android -VentanaDePrueba.revisarLimite-.
type FaseLimite = 'ninguno' | 'aviso' | 'limite'

// Dónde está la ventana en la pantalla, en dp -VentanaDePrueba.enviarGeometria-. Sirve para poner el menú de Aa.
type Geometria = { x: number; y: number; w: number; h: number; seguro: AreaSegura }

type EstadoApp = {
  tipo: 'estado'
  sesion: number
  cuenta: number | null
  enPausa: boolean
  escuchando: boolean
  silenciado: boolean
}

function hexRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('')
  const num = parseInt(clean, 16)
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function enviar(mensaje: Record<string, unknown>) {
  const puente = (window as unknown as { sigo?: { postMessage: (d: string) => void } }).sigo
  puente?.postMessage(JSON.stringify(mensaje))
}

export function PaginaFlotante() {
  useTextos()
  const motor = useMemo(() => new MotorFlotante(), [])
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [estado, setEstado] = useState<EstadoApp>({
    tipo: 'estado', sesion: 0, cuenta: null, enPausa: false, escuchando: false, silenciado: false
  })
  const [transparencia, setTransparencia] = useState(0)
  const [fontSize, setFontSize] = useState(24)
  const [aaAbierto, setAaAbierto] = useState(false)
  // El silencio de Android llega de lo nativo como {tipo:'micro'}, no en el estado de App: va aparte para que
  // cada estado de App no lo borre. Antes -957fc97-: se leía estado.silenciado, que App nunca manda, y el
  // mensaje 'micro' se ignoraba: el aviso no salía nunca.
  const [silenciado, setSilenciado] = useState(false)
  // -9-nov-2026, orden t160u, punto 5- Por qué sale el aviso: 'noAbrio' -la apertura del micrófono falló; Seguir lo
  // reintenta- o 'silenciado' -Android silenció la captura abierta, el aviso de siempre-. Un APK sin motivo: el de siempre.
  const [motivoMicro, setMotivoMicro] = useState<string>('')
  const [controlesVisibles, setControlesVisibles] = useState(true)
  const [tInicio, setTInicio] = useState<number | null>(null)
  const [faseLimite, setFaseLimite] = useState<FaseLimite>('ninguno')
  const tokenInicialHecho = useRef(false)
  // -banda A, 09-11-2026- La geometría la manda lo nativo; el ancho de la página es el de la ventana.
  const [geometria, setGeometria] = useState<Geometria | null>(null)
  const [ancho, setAncho] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 358))
  const aaRef = useRef<HTMLButtonElement | null>(null)
  const sesionRef = useRef(0)

  const {
    bloqueActual, lineaActual, palabraActual, totalTokens,
    alRecibirParcial, alRecibirFinal, alNotificarVoz, reiniciarEn, motorAvance
  } = useSeguidor(contrato?.guion || '')

  const asr = useASR({
    motor,
    lang: contrato?.idioma || 'es-ES',
    alRecibirParcial,
    alRecibirFraseFinal: alRecibirFinal,
    alNotificarVoz
  })

  const tokenActual = () => Math.floor(motorAvance?.leerEstado().posicion ?? 0)

  useEffect(() => {
    function alMensaje(ev: MessageEvent) {
      let datos: Record<string, unknown>
      try {
        datos = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
      } catch {
        return
      }
      if (!datos || typeof datos !== 'object') return
      const sesion = typeof datos.sesion === 'number' ? datos.sesion : -1
      if (contrato && sesion !== contrato.sesion && datos.tipo !== 'contrato') return
      if (datos.tipo === 'contrato') {
        const c = datos as unknown as Contrato
        motor.fijarSesion(c.sesion)
        sesionRef.current = c.sesion
        if (typeof c.idiomaApp === 'string' && normalizarIdioma(c.idiomaApp) !== idiomaApp()) mostrarIdiomaSinGuardar(normalizarIdioma(c.idiomaApp))
        setContrato(c)
        setTransparencia(limitarTransparencia(c.transparencia))
        setFontSize(limitarTamanoLetra(c.fontSize, PASOS_LETRA))
        tokenInicialHecho.current = false
        void asr.start()
        return
      }
      if (datos.tipo === 'estado') {
        const e = datos as unknown as EstadoApp
        setEstado(e)
        if (e.cuenta === null && e.escuchando && !e.enPausa) {
          setTInicio((prev) => prev ?? performance.now())
        }
        return
      }
      if (datos.tipo === 'micro') {
        setSilenciado(datos.silenciado === true)
        setMotivoMicro(typeof datos.motivo === 'string' ? datos.motivo : '')
        return
      }
      if (datos.tipo === 'limite') {
        const f = datos.fase
        setFaseLimite(f === 'aviso' || f === 'limite' ? f : 'ninguno')
        return
      }
      // -banda A, 09-11-2026- Lo que llega de la ventana nativa y del menú de Aa. El cambio de letra solo cambia la
      // letra: el seguidor, el avance y el token no se tocan, así que la misma palabra sigue activa aunque el
      // renglón se rearme. Lo mismo al abrir o cerrar Aa: el menú va en otra ventana y la lectura no cambia de alto.
      if (datos.tipo === 'geometria') {
        const g = datos as unknown as Geometria
        if ([g.x, g.y, g.w, g.h].every((n) => typeof n === 'number') && g.seguro) setGeometria(g)
        return
      }
      if (datos.tipo === 'aaCerrado') {
        setAaAbierto(false)
        return
      }
      if (datos.tipo === 'ajusteAa') {
        if (typeof datos.fontSize === 'number') setFontSize(limitarTamanoLetra(datos.fontSize, PASOS_LETRA))
        if (typeof datos.transparencia === 'number') setTransparencia(limitarTransparencia(datos.transparencia))
        return
      }
      if (datos.tipo === 'voz') {
        motor.recibir({
          sesion,
          evento: datos.evento === 'final' ? 'final' : 'parcial',
          json: typeof datos.json === 'string' ? datos.json : '',
          rms: typeof datos.rms === 'number' ? datos.rms : undefined
        })
      }
    }
    window.addEventListener('message', alMensaje)
    enviar({ tipo: 'listo' })
    return () => window.removeEventListener('message', alMensaje)
    // asr.start and contrato are refreshed via refs below; this listener is installed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor])

  useEffect(() => {
    if (!contrato || tokenInicialHecho.current) return
    if (contrato.tokenInicial > 0) reiniciarEn(contrato.tokenInicial)
    tokenInicialHecho.current = true
  }, [contrato, reiniciarEn])

  const seVan = controlesSeVanSolos({
    escuchando: estado.escuchando,
    cuentaRegresiva: estado.cuenta !== null,
    fija: false,
    leyendo: true,
    enPausa: estado.enPausa
  })

  useEffect(() => {
    if (!seVan || aaAbierto) {
      setControlesVisibles(true)
      return
    }
    const id = window.setTimeout(() => setControlesVisibles(false), 1800)
    return () => window.clearTimeout(id)
  }, [seVan, aaAbierto, estado.enPausa, estado.cuenta])

  // El aviso «te queda 1 minuto» dura lo mismo que en Leer -opcionesAvisoQuedaMinuto, 8 s-; el del límite queda
  // hasta Seguir o «Ver Sigo+».
  useEffect(() => {
    if (faseLimite !== 'aviso') return
    const id = window.setTimeout(() => setFaseLimite((f) => (f === 'aviso' ? 'ninguno' : f)), opcionesAvisoQuedaMinuto().duracionMs)
    return () => window.clearTimeout(id)
  }, [faseLimite])

  // Antes -2026-11-09-: const accion = useCallback((tipo: 'pausa' | 'seguir' | 'volver' | 'cerrar') => {
  const accion = useCallback((tipo: 'pausa' | 'seguir' | 'volver' | 'cerrar' | 'verSigoMas') => {
    enviar({ tipo, sesion: contrato?.sesion ?? 0, token: tokenActual() })
  }, [contrato, motorAvance])

  // Antes -08-11-2026-: el panel Aa vivía en esta página y sus controles llamaban a:
  // function cambiarTransparencia(n: number) {
  //   const v = limitarTransparencia(n)
  //   setTransparencia(v)
  //   enviar({ tipo: 'ajuste', sesion: contrato?.sesion ?? 0, transparencia: v, token: tokenActual() })
  // }
  // function cambiarLetra(n: number) {
  //   const v = limitarTamanoLetra(n, PASOS_LETRA)
  //   setFontSize(v)
  //   enviar({ tipo: 'ajuste', sesion: contrato?.sesion ?? 0, fontSize: v, token: tokenActual() })
  // }
  // Ahora el menú es la página ?panel=aa -PanelAaFlotante.tsx- y lo nativo guarda y reenvía -'ajusteAa'-.

  useEffect(() => {
    const alCambiar = () => setAncho(window.innerWidth)
    window.addEventListener('resize', alCambiar)
    return () => window.removeEventListener('resize', alCambiar)
  }, [])

  // EL MENÚ DE Aa, AFUERA Y PEGADO A Aa -banda A, 09-11-2026-. Con la geometría de la ventana y la caja de Aa se
  // calcula el lugar -colocarMenuAa- y lo nativo pone ahí la ventana del menú. Se recalcula al mover o cambiar el
  // tamaño de la banda, así el menú se pasa de lado al acercarse a un borde. Los valores van solo al abrir: mientras
  // se arrastra una barra del menú, devolverle cada eco haría saltar el tirador.
  const valoresAlAbrir = useRef({ transparencia, fontSize })
  valoresAlAbrir.current = { transparencia, fontSize }
  useEffect(() => {
    if (!aaAbierto || !geometria || !aaRef.current) return
    const r = aaRef.current.getBoundingClientRect()
    const lugar = colocarMenuAa(
      { x: geometria.x, y: geometria.y, w: geometria.w, h: geometria.h },
      { x: geometria.x + r.left, y: geometria.y + r.top, w: r.width, h: r.height },
      geometria.seguro
    )
    enviar({
      tipo: 'aa', abierto: true, sesion: sesionRef.current, ...lugar,
      transparencia: valoresAlAbrir.current.transparencia, fontSize: valoresAlAbrir.current.fontSize, idiomaApp: idiomaApp()
    })
  }, [aaAbierto, geometria, ancho])

  function alternarAa() {
    setAaAbierto((abierto) => {
      if (abierto) enviar({ tipo: 'aa', abierto: false, sesion: sesionRef.current })
      return !abierto
    })
  }

  // Tocar la ventana: con Aa abierto lo cierra -como tocar fuera de un menú de Material 3- y deja los controles;
  // si no, muestra u oculta los controles como antes.
  function tocarVentana() {
    if (aaAbierto) {
      setAaAbierto(false)
      enviar({ tipo: 'aa', abierto: false, sesion: sesionRef.current })
      return
    }
    if (seVan) setControlesVisibles((v) => !v)
  }

  const colorFondo = contrato?.colorFondo || '#000000'
  const colorLetra = contrato?.colorLetra || '#FFFFFF'
  const { r, g, b } = hexRgb(colorFondo)
  const alfa = 1 - transparencia / 100
  const diseno = disenoVentana(ancho)

  const ultimoPuntero = useRef({ x: 0, y: 0 })

  // EL ARRASTRE POR EL ASA LO MIDE LO NATIVO -09-11-2026-. Medido en el g86 -APK 808-: la ventana temblaba al moverla.
  // clientX/clientY son relativos a esta misma ventana, que se movía entre un paso y el siguiente, y cada paso mandado
  // como 'mover' se sumaba con su error. Ahora el asa avisa una sola vez, al apoyar el dedo, y VentanaDePrueba sigue
  // el dedo en la pantalla -getRawX/getRawY, ArrastreVentana-. La esquina sigue igual: 'tamano' en cada paso, porque
  // ahí la ventana no se corre y no tiembla.
  // Antes -2026-11-09-:
  //   function iniciarGesto(e: React.PointerEvent, tipo: 'mover' | 'tamano') {
  //     e.currentTarget.setPointerCapture(e.pointerId)
  //     ultimoPuntero.current = { x: e.clientX, y: e.clientY }
  //     ;(e.currentTarget as HTMLElement).dataset.gesto = tipo
  //   }
  //   y moverGesto mandaba también tipo 'mover' con dx y dy.
  function iniciarGesto(e: React.PointerEvent, tipo: 'mover' | 'tamano') {
    // Un segundo dedo en el asa no vuelve a avisar: solo cuenta el primero, como en lo nativo.
    if (tipo === 'mover' && e.isPrimary === false) return
    e.currentTarget.setPointerCapture(e.pointerId)
    ultimoPuntero.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).dataset.gesto = tipo
    if (tipo === 'mover') enviar({ tipo: 'moverInicio', sesion: contrato?.sesion ?? 0 })
  }

  function moverGesto(e: React.PointerEvent) {
    const tipo = (e.currentTarget as HTMLElement).dataset.gesto
    // El arrastre de la ventana ya no pasa por aquí -ver iniciarGesto-. Antes -2026-11-09-: if (!tipo) return
    if (!tipo || tipo === 'mover') return
    const dx = e.clientX - ultimoPuntero.current.x
    const dy = e.clientY - ultimoPuntero.current.y
    ultimoPuntero.current = { x: e.clientX, y: e.clientY }
    if (dx === 0 && dy === 0) return
    enviar({
      tipo,
      sesion: contrato?.sesion ?? 0,
      dx: tipo === 'mover' ? dx : 0,
      dy: tipo === 'mover' ? dy : 0,
      dw: tipo === 'tamano' ? dx : 0,
      dh: tipo === 'tamano' ? dy : 0
    })
  }

  function finGesto(e: React.PointerEvent) {
    delete (e.currentTarget as HTMLElement).dataset.gesto
  }

  // Antes -08-11-2026-, el dibujo de la ventana -cabecera, panel Aa adentro, lectura entre las dos barras y pie-:
  //   const cromo = controlesVisibles ? '' : ' flotante-oculto'
  //
  //   return (
  //     <div
  //       className="flotante-raiz"
  //       style={{
  //         background: `rgba(${r}, ${g}, ${b}, ${alfa})`,
  //         color: colorLetra,
  //         ['--color-texto' as string]: colorLetra
  //       }}
  //       onClick={() => {
  //         if (seVan) setControlesVisibles((v) => !v)
  //       }}
  //     >
  //       <div className={`flotante-barra${cromo}`} onClick={(e) => e.stopPropagation()}>
  //         <button
  //           type="button"
  //           className="flotante-asa-hit"
  //           aria-label={t('moverVentana')}
  //           onPointerDown={(e) => iniciarGesto(e, 'mover')}
  //           onPointerMove={moverGesto}
  //           onPointerUp={finGesto}
  //           onPointerCancel={finGesto}
  //         >
  //           <span className="flotante-asa" aria-hidden="true" />
  //         </button>
  //         {contrato?.mostrarTiempo ? (
  //           <BarraDeTiempo
  //             motorAvance={motorAvance}
  //             totalTokens={totalTokens}
  //             tInicioLecturaMs={tInicio}
  //             enPausa={estado.enPausa}
  //             escuchando={estado.escuchando && !estado.enPausa}
  //             vistaPrevia={tInicio === null}
  //           />
  //         ) : (
  //           <BarraDeTiempo
  //             motorAvance={motorAvance}
  //             totalTokens={totalTokens}
  //             tInicioLecturaMs={tInicio}
  //             enPausa={estado.enPausa}
  //             escuchando={estado.escuchando && !estado.enPausa}
  //             soloMicrofono
  //           />
  //         )}
  //         <button
  //           type="button"
  //           className="flotante-icono"
  //           aria-label={t('tamanoLetra')}
  //           aria-pressed={aaAbierto}
  //           onClick={() => setAaAbierto((v) => !v)}
  //         >
  //           <IconoTamanoLetra tamano={22} />
  //         </button>
  //         <button
  //           type="button"
  //           className="flotante-icono"
  //           aria-label={t('cerrar')}
  //           onClick={() => accion('cerrar')}
  //         >
  //           <IconoCerrar tamano={22} />
  //         </button>
  //       </div>
  //
  //       {aaAbierto && controlesVisibles && (
  //         <div className="flotante-aa" onClick={(e) => e.stopPropagation()}>
  //           {/* Antes -957fc97-: dos <label> con <input type="range"> sin clase. Ahora los de la preparación. */}
  //           <AjustesFlotante
  //             transparencia={transparencia}
  //             fontSize={fontSize}
  //             onTransparencia={cambiarTransparencia}
  //             onLetra={cambiarLetra}
  //           />
  //         </div>
  //       )}
  //
  //       {/* Antes -957fc97-: {estado.silenciado && ( */}
  //       {silenciado && (
  //         <div className="flotante-aviso-micro">{t('avisoMicrofonoQuitado')}</div>
  //       )}
  //
  //       <div className="flotante-lectura">
  //         {contrato && (
  //           <TeleprompterView
  //             script={contrato.guion}
  //             currentBlockIndex={bloqueActual}
  //             currentLineIndex={lineaActual}
  //             currentWordIndex={palabraActual}
  //             fontSize={fontSize}
  //             marginPercent={contrato.marginPercent}
  //             lineasZona={contrato.lineasZona}
  //             anclajeZona={contrato.anclajeZona}
  //             motorAvance={motorAvance}
  //             columnaAngosta={contrato.columnaAngosta}
  //             colorFondo={colorFondo}
  //             colorLetra={colorLetra}
  //             tipoFuente={contrato.tipoFuente}
  //             isRecording={estado.escuchando && !estado.enPausa}
  //             estadoToma="leyendo"
  //             ocultarCromoDeLeer
  //             sobreImagenAjena
  //             mostrarTiempo={contrato.mostrarTiempo}
  //             controlesVisibles={controlesVisibles}
  //             enPausa={estado.enPausa}
  //           />
  //         )}
  //         {estado.cuenta !== null && (
  //           <div className="flotante-cuenta">
  //             <CuentaRegresiva valor={estado.cuenta} />
  //           </div>
  //         )}
  //       </div>
  //
  //       <div className={`flotante-pie${cromo}`} onClick={(e) => e.stopPropagation()}>
  //         <button
  //           type="button"
  //           className="flotante-pildora"
  //           aria-label={estado.enPausa ? t('seguir') : t('pausa')}
  //           onClick={() => accion(estado.enPausa ? 'seguir' : 'pausa')}
  //         >
  //           {estado.enPausa ? <IconoEmpezar tamano={22} /> : <IconoPausa tamano={22} />}
  //           {estado.enPausa ? t('seguir') : t('pausa')}
  //         </button>
  //         <button
  //           type="button"
  //           className="flotante-texto"
  //           onClick={() => accion('volver')}
  //         >
  //           {t('volverASigo')}
  //         </button>
  //         <button
  //           type="button"
  //           className="flotante-esquina"
  //           aria-label={t('cambiarTamano')}
  //           onPointerDown={(e) => iniciarGesto(e, 'tamano')}
  //           onPointerMove={moverGesto}
  //           onPointerUp={finGesto}
  //           onPointerCancel={finGesto}
  //         />
  //       </div>
  //     </div>
  //   )
  // -banda A, 09-11-2026- La lectura ocupa toda la ventana y su renglón vivo queda fijo a 52 px del borde de arriba
  // -ANCLA_RENGLON_VENTANA-, con o sin controles: así el pasaje no salta cuando las barras se van o vuelven. Con los
  // controles a la vista, la lectura se recorta bajo la cabecera y el pie para que el texto no pase por debajo de los
  // botones. La transparencia cambia solo la capa del fondo -flotante-fondo-; letra, controles y halo no.
  const cromo = controlesVisibles ? '' : ' flotante-oculto'
  const altoCuenta = Math.round(Math.min(120, (geometria?.h ?? 224) * 0.55))

  return (
    <div
      className={`flotante-raiz flotante-${diseno}${controlesVisibles ? ' con-controles' : ''}`}
      style={{
        color: colorLetra,
        ['--color-texto' as string]: colorLetra,
        ['--fondo-ventana' as string]: `rgba(${r}, ${g}, ${b}, ${alfa})`,
        ['--fondo-lectura-ventana' as string]: colorFondo,
        ['--alto-cabecera-ventana' as string]: `${ALTO_CABECERA_VENTANA}px`,
        ['--alto-pie-ventana' as string]: `${ALTO_PIE_VENTANA}px`,
        ['--alto-cuenta-ventana' as string]: `${altoCuenta}px`
      }}
      onClick={tocarVentana}
    >
      <div className="flotante-fondo" aria-hidden="true" />

      <div className="flotante-lectura">
        {contrato && (
          <TeleprompterView
            script={contrato.guion}
            currentBlockIndex={bloqueActual}
            currentLineIndex={lineaActual}
            currentWordIndex={palabraActual}
            fontSize={fontSize}
            marginPercent={contrato.marginPercent}
            lineasZona={contrato.lineasZona}
            anclajeZona="arriba"
            margenBandaArribaPx={ANCLA_RENGLON_VENTANA}
            motorAvance={motorAvance}
            columnaAngosta={contrato.columnaAngosta}
            colorFondo={colorFondo}
            colorLetra={colorLetra}
            tipoFuente={contrato.tipoFuente}
            isRecording={estado.escuchando && !estado.enPausa}
            estadoToma="leyendo"
            ocultarCromoDeLeer
            sobreImagenAjena
            mostrarTiempo={contrato.mostrarTiempo}
            controlesVisibles={controlesVisibles}
            enPausa={estado.enPausa}
          />
        )}
      </div>

      {estado.cuenta !== null && (
        <div className="flotante-cuenta">
          <CuentaRegresiva valor={estado.cuenta} />
        </div>
      )}

      {/* Antes -9-nov-2026, orden t160u, punto 5-: <div className="flotante-aviso-micro">{t('avisoMicrofonoQuitado')}</div>
          Razón: el micrófono que no abrió no es el que Android quitó: cada uno con su texto -motivoMicro-. */}
      {silenciado && (
        <div className="flotante-aviso-micro" data-testid="flotante-aviso-micro">
          {motivoMicro === 'noAbrio' ? t('avisoMicrofonoNoAbrio') : t('avisoMicrofonoQuitado')}
        </div>
      )}

      {faseLimite === 'aviso' && (
        <div className="flotante-aviso-limite" role="status" data-testid="flotante-aviso-limite">
          <span className="flotante-aviso-limite-titulo">{t('avisoQuedaMinutoVoz')}</span>
          <span className="flotante-aviso-limite-nota">{t('avisoQuedaMinutoVozNota')}</span>
        </div>
      )}
      {faseLimite === 'limite' && (
        <div className="flotante-aviso-limite" role="status" data-testid="flotante-limite" onClick={(e) => e.stopPropagation()}>
          <span className="flotante-aviso-limite-titulo">{t('limiteLectura')}</span>
          <button type="button" className="flotante-texto flotante-aviso-limite-boton" onClick={() => accion('verSigoMas')}>
            {t('avisoLimiteVerSigoMas')}
          </button>
        </div>
      )}

      <div className={`flotante-barra${cromo}`} onClick={(e) => e.stopPropagation()}>
        {contrato?.mostrarTiempo ? (
            <BarraDeTiempo
              motorAvance={motorAvance}
              totalTokens={totalTokens}
              tInicioLecturaMs={tInicio}
              enPausa={estado.enPausa}
              escuchando={estado.escuchando && !estado.enPausa}
              vistaPrevia={tInicio === null}
            />
          ) : (
            <BarraDeTiempo
              motorAvance={motorAvance}
              totalTokens={totalTokens}
              tInicioLecturaMs={tInicio}
              enPausa={estado.enPausa}
              escuchando={estado.escuchando && !estado.enPausa}
              soloMicrofono
            />
          )}
        <button
          type="button"
          className="flotante-asa-hit"
          aria-label={t('moverVentana')}
          onPointerDown={(e) => iniciarGesto(e, 'mover')}
          onPointerMove={moverGesto}
          onPointerUp={finGesto}
          onPointerCancel={finGesto}
        >
          <span className="flotante-asa" aria-hidden="true" />
        </button>
        <button
          type="button"
          ref={aaRef}
          className={`flotante-icono flotante-aa-boton${aaAbierto ? ' abierto' : ''}`}
          aria-label={t('tamanoLetra')}
          aria-pressed={aaAbierto}
          data-testid="flotante-aa"
          onClick={alternarAa}
        >
          <IconoTamanoLetra tamano={22} />
        </button>
        <button
          type="button"
          className="flotante-icono"
          aria-label={t('cerrar')}
          onClick={() => accion('cerrar')}
        >
          <IconoCerrar tamano={22} />
        </button>
      </div>

      <div className={`flotante-pie${cromo}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={diseno === 'amplia' ? 'flotante-pildora' : 'flotante-icono'}
          aria-label={estado.enPausa ? t('seguir') : t('pausa')}
          onClick={() => accion(estado.enPausa ? 'seguir' : 'pausa')}
        >
          {estado.enPausa ? <IconoEmpezar tamano={20} /> : <IconoPausa tamano={20} />}
          {diseno === 'amplia' && (estado.enPausa ? t('seguir') : t('pausa'))}
        </button>
        <button
          type="button"
          className="flotante-texto"
          onClick={() => accion('volver')}
        >
          {t('volverASigo')}
        </button>
        <button
          type="button"
          className="flotante-esquina"
          aria-label={t('cambiarTamano')}
          onPointerDown={(e) => iniciarGesto(e, 'tamano')}
          onPointerMove={moverGesto}
          onPointerUp={finGesto}
          onPointerCancel={finGesto}
        />
      </div>
    </div>
  )
}
