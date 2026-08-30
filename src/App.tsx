import React, { useEffect, useState } from 'react'
import useASR from './hooks/useASR'

export default function App() {
  const [script, setScript] = useState<string>(`Bienvenido al teleprompter.\nLee este texto en voz alta para probar el reconocimiento.`)
  const [engine, setEngine] = useState<'whisper' | 'webspeech'>('whisper')
  const { start, stop, isRecording, transcript, clear, workerReady } = useASR({ engine, lang: 'es-ES' })

  useEffect(() => {
    // no-op
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h1>Teleprompter MVP</h1>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label>
            Guion:
            <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={12} style={{ width: '100%', marginTop: 8 }} />
          </label>

          <div style={{ marginTop: 8 }}>
            <label>
              Motor ASR:
              <select value={engine} onChange={(e) => setEngine(e.target.value as any)} style={{ marginLeft: 8 }}>
                <option value="whisper">Whisper (on-device)</option>
                <option value="webspeech">Web Speech API (fallback)</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={() => start()} disabled={!workerReady || isRecording} style={{ padding: '8px 16px' }}>
              Iniciar
            </button>
            <button onClick={() => stop()} disabled={!isRecording} style={{ marginLeft: 8 }}>
              Detener
            </button>
            <button onClick={() => clear()} style={{ marginLeft: 8 }}>
              Limpiar
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>Transcripción (en vivo):</strong>
            <div style={{ minHeight: 80, border: '1px solid #ddd', padding: 8, marginTop: 6, whiteSpace: 'pre-wrap', background: '#f8f8f8' }}>{transcript || <em>— ninguna —</em>}</div>
          </div>
        </div>

        <div style={{ width: 420 }}>
          <strong>Vista de lectura (preview)</strong>
          <div style={{ border: '1px solid #222', height: 360, marginTop: 8, padding: 16, overflow: 'hidden', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>
              {script.split(/\r?\n/).map((l, i) => (
                <div key={i} style={{ margin: '8px 0' }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, color: '#666' }}>Worker ready: {workerReady ? 'yes' : 'loading...'}</div>
    </div>
  )
}
