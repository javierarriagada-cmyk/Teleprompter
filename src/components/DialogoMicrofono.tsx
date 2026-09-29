import React from 'react'
import { t } from '../textos'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'

// DIALOGO DE PERMISO DE MICROFONO NEGADO -28-09-2026-.
// Se abre cuando la persona niega el permiso de microfono. Explica por que Sigo lo necesita y
// ofrece cerrarlo ("Ahora no") o ir a los ajustes del sistema ("Abrir ajustes").
// Los estilos viven en styles-ajustes.css -.texto-dialogo, .boton-dialogo-: el componente no
// escribe tamanos ni colores a mano -T209-.
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
        role="dialog"
        aria-modal="true"
        aria-label={t('microfonoTitulo')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="dialogo-ajustes-titulo">{t('microfonoTitulo')}</h3>
        <p className="texto-dialogo">{t('microfonoExplicacion')}</p>
        <div className="botones-dialogo">
          <button
            type="button"
            className="boton-dialogo"
            data-testid="btn-microfono-ahora-no"
            onClick={onCerrar}
          >
            {t('ahoraNo')}
          </button>
          <button
            type="button"
            className="boton-dialogo lleno"
            data-testid="btn-microfono-ajustes"
            onClick={() => {
              onAbrirAjustes()
              onCerrar()
            }}
          >
            {t('abrirAjustes')}
          </button>
        </div>
      </div>
    </div>
  )
}
