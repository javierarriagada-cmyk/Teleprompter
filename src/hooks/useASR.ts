import { useEffect, useRef, useState } from 'react'

type ASROptions = { engine: 'whisper' | 'webspeech'; lang?: string }

export default function useASR(options: ASROptions) {
  const { engine, lang = 'es-ES' } = options
  const workerRef = useRef<Worker | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [workerReady, setWorkerReady] = useState(false)

  useEffect(() => {
    // create worker
    const worker = new Worker(new URL('../workers/asr.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data
      if (msg.type === 'ready') {
        setWorkerReady(true)
      } else if (msg.type === 'transcript') {
        setTranscript((t) => (t + '\n' + msg.text).trim())
      } else if (msg.type === 'error') {
        console.error('Worker error:', msg.error)
      }
    }

    // init worker with engine/lang
    worker.postMessage({ type: 'init', engine, lang })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // if engine changes, inform worker
    if (workerRef.current) workerRef.current.postMessage({ type: 'set-engine', engine })
  }, [engine])

  async function start() {
    if (engine === 'webspeech') {
      // fallback: use Web Speech API in main thread
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert('Web Speech API no disponible')
        return
      }
      const recognition = new SpeechRecognition()
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i]
          if (res.isFinal) final += res[0].transcript
        }
        if (final) setTranscript((t) => (t + '\n' + final).trim())
      }
      recognition.onerror = (e) => console.error('SpeechRecognition error', e)
      recognition.start()
      // store on mediaRecorderRef to be able to stop
      // @ts-ignore
      mediaRecorderRef.current = recognition as any
      setIsRecording(true)
      return
    }

    // whisper path: capture mic, MediaRecorder chunking, decode and send Float32 to worker
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const options: MediaRecorderOptions = { mimeType: 'audio/webm' }
      const recorder = new MediaRecorder(stream, options)
      recorder.ondataavailable = async (ev) => {
        if (ev.data && ev.data.size > 0) {
          try {
            const arrayBuffer = await ev.data.arrayBuffer()
            // decode to AudioBuffer in main thread
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer)
            // mixdown to mono
            const ch = audioBuffer.numberOfChannels
            const len = audioBuffer.length
            const res = new Float32Array(len)
            if (ch === 1) {
              res.set(audioBuffer.getChannelData(0))
            } else {
              for (let c = 0; c < ch; c++) {
                const data = audioBuffer.getChannelData(c)
                for (let i = 0; i < len; i++) res[i] += data[i] / ch
              }
            }
            // send to worker (transfer the underlying buffer)
            const worker = workerRef.current
            if (worker) {
              worker.postMessage({ type: 'audio-chunk', data: res.buffer }, [res.buffer])
            }
          } catch (err) {
            console.error('decode error', err)
          }
        }
      }
      recorder.onstart = () => setIsRecording(true)
      recorder.onstop = () => setIsRecording(false)
      recorder.start(2500) // 2.5s timeslice
      mediaRecorderRef.current = recorder
    } catch (err) {
      console.error('getUserMedia error', err)
      alert('No se pudo acceder al micrófono')
    }
  }

  function stop() {
    // stop media recorder or speech recognition
    const mr = mediaRecorderRef.current as any
    if (!mr) return
    try {
      if (mr instanceof MediaRecorder) {
        mr.stop()
      } else {
        // SpeechRecognition
        mr.stop()
      }
    } catch (e) {}
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    setIsRecording(false)
  }

  function clear() {
    setTranscript('')
  }

  return { start, stop, isRecording, transcript, clear, workerReady }
}
