import React, { useEffect, useRef, useState } from 'react'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, ResumenGuion, ResumenGrabacion, PAREJAS_COLOR } from '../datos/modelo'
import TiraGrabaciones from './TiraGrabaciones'
import { IdMotor } from '../motor/MotorDeVoz'
import { PanelCorpus } from './PanelCorpus'
import TarjetaLectura from './TarjetaLectura'
import { IconoEngranaje } from './IconosApp'
import { vibracionHabilitada, guardarVibracionHabilitada, hapticaToqueSuave } from '../haptica'
import { movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_NORMAL, CURVA_RESORTE } from './movimiento'
import { MS_MANTENER_APRETADO } from './mantenerApretado'

interface BibliotecaViewProps {
  guiones: ResumenGuion[]
  onAbrir: (id: string) => void
  onLeerDirecto?: (id: string, rect?: DOMRect) => void
  onGrabarDirecto?: (id: string, rect?: DOMRect) => void
  onCrearNuevo: () => void
  onImportarArchivo: (file: File) => void
  onRenombrar?: (id: string, nuevoTitulo: string) => void
  onBorrar: (id: string) => void
  onArchivar: (id: string, archivado: boolean) => void
  onBuscarGuionCompleto?: (id: string) => Promise<Guion | null>
  onToggleDiagnostico?: () => void
  medirLectura?: boolean
  setMedirLectura?: (medir: boolean) => void
  engine?: IdMotor
  setEngine?: (engine: IdMotor) => void
  verTranscripcion?: boolean
  setVerTranscripcion?: (ver: boolean) => void
  tema?: 'sistema' | 'claro' | 'oscuro'
  setTema?: (tema: 'sistema' | 'claro' | 'oscuro') => void
  tipoFuente?: 'sans' | 'serif'
  colorFondo?: string
  colorLetra?: string
  onRegistrarCerrarModal?: (fn: (() => boolean) | null) => void
  // LA TIRA DE GRABACIONES vive aca, debajo de los guiones, y no en una
  // pantalla aparte: el video al lado del guion que lo produjo.
  grabaciones?: ResumenGrabacion[]
  onAbrirGrabacion?: (g: ResumenGrabacion) => void
  onBorrarGrabacion?: (id: string) => void
  'data-pantalla-direccion'?: string
  style?: React.CSSProperties
  onAnimationEnd?: (e: React.AnimationEvent) => void
}

