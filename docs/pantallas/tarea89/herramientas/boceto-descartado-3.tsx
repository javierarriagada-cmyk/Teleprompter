// DESCARTADO -04-10-2026, 11:26, revisión de Claude-: tercera versión del boceto. Claude la aprobó
// con dos ajustes que hace la cuarta -boceto.tsx-: el visor de lado siempre oscuro, también en tema
// claro, y los rótulos de la columna de 12 como mínimo con toque de 48. Sus capturas, láminas y
// medidas-de-lado.json están en descartado/tercera-version/.
// BOCETO DEL VISOR DE LADO, TERCERA VERSIÓN -tarea 89, defecto 2, 04-10-2026, 11:09-. NO es código de la
// app: no lo importa nada de src/ y vite build no lo empaqueta. Ajusta la segunda -boceto-descartado-2.tsx-
// con las respuestas de Javier y Claude:
//   1. La barra de avance va DEBAJO del video, a todo su ancho -la .barra-visor de hoy, 48 de alto-: el
//      video pierde esos 48 de alto, la barra queda precisa y no tapa los subtítulos.
//   2. Sin barra de estado: SystemBars.hide({ bar: SystemBarType.StatusBar }) de @capacitor/core 8, que
//      Sigo ya usa -App.tsx:2 y :314-319-. Ver medidas-implementacion.md.
//   3. El recorte de la cámara del moto g86: 125 px = 44 dp -densidad 450-. Giro 90: recorte a la izquierda
//      y barra de tres botones a la derecha; giro 270: al revés.
//   4. Caso 2: el grupo centrado sobre el fondo de la app -bg-suelo-, sin bordes que marquen el hueco.
//   5. Caso 1 también con el panel de Subtítulos abierto y con la toma ya guardada.
// Piezas existentes de Sigo: hojas de estilo y tokens, .visor-video, .play-visor, .cerrar-visor,
// .barra-visor, .boton-visor, .avance-visor, .acciones-toma, .accion-toma, .tarjeta-elevada, el
// SelectorSubtitulos de verdad -abierto con un clic- e IconosApp. Lo nuevo es la disposición.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import { IconoGuardar, IconoRepetir, IconoCerrar, IconoTacho, IconoEmpezar, IconoCompartir } from '../../../../src/components/IconosApp'
import { SelectorSubtitulos } from '../../../../src/components/SubtitulosVisor'
import { fijarIdioma } from '../../../../src/lib/idioma'

const q = new URLSearchParams(location.search)
const caso = q.get('caso') === '2' ? 2 : 1
const giro = q.get('giro') === '270' ? 270 : 90
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
const estado = q.get('estado') || 'normal'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')

const W = window.innerWidth
const H = window.innerHeight
// LOS BORDES SEGUROS, SIN BARRA DE ESTADO. Barra de tres botones de lado: 48 dp -AOSP dimens.xml,
// navigation_bar_width-. Recorte del moto g86: 125 px / (450 / 160) = 44,4 → 44 dp. Al girar 90 el borde de
// arriba del teléfono -el del recorte- queda a la izquierda y la barra a la derecha; a 270, al revés.
// Escondida la barra de estado, arriba no queda nada: el recorte está al costado.
const BARRA = 48
const RECORTE = 44
const IN = giro === 90
  ? { arriba: 0, derecha: BARRA, abajo: 0, izquierda: RECORTE }
  : { arriba: 0, derecha: RECORTE, abajo: 0, izquierda: BARRA }
// La .barra-visor de hoy: botón y avance de 44 -styles.css, .boton-visor y .avance-visor- más el
// padding de arriba --aire-1, 4-.
const ALTO_BARRA_AVANCE = 48
export const RIEL_DER = 124 // styles-horizontal.css:22
export const RIEL_IZQ_LEER = 112 // styles-horizontal.css:20

