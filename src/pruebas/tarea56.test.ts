import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encenderCamara } from '../lib/camara'

const mockStart = vi.fn().mockResolvedValue({ width: 800, height: 600, x: 0, y: 0 })
const mockStop = vi.fn().mockResolvedValue(undefined)
const mockFlip = vi.fn().mockResolvedValue(undefined)

vi.mock('@capgo/camera-preview', () => {
  return {
    CameraPreview: {
      start: (...args: any[]) => mockStart(...args),
      stop: (...args: any[]) => mockStop(...args),
      flip: (...args: any[]) => mockFlip(...args)
    }
  }
})

describe('Pruebas TAREA 56', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('T273: encenderCamara llama a start con disableAudio en true y enableVideoMode en false.', async () => {
    await encenderCamara('frontal')

    expect(mockStart).toHaveBeenCalledTimes(1)
    const opciones = mockStart.mock.calls[0][0]

    expect(opciones.disableAudio).toBe(true)
    expect(opciones.enableVideoMode).toBe(false)
    expect(opciones.toBack).toBe(true)
    expect(opciones.position).toBe('front')
  })
})
