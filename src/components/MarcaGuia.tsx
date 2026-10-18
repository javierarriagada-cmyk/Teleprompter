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
  tipoMano?: 'recuadro' | 'palma'
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
  tipoMano,
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
          {conMano && <ManoAnimada tipo={tipoMano ?? 'recuadro'} className="marca-guia-mano" />}
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

// Antes -ManoArrastre, dibujo a mano con trazo 1.6-:
// function ManoArrastre({ className }: { className?: string }) {
//   return (<svg className={className} width={40} height={44} viewBox="0 0 40 44" fill="none" stroke="currentColor" strokeWidth="1.6" ... />)
// }
// -guia-sigo- Manos animadas de Material Symbols, Apache 2.0.
// pan_tool: https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/pan_tool/default/24px.svg
// front_hand: https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/front_hand/default/24px.svg
function ManoAnimada({ tipo, className }: { tipo: 'recuadro' | 'palma'; className?: string }) {
  const [quieta, setQuieta] = React.useState(false)
  React.useEffect(() => {
    const alTocar = () => setQuieta(true)
    window.addEventListener('pointerdown', alTocar)
    return () => window.removeEventListener('pointerdown', alTocar)
  }, [])
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const clase = `mano-animada mano-${tipo}${quieta || reducido ? ' quieta' : ''}`
  const path = tipo === 'recuadro'
    ? 'M402-40q-30 0-56-13.5T303-92L48-465l24-23q19-19 45-22t47 12l116 81v-383q0-17 11.5-28.5T320-840q17 0 28.5 11.5T360-800v537L212-367l157 229q5 8 14 13t19 5h278q33 0 56.5-23.5T760-200v-560q0-17 11.5-28.5T800-800q17 0 28.5 11.5T840-760v560q0 66-47 113T680-40H402Zm38-440v-400q0-17 11.5-28.5T480-920q17 0 28.5 11.5T520-880v400h-80Zm160 0v-360q0-17 11.5-28.5T640-880q17 0 28.5 11.5T680-840v360h-80ZM486-300Z'
    : 'M480-480v-400q0-17 11.5-28.5T520-920q17 0 28.5 11.5T560-880v400h-80Zm-160 0v-360q0-17 11.5-28.5T360-880q17 0 28.5 11.5T400-840v360h-80ZM500-40q-142 0-241-99t-99-241v-380q0-17 11.5-28.5T200-800q17 0 28.5 11.5T240-760v380q0 109 75.5 184.5T500-120q109 0 184.5-75.5T760-380v-140q-17 0-28.5 11.5T720-480v160H600q-33 0-56.5 23.5T520-240v40h-80v-40q0-66 47-113t113-47h40v-400q0-17 11.5-28.5T680-840q17 0 28.5 11.5T720-800v207q10-3 19.5-5t20.5-2h80v220q0 142-99 241T500-40Zm40-320Z'
  return (
    <svg className={`${className ?? ''} ${clase}`} width={40} height={44} viewBox="0 -960 960 960" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

export default MarcaGuia
