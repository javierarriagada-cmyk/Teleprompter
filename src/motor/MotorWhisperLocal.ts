import { remuestrear } from '../lib/remuestrear'
import { EventoFinal, EventoParcial, MotorDeVoz } from './MotorDeVoz'

export class MotorWhisperLocal implements MotorDeVoz {
  readonly id = 'whisper-local'
  readonly nombre = 'Whisper Local (On-Device WebGPU/WASM)'

  private worker: Worker | null = null
  private audioCtx: AudioContext | null = null
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null

  private listenersParcial: Array<(e: EventoParcial) => void> = []
  private listenersFinal: Array<(e: EventoFinal) => void> = []
  private listenersError: Array<(e: Error) => void> = []
  private listenersProgreso: Array<(pct: number) => void> = []

  public dispositivoComputo: 'webgpu' | 'wasm' | 'cargando' = 'cargando'
  public progresoDescarga = 0

  async disponible(): Promise<boolean> {
    const tieneWorker = typeof Worker !== 'undefined'
    const tieneAudioContext = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
    const tieneMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    return tieneWorker && tieneAudioContext && tieneMediaDevices
  }

  async iniciar(opciones: { lang: string }): Promise<void> {
    const isDisponible = await this.disponible()
    if (!isDisponible) {
      throw new Error('Whisper Local no está disponible en este navegador o entorno (falta WebWorker/AudioContext/micrófono).')
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        const workerUrl = new URL('../workers/asr.worker.ts', import.meta.url)
        this.worker = new Worker(workerUrl, { type: 'module' })

        let resolved = false

        this.worker.onmessage = (ev: MessageEvent) => {
          const msg = ev.data
          if (msg.tipo === 'listo') {
            this.dispositivoComputo = msg.dispositivo || 'webgpu'
            if (!resolved) {
              resolved = true
              resolve()
            }
          } else if (msg.tipo === 'progreso') {
            this.progresoDescarga = msg.pct || 0
            this.listenersProgreso.forEach((cb) => cb(this.progresoDescarga))
          } else if (msg.tipo === 'final') {
            this.listenersFinal.forEach((cb) =>
              cb({ texto: msg.texto, inicioMs: msg.inicioMs, finMs: msg.finMs })
            )
          } else if (msg.tipo === 'error') {
            const err = new Error(msg.mensaje || 'Error desconocido en worker Whisper')
            this.listenersError.forEach((cb) => cb(err))
            if (!resolved) {
              resolved = true
              reject(err)
            }
          }
        }

        this.worker.postMessage({
          tipo: 'init',
          modelo: 'onnx-community/whisper-base',
          sampleRate: 16000
        })

        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        this.audioCtx = new AudioCtxClass()
        const ctxSampleRate = this.audioCtx.sampleRate

        const urlVadProcessor = new URL('../workers/vad-processor.ts?worker&url', import.meta.url).href
        await this.audioCtx.audioWorklet.addModule(urlVadProcessor)

        this.workletNode = new AudioWorkletNode(this.audioCtx, 'vad-processor', {
          processorOptions: { sampleRate: ctxSampleRate }
        })
        this.workletNode.port.onmessage = (ev: MessageEvent) => {
          const m = ev.data
          if (m.tipo === 'audio') {
            let pcm = new Float32Array(m.pcm)
            if (ctxSampleRate !== 16000) {
              pcm = remuestrear(pcm, ctxSampleRate, 16000)
            }
            if (this.worker) {
              this.worker.postMessage(
                { tipo: 'audio', pcm: pcm.buffer, hablando: m.hablando },
                [pcm.buffer]
              )
            }
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        })
        this.stream = stream

        const src = this.audioCtx.createMediaStreamSource(stream)
        src.connect(this.workletNode)
      } catch (err: any) {
        this.detener()
        reject(err)
      }
    })
  }

  async detener(): Promise<void> {
    if (this.worker) {
      try {
        this.worker.postMessage({ tipo: 'flush' })
      } catch (e) {}
      this.worker.terminate()
      this.worker = null
    }

    if (this.workletNode) {
      try { this.workletNode.disconnect() } catch (e) {}
      this.workletNode = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }

    if (this.audioCtx) {
      try { await this.audioCtx.close() } catch (e) {}
      this.audioCtx = null
    }
  }

  onParcial(cb: (e: EventoParcial) => void): () => void {
    this.listenersParcial.push(cb)
    return () => {
      this.listenersParcial = this.listenersParcial.filter((l) => l !== cb)
    }
  }

  onFinal(cb: (e: EventoFinal) => void): () => void {
    this.listenersFinal.push(cb)
    return () => {
      this.listenersFinal = this.listenersFinal.filter((l) => l !== cb)
    }
  }

  onError(cb: (e: Error) => void): () => void {
    this.listenersError.push(cb)
    return () => {
      this.listenersError = this.listenersError.filter((l) => l !== cb)
    }
  }

  onProgreso(cb: (pct: number) => void): () => void {
    this.listenersProgreso.push(cb)
    return () => {
      this.listenersProgreso = this.listenersProgreso.filter((l) => l !== cb)
    }
  }
}
