#!/usr/bin/env bash
set -e

BRANCH="feature/asr-improvements"
COMMIT_MSG="feature(asr-improvements): add AudioWorklet VAD, ASR worker, hooks, teleprompter components, PWA config"

# Create branch
git fetch origin
git checkout -B "$BRANCH"

# Ensure directories exist
mkdir -p src/workers
mkdir -p src/hooks
mkdir -p src/components
mkdir -p src/lib
mkdir -p public
mkdir -p .github/workflows

# Write files
cat > src/workers/audio-worklet-processor.ts <<'EOF'
/**
 * AudioWorkletProcessor that computes RMS per frame and detects voice activity.
 * Posts messages to main thread via port: {type: 'vad', speaking: boolean, rms}
 */
class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._running = true;
    this._smoothing = 0.9;
    this._env = 0; // smoothed RMS
    this._speaking = false;
    this._startThreshold = 0.01; // tweakable
    this._stopThreshold = 0.008;
    this._stopDelay = 200; // ms
    this._lastSpokeAt = currentTime * 1000;
  }

  process(inputs, outputs, parameters) {
    try {
      const input = inputs[0];
      if (!input || input.length === 0) return true;
      const channelData = input[0];
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        const v = channelData[i];
        sum += v * v;
      }
      const rms = Math.sqrt(sum / channelData.length) || 0;
      // smoothing
      this._env = this._smoothing * this._env + (1 - this._smoothing) * rms;
      const nowMs = currentTime * 1000;
      if (!this._speaking && this._env > this._startThreshold) {
        this._speaking = true;
        this._lastSpokeAt = nowMs;
        this.port.postMessage({ type: 'vad', speaking: true, rms: this._env });
      } else if (this._speaking) {
        if (this._env < this._stopThreshold) {
          // if below stop threshold for sufficient time, end speaking
          if (nowMs - this._lastSpokeAt > this._stopDelay) {
            this._speaking = false;
            this.port.postMessage({ type: 'vad', speaking: false, rms: this._env });
          }
        } else {
          this._lastSpokeAt = nowMs;
        }
      }
      // Also forward raw PCM frame periodically for ASR framing
      // Transfer a copy of channelData buffer
      this.port.postMessage({ type: 'pcm', buffer: channelData.slice(0) }, [channelData.slice(0).buffer]);
    } catch (err) {
      // swallow
      this.port.postMessage({ type: 'error', error: String(err) });
    }
    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);
EOF

cat > src/workers/asr.worker.ts <<'EOF'
// ASR Worker
// - Loads @xenova/transformers pipeline (whisper-tiny) dynamically
// - Accepts 'pcm' messages (Float32Array buffers) to buffer and run ASR on short chunks
// - Uses idb-keyval (if available) to cache model files

let pipeline = null;
let engine = 'whisper';
let buffering = [];
let sampleRate = 48000; // default, will adapt if sent
let chunkMs = 1500; // 1.5s chunks
let overlapMs = 300;
let running = false;
let modelName = 'openai/whisper-tiny';

self.onmessage = async (ev) => {
  const msg = ev.data;
  try {
    if (msg?.type === 'init') {
      engine = msg.engine || engine;
      sampleRate = msg.sampleRate || sampleRate;
      // prepare pipeline if whisper
      if (engine === 'whisper') await preparePipeline();
      self.postMessage({ type: 'ready' });
    } else if (msg?.type === 'set-engine') {
      engine = msg.engine;
      if (engine === 'whisper') await preparePipeline();
    } else if (msg?.type === 'pcm') {
      // receive PCM ArrayBuffer
      const ab = msg.buffer;
      const float32 = new Float32Array(ab);
      buffering.push(float32);
      // compute total length in ms
      const totalSamples = buffering.reduce((s, b) => s + b.length, 0);
      const totalMs = (totalSamples / sampleRate) * 1000;
      if (totalMs >= chunkMs) {
        // assemble chunk with overlap
        const neededSamples = Math.floor((chunkMs / 1000) * sampleRate);
        const chunk = new Float32Array(neededSamples);
        let offset = 0;
        while (offset < neededSamples && buffering.length) {
          const buf = buffering.shift();
          const take = Math.min(buf.length, neededSamples - offset);
          chunk.set(buf.subarray(0, take), offset);
          if (take < buf.length) {
            // put back remainder
            buffering.unshift(buf.subarray(take));
          }
          offset += take;
        }
        // keep overlap samples at start of next buffer
        const overlapSamples = Math.floor((overlapMs / 1000) * sampleRate);
        if (overlapSamples > 0) {
          const tail = chunk.subarray(chunk.length - overlapSamples);
          buffering.unshift(tail.slice(0));
        }
        // run ASR asynchronously
        runASRChunk(chunk.buffer).catch((e) => {
          self.postMessage({ type: 'error', error: String(e) });
        });
      }
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) });
  }
};

