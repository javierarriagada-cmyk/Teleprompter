import React from 'react'

/** Engranaje de trazo fino. Misma mano que las rayas de SIGO: sin relleno. */
export function IconoEngranaje({ tamano = 22 }: { tamano?: number }) {
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
    >
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  )
}
