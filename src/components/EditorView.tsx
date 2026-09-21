import React, { useEffect, useRef, useState } from 'react'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, Bloque, TramoFormato, contarPalabras, PAREJAS_COLOR, COLORES_TRAMO } from '../datos/modelo'
import { consolidarGuion } from '../datos/consolidar'
import { importarTexto } from '../datos/importar'
import { importarArchivo } from '../datos/importarArchivo'
import { IdMotor } from '../motor/MotorDeVoz'
import { hapticaSeleccion, hapticaToqueSuave } from '../haptica'
import { movimientoApagado, MS_DEDO, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_SALE, CURVA_RESORTE } from './movimiento'
import { IconoAtras } from './IconosApp'

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
  onEntrarLectura: (rect?: DOMRect) => void
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
  const [mostrarModalAjustes, setMostrarModalAjustes] = useState(false)
  const refAjustes = useCerrarAfuera(mostrarModalAjustes, () => setMostrarModalAjustes(false))
  const [mostrarModalPegar, setMostrarModalPegar] = useState(false)

  const [dragOffsetY, setDragOffsetY] = useState(0)
  const esArrastrandoModalRef = useRef(false)
  const dragStartYRef = useRef<number | null>(null)

  // Auto-consolidar guiones viejos con más de un bloque
  useEffect(() => {
    if (guion && guion.bloques && guion.bloques.length > 1) {
      const consolidado = consolidarGuion(guion)
      onChangeGuion(consolidado)
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
  const [textoPegado, setTextoPegado] = useState('')
  const [errorPegado, setErrorPegado] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const ultimasSeleccionesRef = useRef<Record<string, { desde: number; hasta: number }>>({})
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

    const textoAInsertar = nuevosBloques.map((b) => b.texto).join('\n\n')
    const b0 = (guion.bloques && guion.bloques[0])
      ? guion.bloques[0]
      : { id: generarIdBloque(), nombre: '', texto: '', tramos: [] }

    const textoExistente = b0.texto || ''
    const textoNuevo = !textoExistente.trim()
      ? textoAInsertar
      : textoExistente + '\n\n' + textoAInsertar

    onChangeGuion({
      ...guion,
      bloques: [{ ...b0, texto: textoNuevo }],
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

  function handleIdiomaChange(nuevoIdioma: string) {
    onChangeGuion({
      ...guion,
      idioma: nuevoIdioma,
      modificado: Date.now()
    })
  }

  function handleTextoChange(nuevoTexto: string) {
    const b0 = (guion.bloques && guion.bloques[0])
      ? guion.bloques[0]
      : { id: generarIdBloque(), nombre: '', texto: '', tramos: [] }

    const bloqueActualizado: Bloque = {
      ...b0,
      texto: nuevoTexto,
      tramos: reubicarTramos(b0.texto || '', nuevoTexto, b0.tramos || [])
    }

    onChangeGuion({
      ...guion,
      bloques: [bloqueActualizado],
      modificado: Date.now()
    })
  }

  function aplicarFormatoEnSeleccion(opciones: { negrita?: boolean; color?: 'ambar' | 'celeste' | 'salvia' }) {
    if (!guion.bloques || !guion.bloques[0]) return
    const bloque = guion.bloques[0]
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

    onChangeGuion({
      ...guion,
      bloques: [{ ...bloque, tramos: tramosActuales }],
      modificado: Date.now()
    })
  }

  function handleAcotacion() {
    if (!guion.bloques || !guion.bloques[0]) return
    const bloque = guion.bloques[0]
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

    handleTextoChange(textoNuevo)
  }

  function handleTextareaSelect(bloqueId: string, target: HTMLTextAreaElement) {
    const tieneSeleccion = target.selectionStart !== target.selectionEnd
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
        <button
          onClick={onVolverBiblioteca}
          className="texto-meta"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-apagado)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--aire-2)'
          }}
        >
          <IconoAtras tamano={20} />
          <span>Guiones</span>
        </button>

        <button
          onClick={() => {
            hapticaToqueSuave()
            setMostrarModalAjustes(true)
          }}
          data-testid="btn-menu-opciones-editor"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 'var(--texto-titulo)',
            fontWeight: 'bold',
            color: 'var(--color-texto)',
            padding: 'var(--aire-1) var(--aire-2)',
            cursor: 'pointer'
          }}
          title="Ajustes de lectura"
        >
          Aa
        </button>
      </div>

      {/* Titulo es el titulo: Display, editable, sin etiqueta ni recuadro */}
      <div style={{ marginBottom: 'var(--aire-2)' }}>
        <input
          type="text"
          value={guion.titulo === 'Sin título' ? '' : guion.titulo}
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
            paddingLeft: 'var(--aire-2)'
          }}
        >
          {resumenMeta}
        </div>
      )}

      {/* Modal de Ajustes: Hoja inferior */}
      {mostrarModalAjustes && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--velo-modal)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 200
          }}
          onClick={() => setMostrarModalAjustes(false)}
        >
          <div
            ref={refAjustes}
            data-testid="panel-ajustes"
            className="panel-superficie"
            onPointerDown={handleModalPointerDown}
            onPointerMove={handleModalPointerMove}
            onPointerUp={handleModalPointerUp}
            onPointerCancel={handleModalPointerUp}
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--color-texto)',
              padding: 'var(--aire-4)',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
              borderRadius: 'var(--redondeo-grande) var(--redondeo-grande) 0 0',
              maxWidth: 500,
              width: '100%',
              maxHeight: '86vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
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
              onPointerDown={handleAgarraderaPointerDown}
              onPointerMove={handleModalPointerMove}
              onPointerUp={handleModalPointerUp}
              onPointerCancel={handleModalPointerUp}
              style={{
                padding: 'var(--aire-2) 0 var(--aire-3) 0',
                margin: '0 auto',
                width: 120,
                display: 'flex',
                justifyContent: 'center',
                touchAction: 'none',
                cursor: 'grab'
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 'var(--redondeo-pildora)', backgroundColor: 'var(--color-borde)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-4)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--texto-titulo)', fontWeight: 600, color: 'var(--color-texto)' }}>Ajustes</h3>
              <button
                data-testid="btn-cerrar-ajustes"
                onClick={() => setMostrarModalAjustes(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Listo
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
                  {/* Colores de lectura */}
                  {setColorFondo && setColorLetra && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Colores de lectura:</span>
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

                  {/* Idioma */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="texto-cuerpo" style={{ fontWeight: 600 }}>Idioma:</span>
                    <select
                      value={guion.idioma || 'es'}
                      onChange={(e) => handleIdiomaChange(e.target.value)}
                      style={{
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
          <h4 style={{ margin: '0 0 var(--aire-2) 0', fontSize: 'var(--texto-titulo)', fontWeight: 600, color: 'var(--color-texto)' }}>Pegar texto</h4>
          <p className="texto-cuerpo" style={{ margin: '0 0 var(--aire-3) 0', color: 'var(--color-apagado)' }}>
            Pega aquí el texto de tu guión. Se convertirá automáticamente en líneas con el formato adecuado.
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

      {/* Hoja Única de Texto */}
      <div style={{ position: 'relative' }}>
        {/* Controles de formato: SOLO SI HAY TEXTO SELECCIONADO */}
        {hayTextoSeleccionado && (
          <div
            data-testid={`barra-formato-${bloqueUnico.id}`}
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
              onClick={() => aplicarFormatoEnSeleccion({ negrita: true })}
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
                onClick={() => aplicarFormatoEnSeleccion({ color: 'ambar' })}
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
                onClick={() => aplicarFormatoEnSeleccion({ color: 'celeste' })}
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
                onClick={() => aplicarFormatoEnSeleccion({ color: 'salvia' })}
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
              onClick={handleAcotacion}
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
          ref={(el) => { textareaRefs.current[bloqueUnico.id] = el; ajustarAltoTextarea(el) }}
          value={bloqueUnico.texto}
          onChange={(e) => {
            handleTextoChange(e.target.value)
            ajustarAltoTextarea(e.target)
          }}
          onSelect={(e) => handleTextareaSelect(bloqueUnico.id, e.currentTarget)}
          onKeyUp={(e) => handleTextareaSelect(bloqueUnico.id, e.currentTarget)}
          onMouseUp={(e) => handleTextareaSelect(bloqueUnico.id, e.currentTarget)}
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
            onClick={() => {
              setErrorPegado(null)
              setMostrarModalPegar(true)
            }}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              maxWidth: 200,
              padding: 'var(--aire-3) var(--aire-4)',
              fontSize: 'var(--texto-cuerpo)',
              fontWeight: 600,
              backgroundColor: 'var(--bg-fila)',
              color: 'var(--color-texto)',
              borderRadius: 'var(--redondeo-pildora)',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            Pegar texto
          </button>
          <button
            data-testid="btn-abrir-archivo"
            onClick={() => fileInputRef.current?.click()}
            disabled={cargandoArchivo}
            style={{
              pointerEvents: 'auto',
              flex: 1,
              maxWidth: 200,
              padding: 'var(--aire-3) var(--aire-4)',
              fontSize: 'var(--texto-cuerpo)',
              fontWeight: 600,
              backgroundColor: 'var(--bg-fila)',
              color: 'var(--color-texto)',
              borderRadius: 'var(--redondeo-pildora)',
              cursor: cargandoArchivo ? 'not-allowed' : 'pointer',
              border: 'none'
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
            pointerEvents: 'none',
            zIndex: 100
          }}
        >
          <button
            ref={btnLeerRef}
            onClick={() => {
              const rect = btnLeerRef.current?.getBoundingClientRect()
              onEntrarLectura(rect)
            }}
            data-testid="btn-leer-guion-fijo"
            style={{
              pointerEvents: 'auto',
              width: 'calc(100% - 32px)',
              maxWidth: 400,
              padding: 'var(--aire-4)',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 600,
              backgroundColor: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              borderRadius: 'var(--redondeo-pildora)',
              cursor: 'pointer',
              border: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-2)',
              transform: barraLeerVisible ? 'translateY(0)' : 'translateY(120px)',
              transition: movimientoApagado()
                ? 'none'
                : barraLeerVisible
                ? `transform ${MS_CHICO}ms ${CURVA_RESORTE}`
                : `transform ${MS_DEDO}ms ${CURVA_SALE}`
            }}
          >
            ▶ Leer
          </button>
        </div>
      )}
    </div>
  )
}
