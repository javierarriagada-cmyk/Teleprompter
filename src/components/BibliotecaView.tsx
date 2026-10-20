import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, ResumenGuion, ResumenGrabacion, duracionDeLectura } from '../datos/modelo'
import TiraGrabaciones from './TiraGrabaciones'
import { PanelCorpus } from './PanelCorpus'
import { HERRAMIENTAS } from '../lib/herramientas'
import TarjetaLectura from './TarjetaLectura'
import { IconoEngranaje, IconoMas, IconoChevron, IconoTacho, IconoArchivar, IconoCerrar, IconoAtras } from './IconosApp'
import { MarcaSigo } from './MarcaSigo'
import { hapticaToqueSuave, hapticaAvisoMantener } from '../haptica'
import { movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_RESORTE } from './movimiento'
import { ESCALA_AVISO, MS_MANTENER_APRETADO, programarMantener } from './mantenerApretado'
import { t, useTextos, tituloVisible, tituloOInicio, fechaCorta } from '../textos'
import { entrarSeleccion, seleccionarTodas, trasAlternar } from '../lib/seleccionTomas'
import { bordesSeguros, colocarMenu } from '../lib/bordesSeguros'
import { guionDeLaTarjeta } from '../lib/portada'

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
  // 28-09-2026, tarea 77: el engranaje abre la pantalla de Ajustes, no el
  // cajon de tema e idioma. El cajon menu-superior-biblioteca se fue.
  onAbrirAjustes?: () => void
  // -atrás predictivo, 11-10-2026- Junto con el cierre va si hay algo abierto que ese cierre cerraría: App
  // lo necesita para decirle al nativo si hay adónde volver. Antes:
  // onRegistrarCerrarModal?: (fn: (() => boolean) | null) => void
  onRegistrarCerrarModal?: (fn: (() => boolean) | null, hayAbierto?: boolean) => void
  // LA TIRA DE GRABACIONES vive aca, debajo de los guiones, y no en una
  // pantalla aparte: el video al lado del guion que lo produjo.
  grabaciones?: ResumenGrabacion[]
  onAbrirGrabacion?: (g: ResumenGrabacion) => void
  onBorrarGrabacion?: (id: string) => void
  // -tarea 94- el tacho de la selección. App esconde la lista al tiro y borra los archivos a los 5 s.
  onBorrarTomas?: (ids: string[]) => void
  'data-pantalla-direccion'?: string
  // -atrás predictivo- Debajo del editor la biblioteca queda montada pero TalkBack no la ve.
  'aria-hidden'?: boolean
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

  const menuAbierto = menuId === g.id

  // Donde va el menu del guion -portal, abajo-: se mide al abrirse y se vuelve a medir si la
  // pagina se mueve o cambia de tamano.
  const refTarjeta = useRef<HTMLDivElement>(null)
  const refMenuEl = useRef<HTMLDivElement | null>(null)
  const [posMenu, setPosMenu] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    if (!menuAbierto) {
      setPosMenu(null)
      return
    }
    function colocar() {
      const tarjeta = refTarjeta.current
      const menu = refMenuEl.current
      if (!tarjeta || !menu) return
      const r = tarjeta.getBoundingClientRect()
      const c = colocarMenu(
        { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
        { alto: menu.offsetHeight, ancho: menu.offsetWidth },
        { alto: window.innerHeight, ancho: window.innerWidth },
        bordesSeguros(),
        'izquierda',
        12
      )
      setPosMenu({ top: c.top, left: c.left })
    }
    colocar()
    const id = requestAnimationFrame(colocar)
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
    }
  }, [menuAbierto])

  return (
    <div
      ref={refTarjeta}
      // La caja se levanta del suelo -borde de un pelo y sombra, .tarjeta-elevada, 28-09-2026-. Va en
      // este envoltorio y no en la fila: el overflow hidden de aca recortaria la sombra de adentro.
      // Boceto 102: con el menu adjunto abierto hay que dejar overflow visible para que no lo recorte.
      // -portada con luz, 15-10-2026- fila-guion-caja: .portada le pone --sup-fondo, --sup-canto y --sup-sombra.
      // Antes: className="tarjeta-elevada"
      className="tarjeta-elevada fila-guion-caja"
      style={{
        position: 'relative',
        borderRadius: 'var(--redondeo)',
        marginBottom: 'var(--aire-3)',
        overflow: menuAbierto ? 'visible' : 'hidden',
        zIndex: menuAbierto ? 20 : undefined
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
          aria-label={t('borrar')}
        >
          {/* El tacho sobre rojo, sin palabra -28-09-2026-. Antes decia "Borrar". */}
          <IconoTacho tamano={26} strokeWidth={1.6} />
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
            gap: 'var(--aire-2)',
            fontWeight: 'bold',
            fontSize: 'var(--texto-meta)',
            borderRadius: 'var(--redondeo)'
          }}
        >
          {/* La caja de archivo con su palabra chica -28-09-2026-. Antes, la palabra sola. */}
          <IconoArchivar tamano={26} />
          <span>{g.archivado ? t('desarchivar') : t('archivar')}</span>
        </div>
      )}

      {/* Fila en primer plano */}
      <div
        data-testid={`fila-guion-${g.id}`}
        // -portada con luz, 15-10-2026- el fondo de la cara, en clase: .fila-guion-cara -styles.css-.
        className="fila-guion-cara"
        // UN BOTON PARA TALKBACK -28-09-2026-. La fila abre el guion, pero era un div suelto: en
        // el arbol de accesibilidad del moto g86 no aparecia como algo tocable. Con Enter o
        // espacio abre, como un boton.
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onAbrir(g.id)
          }
        }}
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
          // MAS COMPACTA -28-09-2026-: 20 px de aire arriba y abajo era un tercio mas alto que la
          // propuesta profesional que trajo Javier. Los lados se quedan en 20.
          padding: 'var(--aire-3) var(--aire-4)',
          // -portada con luz, 15-10-2026- el fondo pasa a .fila-guion-cara -mismo var(--bg-panel)-.
          // Antes: backgroundColor: 'var(--bg-panel)',
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
        {/* La flecha a la derecha: el simbolo de "esto se abre" -28-09-2026-. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="texto-titulo" style={{ color: 'var(--color-texto)', marginBottom: 'var(--aire-1)' }}>
            {tituloMostrar} {g.archivado && <span style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)' }}>{t('marcaArchivado')}</span>}
          </div>
          <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
            {metaTexto}
          </div>
        </div>
        <IconoChevron tamano={18} className="flecha-fila" />
        </div>

        {/* MENU ADJUNTO AL MANTENER -boceto tarea 102, 06-10-2026-. Sustituye la fila
            alargada con Archivar + tacho + ✕. Cabecera = titulo del guion; Archivar;
            Borrar en rojo. Sin ✕: se cierra tocando afuera (useCerrarAfuera). Se ancla
            debajo de la fila para no tapar el "+" de crear. */}
        {/* Antes -hasta la tarea 102-: la fila se alargaba con una fila de botones chicos
            -.boton-menu-chico-: Archivar con su palabra, el tacho solo y una ✕ para cerrar.
            SIMBOLOS -28-09-2026-: Archivar con su palabra; Borrar -antes "Eliminar"- y
            Cerrar con el simbolo solo y su nombre en aria-label. Ver .boton-menu-chico. */}
        {/* -07-10-2026, Claude, revision de la 102- EN UN PORTAL, FIJO A LA PANTALLA. Dentro de la
            fila quedaba debajo de las miniaturas de Videos -medido en el moto g86 con "Hola", el
            ultimo guion: "Borrar" no se veia ni se podia tocar-. La fila lleva el transform del
            deslizamiento y eso encierra al menu en su capa: ningun z-index lo saca. Desde body, con
            colocarMenu -el mismo de Ajustes-, va debajo de la fila o arriba si no cabe, sin meterse
            bajo la barra de botones. Antes: el div iba aca, en linea, con .menu-adjunto-guion en
            position absolute -top 100% + 4, left 12-. */}
        {menuAbierto && createPortal(
          <div
            ref={(el) => {
              (refMenuFila as React.MutableRefObject<HTMLDivElement | null>).current = el
              refMenuEl.current = el
            }}
            data-testid={`menu-opciones-${g.id}`}
            className="menu-adjunto-guion"
            style={{ position: 'fixed', top: posMenu?.top ?? -9999, left: posMenu?.left ?? 0, right: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="menu-adjunto-guion-titulo">{tituloMostrar}</div>
            <button
              type="button"
              className="fila-menu-adjunto-guion"
              onClick={() => {
                onArchivar(g.id, !g.archivado)
                setMenuId(null)
              }}
            >
              <IconoArchivar tamano={22} />
              <span>{g.archivado ? t('desarchivar') : t('archivar')}</span>
            </button>
            <button
              type="button"
              className="fila-menu-adjunto-guion peligro"
              aria-label={t('borrar')}
              onClick={() => {
                onBorrar(g.id)
                setMenuId(null)
              }}
            >
              <IconoTacho tamano={22} strokeWidth={1.6} />
              <span>{t('borrar')}</span>
            </button>
          </div>,
          document.body
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
  onAbrirAjustes,
  onRegistrarCerrarModal,
  grabaciones = [],
  onAbrirGrabacion,
  onBorrarGrabacion,
  onBorrarTomas,
  'data-pantalla-direccion': dataPantallaDireccion,
  'aria-hidden': ariaHidden,
  style,
  onAnimationEnd
}: BibliotecaViewProps) {
  useTextos()
  const [busqueda, setBusqueda] = useState('')
  const [mostrarArchivados, setMostrarArchivados] = useState(false)
  const [mostrarPanelCorpus, setMostrarPanelCorpus] = useState(false)
  // -tarea 94- null: la barra de la portada. Con ids: la barra de selección.
  const [seleccionTomas, setSeleccionTomas] = useState<string[] | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  // 28-09-2026, tarea 77: el cajon de la portada -tema e idioma-, su estado y su arrastre se
  // fueron. El engranaje llama a onAbrirAjustes: la pantalla de Ajustes es capa de App.
  const refEngranajePortada = useRef<HTMLButtonElement | null>(null)
  // el menu de cada fila, que se abre con toque largo, se cierra igual que los demas
  const refMenuFila = useCerrarAfuera(menuId !== null, () => setMenuId(null))
  const [mapaTextos, setMapaTextos] = useState<Record<string, string>>({})

  const [esInicial] = useState<boolean>(esPrimerMontajeBiblioteca)

  // Plegada o desplegada -ver GUIONES_A_LA_VISTA-. animarDespliegue es true solo después del
  // toque en "Ver todos": al volver de un guion con la lista ya desplegada, las filas están
  // ahí, no entran de nuevo.
  const [desplegada, setDesplegada] = useState<boolean>(listaDesplegadaEnSesion)
  const [animarDespliegue, setAnimarDespliegue] = useState(false)
  // -atrás predictivo, 11-10-2026- Debajo del editor la biblioteca ya no se desmonta, y animarDespliegue
  // ya no vuelve solo a false al montarse de nuevo. Vuelve acá, al quedar tapada: al volver de un guion
  // con la lista desplegada, las filas están ahí, no entran de nuevo -T76-4, tarea76.test.tsx-.
  useEffect(() => {
    if (ariaHidden) setAnimarDespliegue(false)
  }, [ariaHidden])
  const idLista = useId()
  const refTituloGuiones = useRef<HTMLDivElement | null>(null)
  const refVerTodos = useRef<HTMLButtonElement | null>(null)
  const recienPlegadaRef = useRef(false)

  // -guia-sigo- La tarjeta muestra el guion no archivado más reciente.
  // Antes: const guionMasReciente = guiones.length > 0 ? guiones[0] : undefined
  const guionMasReciente = guionDeLaTarjeta(guiones)
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
    // EN PLAY LOS CINCO TOQUES NO ABREN NADA -tarea 84, B1, 29-09-2026-. Es el paso que pedía el
    // comentario de arriba: "antes de publicar, el panel de diagnostico se elimina". En la APK de
    // prueba sigue abriéndolo, porque es donde se afina el motor. No es un fallo mudo: para quien
    // usa Sigo desde Play la marca es solo la marca.
    if (!HERRAMIENTAS) return
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
        // Tarea 102 PASO 2: el menu del guion (mantener) cierra con atras antes de salir.
        if (menuId !== null) {
          setMenuId(null)
          return true
        }
        if (mostrarPanelCorpus) {
          setMostrarPanelCorpus(false)
          return true
        }
        // -tarea 94- el gesto de atrás sale del modo selección sin borrar.
        if (seleccionTomas) {
          setSeleccionTomas(null)
          return true
        }
        // 28-09-2026: el cajon de la portada se fue. Ajustes lo cierra App: es capa de App.
        return false
      // -atrás predictivo- Lo mismo que mira el cierre de arriba. Antes: })
      }, menuId !== null || mostrarPanelCorpus || seleccionTomas !== null)
    }
    return () => {
      if (onRegistrarCerrarModal) {
        onRegistrarCerrarModal(null)
      }
    }
  }, [menuId, mostrarPanelCorpus, seleccionTomas, onRegistrarCerrarModal])

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
      aria-hidden={ariaHidden}
      onAnimationEnd={onAnimationEnd}
      // -portada con luz, 15-10-2026- .portada: el contenedor al que se acotan las tres alturas -styles.css-.
      className="portada"
      // 20-10-2026: relleno lateral de 20 a 6 -arriba y abajo siguen en --aire-4, 20-. Medido en un Redmi de
      // 392 de ancho: las tarjetas quedaban a 36 del borde -16 del marco de App.tsx mas 20 de aqui-; ahora a 22.
      // Antes: padding: 'var(--aire-4)' -20 en los cuatro lados-.
      style={{ padding: 'var(--aire-4) 6px', maxWidth: 800, margin: '0 auto', position: 'relative', minHeight: '80vh', ...style }}
    >
      {/* EL FONDO CON LUZ: la luz de la marca -se desplaza con la portada- y el eco calido -fijo abajo a la
          derecha-. Detras de todo, sin tocar nada -pointer-events none, .portada-luz-marca y .portada-eco-calido-. */}
      <div className="portada-luz-marca" aria-hidden="true" />
      <div className="portada-eco-calido" aria-hidden="true" />
      {/* LA PORTADA, DE ARRIBA A ABAJO: marca, tu guion, tus guiones, tus
          videos. 24-09-2026, el dueno: "siento que queda debajo de las otras en
          nivel ... subamos el nivel con todo".
          Arriba, una barra fina con la marca y el engranaje. El engranaje vivia
          adentro de la tarjeta del guion y mezclaba "este guion" con "la
          aplicacion"; ahora la tarjeta es solo del guion. La marca ancla la
          pantalla: antes la portada empezaba con un hueco y la tarjeta. */}
      <header className="portada-cabeza" style={animacionTituloStyle}>
        {seleccionTomas && (
          <div className="barra-seleccion-tomas" data-testid="barra-seleccion-tomas">
            <button type="button" className="btn-deformable boton-portada" data-testid="btn-salir-seleccion" aria-label={t('cerrar')} onClick={() => setSeleccionTomas(null)}>
              <IconoCerrar tamano={22} />
            </button>
            {/* -tarea 94, revision, 05-10-2026, Javier- MARCAR TODAS VA CON LA CUENTA, LEJOS DEL TACHO.
                Con "Seleccionar todo" pegado al tacho se leia "borrar todo" y hacia dudar antes de
                borrar unas pocas. Ahora es una casilla junto a la cuenta, como en las apps de correo y de archivos de
                Android: marca todas, y si ya estan todas las desmarca -con cero, se sale del modo-. El
                tacho queda solo a la derecha. Antes: <span cuenta> y un boton de texto
                "Seleccionar todo" entre la cuenta y el tacho. */}
            {(() => {
              const ids = (grabaciones || []).map((g) => g.id)
              const todas = ids.length > 0 && ids.every((id) => seleccionTomas.includes(id))
              return (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={todas}
                  aria-label={t('seleccionarTodo')}
                  className="btn-deformable casilla-todas"
                  data-testid="btn-seleccionar-todo"
                  onClick={() => setSeleccionTomas(todas ? null : seleccionarTodas(ids))}
                >
                  <span className={`casilla-cuadro${todas ? ' marcada' : ''}`} aria-hidden="true">{todas ? '✓' : ''}</span>
                  <span className="cuenta-seleccion" data-testid="cuenta-seleccion" aria-live="polite">{t('tomasSeleccionadas', { n: seleccionTomas.length })}</span>
                </button>
              )
            })()}
            <button type="button" className="btn-deformable boton-portada" data-testid="btn-borrar-seleccion" aria-label={t('borrar')} disabled={seleccionTomas.length === 0} onClick={() => {
              onBorrarTomas?.(seleccionTomas)
              setSeleccionTomas(null)
            }}>
              <IconoTacho tamano={22} />
            </button>
          </div>
        )}
        {!seleccionTomas && (
        <>
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
        {/* 07-10-2026, Javier: "el sigo de la portada lo agrandaria un poquito". Pasa de 24 a 28
            de alto -unos 55 de ancho-. La entrada mide este elemento para aterrizar, asi que el viaje
            se ajusta solo. Antes: alto={24}. */}
        <div className="portada-marca" onClick={handleToqueMarcaDiag}>
          <MarcaSigo alto={28} data-marca-portada="" />
        </div>
        <button
          type="button"
          onClick={() => {
            onAbrirAjustes?.()
          }}
          ref={refEngranajePortada}
          data-testid="btn-menu-superior-biblioteca"
          className="btn-deformable boton-portada"
          title={t('ajustesApp')}
          aria-label={t('ajustesApp')}
        >
          <IconoEngranaje tamano={22} />
        </button>
        </>
        )}
      </header>

      {/* LO QUE VA DEBAJO DE LA BARRA ENTRA SUBIENDO. Mientras la marca viaja
          desde la entrada, esto pasa de transparente y 10 px mas abajo a su
          lugar -.portada-cuerpo y .entrada-en-curso, styles.css-. */}
      <div className="portada-cuerpo">

      {/* Tarjeta de Portada */}
      {/* 20 y no 32 entre la tarjeta y Guiones -28-09-2026-, la pasada de densidad. */}
      <div style={{ position: 'relative', marginBottom: 'var(--aire-4)', ...animacionTituloStyle }}>
        <TarjetaLectura
          guionResumen={guionMasReciente}
          onAbrir={() => {
            if (guionMasReciente) onAbrir(guionMasReciente.id)
          }}
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

      {/* LOS AJUSTES DE LA APLICACION. 24-09-2026: era un menu colgado del engranaje, con
          renglones sueltos -"la mitad del desorden", Javier 21-09-2026- que crecio hasta pasarse
          del borde de abajo; paso al cajon estandar con el tema en dos tarjetas y, desde la
          tarea 75, el idioma ES/EN. "Sistema" como tema se fue el 21-09-2026: seguir el horario
          del telefono no tiene que ver con filmar.
          28-09-2026, tarea 77: ESTE CAJON SE FUE. El engranaje abre la pantalla de Ajustes
          -PantallaAjustes.tsx-, la misma que la ficha Mas de LISTO; tema e idioma viven alla.
          El testid btn-menu-superior-biblioteca se queda en el engranaje. */}

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
        {/* Antes: <div className="texto-titulo titulo-seccion" style={{ color: 'var(--color-texto)', fontWeight: 600 }}> */}
        <div role="heading" aria-level={2} className="texto-titulo titulo-seccion" style={{ color: 'var(--color-texto)', fontWeight: 600 }}>
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
          {mostrarArchivados ? <IconoAtras tamano={18} /> : <IconoArchivar tamano={18} />}
          <span>{mostrarArchivados ? t('volverATusGuiones') : t('archivadosConteo', { n: cantidadArchivados })}</span>
        </button>
      )}

      {onAbrirGrabacion && onBorrarGrabacion && (
        <TiraGrabaciones
          grabaciones={grabaciones}
          onAbrir={onAbrirGrabacion}
          onBorrar={onBorrarGrabacion}
          guiones={guiones}
          seleccion={seleccionTomas}
          onEntrarSeleccion={(id) => setSeleccionTomas(entrarSeleccion(id))}
          onAlternarSeleccion={(id) => setSeleccionTomas((actual) => trasAlternar(actual || [], id))}
        />
      )}

      {/* Modal de PanelCorpus */}
      {/* Fuera del paquete de Play -tarea 84, B1-: HERRAMIENTAS queda en false al armar. */}
      {HERRAMIENTAS && mostrarPanelCorpus && (
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
            // TAREA 89 -04-10-2026-: la capa llega bajo las barras del sistema; cada lado suma su
            // borde seguro para que el panel no quede detrás de la barra de tres botones.
            paddingTop: 'calc(var(--aire-4) + env(safe-area-inset-top, 0px))',
            paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))',
            paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))'
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