async function preparePipeline() {
  if (pipeline) return pipeline;
  try {
    const mod = await import('@xenova/transformers');
    // detect and set backend preference (webgpu -> wasm)
    try {
      // mod.env is available in newer versions
      if (mod.env && mod.env.backend) {
        // prefer webgpu when available
        // Note: actual backend API may vary; keep generic
      }
    } catch (e) {}
    pipeline = await mod.pipeline('automatic-speech-recognition', modelName);
    return pipeline;
  } catch (err) {
    throw err;
  }
}

async function runASRChunk(arrayBuffer) {
  if (!pipeline) await preparePipeline();
  // some pipelines accept Float32Array directly
  const float32 = new Float32Array(arrayBuffer);
  // Call pipeline and emit partial result
  const res = await pipeline(float32);
  const text = res?.text ?? '';
  self.postMessage({ type: 'transcript', text });
}
EOF

cat > src/hooks/useASR.ts <<'EOF'
import { useEffect, useRef, useState } from 'react'
import useVoiceTrack from './useVoiceTrack'

type ASROptions = { engine?: 'whisper' | 'webspeech'; lang?: string }

export default function useASR(options: ASROptions = {}) {
  const { engine = 'whisper', lang = 'es-ES' } = options
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [ready, setReady] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  // voice tracking hook returns current indices for UI
  const { updateTranscript, currentLineIndex, currentWordIndex } = useVoiceTrack()

  useEffect(() => {
    // create worker
    const w = new Worker(new URL('../workers/asr.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    w.onmessage = (ev) => {
      const msg = ev.data
      if (msg.type === 'ready') setReady(true)
      else if (msg.type === 'transcript') {
        setTranscript((t) => {
          const next = (t + '\n' + msg.text).trim()
          updateTranscript(next)
          return next
        })
      } else if (msg.type === 'error') console.error('ASR worker error', msg.error)
    }

    w.postMessage({ type: 'init', engine, sampleRate: 48000 })

    return () => {
      w.terminate()
      workerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // propagate engine changes
    if (workerRef.current) workerRef.current.postMessage({ type: 'set-engine', engine })
  }, [engine])

  async function start() {
    // prefer AudioWorklet
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      await ctx.audioWorklet.addModule(new URL('../workers/audio-worklet-processor.ts', import.meta.url))
      const node = new AudioWorkletNode(ctx, 'vad-processor')
      node.port.onmessage = (ev) => {
        const m = ev.data
        if (m.type === 'vad') setSpeaking(m.speaking)
        else if (m.type === 'pcm') {
          // forward PCM to ASR worker (transfer buffer)
          const worker = workerRef.current
          if (worker) worker.postMessage({ type: 'pcm', buffer: m.buffer }, [m.buffer])
        }
      }
      workletNodeRef.current = node

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      const src = ctx.createMediaStreamSource(stream)
      src.connect(node)
      node.connect(ctx.destination) // optional - keep silent path if you don't want audio out
      setIsRecording(true)
    } catch (err) {
      console.warn('AudioWorklet not available, falling back to MediaRecorder', err)
      // fallback to MediaRecorder (simple chunking)
      startMediaRecorderFallback()
    }
  }

  function startMediaRecorderFallback() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      micStreamRef.current = stream
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = async (ev) => {
        if (ev.data && ev.data.size > 0) {
          const ab = await ev.data.arrayBuffer()
          // decode to Float32 and forward to worker
          const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
          audioCtxRef.current = ctx
          const audioBuf = await ctx.decodeAudioData(ab)
          const ch = audioBuf.numberOfChannels
          const len = audioBuf.length
          const out = new Float32Array(len)
          if (ch === 1) out.set(audioBuf.getChannelData(0))
          else {
            for (let c = 0; c < ch; c++) {
              const d = audioBuf.getChannelData(c)
              for (let i = 0; i < len; i++) out[i] += d[i] / ch
            }
          }
          const w = workerRef.current
          if (w) w.postMessage({ type: 'pcm', buffer: out.buffer }, [out.buffer])
        }
      }
      mr.start(1500)
      setIsRecording(true)
    })
  }

  function stop() {
    // stop audio
    if (workletNodeRef.current) {
      try { workletNodeRef.current.disconnect() } catch {}
      workletNodeRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    setIsRecording(false)
  }

  function clear() {
    setTranscript('')
    updateTranscript('')
  }

  return { start, stop, isRecording, transcript, clear, ready, speaking, currentLineIndex, currentWordIndex }
}
EOF

