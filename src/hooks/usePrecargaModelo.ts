import { useCallback, useEffect, useRef, useState } from 'react'
import { IdMotor } from '../motor/MotorDeVoz'
import type { MotorVosk } from '../motor/MotorVosk'
import { cargarMotorVosk } from '../motor/motorWeb'

// 'sin-conexion': la voz en inglés de la versión de Play no se pudo bajar por falta de internet
// -tarea 84, D3-. Lo usa App con IndicadorPrecarga; este gancho, el del motor web, no lo produce.
export type EstadoPrecarga = 'inactivo' | 'descargando' | 'listo' | 'error' | 'sin-conexion'

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

    // En el APK el motor web no viaja -motorWeb.ts-: no hay nada que precargar.
    const ClaseMotorVosk = await cargarMotorVosk()
    if (!ClaseMotorVosk) {
      setEstado('inactivo')
      return
    }

    setEstado('descargando')
    setError(null)
    setProgreso(0)

    try {
      const motor = new ClaseMotorVosk()
      motorRef.current = motor

      const unsubProgreso = motor.onProgreso((pct) => {
        setProgreso(pct)
      })

      const unsubError = motor.onError((err) => {
        const detalle = err.message || String(err)
        console.warn('[precarga]', detalle)
        setError(detalle)
        setEstado('error')
      })

      await motor.precargarModelo()

      unsubProgreso()
      unsubError()
      setProgreso(1)
      setEstado('listo')
    } catch (err: any) {
      const detalle = err?.message || 'Error al precargar el modelo'
      console.warn('[precarga]', detalle)
      setError(detalle)
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
