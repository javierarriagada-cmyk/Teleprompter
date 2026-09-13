import { useEffect, useRef } from 'react'

// UN MENU ABIERTO SE CIERRA TOCANDO AFUERA.
//
// Javier lo reporto el 13 de septiembre de 2026 sobre el menu ⋯ del editor: "al abrir esos
// botoncitos arriba, muy bien puestos, no se cierran si presiono en el texto".
//
// Tiene razon y no es un detalle: en un telefono nadie vuelve a buscar el mismo boton para
// cerrar. Se toca afuera. Un menu que solo se cierra con el boton que lo abrio tapa el texto
// hasta que el usuario descubre el truco.
//
// Devuelve un ref que hay que poner en el elemento que envuelve al boton Y al menu. Mientras
// esta abierto, cualquier toque fuera de ese elemento -o la tecla Escape- lo cierra.
//
// El toque se escucha en fase de captura y con pointerdown, no con click: asi cierra apenas
// se apoya el dedo, antes de que el click llegue a lo que haya debajo. Si se usara click, el
// primer toque afuera se gastaria en cerrar el menu y habria que tocar dos veces.
export function useCerrarAfuera<T extends HTMLElement = HTMLDivElement>(
  abierto: boolean,
  cerrar: () => void
) {
  const contenedor = useRef<T | null>(null)
  const cerrarRef = useRef(cerrar)
  cerrarRef.current = cerrar

  useEffect(() => {
    if (!abierto) return

    const alTocarAfuera = (e: Event) => {
      const el = contenedor.current
      if (el && !el.contains(e.target as Node)) {
        cerrarRef.current()
      }
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current()
    }

    document.addEventListener('pointerdown', alTocarAfuera, true)
    document.addEventListener('touchstart', alTocarAfuera, true)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('pointerdown', alTocarAfuera, true)
      document.removeEventListener('touchstart', alTocarAfuera, true)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abierto])

  return contenedor
}
