// ASR Worker con @huggingface/transformers y segmentador VAD
import { pipeline } from '@huggingface/transformers'
import { crearSegmentador, Trama } from '../lib/segmentador'

export const MODELO = 'onnx-community/whisper-base'

let asrPipeline: any = null
let segmentador: any = null
let sampleRate = 16000
let dispositivoUsado: 'webgpu' | 'wasm' = 'webgpu'

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data
  try {
    if (msg?.tipo === 'init') {
      sampleRate = msg.sampleRate || 16000
      const modelo = msg.modelo || MODELO
      await cargarPipeline(modelo)

      segmentador = crearSegmentador({
        sampleRate,
        transcribir: async (pcm) => {
          if (!asrPipeline) return ''
          const res = await asrPipeline(pcm, { language: 'es', task: 'transcribe' })
          return res?.text ?? ''
        },
        alFinal: (e) => {
          self.postMessage({
            tipo: 'final',
            texto: e.texto,
            inicioMs: e.inicioMs,
            finMs: e.finMs
          })
        },
        alDescartar: (motivo, ms) => {
          console.warn(`[ASR Worker] Segmento descartado: ${motivo} (${ms} ms)`)
        }
      })

      self.postMessage({ tipo: 'listo', dispositivo: dispositivoUsado })
    } else if (msg?.tipo === 'audio') {
      if (segmentador && msg.pcm) {
        const float32 = new Float32Array(msg.pcm)
        const trama: Trama = { pcm: float32, hablando: !!msg.hablando }
        segmentador.alimentar(trama)
      }
    } else if (msg?.tipo === 'flush') {
      if (segmentador) segmentador.flush()
    } else if (msg?.tipo === 'reset') {
      if (segmentador) segmentador.reset()
    }
  } catch (err: any) {
    self.postMessage({ tipo: 'error', mensaje: err?.message || String(err) })
  }
}

async function cargarPipeline(modelo: string) {
  if (asrPipeline) return asrPipeline

  const progressCallback = (p: any) => {
    const pct = typeof p?.progress === 'number' ? p.progress : 0
    self.postMessage({ tipo: 'progreso', pct })
  }

  try {
    dispositivoUsado = 'webgpu'
    asrPipeline = await pipeline('automatic-speech-recognition', modelo, {
      device: 'webgpu',
      dtype: 'q8',
      progress_callback: progressCallback
    })
    return asrPipeline
  } catch (errWebGPU) {
    console.warn('[ASR Worker] Falló WebGPU, reintentando con WASM:', errWebGPU)
    try {
      dispositivoUsado = 'wasm'
      asrPipeline = await pipeline('automatic-speech-recognition', modelo, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: progressCallback
      })
      return asrPipeline
    } catch (errWasm) {
      throw new Error(`Error al cargar el modelo Whisper tanto en WebGPU como en WASM: ${String(errWasm)}`)
    }
  }
}
