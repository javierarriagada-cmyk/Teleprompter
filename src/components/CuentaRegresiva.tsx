import React from 'react'

interface CuentaRegresivaProps {
  valor: number | null // 3, 2, 1; null = no mostrar nada
}

export default function CuentaRegresiva({ valor }: CuentaRegresivaProps) {
  if (valor === null) {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 10
      }}
      data-testid="cuenta-regresiva"
    >
      <span
        style={{
          fontSize: 120,
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.75)',
          userSelect: 'none',
          lineHeight: 1
        }}
      >
        {valor}
      </span>
    </div>
  )
}
