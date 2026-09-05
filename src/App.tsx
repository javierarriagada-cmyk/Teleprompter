import React, { useEffect, useRef, useState } from 'react'
import useASR from './hooks/useASR'
import { useSeguidor } from './hooks/useSeguidor'
import { useWakeLock } from './hooks/useWakeLock'
import TeleprompterView from './components/TeleprompterView'
import ControlsBar from './components/ControlsBar'
import { IdMotor, MotorDeVoz } from './motor/MotorDeVoz'

interface AppProps {
  motor?: MotorDeVoz
}

const DEFAULT_SCRIPT = `Bienvenido al teleprompter.\nLee este texto en voz alta para probar el reconocimiento.`

export default function App({ motor }: AppProps) {
  const [scriptText, setScriptText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('teleprompter_script')
      if (saved !== null) return saved
    } catch (e) {}
    return DEFAULT_SCRIPT
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('teleprompter_script', scriptText)
      } catch (e) {}
    }, 500)
    return () => clearTimeout(timer)
  }, [scriptText])
  const [engine, setEngine] = useState<IdMotor>('whisper-local')
  const [fontSize, setFontSize] = useState<number>(32)
  const [marginPercent, setMarginPercent] = useState<number>(10)
  const [mirror, setMirror] = useState<boolean>(false)
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false)

  const prompterContainerRef = useRef<HTMLDivElement | null>(null)

  const {
    start,
    stop,
    clear,
    isRecording,
    transcript,
    ready,
    estadoMotor,
    dispositivoComputo,
    progresoDescarga,
    ultimoError,
    alRecibirFraseFinal,
    motorActivo
  } = useASR({ engine, lang: 'es-ES', motor })

  const { lineaActual, palabraActual, alRecibirFinal, reiniciar } = useSeguidor(scriptText)
  const { activo: wakeLockActivo, solicitar: solicitarWakeLock, soltar: soltarWakeLock } = useWakeLock()

  useEffect(() => {
    alRecibirFraseFinal((frase) => {
      alRecibirFinal(frase)
    })
  }, [alRecibirFraseFinal, alRecibirFinal])

  async function handleStart() {
    await solicitarWakeLock()
    await start()
  }

  async function handleStop() {
    await stop()
    await soltarWakeLock()
  }

  function handleClear() {
    clear()
    reiniciar()
  }

  function toggleFullscreen() {
    if (!prompterContainerRef.current) return
    if (!document.fullscreenElement) {
      prompterContainerRef.current.requestFullscreen().then(() => {
        setEsPantallaCompleta(true)
      }).catch((err) => {
        console.warn('Error al activar pantalla completa:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setEsPantallaCompleta(false)
      }).catch(() => {})
    }
  }

  useEffect(() => {
    const handleFSChange = () => {
      setEsPantallaCompleta(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1>Teleprompter MVP</h1>

      {/* Franja de estado visible */}
      <div
        style={{
          background: ultimoError ? '#ffebee' : '#e8f5e9',
          color: ultimoError ? '#c62828' : '#2e7d32',
          padding: '10px 14px',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 14,
          border: `1px solid ${ultimoError ? '#ef9a9a' : '#a5d6a7'}`
        }}
      >
        <strong>Franja de Estado:</strong>
        <div style={{ marginTop: 4 }}>
          <span>Estado del Motor: <strong>{estadoMotor}</strong></span>
          <span style={{ marginLeft: 16 }}>Motor Activo: <strong>{motorActivo}</strong></span>
          {engine === 'whisper-local' && (
            <span style={{ marginLeft: 16 }}>Dispositivo: <strong>{dispositivoComputo}</strong></span>
          )}
          <span style={{ marginLeft: 16 }}>Bloqueo Pantalla: <strong>{wakeLockActivo ? 'Sí 🔒' : 'No'}</strong></span>
        </div>
        {ultimoError && (
          <div style={{ marginTop: 6, fontWeight: 'bold' }}>
            Último Error: {ultimoError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {!esPantallaCompleta && (
          <div style={{ flex: 1, minWidth: 320 }}>
            <label>
              <strong>Guion:</strong>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={12}
                style={{ width: '100%', marginTop: 8, fontFamily: 'inherit', fontSize: 16, padding: 8 }}
              />
            </label>

            <div style={{ marginTop: 12 }}>
              <label>
                <strong>Motor ASR: </strong>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value as IdMotor)}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <option value="whisper-local">Whisper Local (On-Device WebGPU/WASM)</option>
                  <option value="webspeech">Web Speech API (Navegador)</option>
                  <option value="nativo">Nativo (Android - Tarea 2)</option>
                </select>
              </label>
            </div>

            <ControlsBar
              onStart={handleStart}
              onStop={handleStop}
              isRecording={isRecording}
              fontSize={fontSize}
              setFontSize={setFontSize}
              marginPercent={marginPercent}
              setMarginPercent={setMarginPercent}
              mirror={mirror}
              setMirror={setMirror}
              onToggleFullscreen={toggleFullscreen}
            />

            <div style={{ marginTop: 12 }}>
              <button onClick={handleClear} style={{ padding: '6px 12px' }}>
                Limpiar Transcripción y Reiniciar Seguidor
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Estado del Motor:</strong> {estadoMotor}
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Transcripción (en vivo):</strong>
              <div
                style={{
                  minHeight: 100,
                  border: '1px solid #ddd',
                  padding: 8,
                  marginTop: 6,
                  whiteSpace: 'pre-wrap',
                  background: '#f8f8f8',
                  borderRadius: 4,
                  fontSize: 14
                }}
              >
                {transcript || <em>— ninguna —</em>}
              </div>
            </div>
          </div>
        )}

        <div
          ref={prompterContainerRef}
          style={{
            flex: esPantallaCompleta ? '1 1 100%' : '1 1 420px',
            minWidth: 320,
            height: esPantallaCompleta ? '100vh' : 480,
            background: '#000',
            borderRadius: esPantallaCompleta ? 0 : 6,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <TeleprompterView
            script={scriptText}
            currentLineIndex={lineaActual}
            currentWordIndex={palabraActual}
            fontSize={fontSize}
            marginPercent={marginPercent}
            mirror={mirror}
          />
        </div>
      </div>
    </div>
  )
}
