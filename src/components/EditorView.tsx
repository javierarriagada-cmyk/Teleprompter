import React, { useEffect, useRef, useState } from 'react'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, Bloque, TramoFormato, contarPalabras, calcularDuracionTexto, PAREJAS_COLOR, COLORES_TRAMO } from '../datos/modelo'
import { importarTexto } from '../datos/importar'
import { importarArchivo } from '../datos/importarArchivo'
import { IdMotor } from '../motor/MotorDeVoz'
import { hapticaSeleccion, hapticaToqueSuave } from '../haptica'
import { movimientoApagado, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_NORMAL, CURVA_RESORTE } from './movimiento'

export function reubicarTramos(
  textoViejo: string,
  nuevoTexto: string,
  tramos: TramoFormato[]
): TramoFormato[] {
  if (tramos.length === 0) return []
  if (textoViejo === nuevoTexto) return tramos

  let ini = 0
  const maxIni = Math.min(textoViejo.length, nuevoTexto.length)
  while (ini < maxIni && textoViejo[ini] === nuevoTexto[ini]) ini++

  let cola = 0
  while (
    cola < maxIni - ini &&
    textoViejo[textoViejo.length - 1 - cola] === nuevoTexto[nuevoTexto.length - 1 - cola]
  ) cola++

  const finViejo = textoViejo.length - cola
  const delta = (nuevoTexto.length - cola) - finViejo

  const salida: TramoFormato[] = []
  for (const tr of tramos) {
    if (tr.hasta <= ini) {
      salida.push(tr)
    } else if (tr.desde >= finViejo) {
      salida.push({ ...tr, desde: tr.desde + delta, hasta: tr.hasta + delta })
    }
  }
  return salida
}

interface EditorViewProps {
  guion: Guion
  onChangeGuion: (nuevoGuion: Guion) => void
  onVolverBiblioteca: () => void
  onEntrarLectura: () => void
  fontSize?: number
  onLetraMenos?: () => void
  onLetraMas?: () => void
  marginPercent?: number
  setMarginPercent?: (m: number) => void
  mirror?: boolean
  setMirror?: (m: boolean) => void
  anclajeZona?: 'arriba' | 'medio' | 'abajo'
  setAnclajeZona?: (a: 'arriba' | 'medio' | 'abajo') => void
  verTranscripcion?: boolean
  setVerTranscripcion?: (v: boolean) => void
  mostrarTiempo?: boolean
  setMostrarTiempo?: (v: boolean) => void
  columnaAngosta?: boolean
  setColumnaAngosta?: (v: boolean) => void
  colorFondo?: string
  setColorFondo?: (c: string) => void
  colorLetra?: string
  setColorLetra?: (c: string) => void
  tipoFuente?: 'sans' | 'serif'
  setTipoFuente?: (f: 'sans' | 'serif') => void
  tema?: 'sistema' | 'claro' | 'oscuro'
  setTema?: (t: 'sistema' | 'claro' | 'oscuro') => void
  engine?: IdMotor
  setEngine?: (e: IdMotor) => void
  onRegistrarCerrarModal?: (fn: (() => boolean) | null) => void
  'data-pantalla-direccion'?: string
  style?: React.CSSProperties
  onAnimationEnd?: (e: React.AnimationEvent) => void
}

// EL CUADRO DE TEXTO CRECE CON LO QUE TIENE ADENTRO.
//
// Antes el alto salia de rows={lineas logicas + 2}, y eso cuenta los saltos de
// linea que escribio el autor, NO las lineas que quedan despues de que el texto
// se acomoda al ancho de la pantalla. Un parrafo largo sin saltos ocupa una linea
// logica y seis visuales.
//
// Medido en el telefono el 15 de septiembre de 2026 con el guion de bienvenida:
// el cuadro media 374 px de alto y su contenido 720. La mitad del guion quedaba
// escondida en un scroll adentro de otro scroll, que es de lo peor que se puede
// hacer en una pantalla de telefono.
//
// No se notaba mientras lo pegado se partia en un bloque por parrafo -cada bloque
// era corto-. Al pasar a un solo bloque, aparece con cualquier guion de verdad.
//
// En jsdom scrollHeight vale 0 porque no hay maquetado: por eso solo se aplica
// cuando da mayor que cero, y las pruebas siguen viendo el textarea como antes.
function ajustarAltoTextarea(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  if (el.scrollHeight > 0) {
    el.style.height = el.scrollHeight + 'px'
  }
}

