import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, Bloque, TramoFormato, contarPalabras, PAREJAS_COLOR, COLORES_TRAMO } from '../datos/modelo'
import { consolidarGuion } from '../datos/consolidar'
import { importarArchivo } from '../datos/importarArchivo'
import { IdMotor } from '../motor/MotorDeVoz'
import { hapticaSeleccion, hapticaToqueSuave } from '../haptica'
import { movimientoApagado, MS_DEDO, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_SALE, CURVA_RESORTE } from './movimiento'
import { IconoAtras, IconoEmpezar } from './IconosApp'
import { EditorGuion } from './EditorGuion'
import { familiaLectura } from './estiloLectura'
import type { Editor } from '@tiptap/react'

// reubicarTramos vivia aca: con el <textarea>, cada tecla llegaba como un
// texto nuevo entero y habia que adivinar donde habia quedado cada marca
// comparando el viejo con el nuevo. Tiptap lleva las marcas pegadas al texto,
// asi que ya no hay nada que adivinar. Se fue el 24-09-2026; su guardiana,
// T101, ahora prueba lo mismo sobre el editor -pruebas.test.tsx-.

interface EditorViewProps {
  guion: Guion
  onChangeGuion: (nuevoGuion: Guion) => void
  onVolverBiblioteca: () => void
  onEntrarLectura: (rect?: DOMRect) => void
  fontSize?: number
  onLetraMenos?: () => void
  onLetraMas?: () => void
  marginPercent?: number
  setMarginPercent?: (m: number) => void
  // Espejo, "donde lees" y "mostrar tiempo" YA NO ESTAN ACA. Son de la toma
  // -cambian entre una toma y otra- y viven en el engranaje del lienzo. El
  // panel del editor es del TEXTO: tamano, ancho, tipografia y parejas de
  // color. Si alguno vuelve a aparecer en los dos lados, se rompe la regla de
  // las tres familias y "donde lees" vuelve a estar duplicado, que es de donde
  // salio esta tarea.
  verTranscripcion?: boolean
  setVerTranscripcion?: (v: boolean) => void
  columnaAngosta?: boolean
  setColumnaAngosta?: (v: boolean) => void
  colorFondo?: string
  setColorFondo?: (c: string) => void
  colorLetra?: string
  setColorLetra?: (c: string) => void
  tipoFuente?: 'sans' | 'serif'
  setTipoFuente?: (f: 'sans' | 'serif') => void
  // El Tema tampoco esta aca, y por el mismo motivo: no es del texto, es de la
  // aplicacion. Vive en el menu de la portada, junto a idioma y vibracion.
  engine?: IdMotor
  setEngine?: (e: IdMotor) => void
  onEntrarGrabar?: (rect?: DOMRect) => void
  onRegistrarCerrarModal?: (fn: (() => boolean) | null) => void
  'data-pantalla-direccion'?: string
  style?: React.CSSProperties
  onAnimationEnd?: (e: React.AnimationEvent) => void
}


function generarIdBloque(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

// Los nombres de idioma salen de aca para la linea de meta. Hasta la
// Tarea 72 el panel Aa tenia un <select> para elegir el idioma del guion,
// y se quito: en el APK el motor nativo ignora el idioma -MotorNativo.ts,
// iniciar()- porque el unico modelo de voz que viaja es el de espanol.
// Elegir otro idioma no cambiaba lo que escucha el motor: era un control
// falso. El producto es para hablantes de espanol -decision del dueno,
// 23-09-2026-. Guion.idioma se sigue guardando: si algun dia viajan otros
// modelos, el dato ya esta y el control vuelve.
const NOMBRE_IDIOMA: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano'
}

