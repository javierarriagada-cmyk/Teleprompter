declare class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor(options?: any)
}
declare function registerProcessor(name: string, processorCtor: new (options?: any) => AudioWorkletProcessor): void
declare const currentTime: number

/**
 * AudioWorkletProcessor autocontenido (sin imports) que procesa audio en bloques de 100 ms (derivado de sampleRate),
 * calibra el piso de ruido en los primeros 500 ms, y emite mensajes con el buffer PCM y estado VAD.
 */
class VADProcessor extends AudioWorkletProcessor {
  private _smoothing: number
  private _env: number
  private _speaking: boolean
  private _startThreshold: number
  private _stopThreshold: number
  private _stopDelay: number
  private _lastSpokeAt: number
  private _pisoRuidoMuestras: number
  private _pisoRuidoSum: number
  private _calibrando: boolean
  private _tamanoBloque: number
  private _bufferAcumulado: Float32Array
  private _muestrasAcumuladas: number

  constructor(options?: any) {
    super(options)
    const sr = options?.processorOptions?.sampleRate || 16000
    this._tamanoBloque = Math.floor(sr * 0.1) // 100 ms de muestras según la tasa de muestreo real

    this._smoothing = 0.9
    this._env = 0
    this._speaking = false
    this._startThreshold = 0.012
    this._stopThreshold = 0.0072
    this._stopDelay = 400
    this._lastSpokeAt = 0

    this._pisoRuidoMuestras = 0
    this._pisoRuidoSum = 0
    this._calibrando = true

    this._bufferAcumulado = new Float32Array(this._tamanoBloque)
    this._muestrasAcumuladas = 0
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][], _parameters: Record<string, Float32Array>) {
    try {
      const input = inputs[0]
      if (!input || input.length === 0) return true
      const channelData = input[0]
      if (!channelData || channelData.length === 0) return true

      let sum = 0
      for (let i = 0; i < channelData.length; i++) {
        const v = channelData[i]
        sum += v * v
      }
      const rms = Math.sqrt(sum / channelData.length) || 0

      // Calibración del piso de ruido durante las primeras ~500 ms
      if (this._calibrando) {
        this._pisoRuidoSum += rms
        this._pisoRuidoMuestras++
        if (this._pisoRuidoMuestras >= 60) {
          const pisoRuido = this._pisoRuidoSum / this._pisoRuidoMuestras
          this._startThreshold = Math.max(0.012, pisoRuido * 3)
          this._stopThreshold = this._startThreshold * 0.6
          this._calibrando = false
        }
      }

      this._env = this._smoothing * this._env + (1 - this._smoothing) * rms
      const nowMs = typeof currentTime !== 'undefined' ? currentTime * 1000 : Date.now()

      if (!this._speaking && this._env > this._startThreshold) {
        this._speaking = true
        this._lastSpokeAt = nowMs
      } else if (this._speaking) {
        if (this._env < this._stopThreshold) {
          if (nowMs - this._lastSpokeAt > this._stopDelay) {
            this._speaking = false
          }
        } else {
          this._lastSpokeAt = nowMs
        }
      }

      // Acumular muestras para emitir en bloques de 100 ms según el sampleRate
      let offset = 0
      while (offset < channelData.length) {
        const espacio = this._tamanoBloque - this._muestrasAcumuladas
        const aCopiar = Math.min(espacio, channelData.length - offset)
        this._bufferAcumulado.set(channelData.subarray(offset, offset + aCopiar), this._muestrasAcumuladas)
        this._muestrasAcumuladas += aCopiar
        offset += aCopiar

        if (this._muestrasAcumuladas === this._tamanoBloque) {
          const bloque = this._bufferAcumulado.slice(0)
          this.port.postMessage(
            { tipo: 'audio', pcm: bloque.buffer, hablando: this._speaking, rms: this._env },
            [bloque.buffer]
          )
          this._muestrasAcumuladas = 0
        }
      }
    } catch (err) {
      this.port.postMessage({ tipo: 'error', mensaje: String(err) })
    }
    return true
  }
}

registerProcessor('vad-processor', VADProcessor)
