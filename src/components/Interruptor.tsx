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
  testid,
  deshabilitado = false
}: {
  encendido: boolean
  onCambiar: (v: boolean) => void
  etiqueta: string
  testid?: string
  // -tarea 88, 04-10-2026- Para la fila de Control por gestos: con la trasera o en un equipo que no
  // puede, el interruptor se ve apagado y no responde. Quien lo usa decide qué valor mostrar -el
  // elegido se conserva afuera-. Sin la prop, el de siempre.
  deshabilitado?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      data-testid={testid}
      disabled={deshabilitado}
      className={`interruptor${encendido ? ' encendido' : ''}${deshabilitado ? ' deshabilitado' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        if (deshabilitado) return
        onCambiar(!encendido)
      }}
    >
      <span className="interruptor-pista" aria-hidden="true">
        <span className="interruptor-perilla" />
      </span>
    </button>
  )
}
