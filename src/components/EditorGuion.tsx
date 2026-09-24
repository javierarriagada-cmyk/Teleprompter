import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent, Editor, Mark, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Slice, Fragment } from '@tiptap/pm/model'
import { TramoFormato, DESTACADO } from '../datos/modelo'
import { aDocumento, deDocumento, llaveGuion } from '../datos/docEditor'
import { REGEX_ACOTACION } from '../lib/acotaciones'
import { familiaLectura, colorLetraEfectiva, columnaLectura, colorDeTramo, INTERLINEADO_LECTURA } from './estiloLectura'

// EL EDITOR DEL GUION, CON FORMATO DE VERDAD. 24-09-2026.
//
// Hasta aca era un <textarea>: una caja de texto plano. No puede pintar una
// palabra en negrita ni en color, asi que al aplicar formato no se veia nada,
// y la letra, el tamano y los colores de lectura tampoco. De ahi salio la
// muestra del panel Aa. El dueno: "si el problema es que esa es una caja de
// texto plano, eso es lo que debemos resolver".
//
// Tiptap -MIT, sobre ProseMirror- dibuja el formato mientras se escribe. Se
// usa lo minimo: parrafos, negrita, deshacer, y dos marcas propias: los
// tres colores y el destacado. Titulos, listas, cursiva, enlaces y saltos de linea blandos
// quedan apagados: el guion es texto que se lee en voz alta.
//
// Lo guardado no cambia: docEditor.ts traduce texto + tramos al documento y
// de vuelta.

const ColorTramo = Mark.create({
  name: 'colorTramo',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-color'),
        renderHTML: (attrs: { color?: string }) =>
          attrs.color ? { 'data-color': attrs.color, class: `tramo-${attrs.color}` } : {}
      }
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-color]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  }
})

const Destacado = Mark.create({
  name: 'destacado',
  parseHTML() {
    return [{ tag: 'mark' }]
  },
  renderHTML() {
    return ['mark', { class: 'tramo-destacado' }, 0]
  }
})

// Las acotaciones siguen siendo [ ] y ( ) dentro del texto, como las lee el
// motor -acotaciones.ts-. El editor no las guarda aparte: solo las dibuja
// atenuadas, igual que la lectura -renglones.tsx-.
const Acotaciones = Extension.create({
  name: 'acotaciones',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decos: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (!node.isTextblock) return true
              const texto = node.textContent
              for (const m of texto.matchAll(REGEX_ACOTACION)) {
                const desde = pos + 1 + (m.index ?? 0)
                decos.push(Decoration.inline(desde, desde + m[0].length, { class: 'acotacion-editor' }))
              }
              return false
            })
            return DecorationSet.create(state.doc, decos)
          }
        }
      })
    ]
  }
})

export function EditorGuion({
  texto,
  tramos,
  onCambio,
  onSeleccion,
  editorRef,
  placeholder,
  fontSize,
  tipoFuente,
  colorFondo,
  colorLetra,
  columnaAngosta,
  marginPercent
}: {
  texto: string
  tramos: TramoFormato[]
  onCambio: (texto: string, tramos: TramoFormato[]) => void
  onSeleccion: (haySeleccion: boolean) => void
  editorRef: React.MutableRefObject<Editor | null>
  placeholder: string
  fontSize: number
  tipoFuente: 'sans' | 'serif'
  colorFondo: string
  colorLetra: string
  columnaAngosta: boolean
  marginPercent: number
}) {
  const onCambioRef = useRef(onCambio)
  onCambioRef.current = onCambio
  const onSeleccionRef = useRef(onSeleccion)
  onSeleccionRef.current = onSeleccion

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        hardBreak: false,
        italic: false,
        strike: false,
        underline: false,
        link: false,
        trailingNode: false
      }),
      ColorTramo,
      Destacado,
      Acotaciones,
      Placeholder.configure({ placeholder })
    ],
    content: aDocumento(texto, tramos),
    editorProps: {
      // AL PEGAR TEXTO PLANO, CADA LINEA ES UNA LINEA. ProseMirror, por su
      // cuenta, junta los saltos seguidos -dos parrafos separados por una
      // linea en blanco llegan pegados- y esa linea en blanco se perdia. Aca
      // cada salto abre un parrafo, vacio si la linea lo esta: pegar deja el
      // texto igual que como lo guardaba el textarea.
      clipboardTextParser(texto, _contexto, _plano, vista) {
        const esquema = vista.state.schema
        const parrafos = texto.replace(/\r\n?/g, '\n').split('\n').map((linea) =>
          esquema.nodes.paragraph.create(null, linea ? esquema.text(linea) : null)
        )
        return new Slice(Fragment.from(parrafos), 1, 1)
      },
      attributes: {
        'data-testid': 'editor-guion',
        class: 'editor-guion',
        spellcheck: 'true',
        autocapitalize: 'sentences'
      }
    },
    onUpdate: ({ editor }) => {
      const { texto, tramos } = deDocumento(editor.getJSON())
      onCambioRef.current(texto, tramos)
    },
    onSelectionUpdate: ({ editor }) => {
      onSeleccionRef.current(!editor.state.selection.empty)
    },
    onBlur: () => {
      // Al tocar la barra de formato el editor no pierde el foco -los botones
      // hacen preventDefault-. Si lo pierde de verdad, la barra se va.
      onSeleccionRef.current(false)
    }
  })

  useEffect(() => {
    editorRef.current = editor
    return () => {
      editorRef.current = null
    }
  }, [editor, editorRef])

  // Si el guion cambia por fuera del editor -abrir un archivo-, se carga de
  // nuevo. Si el cambio vino del propio editor, las dos llaves coinciden y no
  // se toca nada: recargar mueve el cursor y corta lo que Gboard esta
  // componiendo.
  useEffect(() => {
    if (!editor) return
    const actual = deDocumento(editor.getJSON())
    if (llaveGuion(actual.texto, actual.tramos) !== llaveGuion(texto, tramos)) {
      editor.commands.setContent(aDocumento(texto, tramos), { emitUpdate: false })
    }
  }, [editor, texto, tramos])

  const columna = columnaLectura(columnaAngosta)

  // La hoja se dibuja como la lectura: su fondo, su letra, su tamano, su
  // interlineado, su margen y su columna. Lo que se toca en el panel Aa se ve
  // aca mismo.
  return (
    <div
      data-testid="hoja-editor"
      className="hoja-editor"
      style={{
        backgroundColor: colorFondo,
        paddingLeft: `${marginPercent}%`,
        paddingRight: `${marginPercent}%`,
        // Los colores de los tramos cambian con el fondo -colorDeTramo- y
        // llegan a styles.css como variables: las clases .tramo-* no saben
        // sobre que fondo estan.
        ['--tramo-ambar' as string]: colorDeTramo('ambar', colorFondo),
        ['--tramo-celeste' as string]: colorDeTramo('celeste', colorFondo),
        ['--tramo-salvia' as string]: colorDeTramo('salvia', colorFondo),
        ['--destacado-fondo' as string]: DESTACADO.fondo,
        ['--destacado-letra' as string]: DESTACADO.letra
      }}
    >
      <div
        style={{
          fontSize,
          lineHeight: INTERLINEADO_LECTURA,
          fontFamily: familiaLectura(tipoFuente),
          color: colorLetraEfectiva(colorFondo, colorLetra),
          maxWidth: columna.maxWidth,
          textAlign: columna.textAlign,
          margin: '0 auto'
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
