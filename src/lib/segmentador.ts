export type Trama = { pcm: Float32Array; hablando: boolean }
export type Transcriptor = (pcm: Float32Array) => Promise<string>

export const MS_PREROLL = 300
export const MS_SILENCIO_CIERRE = 400
export const MS_MIN_SEGMENTO = 350
export const MS_MAX_SEGMENTO = 8000
export const MS_COLA_TRAS_CORTE = 200

export function crearSegmentador(opciones: {
  sampleRate: number
  transcribir: Transcriptor
  alFinal: (e: { texto: string; inicioMs: number; finMs: number }) => void
  alDescartar: (motivo: string, ms: number) => void
}) {
  const { sampleRate, transcribir, alFinal, alDescartar } = opciones

  const muestrasPreroll = Math.floor((MS_PREROLL / 1000) * sampleRate)
  const muestrasSilencioCierre = Math.floor((MS_SILENCIO_CIERRE / 1000) * sampleRate)
  const muestrasMinSegmento = Math.floor((MS_MIN_SEGMENTO / 1000) * sampleRate)
  const muestrasMaxSegmento = Math.floor((MS_MAX_SEGMENTO / 1000) * sampleRate)
  const muestrasColaTrasCorte = Math.floor((MS_COLA_TRAS_CORTE / 1000) * sampleRate)

  let estado: 'REPOSO' | 'HABLANDO' = 'REPOSO'
  let bufferPreroll: Float32Array[] = []
  let totalMuestrasPreroll = 0

  let bufferSegmento: Float32Array[] = []
  let totalMuestrasSegmento = 0

  let muestrasSilencio = 0
  let tiempoInicioMs = 0
  let tiempoAbsolutoMs = 0

  function concatenarBuffers(buffers: Float32Array[], totalMuestras: number): Float32Array {
    const res = new Float32Array(totalMuestras)
    let offset = 0
    for (const b of buffers) {
      res.set(b, offset)
      offset += b.length
    }
    return res
  }

  function agregarAPreroll(pcm: Float32Array) {
    bufferPreroll.push(pcm)
    totalMuestrasPreroll += pcm.length
    while (totalMuestrasPreroll - bufferPreroll[0].length >= muestrasPreroll) {
      const removido = bufferPreroll.shift()!
      totalMuestrasPreroll -= removido.length
    }
  }

  function procesarCierreSegmento(continuarConCola = false) {
    if (totalMuestrasSegmento === 0) {
      estado = 'REPOSO'
      return
    }

    const pcmSegmento = concatenarBuffers(bufferSegmento, totalMuestrasSegmento)
    const duracionMs = Math.round((pcmSegmento.length / sampleRate) * 1000)
    const finMs = tiempoInicioMs + duracionMs

    if (pcmSegmento.length < muestrasMinSegmento) {
      alDescartar(`Segmento demasiado corto (${duracionMs} ms < ${MS_MIN_SEGMENTO} ms)`, duracionMs)
    } else {
      const inicioMs = tiempoInicioMs
      try {
        const res = transcribir(pcmSegmento)
        Promise.resolve(res).then((texto) => {
          if (texto && texto.trim()) {
            alFinal({ texto: texto.trim(), inicioMs, finMs })
          }
        }).catch((err) => {
          console.error('[Segmentador] Error al transcribir segmento:', err)
        })
      } catch (err) {
        console.error('[Segmentador] Error al llamar a transcribir:', err)
      }
    }

    bufferSegmento = []
    totalMuestrasSegmento = 0
    muestrasSilencio = 0

    if (continuarConCola && pcmSegmento.length >= muestrasColaTrasCorte) {
      const cola = pcmSegmento.subarray(pcmSegmento.length - muestrasColaTrasCorte)
      bufferSegmento.push(cola)
      totalMuestrasSegmento = cola.length
      tiempoInicioMs = finMs - MS_COLA_TRAS_CORTE
      estado = 'HABLANDO'
    } else {
      estado = 'REPOSO'
    }
  }

  return {
    alimentar(t: Trama) {
      const msTrama = (t.pcm.length / sampleRate) * 1000
      tiempoAbsolutoMs += msTrama

      if (estado === 'REPOSO') {
        agregarAPreroll(t.pcm)
        if (t.hablando) {
          estado = 'HABLANDO'
          tiempoInicioMs = Math.max(0, tiempoAbsolutoMs - msTrama - (totalMuestrasPreroll / sampleRate) * 1000)
          bufferSegmento = [...bufferPreroll]
          totalMuestrasSegmento = totalMuestrasPreroll
          bufferPreroll = []
          totalMuestrasPreroll = 0
          muestrasSilencio = 0
        }
      } else if (estado === 'HABLANDO') {
        bufferSegmento.push(t.pcm)
        totalMuestrasSegmento += t.pcm.length

        if (!t.hablando) {
          muestrasSilencio += t.pcm.length
        } else {
          muestrasSilencio = 0
        }

        if (muestrasSilencio >= muestrasSilencioCierre) {
          procesarCierreSegmento(false)
        } else if (totalMuestrasSegmento >= muestrasMaxSegmento) {
          procesarCierreSegmento(true)
        }
      }
    },

    flush() {
      if (estado === 'HABLANDO') {
        procesarCierreSegmento(false)
      }
    },

    reset() {
      estado = 'REPOSO'
      bufferPreroll = []
      totalMuestrasPreroll = 0
      bufferSegmento = []
      totalMuestrasSegmento = 0
      muestrasSilencio = 0
      tiempoInicioMs = 0
      tiempoAbsolutoMs = 0
    }
  }
}
