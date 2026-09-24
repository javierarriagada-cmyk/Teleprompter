import React from 'react'
import { movimientoApagado, MS_CHICO, CURVA_RESORTE } from './movimiento'

// UN INTERRUPTOR NUESTRO, SOBRE UNA CASILLA DE VERDAD. Tarea 72.
//
// Espejo, Mostrar tiempo y Vibracion eran <input type="checkbox"> de 16 px
// que Android dibuja con el azul del sistema: no se parecian a nada de
// esta aplicacion.
//
// La casilla SIGUE ESTANDO y es la que recibe el toque, el teclado y el
// lector de pantalla -role="switch"-; solo se la esconde a la vista con la
// clase interruptor-casilla de styles.css. Lo que se ve es la pista y la
// perilla, dibujadas segun `encendido`.
//
// El input va HIJO DIRECTO del <label>. No meterlo adentro de la pista:
// T86 -src/pruebas.test.tsx- encuentra la casilla de Mostrar tiempo
// mirando el texto de su parentElement, y getByLabelText('Vibración')
// necesita que el label la envuelva.
export function Interruptor({
  encendido,
  onCambiar,
  etiqueta,
  estiloEtiqueta
}: {
  encendido: boolean
  onCambiar: (encendido: boolean) => void
  etiqueta: string
  estiloEtiqueta?: React.CSSProperties
}) {
  const transicion = movimientoApagado()
    ? 'none'
    : `transform ${MS_CHICO}ms ${CURVA_RESORTE}, background-color ${MS_CHICO}ms ease-out, border-color ${MS_CHICO}ms ease-out`
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--aire-3)',
        cursor: 'pointer',
        position: 'relative',
        ...estiloEtiqueta
      }}
    >
      <span>{etiqueta}</span>
      <input
        type="checkbox"
        role="switch"
        className="interruptor-casilla"
        checked={encendido}
        onChange={(e) => onCambiar(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="interruptor-pista"
        data-encendido={encendido ? 'si' : 'no'}
        style={{
          position: 'relative',
          flexShrink: 0,
          width: 44,
          height: 26,
          boxSizing: 'border-box',
          borderRadius: 'var(--redondeo-pildora)',
          backgroundColor: encendido ? 'var(--color-acento)' : 'var(--bg-suelo)',
          border: `1px solid ${encendido ? 'var(--color-acento)' : 'var(--color-borde)'}`,
          transition: transicion
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 18,
            height: 18,
            borderRadius: 'var(--redondeo-pildora)',
            backgroundColor: encendido ? 'var(--color-texto-acento)' : 'var(--color-apagado)',
            transform: encendido ? 'translateX(18px)' : 'translateX(0)',
            transition: transicion
          }}
        />
      </span>
    </label>
  )
}
