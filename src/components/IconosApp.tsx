import React from 'react'

/** Engranaje de trazo fino. Sin relleno; ocho dientes en línea, no el cog de librería. */
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
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
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
