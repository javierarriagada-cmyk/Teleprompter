import React from 'react'

// INTERRUPTOR CON MEDIDAS DE MATERIAL 3 -tarea 77, 28-09-2026-.
//
// La pista 52 x 32, borde 2; la perilla 16 apagada y 24 encendida. Encendido:
// pista --color-acento, perilla --color-texto-acento. Es un boton de verdad
// -role="switch", aria-checked- para el teclado y TalkBack. No vibra: la
// ficha o la fila que lo usa llama al callback, y la vibracion sigue en App
// -T207-.
//
// Tarea 72 dejo .interruptor-casilla para esconder un checkbox detras de un
// dibujo. Ese camino sigue en el cajon Aa del editor. Este componente es el
// de Ajustes: un solo control, no una casilla invisible.

export function Interruptor({
  encendido,
  onCambiar,
  etiqueta,
  testid
}: {
  encendido: boolean
  onCambiar: (v: boolean) => void
  etiqueta: string
  testid?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      data-testid={testid}
      className={`interruptor${encendido ? ' encendido' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onCambiar(!encendido)
      }}
    >
      <span className="interruptor-pista" aria-hidden="true">
        <span className="interruptor-perilla" />
      </span>
    </button>
  )
}
