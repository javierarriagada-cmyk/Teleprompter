// Worker that runs transformers.js pipeline for ASR
// Receives Float32Array audio buffers (mono, 16k-48k sample rate depending on decode) via postMessage

let pipeline: any = null
let ready = false

self.onmessage = async (ev) => {
  const msg = ev.data
  try {
    if (msg.type === 'init') {
      // initial message
      const { engine, lang } = msg
      // prepare pipeline if engine === 'whisper'
      if (engine === 'whisper') await preparePipeline()
      self.postMessage({ type: 'ready' })
    } else if (msg.type === 'set-engine') {
      if (msg.engine === 'whisper') await preparePipeline()
    } else if (msg.type === 'audio-chunk') {
      // msg.data is an ArrayBuffer (transfered)
      const ab = msg.data as ArrayBuffer
      const float32 = new Float32Array(ab)
      // call pipeline
      if (!pipeline) {
        // not ready
        self.postMessage({ type: 'error', error: 'Pipeline not ready' })
        return
      }
      try {
        const result = await pipeline(float32)
        const text = result?.text ?? ''
        self.postMessage({ type: 'transcript', text })
      } catch (err) {
        self.postMessage({ type: 'error', error: String(err) })
      }
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) })
  }
}

async function preparePipeline() {
  if (pipeline) return pipeline
  try {
    // dynamic import
    const mod = await import('@xenova/transformers')
    // Optionally configure backend here (wasm/webgpu)
    // await mod.env.start({ progress: (p:any)=>{ /* optional */ } })
    pipeline = await mod.pipeline('automatic-speech-recognition', 'openai/whisper-tiny')
    ready = true
    return pipeline
  } catch (err) {
    self.postMessage({ type: 'error', error: 'Failed to load pipeline: ' + String(err) })
    throw err
  }
}