export default function EditorView({
  guion,
  onChangeGuion,
  onVolverBiblioteca,
  onEntrarLectura,
  fontSize = 24,
  onLetraMenos,
  onLetraMas,
  marginPercent = 5,
  setMarginPercent,
  verTranscripcion = false,
  setVerTranscripcion,
  columnaAngosta = false,
  setColumnaAngosta,
  colorFondo = PAREJAS_COLOR[0].fondo,
  setColorFondo,
  colorLetra = PAREJAS_COLOR[0].letra,
  setColorLetra,
  tipoFuente = 'sans',
  setTipoFuente,
  engine = 'vosk',
  setEngine,
  onEntrarGrabar,
  onRegistrarCerrarModal,
  'data-pantalla-direccion': dataPantallaDireccion,
  style,
  onAnimationEnd
}: EditorViewProps) {
  const [mostrarModalAjustes, setMostrarModalAjustes] = useState(false)
  const refAjustes = useCerrarAfuera(mostrarModalAjustes, () => setMostrarModalAjustes(false))

  const [dragOffsetY, setDragOffsetY] = useState(0)
  const esArrastrandoModalRef = useRef(false)
  const dragStartYRef = useRef<number | null>(null)

  const idGuionLimpioRef = useRef<string | null>(null)

  // Auto-consolidar y limpiar guiones SOLO AL ABRIR UN GUION NUEVO (por id)
  useEffect(() => {
    if (!guion || !guion.id) return
    if (idGuionLimpioRef.current === guion.id) {
      return
    }
    idGuionLimpioRef.current = guion.id
    if (guion.bloques && guion.bloques.length > 0) {
      const consolidado = consolidarGuion(guion)
      if (consolidado !== guion) {
        onChangeGuion(consolidado)
      }
    }
  }, [guion, onChangeGuion])

  function obtenerClientY(e: React.PointerEvent<HTMLDivElement>): number {
    if (typeof e.clientY === 'number' && !isNaN(e.clientY)) return e.clientY
    if (e.nativeEvent && typeof (e.nativeEvent as any).clientY === 'number') return (e.nativeEvent as any).clientY
    return 0
  }

  function empezarArrastre(e: React.PointerEvent<HTMLDivElement>, elemento: HTMLElement | null) {
    dragStartYRef.current = obtenerClientY(e)
    esArrastrandoModalRef.current = true
    if (elemento && elemento.setPointerCapture) {
      try { elemento.setPointerCapture(e.pointerId) } catch (err) {}
    }
  }

  function handleAgarraderaPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    empezarArrastre(e, e.currentTarget)
  }

  function handleModalPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target && target.closest('button, input, select, label, textarea, a, option, [role="button"]')) {
      return
    }
    if (e.currentTarget.scrollTop > 0) {
      return
    }
    empezarArrastre(e, e.currentTarget)
  }

  function handleModalPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!esArrastrandoModalRef.current || dragStartYRef.current === null) return
    const currentY = obtenerClientY(e)
    const dy = Math.max(0, currentY - dragStartYRef.current)
    setDragOffsetY(dy)
  }

  function handleModalPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!esArrastrandoModalRef.current || dragStartYRef.current === null) return
    const currentY = obtenerClientY(e)
    const dy = Math.max(0, currentY - dragStartYRef.current)
    if (e.currentTarget.releasePointerCapture) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) {}
    }
    esArrastrandoModalRef.current = false
    dragStartYRef.current = null

    if (dy > 96) {
      setMostrarModalAjustes(false)
      setDragOffsetY(0)
    } else {
      setDragOffsetY(0)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  const editorRef = useRef<Editor | null>(null)
  const [hayTextoSeleccionado, setHayTextoSeleccionado] = useState(false)
  const [tituloEnfocado, setTituloEnfocado] = useState(false)
  const [barraLeerVisible, setBarraLeerVisible] = useState(true)
  const ultimoScrollTopRef = useRef<number>(0)
  const timerScrollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleScroll() {
      const currentScrollTop = window.scrollY || document.documentElement.scrollTop || 0
      const diff = currentScrollTop - ultimoScrollTopRef.current

      if (diff > 5) {
        setBarraLeerVisible(false)
      } else if (diff < -5) {
        setBarraLeerVisible(true)
      }

      ultimoScrollTopRef.current = currentScrollTop

      if (timerScrollStopRef.current) clearTimeout(timerScrollStopRef.current)
      timerScrollStopRef.current = setTimeout(() => {
        setBarraLeerVisible(true)
      }, 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timerScrollStopRef.current) clearTimeout(timerScrollStopRef.current)
    }
  }, [])

  function handleTituloChange(nuevoTitulo: string) {
    onChangeGuion({
      ...guion,
      titulo: nuevoTitulo,
      modificado: Date.now()
    })
  }

  async function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''
    setCargandoArchivo(true)
    setErrorArchivo(null)

    try {
      const resultado = await importarArchivo(file)
      if (resultado.bloques.length === 0) {
        throw new Error('El archivo no contiene texto importable.')
      }

      const textoAInsertar = resultado.bloques.map((b) => b.texto).join('\n\n')
      const b0 = (guion.bloques && guion.bloques[0])
        ? guion.bloques[0]
        : { id: generarIdBloque(), nombre: '', texto: '', tramos: [] }

      const textoExistente = b0.texto || ''
      const textoNuevo = !textoExistente.trim()
        ? textoAInsertar
        : textoExistente + '\n\n' + textoAInsertar

      const tituloNuevo = (!guion.titulo || !guion.titulo.trim() || guion.titulo === 'Sin título')
        ? resultado.titulo
        : guion.titulo

      onChangeGuion({
        ...guion,
        titulo: tituloNuevo,
        bloques: [{ ...b0, texto: textoNuevo }],
        modificado: Date.now()
      })
    } catch (err: any) {
      const mensaje = err?.message || 'Error al importar el archivo'
      setErrorArchivo(mensaje)
    } finally {
      setCargandoArchivo(false)
    }
  }

  // El formato se aplica sobre el editor, que lo dibuja en el acto y avisa el
  // cambio por onCambio -texto y tramos, como se guarda-. Negrita y color van
  // y vuelven: tocar de nuevo el mismo lo saca.
  function aplicarFormatoEnSeleccion(opciones: { negrita?: boolean; destacado?: boolean; color?: 'ambar' | 'celeste' | 'salvia' }) {
    const editor = editorRef.current
    if (!editor || editor.state.selection.empty) return
    if (opciones.negrita) {
      editor.chain().focus().toggleBold().run()
    }
    if (opciones.destacado) {
      editor.chain().focus().toggleMark('destacado').run()
    }
    if (opciones.color) {
      if (editor.isActive('colorTramo', { color: opciones.color })) {
        editor.chain().focus().unsetMark('colorTramo').run()
      } else {
        editor.chain().focus().setMark('colorTramo', { color: opciones.color }).run()
      }
    }
  }

  function handleAcotacion() {
    const editor = editorRef.current
    if (!editor) return
    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt(to, ']').insertContentAt(from, '[').run()
  }

  function handleEditorCambio(nuevoTexto: string, nuevosTramos: TramoFormato[]) {
    const b0 = (guion.bloques && guion.bloques[0])
      ? guion.bloques[0]
      : { id: generarIdBloque(), nombre: '', texto: '', tramos: [] }
    onChangeGuion({
      ...guion,
      bloques: [{ ...b0, texto: nuevoTexto, tramos: nuevosTramos }],
      modificado: Date.now()
    })
  }

  const numPalabras = contarPalabras(guion)
  const numMinutos = Math.round(numPalabras / 150)
  const nombreIdioma = NOMBRE_IDIOMA[guion.idioma || 'es'] || (guion.idioma || 'es')
  const resumenMeta = `${numPalabras.toLocaleString('es')} palabras · ${numMinutos > 0 ? numMinutos : 1} min · ${nombreIdioma}`

  useEffect(() => {
    if (!mostrarModalAjustes) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMostrarModalAjustes(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mostrarModalAjustes])

  useEffect(() => {
    if (onRegistrarCerrarModal) {
      onRegistrarCerrarModal(() => {
        if (mostrarModalAjustes) {
          setMostrarModalAjustes(false)
          return true
        }
        return false
      })
    }
    return () => {
      if (onRegistrarCerrarModal) {
        onRegistrarCerrarModal(null)
      }
    }
  }, [mostrarModalAjustes, onRegistrarCerrarModal])

  const btnLeerRef = useRef<HTMLButtonElement>(null)

  const bloqueUnico: Bloque = (guion.bloques && guion.bloques[0])
    ? guion.bloques[0]
    : { id: 'b-inicial', nombre: '', texto: '', tramos: [] }

  return (
    <div
      data-pantalla-direccion={dataPantallaDireccion}
      onAnimationEnd={onAnimationEnd}
      style={{ maxWidth: 800, margin: '0 auto', padding: 'calc(20px + env(safe-area-inset-top, 0px)) var(--aire-4) calc(130px + env(safe-area-inset-bottom, 0px)) var(--aire-4)', position: 'relative', ...style }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.docx"
        onChange={handleSeleccionarArchivo}
        style={{ display: 'none' }}
      />

      {/* Fila superior discreta: a la izquierda ‹ Guiones, a la derecha Aa */}
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
          <span>Guiones</span>
        </button>

        <button
          onClick={() => {
            hapticaToqueSuave()
            // Al abrir Aa se cierran el teclado y la seleccion: si no, el menu
            // de Android -Copiar, Compartir- queda flotando sobre el guion
            // mientras se mira como cambia. Visto en el telefono, 24-09-2026.
            const ed = editorRef.current
            if (ed) {
              ed.commands.setTextSelection(ed.state.selection.to)
              ed.commands.blur()
            }
            setMostrarModalAjustes(true)
          }}
          className="btn-deformable boton-aa"
          data-testid="btn-menu-opciones-editor"
          title="Ajustes de lectura"
        >
          Aa
        </button>
      </div>

      {/* Titulo es el titulo: Display, editable, sin etiqueta ni recuadro.
          El placeholder dice "Título del guion" y no "Sin título": el primero
          dice QUE HACER, el segundo solo describe un estado y se lee como una
          etiqueta puesta por el sistema. Ojo con la linea de abajo: la
          comparacion con 'Sin título' es contra el titulo GUARDADO en el
          modelo, no contra este placeholder. Son dos cosas distintas que hasta
          hoy decian la misma frase. Se cambio el 23 de septiembre de 2026. */}
      <div style={{ marginBottom: 'var(--aire-2)' }}>
        <input
          type="text"
          value={guion.titulo === 'Sin título' ? '' : guion.titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          onFocus={() => setTituloEnfocado(true)}
          onBlur={() => setTituloEnfocado(false)}
          placeholder="Título del guion"
          className="texto-display"
          data-testid="input-titulo-guion"
          style={{
            width: '100%',
            padding: 'var(--aire-1) var(--aire-2)',
            border: 'none',
            outline: 'none',
            backgroundColor: tituloEnfocado ? 'var(--bg-fila)' : 'transparent',
            color: 'var(--color-texto)',
            boxSizing: 'border-box',
            borderRadius: 'var(--redondeo)',
            transition: `background-color ${MS_CHICO}ms ${CURVA_ENTRA}`
          }}
        />
      </div>

      {/* Resumen meta bajo el titulo - solo si numPalabras > 0 */}
      {numPalabras > 0 && (
        <div
          data-testid="contador-palabras-editor"
          className="texto-meta"
          style={{
            color: 'var(--color-apagado)',
            marginTop: 'calc(-1 * var(--aire-1))',
            marginBottom: 'var(--aire-4)',
            paddingLeft: 'var(--aire-2)',
            paddingBottom: 'var(--aire-3)',
            // La linea separa el NOMBRE del guion de lo que se va a LEER. Las dos
            // cosas estan en Source Serif 4 y se funden sin nada en el medio.
            // Va en var(--bg-panel) y no en var(--color-borde): el borde a fuerza
            // completa sobre var(--bg-suelo) es una raya que grita. Esta tiene que
            // separar, no anunciarse.
            // Aparece con la misma condicion que el contador -numPalabras > 0- y
            // no con una propia: con el guion vacio no hay nada que separar, y el
            // dibujo del estado vacio que aprobo Javier no tiene linea.
            borderBottom: '1px solid var(--bg-panel)'
          }}
        >
          {resumenMeta}
        </div>
      )}

      {/* EL CAJON Aa, SIN MUESTRA Y SIN VELO. 24-09-2026.
          Con el editor nuevo -EditorGuion, Tiptap- el guion mismo toma la letra,
          el tamano, el ancho y los colores de lectura en el momento en que se
          tocan. La muestra que vivia aca dentro -MuestraLectura, Tarea 72- sobraba,
          y el velo oscuro que tapaba el resto de la pantalla escondia justo lo que
          habia que mirar. El dueno, al probarlo: "se cambia todo
          instantaneamente, de ahi tendria que salir la previsualizacion".
          Es el patron de Apple Books y Kindle, de donde viene el "Aa": el libro
          cambia detras, a plena luz, y el cajon es bajo. La capa transparente
          sigue ahi para que tocar el guion cierre el cajon. */}
      {mostrarModalAjustes && (
        <div
          className="capa-cajon-aa"
          data-testid="capa-ajustes"
          onClick={() => setMostrarModalAjustes(false)}
        >
          <div
            ref={refAjustes}
            data-testid="panel-ajustes"
            className="panel-superficie cajon-aa"
            onPointerDown={handleModalPointerDown}
            onPointerMove={handleModalPointerMove}
            onPointerUp={handleModalPointerUp}
            onPointerCancel={handleModalPointerUp}
            style={{
              paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))',
              transform: `translateY(${dragOffsetY}px)`,
              transition: esArrastrandoModalRef.current
                ? 'none'
                : movimientoApagado()
                ? 'none'
                : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`,
              animation: movimientoApagado() || esArrastrandoModalRef.current || dragOffsetY > 0
                ? 'none'
                : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              data-testid="agarradera-hoja-ajustes"
              className="cajon-aa-agarradera"
              onPointerDown={handleAgarraderaPointerDown}
              onPointerMove={handleModalPointerMove}
              onPointerUp={handleModalPointerUp}
              onPointerCancel={handleModalPointerUp}
            >
              <div className="cajon-aa-agarradera-raya" />
            </div>

            {/* Sin titulo y sin "Listo". El dueno, 24-09-2026: "la palabra
                texto y la palabra listo pierden todo sentido". El cajon se
                entiende solo -esta debajo del Aa que lo abrio- y se cierra
                tocando el guion o bajandolo por la agarradera. */}

            {/* TRES FILAS Y NINGUNA PALABRA. 24-09-2026.
                Los controles ya mostraban lo que hacen -la A chica y la A
                grande, el Aa en cada letra, las columnas dibujadas, las
                parejas pintadas- y el dueno vio que los nombres de al lado
                sobraban: "la verdad es que es innecesario". Sin nombres, los
                controles ocupan todo el ancho, como el cajon de temas de
                Apple Books: todo cae en la misma grilla y los blancos de
                toque crecen.
                  1. Tamano: una pieza partida al medio. El numero se fue de
                     la vista -el cambio se ve en el guion- y queda para el
                     lector de pantalla.
                  2. Letra y ancho, mitad y mitad: los dos cambian la forma
                     del texto.
                  3. Colores: tres tarjetas anchas. Es lo que mas cambia el
                     guion y por eso tiene la fila entera.
                Los nombres siguen en aria-label y en title: el lector de
                pantalla y las pruebas los usan. Los selectores son el mismo
                objeto -.selector-aa-, no botoneras decoradas por separado.
                OJO con "Ancho": es el nombre del grupo -aria-label "Ancho del
                texto"- y de la primera opcion. Hasta el 23-09-2026 la fila
                decia "Ancho del texto" porque getByText encontraba dos
                "Ancho"; ahora las pruebas buscan el boton por rol. */}
            <div className="cajon-aa-filas">
              <div className="selector-aa selector-aa-lleno" role="group" aria-label="Tamaño de letra">
                <button
                  type="button"
                  onClick={onLetraMenos}
                  aria-label="Disminuir letra panel"
                  className="btn-deformable selector-aa-opcion letra-aa-chica"
                >
                  A
                </button>
                <span className="selector-aa-divisor" aria-hidden="true" />
                <button
                  type="button"
                  onClick={onLetraMas}
                  aria-label="Aumentar letra panel"
                  className="btn-deformable selector-aa-opcion letra-aa-grande"
                >
                  A
                </button>
                <span data-testid="valor-letra-panel" className="solo-lector" aria-live="polite">{fontSize}</span>
              </div>

              {(setTipoFuente || setColumnaAngosta || setMarginPercent) && (
                <div className="fila-aa-par">
                  {setTipoFuente && (
                    <div className="selector-aa selector-aa-lleno" role="group" aria-label="Tipografía">
                      {([
                        { valor: 'sans' as const, nombre: 'Sans' },
                        { valor: 'serif' as const, nombre: 'Serif' }
                      ]).map((o) => (
                        <button
                          key={o.valor}
                          type="button"
                          aria-label={o.nombre}
                          aria-pressed={tipoFuente === o.valor}
                          className={`btn-deformable selector-aa-opcion aa-${o.valor}${tipoFuente === o.valor ? ' activa' : ''}`}
                          onClick={() => {
                            hapticaSeleccion()
                            setTipoFuente(o.valor)
                          }}
                        >
                          Aa
                        </button>
                      ))}
                    </div>
                  )}

                  {(setColumnaAngosta || setMarginPercent) && (
                    <div className="selector-aa selector-aa-lleno" role="group" aria-label="Ancho del texto">
                      {([
                        { nombre: 'Ancho', angosta: false, margen: 5, activo: !columnaAngosta && marginPercent !== 12, lineas: [16, 16, 11] },
                        { nombre: 'Medio', angosta: false, margen: 12, activo: !columnaAngosta && marginPercent === 12, lineas: [11, 11, 8] },
                        { nombre: 'Angosto', angosta: true, margen: 5, activo: columnaAngosta, lineas: [6, 6, 4] }
                      ]).map((o) => (
                        <button
                          key={o.nombre}
                          type="button"
                          aria-label={o.nombre}
                          aria-pressed={o.activo}
                          className={`btn-deformable selector-aa-opcion${o.activo ? ' activa' : ''}`}
                          onClick={() => {
                            hapticaSeleccion()
                            setColumnaAngosta?.(o.angosta)
                            setMarginPercent?.(o.margen)
                          }}
                        >
                          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
                            {o.lineas.map((ancho, i) => (
                              <rect key={i} x={(22 - ancho) / 2} y={3 + i * 5} width={ancho} height="2" rx="1" fill="currentColor" />
                            ))}
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Colores de lectura: parejas, no dos listas. Fuente: PAREJAS_COLOR. */}
              {setColorFondo && setColorLetra && (
                <div className="parejas-aa" role="group" aria-label="Colores de lectura">
                  {[
                    { fondo: PAREJAS_COLOR[0].fondo, letra: PAREJAS_COLOR[0].letra, label: 'Negro con blanco' },
                    { fondo: PAREJAS_COLOR[1].fondo, letra: PAREJAS_COLOR[1].letra, label: 'Negro con ámbar' },
                    { fondo: PAREJAS_COLOR[2].fondo, letra: PAREJAS_COLOR[2].letra, label: 'Blanco con negro' }
                  ].map((p, idx) => {
                    const activo = colorFondo.toUpperCase() === p.fondo.toUpperCase() && colorLetra.toUpperCase() === p.letra.toUpperCase()
                    return (
                      <button
                        key={idx}
                        type="button"
                        title={p.label}
                        aria-label={p.label}
                        aria-pressed={activo}
                        className={`btn-deformable pareja-aa${activo ? ' activa' : ''}`}
                        onClick={() => {
                          hapticaSeleccion()
                          setColorFondo(p.fondo)
                          setColorLetra(p.letra)
                        }}
                      >
                        {/* Fondo y letra de la pareja: son dato, no tema
                            -modelo.ts, PAREJAS_COLOR-. El Aa va en la letra
                            elegida, asi la tarjeta es el guion en chico. */}
                        <span
                          className="pareja-aa-muestra"
                          style={{ backgroundColor: p.fondo, color: p.letra, fontFamily: familiaLectura(tipoFuente) }}
                        >
                          Aa
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorArchivo && (
        <div
          style={{
            color: 'var(--color-grabando)',
            backgroundColor: 'var(--bg-suelo)',
            border: '1px solid var(--color-borde)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo)',
            marginBottom: 'var(--aire-4)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 'bold'
          }}
        >
          Error al abrir archivo: {errorArchivo}
        </div>
      )}

      {/* Hoja Única de Texto */}
      <div style={{ position: 'relative' }}>
        {/* Controles de formato: SOLO SI HAY TEXTO SELECCIONADO */}
        {/* LA BARRA DE FORMATO FLOTA ARRIBA, NO EMPUJA EL GUION. Tarea 72.
            Hasta la 72 se insertaba en el flujo, justo arriba del textarea:
            seleccionar una palabra empujaba todo el guion para abajo y el que
            seleccionaba perdia de vista lo que habia seleccionado.
            Ahora sale por un portal a document.body, fija arriba de la
            pantalla, encima de la fila "‹ Guiones … Aa". Es el patron de
            Android para la seleccion -la barra de accion contextual-. No
            depende del teclado, y se ve aunque el guion este desplazado.
            Los botones conservan su onMouseDown con preventDefault: eso es lo
            que evita que el textarea pierda la seleccion al tocarlos. */}
        {hayTextoSeleccionado && createPortal(
          <div
            data-testid={`barra-formato-${bloqueUnico.id}`}
            role="toolbar"
            aria-label="Formato del texto seleccionado"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 150,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--aire-3)',
              paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
              paddingBottom: 8,
              paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))',
              paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))',
              backgroundColor: 'var(--bg-panel)',
              borderBottom: '1px solid var(--color-borde)',
              animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
            }}
          >
            <button
              type="button"
              className="btn-deformable"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aplicarFormatoEnSeleccion({ negrita: true })}
              style={{
                width: 40,
                height: 40,
                padding: 0,
                fontWeight: 'bold',
                fontSize: 'var(--texto-titulo)',
                border: '1px solid var(--color-borde)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)',
                cursor: 'pointer'
              }}
              title="Negrita"
            >
              N
            </button>
            <div style={{ display: 'flex', gap: 'var(--aire-2)', alignItems: 'center' }}>
              {([
                { color: 'ambar' as const, titulo: 'Ámbar', testid: 'btn-color-ambar' },
                { color: 'celeste' as const, titulo: 'Celeste', testid: undefined },
                { color: 'salvia' as const, titulo: 'Salvia', testid: undefined }
              ]).map((c) => (
                <button
                  key={c.color}
                  type="button"
                  className="btn-deformable"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => aplicarFormatoEnSeleccion({ color: c.color })}
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: '2px solid var(--bg-panel)',
                    boxShadow: '0 0 0 1px var(--color-borde)',
                    backgroundColor: COLORES_TRAMO[c.color],
                    cursor: 'pointer'
                  }}
                  title={c.titulo}
                  data-testid={c.testid}
                />
              ))}
            </div>
            {/* Destacado: fondo amarillo, letra negra. El boton se dibuja como
                lo que hace. 24-09-2026. */}
            <button
              type="button"
              className="btn-deformable btn-destacado-barra"
              data-testid="btn-destacado"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aplicarFormatoEnSeleccion({ destacado: true })}
              title="Destacado"
              aria-label="Destacado"
            >
              ab
            </button>
            <button
              type="button"
              className="btn-deformable"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAcotacion}
              style={{
                height: 40,
                padding: '0 var(--aire-3)',
                border: '1px solid var(--color-borde)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)',
                cursor: 'pointer',
                fontSize: 'var(--texto-meta)'
              }}
              title="Acotación"
            >
              [...] Acotación
            </button>
          </div>,
          document.body
        )}

        {/* El data-testid existe porque hasta hoy SEIS pruebas encontraban este
            textarea por su placeholder exacto -getByPlaceholderText('Escribe el
            texto...')-. O sea que el texto que ve el usuario era, sin que nadie lo
            decidiera, una llave de las pruebas: no se podia mejorar una palabra sin
            romper seis archivos. El testid corta ese amarre.
            El ejemplo va adentro del placeholder y no como un parrafo aparte: un
            parrafo de ayuda ocupa lugar para siempre, el placeholder desaparece
            solo con la primera letra.
            "Sigo" va con mayuscula inicial y no "SIGO": es un nombre, no una sigla.
            24-09-2026: el textarea se fue -Tarea 73, Tiptap-. El editor lleva
            data-testid="editor-guion" y las pruebas escriben en el con
            src/pruebas/ayudaEditor.ts; el amarre al placeholder sigue cortado. */}
        <EditorGuion
          texto={bloqueUnico.texto}
          tramos={bloqueUnico.tramos || []}
          onCambio={handleEditorCambio}
          onSeleccion={setHayTextoSeleccionado}
          editorRef={editorRef}
          placeholder={'Escribe el texto...\n\nEj: Hola, hoy te quiero contar cómo usar Sigo para grabar tus videos mirando a la cámara.'}
          fontSize={fontSize}
          tipoFuente={tipoFuente}
          colorFondo={colorFondo}
          colorLetra={colorLetra}
          columnaAngosta={columnaAngosta}
          marginPercent={marginPercent}
        />
      </div>

      {/* Barra fija abajo cuando numPalabras === 0: Pegar texto y Abrir archivo */}
      {numPalabras === 0 && (
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
              editorRef.current?.commands.focus('end')
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
            Pegar texto
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
            {cargandoArchivo ? 'Leyendo...' : 'Abrir archivo'}
          </button>
        </div>
      )}

      {/* Botón de Leer en voz alta Fijo Abajo - Solo cuando hay palabras */}
      {numPalabras > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--aire-2)',
            padding: '0 var(--aire-4)',
            pointerEvents: 'none',
            zIndex: 100,
            transform: barraLeerVisible ? 'translateY(0)' : 'translateY(120px)',
            transition: movimientoApagado()
              ? 'none'
              : barraLeerVisible
              ? `transform ${MS_CHICO}ms ${CURVA_RESORTE}`
              : `transform ${MS_DEDO}ms ${CURVA_SALE}`
          }}
        >
          <button
            ref={btnLeerRef}
            className="btn-deformable"
            onClick={() => {
              const rect = btnLeerRef.current?.getBoundingClientRect()
              onEntrarLectura(rect)
            }}
            data-testid="btn-leer-guion-fijo"
            style={{
              pointerEvents: 'auto',
              flex: 1,
              maxWidth: 160,
              padding: 'var(--aire-3) var(--aire-4)',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 600,
              backgroundColor: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              borderRadius: 'var(--redondeo-pildora)',
              cursor: 'pointer',
              // Sin borde: un contorno gris alrededor de un relleno crema no separa
              // nada sobre el fondo oscuro, solo ensucia el canto. El relleno YA es
              // el limite. Grabar si lleva borde, porque ahi el borde es el boton.
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-2)'
              // NO VA transform NI transition ACA. El translateY de entrada y salida
              // de la barra lo hace el contenedor de la linea 1194, y estaba repetido
              // en los dos: la barra escondida se corria 240px en vez de 120. Ademas
              // un transform en linea le gana al scaleY(0.94) de btn-deformable y
              // deja el boton sin apretado. Se saco el 23 de septiembre de 2026.
            }}
          >
            <IconoEmpezar tamano={16} />
            <span>Leer</span>
          </button>
          <button
            className="btn-deformable btn-grabar"
            onClick={() => {
              const rect = btnLeerRef.current?.getBoundingClientRect()
              onEntrarGrabar?.(rect)
            }}
            data-testid="btn-grabar-guion-fijo"
            style={{
              pointerEvents: 'auto',
              flex: 1,
              maxWidth: 160,
              padding: 'var(--aire-3) var(--aire-4)',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 600,
              borderRadius: 'var(--redondeo-pildora)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-2)'
            }}
          >
            {/* El punto de grabar era el caracter "●", que hereda el color del texto
                y queda gris: el mismo gris del triangulo de Leer. Dos puertas que
                hacen cosas distintas se veian iguales. Es un div y no un caracter
                porque asi toma var(--color-grabando), el mismo rojo de la barra de
                tiempo y del punto tally del lienzo. Es el UNICO rojo de la pantalla.
                24-09-2026: el boton entero tambien lleva ese rojo, tenue -.btn-grabar,
                styles.css-. Sigue siendo un solo rojo, ahora en el boton que graba. */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 'var(--redondeo-pildora)',
                backgroundColor: 'var(--color-grabando)',
                flexShrink: 0
              }}
            />
            <span>Grabar</span>
          </button>
        </div>
      )}
    </div>
  )
}
