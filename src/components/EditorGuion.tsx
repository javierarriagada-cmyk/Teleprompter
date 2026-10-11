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
// Antes: import { familiaLectura, colorLetraEfectiva, columnaLectura, colorDeTramo, colorSugerenciaLectura, INTERLINEADO_LECTURA } from './estiloLectura'
import { familiaLectura, colorLetraEfectiva, columnaLectura, rellenoLecturaDePie, colorDeTramo, colorSugerenciaLectura, INTERLINEADO_LECTURA } from './estiloLectura'
import useLayout from '../hooks/useLayout'
import { SANGRIA_PRIMERA_LINEA_PX, ESPACIOS_EDITOR, primeraLineaConTexto } from '../lib/cortesDeRenglon'

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

// LA PRIMERA LÍNEA ENTRA COMO EN LEER -editor-ancho-texto, 11-10-2026-. Con el teléfono de pie, la
// primera línea con texto del guion entra SANGRIA_PRIMERA_LINEA_PX en la lectura -la flecha de volver
// tapaba la primera letra, ajustes de pantallas-. El editor marca el mismo párrafo -el primero con
// texto, saltando los vacíos, con primeraLineaConTexto, la misma cuenta que la lectura- con la clase
// primera-linea-guion. Cuánto entra lo pone la variable --sangria-primera-linea, que EditorGuion
// arma con la constante solo de pie -styles.css-. Así corta el primer renglón donde lo corta Leer.
const PrimeraLinea = Extension.create({
  name: 'primeraLinea',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const parrafos: { pos: number; tam: number; texto: string }[] = []
            state.doc.forEach((node, pos) => {
              parrafos.push({ pos, tam: node.nodeSize, texto: node.textContent })
            })
            const i = primeraLineaConTexto(parrafos.map((p) => p.texto))
            if (i < 0) return DecorationSet.empty
            const p = parrafos[i]
            return DecorationSet.create(state.doc, [Decoration.node(p.pos, p.pos + p.tam, { class: 'primera-linea-guion' })])
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
  marginPercent,
  onPegado
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
  // -tarea 105- Aviso al pegar a mano: dispara la marca de idioma.
  onPegado?: () => void
}) {
  const onCambioRef = useRef(onCambio)
  onCambioRef.current = onCambio
  const onSeleccionRef = useRef(onSeleccion)
  onSeleccionRef.current = onSeleccion
  const onPegadoRef = useRef(onPegado)
  onPegadoRef.current = onPegado

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
      PrimeraLinea,
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
      // -tarea 105- Pegar a mano en el editor: avisa para la marca de idioma.
      handlePaste(_vista, _evento, _trozo) {
        onPegadoRef.current?.()
        return false
      },
      attributes: {
        'data-testid': 'editor-guion',
        class: 'editor-guion',
        spellcheck: 'true',
        autocapitalize: 'sentences',
        // EL ESPACIO DEL FINAL DEL RENGLÓN NO OCUPA LUGAR, COMO EN LA LECTURA -editor-ancho-texto,
        // 11-10-2026-. Tiptap pone en .ProseMirror white-space: break-spaces: el espacio que queda al
        // final de un renglón ocupa lugar, y una palabra que en la lectura entra justa -white-space:
        // normal, el espacio del final se cae- bajaba al renglón siguiente. Medido a 392 dp, Aa 32
        // «Medio»: «empecé a grabar mis» en la lectura y «empecé a grabar» en el editor. Con pre-wrap
        // el espacio del final cuelga fuera del renglón y no cuenta, y el editor sigue aceptando
        // espacios, el cursor y los párrafos. Va en línea porque la hoja de estilos de Tiptap se
        // inserta después de la nuestra y con la misma fuerza le ganaría a styles.css. El porqué de
        // pre-wrap y no normal está en lib/cortesDeRenglon.ts.
        style: `white-space: ${ESPACIOS_EDITOR}`
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
  // LA COLUMNA DEL EDITOR ES LA DE LA LECTURA -editor-ancho-texto, 11-10-2026-. Con el teléfono de
  // pie, el editor corta los renglones igual que la lectura: la columna tiene el mismo ancho y los
  // mismos bordes, con cualquier letra y cualquier ancho de Ajustes. Para eso arma las mismas dos
  // cajas que la lectura -contenedor-lectura y columna-texto, TeleprompterView.tsx-: una del ancho
  // de la pantalla con rellenoLecturaDePie y, adentro, la de columnaLectura. Las dos salen de las
  // mismas funciones, no de números copiados. De lado y en tableta la lectura tiene otra columna
  // -rieles, --columna-tope-h- y el editor queda como estaba.
  const dePie = useLayout() === 'tel-v'

  // La hoja se dibuja como la lectura: su fondo, su letra, su tamano, su
  // interlineado, su margen y su columna. Lo que se toca en el panel Aa se ve
  // aca mismo.
  return (
    <div
      data-testid="hoja-editor"
      // Antes: className="hoja-editor"
      // De pie, la hoja va a 16 dp de cada borde de la pantalla, como las tarjetas de la biblioteca
      // -.hoja-editor-de-pie, styles.css-.
      className={dePie ? 'hoja-editor hoja-editor-de-pie' : 'hoja-editor'}
      style={{
        backgroundColor: colorFondo,
        // Antes: paddingLeft: `${marginPercent}%`,
        // Antes: paddingRight: `${marginPercent}%`,
        // De pie el margen del ajuste de ancho lo pone la caja de adentro, sobre el ancho de la
        // pantalla, como en la lectura. Era el 5% de la hoja -16 dp en el Redmi- más el 93% de lo que
        // quedaba: la columna iba de 63 a 330 dp y la de la lectura de 32 a 361.
        paddingLeft: dePie ? 0 : `${marginPercent}%`,
        paddingRight: dePie ? 0 : `${marginPercent}%`,
        // Los colores de los tramos cambian con el fondo -colorDeTramo- y
        // llegan a styles.css como variables: las clases .tramo-* no saben
        // sobre que fondo estan.
        ['--tramo-ambar' as string]: colorDeTramo('ambar', colorFondo),
        ['--tramo-celeste' as string]: colorDeTramo('celeste', colorFondo),
        ['--tramo-salvia' as string]: colorDeTramo('salvia', colorFondo),
        ['--destacado-fondo' as string]: DESTACADO.fondo,
        ['--destacado-letra' as string]: DESTACADO.letra,
        // Placeholder del cuerpo: contraste ≥4,5:1 y más tenue que la letra -colorSugerenciaLectura-.
        ['--color-sugerencia-lectura' as string]: colorSugerenciaLectura(colorFondo)
      }}
    >
      {/* Las cajas de la lectura -editor-ancho-texto-. De pie, la de afuera mide lo que la pantalla
          -100vw, centrada sobre la hoja, que está centrada en la pantalla-, como la capa fija de la
          lectura. La de adentro lleva el relleno de la lectura: su porcentaje se toma de la caja que
          la contiene, que así es la pantalla y no la hoja. Después el 93% o los 22ch de la columna se
          toman del mismo ancho que en la lectura. De lado y en tableta no llevan estilo. */}
      <div style={dePie ? { width: '100vw', marginLeft: 'calc(50% - 50vw)' } : undefined}>
      <div style={dePie ? rellenoLecturaDePie(marginPercent) : undefined}>
      <div
        style={{
          fontSize,
          lineHeight: INTERLINEADO_LECTURA,
          fontFamily: familiaLectura(tipoFuente),
          color: colorLetraEfectiva(colorFondo, colorLetra),
          maxWidth: columna.maxWidth,
          textAlign: columna.textAlign,
          margin: '0 auto',
          // La sangría de la primera línea -PrimeraLinea, arriba-: solo de pie, como en la lectura.
          ['--sangria-primera-linea' as string]: dePie ? `${SANGRIA_PRIMERA_LINEA_PX}px` : '0px'
        }}
      >
        <EditorContent editor={editor} />
      </div>
      </div>
      </div>
    </div>
  )
}
