// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TeleprompterView from '../components/TeleprompterView'
import BarraDeTiempo from '../components/BarraDeTiempo'
import CuentaRegresiva from '../components/CuentaRegresiva'
import { PASOS_LETRA } from '../components/estiloLectura'
import { IconoCerrar, IconoEmpezar, IconoPausa, IconoTamanoLetra } from '../components/IconosApp'
import { AnclajeZona } from '../components/banda'
import { Guion } from '../datos/modelo'
import { limitarTamanoLetra, limitarTransparencia } from '../lib/flotante'
import { controlesSeVanSolos } from '../lib/velocidadFija'
import useASR from '../hooks/useASR'
import { useSeguidor } from '../hooks/useSeguidor'
import { MotorFlotante } from '../motor/MotorFlotante'
import { AjustesFlotante } from './AjustesFlotante'
import { t, useTextos } from '../textos'

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
}

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
  const [controlesVisibles, setControlesVisibles] = useState(true)
  const [tInicio, setTInicio] = useState<number | null>(null)
  const tokenInicialHecho = useRef(false)

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

  const accion = useCallback((tipo: 'pausa' | 'seguir' | 'volver' | 'cerrar') => {
    enviar({ tipo, sesion: contrato?.sesion ?? 0, token: tokenActual() })
  }, [contrato, motorAvance])

  function cambiarTransparencia(n: number) {
    const v = limitarTransparencia(n)
    setTransparencia(v)
    enviar({ tipo: 'ajuste', sesion: contrato?.sesion ?? 0, transparencia: v, token: tokenActual() })
  }

  function cambiarLetra(n: number) {
    const v = limitarTamanoLetra(n, PASOS_LETRA)
    setFontSize(v)
    enviar({ tipo: 'ajuste', sesion: contrato?.sesion ?? 0, fontSize: v, token: tokenActual() })
  }

  const colorFondo = contrato?.colorFondo || '#000000'
  const colorLetra = contrato?.colorLetra || '#FFFFFF'
  const { r, g, b } = hexRgb(colorFondo)
  const alfa = 1 - transparencia / 100

  const ultimoPuntero = useRef({ x: 0, y: 0 })

  function iniciarGesto(e: React.PointerEvent, tipo: 'mover' | 'tamano') {
    e.currentTarget.setPointerCapture(e.pointerId)
    ultimoPuntero.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).dataset.gesto = tipo
  }

  function moverGesto(e: React.PointerEvent) {
    const tipo = (e.currentTarget as HTMLElement).dataset.gesto
    if (!tipo) return
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

  const cromo = controlesVisibles ? '' : ' flotante-oculto'

  return (
    <div
      className="flotante-raiz"
      style={{
        background: `rgba(${r}, ${g}, ${b}, ${alfa})`,
        color: colorLetra,
        ['--color-texto' as string]: colorLetra
      }}
      onClick={() => {
        if (seVan) setControlesVisibles((v) => !v)
      }}
    >
      <div className={`flotante-barra${cromo}`} onClick={(e) => e.stopPropagation()}>
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
          className="flotante-icono"
          aria-label={t('tamanoLetra')}
          aria-pressed={aaAbierto}
          onClick={() => setAaAbierto((v) => !v)}
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

      {aaAbierto && controlesVisibles && (
        <div className="flotante-aa" onClick={(e) => e.stopPropagation()}>
          {/* Antes -957fc97-: dos <label> con <input type="range"> sin clase. Ahora los de la preparación. */}
          <AjustesFlotante
            transparencia={transparencia}
            fontSize={fontSize}
            onTransparencia={cambiarTransparencia}
            onLetra={cambiarLetra}
          />
        </div>
      )}

      {/* Antes -957fc97-: {estado.silenciado && ( */}
      {silenciado && (
        <div className="flotante-aviso-micro">{t('avisoMicrofonoQuitado')}</div>
      )}

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
            anclajeZona={contrato.anclajeZona}
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
        {estado.cuenta !== null && (
          <div className="flotante-cuenta">
            <CuentaRegresiva valor={estado.cuenta} />
          </div>
        )}
      </div>

      <div className={`flotante-pie${cromo}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="flotante-pildora"
          aria-label={estado.enPausa ? t('seguir') : t('pausa')}
          onClick={() => accion(estado.enPausa ? 'seguir' : 'pausa')}
        >
          {estado.enPausa ? <IconoEmpezar tamano={22} /> : <IconoPausa tamano={22} />}
          {estado.enPausa ? t('seguir') : t('pausa')}
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