function BarraDeTresBotones() {
  const s: React.CSSProperties = { width: 16, height: 16, border: '2px solid #ddd', opacity: 0.9 }
  const cuadro = <div style={{ ...s, borderRadius: 2 }} />
  const casa = <div style={{ ...s, borderRadius: '50%' }} />
  const atras = <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderRight: '14px solid #ddd' }} />
  const lado: React.CSSProperties = giro === 90 ? { right: 0 } : { left: 0 }
  // De lado, atrás queda del lado de abajo del teléfono girado: abajo a 90, arriba a 270.
  return (
    <div style={{ position: 'fixed', top: 0, bottom: 0, ...lado, width: BARRA, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
      {giro === 90 ? <>{cuadro}{casa}{atras}</> : <>{atras}{casa}{cuadro}</>}
    </div>
  )
}

// El recorte: la franja segura de 44 -sin contenido, con el fondo de lo que tiene al lado- y el agujero
// de la cámara, centrado en el alto.
function Recorte({ fondo }: { fondo: string }) {
  const lado: React.CSSProperties = giro === 90 ? { left: 0 } : { right: 0 }
  return (
    <div data-medida="recorte" style={{ position: 'fixed', top: 0, bottom: 0, ...lado, width: RECORTE, background: fondo, zIndex: 9997 }}>
      <div style={{ position: 'absolute', top: '50%', [giro === 90 ? 'left' : 'right']: 16, width: 12, height: 12, marginTop: -6, borderRadius: '50%', background: '#000', boxShadow: '0 0 0 1px #222' }} />
    </div>
  )
}

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

function BarraDeAvance({ actual, total, avance }: { actual: string; total: string; avance: number }) {
  return (
    <div className="barra-visor" data-medida="barra-avance">
      <button type="button" className="boton-visor" aria-label="Reproducir"><IconoEmpezar tamano={20} /></button>
      <span>{actual}</span>
      <input type="range" className="avance-visor" min={0} max={100} step={0.1} defaultValue={avance} style={{ ['--avance' as any]: `${avance}%` }} />
      <span>{total}</span>
    </div>
  )
}

// CASO 1: video 16:9 arriba a la izquierda, la barra de avance bajo él a todo su ancho, y la columna a
// todo el alto al costado. Barra y columna son UNA superficie -bg-superficie, como la tarjeta de hoy-.
function Caso1() {
  const [estilo, setEstilo] = React.useState<any>('amarillo')
  const guardada = estado === 'guardada'
  const util = W - IN.izquierda - IN.derecha
  const altoVideo = H - IN.arriba - IN.abajo - ALTO_BARRA_AVANCE
  const anchoVideo = Math.round(altoVideo * 16 / 9)
  const columna = util - anchoVideo
  const ajuste = columna < RIEL_IZQ_LEER
  ;(window as any).medidas = { caso: 1, giro, estado, W, H, IN, util, altoBarra: ALTO_BARRA_AVANCE, altoVideo, anchoVideo, columna, ajuste }
  React.useEffect(() => {
    if (estado === 'subtitulos') (document.querySelector('[data-testid="btn-subtitulos"]') as HTMLElement | null)?.click()
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-superficie)', color: 'var(--color-texto)' }}>
      <div className="visor-video" data-medida="video" style={{ position: 'absolute', left: IN.izquierda, top: IN.arriba, width: anchoVideo, height: altoVideo }}>
        <VideoDeMentira ancho={anchoVideo} alto={altoVideo} horizontal />
        <span className="play-visor" aria-hidden="true"><IconoEmpezar tamano={30} /></span>
      </div>
      <div style={{ position: 'absolute', left: IN.izquierda, top: IN.arriba + altoVideo, width: anchoVideo, height: ALTO_BARRA_AVANCE }}>
        <BarraDeAvance actual="1:04" total="4:12" avance={25} />
      </div>
      <div data-medida="columna" style={{ position: 'absolute', top: IN.arriba, bottom: IN.abajo, left: IN.izquierda + anchoVideo, width: columna, boxSizing: 'border-box', borderLeft: '1px solid var(--color-separador)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: 'var(--aire-2) var(--aire-1) 0 var(--aire-3)' }}>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 'var(--aire-2)' }}>
            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Larralde</div>
            <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>4:12</div>
          </div>
          <button type="button" className="cerrar-visor" aria-label="Cerrar" style={{ position: 'static', background: 'transparent', color: 'var(--color-texto)' }}><IconoCerrar tamano={22} /></button>
        </div>
        {/* Las acciones en una columna, una por fila, a todo el ancho: Guardar, Subtítulos, Repetir y
            Borrar recién grabada; Compartir y Borrar ya guardada -como hoy: solo el símbolo y sin selector-. */}
        <div className="acciones-toma columna-acciones" data-medida="acciones" style={{ flexDirection: 'column', flex: 1 }}>
          {guardada ? (
            <>
              <button type="button" className="accion-toma" aria-label="Compartir"><IconoCompartir tamano={26} /></button>
              <button type="button" className="accion-toma" aria-label="Borrar"><IconoTacho tamano={26} strokeWidth={1.6} /></button>
            </>
          ) : (
            <>
              <button type="button" className="accion-toma" aria-label="Guardar en la galería"><IconoGuardar tamano={26} /><span>Guardar</span></button>
              <div className="columna-subtitulos"><SelectorSubtitulos estilo={estilo} onCambiar={setEstilo} /></div>
              <button type="button" className="accion-toma" aria-label="Repetir"><IconoRepetir tamano={26} /></button>
              <button type="button" className="accion-toma" aria-label="Borrar"><IconoTacho tamano={26} strokeWidth={1.6} /></button>
            </>
          )}
        </div>
      </div>
      <style>{`
        .columna-acciones { margin-top: 0; }
        /* Las filas se reparten el alto de la columna: sin hueco entre el nombre y las acciones. */
        .columna-acciones > .accion-toma, .columna-acciones > .columna-subtitulos { flex: 1 1 0; min-height: 0; box-sizing: border-box; padding: 0; justify-content: center; }
        .columna-subtitulos { display: flex; } .columna-subtitulos .selector-subtitulos { flex: 1; }
        .columna-subtitulos button.boton-subtitulos { height: 100%; justify-content: center !important; }
        .columna-acciones > .accion-toma + .accion-toma, .columna-acciones > * + * { border-top: 1px solid var(--color-separador); }
        /* Subtítulos en la columna: el SelectorSubtitulos de verdad vestido como .accion-toma -el CC y el
           estilo elegido debajo, sin la palabra ni la flecha-. Abierto, sus cuatro opciones salen en un
           panel de 320 a la izquierda de la columna, sobre el video -como los paneles de ficha de la 82,
           docs/tarea82.txt:90-93-, a la altura del botón. */
        .columna-subtitulos { position: relative; }
        .columna-subtitulos button.boton-subtitulos { flex-direction: column; justify-content: flex-start; gap: var(--aire-1); width: 100%; min-height: 64px; padding: var(--aire-3) 0; background: transparent; border: none; border-radius: 0; font-size: var(--texto-etiqueta); }
        .columna-subtitulos button.boton-subtitulos > svg:first-child { width: 26px; height: 26px; }
        .columna-subtitulos .boton-subtitulos-nombre, .columna-subtitulos .boton-subtitulos-flecha { display: none; }
        .columna-subtitulos .boton-subtitulos-valor { flex: none; text-align: center; color: var(--color-texto); }
        .columna-subtitulos button.boton-subtitulos[aria-expanded="true"] { background: var(--bg-fila); }
        .columna-subtitulos .opciones-subtitulos { position: absolute; right: calc(100% + 8px); top: 0; width: 320px; box-sizing: border-box; padding: var(--aire-3); background: var(--bg-panel); border: 1px solid var(--borde-tarjeta); box-shadow: var(--sombra-tarjeta); border-radius: var(--redondeo); z-index: 5; }
        .columna-subtitulos .opciones-subtitulos::before { content: 'Subtítulos'; grid-column: 1 / -1; font-weight: 600; }
      `}</style>
    </div>
  )
}

// CASO 2: video 9:16 a todo el alto y la tarjeta de 320 a su lado, centrados sobre el fondo de la app.
function Caso2() {
  const [estilo, setEstilo] = React.useState<any>('amarillo')
  const util = W - IN.izquierda - IN.derecha
  const altoVideo = H - IN.arriba - IN.abajo
  const anchoVideo = Math.round(altoVideo * 9 / 16)
  const panel = 320
  const separacion = 16
  const grupo = anchoVideo + separacion + panel
  const margen = Math.round((util - grupo) / 2)
  ;(window as any).medidas = { caso: 2, giro, estado, W, H, IN, util, anchoVideo, altoVideo, panel, separacion, grupo, margen }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-suelo)' }}>
      <div className="visor-video" data-medida="video" style={{ position: 'absolute', left: IN.izquierda + margen, top: IN.arriba, width: anchoVideo, height: altoVideo }}>
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
          <BarraDeAvance actual="0:04" total="0:19" avance={21} />
          <div style={{ padding: 'var(--aire-2) var(--aire-3) 0' }}>
            <SelectorSubtitulos estilo={estilo} onCambiar={setEstilo} />
          </div>
          <div className="acciones-toma">
            <button type="button" className="accion-toma" aria-label="Guardar en la galería"><IconoGuardar tamano={26} /><span>Guardar</span></button>
            <button type="button" className="accion-toma" aria-label="Repetir"><IconoRepetir tamano={26} /></button>
            <button type="button" className="accion-toma" aria-label="Borrar"><IconoTacho tamano={26} strokeWidth={1.6} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <>
    {caso === 1 ? <Caso1 /> : <Caso2 />}
    {/* El recorte toma el fondo de lo que tiene al lado: a 90 el video -negro- y la barra de avance, a 270 la
        columna. */}
    <Recorte fondo={caso === 2 ? 'var(--bg-suelo)' : giro === 90 ? `linear-gradient(#000 0 ${H - ALTO_BARRA_AVANCE}px, var(--bg-superficie) ${H - ALTO_BARRA_AVANCE}px)` : 'var(--bg-superficie)'} />
    <BarraDeTresBotones />
  </>
)
