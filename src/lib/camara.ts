import { registerPlugin } from '@capacitor/core'
import { CameraPreview, CameraPosition } from '@capgo/camera-preview'

const Fondo = registerPlugin<any>('Fondo')

export type LadoCamara = 'frontal' | 'trasera'

let estaEncendida = false
let ladoEstado: LadoCamara = 'frontal'

export function camaraEncendida(): boolean {
  return estaEncendida
}

export function ladoActual(): LadoCamara {
  return ladoEstado
}

export async function apagarCamara(): Promise<void> {
  try {
    if (estaEncendida) {
      await CameraPreview.stop()
      try {
        await Fondo.restaurar()
      } catch (e) {
      }
    }
  } catch (e) {
    // ignorar error al apagar
  } finally {
    estaEncendida = false
  }
}

export async function encenderCamara(lado: LadoCamara): Promise<void> {
  if (estaEncendida) {
    await apagarCamara()
  }

  const pos: CameraPosition = lado === 'frontal' ? 'front' : 'rear'
  const width = typeof window !== 'undefined' ? (window.screen.width || window.innerWidth) : 0
  const height = typeof window !== 'undefined' ? (window.screen.height || window.innerHeight) : 0

  try {
    try {
      await Fondo.transparente()
    } catch (e) {
    }
    await CameraPreview.start({
      toBack: true,
      enableVideoMode: false,
      disableAudio: true,
      position: pos,
      x: 0,
      y: 0,
      width,
      height,
      aspectMode: 'cover',
      includeSafeAreaInsets: false
    })
    estaEncendida = true
    ladoEstado = lado
  } catch (e) {
    await apagarCamara()
  }
}

export async function cambiarLadoCamara(): Promise<LadoCamara> {
  if (!estaEncendida) {
    return ladoEstado
  }
  try {
    await CameraPreview.flip()
    ladoEstado = ladoEstado === 'frontal' ? 'trasera' : 'frontal'
  } catch (e) {
    // Si falla el flip, se mantiene el estado
  }
  return ladoEstado
}
