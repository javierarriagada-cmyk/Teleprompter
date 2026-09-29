// Salio de App.tsx el 29-09-2026, tarea 81: el aviso breve -el que aparece abajo unos
// segundos, a veces con un boton de accion-. Guarda que aviso hay y su temporizador.
// cerrarAviso hace lo que hacia el boton de accion antes de ejecutarla: limpia el
// temporizador y quita el aviso.
import { useCallback, useRef, useState } from 'react'

export interface AvisoInfo {
  texto: string
  accionTexto?: string
  alEjecutarAccion?: () => void
}

export function useAviso() {
  const [avisoInfo, setAvisoInfo] = useState<AvisoInfo | null>(null)
  const timerAvisoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarAviso = useCallback((
    msg: string,
    opciones?: { accionTexto?: string; alEjecutarAccion?: () => void; duracionMs?: number }
  ) => {
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
    setAvisoInfo({
      texto: msg,
      accionTexto: opciones?.accionTexto,
      alEjecutarAccion: opciones?.alEjecutarAccion
    })
    const dur = opciones?.duracionMs ?? 2000
    timerAvisoRef.current = setTimeout(() => {
      setAvisoInfo(null)
      timerAvisoRef.current = null
    }, dur)
  }, [])

  const cerrarAviso = useCallback(() => {
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
    setAvisoInfo(null)
  }, [])

  return { avisoInfo, mostrarAviso, cerrarAviso }
}
