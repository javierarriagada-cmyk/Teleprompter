import { act } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { aDocumento, deDocumento } from '../datos/docEditor'

// COMO ESCRIBE UNA PRUEBA EN EL EDITOR DEL GUION. 24-09-2026.
//
// Hasta la Tarea 73 el guion era un <textarea> y las pruebas escribian con
// fireEvent.change(textarea, { target: { value } }). El editor nuevo -Tiptap,
// EditorGuion.tsx- es contenteditable: no tiene .value y jsdom no sabe teclear
// en el. Tiptap deja su instancia colgada del nodo -dom.editor-, y las pruebas
// la usan a traves de estas funciones, que hacen lo mismo que hacia el
// fireEvent.change: dejar el guion con un texto dado, como si se hubiera
// escrito, y que el editor avise el cambio igual que al teclear.

export function editorDelGuion(raiz: ParentNode = document): Editor {
  const el = raiz.querySelector('[data-testid="editor-guion"]') as (HTMLElement & { editor?: Editor }) | null
  if (!el || !el.editor) throw new Error('No esta el editor del guion -data-testid="editor-guion"-')
  return el.editor
}

export function escribirEnGuion(texto: string, raiz: ParentNode = document): void {
  act(() => {
    editorDelGuion(raiz).commands.setContent(aDocumento(texto), { emitUpdate: true })
  })
}

export function textoDelGuion(raiz: ParentNode = document): string {
  return deDocumento(editorDelGuion(raiz).getJSON()).texto
}

// Pegar como pega Android: el texto llega por el portapapeles y ProseMirror
// lo pasa por clipboardTextParser -EditorGuion.tsx-.
export function pegarEnGuion(texto: string, raiz: ParentNode = document): void {
  act(() => {
    // jsdom no tiene ClipboardEvent; ProseMirror solo necesita un evento.
    editorDelGuion(raiz).view.pasteText(texto, new Event('paste') as ClipboardEvent)
  })
}

// Posicion de ProseMirror para un indice del texto plano: cada linea es un
// parrafo, que abre con un lugar y cierra con otro.
function posicionDe(texto: string, indice: number): number {
  let pos = 0
  let resto = indice
  for (const linea of texto.split('\n')) {
    if (resto <= linea.length) return pos + 1 + resto
    resto -= linea.length + 1
    pos += linea.length + 2
  }
  return pos
}

export function seleccionarEnGuion(desde: number, hasta: number, raiz: ParentNode = document): void {
  const editor = editorDelGuion(raiz)
  const texto = textoDelGuion(raiz)
  act(() => {
    editor.commands.focus()
    editor.commands.setTextSelection({ from: posicionDe(texto, desde), to: posicionDe(texto, hasta) })
  })
}

// jsdom no dibuja, asi que un Range no tiene medidas. ProseMirror las pide
// para llevar el cursor a la vista despues de pegar; aca se le da un
// rectangulo vacio, que es lo que mide jsdom para todo lo demas.
if (typeof Range !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function () {
      return [] as unknown as DOMRectList
    }
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() { return {} } } as DOMRect
    }
  }
}
