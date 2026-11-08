import React, { useEffect, useRef, useState } from 'react'
import { t, useTextos } from '../textos'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { formatearLimite, relojDeSegundos, type TipoToma } from '../lib/limites'
import { ofertaTraePruebaGratis } from '../lib/suscripcion'

// EL AVISO DE LÍMITE GRATIS ANTES DE EMPEZAR -proxima-version, 2026-11-07-. Existe porque, sin Sigo+, quien
// tenía un guion más largo que el límite se enteraba a mitad de la toma -grabando, al minuto 3 se corta; leyendo
// con voz, a los 4 se pausa- y perdía el esfuerzo. Sale al apretar Empezar en LISTO, antes del micrófono, y
// lo decide decidirAvisoLimiteGratis -lib/limites.ts-. Misma forma y mismas clases que DialogoPermiso.tsx
// -.capa-dialogo-microfono, .dialogo-ajustes, .texto-dialogo, .botones-dialogo, .boton-dialogo-: el componente
// no escribe tamaños ni colores a mano -T209-. Dos botones, como en Material 3: a la izquierda seguir gratis
// y a la derecha, lleno, «Ver Sigo+». Tocar afuera cierra sin empezar.
interface DialogoLimiteGratisProps {
  tipo: TipoToma
  segundosGuion: number
  limiteSeg: number
  onSeguirGratis: () => void
  onVerSigoMas: () => void
  onCerrar: () => void
}

export function DialogoLimiteGratis({ tipo, segundosGuion, limiteSeg, onSeguirGratis, onVerSigoMas, onCerrar }: DialogoLimiteGratisProps) {
  useTextos()
  const refDialogo = useCerrarAfuera<HTMLDivElement>(true, onCerrar)
  // La línea de la prueba gratis va SOLO si la oferta vigente la trae: con false o null -no se pudo
  // preguntar-, no va.
  const [conPrueba, setConPrueba] = useState(false)
  useEffect(() => {
    let vigente = true
    ofertaTraePruebaGratis()
      .then((r) => { if (vigente) setConPrueba(r === true) })
      .catch((e) => console.warn('[DialogoLimiteGratis] no se supo si hay prueba gratis:', e))
    return () => { vigente = false }
  }, [])
  // Como DialogoPermiso: al abrirse el foco va al título y al cerrarse vuelve a donde estaba.
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

  const { tiempo, corto } = formatearLimite(limiteSeg, {
    limiteUnMinuto: t('limiteUnMinuto'),
    limiteMinutos: t('limiteMinutos'),
    limiteMinutosCorto: t('limiteMinutosCorto')
  })
  const titulo = t('avisoLimiteTitulo', { d: relojDeSegundos(segundosGuion) })
  const grabar = tipo === 'grabacion'

  return (
    <div className="capa-dialogo-microfono" onClick={onCerrar} data-testid="capa-dialogo-limite-gratis">
      <div
        ref={refDialogo}
        className="dialogo-ajustes"
        data-testid="dialogo-limite-gratis"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 ref={tituloRef} tabIndex={-1} className="dialogo-ajustes-titulo">{titulo}</h3>
        <p className="texto-dialogo">{t(grabar ? 'avisoLimiteTextoGrabar' : 'avisoLimiteTextoLeer', { tiempo })}</p>
        {conPrueba && <p className="texto-dialogo" data-testid="linea-prueba-gratis">{t('avisoLimitePrueba')}</p>}
        <div className="botones-dialogo">
          <button
            type="button"
            className="boton-dialogo"
            data-testid="btn-limite-seguir-gratis"
            onClick={onSeguirGratis}
          >
            {t(grabar ? 'avisoLimiteGrabar' : 'avisoLimiteLeer', { corto })}
          </button>
          <button
            type="button"
            className="boton-dialogo lleno"
            data-testid="btn-limite-ver-sigo-mas"
            onClick={onVerSigoMas}
          >
            {t('avisoLimiteVerSigoMas')}
          </button>
        </div>
      </div>
    </div>
  )
}