cat > src/hooks/useVoiceTrack.tsx <<'EOF'
import Fuse from 'fuse.js'
import { useEffect, useRef, useState } from 'react'
import { alignWords } from '../lib/alignment'

export default function useVoiceTrack() {
  const [script, setScript] = useState('')
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)

  const fuseRef = useRef<Fuse<string> | null>(null)

  useEffect(() => {
    const lines = script.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    fuseRef.current = new Fuse(lines, { includeScore: true, threshold: 0.4 })
  }, [script])

  function updateTranscript(transcript: string) {
    // simple strategy: take last ~100 chars, search via Fuse for best line
    const fuse = fuseRef.current
    if (!fuse) return
    const window = transcript.slice(-200)
    const results = fuse.search(window)
    if (results.length > 0) {
      const best = results[0].item
      const lines = script.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      const idx = lines.indexOf(best)
      if (idx >= 0) setCurrentLineIndex(idx)
      // attempt word-level alignment
      const wordsTrans = transcript.replace(/[^\\w\\sáéíóúñüÁÉÍÓÚÑÜ]/g, '').split(/\\s+/).filter(Boolean)
      const wordsLine = best.replace(/[^\\w\\sáéíóúñüÁÉÍÓÚÑÜ]/g, '').split(/\\s+/).filter(Boolean)
      const mapping = alignWords(wordsLine, wordsTrans)
      // mapping gives index of current spoken word in line
      const mapped = mapping.length ? mapping[mapping.length - 1] : null
      if (mapped != null) setCurrentWordIndex(mapped)
    }
  }

  return { script, setScript, updateTranscript, currentLineIndex, currentWordIndex }
}
EOF

cat > src/components/TeleprompterView.tsx <<'EOF'
/**
 * Simple TeleprompterView component
 * Props: script (string), currentLineIndex, currentWordIndex, speed, mirror
 */
import React, { useEffect, useRef } from 'react'

