import React, { useEffect, useRef } from 'react'
import { t } from '../textos'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'

// DIALOGO DE PERMISO NEGADO -tarea 84, F1, 29-09-2026-. Sale de DialogoMicrofono -28-09-2026-,
// generalizado: el micrófono y la cámara se niegan igual y se explican igual. El tipo es un dato y
// de él salen el título, la explicación y los data-testid -dialogo-microfono, btn-microfono-ahora-no
// y btn-microfono-ajustes siguen siendo exactamente los de siempre; la cámara lleva los suyos-.
// Mismos botones -"Ahora no" y "Abrir ajustes"- y misma forma: la capa y el cuadro son las mismas
// clases de styles-ajustes.css -.capa-dialogo-microfono, .dialogo-ajustes, .texto-dialogo,
// .boton-dialogo-; el componente no escribe tamaños ni colores a mano -T209-.
export type TipoPermiso = 'microfono' | 'camara'

interface DialogoPermisoProps {
  tipo: TipoPermiso
  onCerrar: () => void
  onAbrirAjustes: () => void
}

const TEXTOS = {
  microfono: { titulo: 'microfonoTitulo', explicacion: 'microfonoExplicacion' },
  camara: { titulo: 'camaraTitulo', explicacion: 'camaraExplicacion' }
} as const

export function DialogoPermiso({ tipo, onCerrar, onAbrirAjustes }: DialogoPermisoProps) {
  const refDialogo = useCerrarAfuera<HTMLDivElement>(true, onCerrar)
  const textos = TEXTOS[tipo]
  // -pulido-1- Como PanelAjustes: al abrirse el foco va al título y al cerrarse vuelve a donde estaba,
  // si sigue en el documento. Sin anillo al tocar, solo con :focus-visible -styles-ajustes.css-.
  const tituloRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const elPrevio = document.activeElement as HTMLElement | null
    if (tituloRef.current) {
      tituloRef.current.focus({ preventScroll: true })
    }
    return () => {
      if (elPrevio && typeof elPrevio.focus === 'function' && document.body.contains(elPrevio)) {
        elPrevio.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <div
      // La clase de la capa se llama "microfono" por historia: es la misma capa para los dos.
      className="capa-dialogo-microfono"
      onClick={onCerrar}
      data-testid={`capa-dialogo-${tipo}`}
    >
      <div
        ref={refDialogo}
        className="dialogo-ajustes"
        data-testid={`dialogo-${tipo}`}
        role="dialog"
        aria-modal="true"
        aria-label={t(textos.titulo)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* -pulido-1- Antes: <h3 className="dialogo-ajustes-titulo">{t(textos.titulo)}</h3> */}
        <h3 ref={tituloRef} tabIndex={-1} className="dialogo-ajustes-titulo">{t(textos.titulo)}</h3>
        <p className="texto-dialogo">{t(textos.explicacion)}</p>
        <div className="botones-dialogo">
          <button
            type="button"
            className="boton-dialogo"
            data-testid={`btn-${tipo}-ahora-no`}
            onClick={onCerrar}
          >
            {t('ahoraNo')}
          </button>
          <button
            type="button"
            className="boton-dialogo lleno"
            data-testid={`btn-${tipo}-ajustes`}
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
