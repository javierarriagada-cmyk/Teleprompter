// BOCETO DE LA TAREA 87 -04-10-2026-: "Para redes", "Guardar y compartir" y el tiempo estimado antes
// de guardar, en el visor de pie de main c03d734. NO es código de la app: no lo importa nada de src/ y
// vite build no lo empaqueta -solo arma index.html-. Está hecho como el de la tarea 89
// -docs/pantallas/tarea89/herramientas/boceto.tsx-: las mismas hojas de estilo y las piezas que ya
// existen -.tarjeta-elevada, .visor-video, .cerrar-visor, .play-visor, .barra-visor, .boton-visor,
// .avance-visor, .acciones-toma, .accion-toma; .panel-ficha-cabeza y .segmentado de las fichas de
// LISTO; .texto-meta; los íconos de IconosApp; CapaSubtitulos, SelectorSubtitulos y AvisoBreve de
// verdad-. Lo único nuevo es dónde se ponen y sus textos -propuestos en docs/tarea87.txt, A1 y E2-.
// "Hoy" es el ReproductorGrabacion de verdad, con lo nativo fingido -archivosNativosFingido.ts-.
//
// SEGUNDA VUELTA -04-10-2026, revisión de Claude-: (1) la fila de acciones queda FIJA abajo, sobre la
// barra del sistema, y el video se achica para que el resto quepa arriba -ver altoDelVideo-; (2)
// Posición va DENTRO del panel de Subtítulos -se abre con la ficha-, no siempre a la vista; (3) las
// guías punteadas son del boceto, no de la app, y lo dicen. Guardando: solo el botón apretado muestra
// el avance y los otros quedan desactivados. Dos navegaciones: ?nav=botones -48 dp- y ?nav=gestos.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import { IconoGuardar, IconoCompartir, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar, IconoSubtitulos } from '../../../../src/components/IconosApp'
import { CapaSubtitulos } from '../../../../src/components/SubtitulosVisor'
import { AvisoBreve } from '../../../../src/components/AvisoBreve'
import ReproductorGrabacion from '../../../../src/components/ReproductorGrabacion'
import { grabacionNueva } from '../../../../src/datos/modelo'
import { formatearDuracionMs } from '../../../../src/components/TiraGrabaciones'
import { armarSubtitulos, EstiloSubtitulo, ESTILOS_SUBTITULO } from '../../../../src/lib/subtitulos'
import { fijarIdioma } from '../../../../src/lib/idioma'
import { t } from '../../../../src/textos'
import registro from '../../../../src/pruebas/corpus/toma-008a7133-palabras.motor.txt?raw'

const q = new URLSearchParams(location.search)
const modo = q.get('modo') || 'propuesta'
const estado = Number(q.get('estado') || '1')
const guias = q.get('guias') === 'si'
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')

// Los textos nuevos, como se proponen para es.ts -docs/tarea87.txt, A1 y E2; Javier los confirma-.
const TEXTOS_NUEVOS = {
  posicionSubtitulos: 'Posición',
  posicionNormal: 'Normal',
  posicionRedes: 'Para redes',
  posicionRedesExplicacion: 'Instagram, TikTok y YouTube Shorts',
  guardarYCompartir: 'Guardar y compartir',
  compartirTrasGuardar: 'Quedó guardada, pero no se pudo compartir',
  tiempoEstimadoGuardado: 'Guardar tarda alrededor de {tiempo}'
}

// E2: ~11,2 s por minuto de toma -moto g86, paso 0-, desde 1 minuto, redondeado hacia arriba de a 5 s.
function segundosEstimados(duracionMs: number): number | null {
  if (!(duracionMs >= 60000)) return null
  return Math.ceil((duracionMs * 11200 / 60000) / 5000) * 5
}
function textoTiempo(s: number): string {
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r === 0 ? `${m} min` : `${m} min ${r} s`
}

