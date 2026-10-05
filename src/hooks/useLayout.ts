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
//
// LA TABLETA -tarea 83, 30-09-2026-. Desde acá el hook entrega de verdad 'tab-v' y 'tab-h', con
// las consultas de la sección 1 de docs/pantallas/tarea82/medidas-implementacion.md. Siguen
// siendo cuatro valores: el caso borde -ancho Medium, alto de 480 o más y apaisado, como una
// ventana dividida de 700 x 520- no es un quinto diseño. La hoja lo resuelve con los rieles del
// teléfono de lado y la letra de la tableta, así que el hook dice 'tel-h' y la letra la decide
// letraPorOmision, más abajo. Un quinto valor obligaría a cada componente que pregunta por 'tel-h'
// a preguntar también por él, para dibujar exactamente lo mismo.
export type Layout = 'tel-v' | 'tel-h' | 'tab-v' | 'tab-h'

export const CONSULTA_TEL_H = '(min-width: 600px) and (max-height: 479.98px)'
// Tableta vertical: ancho Medium -600 a 839- con alto de 480 o más y más alta que ancha. El
// 839.98 es por lo mismo que el 479.98 de arriba: max-width incluye el borde, y un ancho de 840
// justo ya es Expanded.
export const CONSULTA_TAB_V = '(min-width: 600px) and (max-width: 839.98px) and (min-height: 480px) and (orientation: portrait)'
// Tableta de lado: ancho Expanded -840 o más- con alto de 480 o más.
export const CONSULTA_TAB_H = '(min-width: 840px) and (min-height: 480px)'
// El caso borde de la hoja: ancho Medium, alto de 480 o más y apaisado. Se dibuja como el teléfono
// de lado -'tel-h'-, con la letra de la tableta.
export const CONSULTA_BORDE = '(min-width: 600px) and (max-width: 839.98px) and (min-height: 480px) and (orientation: landscape)'

// La letra de la lectura cuando no hay ninguna guardada: 32 en tableta y en el caso borde -el
// alto ya es de tableta-, 24 en el teléfono, que es la de siempre -ajustesIniciales.ts-.
export const LETRA_TABLETA = 32
export const LETRA_TELEFONO = 24

function coincide(consulta: string): boolean {
  try {
    return window.matchMedia(consulta).matches
  } catch (e) {
    return false
  }
}

// Se lee una sola vez, al abrir la app: una letra elegida o guardada no se pisa nunca -App solo
// la usa si los ajustes no traen fontSize-.
export function letraPorOmision(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return LETRA_TELEFONO
  return coincide(CONSULTA_TAB_V) || coincide(CONSULTA_TAB_H) || coincide(CONSULTA_BORDE)
    ? LETRA_TABLETA
    : LETRA_TELEFONO
}

function consultar(): Layout {
  // Sin matchMedia -jsdom, las pruebas- es la pantalla vertical de siempre: así las pruebas de
  // hoy no cambian sin tocarlas.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'tel-v'
  // En el orden de la hoja. El teléfono de lado va primero: con alto Compact no es tableta aunque
  // el ancho sea de tableta -915 x 412-. Después las dos tabletas, y el caso borde cae en 'tel-h'.
  // Todo lo demás -ancho menor que 600- es la pantalla vertical de siempre.
  try {
    if (window.matchMedia(CONSULTA_TEL_H).matches) return 'tel-h'
    if (window.matchMedia(CONSULTA_TAB_V).matches) return 'tab-v'
    if (window.matchMedia(CONSULTA_TAB_H).matches) return 'tab-h'
    if (window.matchMedia(CONSULTA_BORDE).matches) return 'tel-h'
    return 'tel-v'
  } catch (e) {
    return 'tel-v'
  }
}

export default function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(consultar)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    // 30-09-2026, tarea 83: son cuatro consultas y no una. Cada una avisa cuando SU corte se
    // cruza, y al avisar se relee todo con consultar(): así el orden de la hoja manda siempre.
    const mqls: MediaQueryList[] = []
    try {
      for (const q of [CONSULTA_TEL_H, CONSULTA_TAB_V, CONSULTA_TAB_H, CONSULTA_BORDE]) {
        const m = window.matchMedia(q)
        if (m) mqls.push(m)
      }
    } catch (e) {
      return
    }
    if (mqls.length === 0) return
    // Se escucha 'change' y no 'resize': el aviso llega solo cuando se cruza el corte, no en
    // cada pixel del giro. Y se relee al montar por si la ventana cambió entre el primer dibujo
    // y este efecto.
    const alCambiar = () => setLayout(consultar())
    alCambiar()
    const bajas: Array<() => void> = []
    for (const mql of mqls) {
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', alCambiar)
        bajas.push(() => mql.removeEventListener('change', alCambiar))
      } else if (typeof (mql as any).addListener === 'function') {
        // Navegadores viejos -WebView de Android anteriores a la 14 de Chrome- solo tienen addListener.
        ;(mql as any).addListener(alCambiar)
        bajas.push(() => (mql as any).removeListener(alCambiar))
      }
    }
    return () => bajas.forEach((b) => b())
  }, [])

  return layout
}
