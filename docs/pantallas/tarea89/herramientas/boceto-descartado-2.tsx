// DESCARTADO -04-10-2026, 11:09, respuestas de Javier y Claude-: segunda versión del boceto. La
// reemplaza la tercera -boceto.tsx-: la barra de avance va bajo el video, sin barra de estado, con el
// recorte de 44 dp y los dos giros. Sus capturas y láminas están en descartado/segunda-version/.
// BOCETO DEL VISOR DE LADO, SEGUNDA VERSIÓN -tarea 89, defecto 2, 04-10-2026-. NO es código de la app:
// no lo importa nada de src/ y vite build no lo empaqueta. Reemplaza a boceto-descartado.tsx, que
// dibujaba una toma vertical vista de lado.
//
// CASO 1 -el principal-: una toma HORIZONTAL -16:9- revisada con el teléfono de lado. El video manda: a
// todo el alto y con todo el ancho que deja una columna angosta de controles al costado, del ancho del
// riel derecho de la tarea 82 -styles-horizontal.css:22, --riel-der: 124px-. Si no alcanza, la columna
// baja hasta 112 -el riel izquierdo de Leer, :20- y recién ahí se achica el video.
// CASO 2: una toma VERTICAL -9:16- vista de lado. El video a todo el alto y los controles juntos en una
// tarjeta de 320 -el ancho de los paneles de ficha de lado, docs/tarea82.txt:90-93-, a su lado.
//
// Piezas existentes de Sigo: las hojas de estilo y sus tokens, .tarjeta-elevada, .visor-video,
// .play-visor, .cerrar-visor, .barra-visor, .boton-visor, .avance-visor, .acciones-toma, .accion-toma,
// el SelectorSubtitulos de verdad, el fondo de los rieles --riel-fondo y --riel-borde, y los íconos de
// IconosApp. Lo nuevo es solo la disposición.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import { IconoGuardar, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar } from '../../../../src/components/IconosApp'
import { SelectorSubtitulos } from '../../../../src/components/SubtitulosVisor'
import { fijarIdioma } from '../../../../src/lib/idioma'

const q = new URLSearchParams(location.search)
const caso = q.get('caso') === '2' ? 2 : 1
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
const conBarra = q.get('barra') !== '0'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')

const W = window.innerWidth
const H = window.innerHeight
// LOS BORDES SEGUROS DE LADO -rotación 90, navegación de tres botones-. Valores de AOSP,
// frameworks/base/core/res/res/values/dimens.xml: navigation_bar_width 48dp -la barra va al costado-,
// status_bar_height_landscape = status_bar_height_portrait = 24dp. Con targetSdk 36 -android/
// variables.gradle:9- el borde a borde es obligatorio: las dos barras quedan ENCIMA de la app y la
// WebView las informa como env(safe-area-inset-right) y env(safe-area-inset-top). El recorte de la
// cámara de lado queda a la izquierda -rotación 90-; no se midió en el moto g86, aquí va en 0.
const IN = { arriba: 24, derecha: conBarra ? 48 : 0, abajo: 0, izquierda: 0 }

export const RIEL_DER = 124 // styles-horizontal.css:22
export const RIEL_IZQ_LEER = 112 // styles-horizontal.css:20

function BarraDeEstado() {
  const blanco = 'rgba(255,255,255,0.92)'
  return (
    <div style={{ position: 'fixed', top: 0, left: IN.izquierda, right: IN.derecha, height: IN.arriba, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', boxSizing: 'border-box', color: blanco, font: '500 13px Roboto, sans-serif', pointerEvents: 'none' }}>
      <span>10:53</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="14" height="12" viewBox="0 0 14 12"><path d="M7 11 0 3a10 10 0 0 1 14 0z" fill={blanco} /></svg>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M12 0v12H0z" fill={blanco} /></svg>
        <span style={{ width: 20, height: 10, border: `1.5px solid ${blanco}`, borderRadius: 2, position: 'relative', boxSizing: 'border-box' }}><span style={{ position: 'absolute', inset: 1, right: 5, background: blanco }} /></span>
      </span>
    </div>
  )
}

// La barra de tres botones de Android, de lado: 48 dp a la derecha, con el velo que Android 15 le pone
// a la navegación de tres botones en borde a borde. Chrome no tiene barra: se dibuja encima.
function BarraDeTresBotones() {
  if (!conBarra) return null
  const s: React.CSSProperties = { width: 16, height: 16, border: '2px solid #ddd', opacity: 0.9 }
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: IN.derecha, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
      <div style={{ ...s, borderRadius: 2 }} />
      <div style={{ ...s, borderRadius: '50%' }} />
      <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderRight: '14px solid #ddd' }} />
    </div>
  )
}

