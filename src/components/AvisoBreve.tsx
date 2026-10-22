// Salio de App.tsx el 29-09-2026, tarea 81: el aviso breve que flota abajo, con su boton de
// accion si lo trae. El estado vive en hooks/useAviso.ts; enLectura es vista === 'lectura'.
import React from 'react'
import { movimientoApagado, MS_CHICO, CURVA_ENTRA } from './movimiento'
import { colorAccionAviso } from '../hooks/useAviso'
import type { AvisoInfo } from '../hooks/useAviso'

interface AvisoBreveProps {
  avisoInfo: AvisoInfo | null
  enLectura: boolean
  cerrarAviso: () => void
  // TELÉFONO DE LADO -tarea 82, 29-09-2026-: dónde empieza y termina la columna de texto entre
  // los rieles, como largos CSS. Con esto el aviso va abajo y centrado en la columna, a 16 más el
  // área segura: en horizontal no hay círculo abajo al centro sobre el que calcularlo.
  columnaHorizontal?: { izquierda: string; derecha: string } | null
  // TABLETA VERTICAL -tarea 83, 30-09-2026-: el aviso va encima del dock, a 16 de su borde, para
  // no taparlo; la altura la pone la hoja -styles-tableta.css, --aviso-tab-v-abajo-.
  sobreDock?: boolean
}

export function AvisoBreve({ avisoInfo, enLectura, cerrarAviso, columnaHorizontal = null, sobreDock = false }: AvisoBreveProps) {
  const enRieles = enLectura && !!columnaHorizontal
  // -mejoras-claridad, 21-10-2026- EL AVISO CON ACCIÓN -«Guion borrado · Deshacer»- EN EL TELÉFONO DE PIE, FUERA DE LA LECTURA:
  // más arriba -encima de los botones y barras de abajo, como pone Material 3 sus avisos, y no pegado al
  // borde-, un poco más grande, y la acción con 48 de alto. Javier: «a veces uno se demora más en
  // encontrarlo que en apretarlo». En la lectura, de lado y sobre el dock sigue como estaba.
  const destacado = !!avisoInfo?.accionTexto && !enLectura && !enRieles && !sobreDock
  return (
    /* EL LECTOR DE PANTALLA ANUNCIA EL AVISO -tarea 84, G1, 29-09-2026-. role="status" con
       aria-live="polite": TalkBack lo lee cuando termina lo que estaba diciendo, sin cortar a la
       persona. La región está SIEMPRE montada y el aviso aparece adentro: una región viva que
       nace junto con su texto muchas veces no se anuncia -Android y Chrome solo avisan los
       CAMBIOS de una región que ya existía-. No ocupa lugar: el aviso de adentro es fixed. La
       duración del aviso no cambia -useAviso-. */
    <div role="status" aria-live="polite" data-testid="region-aviso">
      {/* Toast / Aviso Breve */}
      {avisoInfo && (
        <div
          data-testid="aviso-flotante"
          className="aviso-breve"
          style={{
            position: 'fixed',
            // SOBRE LA BARRA DE ANDROID Y CENTRADO -28-09-2026-. En el moto g86 el aviso quedaba
            // medio tapado por la barra de navegacion -no sumaba el area segura- y corrido a la
            // derecha: se centraba con translateX(-50%), y la animacion panelSube, que tambien
            // usa transform, lo pisaba. Ahora se centra con margenes, sin transform.
            // En la lectura, encima del circulo de 72 -Empezar o Parar-: a 32 px quedaba montado
            // sobre el, visto en el moto g86 el mismo dia.
            // 29-09-2026, tarea 82: en el teléfono de lado va a 16 más el área segura y entre
            // los rieles -columnaHorizontal-; en vertical sigue exactamente como arriba.
            bottom: sobreDock
              ? 'calc(var(--aviso-tab-v-abajo) + env(safe-area-inset-bottom, 0px))'
              : enRieles
              ? 'calc(16px + env(safe-area-inset-bottom, 0px))'
              : enLectura
              ? 'calc(var(--circulo-desde-abajo) + 72px + var(--aire-3) + env(safe-area-inset-bottom, 0px))'
              : destacado
              ? 'calc(var(--aviso-accion-abajo) + env(safe-area-inset-bottom, 0px))'
              // Antes, también con acción: 'calc(var(--aire-5) + env(safe-area-inset-bottom, 0px))'
              : 'calc(var(--aire-5) + env(safe-area-inset-bottom, 0px))',
            left: enRieles && columnaHorizontal ? columnaHorizontal.izquierda : 0,
            right: enRieles && columnaHorizontal ? columnaHorizontal.derecha : 0,
            marginLeft: 'auto',
            marginRight: 'auto',
            width: 'max-content',
            maxWidth: 'calc(100% - 2 * var(--aire-4))',
            // Tanda 2, 15-10-2026: fondo, canto y sombra en .aviso-breve -styles.css-. Antes:
            // backgroundColor: 'var(--bg-superficie)', border: '1px solid var(--color-borde)',
            color: 'var(--color-texto)',
            // -mejoras-claridad, 21-10-2026- Destacado: más aire a la izquierda, 56 de alto y letra de 16. Antes, siempre:
            // padding: 'var(--aire-2) var(--aire-3)', fontSize: 'var(--texto-cuerpo)'
            padding: destacado ? 'var(--aire-1) var(--aire-2) var(--aire-1) var(--aire-4)' : 'var(--aire-2) var(--aire-3)',
            minHeight: destacado ? 56 : undefined,
            boxSizing: 'border-box',
            borderRadius: 'var(--redondeo-pildora)',
            fontSize: destacado ? 16 : 'var(--texto-cuerpo)',
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
                // -mejoras-claridad, 21-10-2026- --aviso-accion: en claro, var(--color-acento) -el crema de los botones claros- sobre el aviso blanco daba
                // 1,3 a 1 y no se leía; ahora 6,0 a 1. En oscuro sigue siendo --color-acento. Antes: color: 'var(--color-acento)',
                // -portugues-voz, punto 7, 2026-10-22- Si el aviso pide la acción neutra -el del idioma del guion-, el color
                // del texto del aviso; si no, el rojo de siempre. Antes: color: 'var(--aviso-accion)',
                color: colorAccionAviso(avisoInfo),
                fontWeight: 'bold',
                cursor: 'pointer',
                // -mejoras-claridad, 21-10-2026- Destacado: 16 y un área de toque de 48 de alto. Antes: fontSize: 'var(--texto-cuerpo)', padding: 0
                fontSize: destacado ? 16 : 'var(--texto-cuerpo)',
                padding: destacado ? '0 var(--aire-3)' : 0,
                minHeight: destacado ? 48 : undefined,
                minWidth: destacado ? 48 : undefined
              }}
            >
              {avisoInfo.accionTexto}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
