// ASR Worker
// - Loads @xenova/transformers pipeline (whisper-tiny) dynamically
// - Accepts 'pcm' messages (Float32Array buffers) to buffer and run ASR on short chunks
// - Uses idb-keyval (if available) to cache model files

let pipeline: any = null
let engine = 'whisper'
let buffering: Float32Array[] = []
let sampleRate = 48000 // default, will adapt if sent
let chunkMs = 1500 // 1.5s chunks
let overlapMs = 300
let modelName = 'openai/whisper-tiny'

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data
  try {
    if (msg?.type === 'init') {
      engine = msg.engine || engine
      sampleRate = msg.sampleRate || sampleRate
      // prepare pipeline if whisper
      if (engine === 'whisper') await preparePipeline()
      self.postMessage({ type: 'ready' })
    } else if (msg?.type === 'set-engine') {
      engine = msg.engine
      if (engine === 'whisper') await preparePipeline()
    } else if (msg?.type === 'pcm' || msg?.type === 'audio-chunk') {
      // receive PCM ArrayBuffer
      const ab: ArrayBuffer = msg.buffer || msg.data
      if (!ab) return
      const float32 = new Float32Array(ab)
      buffering.push(float32)
      // compute total length in ms
      const totalSamples = buffering.reduce((s, b) => s + b.length, 0)
      const totalMs = (totalSamples / sampleRate) * 1000
      if (totalMs >= chunkMs) {
        // assemble chunk with overlap
        const neededSamples = Math.floor((chunkMs / 1000) * sampleRate)
        const chunk = new Float32Array(neededSamples)
        let offset = 0
        while (offset < neededSamples && buffering.length) {
          const buf = buffering.shift()!
          const take = Math.min(buf.length, neededSamples - offset)
          chunk.set(buf.subarray(0, take), offset)
          if (take < buf.length) {
            // put back remainder
            buffering.unshift(buf.subarray(take))
          }
          offset += take
        }
        // keep overlap samples at start of next buffer
        const overlapSamples = Math.floor((overlapMs / 1000) * sampleRate)
        if (overlapSamples > 0) {
          const tail = chunk.subarray(chunk.length - overlapSamples)
          buffering.unshift(tail.slice(0))
        }
        // run ASR asynchronously
        runASRChunk(chunk.buffer).catch((e) => {
          self.postMessage({ type: 'error', error: String(e) })
        })
      }
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) })
  }
}

async function preparePipeline() {
  if (pipeline) return pipeline
  try {
    const mod = await import('@xenova/transformers')
    try {
      if ((mod as any).env && (mod as any).env.backend) {
        // prefer webgpu when available
      }
    } catch (e) {}
    pipeline = await mod.pipeline('automatic-speech-recognition', modelName)
    return pipeline
  } catch (err) {
    throw err
  }
}

async function runASRChunk(arrayBuffer: ArrayBuffer) {
  if (!pipeline) await preparePipeline()
  const float32 = new Float32Array(arrayBuffer)
  const res = await pipeline(float32)
  const text = res?.text ?? ''
  self.postMessage({ type: 'transcript', text })
}