// Un cuadro de mentira con la proporción de la toma y un subtítulo como los del visor.
function VideoDeMentira({ ancho, alto, horizontal }: { ancho: number; alto: number; horizontal: boolean }) {
  const cabeza = Math.round(alto * (horizontal ? 0.22 : 0.16))
  return (
    <div style={{ position: 'relative', width: ancho, height: alto, overflow: 'hidden', background: 'linear-gradient(170deg,#4d6378 0%,#2b3a48 55%,#151c22 100%)' }}>
      <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: cabeza * 2.6, height: alto * 0.42, borderRadius: `${cabeza * 1.3}px ${cabeza * 1.3}px 0 0`, background: '#1e262d' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: alto * 0.40, transform: 'translateX(-50%)', width: cabeza, height: cabeza * 1.15, borderRadius: '50%', background: '#27313a' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: alto * 0.125, display: 'flex', justifyContent: 'center' }}>
        <span style={{ color: '#ffd500', font: `700 ${Math.round(alto * 0.05)}px Roboto, sans-serif`, background: 'rgba(0,0,0,.55)', padding: '2px 8px', borderRadius: 4 }}>que te sigue contigo</span>
      </div>
    </div>
  )
}

function Acciones({ columna, subtitulos }: { columna: boolean; subtitulos?: React.ReactNode }) {
  const guardar = <button type="button" className="accion-toma" aria-label="Guardar en la galería"><IconoGuardar tamano={26} /><span>Guardar</span></button>
  const repetir = <button type="button" className="accion-toma" aria-label="Repetir" style={columna ? { minHeight: 56 } : undefined}><IconoRepetir tamano={26} /></button>
  const borrar = <button type="button" className="accion-toma" aria-label="Borrar" style={columna ? { minHeight: 56 } : undefined}><IconoTacho tamano={26} strokeWidth={1.6} /></button>
  if (!columna) return <div className="acciones-toma">{guardar}{repetir}{borrar}</div>
  // En la columna, dos filas de dos: Guardar -con su palabra, como hoy- junto a Subtítulos -el CC con
  // el estilo elegido, que es con lo que se guarda-; debajo Repetir y Borrar. A 112 cada botón mide
  // 56 de ancho -el mínimo de toque es 48-.
  return (
    <div className="acciones-toma" data-medida="acciones" style={{ flexDirection: 'column', margin: 0 }}>
      <div style={{ display: 'flex' }}>{guardar}{subtitulos}</div>
      <div style={{ display: 'flex' }}>{repetir}{borrar}</div>
    </div>
  )
}