// LAS BARRAS DEL SISTEMA, DE PIE: la de estado arriba -24 dp- y la de tres botones abajo -48 dp-,
// como en el moto g86. Chrome no las tiene: se dibujan encima, y la raíz del visor suma esos bordes
// como lo hace en el teléfono desde la tarea 89 -env(safe-area-inset-*), que en Chrome vale 0-.
// -04-10, segunda vuelta- Con navegación por gestos, la franja de abajo mide 24 dp -lo que Android
// documenta para la barra de gestos; el borde seguro de abajo es ese alto-. ?nav=gestos.
const nav = q.get('nav') === 'gestos' ? 'gestos' : 'botones'
const ESTADO = 24
const BARRA = nav === 'gestos' ? 24 : 48
const ALTO = 915
const CSS_BORDES = `
  [data-testid="reproductor-grabacion"] {
    padding-top: calc(var(--aire-4) + ${ESTADO}px) !important;
    padding-bottom: calc(var(--aire-4) + ${BARRA}px) !important;
  }
  /* 70vh de 915 dp: fijo, para que la captura de la tarjeta entera -más alta que la pantalla- no
     agrande el video. Solo en "hoy": el boceto calcula el suyo. */
  [data-modo="hoy"] [data-testid="video-grabacion"] { max-height: ${Math.round(ALTO * 0.7)}px !important; }
`
function BarrasDelSistema() {
  const s: React.CSSProperties = { width: 18, height: 18, border: '2px solid #ddd', opacity: 0.9 }
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ESTADO, background: 'rgba(0,0,0,0.82)', zIndex: 9999, color: '#ddd', font: '600 12px sans-serif', display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box' }}>15:18</div>
      {nav === 'botones' ? (
        <div data-barra="sistema" style={{ position: 'absolute', top: ALTO - BARRA, left: 0, right: 0, height: BARRA, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '16px solid #ddd' }} />
          <div style={{ ...s, borderRadius: '50%' }} />
          <div style={{ ...s, borderRadius: 2 }} />
        </div>
      ) : (
        <div data-barra="sistema" style={{ position: 'absolute', top: ALTO - BARRA, left: 0, right: 0, height: BARRA, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 108, height: 4, borderRadius: 2, background: '#ddd' }} />
        </div>
      )}
    </>
  )
}

// Las tomas de mentira -videos.sh-: vertical de 50 s, vertical de 5 min y horizontal de 50 s.
// -04-10, segunda vuelta- Los estados se renumeraron -ver ESTADOS y medidas-implementacion.md-.
const VIDEOS = '/docs/pantallas/tarea87/herramientas/videos/'
type Estado = { panel: boolean; redes: boolean; horizontal: boolean; subs: boolean; larga: boolean; guardando: boolean; guardada: boolean; aviso: boolean }
const E = (o: Partial<Estado>): Estado => ({ panel: false, redes: false, horizontal: false, subs: true, larga: false, guardando: false, guardada: false, aviso: false, ...o })
const ESTADOS: Record<number, Estado> = {
  1: E({}),                                   // vertical con subtítulos, panel cerrado, Normal
  2: E({ panel: true }),                      // panel de Subtítulos abierto, con Posición en Normal
  3: E({ panel: true, redes: true }),         // abierto, Para redes: el subtítulo sube
  4: E({ redes: true }),                      // cerrado otra vez, en Para redes: la ficha lo resume
  5: E({ horizontal: true }),                 // horizontal con subtítulos: sin Posición
  6: E({ subs: false }),                      // sin subtítulos -sin registro-
  7: E({ larga: true, guardando: true }),     // guardando una toma de 5 min
  8: E({ guardada: true, aviso: true }),      // guardada, pero no se pudo compartir
  9: E({ guardada: true }),                   // ya guardada: como hoy
  10: E({ larga: true })                      // toma de 5 min: el tiempo estimado
}
const est = ESTADOS[estado] || ESTADOS[1]
function tomaDe(e: Estado) {
  const archivo = e.horizontal ? 'horizontal-50s' : e.larga ? 'vertical-5min' : 'vertical-50s'
  return grabacionNueva({
    id: `boceto-${estado}`,
    tituloGuion: 'Larralde',
    duracionMs: e.larga ? 300000 : 50000,
    ruta: VIDEOS + archivo + '.mp4',
    ...(e.guardada ? { galeriaUri: 'content://media/boceto' } : {})
  } as any)
}

