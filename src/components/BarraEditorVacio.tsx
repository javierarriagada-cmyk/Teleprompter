import React from 'react'
import type { Editor } from '@tiptap/react'
import { Capacitor } from '@capacitor/core'
import { Clipboard } from '@capacitor/clipboard'
import { Guion } from '../datos/modelo'
import { t } from '../textos'

// LO QUE HAY COPIADO, EN EL TELEFONO O EN EL NAVEGADOR. En el APK lo lee el plugin oficial
// de Capacitor -el portapapeles de Android-; en el navegador, la API del navegador. Si no se
// puede leer -permiso negado, portapapeles vacio o con una imagen- devuelve ''.
// Antes: async function leerPortapapeles(): Promise<string> {
export async function leerPortapapeles(): Promise<string> {
  try {
    if (Capacitor.isNativePlatform()) {
      const r = await Clipboard.read()
      return typeof r.value === 'string' && (r.type === undefined || r.type.startsWith('text')) ? r.value : ''
    }
    if (navigator.clipboard && navigator.clipboard.readText) return await navigator.clipboard.readText()
  } catch {
    // sin portapapeles legible: el boton cae a dejar el cursor en el guion
  }
  return ''
}

// PEGAR TEXTO EN EL EDITOR, USADO POR EL BOTÓN PEGAR Y POR EL ACCESO DIRECTO NUEVO.
export function pegarTextoEnEditor(editor: Editor | null, texto: string, onPegado?: () => void) {
  if (!editor || !texto) return
  editor.commands.focus('end')
  const vista = editor.view
  const trozo = vista.someProp('clipboardTextParser', (f) => f(texto, vista.state.selection.$from, true, vista))
  if (trozo) vista.dispatch(vista.state.tr.replaceSelection(trozo).scrollIntoView())
  else editor.commands.insertContent(texto)
  onPegado?.()
}

interface BarraEditorVacioProps {
  guion: Guion
  fontSize?: number
  editorRef: React.RefObject<Editor | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  cargandoArchivo: boolean
  // -tarea 105- Tras pegar con el botón: dispara la marca de idioma.
  onPegado?: () => void
}

export function BarraEditorVacio({
  guion,
  fontSize,
  editorRef,
  fileInputRef,
  cargandoArchivo,
  onPegado
}: BarraEditorVacioProps) {
  return (
    /* Barra fija abajo cuando numPalabras === 0: Pegar texto y Abrir archivo */
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--aire-2)',
        padding: '0 var(--aire-4)',
        pointerEvents: 'none',
        zIndex: 100
      }}
    >
      <button
        data-testid="btn-pegar-texto"
        className="btn-deformable"
        onClick={() => {
          // Antes esto abria un dialogo con OTRA caja de texto adentro, en la que
          // habia que pegar, y despues apretar "Importar": tres toques y una
          // pantalla de mas para algo que el teclado del telefono ya hace.
          // Ahora el boton lleva al usuario a donde tiene que estar -escribiendo en
          // el guion, con el cursor al final- y el pegado lo hace Android, que al
          // poner el cursor en un campo vacio ofrece "Pegar" solo.
          // No se agrego @capacitor/clipboard: seria una dependencia nueva para
          // ahorrar un toque que el sistema ya ahorra.
          //
          // -24-09-2026: NO LO AHORRA. Con el editor de la Tarea 73 Android no ofrece
          // "Pegar" al poner el cursor: Javier, "el boton pegar no esta haciendo nada".
          // Ahora el boton PEGA: lee lo copiado -leerPortapapeles, arriba- y lo mete por
          // el mismo parser que un pegado a mano -clipboardTextParser de EditorGuion-, asi
          // que cada linea sigue siendo una linea. No view.pasteText: arma un ClipboardEvent
          // que las pruebas -jsdom- no tienen. Si no hay texto copiado, queda lo de antes:
          // el cursor al final del guion.
          const ed = editorRef.current
          if (!ed) return
          ed.commands.focus('end')
          // Antes:
          // leerPortapapeles().then((texto) => {
          //   const e = editorRef.current
          //   if (!texto || !e) return
          //   const vista = e.view
          //   const trozo = vista.someProp('clipboardTextParser', (f) => f(texto, vista.state.selection.$from, true, vista))
          //   if (trozo) vista.dispatch(vista.state.tr.replaceSelection(trozo).scrollIntoView())
          //   else e.commands.insertContent(texto)
          //   onPegado?.()
          // })
          leerPortapapeles().then((texto) => {
            pegarTextoEnEditor(editorRef.current, texto, onPegado)
          })
        }}
        style={{
          pointerEvents: 'auto',
          flex: 1,
          maxWidth: 200,
          padding: 'var(--aire-3) var(--aire-4)',
          fontSize: 'var(--texto-cuerpo)',
          fontWeight: 600,
          // Pegar manda. De cada diez guiones, nueve llegan de un texto que ya
          // esta escrito en otra parte. El crema es el mismo de Leer: en esta
          // aplicacion, el relleno crema quiere decir "este es el camino".
          backgroundColor: 'var(--color-acento)',
          color: 'var(--color-texto-acento)',
          borderRadius: 'var(--redondeo-pildora)',
          cursor: 'pointer',
          border: 'none'
        }}
      >
        {t('pegarTexto')}
      </button>
      <button
        data-testid="btn-abrir-archivo"
        className="btn-deformable"
        onClick={() => fileInputRef.current?.click()}
        disabled={cargandoArchivo}
        style={{
          pointerEvents: 'auto',
          flex: 1,
          maxWidth: 200,
          padding: 'var(--aire-3) var(--aire-4)',
          fontSize: 'var(--texto-cuerpo)',
          fontWeight: 600,
          // Acompana. Sube de var(--bg-fila) a var(--bg-panel) y gana borde por
          // la misma razon que Grabar: sin relleno fuerte, el borde es lo que lo
          // dibuja. Queda el mismo par que abajo -uno relleno, uno de contorno-,
          // asi las dos barras de esta pantalla se leen con la misma gramatica.
          backgroundColor: 'var(--bg-panel)',
          color: 'var(--color-texto)',
          borderRadius: 'var(--redondeo-pildora)',
          cursor: cargandoArchivo ? 'not-allowed' : 'pointer',
          border: '1px solid var(--color-borde)'
        }}
      >
        {cargandoArchivo ? t('leyendoArchivo') : t('abrirArchivo')}
      </button>
    </div>
  )
}