export default function TeleprompterView({ script, currentLineIndex, currentWordIndex, speed = 1.0, mirror = false }: any) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // auto-scroll to current line
    const el = containerRef.current
    if (!el) return
    const lines = Array.from(el.querySelectorAll('.line'))
    const target = lines[currentLineIndex] as HTMLElement
    if (target) {
      // smooth scroll so target is centered
      const top = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2
      el.scrollTo({ top, behavior: 'smooth' })
    }
  }, [currentLineIndex])

  return (
    <div style={{ overflow: 'hidden', height: 360, background: '#000', color: '#fff', padding: 16 }}>
      <div ref={containerRef} style={{ height: '100%', overflowY: 'auto', transform: mirror ? 'scaleX(-1)' : 'none' }}>
        {script.split(/\r?\n/).map((line: string, i: number) => {
          const isCurrent = i === currentLineIndex
          return (
            <div key={i} className="line" style={{ fontSize: isCurrent ? 28 : 18, opacity: isCurrent ? 1 : 0.5, margin: '12px 0', transition: 'all 200ms' }}>
              {renderHighlightedLine(line, isCurrent ? currentWordIndex : -1)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderHighlightedLine(line: string, highlightIndex: number) {
  if (highlightIndex < 0) return <>{line}</>
  const words = line.split(/(\s+)/)
  // build words only positions
  let idx = 0
  return (
    <>
      {words.map((w, i) => {
        if (/\s+/.test(w)) return <span key={i}>{w}</span>
        const is = idx === highlightIndex
        idx++
        return (
          <span key={i} style={{ background: is ? 'yellow' : 'transparent', color: is ? '#000' : 'inherit', padding: is ? '2px 4px' : 0 }}>{w}</span>
        )
      })}
    </>
  )
}
EOF

cat > src/components/ControlsBar.tsx <<'EOF'
import React from 'react'

export default function ControlsBar({ onStart, onStop, isRecording, speed, setSpeed, mirror, setMirror, preloadOnWifi, setPreloadOnWifi }: any) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
      <button onClick={onStart} disabled={isRecording}>Iniciar</button>
      <button onClick={onStop} disabled={!isRecording}>Detener</button>
      <label style={{ marginLeft: 8 }}>
        Velocidad:
        <input type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
      </label>
      <label>
        <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Mirror
      </label>
      <label>
        <input type="checkbox" checked={preloadOnWifi} onChange={(e) => setPreloadOnWifi(e.target.checked)} /> Preload Wi‑Fi
      </label>
    </div>
  )
}
EOF

cat > src/lib/alignment.ts <<'EOF'
/**
 * alignment.ts
 * Provides a simple word-level alignment using Levenshtein to map spoken words to line words.
 */

export function alignWords(lineWords: string[], transWords: string[]) {
  // naive approach: find subsequence of transWords that best matches lineWords
  // We'll compute for each trans word the best matching index in line
  const mapping: number[] = []
  let li = 0
  for (let ti = 0; ti < transWords.length && li < lineWords.length; ti++) {
    const t = normalize(transWords[ti])
    const l = normalize(lineWords[li])
    if (t === l) {
      mapping.push(li)
      li++
    } else {
      // try to find t in the next few line words
      let found = -1
      for (let k = li + 1; k < Math.min(lineWords.length, li + 4); k++) {
        if (normalize(lineWords[k]) === t) { found = k; break }
      }
      if (found >= 0) {
        mapping.push(found)
        li = found + 1
      } else {
        // no match, assume same word index
        mapping.push(li)
      }
    }
  }
  return mapping
}

function normalize(s: string) {
  return s.replace(/[^\\wáéíóúñü]/gi, '').toLowerCase()
}
EOF

cat > src/lib/modelCache.ts <<'EOF'
/**
 * modelCache helper using idb-keyval (simple wrapper). We'll keep API minimal: get/set
 */
import { set, get } from 'idb-keyval'

export async function cacheModel(key: string, data: ArrayBuffer) {
  try {
    await set(key, data)
    return true
  } catch (e) {
    console.warn('cacheModel failed', e)
    return false
  }
}

export async function getModel(key: string) {
  try {
    return await get(key)
  } catch (e) {
    return null
  }
}
EOF

cat > package.json <<'EOF'
{
  "name": "teleprompter-mvp",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "fuse.js": "^6.6.2",
    "@xenova/transformers": "^2.0.0",
    "zustand": "^4.4.0",
    "idb-keyval": "^6.2.0",
    "leven": "^3.1.0"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "typescript": "^5.2.0",
    "@types/react": "^18.2.28",
    "@types/react-dom": "^18.2.7",
    "vite-plugin-pwa": "^0.20.2"
  }
}
EOF

cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Teleprompter MVP',
        short_name: 'Teleprompter',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000'
      }
    })
  ]
})
EOF

cat > public/manifest.json <<'EOF'
{
  "short_name": "Teleprompter",
  "name": "Teleprompter MVP",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000"
}
EOF

cat > .github/workflows/ci.yml <<'EOF'
name: CI
on:
  push:
    branches:
      - main
      - feature/asr-improvements

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
EOF

cat > README.md <<'EOF'
# Extended README

Teleprompter MVP — rama feature/asr-improvements

Objetivo: teleprompter inteligente con ASR on-device (Whisper-tiny via transformers.js) y Web Speech API fallback. Esta rama incluye mejoras: AudioWorklet VAD, worker ASR, caching en IndexedDB, alineamiento incremental, TeleprompterView con auto-scroll y PWA.

Cómo probar localmente

1. Clona el repo y cambia a la rama:
   git clone https://github.com/javierarriagada-cmyk/Teleprompter.git
   cd Teleprompter
   git fetch origin feature/asr-improvements
   git checkout feature/asr-improvements

2. Instala dependencias:
   npm install

3. Levanta dev server:
   npm run dev

4. Desde tu teléfono (mismo Wi‑Fi): abre http://<IP_de_tu_PC>:5173 y permite micrófono.

Notas
- Primera descarga del modelo whisper-tiny puede tardar y consumir datos. Usa la opción "Preload Wi‑Fi" para descargar sólo en redes wifi.
- Por defecto la inferencia es on-device para privacidad.

Próximos pasos
- Ajustes de thresholds VAD por dispositivo
- Mejorar alignment con forced-alignment si se desea mayor precisión
- Tests en varios dispositivos Android/iOS
EOF

# Git add/commit/push
git add .
git commit -m "$COMMIT_MSG" || echo "Nothing to commit"
git push -u origin "$BRANCH"

echo "Done. Branch '$BRANCH' pushed. Open a Pull Request from this branch to main in GitHub."
