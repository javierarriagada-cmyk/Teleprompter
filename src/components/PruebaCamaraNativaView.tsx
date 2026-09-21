import React, { useEffect, useState } from 'react'
import { CameraPreview } from '@capgo/camera-preview'
import { registerPlugin } from '@capacitor/core'
import { MotorNativo } from '../motor/MotorNativo'

export interface CamaraNativaPlugin {
  fijarModoSuperficie(options: { modo: 'sistema' | 'textura' }): Promise<{ encontrado: boolean; modo: string }>
}

const CamaraNativa = registerPlugin<CamaraNativaPlugin>('CamaraNativa')

interface PruebaCamaraNativaViewProps {
  onVolver: () => void
}

export default function PruebaCamaraNativaView({ onVolver }: PruebaCamaraNativaViewProps) {
  const [toBack, setToBack] = useState<boolean>(true)
  const [modoSuperficie, setModoSuperficie] = useState<'sistema' | 'textura'>('sistema')
  const [camaraIniciada, setCamaraIniciada] = useState<boolean>(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)

  // Estado del experimento de grabación + voz
  const [grabando, setGrabando] = useState<boolean>(false)
  const [estadoGrabacion, setEstadoGrabacion] = useState<string | null>(null)
  const [segundosRestantes, setSegundosRestantes] = useState<number>(10)
  const [textoReconocido, setTextoReconocido] = useState<string>('')
  const [rutaArchivo, setRutaArchivo] = useState<string | null>(null)
  const [errorGrabacion, setErrorGrabacion] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function arrancar(modoToBack: boolean, modoSup: 'sistema' | 'textura') {
      try {
        setErrorCamara(null)
        await CameraPreview.start({
          position: 'front',
          toBack: modoToBack,
          disableAudio: true,
          force: true,
          enableVideoMode: true
        })
        try {
          await CamaraNativa.fijarModoSuperficie({ modo: modoSup })
        } catch (e) {
          console.warn('[PruebaCamaraNativa] fijarModoSuperficie no disponible en esta plataforma:', e)
        }
        if (!cancelado) {
          setCamaraIniciada(true)
        }
      } catch (err: any) {
        console.error('[PruebaCamaraNativa] Error al iniciar cámara:', err)
        if (!cancelado) {
          setErrorCamara(err?.message || 'Error desconocido al iniciar cámara')
        }
      }
    }

    arrancar(toBack, modoSuperficie)

    return () => {
      cancelado = true
      CameraPreview.stop().catch(() => {})
    }
  }, [toBack, modoSuperficie])

  async function handleToggleToBack() {
    const nuevoToBack = !toBack
    setToBack(nuevoToBack)
  }

  async function handleToggleSuperficie() {
    const nuevoModo = modoSuperficie === 'sistema' ? 'textura' : 'sistema'
    setModoSuperficie(nuevoModo)
  }

  async function handleSalir() {
    try {
      await CameraPreview.stop()
    } catch (e) {
      // ignorar
    }
    onVolver()
  }

  async function correrExperimento(disableAudio: boolean) {
    if (grabando) return
    setGrabando(true)
    setErrorGrabacion(null)
    setRutaArchivo(null)
    setTextoReconocido('')
    setSegundosRestantes(10)
    setEstadoGrabacion('Arrancando motor de voz nativo...')

    let motor: MotorNativo | null = null
    let intervaloTimer: any = null

    try {
      // a. Arranca nuestro motor de voz nativo
      motor = new MotorNativo()

      let parcialActual = ''
      const finales: string[] = []

      const actualizarTexto = () => {
        const todo = [...finales, parcialActual].filter(Boolean).join(' ')
        setTextoReconocido(todo)
      }

      motor.onParcial((e) => {
        parcialActual = e.texto
        actualizarTexto()
      })

      motor.onFinal((e) => {
        if (e.texto.trim()) {
          finales.push(e.texto.trim())
        }
        parcialActual = ''
        actualizarTexto()
      })

      motor.onError((e) => {
        const msg = e?.message || String(e)
        setErrorGrabacion((prev) => (prev ? `${prev}\n[Error motor]: ${msg}` : `[Error motor]: ${msg}`))
      })

      await motor.iniciar({ lang: 'es' })
      setEstadoGrabacion('Motor de voz iniciado. Esperando 1 segundo...')

      // b. Un segundo después, arranca la grabación de video
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const modoTexto = disableAudio ? 'SIN AUDIO' : 'CON AUDIO'
      setEstadoGrabacion(`Grabando video (${modoTexto})...`)

      await CameraPreview.startRecordVideo({ disableAudio })

      // c. A los 10 segundos, corta la grabación y para el motor
      const inicio = Date.now()
      setSegundosRestantes(10)

      await new Promise<void>((resolve) => {
        intervaloTimer = setInterval(() => {
          const transcurridoSec = Math.floor((Date.now() - inicio) / 1000)
          const rest = Math.max(0, 10 - transcurridoSec)
          setSegundosRestantes(rest)
          if (rest <= 0) {
            clearInterval(intervaloTimer)
            intervaloTimer = null
            resolve()
          }
        }, 200)
      })

      setEstadoGrabacion('Cortando grabación y deteniendo motor...')

      try {
        const res = await CameraPreview.stopRecordVideo()
        if (res?.videoFilePath) {
          setRutaArchivo(res.videoFilePath)
        } else {
          setRutaArchivo('Grabación finalizada sin ruta')
        }
      } catch (errDetenerVideo: any) {
        const msg = errDetenerVideo?.message || String(errDetenerVideo)
        setErrorGrabacion((prev) => (prev ? `${prev}\n[Error stopRecordVideo]: ${msg}` : `[Error stopRecordVideo]: ${msg}`))
      }

      await motor.detener()
      motor = null

      setEstadoGrabacion(`Finalizado (${modoTexto}).`)
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.error('[PruebaCamaraNativa] Error en experimento:', err)
      setErrorGrabacion((prev) => (prev ? `${prev}\n${msg}` : msg))
      setEstadoGrabacion('Error en el experimento.')
    } finally {
      if (intervaloTimer) {
        clearInterval(intervaloTimer)
      }
      if (motor) {
        try {
          await motor.detener()
        } catch {
          // ignorar
        }
      }
      setGrabando(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: toBack ? 'transparent' : '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) calc(24px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px))',
        boxSizing: 'border-box'
      }}
    >
      {/* Barra superior de controles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(34, 31, 29, 0.85)',
          padding: '12px 16px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <button
          onClick={handleSalir}
          style={{
            padding: '10px 16px',
            backgroundColor: '#1E1B19',
            color: '#E7E1DE',
            border: '1px solid #968F8B',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          ← Salir
        </button>

        <button
          onClick={handleToggleToBack}
          style={{
            padding: '10px 16px',
            backgroundColor: toBack ? '#E11D2E' : '#2D2927',
            color: '#FFFFFF',
            border: '1px solid #968F8B',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          toBack: {toBack ? 'TRUE' : 'FALSE'}
        </button>

        <button
          onClick={handleToggleSuperficie}
          style={{
            padding: '10px 16px',
            backgroundColor: modoSuperficie === 'sistema' ? '#E11D2E' : '#2D2927',
            color: '#FFFFFF',
            border: '1px solid #968F8B',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          Superficie: {modoSuperficie === 'sistema' ? 'SISTEMA' : 'TEXTURA'}
        </button>
      </div>

      {/* Panel principal de prueba y resultados */}
      <div
        style={{
          backgroundColor: 'rgba(34, 31, 29, 0.90)',
          color: '#E7E1DE',
          padding: '16px',
          borderRadius: '16px',
          fontSize: '13px',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.20)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '65vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px' }}>
          Experimento: Grabar y Escuchar al Mismo Tiempo
        </div>

        <div style={{ fontSize: '12px', color: '#CAC5C2', textAlign: 'center' }}>
          toBack = {toBack ? 'true (detrás)' : 'false (frente)'} | Superficie = {modoSuperficie.toUpperCase()}
        </div>

        {errorCamara && (
          <div style={{ color: '#FF5A5A', textAlign: 'center', fontWeight: 600 }}>
            Error cámara: {errorCamara}
          </div>
        )}
        {!camaraIniciada && !errorCamara && (
          <div style={{ color: '#CAC5C2', textAlign: 'center' }}>
            Iniciando sesión nativa de cámara...
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={() => correrExperimento(false)}
            disabled={grabando}
            style={{
              padding: '12px 16px',
              backgroundColor: grabando ? '#4B4643' : '#E11D2E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: grabando ? 'not-allowed' : 'pointer'
            }}
          >
            {grabando ? `GRABANDO (${segundosRestantes}s)` : 'GRABAR 10 SEGUNDOS'}
          </button>

          <button
            onClick={() => correrExperimento(true)}
            disabled={grabando}
            style={{
              padding: '12px 16px',
              backgroundColor: grabando ? '#4B4643' : '#2D2927',
              color: '#FFFFFF',
              border: '1px solid #968F8B',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: grabando ? 'not-allowed' : 'pointer'
            }}
          >
            {grabando ? `GRABANDO (${segundosRestantes}s)` : 'GRABAR 10 SEGUNDOS SIN AUDIO'}
          </button>
        </div>

        {/* Estado actual */}
        {estadoGrabacion && (
          <div style={{ backgroundColor: '#1E1B19', padding: '8px 12px', borderRadius: '8px', border: '1px solid #4B4643' }}>
            <span style={{ fontWeight: 600, color: '#CAC5C2' }}>Estado: </span>
            <span style={{ color: '#FFFFFF' }}>{estadoGrabacion}</span>
          </div>
        )}

        {/* Result 1: LO QUE OYÓ EL MOTOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 700, color: '#E7E1DE', fontSize: '12px', textTransform: 'uppercase' }}>
            LO QUE OYO EL MOTOR:
          </div>
          <div
            style={{
              backgroundColor: '#151312',
              color: textoReconocido ? '#FFFFFF' : '#968F8B',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #4B4643',
              minHeight: '48px',
              maxHeight: '120px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              fontSize: '13px',
              lineHeight: '1.4'
            }}
          >
            {textoReconocido || '(Sin texto reconocido - motor mudo)'}
          </div>
        </div>

        {/* Result 2: DÓNDE QUEDÓ EL ARCHIVO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 700, color: '#E7E1DE', fontSize: '12px', textTransform: 'uppercase' }}>
            DONDE QUEDO EL ARCHIVO:
          </div>
          <input
            readOnly
            value={rutaArchivo || '(Aún no hay archivo grabado)'}
            style={{
              backgroundColor: '#151312',
              color: rutaArchivo ? '#E7E1DE' : '#968F8B',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #4B4643',
              fontSize: '12px',
              width: '100%',
              boxSizing: 'border-box',
              userSelect: 'all',
              WebkitUserSelect: 'all'
            }}
          />
        </div>

        {/* Result 3: SI HUBO ERROR */}
        {errorGrabacion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontWeight: 700, color: '#FF5A5A', fontSize: '12px', textTransform: 'uppercase' }}>
              ERROR:
            </div>
            <div
              style={{
                backgroundColor: 'rgba(225, 29, 46, 0.15)',
                color: '#FF5A5A',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #E11D2E',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                userSelect: 'text',
                WebkitUserSelect: 'text'
              }}
            >
              {errorGrabacion}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
