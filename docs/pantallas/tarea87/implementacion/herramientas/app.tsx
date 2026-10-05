// LA APP IMPLEMENTADA DE LA TAREA 87 -04-10-2026-, para capturarla al lado del boceto aprobado
// -ab86ccc-. NO es código de la app: no lo importa nada de src/ y vite build no lo empaqueta. Monta
// el ReproductorGrabacion de verdad con lo nativo fingido -archivosNativosApp.ts- y el AvisoBreve de
// la App. capturas.cjs lo lleva a cada estado tocando lo mismo que toca la persona.
//
// LAS BARRAS DEL SISTEMA. Chrome no las tiene: se dibujan encima y la raíz del visor suma esos
// bordes como en el teléfono -env(safe-area-inset-*), que en Chrome vale 0-. La barra de estado del
// moto g86 mide 45 dp -registro visor-lado t=45 y el comentario de TeleprompterView; respuesta de
// Claude del 04-10-. La barra de tres botones, 48 dp. La franja de gestos NO está medida: en la
// captura se SUPONE de 24 dp -?gestos_dp=24- y en el teléfono la app usa el borde seguro real, que
// anota la línea SigoExport evento=bordes. En la app no hay ninguna de estas cifras.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../../src/styles.css'
import '../../../../../src/styles-ajustes.css'
import '../../../../../src/styles-horizontal.css'
import ReproductorGrabacion from '../../../../../src/components/ReproductorGrabacion'
import { AvisoBreve } from '../../../../../src/components/AvisoBreve'
import { grabacionNueva, ResumenGrabacion } from '../../../../../src/datos/modelo'
import { fijarIdioma } from '../../../../../src/lib/idioma'

const q = new URLSearchParams(location.search)
const estado = Number(q.get('estado') || '1')
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')

const nav = q.get('nav') === 'gestos' ? 'gestos' : 'botones'
const ESTADO = Number(q.get('estado_dp') || '45')
const BARRA = nav === 'gestos' ? Number(q.get('gestos_dp') || '24') : 48
const ALTO = 915
const CSS_BORDES = `
  [data-testid="reproductor-grabacion"] {
    padding-top: calc(var(--aire-4) + ${ESTADO}px) !important;
    padding-bottom: calc(var(--aire-4) + ${BARRA}px) !important;
  }
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

// Las tomas de mentira -herramientas/videos.sh del boceto-: los mismos videos.
const VIDEOS = '/docs/pantallas/tarea87/herramientas/videos/'
function tomaDe(): ResumenGrabacion {
  const horizontal = estado === 5
  // El 10 -la toma de 5 min con el tiempo estimado- se sacó el 04-10-2026. Antes: estado === 7 || estado === 10.
  const larga = estado === 7
  const archivo = horizontal ? 'horizontal-50s' : larga ? 'vertical-5min' : 'vertical-50s'
  return grabacionNueva({
    id: `app-${estado}`,
    tituloGuion: 'Larralde',
    duracionMs: larga ? 300000 : 50000,
    ruta: VIDEOS + archivo + '.mp4',
    orientacion: horizontal ? 'horizontal' : 'vertical',
    ...(estado === 9 ? { galeriaUri: 'content://media/app', estiloGaleria: 'amarillo' as const } : {})
  })
}

function Pagina() {
  const [toma, setToma] = React.useState<ResumenGrabacion>(tomaDe)
  const [aviso, setAviso] = React.useState<string | null>(null)
  return (
    <>
      <ReproductorGrabacion
        grabacion={toma}
        onCerrar={() => {}}
        onBorrar={() => {}}
        onRepetir={() => {}}
        // En la toma guardada el video sigue siendo el de mentira: content:// no existe en Chrome.
        onCambio={(g) => setToma({ ...g, ruta: toma.ruta })}
        onGuardadoEnGaleria={(_ok, detalle) => setAviso(detalle || null)}
      />
      {aviso && <AvisoBreve avisoInfo={{ texto: aviso }} enLectura={false} cerrarAviso={() => {}} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <>
    <style>{CSS_BORDES}</style>
    <Pagina />
    <BarrasDelSistema />
  </>
)
