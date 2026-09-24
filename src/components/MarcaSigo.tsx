import React from 'react'
import { MARCA_TRAZO_NOMBRE, MARCA_PUNTO, MARCA_CAJA } from './trazoMarca'

// LA MARCA, DIBUJADA. Un solo componente para la entrada y la barra de la
// portada: el mismo trazo -trazoMarca.ts- a dos alturas. Asi la marca que
// viaja desde la mitad de la pantalla y la que queda arriba son la misma
// forma, y el relevo entre las dos no se ve.
//
// El nombre toma currentColor -el texto del tema en la portada, el trazo de
// la marca en la entrada-; la bola es siempre el rojo de grabar.
export function MarcaSigo({
  alto,
  colorPunto = 'var(--color-grabando)',
  ...props
}: { alto: number; colorPunto?: string } & React.SVGProps<SVGSVGElement>) {
  const ancho = (alto * MARCA_CAJA.ancho) / MARCA_CAJA.alto
  return (
    <svg
      width={ancho}
      height={alto}
      viewBox={`${MARCA_CAJA.x} ${MARCA_CAJA.y} ${MARCA_CAJA.ancho} ${MARCA_CAJA.alto}`}
      role="img"
      aria-label="Sigo"
      {...props}
    >
      <path d={MARCA_TRAZO_NOMBRE} fill="currentColor" />
      <circle cx={MARCA_PUNTO.cx} cy={MARCA_PUNTO.cy} r={MARCA_PUNTO.r} fill={colorPunto} />
    </svg>
  )
}
