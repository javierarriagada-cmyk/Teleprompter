// MARCA DE GUÍA -tarea 105, PASO 2, 06-10-2026-. Portal a document.body + position fixed,
// como el menú de guiones de BibliotecaView -tarea 102-. Posición con colocarMenu: abajo si
// cabe, arriba si no, dentro de la zona segura. Sin título: solo el texto + «Entendido».
// No se cierra sola por tiempo.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bordesSeguros, colocarMenu } from '../lib/bordesSeguros'
import { movimientoApagado, MS_CHICO, CURVA_ENTRA } from './movimiento'
import { t, useTextos } from '../textos'

export type MarcaGuiaProps = {
  // El control al que apunta. Si no está en el DOM, no se dibuja.
  anclaEl: HTMLElement | null
  texto: string
  // Id del párrafo de la marca: el control anclado lo pone en aria-describedby.
  idDescripcion: string
  // 'entendido' gasta la marca; 'afuera' solo la cierra (no forever). Recuadro/palma no vuelven hasta reelegir / reencender.
  onCerrar: (motivo: 'entendido' | 'afuera') => void
  // Mano de línea limpia solo en la marca del recuadro; si no queda refinada se omite.
  conMano?: boolean
  alinear?: 'derecha' | 'izquierda'
  // data-testid de la burbuja.
  testid?: string
}

export function MarcaGuia({
  anclaEl,
  texto,
  idDescripcion,
  onCerrar,
  conMano = false,
  alinear = 'derecha',
  testid = 'marca-guia'
}: MarcaGuiaProps) {
  useTextos()
  const refBurbuja = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; arriba: boolean } | null>(null)
  const onCerrarRef = useRef(onCerrar)
  onCerrarRef.current = onCerrar

  useLayoutEffect(() => {
    if (!anclaEl) {
      setPos(null)
      return
    }
    function colocar() {
      const burbuja = refBurbuja.current
      if (!anclaEl || !burbuja) return
      const r = anclaEl.getBoundingClientRect()
      const c = colocarMenu(
        { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
        { alto: burbuja.offsetHeight, ancho: burbuja.offsetWidth },
        { alto: window.innerHeight, ancho: window.innerWidth },
        bordesSeguros(),
        alinear
      )
      setPos({ top: c.top, left: c.left, arriba: c.arriba })
    }
    colocar()
    const id = requestAnimationFrame(colocar)
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
    }
  }, [anclaEl, alinear, texto, conMano])

  // Tocar afuera -ni la burbuja ni el ancla- cierra sin gastar. El ancla se deja pasar: usarlo
  // cuenta como cierre con vista -lo marca quien cablea al usar el control-.
  // Antes: onCerrar() sin motivo; el padre marcaba vista también al tocar afuera.
  useEffect(() => {
    function fuera(e: Event) {
      const t = e.target as Node | null
      if (!t) return
      if (refBurbuja.current && refBurbuja.current.contains(t)) return
      if (anclaEl && anclaEl.contains(t)) return
      onCerrarRef.current('afuera')
    }
    // pointerdown: llega antes que el click del control; el ancla se excluye arriba.
    document.addEventListener('pointerdown', fuera, true)
    return () => document.removeEventListener('pointerdown', fuera, true)
  }, [anclaEl])

  if (!anclaEl || typeof document === 'undefined') return null

  const animacion = movimientoApagado()
    ? 'none'
    : `marcaGuiaEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`

  return createPortal(
    <>
      {/* Anuncio educado al aparecer -nunca assertive-. Región siempre montada: Android/Chrome
          avisan los cambios de una región que ya existía -mismo patrón que AvisoBreve-. */}
      <div role="status" aria-live="polite" className="solo-lector" data-testid="marca-guia-anuncio">
        {texto}
      </div>
      <div
        ref={refBurbuja}
        data-testid={testid}
        className={`marca-guia${pos?.arriba ? ' marca-guia-arriba' : ' marca-guia-abajo'}`}
        style={{
          position: 'fixed',
          top: pos?.top ?? -9999,
          left: pos?.left ?? 0,
          animation: animacion,
          visibility: pos ? 'visible' : 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="marca-guia-flecha" aria-hidden="true" />
        <div className="marca-guia-cuerpo">
          {conMano && <ManoArrastre className="marca-guia-mano" />}
          <p id={idDescripcion} className="marca-guia-texto">
            {texto}
          </p>
        </div>
        <button
          type="button"
          className="boton-texto-ficha marca-guia-entendido"
          data-testid="marca-guia-entendido"
          onClick={() => onCerrarRef.current('entendido')}
        >
          {t('entendido')}
        </button>
      </div>
    </>,
    document.body
  )
}

// Mano de línea limpia al lado del texto del recuadro -peso de trazo tipo iconos Sigo, 1.6-.
// Si no convence en dispositivo se puede omitir pasando conMano={false}.
function ManoArrastre({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={40}
      height={44}
      viewBox="0 0 40 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Palma */}
      <ellipse cx="22" cy="22" rx="9" ry="10" />
      {/* Dedos */}
      <path d="M16 20 V8" />
      <path d="M20 19 V5" />
      <path d="M24 19 V6" />
      <path d="M28 20 V10" />
      {/* Pulgar */}
      <path d="M14 24 L6 18" />
      {/* Flecha de arrastre hacia abajo-izquierda */}
      <path d="M14 34 L4 42" />
      <path d="M4 42 L12 41" />
      <path d="M4 42 L5 34" />
    </svg>
  )
}

export default MarcaGuia