function generarIdBloque(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
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
  mirror = false,
  setMirror,
  anclajeZona = 'arriba',
  setAnclajeZona,
  verTranscripcion = false,
  setVerTranscripcion,
  mostrarTiempo = true,
  setMostrarTiempo,
  columnaAngosta = false,
  setColumnaAngosta,
  colorFondo = PAREJAS_COLOR[0].fondo,
  setColorFondo,
  colorLetra = PAREJAS_COLOR[0].letra,
  setColorLetra,
  tipoFuente = 'sans',
  setTipoFuente,
  tema = 'claro',
  setTema,
  engine = 'vosk',
  setEngine,
  onRegistrarCerrarModal,
  'data-pantalla-direccion': dataPantallaDireccion,
  style,
  onAnimationEnd
}: EditorViewProps) {
  const [plegados, setPlegados] = useState<Record<string, boolean>>({})
  const [menuOpcionesAbierto, setMenuOpcionesAbierto] = useState(false)
  const [mostrarModalAjustes, setMostrarModalAjustes] = useState(false)
  // se cierra tocando afuera o con Escape, no solo con el mismo boton
  const refMenuOpciones = useCerrarAfuera(menuOpcionesAbierto, () => setMenuOpcionesAbierto(false))
  const [mostrarModalPegar, setMostrarModalPegar] = useState(false)
  const [textoPegado, setTextoPegado] = useState('')
  const [errorPegado, setErrorPegado] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const ultimasSeleccionesRef = useRef<Record<string, { desde: number; hasta: number }>>({})
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<string | null>(null)
  const [hayTextoSeleccionado, setHayTextoSeleccionado] = useState(false)
  const [tituloEnfocado, setTituloEnfocado] = useState(false)

  function togglePlegado(id: string) {
    setPlegados((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  function handleTituloChange(nuevoTitulo: string) {
    onChangeGuion({
      ...guion,
      titulo: nuevoTitulo,
      modificado: Date.now()
    })
  }

  function handleAceptarPegar() {
    if (!textoPegado || !textoPegado.trim()) {
      setErrorPegado('El texto pegado está vacío o sólo contiene espacios.')
      return
    }

    const nuevosBloques = importarTexto(textoPegado)
    if (nuevosBloques.length === 0) {
      setErrorPegado('El texto pegado está vacío o sólo contiene espacios.')
      return
    }

    const bloquesActuales = guion.bloques || []
    onChangeGuion({
      ...guion,
      bloques: [...bloquesActuales, ...nuevosBloques],
      modificado: Date.now()
    })

    setTextoPegado('')
    setErrorPegado(null)
    setMostrarModalPegar(false)
  }

  function handleCancelarPegar() {
    setTextoPegado('')
    setErrorPegado(null)
    setMostrarModalPegar(false)
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

      const bloquesActuales = guion.bloques || []
      const tituloNuevo = (!guion.titulo || !guion.titulo.trim() || guion.titulo === 'Sin título')
        ? resultado.titulo
        : guion.titulo

      onChangeGuion({
        ...guion,
        titulo: tituloNuevo,
        bloques: [...bloquesActuales, ...resultado.bloques],
        modificado: Date.now()
      })
    } catch (err: any) {
      const mensaje = err?.message || 'Error al importar el archivo'
      setErrorArchivo(mensaje)
    } finally {
      setCargandoArchivo(false)
    }
  }

  function handleIdiomaChange(nuevoIdioma: string) {
    onChangeGuion({
      ...guion,
      idioma: nuevoIdioma,
      modificado: Date.now()
    })
  }

  function handleAgregarBloque() {
    const nuevoBloque: Bloque = {
      id: generarIdBloque(),
      nombre: '',
      texto: '',
      tramos: []
    }
    const bloquesActuales = guion.bloques || []
    onChangeGuion({
      ...guion,
      bloques: [...bloquesActuales, nuevoBloque],
      modificado: Date.now()
    })
  }

  function handleTextoBloqueChange(index: number, nuevoTexto: string) {
    if (!guion.bloques || !guion.bloques[index]) return
    const bloqueViejo = guion.bloques[index]

    const nuevosBloques = [...guion.bloques]
    nuevosBloques[index] = {
      ...nuevosBloques[index],
      texto: nuevoTexto,
      tramos: reubicarTramos(bloqueViejo.texto || '', nuevoTexto, bloqueViejo.tramos || [])
    }

    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function aplicarFormatoEnSeleccion(index: number, opciones: { negrita?: boolean; color?: 'ambar' | 'celeste' | 'salvia' }) {
    if (!guion.bloques || !guion.bloques[index]) return
    const bloque = guion.bloques[index]
    const textarea = textareaRefs.current[bloque.id]
    if (!textarea) return

    let desde = textarea.selectionStart
    let hasta = textarea.selectionEnd

    if (desde === hasta && ultimasSeleccionesRef.current[bloque.id]) {
      const guardado = ultimasSeleccionesRef.current[bloque.id]
      desde = guardado.desde
      hasta = guardado.hasta
    }

    if (desde === hasta) return

    const tramosActuales = bloque.tramos ? [...bloque.tramos] : []

    const tramoExisteIdx = tramosActuales.findIndex((t) => t.desde === desde && t.hasta === hasta)
    if (tramoExisteIdx !== -1) {
      tramosActuales[tramoExisteIdx] = {
        ...tramosActuales[tramoExisteIdx],
        ...opciones
      }
    } else {
      tramosActuales.push({
        desde,
        hasta,
        ...opciones
      })
    }

    const nuevosBloques = [...guion.bloques]
    nuevosBloques[index] = {
      ...nuevosBloques[index],
      tramos: tramosActuales
    }

    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleAcotacion(index: number) {
    if (!guion.bloques || !guion.bloques[index]) return
    const bloque = guion.bloques[index]
    const textarea = textareaRefs.current[bloque.id]
    if (!textarea) return

    let desde = textarea.selectionStart
    let hasta = textarea.selectionEnd

    if (desde === hasta && ultimasSeleccionesRef.current[bloque.id]) {
      const guardado = ultimasSeleccionesRef.current[bloque.id]
      desde = guardado.desde
      hasta = guardado.hasta
    }

    const textoActual = bloque.texto || ''
    const textoSeleccionado = textoActual.substring(desde, hasta)

    const textoNuevo = textoActual.substring(0, desde) + `[${textoSeleccionado}]` + textoActual.substring(hasta)

    handleTextoBloqueChange(index, textoNuevo)
  }

  function handleSubirBloque(index: number) {
    if (!guion.bloques || index <= 0 || index >= guion.bloques.length) return
    const nuevosBloques = [...guion.bloques]
    const temp = nuevosBloques[index - 1]
    nuevosBloques[index - 1] = nuevosBloques[index]
    nuevosBloques[index] = temp
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleBajarBloque(index: number) {
    if (!guion.bloques || index < 0 || index >= guion.bloques.length - 1) return
    const nuevosBloques = [...guion.bloques]
    const temp = nuevosBloques[index + 1]
    nuevosBloques[index + 1] = nuevosBloques[index]
    nuevosBloques[index] = temp
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleBorrarBloque(index: number) {
    if (!guion.bloques || index < 0 || index >= guion.bloques.length) return
    const nuevosBloques = guion.bloques.filter((_, i) => i !== index)
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleTextareaSelect(bloqueId: string, target: HTMLTextAreaElement) {
    const tieneSeleccion = target.selectionStart !== target.selectionEnd
    setBloqueSeleccionado(bloqueId)
    setHayTextoSeleccionado(tieneSeleccion)
    if (tieneSeleccion) {
      ultimasSeleccionesRef.current[bloqueId] = {
        desde: target.selectionStart,
        hasta: target.selectionEnd
      }
    }
  }

  const numPalabras = contarPalabras(guion)
  const numMinutos = Math.round(numPalabras / 150)
  const resumenMeta = numPalabras === 0
    ? `${numPalabras.toLocaleString('es')} palabras`
    : `${numPalabras.toLocaleString('es')} palabras · ${numMinutos > 0 ? numMinutos : 1} min`

  useEffect(() => {
    if (onRegistrarCerrarModal) {
      onRegistrarCerrarModal(() => {
        if (mostrarModalAjustes) {
          setMostrarModalAjustes(false)
          return true
        }
        if (mostrarModalPegar) {
          setMostrarModalPegar(false)
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
  }, [mostrarModalAjustes, mostrarModalPegar, onRegistrarCerrarModal])

  const hayMasDeUnBloque = guion.bloques && guion.bloques.length > 1

  return (
    <div
      data-pantalla-direccion={dataPantallaDireccion}
      onAnimationEnd={onAnimationEnd}
      style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--aire-4) var(--aire-4) calc(100px + env(safe-area-inset-bottom, 0px)) var(--aire-4)', position: 'relative', ...style }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.docx"
        onChange={handleSeleccionarArchivo}
        style={{ display: 'none' }}
      />

      {/* Fila superior discreta: a la izquierda ‹ Guiones, a la derecha ⋯ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-4)' }}>
        <button
          onClick={onVolverBiblioteca}
          className="texto-meta"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-apagado)',
            cursor: 'pointer',
            padding: 0
          }}
        >
          ‹ Guiones
        </button>

        {/* Menu contextual superior ⋯ */}
        <div ref={refMenuOpciones} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              hapticaToqueSuave()
              setMenuOpcionesAbierto(!menuOpcionesAbierto)
            }}
            data-testid="btn-menu-opciones-editor"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 'var(--texto-display)',
              color: 'var(--color-texto)',
              padding: 'var(--aire-1) var(--aire-2)',
              cursor: 'pointer'
            }}
            title="Opciones"
          >
            ⋯
          </button>

          {menuOpcionesAbierto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'var(--bg-menu)',
                borderRadius: 'var(--redondeo)',
                zIndex: 50,
                minWidth: 180,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transformOrigin: 'top right',
                animation: movimientoApagado()
                  ? 'none'
                  : `menuCreceEsquina ${MS_CHICO}ms ${CURVA_RESORTE} forwards`
              }}
            >
              <div style={{ padding: 'var(--aire-2) var(--aire-4)', borderBottom: '1px solid var(--color-separador)' }}>
                <label className="texto-meta" style={{ display: 'block', color: 'var(--color-apagado)', marginBottom: 'var(--aire-1)' }}>
                  Idioma:
                </label>
                <select
                  value={guion.idioma || 'es'}
                  onChange={(e) => handleIdiomaChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--aire-1) var(--aire-2)',
                    fontSize: 'var(--texto-meta)',
                    borderRadius: 'var(--redondeo)',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--bg-suelo)',
                    color: 'var(--color-texto)'
                  }}
                >
                  <option value="es">Español (es)</option>
                  <option value="en">English (en)</option>
                  <option value="pt">Português (pt)</option>
                  <option value="fr">Français (fr)</option>
                  <option value="de">Deutsch (de)</option>
                  <option value="it">Italiano (it)</option>
                </select>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-separador)' }}>
                <button
                  onClick={() => {
                    setMenuOpcionesAbierto(false)
                    setErrorPegado(null)
                    setMostrarModalPegar(true)
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--aire-3) var(--aire-4)',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-texto)',
                    fontSize: 'var(--texto-cuerpo)',
                    cursor: 'pointer'
                  }}
                >
                  Pegar texto
                </button>

                <button
                  onClick={() => {
                    setMenuOpcionesAbierto(false)
                    fileInputRef.current?.click()
                  }}
                  disabled={cargandoArchivo}
                  style={{
                    width: '100%',
                    padding: 'var(--aire-3) var(--aire-4)',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-texto)',
                    fontSize: 'var(--texto-cuerpo)',
                    cursor: cargandoArchivo ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cargandoArchivo ? 'Leyendo archivo...' : 'Abrir archivo'}
                </button>
              </div>

              <button
                onClick={() => {
                  setMenuOpcionesAbierto(false)
                  setMostrarModalAjustes(true)
                }}
                style={{
                  padding: 'var(--aire-3) var(--aire-4)',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                Ajustes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Titulo es el titulo: Display, editable, sin etiqueta ni recuadro */}
      <div style={{ marginBottom: 'var(--aire-1)' }}>
        <input
          type="text"
          value={guion.titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          onFocus={() => setTituloEnfocado(true)}
          onBlur={() => setTituloEnfocado(false)}
          placeholder="Sin título"
          className="texto-display"
          data-testid="input-titulo-guion"
          style={{
            width: '100%',
            padding: 'var(--aire-1) var(--aire-2)',
            border: 'none',
            borderBottom: tituloEnfocado ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
            outline: 'none',
            backgroundColor: tituloEnfocado ? 'var(--bg-suelo)' : 'transparent',
            color: 'var(--color-texto)',
            boxSizing: 'border-box',
            borderRadius: 'var(--redondeo) var(--redondeo) 0 0',
            transition: 'border-color 0.2s, background-color 0.2s'
          }}
        />
      </div>

      {/* Resumen meta bajo el titulo */}
      <div className="texto-meta" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-4)' }}>
        {resumenMeta}
      </div>

      {/* Modal de Ajustes */}
      {mostrarModalAjustes && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--bg-suelo)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 'var(--aire-4)'
          }}
          onClick={() => setMostrarModalAjustes(false)}
        >
          <div
            data-testid="panel-ajustes"
            className="panel-superficie"
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--color-texto)',
              padding: 'var(--aire-4)',
              borderRadius: 'var(--redondeo)',
              maxWidth: 500,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              animation: movimientoApagado()
                ? 'none'
                : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-4)' }}>
              <h3 className="texto-titulo" style={{ margin: 0 }}>Ajustes</h3>
              <button
                onClick={() => setMostrarModalAjustes(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-titulo)',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-4)' }}>
              {/* Grupo 1: CÓMO SE VE EL TEXTO */}
              <div>
                <h4 className="texto-etiqueta" style={{ margin: '0 0 var(--aire-3) 0', color: 'var(--color-apagado)' }}>
                  Cómo se ve el texto
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
                  {/* Tamaño de letra */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Tamaño de letra:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)' }}>
                      <button
                        onClick={onLetraMenos}
                        aria-label="Disminuir letra panel"
                        style={{ padding: 'var(--aire-1) var(--aire-3)', fontSize: 'var(--texto-titulo)', cursor: 'pointer', borderRadius: 'var(--redondeo)', border: '1px solid var(--color-borde)', backgroundColor: 'var(--bg-suelo)', color: 'var(--color-texto)' }}
                      >
                        -
                      </button>
                      <span data-testid="valor-letra-panel" className="texto-cuerpo" style={{ fontWeight: 'bold', minWidth: 28, textAlign: 'center' }}>{fontSize}</span>
                      <button
                        onClick={onLetraMas}
                        aria-label="Aumentar letra panel"
                        style={{ padding: 'var(--aire-1) var(--aire-3)', fontSize: 'var(--texto-titulo)', cursor: 'pointer', borderRadius: 'var(--redondeo)', border: '1px solid var(--color-borde)', backgroundColor: 'var(--bg-suelo)', color: 'var(--color-texto)' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Ancho */}
                  {(setColumnaAngosta || setMarginPercent) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Ancho:</span>
                      <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setColumnaAngosta?.(false)
                            setMarginPercent?.(5)
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: (!columnaAngosta && marginPercent !== 12) ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: (!columnaAngosta && marginPercent !== 12) ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: (!columnaAngosta && marginPercent !== 12) ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Ancho
                        </button>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setColumnaAngosta?.(false)
                            setMarginPercent?.(12)
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: (!columnaAngosta && marginPercent === 12) ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: (!columnaAngosta && marginPercent === 12) ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: (!columnaAngosta && marginPercent === 12) ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Medio
                        </button>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setColumnaAngosta?.(true)
                            setMarginPercent?.(5)
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: columnaAngosta ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: columnaAngosta ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: columnaAngosta ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Angosto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tipografía */}
                  {setTipoFuente && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Tipografía:</span>
                      <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setTipoFuente('sans')
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: tipoFuente === 'sans' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: tipoFuente === 'sans' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: tipoFuente === 'sans' ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Sans
                        </button>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setTipoFuente('serif')
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: tipoFuente === 'serif' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: tipoFuente === 'serif' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: tipoFuente === 'serif' ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Serif
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grupo 2: LA TOMA */}
              <div>
                <h4 className="texto-etiqueta" style={{ margin: '0 0 var(--aire-3) 0', color: 'var(--color-apagado)' }}>
                  La toma
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
                  {/* Fondo y letra */}
                  {setColorFondo && setColorLetra && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Fondo y letra:</span>
                      <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
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
                              className="btn-deformable"
                              title={p.label}
                              onClick={() => {
                                hapticaSeleccion()
                                setColorFondo(p.fondo)
                                setColorLetra(p.letra)
                              }}
                              style={{
                                padding: 'var(--aire-1)',
                                border: activo ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
                                backgroundColor: 'var(--bg-suelo)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 'var(--aire-1)',
                                  backgroundColor: p.fondo,
                                  color: p.letra,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: 'var(--texto-meta)',
                                  border: '1px solid var(--color-borde)'
                                }}
                              >
                                Aa
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dónde lees */}
                  {setAnclajeZona && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Dónde lees:</span>
                      <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setAnclajeZona('arriba')
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: anclajeZona === 'arriba' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: anclajeZona === 'arriba' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: anclajeZona === 'arriba' ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Arriba
                        </button>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setAnclajeZona('medio')
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: anclajeZona === 'medio' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: anclajeZona === 'medio' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: anclajeZona === 'medio' ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Medio
                        </button>
                        <button
                          type="button"
                          className="btn-deformable"
                          onClick={() => {
                            hapticaSeleccion()
                            setAnclajeZona('abajo')
                          }}
                          style={{
                            padding: 'var(--aire-2) var(--aire-3)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: anclajeZona === 'abajo' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                            color: anclajeZona === 'abajo' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                            fontWeight: anclajeZona === 'abajo' ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          Abajo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Espejo */}
                  {setMirror && (
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Espejo:</span>
                      <input
                        type="checkbox"
                        checked={mirror}
                        onChange={(e) => {
                          hapticaToqueSuave()
                          setMirror(e.target.checked)
                        }}
                        style={{ width: 18, height: 18, accentColor: 'var(--color-acento)' }}
                      />
                    </label>
                  )}

                  {/* Mostrar tiempo */}
                  {setMostrarTiempo && (
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Mostrar tiempo:</span>
                      <input
                        type="checkbox"
                        checked={mostrarTiempo}
                        onChange={(e) => {
                          hapticaToqueSuave()
                          setMostrarTiempo(e.target.checked)
                        }}
                        style={{ width: 18, height: 18, accentColor: 'var(--color-acento)' }}
                      />
                    </label>
                  )}
                </div>
              </div>
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
          ⚠️ Error al abrir archivo: {errorArchivo}
        </div>
      )}

      {mostrarModalPegar && (
        <div
          style={{
            backgroundColor: 'var(--bg-superficie)',
            border: '1px solid var(--color-borde)',
            borderRadius: 'var(--redondeo)',
            padding: 'var(--aire-4)',
            marginBottom: 'var(--aire-4)',
            animation: movimientoApagado()
              ? 'none'
              : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
          }}
        >
          <h4 className="texto-titulo" style={{ margin: '0 0 var(--aire-2) 0', color: 'var(--color-texto)' }}>Pegar texto</h4>
          <p className="texto-cuerpo" style={{ margin: '0 0 var(--aire-3) 0', color: 'var(--color-apagado)' }}>
            Pega aquí el texto de tu guión. Se convertirá automáticamente en bloques y líneas con el formato adecuado.
          </p>
          <textarea
            value={textoPegado}
            onChange={(e) => {
              setTextoPegado(e.target.value)
              if (errorPegado) setErrorPegado(null)
            }}
            placeholder="Pega aquí el texto completo..."
            rows={8}
            style={{
              width: '100%',
              padding: 'var(--aire-2) var(--aire-3)',
              fontSize: 'var(--texto-cuerpo)',
              fontFamily: 'inherit',
              borderRadius: 'var(--redondeo)',
              border: '1px solid var(--color-borde)',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-texto)',
              boxSizing: 'border-box',
              marginBottom: 'var(--aire-2)'
            }}
          />
          {errorPegado && (
            <div
              style={{
                color: 'var(--color-grabando)',
                backgroundColor: 'var(--bg-suelo)',
                padding: 'var(--aire-2) var(--aire-3)',
                borderRadius: 'var(--redondeo)',
                marginBottom: 'var(--aire-3)',
                fontSize: 'var(--texto-cuerpo)',
                fontWeight: 'bold'
              }}
            >
              {errorPegado}
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--aire-2)', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancelarPegar}
              style={{
                padding: 'var(--aire-2) var(--aire-3)',
                backgroundColor: 'var(--bg-suelo)',
                border: 'none',
                borderRadius: 'var(--redondeo)',
                color: 'var(--color-texto)',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAceptarPegar}
              style={{
                padding: 'var(--aire-2) var(--aire-3)',
                backgroundColor: 'var(--bg-superficie)',
                color: 'var(--color-texto)',
                border: '1px solid var(--color-borde)',
                borderRadius: 'var(--redondeo)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Importar
            </button>
          </div>
        </div>
      )}

      {/* Bloques de Texto */}
      {(!guion.bloques || guion.bloques.length === 0) ? (
        <div
          style={{
            padding: 'var(--aire-5) 0',
            textAlign: 'center',
            marginBottom: 'var(--aire-4)'
          }}
        >
          <p className="texto-cuerpo" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-4)' }}>
            Este guión no tiene ningún texto.
          </p>
          <button
            onClick={handleAgregarBloque}
            style={{
              padding: 'var(--aire-2) var(--aire-4)',
              backgroundColor: 'var(--bg-superficie)',
              color: 'var(--color-texto)',
              border: '1px solid var(--color-borde)',
              borderRadius: 'var(--redondeo)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Agregar primer bloque
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
          {guion.bloques.map((bloque, index) => {
            const estaPlegado = !!plegados[bloque.id]
            const esSeleccionado = bloqueSeleccionado === bloque.id && hayTextoSeleccionado

            return (
              <div key={bloque.id || index} style={{ position: 'relative' }}>
                {/* Controles de bloque: SOLO SI HAY MÁS DE UN BLOQUE */}
                {hayMasDeUnBloque && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--aire-2)',
                      marginBottom: estaPlegado ? 0 : 'var(--aire-2)'
                    }}
                  >
                    <button
                      onClick={() => togglePlegado(bloque.id)}
                      style={{
                        padding: 'var(--aire-1) var(--aire-2)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--color-apagado)',
                        cursor: 'pointer',
                        fontSize: 'var(--texto-meta)'
                      }}
                      title={estaPlegado ? 'Desplegar bloque' : 'Plegar bloque'}
                    >
                      {estaPlegado ? '▶' : '▼'}
                    </button>

                    <span className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
                      Bloque #{index + 1}
                    </span>

                    <div style={{ display: 'flex', gap: 'var(--aire-1)', marginLeft: 'auto' }}>
                      <button
                        onClick={() => handleSubirBloque(index)}
                        disabled={index === 0}
                        style={{
                          padding: 'var(--aire-1) var(--aire-2)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-apagado)',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.3 : 1
                        }}
                        title="Subir bloque"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleBajarBloque(index)}
                        disabled={index === guion.bloques.length - 1}
                        style={{
                          padding: 'var(--aire-1) var(--aire-2)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-apagado)',
                          cursor: index === guion.bloques.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === guion.bloques.length - 1 ? 0.3 : 1
                        }}
                        title="Bajar bloque"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleBorrarBloque(index)}
                        style={{
                          padding: 'var(--aire-1) var(--aire-2)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-apagado)',
                          cursor: 'pointer'
                        }}
                        title="Borrar bloque"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {!estaPlegado && (
                  <div>
                    {/* Controles de formato: SOLO SI HAY TEXTO SELECCIONADO */}
                    {esSeleccionado && (
                      <div
                        data-testid={`barra-formato-${bloque.id}`}
                        style={{
                          display: 'flex',
                          gap: 'var(--aire-2)',
                          marginBottom: 'var(--aire-2)',
                          alignItems: 'center',
                          backgroundColor: 'var(--bg-superficie)',
                          padding: 'var(--aire-1) var(--aire-2)',
                          borderRadius: 'var(--redondeo)',
                          border: '1px solid var(--color-borde)'
                        }}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => aplicarFormatoEnSeleccion(index, { negrita: true })}
                          style={{
                            padding: 'var(--aire-1) var(--aire-2)',
                            fontWeight: 'bold',
                            borderRadius: 'var(--redondeo)',
                            border: '1px solid var(--color-borde)',
                            backgroundColor: 'var(--bg-suelo)',
                            color: 'var(--color-texto)',
                            cursor: 'pointer'
                          }}
                          title="Negrita"
                        >
                          N
                        </button>

                        <div style={{ display: 'flex', gap: 'var(--aire-1)', alignItems: 'center' }}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormatoEnSeleccion(index, { color: 'ambar' })}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 'var(--redondeo)',
                              border: '1px solid var(--color-borde)',
                              backgroundColor: COLORES_TRAMO.ambar,
                              cursor: 'pointer'
                            }}
                            title="Ámbar"
                            data-testid="btn-color-ambar"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormatoEnSeleccion(index, { color: 'celeste' })}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 'var(--redondeo)',
                              border: '1px solid var(--color-borde)',
                              backgroundColor: COLORES_TRAMO.celeste,
                              cursor: 'pointer'
                            }}
                            title="Celeste"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormatoEnSeleccion(index, { color: 'salvia' })}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 'var(--redondeo)',
                              border: '1px solid var(--color-borde)',
                              backgroundColor: COLORES_TRAMO.salvia,
                              cursor: 'pointer'
                            }}
                            title="Salvia"
                          />
                        </div>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleAcotacion(index)}
                          style={{
                            padding: 'var(--aire-1) var(--aire-2)',
                            borderRadius: 'var(--redondeo)',
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
                      </div>
                    )}

                    <textarea
                      ref={(el) => { textareaRefs.current[bloque.id] = el; ajustarAltoTextarea(el) }}
                      value={bloque.texto}
                      onChange={(e) => { handleTextoBloqueChange(index, e.target.value); ajustarAltoTextarea(e.target) }}
                      onSelect={(e) => handleTextareaSelect(bloque.id, e.currentTarget)}
                      onKeyUp={(e) => handleTextareaSelect(bloque.id, e.currentTarget)}
                      onMouseUp={(e) => handleTextareaSelect(bloque.id, e.currentTarget)}
                      placeholder="Escribe el texto..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: 0,
                        fontSize: 'var(--texto-titulo)',
                        lineHeight: 1.6,
                        fontFamily: '"Source Serif 4", serif',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--color-texto)',
                        boxSizing: 'border-box',
                        resize: 'none',
                        overflowY: 'hidden'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* AGREGAR BLOQUE CUANDO YA HAY BLOQUES.
              El unico boton para agregar estaba dentro de la pantalla vacia -"Agregar primer
              bloque"-, asi que en cuanto el guion tenia un bloque no habia manera de sumar
              otro. No era un texto de mas: era una funcion que faltaba desde la tarea 25. */}
          <button
            onClick={handleAgregarBloque}
            data-testid="btn-agregar-bloque"
            className="texto-cuerpo"
            style={{
              marginTop: 'var(--aire-4)',
              padding: 'var(--aire-2) var(--aire-3)',
              backgroundColor: 'transparent',
              color: 'var(--color-apagado)',
              border: '1px dashed var(--color-borde)',
              borderRadius: 'var(--redondeo)',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            + Agregar bloque
          </button>
        </div>
      )}

      {/* Botón de Leer en voz alta Fijo Abajo */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 100
        }}
      >
        <button
          onClick={onEntrarLectura}
          disabled={numPalabras === 0}
          data-testid="btn-leer-guion-fijo"
          style={{
            pointerEvents: 'auto',
            width: 'calc(100% - 32px)',
            maxWidth: 400,
            padding: 'var(--aire-3) var(--aire-4)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 600,
            backgroundColor: numPalabras === 0 ? 'var(--bg-superficie)' : 'var(--color-acento)',
            color: numPalabras === 0 ? 'var(--color-apagado)' : 'var(--color-texto-acento)',
            borderRadius: 'var(--redondeo-pildora)',
            cursor: numPalabras === 0 ? 'not-allowed' : 'pointer',
            opacity: numPalabras === 0 ? 0.7 : 1,
            border: '1px solid var(--color-borde)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--aire-2)'
          }}
        >
          {numPalabras === 0 ? '▶ Leer — Escribe algo para leer' : '▶ Leer'}
        </button>
      </div>
    </div>
  )
}
