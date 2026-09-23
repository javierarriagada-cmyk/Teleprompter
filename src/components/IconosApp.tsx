import React from 'react'

/** Engranaje de trazo fino. Sin relleno; ocho dientes en línea, no el cog de librería.
 *
 * 23-09-2026, revision de la 70: los ocho dientes eran rayitas sueltas alrededor de
 * un circulo, y eso se leia como un SOL -Javier lo llamaba "el menu del sol" en la
 * portada, y lo dijo mirando la toma: "el engranaje, es un sol"-. Ahora es una
 * rueda dentada de verdad: un solo contorno cerrado con ocho dientes trapeciales y el
 * agujero al centro. Sigue siendo de trazo y sigue sin ser el cog de libreria: los
 * dientes son rectos, no los petalos redondeados del icono de siempre. */
export function IconoEngranaje({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M10.23 4.61L10.44 2.12L13.56 2.12L13.77 4.61A7.6 7.6 0 0 1 15.97 5.52L17.88 3.91L20.09 6.12L18.48 8.03A7.6 7.6 0 0 1 19.39 10.23L21.88 10.44L21.88 13.56L19.39 13.77A7.6 7.6 0 0 1 18.48 15.97L20.09 17.88L17.88 20.09L15.97 18.48A7.6 7.6 0 0 1 13.77 19.39L13.56 21.88L10.44 21.88L10.23 19.39A7.6 7.6 0 0 1 8.03 18.48L6.12 20.09L3.91 17.88L5.52 15.97A7.6 7.6 0 0 1 4.61 13.77L2.12 13.56L2.12 10.44L4.61 10.23A7.6 7.6 0 0 1 5.52 8.03L3.91 6.12L6.12 3.91L8.03 5.52A7.6 7.6 0 0 1 10.23 4.61Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Triangulo de play, relleno solido: a diferencia de los otros tres,
 * este no es de trazo -un triangulo solo con contorno no se lee a 22px. */
export function IconoEmpezar({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

// No es un engranaje. El engranaje queda para las preferencias de la
// aplicacion (portada). Este abre la ESCENA de ESTA toma: donde lees,
// espejo, tiempo y brillo. Cuatro esquinas de encuadre y la linea de
// la franja donde cae el renglon vivo.
// 23-09-2026, Tarea 70: en la toma esto se dio vuelta. La foto que
// Javier aprobo muestra un engranaje de verdad arriba a la derecha, y
// eso es lo que quedo. IconoEscena sigue aqui por si se vuelve atras.
export function IconoEscena({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 8V4h4" />
      <path d="M16 4h4v4" />
      <path d="M20 16v4h-4" />
      <path d="M8 20H4v-4" />
      <path d="M6 10h12" />
    </svg>
  )
}

/** Flecha de volver hacia la izquierda de trazo fino. */
export function IconoAtras({
  tamano = 20,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

/** Dos barras verticales redondeadas para la pausa en lectura. */
export function IconoPausa({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  )
}

/** Cuadrado relleno con esquinas redondeadas para detener la toma. */
export function IconoParar({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

/** Tacho de basura de trazo para descartar la toma desde la pausa. */
export function IconoTacho({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  )
}
