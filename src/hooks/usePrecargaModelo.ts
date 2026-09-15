import { useCallback, useEffect, useRef, useState } from 'react'
import { IdMotor } from '../motor/MotorDeVoz'
import { MotorVosk } from '../motor/MotorVosk'

export type EstadoPrecarga = 'inactivo' | 'descargando' | 'listo' | 'error'

export function usePrecargaModelo(engine: IdMotor = 'vosk'): {
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
    if (engine !== 'vosk') {
      setEstado('inactivo')
      return
    }

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
  }, [engine])

  useEffect(() => {
    if (engine === 'vosk') {
      ejecutarPrecarga()
    } else {
      setEstado('inactivo')
    }
  }, [engine, ejecutarPrecarga])

  const reintentar = useCallback(() => {
    if (engine === 'vosk') {
      ejecutarPrecarga()
    }
  }, [engine, ejecutarPrecarga])

  return {
    estado,
    progreso,
    error,
    reintentar
  }
}
