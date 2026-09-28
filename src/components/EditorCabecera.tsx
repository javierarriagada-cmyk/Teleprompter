import React from 'react'
import type { Editor } from '@tiptap/react'
import { Guion } from '../datos/modelo'
import { hapticaToqueSuave } from '../haptica'
import { IconoAtras } from './IconosApp'
import { t } from '../textos'

interface EditorCabeceraProps {
  guion: Guion
  onVolverBiblioteca: () => void
  idiomaGuion: string
  nombreIdioma: string
  onAlternarIdioma: () => void
  onAbrirAjustes: () => void
  editorRef?: React.RefObject<Editor | null>
}

export function EditorCabecera({
  guion,
  onVolverBiblioteca,
  idiomaGuion,
  nombreIdioma,
  onAlternarIdioma,
  onAbrirAjustes,
  editorRef
}: EditorCabeceraProps) {
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
          onClick={onAlternarIdioma}
          className="btn-deformable boton-aa boton-idioma-guion"
          data-testid="btn-idioma-guion"
          data-idioma={idiomaGuion}
          aria-label={t('idiomaDelGuion', { idioma: nombreIdioma })}
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
          title={t('ajustesLectura')}
        >
          Aa
        </button>
      </div>
    </div>
  )
}
