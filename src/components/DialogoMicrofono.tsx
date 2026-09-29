import React from 'react'
import { t } from '../textos'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'

// DIALOGO DE PERMISO DE MICROFONO NEGADO -28-09-2026-.
// Se abre cuando la persona niega el permiso de microfono. Explica por que Sigo lo necesita y
// ofrece cerrarlo ("Ahora no") o ir a los ajustes del sistema ("Abrir ajustes").
interface DialogoMicrofonoProps {
  onCerrar: () => void
  onAbrirAjustes: () => void
}

export function DialogoMicrofono({ onCerrar, onAbrirAjustes }: DialogoMicrofonoProps) {
  const refDialogo = useCerrarAfuera<HTMLDivElement>(true, onCerrar)

  return (
    <div
      className="capa-dialogo-microfono"
      onClick={onCerrar}
      data-testid="capa-dialogo-microfono"
    >
      <div
        ref={refDialogo}
        className="dialogo-ajustes"
        data-testid="dialogo-microfono"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="dialogo-ajustes-titulo">{t('microfonoTitulo')}</h3>
        <p
          style={{
            fontSize: '16px',
            lineHeight: 1.5,
            color: 'var(--color-apagado)',
            margin: 0
          }}
        >
          {t('microfonoExplicacion')}
        </p>
        <div className="botones-dialogo">
          <button
            type="button"
            data-testid="btn-microfono-ahora-no"
            onClick={onCerrar}
            style={{
              position: 'relative',
              height: '40px',
              padding: '0 16px',
              borderRadius: 'var(--redondeo-pildora)',
              fontSize: '14px',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-texto)',
              cursor: 'pointer'
            }}
          >
            {t('ahoraNo')}
            <span
              style={{
                position: 'absolute',
                inset: '-4px 0',
                borderRadius: 'inherit'
              }}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            data-testid="btn-microfono-ajustes"
            onClick={() => {
              onAbrirAjustes()
              onCerrar()
            }}
            style={{
              position: 'relative',
              height: '40px',
              padding: '0 16px',
              borderRadius: 'var(--redondeo-pildora)',
              fontSize: '14px',
              fontWeight: 500,
              background: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {t('abrirAjustes')}
            <span
              style={{
                position: 'absolute',
                inset: '-4px 0',
                borderRadius: 'inherit'
              }}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
