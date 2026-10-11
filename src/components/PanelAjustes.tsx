// Antes -hasta 2026-10-11-: import React, { useEffect, useId, useRef, useState } from 'react'
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { App as CapacitorApp } from '@capacitor/app'
import {
  IconoAtras, IconoCerrar, IconoSubtitulos, IconoTema, IconoIdioma, IconoInfo, IconoCandado, IconoAyuda,
  IconoDocumento
} from './IconosApp'
import {
  AjustesLectura, FilaAjuste, MenuAdjuntoAjustes, CheckMenu, MuestraLectura, FilasLectura, FilasPantalla,
  MenuLectura, esMenuLectura, useAnclasLectura
} from './FilasAjustesLectura'
import { hayCalidad } from './FichasListo'
import { PantallaLicencias } from './PantallaLicencias'
import { ESTILOS_SUBTITULO, EstiloSubtitulo, estiloSubtituloGuardado, guardarEstiloSubtitulo } from '../lib/subtitulos'
import { IdiomaApp, idiomaApp, fijarIdioma } from '../lib/idioma'
import type { ClaveTexto } from '../textos'
import { t, useTextos } from '../textos'
import { CURVA_RESORTE, MS_CHICO, movimientoApagado } from './movimiento'
// -últimos detalles, 11-10-2026- De lado el panel va angosto y junto a la ficha que lo abrió.
import useLayout from '../hooks/useLayout'

// UN SOLO PANEL DE AJUSTES EN TODA LA APP -ajustes de pantallas, cuarta vuelta, 10-10-2026-.
//
// Javier: «Un solo panel de ajustes en toda la app: el de "Ajustes de la toma", que se abre en el lugar,
// de vidrio, sin oscurecer, y se cierra con la X o tocando afuera». Es el panel que vivía dentro de
// DockListo, sacado a un componente con las secciones como parámetro. Cada puerta pide las suyas
// -seccionesDeAjustes-:
//   portada  → Lectura, Pantalla, Apariencia -tema, idioma de la app- y Acerca de Sigo;
//   editor   → Lectura y Pantalla;
//   Leer     → Lectura y Pantalla;
//   Grabar   → Lectura, Video y Pantalla.
// El título es «Ajustes» en todas, salvo Grabar, que sigue diciendo «Ajustes de la toma».
//
// Va en dos envoltorios: el dock de LISTO -DockListo, que crece hacia arriba- y, donde no hay dock
// -portada, editor, la ficha Más de lado y en tableta-, PanelAjustesFlotante, que sube desde abajo solo
// lo que su contenido pide. Los dos son el mismo vidrio con el mismo borde -styles-ajustes.css-.
//
// Las filas de Apariencia y Acerca, sus menús y la subpantalla de Acerca vivían en PantallaAjustes; se
// mudaron aquí sin cambios de marcado ni de testid. Acerca de Sigo se abre dentro del mismo panel;
// Licencias sigue siendo su propia pantalla.

export type SeccionAjustes = 'lectura' | 'video' | 'pantalla' | 'apariencia' | 'acerca'
export type OrigenAjustes = 'portada' | 'editor' | 'leer' | 'grabar'

// Las secciones de cada puerta, en el orden en que se ven.
export function seccionesDeAjustes(origen: OrigenAjustes): SeccionAjustes[] {
  if (origen === 'portada') return ['lectura', 'pantalla', 'apariencia', 'acerca']
  if (origen === 'grabar') return ['lectura', 'video', 'pantalla']
  return ['lectura', 'pantalla']
}

// El título: «Ajustes» / «Settings» en todas las puertas; Grabar sigue con «Ajustes de la toma».
export function tituloDeAjustes(origen: OrigenAjustes): ClaveTexto {
  return origen === 'grabar' ? 'tituloAjustesToma' : 'tituloAjustes'
}

// Los nombres de los estilos, en el idioma de la app -los mismos de FichasListo y SubtitulosVisor-.
// Antes -hasta 2026-10-10, cuarta vuelta-: vivían en DockListo.tsx, que ya no dibuja la sección Video.
const CLAVE_SUBTITULO: Record<EstiloSubtitulo, ClaveTexto> = {
  no: 'subtitulosNo', amarillo: 'subtitulosAmarillo', rojo: 'subtitulosRojo', formal: 'subtitulosFormal'
}

