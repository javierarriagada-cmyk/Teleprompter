// LA APP REAL PARA LAS CAPTURAS -tarea 90-. NO es código de la app. Monta el ReproductorGrabacion de verdad
// -src/components/ReproductorGrabacion.tsx- con una toma de mentira -medios/horizontal.mp4 de 1280x720 o
// medios/vertical.mp4 de 720x1280- y los bordes seguros del moto g86 escritos como los escribe Capacitor
// -las variables --safe-area-inset-*: Chrome no tiene recorte ni barra de tres botones, y env() da 0-.
// Encima se dibujan la barra de tres botones y el agujero de la cámara, como en el boceto.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import '../../../../src/styles-visor-de-lado.css'
import ReproductorGrabacion from '../../../../src/components/ReproductorGrabacion'
import { grabacionNueva } from '../../../../src/datos/modelo'
import { fijarIdioma } from '../../../../src/lib/idioma'

const q = new URLSearchParams(location.search)
const caso = q.get('caso') === '2' ? 2 : 1
const giro = q.get('giro') === '270' ? 270 : 90
const estado = q.get('estado') || 'normal'
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')
try { localStorage.setItem('sigo_subtitulos_estilo', 'amarillo') } catch (e) {}
const BARRA = 48
const RECORTE = 44
const izq = giro === 90 ? RECORTE : BARRA
const der = giro === 90 ? BARRA : RECORTE
const raiz = document.documentElement.style
raiz.setProperty('--safe-area-inset-top', '0px')
raiz.setProperty('--safe-area-inset-bottom', '0px')
raiz.setProperty('--safe-area-inset-left', `${izq}px`)
raiz.setProperty('--safe-area-inset-right', `${der}px`)

const medio = caso === 1 ? 'horizontal' : 'vertical'
const toma = {
  ...grabacionNueva({ id: '008a7133', tituloGuion: 'Larralde', duracionMs: caso === 1 ? 252000 : 19000, ruta: `/docs/pantallas/tarea90/herramientas/medios/${medio}.mp4` }),
  rutaMiniatura: `/docs/pantallas/tarea90/herramientas/medios/${medio}.png`,
  ...(estado === 'guardada' ? { galeriaUri: 'content://media/1' } : {})
}

function BarraDeTresBotones() {
  const s: React.CSSProperties = { width: 16, height: 16, border: '2px solid #ddd', opacity: 0.9 }
  const cuadro = <div style={{ ...s, borderRadius: 2 }} />
  const casa = <div style={{ ...s, borderRadius: '50%' }} />
  const atras = <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderRight: '14px solid #ddd' }} />
  const lado: React.CSSProperties = giro === 90 ? { right: 0 } : { left: 0 }
  return (
    <div style={{ position: 'fixed', top: 0, bottom: 0, ...lado, width: BARRA, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', pointerEvents: 'none' }}>
      {giro === 90 ? <>{cuadro}{casa}{atras}</> : <>{atras}{casa}{cuadro}</>}
    </div>
  )
}
function Camara() {
  return <div style={{ position: 'fixed', top: '50%', [giro === 90 ? 'left' : 'right']: 16, width: 12, height: 12, marginTop: -6, borderRadius: '50%', background: '#000', boxShadow: '0 0 0 1px #222', zIndex: 9998, pointerEvents: 'none' }} />
}

function Escena() {
  React.useEffect(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null
    if (!v) return
    const listo = () => {
      // A los 2,5 s de la toma hay subtítulo -registro 008a7133-.
      v.currentTime = 2.5
      v.addEventListener('seeked', () => {
        ;(window as any).listo = true
        if (estado === 'subtitulos') (document.querySelector('[data-testid="btn-subtitulos"]') as HTMLElement | null)?.click()
      }, { once: true })
    }
    if (v.readyState >= 1) listo()
    else v.addEventListener('loadeddata', listo, { once: true })
  })
  return (
    <>
      <ReproductorGrabacion grabacion={toma as any} onCerrar={() => {}} onBorrar={() => {}} onRepetir={estado === 'guardada' ? undefined : () => {}} />
      <Camara />
      <BarraDeTresBotones />
    </>
  )
}
createRoot(document.getElementById('root')!).render(<Escena />)