// EL SUBTÍTULO "PARA REDES" EN EL VISOR -D3-: CapaSubtitulos hoy deja el margen fijo en 0,125 del
// alto de la imagen. Aquí se sube a mano a 0,35 para ver dónde queda; en la app lo hará la prop
// margenAbajo. Cada cuadro, por si CapaSubtitulos vuelve a dibujar.
function usarSubtituloEn(margen: number | null) {
  React.useEffect(() => {
    if (margen === null) return
    let id = 0
    const paso = () => {
      document.querySelectorAll<HTMLElement>('.subtitulo').forEach((el) => {
        const h = (el.parentElement as HTMLElement).clientHeight
        el.style.marginBottom = `${h * margen}px`
      })
      id = requestAnimationFrame(paso)
    }
    paso()
    return () => cancelAnimationFrame(id)
  }, [margen])
}

// Las guías -solo en la lámina resumen, ?guias=si-: 0,125 y 0,35 del alto de la imagen, desde abajo,
// y el 14 % de arriba de la zona de Meta. -04-10, segunda vuelta- SON DEL BOCETO, NO DE LA APP: lo
// dicen en la imagen misma.
function Guias({ video }: { video: HTMLVideoElement | null }) {
  const [r, setR] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)
  React.useEffect(() => {
    if (!video) return
    const medir = () => {
      const ew = video.clientWidth, eh = video.clientHeight, vw = video.videoWidth, vh = video.videoHeight
      if (!ew || !eh || !vw || !vh) return
      const k = Math.min(ew / vw, eh / vh)
      setR({ x: (ew - vw * k) / 2, y: (eh - vh * k) / 2, w: vw * k, h: vh * k })
    }
    medir()
    video.addEventListener('loadedmetadata', medir)
    const obs = new ResizeObserver(medir)
    obs.observe(video)
    return () => { video.removeEventListener('loadedmetadata', medir); obs.disconnect() }
  }, [video])
  if (!guias || !r) return null
  const linea = (desdeAbajo: number, color: string, texto: string) => (
    <div style={{ position: 'absolute', left: r.x, width: r.w, top: r.y + r.h * (1 - desdeAbajo), borderTop: `1px dashed ${color}`, zIndex: 3, pointerEvents: 'none' }}>
      <span style={{ position: 'absolute', right: 4, top: 2, color, font: '600 10px sans-serif' }}>{texto}</span>
    </div>
  )
  return (
    <>
      {linea(0.125, '#7fd1ff', '0,125 · Normal')}
      {linea(0.35, '#ffb86b', '0,35 · Para redes')}
      {linea(0.86, '#bbbbbb', '14 % de arriba')}
      <div style={{ position: 'absolute', left: r.x + 4, top: r.y + 4, zIndex: 3, pointerEvents: 'none', background: 'rgba(229,72,77,0.9)', color: '#fff', font: '700 10px sans-serif', padding: '2px 5px', borderRadius: 3 }}>GUÍAS DEL BOCETO · no van en la app</div>
    </>
  )
}

