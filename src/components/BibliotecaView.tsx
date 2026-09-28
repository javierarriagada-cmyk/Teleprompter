import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, ResumenGuion, ResumenGrabacion, duracionDeLectura } from '../datos/modelo'
import TiraGrabaciones from './TiraGrabaciones'
import { PanelCorpus } from './PanelCorpus'
import TarjetaLectura from './TarjetaLectura'
import { IconoEngranaje, IconoMas, IconoChevron } from './IconosApp'
import { MarcaSigo } from './MarcaSigo'
import { hapticaToqueSuave, hapticaAvisoMantener } from '../haptica'
import { movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_RESORTE } from './movimiento'
import { ESCALA_AVISO, MS_MANTENER_APRETADO, programarMantener } from './mantenerApretado'
import { t, useTextos, tituloVisible, tituloOInicio, fechaCorta, IdiomaApp } from '../textos'
import { fijarIdioma } from '../lib/idioma'

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

// "hoy", "ayer", "hace 3 dias" y, pasadas cuatro semanas, la fecha corta por idioma
// -textos/index.ts, fechaCorta-.
export function formatearFechaNatural(timestamp: number): string {
  if (!timestamp) return ''
  const ahora = new Date()
  const fecha = new Date(timestamp)

  const inicioAhora = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()
  const diffDias = Math.round((inicioAhora - inicioFecha) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return t('hoy')
  if (diffDias === 1) return t('ayer')
  if (diffDias > 1 && diffDias <= 6) return t('haceDias', { n: diffDias })
  if (diffDias > 6 && diffDias <= 13) return t('haceUnaSemana')
  if (diffDias > 13 && diffDias <= 27) return t('haceSemanas', { n: Math.floor(diffDias / 7) })

  return fechaCorta(timestamp)
}

export function calcularMinutosLectura(guiones: ResumenGuion[]): number {
  const totalPalabras = guiones.reduce((acc, g) => acc + (g.palabras || 0), 0)
  return Math.round(totalPalabras / 150)
}

export function formatearTextoResumen(guiones: ResumenGuion[]): string {
  const minsLectura = calcularMinutosLectura(guiones)
  if (guiones.length === 0) return t('resumenSinGuiones')
  const cuantos = guiones.length === 1 ? t('resumenUnGuion') : t('resumenGuiones', { n: guiones.length })
  const lectura = minsLectura === 1 ? t('resumenUnMinuto') : t('resumenMinutos', { n: minsLectura })
  return `${cuantos} · ${lectura}`
}

// GESTO DE OPCIONES DE DESARROLLADOR / DIAGNÓSTICO (Tarea 74, P1f de decisiones-de-diseno.txt).
// Cinco toques rápidos sobre la marca abren y cierran la franja de diagnóstico.
// Herramienta interna para no abrir el diagnóstico de forma accidental con toques involuntarios.
// Hasta el 27-09-2026 la abria UN toque en el titulo de la tarjeta: la encontro el robot de
// pruebas de Google y se abrio sin querer en el telefono. ES UN PASO INTERMEDIO: antes de
// publicar, el panel de diagnostico se elimina entero -Javier: "despues tenemos que
// eliminarlo"-.
const TOQUES_PARA_DIAGNOSTICO = 5
const MS_ENTRE_TOQUES_DIAGNOSTICO = 600

let esPrimerMontajeBiblioteca = true

// LA LISTA PLEGADA -tarea 76, 28-09-2026-. Javier: debajo de la tarjeta, "Guiones" con los 3 más
// recientes y un "Ver todos" que despliega la lista en el mismo lugar, sin otra pantalla. Con
// 30 guiones la portada tiene que verse igual de ordenada que con 3: la tarjeta, tres filas,
// "Ver todos" y el comienzo de "Videos" caben en una pantalla de 412 x 915 sin desplazar.
// El más reciente sale también en la tarjeta de arriba y se deja así: muchas pruebas abren ese
// guion desde su fila.
export const GUIONES_A_LA_VISTA = 3

// Desplegada o plegada SE RECUERDA EN LA SESIÓN, como esPrimerMontajeBiblioteca: la biblioteca
// se desmonta al entrar a un guion, y quien desplegó para buscar uno tiene que encontrar la
// lista como la dejó al volver. Al cerrar la app vuelve a plegada.
let listaDesplegadaEnSesion = false

// Las pruebas simulan una app recién abierta con esto: la entrada escalonada vuelve a correr
// y la lista vuelve a plegada, que es como la encuentra quien abre la app.
export function resetearPrimerMontajeBiblioteca() {
  esPrimerMontajeBiblioteca = true
  listaDesplegadaEnSesion = false
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
  useTextos()
  const [dragX, setDragX] = useState(0)
  const esArrastrandoRef = useRef(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const decidioDireccionRef = useRef(false)
  const esHorizontalRef = useRef(false)
  const cruzoUmbralRef = useRef(false)
  const fueLongPressRef = useRef(false)
  // El dedo se movio mas de 10 px en este gesto: ya no es un toque -ver onClick-.
  const seMovioRef = useRef(false)
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
    seMovioRef.current = false
    setAvisado(false)
    gestoRef.current.arrancar()
    // La captura del dedo ya no va aca: se toma recien cuando el gesto resulta horizontal
    // -handlePointerMove-. Capturar al apoyar el dedo le disputaba el desplazamiento a la pagina.
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
        seMovioRef.current = true
        if (Math.abs(dy) > Math.abs(dx)) {
          gestoRef.current.cancelar()
          setAvisado(false)
          esHorizontalRef.current = false
          return
        } else {
          gestoRef.current.cancelar()
          setAvisado(false)
          esHorizontalRef.current = true
          const target = e.currentTarget as any
          if (target && typeof target.setPointerCapture === 'function' && 'pointerId' in e) {
            try { target.setPointerCapture((e as any).pointerId) } catch (err) {}
          }
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
    }
    // ABRIR NO VA ACA -28-09-2026-. Esta funcion la llamaban cuatro eventos a la vez -pointerup,
    // pointercancel, mouseup y touchend- y cada uno podia abrir el guion. Al bajar la pantalla
    // empezando sobre una fila, Android cancela el puntero porque el gesto es de la pagina; el
    // touchend que llegaba despues encontraba el gesto ya reseteado -distancia 0- y abria el
    // guion. Javier: "cuando accidentalmente para correr se aprieta un guion ... el guion se abre
    // y la pantalla no baja". Ahora abre solo onClick: el navegador ya decide que es un toque y
    // no lo dispara cuando hubo desplazamiento. Es la forma estandar.

    esArrastrandoRef.current = false
    startXRef.current = null
    startYRef.current = null
    decidioDireccionRef.current = false
    esHorizontalRef.current = false
    cruzoUmbralRef.current = false
  }

  const tituloMostrar = tituloOInicio(g.titulo, g.inicio)
  // La duracion sale de duracionDeLectura -modelo.ts-, la misma de la tarjeta.
  const fechaNat = formatearFechaNatural(g.modificado)
  const metaTexto = `${duracionDeLectura(g.palabras || 0)} · ${fechaNat}`

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--redondeo)',
        marginBottom: 'var(--aire-3)',
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
          {t('borrar')}
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
          {g.archivado ? t('desarchivar') : t('archivar')}
        </div>
      )}

      {/* Fila en primer plano */}
      <div
        data-testid={`fila-guion-${g.id}`}
        onClick={() => {
          // seMovioRef: un deslizamiento lateral corto -sin llegar a borrar o archivar- tambien
          // termina en click, porque ese gesto no lo hace la pagina. No es un toque: no abre.
          if (!fueLongPressRef.current && !seMovioRef.current) {
            hapticaToqueSuave()
            onAbrir(g.id)
          }
        }}
        // SOLO EVENTOS DE PUNTERO -28-09-2026-: cubren dedo y mouse. Los de mouse y touch
        // repetian cada gesto, y el touchend repetido era el que abria el guion al desplazar.
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuId(g.id)
        }}
        style={{
          position: 'relative',
          zIndex: 2,
          // PROPORCION Y CONTRASTE -27-09-2026-: la fila sube del suelo con el mismo gris de
          // la tarjeta de arriba y respira mas. Con --bg-fila casi no se separaba del fondo;
          // Javier prefirio el contraste entre gris y negro de una auditoria.
          padding: 'var(--aire-4)',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--redondeo)',
          cursor: 'pointer',
          userSelect: 'none',
          // EL GESTO VERTICAL ES DE LA PAGINA -28-09-2026-: el navegador desplaza apenas el dedo
          // baja o sube, sin esperar a esta fila. El lateral -borrar, archivar- queda para ella.
          touchAction: 'pan-y',
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
            {tituloMostrar} {g.archivado && <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)' }}>{t('marcaArchivado')}</span>}
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
              {g.archivado ? t('desarchivar') : t('archivar')}
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
              {t('eliminar')}
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
              {t('cerrar')}
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
  onRegistrarCerrarModal,
  grabaciones = [],
  onAbrirGrabacion,
  onBorrarGrabacion,
  'data-pantalla-direccion': dataPantallaDireccion,
  style,
  onAnimationEnd
}: BibliotecaViewProps) {
  const idioma = useTextos()
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

  // Plegada o desplegada -ver GUIONES_A_LA_VISTA-. animarDespliegue es true solo después del
  // toque en "Ver todos": al volver de un guion con la lista ya desplegada, las filas están
  // ahí, no entran de nuevo.
  const [desplegada, setDesplegada] = useState<boolean>(listaDesplegadaEnSesion)
  const [animarDespliegue, setAnimarDespliegue] = useState(false)
  const idLista = useId()
  const refTituloGuiones = useRef<HTMLDivElement | null>(null)
  const refVerTodos = useRef<HTMLButtonElement | null>(null)
  const recienPlegadaRef = useRef(false)

  const guionMasReciente = guiones.length > 0 ? guiones[0] : undefined
  // La tarjeta ya no muestra el texto del guion -TarjetaLectura.tsx, 24-09-2026-,
  // asi que ya no se lee el guion completo para dibujarla.


  useEffect(() => {
    if (esPrimerMontajeBiblioteca) {
      esPrimerMontajeBiblioteca = false
    }
  }, [])

  const conteoToquesDiagRef = useRef(0)
  const ultimoToqueDiagRef = useRef(0)

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
    const tituloNormalizado = tituloOInicio(g.titulo, g.inicio).toLowerCase()
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

  // LO QUE SE VE DE LA LISTA -tarea 76-. Se pliega solo la lista principal, y solo si tiene más
  // de GUIONES_A_LA_VISTA: con 3 o menos no hay "Ver todos". Archivados se ve entero -"la vista
  // de archivados muestra todos sus guiones, sin plegar"-, y con texto en la búsqueda no rige
  // el límite. listaEntera es "no hay nada escondido": desplegada, o nada que esconder. Ahí
  // viven la búsqueda y "Archivados".
  // OJO, UNA LECTURA DEL ENCARGO: "Archivados solo con la lista desplegada" y "con 3 o menos no
  // hay Ver todos" juntos dejaban sin salida a quien tiene 2 guiones y 1 archivado -nunca
  // podría desplegar-. Con 3 o menos la lista ya está entera, y Archivados se muestra.
  const hayBusqueda = busqueda.trim() !== ''
  const cantidadEnLista = guiones.length - cantidadArchivados
  const sePliega = !mostrarArchivados && cantidadEnLista > GUIONES_A_LA_VISTA
  const listaEntera = !sePliega || desplegada
  const guionesVisibles = listaEntera || hayBusqueda
    ? guionesFiltrados
    : guionesFiltrados.slice(0, GUIONES_A_LA_VISTA)

  function alternarLista() {
    hapticaToqueSuave()
    const nueva = !desplegada
    listaDesplegadaEnSesion = nueva
    setAnimarDespliegue(nueva)
    // Al plegar se va la búsqueda, y con ella lo escrito: si quedara, filtraría la lista con
    // un campo que ya no se ve.
    if (!nueva) {
      setBusqueda('')
      recienPlegadaRef.current = true
    }
    setDesplegada(nueva)
  }

  // AL PLEGAR, SI LA LISTA QUEDÓ ARRIBA DE LO QUE SE VE, SE VUELVE A ELLA. Las filas de la
  // cuarta en adelante se van sin animación -basta con quitarlas-, y la página se acorta: quien
  // estaba mirando el final de una lista larga podría quedar mirando el vacío o los videos.
  // Si "Ver todos" -el final de la lista plegada- quedó por encima del borde de arriba, la
  // página baja suave hasta el título "Guiones".
  useEffect(() => {
    if (!recienPlegadaRef.current) return
    recienPlegadaRef.current = false
    const boton = refVerTodos.current
    const titulo = refTituloGuiones.current
    if (!boton || !titulo) return
    if (boton.getBoundingClientRect().top >= 0) return
    if (typeof titulo.scrollIntoView !== 'function') {
      console.warn('[BibliotecaView] la lista plegada quedó arriba de la pantalla y este navegador no tiene scrollIntoView: no se puede volver a ella')
      return
    }
    titulo.scrollIntoView({ behavior: movimientoApagado() ? 'auto' : 'smooth', block: 'start' })
  }, [desplegada])

  // -24-09-2026: aca vivian el toque largo, el clic y el menu contextual de la fila vieja. La
  // fila ahora es FilaGuion, con sus propios manejadores; estos habian quedado sin uso.

  function handleToqueMarcaDiag() {
    const ahora = Date.now()
    if (ahora - ultimoToqueDiagRef.current < MS_ENTRE_TOQUES_DIAGNOSTICO) {
      conteoToquesDiagRef.current += 1
    } else {
      conteoToquesDiagRef.current = 1
    }
    ultimoToqueDiagRef.current = ahora

    if (conteoToquesDiagRef.current >= TOQUES_PARA_DIAGNOSTICO) {
      conteoToquesDiagRef.current = 0
      if (onToggleDiagnostico) onToggleDiagnostico()
    }
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
        <div className="portada-marca" onClick={handleToqueMarcaDiag}>
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
          title={t('ajustesApp')}
          aria-label={t('ajustesApp')}
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
                <div className="parejas-aa parejas-aa-dos" role="group" aria-label={t('tema')}>
                  {([
                    { valor: 'claro' as const, nombre: t('temaClaro') },
                    { valor: 'oscuro' as const, nombre: t('temaOscuro') }
                  ]).map((tm) => (
                    <button
                      key={tm.valor}
                      type="button"
                      title={tm.nombre}
                      aria-label={tm.nombre}
                      aria-pressed={tema === tm.valor}
                      className={`btn-deformable pareja-aa${tema === tm.valor ? ' activa' : ''}`}
                      onClick={() => {
                        hapticaToqueSuave()
                        setTema?.(tm.valor)
                      }}
                    >
                      <span className={`pareja-aa-muestra tema-muestra-${tm.valor}`}>Aa</span>
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
              {/* EL IDIOMA DE LA APP -D1, tarea 75, 27-09-2026-. Una fila con ES y EN, la
                  misma pieza que los selectores del cajon Aa, la elegida en crema. Toda la
                  app cambia en el momento -fijarIdioma, lib/idioma.ts-. Van escritas porque
                  son un dato, como la calidad del video. Cada opcion se nombra en su propio
                  idioma -"Español", "English"-: quien no entiende el idioma de la pantalla
                  tiene que poder encontrar el suyo. */}
              <div
                className="selector-aa selector-aa-lleno"
                role="group"
                aria-label={t('idiomaDeLaApp')}
                data-testid="selector-idioma-app"
              >
                {([
                  { valor: 'es' as IdiomaApp, sigla: 'ES', nombre: 'Español' },
                  { valor: 'en' as IdiomaApp, sigla: 'EN', nombre: 'English' }
                ]).map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    lang={o.valor}
                    data-testid={`btn-idioma-${o.valor}`}
                    aria-label={o.nombre}
                    title={o.nombre}
                    aria-pressed={idioma === o.valor}
                    className={`btn-deformable selector-aa-opcion texto-aa${idioma === o.valor ? ' activa' : ''}`}
                    onClick={() => {
                      hapticaToqueSuave()
                      fijarIdioma(o.valor)
                    }}
                  >
                    {o.sigla}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Los dos titulos de biblioteca -este y "Videos"- van en el mismo
          escalon de la escala y con el mismo peso: son hermanos, no uno
          principal y otro al pie. Javier los pidio mas grandes el 21 de
          septiembre de 2026; texto-cuerpo es el escalon que sigue a
          texto-meta, no un numero inventado. El 27-09-2026 subieron otro
          escalon -texto-titulo- y a color de texto: son los que ordenan la
          portada, y en gris apagado se perdian. */}
      {/* 28-09-2026: suben a --texto-seccion -22 px, .titulo-seccion-, los dos. Y el titulo es
          ahora una fila con el "+" de crear guion a la derecha: el boton flotante tapaba la tira
          de videos -ver el comentario del "+" al final de este archivo-. En Archivados no va:
          ahi no se crea nada. */}
      <div ref={refTituloGuiones} className="fila-titulo-seccion">
        <div className="texto-titulo titulo-seccion" style={{ color: 'var(--color-texto)', fontWeight: 600 }}>
          {mostrarArchivados ? t('archivados') : t('guiones')}
        </div>
        {mostrarBotonCrear && !mostrarArchivados && (
          <button
            type="button"
            className="boton-crear-guion btn-deformable"
            onClick={() => {
              hapticaToqueSuave()
              onCrearNuevo()
            }}
            data-testid="btn-crear-guion"
            title={t('crearGuion')}
            aria-label={t('crearGuion')}
          >
            <span><IconoMas tamano={20} /></span>
          </button>
        )}
      </div>

      {/* Buscador: sin borde, fondo bg-suelo y redondeo */}
      {/* -28-09-2026, tarea 76: solo con la lista desplegada, y ya no arriba del título sino
          debajo, arriba de las filas: es de la lista. Abre su lugar al aparecer
          -.buscador-guiones, styles.css-. Su margen de abajo pasó de var(--aire-4) a
          var(--aire-3), el de una fila a la siguiente. */}
      {hayMasDeOcho && listaEntera && (
        <div
          className="buscador-guiones"
          style={animarDespliegue && !movimientoApagado()
            ? { animation: `buscadorAbre ${MS_CHICO}ms ${CURVA_ENTRA} both` }
            : undefined}
        >
         <div>
          <input
            type="text"
            placeholder={t('buscar')}
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
        </div>
      )}

      {/* Lista de guiones o Vacío */}
      {guiones.length === 0 ? (
        <div
          id={idLista}
          data-testid="lista-guiones-biblioteca"
          data-retardo-escalonado={esInicial && !movimientoApagado() ? 80 : 0}
          style={{ textAlign: 'center', padding: 'var(--aire-5) 0', ...animacionListaStyle }}
        >
        </div>
      ) : guionesFiltrados.length === 0 ? (
        <div
          id={idLista}
          data-testid="lista-guiones-biblioteca"
          data-retardo-escalonado={esInicial && !movimientoApagado() ? 80 : 0}
          style={{ padding: 'var(--aire-4)', textAlign: 'center', color: 'var(--color-apagado)', ...animacionListaStyle }}
          className="texto-meta"
        >
          {busqueda.trim()
            ? t('sinCoincidencias', { busqueda })
            : mostrarArchivados
            ? t('sinArchivados')
            : t('listaVacia')}
        </div>
      ) : (
        <div
          id={idLista}
          data-testid="lista-guiones-biblioteca"
          data-retardo-escalonado={esInicial && !movimientoApagado() ? 80 : 0}
          style={{ display: 'flex', flexDirection: 'column', ...animacionListaStyle }}
        >
          {guionesVisibles.slice(0, GUIONES_A_LA_VISTA).map((g) => (
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
          {/* DE LA CUARTA EN ADELANTE -tarea 76-. Entran con la misma entrada que la lista al
              abrir la portada -pantallaEntraInicial, MS_PANTALLA, CURVA_ENTRA, 80 ms después-:
              la lista entra 80 ms después de la tarjeta, y estas filas 80 ms después del toque.
              Entran como un bloque y no fila por fila: con 30 guiones, 80 ms por fila serían
              más de dos segundos, con filas todavía invisibles abajo del borde. both y no
              forwards: con forwards, durante los 80 ms de espera se verían de golpe y después
              se apagarían para aparecer. Solo anima después del toque: al volver de un guion
              con la lista desplegada, ya están. Con movimientoApagado(), aparecen de una.
              Son FilaGuion, las mismas de arriba: mismos gestos, y bajar la pantalla sobre
              ellas tampoco las abre -desplazarNoAbre.test.tsx-. */}
          {guionesVisibles.length > GUIONES_A_LA_VISTA && (
            <div
              data-testid="filas-desplegadas"
              data-retardo-escalonado={animarDespliegue && !movimientoApagado() ? 80 : 0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                ...(animarDespliegue && !movimientoApagado()
                  ? { animation: `pantallaEntraInicial ${MS_PANTALLA}ms ${CURVA_ENTRA} both`, animationDelay: '80ms' }
                  : {})
              }}
            >
              {guionesVisibles.slice(GUIONES_A_LA_VISTA).map((g) => (
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
        </div>
      )}

      {/* "VER TODOS" Y "VER MENOS" -tarea 76, 28-09-2026-. Un botón de texto, no una píldora ni
          una tarjeta: se lee como continuación de la lista -.ver-todos-guiones, styles.css-.
          El número es el total de la lista principal, sin archivados. El chevron apunta a lo
          que va a aparecer y gira 180 grados al desplegar -MS_CHICO, CURVA_RESORTE-; el giro va
          en el dibujo y no en el botón: un transform en línea en un btn-deformable le mata el
          apretado. Mientras se ven los archivados no está: esa vista no se pliega. */}
      {sePliega && (
        <button
          type="button"
          ref={refVerTodos}
          data-testid="btn-ver-todos-guiones"
          className="btn-deformable ver-todos-guiones"
          aria-expanded={desplegada}
          aria-controls={idLista}
          onClick={alternarLista}
        >
          <span>{desplegada ? t('verMenosGuiones') : t('verTodosGuiones', { n: cantidadEnLista })}</span>
          <IconoChevron
            tamano={16}
            style={{
              transform: desplegada ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: movimientoApagado() ? 'none' : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`
            }}
          />
        </button>
      )}

      {/* ARCHIVADOS, AL PIE DE LA LISTA. 24-09-2026. Vivia en el menu del
          engranaje -"Ver Archivados"-, que es de ajustes. Los archivados son
          guiones, y se buscan donde estan los guiones. Solo aparece si hay
          alguno, con cuantos son; adentro, el mismo lugar lleva de vuelta.
          -28-09-2026, tarea 76: solo con la lista entera -desplegada, o sin nada que
          plegar-, al pie, debajo de "Ver menos". */}
      {!busqueda.trim() && listaEntera && (cantidadArchivados > 0 || mostrarArchivados) && (
        <button
          type="button"
          data-testid="btn-ver-archivados"
          className="btn-deformable enlace-archivados"
          onClick={() => {
            hapticaToqueSuave()
            setMostrarArchivados(!mostrarArchivados)
          }}
        >
          {mostrarArchivados ? t('volverATusGuiones') : t('archivadosConteo', { n: cantidadArchivados })}
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
      {/* EL BOTON FLOTANTE SE RETIRO EL 28-09-2026. Con la lista plegada -tarea 76- la tira de
          videos sube a la primera pantalla, y el "+" de 56 abajo a la derecha tapaba la tercera
          miniatura. Javier eligio, mirando un dibujo, llevarlo junto al titulo "Guiones"
          -.boton-crear-guion, fila-titulo-seccion, arriba en este archivo-. Lo que decian sus
          comentarios -el area segura del SDK 36, el 56 que no es el minimo, el portal para que
          no lo alcance el transform- queda aca como memoria: si el "+" vuelve a flotar, esas tres
          cosas siguen valiendo. Estaba asi:
            bottom: calc(32px + env(safe-area-inset-bottom)); right: calc(32px + ...);
            56 x 56, --bg-menu, redondeo pildora, borde blanco 8% y brillo interior 6%;
            EL AREA SEGURA: se quedo afuera de la tarea 43; con el borde a borde del SDK 36 la
            barra de navegacion se lo comia -Javier, 16-09-2026-.
            56 Y NO 44: la tarea 48 lo hizo secundario, y secundario se confundio con apretado. */}
    </div>
  )
}
