import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encenderCamara } from '../lib/camara'
import { CameraPreview } from '@capgo/camera-preview'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

describe('Pruebas TAREA 56', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('T273: encenderCamara llama a CameraPreview.start con disableAudio en false y posición correspondiente.', async () => {
    await encenderCamara('frontal')

    expect(CameraPreview.start).toHaveBeenCalledTimes(1)
    const opciones = (CameraPreview.start as any).mock.calls[0][0]

    expect(opciones.disableAudio).toBe(false)
    expect(opciones.position).toBe('front')
  })
})
