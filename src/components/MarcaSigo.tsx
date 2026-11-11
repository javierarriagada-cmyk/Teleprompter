import React from 'react'
import { MARCA_TRAZO_NOMBRE, MARCA_PUNTO, MARCA_CAJA } from './trazoMarca'
import { movimientoApagado } from '../lib/movimientoApagado'

// LA MARCA, DIBUJADA. Un solo componente para la entrada y la barra de la
// portada: el mismo trazo -trazoMarca.ts- a dos alturas. Asi la marca que
// viaja desde la mitad de la pantalla y la que queda arriba son la misma
// forma, y el relevo entre las dos no se ve.
//
// El nombre toma currentColor -el texto del tema en la portada, el trazo de
// la marca en la entrada-; la bola es siempre el rojo de grabar.
//
// -evolucion visual, 11-11-2026- conAnimacionEspecular: un brillo recorre «Sig» cada 6 segundos y el punto da
// un destello -.punto-marca-destello, styles.css-. Solo la pide la portada; la marca de la entrada sigue quieta
// para que su viaje no cambie. El brillo es un degradado SVG animado, que la regla de prefers-reduced-motion
// del CSS no alcanza: por eso con el movimiento apagado -movimientoApagado- no se monta.
// Antes: sin la prop, <path fill="currentColor"> y el circulo sin clase.
export function MarcaSigo({
  alto,
  colorPunto = 'var(--color-grabando)',
  conAnimacionEspecular = false,
  ...props
}: { alto: number; colorPunto?: string; conAnimacionEspecular?: boolean } & React.SVGProps<SVGSVGElement>) {
  const ancho = (alto * MARCA_CAJA.ancho) / MARCA_CAJA.alto
  const gradienteId = React.useId()
  const viva = conAnimacionEspecular && !movimientoApagado()
  return (
    <svg
      width={ancho}
      height={alto}
      viewBox={`${MARCA_CAJA.x} ${MARCA_CAJA.y} ${MARCA_CAJA.ancho} ${MARCA_CAJA.alto}`}
      role="img"
      aria-label="Sigo"
      className={viva ? 'marca-sigo-viva' : undefined}
      {...props}
    >
      {viva && (
        <defs>
          <linearGradient id={gradienteId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="40%" stopColor="currentColor" />
            <stop offset="50%" stopColor="var(--ev-marca-brillo)" stopOpacity="0.8" />
            <stop offset="60%" stopColor="currentColor" />
            <stop offset="100%" stopColor="currentColor" />
            <animate attributeName="x1" values="-100%; 200%" dur="6s" repeatCount="indefinite" />
            <animate attributeName="x2" values="0%; 300%" dur="6s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      )}
      <path d={MARCA_TRAZO_NOMBRE} fill={viva ? `url(#${gradienteId})` : 'currentColor'} />
      <circle cx={MARCA_PUNTO.cx} cy={MARCA_PUNTO.cy} r={MARCA_PUNTO.r} fill={colorPunto}
        className={viva ? 'punto-marca-destello' : undefined} />
    </svg>
  )
}
