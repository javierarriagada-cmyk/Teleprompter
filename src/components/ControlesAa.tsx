import React from 'react'
import { hapticaSeleccion } from '../haptica'
import { t, useTextos } from '../textos'

// EL TAMANO Y EL ANCHO, EN DOS LUGARES Y UN SOLO OBJETO -27-09-2026-. Vivian solo en el
// cajon Aa del editor. Javier los extrano en la pantalla de grabacion, justo antes de
// apretar Grabar: ahi el cajon no tiene velo y el texto de atras cambia en vivo, asi que
// se ve exacto como va a quedar. Salieron de EditorView a este archivo para que los dos
// cajones dibujen la misma pieza y no dos copias que se separen con el tiempo.

// Tamano: una pieza partida al medio, la A chica y la A grande. El numero no se muestra
// -el cambio se ve en el texto- y queda para el lector de pantalla.
export function SelectorLetra({
  fontSize,
  onMenos,
  onMas
}: {
  fontSize: number
  onMenos?: () => void
  onMas?: () => void
}) {
  useTextos()
  return (
    <div className="selector-aa selector-aa-lleno" role="group" aria-label={t('tamanoLetra')}>
      <button
        type="button"
        onClick={onMenos}
        aria-label={t('letraMenos')}
        className="btn-deformable selector-aa-opcion letra-aa-chica"
      >
        A
      </button>
      <span className="selector-aa-divisor" aria-hidden="true" />
      <button
        type="button"
        onClick={onMas}
        aria-label={t('letraMas')}
        className="btn-deformable selector-aa-opcion letra-aa-grande"
      >
        A
      </button>
      <span data-testid="valor-letra-panel" className="solo-lector" aria-live="polite">{fontSize}</span>
    </div>
  )
}

// Ancho: tres columnas dibujadas. OJO con "Ancho": es el nombre del grupo -aria-label
// "Ancho del texto"- y de la primera opcion; las pruebas buscan el boton por rol.
export function SelectorAncho({
  columnaAngosta,
  marginPercent,
  setColumnaAngosta,
  setMarginPercent
}: {
  columnaAngosta?: boolean
  marginPercent?: number
  setColumnaAngosta?: (v: boolean) => void
  setMarginPercent?: (v: number) => void
}) {
  useTextos()
  return (
    <div className="selector-aa selector-aa-lleno" role="group" aria-label={t('anchoTexto')}>
      {([
        { clave: 'ancho', nombre: t('ancho'), angosta: false, margen: 5, activo: !columnaAngosta && marginPercent !== 12, lineas: [16, 16, 11] },
        { clave: 'medio', nombre: t('medio'), angosta: false, margen: 12, activo: !columnaAngosta && marginPercent === 12, lineas: [11, 11, 8] },
        { clave: 'angosto', nombre: t('angosto'), angosta: true, margen: 5, activo: !!columnaAngosta, lineas: [6, 6, 4] }
      ]).map((o) => (
        <button
          key={o.clave}
          type="button"
          aria-label={o.nombre}
          aria-pressed={o.activo}
          className={`btn-deformable selector-aa-opcion${o.activo ? ' activa' : ''}`}
          onClick={() => {
            hapticaSeleccion()
            setColumnaAngosta?.(o.angosta)
            setMarginPercent?.(o.margen)
          }}
        >
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
            {o.lineas.map((ancho, i) => (
              <rect key={i} x={(22 - ancho) / 2} y={3 + i * 5} width={ancho} height="2" rx="1" fill="currentColor" />
            ))}
          </svg>
        </button>
      ))}
    </div>
  )
}