// CASO 1: video 16:9 a todo el alto a la izquierda; la columna al costado derecho, antes de la barra.
function Caso1() {
  const [estilo, setEstilo] = React.useState<any>('amarillo')
  const util = W - IN.izquierda - IN.derecha
  const videoIdeal = Math.round(H * 16 / 9)
  const columna = Math.max(RIEL_IZQ_LEER, util - videoIdeal)
  const anchoVideo = util - columna
  const altoVideo = Math.min(H, Math.round(anchoVideo * 9 / 16))
  ;(window as any).medidas = { caso: 1, W, H, IN, util, videoIdeal, columna, anchoVideo, altoVideo }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <div className="visor-video" data-medida="video" style={{ position: 'absolute', left: IN.izquierda, top: (H - altoVideo) / 2, width: anchoVideo, height: altoVideo }}>
        <VideoDeMentira ancho={anchoVideo} alto={altoVideo} horizontal />
        <span className="play-visor" aria-hidden="true"><IconoEmpezar tamano={30} /></span>
      </div>
      {/* La columna: el fondo y el borde de los rieles de la 82. Arriba, los 24 de la barra de estado
          quedan en el negro del visor -los íconos de sistema son claros, styles.xml-. */}
      <div data-medida="columna" style={{ position: 'absolute', top: 0, bottom: 0, right: IN.derecha, width: columna, boxSizing: 'border-box', background: 'var(--riel-fondo)', borderLeft: '1px solid var(--riel-borde)', color: 'var(--color-texto)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: IN.arriba, paddingBottom: IN.abajo }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: IN.arriba, background: '#111111' }} />
        <div style={{ padding: '4px 8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="cerrar-visor" aria-label="Cerrar" style={{ position: 'static', background: 'transparent', color: 'var(--color-texto)' }}><IconoCerrar tamano={22} /></button>
          </div>
          <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Larralde</div>
          <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>4:12</div>
        </div>
        <div style={{ padding: '0 8px' }}>
          <input type="range" className="avance-visor" min={0} max={252} step={0.1} defaultValue={64} style={{ width: '100%', height: 32, ['--avance' as any]: '25%' }} />
          {/* El total ya está bajo el nombre: aquí solo el tiempo actual, para que quepa en 112. */}
          <div className="barra-visor" style={{ padding: 0, marginLeft: -8 }}>
            <button type="button" className="boton-visor" aria-label="Reproducir"><IconoEmpezar tamano={20} /></button>
            <span>1:04</span>
          </div>
        </div>
        <Acciones columna subtitulos={<div className="columna-subtitulos"><SelectorSubtitulos estilo={estilo} onCambiar={setEstilo} /></div>} />
      </div>
      <style>{`
        /* En la columna el botón de subtítulos -el SelectorSubtitulos de verdad- se viste como una
           .accion-toma: el CC arriba y el estilo elegido abajo, sin la palabra "Subtítulos" ni la
           flecha -a 112 no cabe la fila de hoy-. Abierto, las cuatro opciones van en un panel a la
           izquierda de la columna, sobre el video, como los paneles de ficha de la 82. */
        .columna-subtitulos { flex: 1; display: flex; }
        .columna-subtitulos .selector-subtitulos { flex: 1; }
        .columna-subtitulos button.boton-subtitulos { flex-direction: column; justify-content: flex-start; gap: var(--aire-1); height: 100%; min-height: 64px; padding: var(--aire-3) 0; background: transparent; border: none; border-radius: 0; font-size: var(--texto-etiqueta); }
        .columna-subtitulos .boton-subtitulos-nombre, .columna-subtitulos .boton-subtitulos-flecha { display: none; }
        .columna-subtitulos .boton-subtitulos-valor { flex: none; text-align: center; color: var(--color-texto); }
        .columna-subtitulos button.boton-subtitulos > svg:first-child { width: 26px; height: 26px; }
      `}</style>
    </div>
  )
}

// CASO 2: video 9:16 a todo el alto, y a su lado la tarjeta de controles de 320, juntos y centrados.
function Caso2() {
  const [estilo, setEstilo] = React.useState<any>('amarillo')
  const util = W - IN.izquierda - IN.derecha
  const altoVideo = H
  const anchoVideo = Math.round(H * 9 / 16)
  const panel = 320
  const separacion = 16
  const grupo = anchoVideo + separacion + panel
  const margen = Math.round((util - grupo) / 2)
  ;(window as any).medidas = { caso: 2, W, H, IN, util, anchoVideo, altoVideo, panel, separacion, grupo, margen }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#111111' }}>
      <div className="visor-video" data-medida="video" style={{ position: 'absolute', left: IN.izquierda + margen, top: 0, width: anchoVideo, height: altoVideo }}>
        <VideoDeMentira ancho={anchoVideo} alto={altoVideo} horizontal={false} />
        <span className="play-visor" aria-hidden="true"><IconoEmpezar tamano={30} /></span>
      </div>
      <div style={{ position: 'absolute', left: IN.izquierda + margen + anchoVideo + separacion, top: IN.arriba, bottom: IN.abajo, width: panel, display: 'flex', alignItems: 'center' }}>
        <div className="tarjeta-elevada" data-medida="panel" style={{ width: '100%', background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: 'var(--aire-2) var(--aire-2) 0 var(--aire-3)' }}>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 'var(--aire-2)' }}>
              <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Larralde</div>
              <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>0:19</div>
            </div>
            <button type="button" className="cerrar-visor" aria-label="Cerrar" style={{ position: 'static', background: 'transparent', color: 'var(--color-texto)' }}><IconoCerrar tamano={22} /></button>
          </div>
          <div className="barra-visor">
            <button type="button" className="boton-visor" aria-label="Reproducir"><IconoEmpezar tamano={20} /></button>
            <span>0:04</span>
            <input type="range" className="avance-visor" min={0} max={19} step={0.1} defaultValue={4} style={{ ['--avance' as any]: '21%' }} />
            <span>0:19</span>
          </div>
          <div style={{ padding: 'var(--aire-2) var(--aire-3) 0' }}>
            <SelectorSubtitulos estilo={estilo} onCambiar={setEstilo} />
          </div>
          <Acciones columna={false} />
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <>
    {caso === 1 ? <Caso1 /> : <Caso2 />}
    <BarraDeEstado />
    <BarraDeTresBotones />
  </>
)
