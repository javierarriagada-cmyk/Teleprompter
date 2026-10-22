// Salio de App.tsx el 29-09-2026, tarea 81: el aviso breve -el que aparece abajo unos
// segundos, a veces con un boton de accion-. Guarda que aviso hay y su temporizador.
// cerrarAviso hace lo que hacia el boton de accion antes de ejecutarla: limpia el
// temporizador y quita el aviso.
import { useCallback, useRef, useState } from 'react'

export interface AvisoInfo {
  texto: string
  accionTexto?: string
  alEjecutarAccion?: () => void
  // -portugues-voz, punto 7, 2026-10-22- La acción en el color del texto del aviso, en negrita, y no en
  // --aviso-accion, que es el rojo de borrar. La pide el aviso del idioma del guion; «Deshacer» no la
  // pide y sigue en rojo.
  accionNeutra?: boolean
  // -portugues-voz, 2026-10-22- El idioma en que esta escrito el aviso, si no es el de la app. El aviso del
  // idioma del guion sale en el idioma del GUION -«Your script is in English...» con la app en español-, y
  // TalkBack elige la voz por el lang: sin el, lo leeria con voz española -lib/idioma.ts, reflejarEnDocumento-.
  idioma?: string
}

// El color de la acción del aviso, solo con variables que ya existen: --color-texto es el del texto del
// aviso -AvisoBreve-, --aviso-accion el rojo de borrar.
// Recibe el aviso entero: con Pick<AvisoInfo, 'accionNeutra'> TypeScript rechazaba un aviso sin ese campo.
export function colorAccionAviso(info: AvisoInfo): string {
  return info.accionNeutra ? 'var(--color-texto)' : 'var(--aviso-accion)'
}

export function useAviso() {
  const [avisoInfo, setAvisoInfo] = useState<AvisoInfo | null>(null)
  const timerAvisoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarAviso = useCallback((
    msg: string,
    // -portugues-voz, punto 7, 2026-10-22- Antes: opciones?: { accionTexto?: string; alEjecutarAccion?: () => void; duracionMs?: number }
    // -portugues-voz, 2026-10-22- Suma idioma. Antes: opciones?: { ...; duracionMs?: number; accionNeutra?: boolean }
    opciones?: { accionTexto?: string; alEjecutarAccion?: () => void; duracionMs?: number; accionNeutra?: boolean; idioma?: string }
  ) => {
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current)
    setAvisoInfo({
      texto: msg,
      accionTexto: opciones?.accionTexto,
      alEjecutarAccion: opciones?.alEjecutarAccion,
      accionNeutra: opciones?.accionNeutra,
      idioma: opciones?.idioma
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
