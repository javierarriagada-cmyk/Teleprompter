declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void;
declare const currentTime: number;

/**
 * AudioWorkletProcessor that computes RMS per frame and detects voice activity.
 * Posts messages to main thread via port: {type: 'vad', speaking: boolean, rms}
 */
class VADProcessor extends AudioWorkletProcessor {
  private _running: boolean;
  private _smoothing: number;
  private _env: number;
  private _speaking: boolean;
  private _startThreshold: number;
  private _stopThreshold: number;
  private _stopDelay: number;
  private _lastSpokeAt: number;

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

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
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
      const copy = channelData.slice(0);
      this.port.postMessage({ type: 'pcm', buffer: copy }, [copy.buffer]);
    } catch (err) {
      // swallow
      this.port.postMessage({ type: 'error', error: String(err) });
    }
    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);
