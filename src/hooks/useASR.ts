import { useEffect, useRef, useState } from 'react'
import useVoiceTrack from './useVoiceTrack'

type ASROptions = { engine?: 'whisper' | 'webspeech'; lang?: string }

export default function useASR(options: ASROptions = {}) {
  const { engine = 'whisper', lang = 'es-ES' } = options
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const speechRecognitionRef = useRef<any>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [ready, setReady] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  // voice tracking hook returns current indices for UI
  const { setScript, updateTranscript, currentLineIndex, currentWordIndex } = useVoiceTrack()

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
    if (engine === 'webspeech') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert('Web Speech API no disponible')
        return
      }
      const recognition = new SpeechRecognition()
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (event: any) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i]
          if (res.isFinal) final += res[0].transcript
        }
        if (final) {
          setTranscript((t) => {
            const next = (t + '\n' + final).trim()
            updateTranscript(next)
            return next
          })
        }
      }
      recognition.onerror = (e: any) => console.error('SpeechRecognition error', e)
      recognition.start()
      speechRecognitionRef.current = recognition
      setIsRecording(true)
      return
    }

    // prefer AudioWorklet for whisper
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
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop() } catch {}
      speechRecognitionRef.current = null
    }
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
    setSpeaking(false)
  }

  function clear() {
    setTranscript('')
    updateTranscript('')
  }

  return { start, stop, isRecording, transcript, clear, ready, speaking, currentLineIndex, currentWordIndex, setScript }
}