export function formatearFechaNatural(timestamp: number): string {
  if (!timestamp) return ''
  const ahora = new Date()
  const fecha = new Date(timestamp)

  const inicioAhora = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()
  const diffDias = Math.round((inicioAhora - inicioFecha) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return 'hoy'
  if (diffDias === 1) return 'ayer'
  if (diffDias > 1 && diffDias <= 6) return `hace ${diffDias} días`
  if (diffDias > 6 && diffDias <= 13) return 'hace 1 semana'
  if (diffDias > 13 && diffDias <= 27) return `hace ${Math.floor(diffDias / 7)} semanas`

  const dia = fecha.getDate()
  const mes = fecha.getMonth() + 1
  return `${dia}/${mes}`
}

export function calcularMinutosLectura(guiones: ResumenGuion[]): number {
  const totalPalabras = guiones.reduce((acc, g) => acc + (g.palabras || 0), 0)
  return Math.round(totalPalabras / 150)
}

export function formatearTextoResumen(guiones: ResumenGuion[]): string {
  const minsLectura = calcularMinutosLectura(guiones)
  if (guiones.length === 0) return '0 guiones'
  return `${guiones.length} ${guiones.length === 1 ? 'guión' : 'guiones'} · ${minsLectura} ${minsLectura === 1 ? 'minuto' : 'minutos'} de lectura`
}

let esPrimerMontajeBiblioteca = true

export function resetearPrimerMontajeBiblioteca() {
  esPrimerMontajeBiblioteca = true
}

interface FilaGuionProps {
  g: ResumenGuion
  index: number
  onAbrir: (id: string) => void
  onBorrar: (id: string) => void
  onArchivar: (id: string, archivado: boolean) => void
  menuId: string | null
  setMenuId: (id: string | null) => void
  refMenuFila: React.RefObject<HTMLDivElement>
}

function FilaGuion({
  g,
  index,
  onAbrir,
  onBorrar,
  onArchivar,
  menuId,
  setMenuId,
  refMenuFila
}: FilaGuionProps) {
  const [dragX, setDragX] = useState(0)
  const esArrastrandoRef = useRef(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const decidioDireccionRef = useRef(false)
  const esHorizontalRef = useRef(false)
  const cruzoUmbralRef = useRef(false)
  const timerHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressRef = useRef(false)

  function obtenerPosicion(e: React.SyntheticEvent): { x: number; y: number } {
    const native = e.nativeEvent as any
    if ('touches' in e && (e as any).touches && (e as any).touches.length > 0) {
      return { x: (e as any).touches[0].clientX, y: (e as any).touches[0].clientY }
    }
    const x = typeof (e as any).clientX === 'number' && !isNaN((e as any).clientX) ? (e as any).clientX : native?.clientX ?? 0
    const y = typeof (e as any).clientY === 'number' && !isNaN((e as any).clientY) ? (e as any).clientY : native?.clientY ?? 0
    return { x, y }
  }

  function handlePointerDown(e: React.SyntheticEvent) {
    if ((e.target as HTMLElement).closest('[data-testid^="menu-opciones-"]')) return

    const { x, y } = obtenerPosicion(e)
    startXRef.current = x
    startYRef.current = y
    decidioDireccionRef.current = false
    esHorizontalRef.current = false
    cruzoUmbralRef.current = false
    esArrastrandoRef.current = true

    fueLongPressRef.current = false
    if (timerHoldRef.current) clearTimeout(timerHoldRef.current)
    timerHoldRef.current = setTimeout(() => {
      fueLongPressRef.current = true
      hapticaToqueSuave()
      setMenuId(g.id)
    }, MS_MANTENER_APRETADO)

    const target = e.currentTarget as any
    if (target && typeof target.setPointerCapture === 'function' && 'pointerId' in e) {
      try { target.setPointerCapture((e as any).pointerId) } catch (err) {}
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!esArrastrandoRef.current || startXRef.current === null || startYRef.current === null) return

    const { x, y } = obtenerPosicion(e)
    const dx = x - startXRef.current
    const dy = y - startYRef.current

    if (!decidioDireccionRef.current) {
      const dist = Math.hypot(dx, dy)
      if (dist >= 10) {
        decidioDireccionRef.current = true
        if (Math.abs(dy) > Math.abs(dx)) {
          if (timerHoldRef.current) clearTimeout(timerHoldRef.current)
          esHorizontalRef.current = false
          return
        } else {
          if (timerHoldRef.current) clearTimeout(timerHoldRef.current)
          esHorizontalRef.current = true
        }
      } else {
        return
      }
    }

    if (esHorizontalRef.current) {
      if (timerHoldRef.current) clearTimeout(timerHoldRef.current)
      setDragX(dx)

      if (Math.abs(dx) >= 88 && !cruzoUmbralRef.current) {
        cruzoUmbralRef.current = true
        hapticaToqueSuave()
      }
    }
  }

  function handlePointerUp(e: React.SyntheticEvent) {
    if (timerHoldRef.current) {
      clearTimeout(timerHoldRef.current)
      timerHoldRef.current = null
    }

    const target = e.currentTarget as any
    if (target && typeof target.releasePointerCapture === 'function' && 'pointerId' in e) {
      try { target.releasePointerCapture((e as any).pointerId) } catch (err) {}
    }

    const { x, y } = obtenerPosicion(e)
    const dx = startXRef.current !== null ? x - startXRef.current : 0
    const dy = startYRef.current !== null ? y - startYRef.current : 0

    if (esArrastrandoRef.current && esHorizontalRef.current) {
      if (dragX < -88 || dx < -88) {
        setDragX(0)
        onBorrar(g.id)
      } else if (dragX > 88 || dx > 88) {
        setDragX(0)
        onArchivar(g.id, !g.archivado)
      } else {
        setDragX(0)
      }
    } else if (!fueLongPressRef.current && !esHorizontalRef.current) {
      if (Math.hypot(dx, dy) < 10) {
        hapticaToqueSuave()
        onAbrir(g.id)
      }
    }

    esArrastrandoRef.current = false
    startXRef.current = null
    startYRef.current = null
    decidioDireccionRef.current = false
    esHorizontalRef.current = false
    cruzoUmbralRef.current = false
  }

  const tituloMostrar = (g.titulo && g.titulo.trim()) ? g.titulo : 'Sin título'
  const mins = Math.max(1, Math.round((g.palabras || 0) / 150))
  const fechaNat = formatearFechaNatural(g.modificado)
  const metaTexto = `${mins} min · ${fechaNat}`

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--redondeo)',
        marginBottom: 'var(--aire-2)',
        overflow: 'hidden'
      }}
    >
      {/* Fondo revelado según la dirección del deslizamiento al superar el umbral */}
      {dragX <= -88 && (
        <div
          data-testid={`accion-revelada-borrar-${g.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--color-grabando)',
            color: 'var(--color-texto)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 'var(--aire-4)',
            fontWeight: 'bold',
            fontSize: 'var(--texto-cuerpo)',
            borderRadius: 'var(--redondeo)'
          }}
        >
          Borrar
        </div>
      )}
      {dragX >= 88 && (
        <div
          data-testid={`accion-revelada-archivar-${g.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--bg-menu)',
            color: 'var(--color-texto)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 'var(--aire-4)',
            fontWeight: 'bold',
            fontSize: 'var(--texto-cuerpo)',
            borderRadius: 'var(--redondeo)'
          }}
        >
          {g.archivado ? 'Desarchivar' : 'Archivar'}
        </div>
      )}

      {/* Fila en primer plano */}
      <div
        data-testid={`fila-guion-${g.id}`}
        onClick={(e) => {
          if (!fueLongPressRef.current && !esHorizontalRef.current) {
            hapticaToqueSuave()
            onAbrir(g.id)
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuId(g.id)
        }}
        style={{
          position: 'relative',
          zIndex: 2,
          padding: 'var(--aire-3) var(--aire-3)',
          backgroundColor: 'var(--bg-fila)',
          borderRadius: 'var(--redondeo)',
          cursor: 'pointer',
          userSelect: 'none',
          transform: `translateX(${dragX}px)`,
          transition: esArrastrandoRef.current
            ? 'none'
            : movimientoApagado()
            ? 'none'
            : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`
        }}
      >
        <div>
          <div className="texto-titulo" style={{ color: 'var(--color-texto)', marginBottom: 'var(--aire-1)' }}>
            {tituloMostrar} {g.archivado && <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)' }}>(Archivado)</span>}
          </div>
          <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
            {metaTexto}
          </div>
        </div>

        {menuId === g.id && (
          <div
            ref={refMenuFila}
            data-testid={`menu-opciones-${g.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 'var(--aire-2)',
              paddingTop: 'var(--aire-2)',
              display: 'flex',
              gap: 'var(--aire-2)',
              justifyContent: 'flex-start'
            }}
          >
            <button
              onClick={() => {
                onArchivar(g.id, !g.archivado)
                setMenuId(null)
              }}
              style={{
                padding: 'var(--aire-2) var(--aire-3)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)',
                border: 'none',
                borderRadius: 'var(--redondeo)',
                cursor: 'pointer',
                fontSize: 'var(--texto-meta)'
              }}
            >
              {g.archivado ? 'Desarchivar' : 'Archivar'}
            </button>
            <button
              onClick={() => {
                onBorrar(g.id)
                setMenuId(null)
              }}
              style={{
                padding: 'var(--aire-2) var(--aire-3)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)',
                border: 'none',
                borderRadius: 'var(--redondeo)',
                cursor: 'pointer',
                fontSize: 'var(--texto-meta)'
              }}
            >
              Eliminar
            </button>
            <button
              onClick={() => setMenuId(null)}
              style={{
                padding: 'var(--aire-2) var(--aire-3)',
                backgroundColor: 'transparent',
                color: 'var(--color-apagado)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--texto-meta)'
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BibliotecaView({
  guiones,
  onAbrir,
  onLeerDirecto,
  onGrabarDirecto,
  onCrearNuevo,
  onImportarArchivo,
  onRenombrar,
  onBorrar,
  onArchivar,
  onBuscarGuionCompleto,
  onToggleDiagnostico,
  medirLectura = true,
  setMedirLectura = () => {},
  engine = 'vosk',
  setEngine,
  verTranscripcion = false,
  setVerTranscripcion,
  tema = 'claro',
  setTema,
  tipoFuente = 'sans',
  colorFondo = PAREJAS_COLOR[0].fondo,
  colorLetra = PAREJAS_COLOR[0].letra,
  onRegistrarCerrarModal,
  grabaciones = [],
  onAbrirGrabacion,
  onBorrarGrabacion,
  'data-pantalla-direccion': dataPantallaDireccion,
  style,
  onAnimationEnd
}: BibliotecaViewProps) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarArchivados, setMostrarArchivados] = useState(false)
  const [mostrarPanelCorpus, setMostrarPanelCorpus] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuSuperiorAbierto, setMenuSuperiorAbierto] = useState(false)
  const [vibracion, setVibracion] = useState<boolean>(vibracionHabilitada())
  // se cierra tocando afuera o con Escape, no solo con el mismo boton
  const refMenuSuperior = useCerrarAfuera(menuSuperiorAbierto, () => setMenuSuperiorAbierto(false))
  // el menu de cada fila, que se abre con toque largo, se cierra igual que los demas
  const refMenuFila = useCerrarAfuera(menuId !== null, () => setMenuId(null))
  const [mapaTextos, setMapaTextos] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [esInicial, setEsInicial] = useState<boolean>(esPrimerMontajeBiblioteca)

  const guionMasReciente = guiones.length > 0 ? guiones[0] : undefined
  const [textoTarjeta, setTextoTarjeta] = useState<string>('')

  useEffect(() => {
    if (!guionMasReciente || !onBuscarGuionCompleto) {
      setTextoTarjeta('')
      return
    }
    let cancelado = false
    onBuscarGuionCompleto(guionMasReciente.id).then((g) => {
      if (cancelado) return
      const t = g && g.bloques ? g.bloques.map((b) => b.texto || '').join('\n') : ''
      setTextoTarjeta(t)
    })
    return () => {
      cancelado = true
    }
  }, [guionMasReciente?.id, onBuscarGuionCompleto])

  useEffect(() => {
    if (esPrimerMontajeBiblioteca) {
      esPrimerMontajeBiblioteca = false
    }
  }, [])

  const timerHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressRef = useRef<boolean>(false)

  const timerDiagRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressDiagRef = useRef<boolean>(false)

  const hayMasDeOcho = guiones.length > 8

  useEffect(() => {
    const query = busqueda.toLowerCase().trim()
    if (!query || !onBuscarGuionCompleto) return

    let cancelado = false

    const idsFaltantes = guiones.filter((g) => !(g.id in mapaTextos)).map((g) => g.id)

    if (idsFaltantes.length > 0) {
      Promise.all(
        idsFaltantes.map(async (id) => {
          const g = await onBuscarGuionCompleto(id)
          const texto = g && g.bloques ? g.bloques.map((b) => b.texto || '').join(' ') : ''
          return { id, texto }
        })
      ).then((resultados) => {
        if (cancelado) return
        setMapaTextos((prev) => {
          const nuevo = { ...prev }
          for (const res of resultados) {
            nuevo[res.id] = res.texto
          }
          return nuevo
        })
      })
    }

    return () => {
      cancelado = true
    }
  }, [busqueda, guiones, onBuscarGuionCompleto, mapaTextos])

  const guionesFiltrados = guiones.filter((g) => {
    const query = busqueda.toLowerCase().trim()
    const tituloNormalizado = (g.titulo || 'Sin título').toLowerCase()
    const textoNormalizado = (mapaTextos[g.id] || '').toLowerCase()

    const coincideBusqueda = query === '' || tituloNormalizado.includes(query) || textoNormalizado.includes(query)

    if (query !== '') {
      return coincideBusqueda
    }

    if (mostrarArchivados) {
      return Boolean(g.archivado)
    }

    return !g.archivado
  })

  function handleTouchStart(id: string) {
    fueLongPressRef.current = false
    if (timerHoldRef.current) clearTimeout(timerHoldRef.current)
    timerHoldRef.current = setTimeout(() => {
      fueLongPressRef.current = true
      setMenuId(id)
    }, 500)
  }

  function handleTouchEnd() {
    if (timerHoldRef.current) {
      clearTimeout(timerHoldRef.current)
      timerHoldRef.current = null
    }
  }

  function handleRowClick(g: ResumenGuion) {
    if (fueLongPressRef.current) {
      fueLongPressRef.current = false
      return
    }
    hapticaToqueSuave()
    onAbrir(g.id)
  }

  function handleContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault()
    setMenuId(id)
  }

  function handleClicImportar() {
    setMenuSuperiorAbierto(false)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onImportarArchivo(file)
      e.target.value = ''
    }
  }

  // Toque largo sobre el resumen para alternar diagnostico
  function handleDiagTouchStart() {
    fueLongPressDiagRef.current = false
    if (timerDiagRef.current) clearTimeout(timerDiagRef.current)
    timerDiagRef.current = setTimeout(() => {
      fueLongPressDiagRef.current = true
      if (onToggleDiagnostico) onToggleDiagnostico()
    }, 500)
  }

  function handleDiagTouchEnd() {
    if (timerDiagRef.current) {
      clearTimeout(timerDiagRef.current)
      timerDiagRef.current = null
    }
  }

  function handleDiagClick() {
    if (fueLongPressDiagRef.current) {
      fueLongPressDiagRef.current = false
      return
    }
    if (onToggleDiagnostico) onToggleDiagnostico()
  }

  useEffect(() => {
    if (onRegistrarCerrarModal) {
      onRegistrarCerrarModal(() => {
        if (mostrarPanelCorpus) {
          setMostrarPanelCorpus(false)
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
  }, [mostrarPanelCorpus, onRegistrarCerrarModal])

  const minsLectura = calcularMinutosLectura(guiones)
  const textoResumen = guiones.length === 0
    ? '0 guiones'
    : `${guiones.length} ${guiones.length === 1 ? 'guión' : 'guiones'} · ${minsLectura} ${minsLectura === 1 ? 'minuto' : 'minutos'} de lectura`

  const animacionTituloStyle: React.CSSProperties = (esInicial && !movimientoApagado())
    ? {
        animation: `pantallaEntraInicial ${MS_PANTALLA}ms ${CURVA_ENTRA} forwards`,
        animationDelay: '0ms'
      }
    : {}

  const animacionSubtituloStyle: React.CSSProperties = (esInicial && !movimientoApagado())
    ? {
        animation: `pantallaEntraInicial ${MS_PANTALLA}ms ${CURVA_ENTRA} forwards`,
        animationDelay: '40ms'
      }
    : {}

  const animacionListaStyle: React.CSSProperties = (esInicial && !movimientoApagado())
    ? {
        animation: `pantallaEntraInicial ${MS_PANTALLA}ms ${CURVA_ENTRA} forwards`,
        animationDelay: '80ms'
      }
    : {}

  return (
    <div
      data-pantalla-direccion={dataPantallaDireccion}
      onAnimationEnd={onAnimationEnd}
      style={{ padding: 'var(--aire-4)', maxWidth: 800, margin: '0 auto', position: 'relative', minHeight: '80vh', ...style }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="input-importar-archivo"
      />

      {/* Tarjeta de Portada y Menú Superior */}
      <div style={{ position: 'relative', marginBottom: 'var(--aire-4)', ...animacionTituloStyle }}>
        <TarjetaLectura
          guionResumen={guionMasReciente}
          textoCompleto={textoTarjeta}
          esInicial={esInicial}
          onLeer={(rect) => {
            if (guionMasReciente) {
              if (onLeerDirecto) onLeerDirecto(guionMasReciente.id, rect)
              else onAbrir(guionMasReciente.id)
            }
          }}
          onGrabar={(rect) => {
            if (guionMasReciente && onGrabarDirecto) onGrabarDirecto(guionMasReciente.id, rect)
          }}
          onCrearNuevo={onCrearNuevo}
          onDiagTouchStart={handleDiagTouchStart}
          onDiagTouchEnd={handleDiagTouchEnd}
          onDiagClick={handleDiagClick}
          tipoFuente={tipoFuente}
          colorFondo={colorFondo}
          colorLetra={colorLetra}
        />

        {/* Menú superior derecho ⋯ flotante sobre la tarjeta */}
        <div ref={refMenuSuperior} style={{ position: 'absolute', top: 'var(--aire-2)', right: 'var(--aire-2)', zIndex: 20 }}>
          <button
            onClick={() => {
              hapticaToqueSuave()
              setMenuSuperiorAbierto(!menuSuperiorAbierto)
            }}
            data-testid="btn-menu-superior-biblioteca"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 'var(--texto-display)',
              color: 'var(--color-texto)',
              padding: 'var(--aire-1) var(--aire-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Ajustes de la app"
            aria-label="Ajustes de la app"
          >
            <IconoEngranaje />
          </button>

          {menuSuperiorAbierto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'var(--bg-menu)',
                borderRadius: 'var(--redondeo)',
                zIndex: 50,
                minWidth: 160,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transformOrigin: 'top right',
                animation: movimientoApagado()
                  ? 'none'
                  : `menuCreceEsquina ${MS_CHICO}ms ${CURVA_RESORTE} forwards`
              }}
            >
              <button
                onClick={() => {
                  setMostrarArchivados(!mostrarArchivados)
                  setMenuSuperiorAbierto(false)
                }}
                style={{
                  padding: 'var(--aire-3) var(--aire-4)',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-separador)',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                {mostrarArchivados ? 'Ver Principales' : 'Ver Archivados'}
              </button>
              <button
                onClick={handleClicImportar}
                style={{
                  padding: 'var(--aire-3) var(--aire-4)',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-borde)',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                Importar archivo
              </button>

              <div className="texto-meta" style={{ padding: 'var(--aire-2) var(--aire-4) 0', color: 'var(--color-apagado)', fontWeight: 600 }}>
                Lo nuestro
              </div>
              <div style={{ padding: 'var(--aire-2) var(--aire-4)', borderBottom: '1px solid var(--color-separador)' }}>
                <label className="texto-meta" style={{ display: 'block', color: 'var(--color-apagado)', marginBottom: 'var(--aire-1)' }}>
                  Motor de voz:
                  <select
                    aria-label="Motor de Voz"
                    value={engine}
                    onChange={(e) => setEngine?.(e.target.value as IdMotor)}
                    style={{
                      width: '100%',
                      marginTop: 'var(--aire-1)',
                      padding: 'var(--aire-1) var(--aire-2)',
                      fontSize: 'var(--texto-meta)',
                      borderRadius: 'var(--redondeo)',
                      border: '1px solid var(--color-borde)',
                      backgroundColor: 'var(--bg-suelo)',
                      color: 'var(--color-texto)'
                    }}
                  >
                    <option value="vosk">Vosk (Offline)</option>
                    <option value="nativo">Nativo</option>
                  </select>
                </label>
              </div>

              <div className="texto-meta" style={{ padding: 'var(--aire-2) var(--aire-4) 0', color: 'var(--color-apagado)', fontWeight: 600 }}>
                La aplicación
              </div>
              <div style={{ padding: 'var(--aire-2) var(--aire-4)', borderBottom: '1px solid var(--color-separador)' }}>
                <label className="texto-meta" style={{ display: 'block', color: 'var(--color-apagado)', marginBottom: 'var(--aire-1)' }}>
                  Apariencia:
                </label>
                <div style={{ display: 'flex', gap: 'var(--aire-2)' }}>
                  <button
                    type="button"
                    onClick={() => setTema?.('sistema')}
                    style={{
                      padding: 'var(--aire-1) var(--aire-2)',
                      fontSize: 'var(--texto-meta)',
                      borderRadius: 'var(--redondeo)',
                      border: '1px solid var(--color-borde)',
                      backgroundColor: tema === 'sistema' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                      color: tema === 'sistema' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                      fontWeight: tema === 'sistema' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Sistema
                  </button>
                  <button
                    type="button"
                    onClick={() => setTema?.('claro')}
                    style={{
                      padding: 'var(--aire-1) var(--aire-2)',
                      fontSize: 'var(--texto-meta)',
                      borderRadius: 'var(--redondeo)',
                      border: '1px solid var(--color-borde)',
                      backgroundColor: tema === 'claro' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                      color: tema === 'claro' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                      fontWeight: tema === 'claro' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTema?.('oscuro')}
                    style={{
                      padding: 'var(--aire-1) var(--aire-2)',
                      fontSize: 'var(--texto-meta)',
                      borderRadius: 'var(--redondeo)',
                      border: '1px solid var(--color-borde)',
                      backgroundColor: tema === 'oscuro' ? 'var(--color-acento)' : 'var(--bg-suelo)',
                      color: tema === 'oscuro' ? 'var(--color-texto-acento)' : 'var(--color-texto)',
                      fontWeight: tema === 'oscuro' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Oscuro
                  </button>
                </div>
              </div>

              <div style={{ padding: 'var(--aire-2) var(--aire-4)', borderBottom: '1px solid var(--color-separador)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 'var(--texto-meta)', color: 'var(--color-texto)' }}>
                  <span>Ver transcripción en vivo</span>
                  <input
                    type="checkbox"
                    checked={verTranscripcion}
                    onChange={(e) => {
                      hapticaToqueSuave()
                      setVerTranscripcion?.(e.target.checked)
                    }}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-acento)' }}
                  />
                </label>
              </div>

              <div style={{ padding: 'var(--aire-2) var(--aire-4)', borderBottom: '1px solid var(--color-separador)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 'var(--texto-meta)', color: 'var(--color-texto)' }}>
                  <span>Vibración</span>
                  <input
                    type="checkbox"
                    checked={vibracion}
                    onChange={(e) => {
                      setVibracion(e.target.checked)
                      guardarVibracionHabilitada(e.target.checked)
                      hapticaToqueSuave()
                    }}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-acento)' }}
                  />
                </label>
              </div>

              <button
                data-testid="btn-abrir-corpus"
                onClick={() => {
                  setMostrarPanelCorpus(true)
                  setMenuSuperiorAbierto(false)
                }}
                style={{
                  padding: 'var(--aire-3) var(--aire-4)',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-separador)',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                Medición / Panel Corpus
              </button>

            </div>
          )}
        </div>
      </div>

      {/* Buscador: sin borde, fondo bg-suelo y redondeo */}
      {hayMasDeOcho && (
        <div style={{ marginBottom: 'var(--aire-4)' }}>
          <input
            type="text"
            placeholder="Buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid="input-busqueda-biblioteca"
            style={{
              width: '100%',
              padding: 'var(--aire-3) var(--aire-4)',
              fontSize: 'var(--texto-cuerpo)',
              borderRadius: 'var(--redondeo)',
              border: 'none',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-texto)',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* Los dos titulos de biblioteca -este y "Videos"- van en el mismo
          escalon de la escala y con el mismo peso: son hermanos, no uno
          principal y otro al pie. Javier los pidio mas grandes el 21 de
          septiembre de 2026; texto-cuerpo es el escalon que sigue a
          texto-meta, no un numero inventado. */}
      <div className="texto-cuerpo" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-2)', fontWeight: 600 }}>Guiones</div>

      {/* Lista de guiones o Vacío */}
      {guiones.length === 0 ? (
        <div
          data-testid="lista-guiones-biblioteca"
          data-retardo-escalonado={esInicial && !movimientoApagado() ? 80 : 0}
          style={{ textAlign: 'center', padding: 'var(--aire-5) 0', ...animacionListaStyle }}
        >
        </div>
      ) : guionesFiltrados.length === 0 ? (
        <div
          data-testid="lista-guiones-biblioteca"
          data-retardo-escalonado={esInicial && !movimientoApagado() ? 80 : 0}
          style={{ padding: 'var(--aire-4)', textAlign: 'center', color: 'var(--color-apagado)', ...animacionListaStyle }}
          className="texto-meta"
        >
          {busqueda.trim()
            ? `No se encontraron guiones que coincidan con "${busqueda}".`
            : mostrarArchivados
            ? 'No hay guiones archivados.'
            : 'No hay guiones en la lista principal.'}
        </div>
      ) : (
        <div
          data-testid="lista-guiones-biblioteca"
          data-retardo-escalonado={esInicial && !movimientoApagado() ? 80 : 0}
          style={{ display: 'flex', flexDirection: 'column', ...animacionListaStyle }}
        >
          {guionesFiltrados.map((g, index) => (
            <FilaGuion
              key={g.id}
              g={g}
              index={index}
              onAbrir={onAbrir}
              onBorrar={onBorrar}
              onArchivar={onArchivar}
              menuId={menuId}
              setMenuId={setMenuId}
              refMenuFila={refMenuFila}
            />
          ))}
        </div>
      )}

      {onAbrirGrabacion && onBorrarGrabacion && (
        <TiraGrabaciones
          grabaciones={grabaciones}
          onAbrir={onAbrirGrabacion}
          onBorrar={onBorrarGrabacion}
        />
      )}

      {/* Modal de PanelCorpus */}
      {mostrarPanelCorpus && (
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
          onClick={() => setMostrarPanelCorpus(false)}
        >
          <div
            className="panel-superficie"
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--color-texto)',
              padding: 'var(--aire-4)',
              borderRadius: 'var(--redondeo)',
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              animation: movimientoApagado()
                ? 'none'
                : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-3)' }}>
              <h3 className="texto-titulo" style={{ margin: 0 }}>Medición / Panel de Corpus</h3>
              <button
                onClick={() => setMostrarPanelCorpus(false)}
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
            <PanelCorpus medir={medirLectura ?? true} setMedir={setMedirLectura ?? (() => {})} />
          </div>
        </div>
      )}

      {/* Botón Flotante CREAR secundario circular */}
      <button
        onClick={() => {
          hapticaToqueSuave()
          onCrearNuevo()
        }}
        data-testid="btn-crear-guion-flotante"
        title="Crear nuevo guion"
        style={{
          position: 'fixed',
          // EL AREA SEGURA. Este boton se quedo afuera de la tarea 43, que se la sumo
          // al relleno de la raiz y a la barra de controles de la lectura. Con el
          // borde a borde obligatorio del SDK 36, 32 px se miden desde el borde FISICO
          // de la pantalla, asi que la barra de navegacion se lo come casi entero.
          // Javier lo vio en el telefono el 16 de septiembre de 2026.
          bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          right: 'calc(32px + env(safe-area-inset-right, 0px))',
          backgroundColor: 'var(--bg-menu)',
          color: 'var(--color-texto)',
          borderRadius: 'var(--redondeo-pildora)',
          // 56, la medida de siempre para un boton flotante. Estaba en 44, que es el
          // MINIMO tocable: la tarea 48 lo hizo secundario -Leer paso a ser la accion
          // principal- y secundario se confundio con apretado.
          width: 56,
          height: 56,
          fontSize: 'var(--texto-display)',
          fontWeight: 400,
          cursor: 'pointer',
          border: 'calc(1px) solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset 0 calc(1px) 0 rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}
      >
        +
      </button>
    </div>
  )
}
