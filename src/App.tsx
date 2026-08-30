import React, { useEffect, useState } from 'react'
import useASR from './hooks/useASR'
import TeleprompterView from './components/TeleprompterView'
import ControlsBar from './components/ControlsBar'

export default function App() {
  const [scriptText, setScriptText] = useState<string>(
    `Bienvenido al teleprompter.\nLee este texto en voz alta para probar el reconocimiento.`
  )
  const [engine, setEngine] = useState<'whisper' | 'webspeech'>('whisper')
  const [speed, setSpeed] = useState<number>(1.0)
  const [mirror, setMirror] = useState<boolean>(false)
  const [preloadOnWifi, setPreloadOnWifi] = useState<boolean>(true)

  const {
    start,
    stop,
    isRecording,
    transcript,
    clear,
    ready,
    speaking,
    currentLineIndex,
    currentWordIndex,
    setScript
  } = useASR({ engine, lang: 'es-ES' })

  useEffect(() => {
    setScript(scriptText)
  }, [scriptText, setScript])

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Teleprompter MVP</h1>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <label>
            <strong>Guion:</strong>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={10}
              style={{ width: '100%', marginTop: 8, fontFamily: 'inherit' }}
            />
          </label>

          <div style={{ marginTop: 8 }}>
            <label>
              <strong>Motor ASR: </strong>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as 'whisper' | 'webspeech')}
                style={{ marginLeft: 8 }}
              >
                <option value="whisper">Whisper (on-device)</option>
                <option value="webspeech">Web Speech API (fallback)</option>
              </select>
            </label>
          </div>

          <ControlsBar
            onStart={start}
            onStop={stop}
            isRecording={isRecording}
            speed={speed}
            setSpeed={setSpeed}
            mirror={mirror}
            setMirror={setMirror}
            preloadOnWifi={preloadOnWifi}
            setPreloadOnWifi={setPreloadOnWifi}
          />

          <div style={{ marginTop: 12 }}>
            <button onClick={clear} style={{ padding: '4px 12px' }}>
              Limpiar Transcripción
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>Estado:</strong>
            <div>Worker listo: {ready ? 'Sí' : 'Cargando...'}</div>
            <div>Hablando (VAD): {speaking ? 'Sí 🗣️' : 'No 😶'}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>Transcripción (en vivo):</strong>
            <div
              style={{
                minHeight: 80,
                border: '1px solid #ddd',
                padding: 8,
                marginTop: 6,
                whiteSpace: 'pre-wrap',
                background: '#f8f8f8',
                borderRadius: 4
              }}
            >
              {transcript || <em>— ninguna —</em>}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 320, maxWidth: 500 }}>
          <strong>Vista Teleprompter</strong>
          <div style={{ marginTop: 8, border: '1px solid #222', borderRadius: 4, overflow: 'hidden' }}>
            <TeleprompterView
              script={scriptText}
              currentLineIndex={currentLineIndex}
              currentWordIndex={currentWordIndex}
              speed={speed}
              mirror={mirror}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
