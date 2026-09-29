import { useEffect, useState } from 'react'

// EL DISEÑO SEGÚN LA VENTANA -tarea 82, 29-09-2026-.
//
// El video largo de YouTube se graba con el teléfono de lado, y hasta la 81 Sigo mostraba en
// horizontal la pantalla vertical estirada: las fichas flotando encima del texto y la columna en
// unos 70 caracteres. Este hook dice en qué diseño está la ventana, y la superficie de lectura se
// arma según eso -rieles a los lados en 'tel-h'-.
//
// Por qué la VENTANA y no window.screen: screen mide la pantalla física, no lo que la app tiene
// para dibujar. En ventana dividida o en un plegable a medio abrir las dos cosas difieren, y lo
// que manda es el lugar que de verdad hay.
//
// El corte es el de las clases de tamaño de ventana de Material 3: ancho Medium o Expanded
// -600 o más- y alto Compact -menos de 480-. El 479.98 y no 480 es para que un alto de 480 justo
// no cuente como Compact: max-height incluye el borde.
//
// El tipo ya nombra las tabletas para que la firma no cambie en la tarea 83, que las trae. En
// esta tarea el hook solo devuelve 'tel-v' o 'tel-h'.
export type Layout = 'tel-v' | 'tel-h' | 'tab-v' | 'tab-h'

export const CONSULTA_TEL_H = '(min-width: 600px) and (max-height: 479.98px)'

function consultar(): Layout {
  // Sin matchMedia -jsdom, las pruebas- es la pantalla vertical de siempre: así las pruebas de
  // hoy no cambian sin tocarlas.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'tel-v'
  try {
    return window.matchMedia(CONSULTA_TEL_H).matches ? 'tel-h' : 'tel-v'
  } catch (e) {
    return 'tel-v'
  }
}

export default function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(consultar)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    let mql: MediaQueryList | null = null
    try {
      mql = window.matchMedia(CONSULTA_TEL_H)
    } catch (e) {
      return
    }
    if (!mql) return
    // Se escucha 'change' y no 'resize': el aviso llega solo cuando se cruza el corte, no en
    // cada pixel del giro. Y se relee al montar por si la ventana cambió entre el primer dibujo
    // y este efecto.
    const alCambiar = () => setLayout(consultar())
    alCambiar()
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', alCambiar)
      return () => mql?.removeEventListener('change', alCambiar)
    }
    // Navegadores viejos -WebView de Android anteriores a la 14 de Chrome- solo tienen addListener.
    if (typeof (mql as any).addListener === 'function') {
      ;(mql as any).addListener(alCambiar)
      return () => (mql as any)?.removeListener(alCambiar)
    }
  }, [])

  return layout
}
