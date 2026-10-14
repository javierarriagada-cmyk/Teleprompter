// BOCETO DEL VISOR DE LADO -tarea 89, 04-10-2026-, defecto 2. NO es código de la app: no lo importa
// nada de src/ y vite build no lo empaqueta -solo arma index.html-. Está armado con las piezas
// existentes de Sigo: las mismas hojas de estilo, las clases del visor -.tarjeta-elevada, .visor-video,
// .cerrar-visor, .play-visor, .barra-visor, .boton-visor, .avance-visor, .acciones-toma, .accion-toma-,
// los íconos de IconosApp y el SelectorSubtitulos de verdad. Lo único nuevo es la disposición: el video
// a un costado y los controles al otro.
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
import ReproductorGrabacion from '../../../../src/components/ReproductorGrabacion'
import { grabacionNueva } from '../../../../src/datos/modelo'
import { fijarIdioma } from '../../../../src/lib/idioma'

const q = new URLSearchParams(location.search)
const modo = q.get('modo') || 'propuesta'
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')

// La barra de tres botones de Android, de lado: 48 dp a la derecha -en el moto g86 y en el emulador
// con navegación de tres botones-. Chrome no tiene barra, así que se dibuja encima para ver qué tapa.
const BARRA = 48
function BarraDeTresBotones() {
  const s: React.CSSProperties = { width: 18, height: 18, border: '2px solid #ddd', opacity: 0.9 }
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: BARRA, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
      <div style={{ ...s, borderRadius: 2 }} />
      <div style={{ ...s, borderRadius: '50%' }} />
      <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '16px solid #ddd' }} />
    </div>
  )
}

// El cuadro del video: una toma vertical -9:16- de mentira, para que se vea el tamaño que ocupa.
function VideoDeMentira({ alto }: { alto: number }) {
  return (
    <div style={{ height: alto, width: Math.round(alto * 9 / 16), background: 'linear-gradient(160deg,#3a4a5a,#1b232b 60%,#0d1114)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <span style={{ color: '#fff', font: '700 15px Roboto, sans-serif', background: 'rgba(0,0,0,.55)', padding: '2px 6px', marginBottom: 28, borderRadius: 4 }}>sigue contigo</span>
    </div>
  )
}

function Propuesta() {
  const [estilo, setEstilo] = React.useState<any>('amarillo')
  // De lado: alto 411 dp. La raíz suma los bordes seguros -como queda tras el defecto 3-; aquí la
  // barra de la derecha se simula con un padding de 48.
  const aire = 16
  const altoVideo = 411 - 2 * aire
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#111111', display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: aire, paddingRight: aire + BARRA, boxSizing: 'border-box' }}>
      <div className="tarjeta-elevada" style={{ display: 'flex', width: 'min(820px, 100%)', background: 'var(--bg-superficie)', color: 'var(--color-texto)', borderRadius: 'var(--redondeo)', overflow: 'hidden' }}>
        {/* Al costado izquierdo, el video a todo el alto. */}
        <div className="visor-video" style={{ flexShrink: 0 }}>
          <VideoDeMentira alto={altoVideo} />
          <span className="play-visor" aria-hidden="true"><IconoEmpezar tamano={30} /></span>
        </div>
        {/* Al otro costado, los controles: arriba el nombre y cerrar, al medio el avance y los
            subtítulos, abajo las acciones. Si no caben, esta columna se desplaza -nunca el video-. */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: 'var(--aire-3) var(--aire-3) 0' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>Hola</div>
              <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>0:19</div>
            </div>
            <button type="button" className="cerrar-visor" aria-label="Cerrar" style={{ position: 'static', background: 'transparent', color: 'var(--color-texto)' }}><IconoCerrar tamano={22} /></button>
          </div>
          <div className="barra-visor" style={{ marginTop: 'var(--aire-2)' }}>
            <button type="button" className="boton-visor" aria-label="Reproducir"><IconoEmpezar tamano={20} /></button>
            <span>0:04</span>
            <input type="range" className="avance-visor" min={0} max={19} step={0.1} defaultValue={4} style={{ ['--avance' as any]: '21%' }} />
            <span>0:19</span>
          </div>
          <div style={{ padding: 'var(--aire-3) var(--aire-3) 0' }}>
            <SelectorSubtitulos estilo={estilo} onCambiar={setEstilo} />
          </div>
          <div style={{ flex: 1 }} />
          <div className="acciones-toma">
            <button type="button" className="accion-toma" aria-label="Guardar en la galería"><IconoGuardar tamano={26} /><span>Guardar</span></button>
            <button type="button" className="accion-toma" aria-label="Repetir"><IconoRepetir tamano={26} /></button>
            <button type="button" className="accion-toma" aria-label="Borrar"><IconoTacho tamano={26} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Hoy() {
  const toma = grabacionNueva({ id: 'boceto', tituloGuion: 'Hola', duracionMs: 19000, ruta: '/no-existe.mp4' })
  // En Chrome el video no carga -no hay archivo- y queda de 150 px. Una toma de verdad -vertical-
  // llena el tope de maxHeight 70vh -ReproductorGrabacion.tsx, el estilo del <video>-: se fuerza ese
  // alto para que el visor de hoy mida lo que mide en el teléfono.
  return (
    <>
      <style>{'[data-testid="video-grabacion"]{height:70vh}'}</style>
      <ReproductorGrabacion grabacion={toma} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <>
    {modo === 'hoy' ? <Hoy /> : <Propuesta />}
    <BarraDeTresBotones />
  </>
)
