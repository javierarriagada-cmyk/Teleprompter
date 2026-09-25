import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, ResumenGuion, ResumenGrabacion, PAREJAS_COLOR, duracionDeLectura } from '../datos/modelo'
import TiraGrabaciones from './TiraGrabaciones'
import { PanelCorpus } from './PanelCorpus'
import TarjetaLectura from './TarjetaLectura'
import { IconoEngranaje } from './IconosApp'
import { MarcaSigo } from './MarcaSigo'
import { hapticaToqueSuave, hapticaAvisoMantener } from '../haptica'
import { movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_RESORTE } from './movimiento'
import { ESCALA_AVISO, MS_MANTENER_APRETADO, programarMantener } from './mantenerApretado'

interface BibliotecaViewProps {
  guiones: ResumenGuion[]
  onAbrir: (id: string) => void
  onLeerDirecto?: (id: string, rect?: DOMRect) => void
  onGrabarDirecto?: (id: string, rect?: DOMRect) => void
  onCrearNuevo: () => void
  // El + de crear guion cuelga de body por un portal -ver mas abajo-, asi que
  // NO se esconde con la biblioteca. App la deja montada debajo de la lectura, y
  // en Grabar con la camara detras el lienzo es transparente: el + se veia a
  // traves, en plena toma. Por eso App dice explicitamente cuando va. Revision
  // de la 70, 23-09-2026.
  mostrarBotonCrear?: boolean
  onBorrar: (id: string) => void
  onArchivar: (id: string, archivado: boolean) => void
  onBuscarGuionCompleto?: (id: string) => Promise<Guion | null>
  onToggleDiagnostico?: () => void
  medirLectura?: boolean
  setMedirLectura?: (medir: boolean) => void
  tema?: 'claro' | 'oscuro'
  setTema?: (tema: 'claro' | 'oscuro') => void
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
  onAbrir: (id: string) => void
  onBorrar: (id: string) => void
  onArchivar: (id: string, archivado: boolean) => void
  menuId: string | null
  setMenuId: (id: string | null) => void
  refMenuFila: React.RefObject<HTMLDivElement>
}

