// BOCETO DE LA TAREA 87 -04-10-2026-: "Para redes", "Guardar y compartir" y el tiempo estimado antes
// de guardar, en el visor de pie de main c03d734. NO es código de la app: no lo importa nada de src/ y
// vite build no lo empaqueta -solo arma index.html-. Está hecho como el de la tarea 89
// -docs/pantallas/tarea89/herramientas/boceto.tsx-: las mismas hojas de estilo y las piezas que ya
// existen -.tarjeta-elevada, .visor-video, .cerrar-visor, .play-visor, .barra-visor, .boton-visor,
// .avance-visor, .acciones-toma, .accion-toma; .panel-ficha-cabeza y .segmentado de las fichas de
// LISTO; .texto-meta; los íconos de IconosApp; CapaSubtitulos, SelectorSubtitulos y AvisoBreve de
// verdad-. Lo único nuevo es dónde se ponen y sus textos -propuestos en docs/tarea87.txt, A1 y E2-.
// "Hoy" es el ReproductorGrabacion de verdad, con lo nativo fingido -archivosNativosFingido.ts-.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import { IconoGuardar, IconoCompartir, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar } from '../../../../src/components/IconosApp'
import { CapaSubtitulos, SelectorSubtitulos } from '../../../../src/components/SubtitulosVisor'
import { AvisoBreve } from '../../../../src/components/AvisoBreve'
import ReproductorGrabacion from '../../../../src/components/ReproductorGrabacion'
import { grabacionNueva } from '../../../../src/datos/modelo'
import { formatearDuracionMs } from '../../../../src/components/TiraGrabaciones'
import { armarSubtitulos, EstiloSubtitulo } from '../../../../src/lib/subtitulos'
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
const ESTADO = 24
const BARRA = 48
const ALTO = 915
const CSS_BORDES = `
  [data-testid="reproductor-grabacion"] {
    padding-top: calc(var(--aire-4) + ${ESTADO}px) !important;
    padding-bottom: calc(var(--aire-4) + ${BARRA}px) !important;
  }
  /* 70vh de 915 dp: fijo, para que la captura de la tarjeta entera -más alta que la pantalla- no
     agrande el video. */
  [data-testid="video-grabacion"] { max-height: ${Math.round(ALTO * 0.7)}px !important; }
`
function BarrasDelSistema() {
  const s: React.CSSProperties = { width: 18, height: 18, border: '2px solid #ddd', opacity: 0.9 }
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ESTADO, background: 'rgba(0,0,0,0.82)', zIndex: 9999, color: '#ddd', font: '600 12px sans-serif', display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box' }}>15:18</div>
      <div data-barra="tres-botones" style={{ position: 'absolute', top: ALTO - BARRA, left: 0, right: 0, height: BARRA, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '16px solid #ddd' }} />
        <div style={{ ...s, borderRadius: '50%' }} />
        <div style={{ ...s, borderRadius: 2 }} />
      </div>
    </>
  )
}

// Las tomas de mentira -videos.sh-: vertical de 50 s, vertical de 5 min y horizontal de 50 s.
const VIDEOS = '/docs/pantallas/tarea87/herramientas/videos/'
function tomaDe(e: number) {
  const larga = e === 5 || e === 8
  const horizontal = e === 3
  const archivo = horizontal ? 'horizontal-50s' : larga ? 'vertical-5min' : 'vertical-50s'
  return grabacionNueva({
    id: `boceto-${e}`,
    tituloGuion: 'Larralde',
    duracionMs: larga ? 300000 : 50000,
    ruta: VIDEOS + archivo + '.mp4',
    ...(e === 6 || e === 7 ? { galeriaUri: 'content://media/boceto' } : {})
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
// y el 14 % de arriba de la zona de Meta.
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
    return () => video.removeEventListener('loadedmetadata', medir)
  }, [video])
  if (!guias || !r) return null
  const linea = (desdeAbajo: number, color: string, texto: string) => (
    <div style={{ position: 'absolute', left: r.x, width: r.w, top: r.y + r.h * (1 - desdeAbajo), borderTop: `1px dashed ${color}`, zIndex: 3, pointerEvents: 'none' }}>
      <span style={{ position: 'absolute', right: 4, top: -16, color, font: '600 11px sans-serif' }}>{texto}</span>
    </div>
  )
  return (
    <>
      {linea(0.125, '#7fd1ff', '0,125 · Normal')}
      {linea(0.35, '#ffb86b', '0,35 · Para redes')}
      {linea(0.86, '#bbbbbb', '14 % de arriba')}
    </>
  )
}

