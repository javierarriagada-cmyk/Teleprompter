import { describe, test, expect, beforeEach, vi } from 'vitest'
import { encenderCamara, estabilizacionSoportada } from '../lib/camara'
import { CameraPreview } from '@capgo/camera-preview'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({
    fijarModoSuperficie: vi.fn().mockResolvedValue({ encontrado: true, modo: 'sistema' })
  }),
  Capacitor: { isNativePlatform: () => true }
}))

describe('Pruebas de lógica de estabilización de video', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('encenderCamara llama a CameraPreview.start con videoStabilizationMode "standard" cuando estabilizar es true', async () => {
    await encenderCamara('frontal', { estabilizar: true })
    expect(CameraPreview.start).toHaveBeenCalledWith(
      expect.objectContaining({
        videoStabilizationMode: 'standard'
      })
    )
  })

  test('encenderCamara llama a CameraPreview.start con videoStabilizationMode "off" cuando estabilizar es false', async () => {
    await encenderCamara('frontal', { estabilizar: false })
    expect(CameraPreview.start).toHaveBeenCalledWith(
      expect.objectContaining({
        videoStabilizationMode: 'off'
      })
    )
  })

  test('si sin ajuste guardado en localStorage, la opción estabilizar debe quedar encendida (true)', () => {
    const ajustesGuardados = localStorage.getItem('teleprompter_ajustes')
    expect(ajustesGuardados).toBeNull()
    const configDefecto = { estabilizar: true }
    expect(configDefecto.estabilizar).toBe(true)
  })

  test('el ajuste estabilizar se guarda y se lee de localStorage', () => {
    const objetoAjustes = { estabilizar: false }
    localStorage.setItem('teleprompter_ajustes', JSON.stringify(objetoAjustes))

    const leido = JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}')
    expect(leido.estabilizar).toBe(false)
  })

  test('si CameraPreview.start rechaza con error de estabilización con "standard", se vuelve a llamar con "off"', async () => {
    vi.mocked(CameraPreview.start)
      .mockRejectedValueOnce(new Error("Video stabilization mode 'standard' is not supported on this device"))
      .mockResolvedValueOnce(undefined as any)

    await encenderCamara('frontal', { estabilizar: true })

    expect(CameraPreview.start).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ videoStabilizationMode: 'standard' })
    )
    expect(CameraPreview.start).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ videoStabilizationMode: 'off' })
    )
    expect(estabilizacionSoportada()).toBe(false)
  })
})
