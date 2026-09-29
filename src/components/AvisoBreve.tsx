// Salio de App.tsx el 29-09-2026, tarea 81: el aviso breve que flota abajo, con su boton de
// accion si lo trae. El estado vive en hooks/useAviso.ts; enLectura es vista === 'lectura'.
import React from 'react'
import { movimientoApagado, MS_CHICO, CURVA_ENTRA } from './movimiento'
import type { AvisoInfo } from '../hooks/useAviso'

interface AvisoBreveProps {
  avisoInfo: AvisoInfo | null
  enLectura: boolean
  cerrarAviso: () => void
}

export function AvisoBreve({ avisoInfo, enLectura, cerrarAviso }: AvisoBreveProps) {
  return (
    <>
      {/* Toast / Aviso Breve */}
      {avisoInfo && (
        <div
          data-testid="aviso-flotante"
          style={{
            position: 'fixed',
            // SOBRE LA BARRA DE ANDROID Y CENTRADO -28-09-2026-. En el moto g86 el aviso quedaba
            // medio tapado por la barra de navegacion -no sumaba el area segura- y corrido a la
            // derecha: se centraba con translateX(-50%), y la animacion panelSube, que tambien
            // usa transform, lo pisaba. Ahora se centra con margenes, sin transform.
            // En la lectura, encima del circulo de 72 -Empezar o Parar-: a 32 px quedaba montado
            // sobre el, visto en el moto g86 el mismo dia.
            bottom: enLectura
              ? 'calc(var(--circulo-desde-abajo) + 72px + var(--aire-3) + env(safe-area-inset-bottom, 0px))'
              : 'calc(var(--aire-5) + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            marginLeft: 'auto',
            marginRight: 'auto',
            width: 'max-content',
            maxWidth: 'calc(100% - 2 * var(--aire-4))',
            backgroundColor: 'var(--bg-superficie)',
            color: 'var(--color-texto)',
            border: '1px solid var(--color-borde)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo-pildora)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 600,
            zIndex: 999,
            pointerEvents: avisoInfo.accionTexto ? 'auto' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--aire-3)',
            animation: movimientoApagado() ? 'none' : `panelSube ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
          }}
        >
          <span>{avisoInfo.texto}</span>
          {avisoInfo.accionTexto && (
            <button
              onClick={() => {
                cerrarAviso()
                if (avisoInfo.alEjecutarAccion) avisoInfo.alEjecutarAccion()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-acento)',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 'var(--texto-cuerpo)',
                padding: 0
              }}
            >
              {avisoInfo.accionTexto}
            </button>
          )}
        </div>
      )}
    </>
  )
}
