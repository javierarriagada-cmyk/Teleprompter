import { useCallback, useEffect, useRef, useState } from 'react'
import { MotorVosk } from '../motor/MotorVosk'

export type EstadoPrecarga = 'inactivo' | 'descargando' | 'listo' | 'error'

export function usePrecargaModelo(): {
  estado: EstadoPrecarga
  progreso: number // 0 a 1
  error: string | null
  reintentar: () => void
} {
  const [estado, setEstado] = useState<EstadoPrecarga>('inactivo')
  const [progreso, setProgreso] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const motorRef = useRef<MotorVosk | null>(null)

  const ejecutarPrecarga = useCallback(async () => {
    setEstado('descargando')
    setError(null)
    setProgreso(0)

    try {
      const motor = new MotorVosk()
      motorRef.current = motor

      const unsubProgreso = motor.onProgreso((pct) => {
        setProgreso(pct)
      })

      const unsubError = motor.onError((err) => {
        setError(err.message || String(err))
        setEstado('error')
      })

      await motor.precargarModelo()

      unsubProgreso()
      unsubError()
      setProgreso(1)
      setEstado('listo')
    } catch (err: any) {
      setError(err?.message || 'Error al precargar el modelo')
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    ejecutarPrecarga()
  }, [ejecutarPrecarga])

  const reintentar = useCallback(() => {
    ejecutarPrecarga()
  }, [ejecutarPrecarga])

  return {
    estado,
    progreso,
    error,
    reintentar
  }
}