// LA FICHA DE SUBTÍTULOS CON POSICIÓN ADENTRO -A1 y D3, corrección (2)-. El mismo marcado y las mismas
// clases que SelectorSubtitulos -SubtitulosVisor.tsx:148-: la píldora .boton-subtitulos que se
// despliega y las cuatro .opcion-subtitulos. Lo nuevo va debajo de las cuatro, dentro del panel: la
// cabeza .panel-ficha-cabeza y el .segmentado de las fichas de LISTO, y la línea de las redes.
// Elegir un estilo cierra el panel, como hoy; elegir la posición NO lo cierra, para ver el subtítulo
// moverse arriba -propuesta-. Con Para redes, la píldora dice "Amarillo · Para redes".
function MuestraBoceto({ estilo }: { estilo: EstiloSubtitulo }) {
  return (
    <span className="muestra-subtitulo" data-estilo={estilo}>
      <span data-estado="dicha">A</span><span data-estado={estilo === 'no' ? 'dicha' : 'por-decir'}>a</span>
    </span>
  )
}
const NOMBRES: Record<EstiloSubtitulo, string> = { no: 'No', amarillo: 'Amarillo', rojo: 'Rojo', formal: 'Formal' }
function FichaSubtitulos({ estilo, onEstilo, abierto, onAbrir, posicion, onPosicion, conPosicion, desactivada }: {
  estilo: EstiloSubtitulo; onEstilo: (e: EstiloSubtitulo) => void; abierto: boolean; onAbrir: (a: boolean) => void
  posicion: 'normal' | 'redes'; onPosicion: (p: 'normal' | 'redes') => void; conPosicion: boolean; desactivada: boolean
}) {
  const valor = NOMBRES[estilo] + (conPosicion && posicion === 'redes' ? ` · ${TEXTOS_NUEVOS.posicionRedes}` : '')
  return (
    <div className="selector-subtitulos">
      <button type="button" data-testid="btn-subtitulos" aria-expanded={abierto} disabled={desactivada}
        className={`btn-deformable boton-subtitulos${estilo !== 'no' ? ' con-subtitulos' : ''}`}
        style={desactivada ? { opacity: 0.7 } : undefined}
        onClick={() => onAbrir(!abierto)}>
        <IconoSubtitulos tamano={20} />
        <span className="boton-subtitulos-nombre">{t('subtitulos')}</span>
        <span className="boton-subtitulos-valor">{valor}</span>
        <svg className="boton-subtitulos-flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {abierto && (
        <>
          <div className="opciones-subtitulos" role="group" aria-label={t('subtitulos')} style={{ animation: 'none' }}>
            {ESTILOS_SUBTITULO.map((e) => (
              <button key={e.valor} type="button" aria-pressed={estilo === e.valor} aria-label={NOMBRES[e.valor]}
                className={`btn-deformable opcion-subtitulos${estilo === e.valor ? ' activa' : ''}`}
                onClick={() => { onEstilo(e.valor); onAbrir(false) }}>
                <MuestraBoceto estilo={e.valor} />
                <span className="opcion-subtitulos-nombre">{NOMBRES[e.valor]}</span>
              </button>
            ))}
          </div>
          {conPosicion && (
            <div data-testid="selector-posicion-subtitulos" style={{ marginTop: 'var(--aire-1)' }}>
              <div className="panel-ficha-cabeza">
                <span>{TEXTOS_NUEVOS.posicionSubtitulos}</span>
                <span>{posicion === 'redes' ? TEXTOS_NUEVOS.posicionRedes : TEXTOS_NUEVOS.posicionNormal}</span>
              </div>
              <div className="segmentado" role="group" aria-label={TEXTOS_NUEVOS.posicionSubtitulos}>
                <button type="button" data-testid="btn-posicion-normal" aria-pressed={posicion === 'normal'} className={`segmentado-opcion${posicion === 'normal' ? ' activa' : ''}`} onClick={() => onPosicion('normal')}><span>{TEXTOS_NUEVOS.posicionNormal}</span></button>
                <button type="button" data-testid="btn-posicion-redes" aria-pressed={posicion === 'redes'} className={`segmentado-opcion${posicion === 'redes' ? ' activa' : ''}`} onClick={() => onPosicion('redes')}><span>{TEXTOS_NUEVOS.posicionRedes}</span></button>
              </div>
              {/* Alineada a la derecha: termina bajo "Para redes", en un solo renglón. */}
              <div className="texto-meta" style={{ textAlign: 'right', color: 'var(--color-apagado)', marginTop: 'var(--aire-1)' }}>{TEXTOS_NUEVOS.posicionRedesExplicacion}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// EL ALTO DEL VIDEO -corrección (1)-. La tarjeta mide como mucho el alto disponible -la raíz menos
// sus bordes seguros y su aire-. Lo que no es video -barra de avance, ficha, nombre y acciones- se
// mide; el video toma lo que queda, sin pasar de 70vh -como hoy- ni bajar de VIDEO_MIN. Si ni con
// el video en VIDEO_MIN cabe -no pasa en 412x915, ver medidas-, lo de arriba de las acciones se
// desplaza y las acciones no.
const VIDEO_MIN = 240
function usarAltoDelVideo(raiz: React.RefObject<HTMLDivElement>, tarjeta: React.RefObject<HTMLDivElement>, videoCaja: React.RefObject<HTMLDivElement>) {
  const [alto, setAlto] = React.useState<number>(Math.round(ALTO * 0.7))
  React.useLayoutEffect(() => {
    const medir = () => {
      const r = raiz.current, c = tarjeta.current, v = videoCaja.current
      if (!r || !c || !v) return
      const cs = getComputedStyle(r)
      const disponible = r.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      // Lo de arriba completo -aunque se esté desplazando- más las acciones, menos el video.
      const arriba = c.querySelector('[data-testid="visor-arriba"]') as HTMLElement
      const acciones = c.querySelector('[data-testid="acciones-fijas"]') as HTMLElement
      // .acciones-toma trae margin-top var(--aire-3) -styles.css:1475-: también cuenta.
      const resto = arriba.scrollHeight - v.offsetHeight + acciones.offsetHeight + parseFloat(getComputedStyle(acciones).marginTop) + (c.offsetHeight - c.clientHeight)
      const tope = Math.round(window.innerHeight * 0.7)
      setAlto(Math.max(VIDEO_MIN, Math.min(tope, Math.floor(disponible - resto))))
    }
    medir()
    const obs = new ResizeObserver(medir)
    if (tarjeta.current) obs.observe(tarjeta.current)
    return () => obs.disconnect()
  })
  return alto
}

function Propuesta() {
  const toma = tomaDe(est)
  const guardada = est.guardada
  const guardando = est.guardando
  const subtitulos = React.useMemo(() => (est.subs ? armarSubtitulos(registro) : []), [])
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null)
  const [estilo, setEstilo] = React.useState<EstiloSubtitulo>('amarillo')
  const [abierto, setAbierto] = React.useState(est.panel)
  const [posicion, setPosicion] = React.useState<'normal' | 'redes'>(est.redes ? 'redes' : 'normal')
  usarSubtituloEn(posicion === 'redes' && !guardada ? 0.35 : null)
  const estiloVisible: EstiloSubtitulo = guardada ? 'no' : estilo
  // D3: Posición solo en una toma vertical recién grabada con subtítulos y estilo distinto de No.
  const conPosicion = !guardada && subtitulos.length > 0 && estilo !== 'no' && !est.horizontal
  // E2: desde 1 minuto, con subtítulos, sin guardar y sin estar guardando.
  const seg = !guardada && !guardando && subtitulos.length > 0 && estilo !== 'no' ? segundosEstimados(toma.duracionMs) : null
  const total = toma.duracionMs / 1000
  const actual = 3.5
  const raiz = React.useRef<HTMLDivElement>(null)
  const tarjeta = React.useRef<HTMLDivElement>(null)
  const videoCaja = React.useRef<HTMLDivElement>(null)
  const altoVideo = usarAltoDelVideo(raiz, tarjeta, videoCaja)
  return (
    <div ref={raiz} data-testid="reproductor-grabacion" style={{ position: 'fixed', inset: 0, background: '#111111', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 'calc(var(--aire-4) + env(safe-area-inset-top, 0px))', paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))', paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))', paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* La tarjeta: columna, como mucho del alto disponible. Arriba lo que se puede desplazar; abajo,
          fuera de eso, las acciones. */}
      <div ref={tarjeta} className="tarjeta-elevada" style={{ width: 'min(720px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', overflow: 'hidden' }}>
        <div data-testid="visor-arriba" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
          <div ref={videoCaja} className="visor-video">
            <button type="button" className="cerrar-visor" aria-label={t('cerrar')}><IconoCerrar tamano={22} /></button>
            <video ref={setVideo} data-testid="video-grabacion" src={toma.ruta} playsInline style={{ width: '100%', maxHeight: altoVideo, background: '#000', display: 'block' }} />
            {subtitulos.length > 0 && <CapaSubtitulos video={video} subtitulos={subtitulos} estilo={estiloVisible} />}
            <Guias video={video} />
            <span className="play-visor" aria-hidden="true"><IconoEmpezar tamano={30} /></span>
          </div>
          <div className="barra-visor">
            <button type="button" className="boton-visor" aria-label={t('reproducir')}><IconoEmpezar tamano={20} /></button>
            <span>0:03</span>
            <input type="range" className="avance-visor" min={0} max={total} step={0.1} defaultValue={actual} style={{ ['--avance' as any]: `${(actual / total) * 100}%` }} />
            <span>{formatearDuracionMs(toma.duracionMs)}</span>
          </div>
          {subtitulos.length > 0 && !guardada && (
            <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
              <FichaSubtitulos estilo={estilo} onEstilo={setEstilo} abierto={abierto} onAbrir={setAbierto}
                posicion={posicion} onPosicion={setPosicion} conPosicion={conPosicion} desactivada={guardando} />
            </div>
          )}
          <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
            <div style={{ fontWeight: 700 }}>Larralde</div>
            <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>{formatearDuracionMs(toma.duracionMs)}</div>
            {/* NUEVO -E2-: el tiempo estimado antes de guardar, en la segunda línea meta. */}
            {seg !== null && (
              <div data-testid="tiempo-estimado-guardado" className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
                {TEXTOS_NUEVOS.tiempoEstimadoGuardado.replace('{tiempo}', textoTiempo(seg))}
              </div>
            )}
          </div>
        </div>
        {/* LAS ACCIONES, FIJAS ABAJO -corrección (1)-: fuera de lo que se desplaza, flexShrink 0. */}
        <div className="acciones-toma" data-testid="acciones-fijas" style={{ flexShrink: 0 }}>
          {guardada ? (
            <button type="button" className="accion-toma" aria-label={t('compartir')} title={t('compartir')}><IconoCompartir tamano={26} /></button>
          ) : (
            <>
              <button type="button" className="accion-toma" aria-label={t('guardarEnGaleria')} disabled={guardando}>
                <IconoGuardar tamano={26} />
                <span>{t('guardar')}</span>
              </button>
              {/* NUEVO -E1-: Guardar y compartir. En el estado 7 es el apretado: muestra el avance y
                  queda activo a la vista -no se puede volver a tocar mientras guarda-; los otros tres,
                  desactivados -respuesta de Claude del 04-10-. */}
              <button type="button" className="accion-toma" data-testid="btn-compartir-nueva" aria-label={TEXTOS_NUEVOS.guardarYCompartir} aria-busy={guardando}>
                <IconoCompartir tamano={26} />
                <span>{guardando ? t('guardandoAvance', { n: 37 }) : TEXTOS_NUEVOS.guardarYCompartir}</span>
              </button>
              <button type="button" className="accion-toma" aria-label={t('repetirToma')} title={t('repetirToma')} disabled={guardando}><IconoRepetir tamano={26} /></button>
            </>
          )}
          <button type="button" className="accion-toma" aria-label={t('borrar')} title={t('borrar')} disabled={guardando}><IconoTacho tamano={26} strokeWidth={1.6} /></button>
        </div>
      </div>
    </div>
  )
}

function Hoy() {
  const toma = tomaDe(est)
  return (
    <div data-modo="hoy">
      <ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />
    </div>
  )
}

// El estado 8 -guardada, pero compartir falló- lleva encima el aviso breve de la App, el de verdad.
function Aviso() {
  if (modo !== 'propuesta' || !est.aviso) return null
  return <AvisoBreve avisoInfo={{ texto: TEXTOS_NUEVOS.compartirTrasGuardar }} enLectura={false} cerrarAviso={() => {}} />
}

createRoot(document.getElementById('root')!).render(
  <>
    <style>{CSS_BORDES}</style>
    {modo === 'hoy' ? <Hoy /> : <Propuesta />}
    <Aviso />
    <BarrasDelSistema />
  </>
)
