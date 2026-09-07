import { createModel, Model } from 'vosk-browser'

export const MODELO_URL_DEFECTO = 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.tar.gz'

let modelInstance: Model | null = null
let recognizerInstance: any = null

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data
  try {
    if (msg?.tipo === 'init') {
      const modelUrl = msg.modelUrl || MODELO_URL_DEFECTO
      await cargarModeloYCrearReconocedor(modelUrl)
    } else if (msg?.tipo === 'audio') {
      if (recognizerInstance && msg.pcm) {
        const float32 = new Float32Array(msg.pcm)
        recognizerInstance.acceptWaveformFloat(float32, 16000)
      }
    } else if (msg?.tipo === 'detener') {
      if (recognizerInstance) {
        try { recognizerInstance.remove() } catch (e) {}
        recognizerInstance = null
      }
      if (modelInstance) {
        try { modelInstance.terminate() } catch (e) {}
        modelInstance = null
      }
    }
  } catch (err: any) {
    self.postMessage({ tipo: 'error', mensaje: err?.message || String(err) })
  }
}

async function cargarModeloYCrearReconocedor(url: string) {
  let modelBlobUrl = url

  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open('vosk-model-v1')
      const cachedResponse = await cache.match(url)
      if (cachedResponse) {
        const blob = await cachedResponse.blob()
        modelBlobUrl = URL.createObjectURL(blob)
        self.postMessage({ tipo: 'progreso', pct: 1.0 })
      } else {
        modelBlobUrl = await descargarYCachearModelo(url, cache)
      }
    } else {
      modelBlobUrl = await descargarYCachearModelo(url, null)
    }
  } catch (e) {
    console.warn('[Vosk Worker] Falló caché/descarga manual, intentando cargar directamente:', e)
  }

  modelInstance = await createModel(modelBlobUrl)
  recognizerInstance = new modelInstance.KaldiRecognizer(16000)

  recognizerInstance.on('partialresult', (message: any) => {
    const text = message?.result?.partial || ''
    if (text.trim()) {
      self.postMessage({ tipo: 'parcial', texto: text })
    }
  })

  recognizerInstance.on('result', (message: any) => {
    const text = message?.result?.text || ''
    if (text.trim()) {
      self.postMessage({
        tipo: 'final',
        texto: text,
        inicioMs: Date.now(),
        finMs: Date.now()
      })
    }
  })

  self.postMessage({ tipo: 'listo' })
}

async function descargarYCachearModelo(url: string, cache: Cache | null): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} descargando el modelo Vosk desde ${url}`)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0
  let loaded = 0

  if (!response.body) {
    const blob = await response.blob()
    if (cache) {
      try { await cache.put(url, new Response(blob)) } catch (e) {}
    }
    self.postMessage({ tipo: 'progreso', pct: 1.0 })
    return URL.createObjectURL(blob)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      loaded += value.length
      if (total > 0) {
        self.postMessage({ tipo: 'progreso', pct: loaded / total })
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[])
  if (cache) {
    try {
      await cache.put(url, new Response(blob))
    } catch (e) {}
  }
  self.postMessage({ tipo: 'progreso', pct: 1.0 })
  return URL.createObjectURL(blob)
}