function FilaGuion({
  g,
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
  const fueLongPressRef = useRef(false)
  const [avisado, setAvisado] = useState(false)
  const gestoRef = useRef(programarMantener(
    () => {
      fueLongPressRef.current = true
      setMenuId(g.id)
    },
    () => {
      setAvisado(true)
      hapticaAvisoMantener()
    }
  ))

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
    setAvisado(false)
    gestoRef.current.arrancar()

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
          gestoRef.current.cancelar()
          setAvisado(false)
          esHorizontalRef.current = false
          return
        } else {
          gestoRef.current.cancelar()
          setAvisado(false)
          esHorizontalRef.current = true
        }
      } else {
        return
      }
    }

    if (esHorizontalRef.current) {
      gestoRef.current.cancelar()
      setAvisado(false)
      setDragX(dx)

      if (Math.abs(dx) >= 88 && !cruzoUmbralRef.current) {
        cruzoUmbralRef.current = true
        hapticaToqueSuave()
      }
    }
  }

  function handlePointerUp(e: React.SyntheticEvent) {
    gestoRef.current.cancelar()
    setAvisado(false)

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
  // La duracion sale de duracionDeLectura -modelo.ts-, la misma de la tarjeta.
  const fechaNat = formatearFechaNatural(g.modificado)
  const metaTexto = `${duracionDeLectura(g.palabras || 0)} · ${fechaNat}`

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
        onClick={() => {
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
          // LOS DOS MOVIMIENTOS VAN EN UN SOLO transform, Y ESTE ES EL UNICO
          // SITIO DONDE CHOCAN. La fila se desliza -translateX- y ademas se
          // comprime al avisar el gesto -scale-. Como CSS tiene una sola
          // propiedad transform, escribirlas por separado hace que la segunda
          // borre a la primera: el spread de estiloComprimirPorAviso iba antes
          // y el translateX lo pisaba, asi que el encogimiento no se veia
          // nunca. Javier el 21 de septiembre de 2026: "cuando mantengo
          // apretado el guion no se encoge".
          // En la tarjeta y en la tira no pasa porque ahi no hay deslizamiento.
          transform: `translateX(${dragX}px) scale(${avisado ? ESCALA_AVISO : 1})`,
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
  mostrarBotonCrear = true,
  onBorrar,
  onArchivar,
  onBuscarGuionCompleto,
  onToggleDiagnostico,
  medirLectura = true,
  setMedirLectura = () => {},
  tema = 'claro',
  setTema,
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
  // El cajon de ajustes se cierra como el Aa: un toque afuera o Escape
  // -useCerrarAfuera-, bajando la raya, o con volver del telefono. El
  // engranaje cuenta como "adentro" para que tocarlo lo abra y lo cierre.
  const refEngranajePortada = useRef<HTMLButtonElement | null>(null)
  const refCajonPortada = useCerrarAfuera(menuSuperiorAbierto, () => setMenuSuperiorAbierto(false), [refEngranajePortada])
  const [arrastreCajon, setArrastreCajon] = useState(0)
  const arrastrandoCajonRef = useRef(false)
  const inicioArrastreCajonRef = useRef<number | null>(null)
  // el menu de cada fila, que se abre con toque largo, se cierra igual que los demas
  const refMenuFila = useCerrarAfuera(menuId !== null, () => setMenuId(null))
  const [mapaTextos, setMapaTextos] = useState<Record<string, string>>({})

  const [esInicial] = useState<boolean>(esPrimerMontajeBiblioteca)

  const guionMasReciente = guiones.length > 0 ? guiones[0] : undefined
  // La tarjeta ya no muestra el texto del guion -TarjetaLectura.tsx, 24-09-2026-,
  // asi que ya no se lee el guion completo para dibujarla.


  useEffect(() => {
    if (esPrimerMontajeBiblioteca) {
      esPrimerMontajeBiblioteca = false
    }
  }, [])


  const timerDiagRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressDiagRef = useRef<boolean>(false)

  const hayMasDeOcho = guiones.length > 8
  const cantidadArchivados = guiones.filter((g) => g.archivado).length

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

  // -24-09-2026: aca vivian el toque largo, el clic y el menu contextual de la fila vieja. La
  // fila ahora es FilaGuion, con sus propios manejadores; estos habian quedado sin uso.

  // Toque largo sobre el resumen para alternar diagnostico
  function handleDiagTouchStart() {
    fueLongPressDiagRef.current = false
    if (timerDiagRef.current) clearTimeout(timerDiagRef.current)
    timerDiagRef.current = setTimeout(() => {
      fueLongPressDiagRef.current = true
      if (onToggleDiagnostico) onToggleDiagnostico()
    }, MS_MANTENER_APRETADO)
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
        if (menuSuperiorAbierto) {
          setMenuSuperiorAbierto(false)
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
  }, [mostrarPanelCorpus, menuSuperiorAbierto, onRegistrarCerrarModal])

  const animacionTituloStyle: React.CSSProperties = (esInicial && !movimientoApagado())
    ? {
        animation: `pantallaEntraInicial ${MS_PANTALLA}ms ${CURVA_ENTRA} forwards`,
        animationDelay: '0ms'
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
      {/* LA PORTADA, DE ARRIBA A ABAJO: marca, tu guion, tus guiones, tus
          videos. 24-09-2026, el dueno: "siento que queda debajo de las otras en
          nivel ... subamos el nivel con todo".
          Arriba, una barra fina con la marca y el engranaje. El engranaje vivia
          adentro de la tarjeta del guion y mezclaba "este guion" con "la
          aplicacion"; ahora la tarjeta es solo del guion. La marca ancla la
          pantalla: antes la portada empezaba con un hueco y la tarjeta. */}
      <header className="portada-cabeza" style={animacionTituloStyle}>
        {/* LA MARCA ES EL NOMBRE CON SU PUNTO. Primero fueron los cinco
            renglones del icono al lado del nombre, y en chico se leian como
            el icono de menu -tres rayas-: algo que se toca y no hace nada.
            Visto en el telefono, 24-09-2026. Queda el nombre y el punto rojo
            del tally, que es lo unico propio de Sigo que se reconoce a este
            tamano: una luz de "grabando".
            Mas tarde el mismo dia el dueno la llevo un paso mas: "Sig" y la bola
            roja EN LUGAR de la o, un poco mas arriba. Es el dibujo de
            MarcaSigo.tsx, el mismo del arranque y de la entrada: la marca que
            viaja desde la mitad de la pantalla aterriza exactamente aca
            -data-marca-portada es a donde apunta Entrada.tsx-. */}
        <div className="portada-marca">
          <MarcaSigo alto={24} data-marca-portada="" />
        </div>
        <button
          type="button"
          onClick={() => {
            hapticaToqueSuave()
            setMenuSuperiorAbierto((v) => !v)
          }}
          ref={refEngranajePortada}
          data-testid="btn-menu-superior-biblioteca"
          className="btn-deformable boton-portada"
          title="Ajustes de la app"
          aria-label="Ajustes de la app"
        >
          <IconoEngranaje tamano={22} />
        </button>
      </header>

      {/* LO QUE VA DEBAJO DE LA BARRA ENTRA SUBIENDO. Mientras la marca viaja
          desde la entrada, esto pasa de transparente y 10 px mas abajo a su
          lugar -.portada-cuerpo y .entrada-en-curso, styles.css-. */}
      <div className="portada-cuerpo">

      {/* Tarjeta de Portada */}
      <div style={{ position: 'relative', marginBottom: 'var(--aire-5)', ...animacionTituloStyle }}>
        <TarjetaLectura
          guionResumen={guionMasReciente}
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
          colorFondo={colorFondo}
          colorLetra={colorLetra}
        />
      </div>

      {/* LOS AJUSTES DE LA APLICACION, EN EL CAJON ESTANDAR. 24-09-2026.
          Era un menu colgado del engranaje con cuatro renglones escritos:
          "Ver Archivados", "Importar archivo", "Tema:" y "Vibracion". Dos no
          eran ajustes: archivados paso al pie de la lista de guiones, que es
          donde se busca, e importar se fue porque el editor vacio ya lo ofrece
          -"Abrir archivo", y toma el titulo del archivo-. Quedan los dos
          ajustes de verdad, en UNA fila y sin palabras, como el cajon Aa: el
          tema en dos tarjetas que muestran como se ve, y la vibracion como un
          boton redondo que se enciende. Ese boton salio el mismo 24-09: queda
          solo el tema.
          Del menu viejo quedan dos lecciones. Los renglones sueltos sin grupo
          eran "la mitad del desorden" que Javier vio el 21-09-2026. Y el menu
          crecio hasta pasarse del borde de abajo sin forma de llegar al ultimo
          renglon -"el renglon de abajo no se ve"-: si este cajon crece, lleva
          alto maximo y desplazamiento.
          Sigue saliendo por portal a body -Javier, 21-09-2026: "ahora pasa por
          detras del cuadro del guion"-. Se cierra tocando afuera, bajando la
          raya o con el boton de volver del telefono. */}
      {menuSuperiorAbierto && createPortal(
        <div
          className="capa-cajon-aa"
          data-testid="capa-ajustes-portada"
          onClick={() => setMenuSuperiorAbierto(false)}
        >
          <div
            ref={refCajonPortada}
            data-testid="menu-superior-biblioteca"
            className="panel-superficie cajon-aa"
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))',
              transform: `translateY(${arrastreCajon}px)`,
              transition: arrastrandoCajonRef.current || movimientoApagado() ? 'none' : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`,
              animation: movimientoApagado() || arrastrandoCajonRef.current || arrastreCajon > 0
                ? 'none'
                : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
            }}
          >
            <div
              className="cajon-aa-agarradera"
              onPointerDown={(e) => {
                inicioArrastreCajonRef.current = e.clientY
                arrastrandoCajonRef.current = true
                try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
              }}
              onPointerMove={(e) => {
                if (!arrastrandoCajonRef.current || inicioArrastreCajonRef.current === null) return
                setArrastreCajon(Math.max(0, e.clientY - inicioArrastreCajonRef.current))
              }}
              onPointerUp={() => {
                arrastrandoCajonRef.current = false
                inicioArrastreCajonRef.current = null
                // El mismo umbral que el cajon Aa -EditorView.tsx-.
                if (arrastreCajon > 96) setMenuSuperiorAbierto(false)
                setArrastreCajon(0)
              }}
              onPointerCancel={() => {
                arrastrandoCajonRef.current = false
                inicioArrastreCajonRef.current = null
                setArrastreCajon(0)
              }}
            >
              <div className="cajon-aa-agarradera-raya" />
            </div>

            <div className="cajon-aa-filas">
              <div className="fila-aa-accion">
                {/* DOS OPCIONES, NO TRES. "Sistema" se fue el 21 de septiembre
                    de 2026. Javier: "no se por que ademas da la opcion de
                    sistema, que en el fondo igual es una de las otras dos".
                    Tiene razon, y hay un motivo propio de este producto: seguir
                    el horario del telefono no tiene nada que ver con filmar.
                    Que anochezca no cambia la luz de tu pieza ni si estas
                    grabando. Era elegir sin informacion, que es lo mismo que
                    ajustes-propuesta.html ya habia decidido cortar al pasar de
                    diez controles a seis. El valor por omision sigue siendo
                    oscuro, y a quien tenga guardado "sistema" le cae ahi.
                    24-09-2026: las dos opciones son tarjetas que muestran el
                    tema -su fondo y su letra-, como las parejas del cajon Aa. */}
                <div className="parejas-aa parejas-aa-dos" role="group" aria-label="Tema">
                  {([
                    { valor: 'claro' as const, nombre: 'Claro' },
                    { valor: 'oscuro' as const, nombre: 'Oscuro' }
                  ]).map((t) => (
                    <button
                      key={t.valor}
                      type="button"
                      title={t.nombre}
                      aria-label={t.nombre}
                      aria-pressed={tema === t.valor}
                      className={`btn-deformable pareja-aa${tema === t.valor ? ' activa' : ''}`}
                      onClick={() => {
                        hapticaToqueSuave()
                        setTema?.(t.valor)
                      }}
                    >
                      <span className={`pareja-aa-muestra tema-muestra-${t.valor}`}>Aa</span>
                    </button>
                  ))}
                </div>
                {/* Vibracion: un interruptor dibujado. La casilla real sigue en
                    el documento, escondida -interruptor-casilla-, para el lector
                    de pantalla y para getByLabelText('Vibración'). Al
                    encenderla vibra: es la unica forma de mostrar lo que hace.
                    24-09-2026: EL INTERRUPTOR SE FUE. La vibracion la decide la
                    respuesta tactil del telefono -el porque esta en haptica.ts-.
                    Quedan las dos tarjetas del tema. */}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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
      <div className="texto-cuerpo" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-2)', fontWeight: 600 }}>
        {mostrarArchivados ? 'Archivados' : 'Guiones'}
      </div>

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
          {guionesFiltrados.map((g) => (
            <FilaGuion
              key={g.id}
              g={g}
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

      {/* ARCHIVADOS, AL PIE DE LA LISTA. 24-09-2026. Vivia en el menu del
          engranaje -"Ver Archivados"-, que es de ajustes. Los archivados son
          guiones, y se buscan donde estan los guiones. Solo aparece si hay
          alguno, con cuantos son; adentro, el mismo lugar lleva de vuelta. */}
      {!busqueda.trim() && (cantidadArchivados > 0 || mostrarArchivados) && (
        <button
          type="button"
          data-testid="btn-ver-archivados"
          className="btn-deformable enlace-archivados"
          onClick={() => {
            hapticaToqueSuave()
            setMostrarArchivados(!mostrarArchivados)
          }}
        >
          {mostrarArchivados ? '‹ Volver a tus guiones' : `Archivados · ${cantidadArchivados}`}
        </button>
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

      </div>

      {/* EL "+" SALE POR UNA PUERTA APARTE, Y NO ES UN CAPRICHO.
          Pantalla anima la raiz de la biblioteca con transform: translateX.
          Un transform en un ancestro convierte a ese elemento en el BLOQUE
          CONTENEDOR de sus descendientes position: fixed. O sea que durante
          los 300 ms de la transicion este boton se posicionaba contra la caja
          animada -que mide lo que mide el contenido- y no contra la pantalla;
          al terminar la animacion se quitaba el transform y el boton saltaba a
          su lugar. Javier lo vio el 21 de septiembre de 2026 al volver del
          editor: "el signo mas queda mas arriba y baja, se ve un movimiento
          como un parpadeo".
          Con el portal cuelga de body, ningun transform lo alcanza y se queda
          quieto. La alternativa era sacarle el transform a la transicion, y esa
          curva esta decidida y medida en circuito.html: no se toca por esto. */}
      {mostrarBotonCrear && createPortal(
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
        </button>,
        document.body
      )}
    </div>
  )
}
