import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encenderCamara } from '../lib/camara'

const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }]
})

describe('Pruebas TAREA 56', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia
      },
      writable: true,
      configurable: true
    })
  })

  it('T273: encenderCamara llama a getUserMedia con audio en false y facingMode correspondiente.', async () => {
    await encenderCamara('frontal')

    expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
    const opciones = mockGetUserMedia.mock.calls[0][0]

    expect(opciones.audio).toBe(false)
    expect(opciones.video.facingMode).toBe('user')
  })
})
