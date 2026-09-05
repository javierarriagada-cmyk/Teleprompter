import { useEffect, useRef, useState } from 'react'

export function useWakeLock() {
  const [activo, setActivo] = useState(false)
  const wakeLockRef = useRef<any>(null)
  const deseadoRef = useRef(false)

  async function solicitar() {
    deseadoRef.current = true
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        setActivo(true)
        wakeLockRef.current.addEventListener('release', () => {
          setActivo(false)
        })
      } catch (err) {
        console.warn('[WakeLock] Error al solicitar bloqueo de pantalla:', err)
        setActivo(false)
      }
    } else {
      console.warn('[WakeLock] La API navigator.wakeLock no está disponible en este navegador.')
      setActivo(false)
    }
  }

  async function soltar() {
    deseadoRef.current = false
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch (e) {}
      wakeLockRef.current = null
      setActivo(false)
    }
  }

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && deseadoRef.current) {
        await solicitar()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { activo, solicitar, soltar }
}
