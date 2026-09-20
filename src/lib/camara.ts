export type LadoCamara = 'frontal' | 'trasera'
export type ModoCamara = 'apagada' | 'frontal' | 'trasera'

let streamActivo: MediaStream | null = null
let estaEncendida = false
let ladoEstado: LadoCamara = 'frontal'

export function camaraEncendida(): boolean {
  return estaEncendida
}

export function ladoActual(): LadoCamara {
  return ladoEstado
}

export function streamActual(): MediaStream | null {
  return streamActivo
}

export function apagarCamara(): void {
  if (streamActivo) {
    try {
      streamActivo.getTracks().forEach((track) => track.stop())
    } catch (e) {
    }
  }
  streamActivo = null
  estaEncendida = false
}

export async function encenderCamara(lado: LadoCamara): Promise<MediaStream | null> {
  if (estaEncendida) {
    apagarCamara()
  }

  const modoFacing = lado === 'frontal' ? 'user' : 'environment'

  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      apagarCamara()
      return null
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: modoFacing },
      audio: false
    })

    streamActivo = stream
    estaEncendida = true
    ladoEstado = lado
    return stream
  } catch (e) {
    apagarCamara()
    return null
  }
}

export async function cambiarLadoCamara(): Promise<MediaStream | null> {
  const nuevoLado: LadoCamara = ladoEstado === 'frontal' ? 'trasera' : 'frontal'
  return await encenderCamara(nuevoLado)
}