function Propuesta() {
  const toma = tomaDe(estado)
  const conSubs = estado !== 4
  const horizontal = estado === 3
  const guardada = estado === 6 || estado === 7
  const guardando = estado === 5
  const subtitulos = React.useMemo(() => (conSubs ? armarSubtitulos(registro) : []), [conSubs])
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null)
  const [estilo, setEstilo] = React.useState<EstiloSubtitulo>('amarillo')
  const [posicion, setPosicion] = React.useState<'normal' | 'redes'>(estado === 2 ? 'redes' : 'normal')
  usarSubtituloEn(posicion === 'redes' && !guardada ? 0.35 : null)
  const estiloVisible: EstiloSubtitulo = guardada ? 'no' : estilo
  // D3: el selector solo en una toma vertical recién grabada con subtítulos y estilo distinto de No.
  const conSelectorPosicion = !guardada && subtitulos.length > 0 && estilo !== 'no' && !horizontal
  // E2: desde 1 minuto, con subtítulos, sin guardar y sin estar guardando.
  const seg = !guardada && !guardando && subtitulos.length > 0 && estilo !== 'no' ? segundosEstimados(toma.duracionMs) : null
  const total = toma.duracionMs / 1000
  const actual = 3.5
  return (
    <div data-testid="reproductor-grabacion" style={{ position: 'fixed', inset: 0, background: '#111111', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'calc(var(--aire-4) + env(safe-area-inset-top, 0px))', paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))', paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))', paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div className="tarjeta-elevada" style={{ width: 'min(720px, 100%)', margin: 'auto', flexShrink: 0, background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', overflow: 'hidden' }}>
        <div className="visor-video">
          <button type="button" className="cerrar-visor" aria-label={t('cerrar')}><IconoCerrar tamano={22} /></button>
          <video ref={setVideo} data-testid="video-grabacion" src={toma.ruta} playsInline style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }} />
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
            <SelectorSubtitulos estilo={estilo} onCambiar={setEstilo} />
          </div>
        )}
        {/* NUEVO -A1, D3-: la posición, con la cabeza y el segmentado de las fichas de LISTO, y la
            línea chica con las redes debajo de "Para redes". */}
        {conSelectorPosicion && (
          <div data-testid="selector-posicion-subtitulos" style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
            <div className="panel-ficha-cabeza">
              <span>{TEXTOS_NUEVOS.posicionSubtitulos}</span>
              <span>{posicion === 'redes' ? TEXTOS_NUEVOS.posicionRedes : TEXTOS_NUEVOS.posicionNormal}</span>
            </div>
            <div className="segmentado" role="group" aria-label={TEXTOS_NUEVOS.posicionSubtitulos}>
              <button type="button" aria-pressed={posicion === 'normal'} className={`segmentado-opcion${posicion === 'normal' ? ' activa' : ''}`} onClick={() => setPosicion('normal')}><span>{TEXTOS_NUEVOS.posicionNormal}</span></button>
              <button type="button" aria-pressed={posicion === 'redes'} className={`segmentado-opcion${posicion === 'redes' ? ' activa' : ''}`} onClick={() => setPosicion('redes')}><span>{TEXTOS_NUEVOS.posicionRedes}</span></button>
            </div>
            {/* Alineada a la derecha: termina bajo "Para redes", en un solo renglón. */}
            <div className="texto-meta" style={{ textAlign: 'right', color: 'var(--color-apagado)', marginTop: 'var(--aire-1)' }}>{TEXTOS_NUEVOS.posicionRedesExplicacion}</div>
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
        <div className="acciones-toma">
          {guardada ? (
            <button type="button" className="accion-toma" aria-label={t('compartir')} title={t('compartir')}><IconoCompartir tamano={26} /></button>
          ) : (
            <>
              <button type="button" className="accion-toma" aria-label={t('guardarEnGaleria')} disabled={guardando}>
                <IconoGuardar tamano={26} />
                <span>{t('guardar')}</span>
              </button>
              {/* NUEVO -E1-: Guardar y compartir, con el avance mientras guarda -estado 5-. */}
              <button type="button" className="accion-toma" data-testid="btn-compartir-nueva" aria-label={TEXTOS_NUEVOS.guardarYCompartir} disabled={guardando}>
                <IconoCompartir tamano={26} />
                <span>{guardando ? t('guardandoAvance', { n: 37 }) : TEXTOS_NUEVOS.guardarYCompartir}</span>
              </button>
              <button type="button" className="accion-toma" aria-label={t('repetirToma')} title={t('repetirToma')}><IconoRepetir tamano={26} /></button>
            </>
          )}
          <button type="button" className="accion-toma" aria-label={t('borrar')} title={t('borrar')}><IconoTacho tamano={26} strokeWidth={1.6} /></button>
        </div>
      </div>
    </div>
  )
}

function Hoy() {
  const toma = tomaDe(estado)
  return <ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />
}

// El estado 6 -guardada, pero compartir falló- lleva encima el aviso breve de la App, el de verdad.
function Aviso() {
  if (modo !== 'propuesta' || estado !== 6) return null
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
