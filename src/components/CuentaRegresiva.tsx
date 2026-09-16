import React, { useEffect, useRef } from 'react'
import { hapticaToqueFuerte } from '../haptica'
import { movimientoApagado, MS_CHICO, CURVA_RESORTE } from './movimiento'

interface CuentaRegresivaProps {
  valor: number | null // 3, 2, 1; null = no mostrar nada
}

export default function CuentaRegresiva({ valor }: CuentaRegresivaProps) {
  const prevValorRef = useRef<number | null>(valor)

  useEffect(() => {
    if ((prevValorRef.current === 1 && valor === null) || valor === 0) {
      hapticaToqueFuerte()
    }
    prevValorRef.current = valor
  }, [valor])

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
        key={valor}
        style={{
          fontSize: 120,
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.75)',
          userSelect: 'none',
          lineHeight: 1,
          animation: movimientoApagado()
            ? 'none'
            : `cuentaRegresivaEntra ${MS_CHICO}ms ${CURVA_RESORTE} forwards`
        }}
      >
        {valor}
      </span>
    </div>
  )
}
