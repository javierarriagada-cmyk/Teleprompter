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

// No es un engranaje. El engranaje queda para las preferencias de la
// aplicacion (portada). Este abre la ESCENA de ESTA toma: donde lees,
// espejo, tiempo y brillo. Cuatro esquinas de encuadre y la linea de
// la franja donde cae el renglon vivo.
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
