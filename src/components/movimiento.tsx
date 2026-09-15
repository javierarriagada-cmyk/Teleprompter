import React from 'react'

export const CURVA_ENTRA = 'cubic-bezier(0.05, 0.7, 0.1, 1)'
export const CURVA_SALE = 'cubic-bezier(0.3, 0, 0.8, 0.15)'
export const CURVA_NORMAL = 'cubic-bezier(0.2, 0, 0, 1)'

export const MS_DEDO = 100 // respuesta al toque: un color, un hundido
export const MS_CHICO = 200 // algo chico aparece en su lugar
export const MS_PANEL = 300 // un panel que se levanta
export const MS_PANTALLA = 400 // una pantalla entera

export function movimientoApagado(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (e) {
    return false
  }
}

interface PantallaProps {
  direccion: 'adentro' | 'atras' | 'inicial'
  children: React.ReactNode
}

export function Pantalla({ direccion, children }: PantallaProps) {
  const [animando, setAnimando] = React.useState(() => !movimientoApagado())

  React.useEffect(() => {
    setAnimando(!movimientoApagado())
  }, [direccion])

  if (movimientoApagado() || !animando) {
    return <>{children}</>
  }

  const hijo = React.Children.only(children) as React.ReactElement<any>
  const nombreAnimacion =
    direccion === 'inicial'
      ? 'pantallaEntraInicial'
      : direccion === 'adentro'
      ? 'pantallaEntraAdentro'
      : 'pantallaEntraAtras'

  return React.cloneElement(hijo, {
    'data-pantalla-direccion': direccion,
    onAnimationEnd: (e: React.AnimationEvent) => {
      setAnimando(false)
      if (hijo.props && typeof hijo.props.onAnimationEnd === 'function') {
        hijo.props.onAnimationEnd(e)
      }
    },
    style: {
      ...(hijo.props.style || {}),
      animation: `${nombreAnimacion} ${MS_PANTALLA}ms ${CURVA_ENTRA} forwards`
    }
  })
}