// Privacidad y soporte se abren en el navegador del telefono. @capacitor/app no tiene openUrl
// -eso es de otro plugin-; en Android, Capacitor manda los enlaces externos al navegador del
// sistema, asi que window.open alcanza, y en la version web abre una pestana. 28-09-2026.
// -cuarta vuelta- Mudada sin cambios desde PantallaAjustes.tsx.
function abrirEnlace(url: string) {
  window.open(url, '_blank')
}

type MenuPanel = 'letra' | 'tipo' | 'ancho' | 'colores' | 'calidad' | 'subtitulos' | 'tema' | 'idioma' | null

// Lo de la sección Video: solo Grabar la tiene.
export interface DatosVideoAjustes {
  conCamara: boolean
  calidadVideo: string
  setCalidadVideo?: (q: string) => void
  calidadesSoportadas: string[]
  minutosDisponibles: number | null
}

export function PanelAjustes({
  origen,
  ajustesLectura,
  video,
  tema,
  setTema,
  onCerrar,
  onRegistrarCerrarDentro,
  hostMenus,
  animar = true
}: {
  origen: OrigenAjustes
  ajustesLectura: AjustesLectura
  video?: DatosVideoAjustes
  tema?: 'claro' | 'oscuro'
  setTema?: (v: 'claro' | 'oscuro') => void
  onCerrar: () => void
  // El gesto de atrás: menú abierto → Licencias → Acerca → -quien lo monta cierra el panel-.
  onRegistrarCerrarDentro?: (fn: (() => boolean) | null) => void
  // Los menús se dibujan afuera del vidrio, en este lugar -el envoltorio lo pone al lado-.
  hostMenus: HTMLElement | null
  // El panel crece hacia arriba con una animación corta, salvo que el envoltorio ya anime.
  animar?: boolean
}) {
  const idioma = useTextos()
  const secciones = seccionesDeAjustes(origen)
  const con = (s: SeccionAjustes) => secciones.includes(s)
  const idTitulo = useId()
  const [menu, setMenu] = useState<MenuPanel>(null)
  const [acerca, setAcerca] = useState(false)
  const [licencias, setLicencias] = useState(false)
  const anclasLectura = useAnclasLectura()
  const anclaCalidad = useRef<HTMLDivElement>(null)
  const anclaSubtitulos = useRef<HTMLDivElement>(null)
  const anclaTema = useRef<HTMLDivElement>(null)
  const anclaIdioma = useRef<HTMLDivElement>(null)
  // Los subtítulos: la MISMA clave que la ficha de hoy y el reproductor -sigo_subtitulos_estilo-.
  const [estiloSub, setEstiloSub] = useState<EstiloSubtitulo>(estiloSubtituloGuardado)
  const mostrarCalidad = !!video && hayCalidad(video.conCamara, video.calidadesSoportadas)
  const conMovimiento = animar && !movimientoApagado()

  // La version real, la del paquete -1.0 (457)-. Solo con Acerca de Sigo.
  const conAcerca = con('acerca')
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    // Solo en el telefono: en el navegador -y en las pruebas- el plugin no trae getInfo.
    if (!conAcerca || typeof (CapacitorApp as any).getInfo !== 'function') return
    try {
      CapacitorApp.getInfo()
        .then((i) => setVersion(`${i.version} (${i.build})`))
        .catch(() => setVersion(null))
    } catch {
      setVersion(null)
    }
  }, [conAcerca])

  // El gesto de atras: menu abierto → Licencias → Acerca → (quien lo monta cierra el panel).
  useEffect(() => {
    if (!onRegistrarCerrarDentro) return
    onRegistrarCerrarDentro(() => {
      if (menu !== null) {
        setMenu(null)
        return true
      }
      if (licencias) {
        setLicencias(false)
        return true
      }
      if (acerca) {
        setAcerca(false)
        return true
      }
      return false
    })
    return () => onRegistrarCerrarDentro(null)
  }, [menu, licencias, acerca, onRegistrarCerrarDentro])

  function alternarMenu(m: Exclude<MenuPanel, null>) {
    setMenu(menu === m ? null : m)
  }

  function elegirYCerrar(fn: () => void) {
    fn()
    setMenu(null)
  }

  const enlacePrivacidad = idioma === 'es'
    ? 'https://sigoteleprompter.com/privacidad'
    : 'https://sigoteleprompter.com/en/privacy'
  const enlaceSoporte = idioma === 'es'
    ? 'https://sigoteleprompter.com/soporte'
    : 'https://sigoteleprompter.com/en/support'

  const anclaActiva =
    menu === 'calidad' ? anclaCalidad
    : menu === 'subtitulos' ? anclaSubtitulos
    : menu === 'tema' ? anclaTema
    : menu === 'idioma' ? anclaIdioma
    : null

  const menus = menu && (
    <>
      {esMenuLectura(menu) && (
        <MenuLectura
          ajustes={ajustesLectura}
          anclas={anclasLectura}
          dialogo={menu}
          onCerrar={() => setMenu(null)}
        />
      )}
      {anclaActiva && (
        <MenuAdjuntoAjustes anclaRef={anclaActiva} onCerrar={() => setMenu(null)} testid={`dialogo-${menu}`}>
          {menu === 'calidad' && video && (
            <>
              <div className="lista-menu-adjunto">
                {video.calidadesSoportadas.map((q) => (
                  <button
                    key={q}
                    type="button"
                    data-testid={`btn-calidad-${q}`}
                    className={`fila-menu-adjunto${video.calidadVideo === q ? ' elegida' : ''}`}
                    role="menuitemradio"
                    aria-checked={video.calidadVideo === q}
                    onClick={() => elegirYCerrar(() => video.setCalidadVideo?.(q))}
                  >
                    <span className="fila-menu-adjunto-etiqueta">{q}</span>
                    <CheckMenu visible={video.calidadVideo === q} />
                  </button>
                ))}
              </div>
              {/* Lo que alcanza el espacio, como en el panel de la ficha de Calidad. */}
              {typeof video.minutosDisponibles === 'number' && (
                <div
                  data-testid="linea-minutos-disponibles"
                  className={`aviso-ficha menu-dock-aviso${video.minutosDisponibles < 2 ? ' aviso-ficha-urgente' : ''}`}
                >
                  {video.minutosDisponibles >= 2
                    ? t('minutosDisponibles', { n: Math.floor(video.minutosDisponibles) })
                    : t('menosDeDosMinutos')}
                </div>
              )}
            </>
          )}
          {menu === 'subtitulos' && (
            <div className="lista-menu-adjunto">
              {ESTILOS_SUBTITULO.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  data-testid={`btn-subtitulo-${e.valor}`}
                  className={`fila-menu-adjunto${estiloSub === e.valor ? ' elegida' : ''}`}
                  role="menuitemradio"
                  aria-checked={estiloSub === e.valor}
                  onClick={() => elegirYCerrar(() => {
                    setEstiloSub(e.valor)
                    guardarEstiloSubtitulo(e.valor)
                  })}
                >
                  <span className="fila-menu-adjunto-etiqueta">{t(CLAVE_SUBTITULO[e.valor])}</span>
                  <CheckMenu visible={estiloSub === e.valor} />
                </button>
              ))}
            </div>
          )}
          {menu === 'tema' && (
            <div className="lista-menu-adjunto">
              {([
                { v: 'oscuro' as const, n: t('temaOscuro') },
                { v: 'claro' as const, n: t('temaClaro') }
              ]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  className={`fila-menu-adjunto${tema === o.v ? ' elegida' : ''}`}
                  role="menuitemradio"
                  aria-label={o.n}
                  aria-checked={tema === o.v}
                  onClick={() => elegirYCerrar(() => setTema?.(o.v))}
                >
                  <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
                  <CheckMenu visible={tema === o.v} />
                </button>
              ))}
            </div>
          )}
          {menu === 'idioma' && (
            <div className="lista-menu-adjunto" data-testid="selector-idioma-app">
              {([
                { v: 'es' as IdiomaApp, n: 'Español' },
                { v: 'en' as IdiomaApp, n: 'English' }
              ]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  lang={o.v}
                  data-testid={`btn-idioma-${o.v}`}
                  className={`fila-menu-adjunto${idiomaApp() === o.v ? ' elegida' : ''}`}
                  role="menuitemradio"
                  aria-label={o.n}
                  aria-checked={idiomaApp() === o.v}
                  onClick={() => elegirYCerrar(() => fijarIdioma(o.v))}
                >
                  <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
                  <CheckMenu visible={idiomaApp() === o.v} />
                </button>
              ))}
            </div>
          )}
        </MenuAdjuntoAjustes>
      )}
    </>
  )

  return (
    <>
      <div
        className="dock-panel-ajustes"
        // Antes -hasta 2026-10-10, cuarta vuelta-: data-testid="panel-ajustes-toma" sin más, solo en el dock.
        // Es el mismo panel en todas las puertas: el mismo testid, y la puerta en data-origen.
        data-testid="panel-ajustes-toma"
        data-origen={origen}
        role="region"
        aria-labelledby={idTitulo}
        // Crece hacia arriba con una animación corta; sin movimiento si el sistema lo pide.
        style={conMovimiento ? { animation: `dock-crece ${MS_CHICO}ms ${CURVA_RESORTE} both` } : undefined}
      >
        {acerca ? (
          // ACERCA DE SIGO, EN EL MISMO PANEL -cuarta vuelta-. Antes era una subpantalla que tapaba todo
          // -PantallaAjustes, boceto tarea 102-: Versión, Privacidad, Soporte y Licencias, las mismas filas.
          <>
            <div className="dock-panel-cabeza panel-cabeza-con-volver">
              <button
                type="button"
                className="dock-panel-cerrar"
                data-testid="btn-cerrar-acerca"
                aria-label={t('volver')}
                onClick={() => setAcerca(false)}
              >
                <IconoAtras tamano={18} />
              </button>
              <h2 className="dock-panel-titulo" id={idTitulo}>{t('acercaDeSigo')}</h2>
              <button
                type="button"
                className="dock-panel-cerrar"
                data-testid="btn-cerrar-ajustes-toma"
                aria-label={t('cerrar')}
                onClick={onCerrar}
              >
                <IconoCerrar tamano={18} />
              </button>
            </div>
            <div className="dock-panel-cuerpo" data-testid="pantalla-acerca-sigo">
              <div className="fila-ajuste" data-testid="fila-version">
                <span className="fila-ajuste-icono" aria-hidden="true"><IconoInfo tamano={22} /></span>
                <div className="fila-ajuste-nombre">{t('version')}</div>
                <span className="fila-ajuste-valor">{version ?? '—'}</span>
              </div>
              <FilaAjuste
                testid="fila-privacidad"
                icono={<IconoCandado tamano={22} />}
                nombre={t('privacidad')}
                onClick={() => abrirEnlace(enlacePrivacidad)}
              />
              <FilaAjuste
                testid="fila-soporte"
                icono={<IconoAyuda tamano={22} />}
                nombre={t('soporte')}
                onClick={() => abrirEnlace(enlaceSoporte)}
              />
              <FilaAjuste
                testid="fila-licencias"
                icono={<IconoDocumento tamano={22} />}
                nombre={t('licencias')}
                onClick={() => setLicencias(true)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="dock-panel-cabeza">
              {/* Antes -hasta 2026-10-10, cuarta vuelta-: {t('tituloAjustesToma')} en todas. */}
              <h2 className="dock-panel-titulo" id={idTitulo}>{t(tituloDeAjustes(origen))}</h2>
              <button
                type="button"
                className="dock-panel-cerrar"
                data-testid="btn-cerrar-ajustes-toma"
                aria-label={t('cerrar')}
                onClick={onCerrar}
              >
                <IconoCerrar tamano={18} />
              </button>
            </div>
            {con('lectura') && <MuestraLectura ajustes={ajustesLectura} />}
            <div className="dock-panel-cuerpo">
              {con('lectura') && (
                <>
                  <h3 className="dock-seccion">{t('seccionLectura')}</h3>
                  <FilasLectura
                    ajustes={ajustesLectura}
                    anclas={anclasLectura}
                    dialogo={menu}
                    setDialogo={setMenu}
                  />
                </>
              )}
              {con('video') && video && (
                <>
                  <h3 className="dock-seccion">{t('seccionVideo')}</h3>
                  {/* Calidad, con la misma condición de hoy -hayCalidad-. Sin ícono: Calidad no tiene uno en
                      Sigo, y no se dibuja ninguno nuevo; el hueco del ícono queda para que alinee. */}
                  {mostrarCalidad && (
                    <div className="envoltorio-fila-con-menu" ref={anclaCalidad}>
                      <FilaAjuste
                        testid="fila-calidad"
                        icono={<span />}
                        nombre={t('calidad')}
                        valor={video.calidadVideo}
                        onClick={() => alternarMenu('calidad')}
                      />
                    </div>
                  )}
                  <div className="envoltorio-fila-con-menu" ref={anclaSubtitulos}>
                    <FilaAjuste
                      testid="fila-subtitulos"
                      icono={<IconoSubtitulos tamano={22} />}
                      nombre={t('subtitulos')}
                      valor={t(CLAVE_SUBTITULO[estiloSub])}
                      onClick={() => alternarMenu('subtitulos')}
                    />
                  </div>
                </>
              )}
              {con('pantalla') && (
                <>
                  <h3 className="dock-seccion">{t('seccionPantalla')}</h3>
                  <FilasPantalla ajustes={ajustesLectura} />
                </>
              )}
              {con('apariencia') && (
                <>
                  <h3 className="dock-seccion">{t('seccionApariencia')}</h3>
                  <div className="envoltorio-fila-con-menu" ref={anclaTema}>
                    <FilaAjuste
                      testid="fila-tema"
                      icono={<IconoTema tamano={22} />}
                      nombre={t('tema')}
                      valor={tema === 'claro' ? t('temaClaro') : t('temaOscuro')}
                      onClick={() => alternarMenu('tema')}
                    />
                  </div>
                  <div className="envoltorio-fila-con-menu" ref={anclaIdioma}>
                    <FilaAjuste
                      testid="fila-idioma"
                      icono={<IconoIdioma tamano={22} />}
                      nombre={t('idiomaDeLaApp')}
                      valor={idioma === 'es' ? 'Español' : 'English'}
                      onClick={() => alternarMenu('idioma')}
                    />
                  </div>
                </>
              )}
              {conAcerca && (
                <>
                  <h3 className="dock-seccion">{t('seccionAcerca')}</h3>
                  <FilaAjuste
                    testid="fila-acerca-de-sigo"
                    icono={<IconoInfo tamano={22} />}
                    nombre={t('acercaDeSigo')}
                    onClick={() => {
                      setMenu(null)
                      setAcerca(true)
                    }}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Los menús de las filas, afuera del vidrio -un fixed adentro de un ancestro que desenfoca se
          coloca contra él y no contra la pantalla-, en el lugar que pone el envoltorio. */}
      {menus && (hostMenus ? createPortal(menus, hostMenus) : menus)}

      {/* Licencias sigue siendo su propia pantalla, encima de todo y con el tema de la app. */}
      {licencias && createPortal(<PantallaLicencias onCerrar={() => setLicencias(false)} />, document.body)}
    </>
  )
}

// DONDE NO HAY DOCK -portada, editor, la ficha Más de lado y en tableta-: el mismo panel en el mismo
// vidrio, abajo, del alto que pide su contenido. No oscurece: la capa de atrás es transparente y tocarla
// lo cierra, como la X.
export function PanelAjustesFlotante({
  origen,
  onCerrar,
  ...resto
}: Omit<React.ComponentProps<typeof PanelAjustes>, 'hostMenus' | 'animar'>) {
  const [hostMenus, setHostMenus] = useState<HTMLDivElement | null>(null)
  const conMovimiento = !movimientoApagado()
  const layout = useLayout()
  const deLado = layout === 'tel-h' || layout === 'tab-h'
  // -ÚLTIMOS DETALLES DEL PR #87, 11-10-2026, Javier en el Redmi- Lo que cambia según dónde se abre, medido al
  // abrir:
  //   portada → el panel empieza debajo de la cabecera de la biblioteca -la marca y el engranaje enteros a la
  //             vista-; si el contenido no cabe, la lista se desplaza por dentro.
  //   de lado → 480 de ancho como máximo -styles-ajustes.css, .de-lado-, alineado con el borde de la ficha
  //             que lo abrió -Más en Leer, Ajustes de la segunda fila en Grabar-, del lado en que está.
  const [colocacion, setColocacion] = useState<React.CSSProperties>({})
  useLayoutEffect(() => {
    const estilo: React.CSSProperties = {}
    if (origen === 'portada') {
      const cabeza = document.querySelector('.portada-cabeza')
      const abajo = cabeza ? cabeza.getBoundingClientRect().bottom : 0
      // Si la cabecera se fue con el desplazamiento -abajo ≤ 0- queda el tope de siempre, el de la hoja.
      if (abajo > 0) {
        estilo.maxHeight = `calc(100% - ${Math.ceil(abajo)}px - var(--aire-2) - 10px - env(safe-area-inset-bottom, 0px))`
      }
    }
    if (deLado) {
      const ficha = document.querySelector('[data-testid="ficha-mas"], [data-testid="ficha-ajustes"]')
      const r = ficha ? ficha.getBoundingClientRect() : null
      const ancho = window.innerWidth
      if (r && r.left + r.width / 2 < ancho / 2) {
        estilo.left = `${Math.round(r.left)}px`
        estilo.right = 'auto'
      } else if (r) {
        estilo.right = `${Math.round(ancho - r.right)}px`
        estilo.left = 'auto'
      } else {
        estilo.left = 'auto'
      }
    }
    setColocacion(estilo)
  }, [origen, deLado])
  return (
    <>
      <button
        type="button"
        className="capa-panel-ajustes"
        data-testid="capa-panel-ajustes"
        aria-label={t('cerrar')}
        onClick={(e) => {
          e.stopPropagation()
          onCerrar()
        }}
      >
        {/* -últimos detalles- En el editor, entre el borde de abajo del panel y la barra del sistema asomaba el
            texto del guion: esa franja queda tapada con el suelo, como en Leer y Grabar, donde detrás está el
            lienzo. Es parte de la capa: tocarla cierra el panel, igual que afuera. */}
        {origen === 'editor' && <span className="franja-bajo-panel-ajustes" aria-hidden="true" />}
      </button>
      <div
        // Antes -hasta 2026-10-11-: className="panel-ajustes-flotante"
        className={`panel-ajustes-flotante${deLado ? ' de-lado' : ''}`}
        data-testid="panel-ajustes-flotante"
        data-origen={origen}
        // El vidrio es oscuro siempre, como el dock: adentro manda el tema oscuro.
        data-tema="oscuro"
        // Sube desde abajo con la misma animación del dock; sin movimiento si el sistema lo pide. Con relleno
        // backwards y no both: terminada, la animación no deja opacidad ni transformación puestas en la caja
        // del vidrio -con both la caja quedaba como raíz del fondo y su ::before no desenfocaba lo de atrás,
        // visto en Chromium con GPU-.
        // Antes -hasta 2026-10-11-: style={conMovimiento ? { animation: ... } : undefined}, sin colocación.
        style={conMovimiento ? { ...colocacion, animation: `dock-crece ${MS_CHICO}ms ${CURVA_RESORTE} backwards` } : colocacion}
        onClick={(e) => e.stopPropagation()}
      >
        <PanelAjustes origen={origen} onCerrar={onCerrar} {...resto} hostMenus={hostMenus} animar={false} />
      </div>
      <div data-tema="oscuro" className="menus-dock" ref={setHostMenus} />
    </>
  )
}
