import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Guion } from '../datos/modelo'
import { hapticaToqueSuave } from '../haptica'
import { IconoAtras, IconoArchivar, IconoTacho } from './IconosApp'
import { t } from '../textos'
import { colocarMenu } from '../lib/bordesSeguros'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'

interface EditorCabeceraProps {
  guion: Guion
  onVolverBiblioteca: () => void
  idiomaGuion: string
  nombreIdioma: string
  onAlternarIdioma: () => void
  onAbrirAjustes: () => void
  editorRef?: React.RefObject<Editor | null>
  // -tarea 105- Ancla de la marca de guía del idioma y su descripción.
  idiomaBtnRef?: React.Ref<HTMLButtonElement>
  idiomaDescribedBy?: string
  // -guia-sigo- Menú de borrar y archivar.
  onBorrar?: (id: string) => void
  onArchivar?: (id: string, archivado: boolean) => void
}

export function EditorCabecera({
  guion,
  onVolverBiblioteca,
  idiomaGuion,
  nombreIdioma,
  onAlternarIdioma,
  onAbrirAjustes,
  editorRef,
  idiomaBtnRef,
  idiomaDescribedBy,
  onBorrar,
  onArchivar
}: EditorCabeceraProps) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const refBtn = useRef<HTMLButtonElement>(null)
  const refMenuEl = useRef<HTMLDivElement>(null)
  const refMenu = useCerrarAfuera(menuAbierto, () => setMenuAbierto(false), [refMenuEl])
  React.useLayoutEffect(() => {
    if (!menuAbierto || !refBtn.current || !refMenuEl.current) return
    const r = refBtn.current.getBoundingClientRect()
    const m = refMenuEl.current
    const c = colocarMenu(
      { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      { alto: m.offsetHeight, ancho: m.offsetWidth },
      { alto: window.innerHeight, ancho: window.innerWidth },
      { arriba: 0, abajo: 0 },
      'derecha'
    )
    setPos({ top: c.top, left: c.left })
  }, [menuAbierto])

  return (
    /* Fila superior discreta: a la izquierda ‹ Guiones, a la derecha Aa */
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-4)' }}>
      {/* LA SALIDA NO PUEDE SER LO MAS CHICO DE LA PANTALLA.
          Estaba en texto-meta -13 px- y con padding 0, o sea un blanco de
          toque del tamano del dibujo. Javier lo vio el 21 de septiembre de
          2026 entrando a escribir un guion.
          Sube al mismo escalon que los titulos de la portada -texto-cuerpo-
          y gana padding de verdad. El margen negativo compensa ese padding
          para que la flecha siga alineada con el borde del contenido: crece
          el area que recibe el dedo, no se corre el dibujo.
          24-09-2026: sube otro escalon, a 18 px -.volver-guiones-, junto con
          el Aa de la derecha. El dueno: "la palabra Guiones que esta arriba
          tambien deberia ser un poco mas grande". */}
      <button
        onClick={onVolverBiblioteca}
        className="volver-guiones btn-deformable"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-apagado)',
          cursor: 'pointer',
          padding: 'var(--aire-2)',
          margin: 'calc(-1 * var(--aire-2))',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--aire-2)'
        }}
      >
        <IconoAtras tamano={24} />
        <span>{t('guiones')}</span>
      </button>

      {/* EL IDIOMA DEL GUION, AL LADO DEL Aa -tarea 75-. Mismo tratamiento que su vecino:
          un texto que se toca, sin borde ni cajon. Un toque alterna ES y EN y lo deja
          elegido a mano. Mas chico y en gris que el Aa: se mira una vez, el Aa se usa. */}
      <div className="fila-editor-derecha">
        <button
          type="button"
          ref={idiomaBtnRef}
          onClick={onAlternarIdioma}
          className="btn-deformable boton-aa boton-idioma-guion"
          data-testid="btn-idioma-guion"
          data-idioma={idiomaGuion}
          aria-label={t('idiomaDelGuion', { idioma: nombreIdioma })}
          aria-describedby={idiomaDescribedBy}
          title={t('idiomaDelGuion', { idioma: nombreIdioma })}
        >
          {idiomaGuion.toUpperCase()}
        </button>

        <button
          onClick={() => {
            hapticaToqueSuave()
            // Al abrir Aa se cierran el teclado y la seleccion: si no, el menu
            // de Android -Copiar, Compartir- queda flotando sobre el guion
            // mientras se mira como cambia. Visto en el telefono, 24-09-2026.
            const ed = editorRef?.current
            if (ed) {
              ed.commands.setTextSelection(ed.state.selection.to)
              ed.commands.blur()
            }
            onAbrirAjustes()
          }}
          className="btn-deformable boton-aa"
          data-testid="btn-menu-opciones-editor"
          /* Nombre para lectores de pantalla -28-09-2026-: TalkBack leia "A, a", que no explicaba la funcion. */
          aria-label={t('ajustesLectura')}
          title={t('ajustesLectura')}
        >
          Aa
        </button>
        {/* -guia-sigo- Menú de borrar y archivar, anclado al botón. */}
        <button
          type="button"
          ref={refBtn}
          className="btn-deformable boton-aa"
          data-testid="btn-mas-acciones-editor"
          aria-label={t('masAcciones')}
          title={t('masAcciones')}
          onClick={() => { hapticaToqueSuave(); setMenuAbierto((v) => !v) }}
        >
          ⋮
        </button>
      </div>
      {menuAbierto && createPortal(
        <div
          ref={(el) => { refMenuEl.current = el }}
          data-testid="menu-editor-guion"
          className="menu-adjunto-guion"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? 0, right: 'auto' }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="fila-menu-adjunto-guion"
            onClick={() => { onArchivar?.(guion.id, !guion.archivado); setMenuAbierto(false) }}
          >
            <IconoArchivar tamano={22} />
            <span>{guion.archivado ? t('desarchivar') : t('archivar')}</span>
          </button>
          <button
            type="button"
            className="fila-menu-adjunto-guion peligro"
            onClick={() => { onBorrar?.(guion.id); setMenuAbierto(false) }}
          >
            <IconoTacho tamano={22} strokeWidth={1.6} />
            <span>{t('borrar')}</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
