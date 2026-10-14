// EL VISOR DE VERDAD PARA LAS LÁMINAS DE LA TAREA 96 -05-10-2026-. NO es código de la app. Monta el
// ReproductorGrabacion de src/components con las hojas de estilo de verdad.
//
// LO QUE NO ES DE LA APP: el video. En esta máquina no hay ffmpeg ni una toma real con color, y las de la
// tarea 90 son grises -no se vería ningún filtro-. Así que la página dibuja en un canvas una escena de
// referencia -una pared cálida, una ventana fría, una planta, una persona con camisa azul- y la graba
// con MediaRecorder a un webm de 3 s; ese webm es la toma -blob:, que srcDeRuta deja pasar tal cual-.
// Los subtítulos son los de la toma 008a7133 del corpus a los 2,5 s, como en la tarea 90.
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
const forma = q.get('forma') === 'horizontal' ? 'horizontal' : 'vertical'
const tono = q.get('tono') || 'natural'
const tira = q.get('tira') === 'si'
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')
try {
  localStorage.setItem('sigo_subtitulos_estilo', 'amarillo')
  localStorage.setItem('sigo_filtro', JSON.stringify({ version: 1, tono }))
} catch (e) {}
// De lado, los bordes del moto g86 como los escribe Capacitor -tarea 90-: recorte 44 a la izquierda y la
// barra de tres botones de 48 a la derecha.
if (innerWidth > innerHeight) {
  const r = document.documentElement.style
  r.setProperty('--safe-area-inset-top', '0px')
  r.setProperty('--safe-area-inset-bottom', '0px')
  r.setProperty('--safe-area-inset-left', '44px')
  r.setProperty('--safe-area-inset-right', '48px')
}

// La escena de referencia.
function dibujarEscena(c: HTMLCanvasElement, t: number) {
  const g = c.getContext('2d')!
  const W = c.width, H = c.height
  const fondo = g.createLinearGradient(0, 0, W, H)
  fondo.addColorStop(0, '#d9a77c')
  fondo.addColorStop(1, '#a8694a')
  g.fillStyle = fondo
  g.fillRect(0, 0, W, H)
  // La ventana, fría.
  const vx = W * 0.62, vy = H * 0.08, vw = W * 0.3, vh = H * 0.32
  const cielo = g.createLinearGradient(0, vy, 0, vy + vh)
  cielo.addColorStop(0, '#8fc4ea')
  cielo.addColorStop(1, '#d8eefa')
  g.fillStyle = cielo
  g.fillRect(vx, vy, vw, vh)
  g.strokeStyle = '#f4efe6'
  g.lineWidth = W * 0.012
  g.strokeRect(vx, vy, vw, vh)
  g.beginPath(); g.moveTo(vx + vw / 2, vy); g.lineTo(vx + vw / 2, vy + vh); g.stroke()
  // La planta.
  g.fillStyle = '#7a4b2f'
  g.fillRect(W * 0.06, H * 0.62, W * 0.16, H * 0.12)
  for (let i = 0; i < 7; i++) {
    g.fillStyle = i % 2 ? '#3f8f4a' : '#5fb35a'
    g.beginPath()
    g.ellipse(W * (0.1 + 0.012 * i), H * (0.6 - 0.025 * i), W * 0.05, H * 0.03, (i - 3) * 0.4, 0, Math.PI * 2)
    g.fill()
  }
  // La persona: camisa azul, cuello, cara y pelo.
  const cx = W * 0.47 + Math.sin(t * 2) * W * 0.004
  g.fillStyle = '#2f5d9e'
  g.beginPath()
  g.ellipse(cx, H * 1.02, W * 0.36, H * 0.3, 0, Math.PI, 0)
  g.fill()
  g.fillStyle = '#c98f6b'
  g.fillRect(cx - W * 0.06, H * 0.6, W * 0.12, H * 0.1)
  const cara = g.createRadialGradient(cx - W * 0.04, H * 0.47, W * 0.02, cx, H * 0.5, W * 0.2)
  cara.addColorStop(0, '#f2c4a2')
  cara.addColorStop(1, '#c98f6b')
  g.fillStyle = cara
  g.beginPath()
  g.ellipse(cx, H * 0.5, W * 0.15, H * 0.12 * (forma === 'vertical' ? 0.95 : 1.6), 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#3a2418'
  g.beginPath()
  g.ellipse(cx, H * 0.42, W * 0.16, H * 0.06 * (forma === 'vertical' ? 1 : 1.6), 0, Math.PI, 0)
  g.fill()
  // Labios.
  g.fillStyle = '#b5524a'
  g.beginPath()
  g.ellipse(cx, H * 0.555, W * 0.035, H * 0.008, 0, 0, Math.PI * 2)
  g.fill()
}

async function grabarEscena(): Promise<string> {
  const c = document.createElement('canvas')
  c.width = forma === 'vertical' ? 720 : 1280
  c.height = forma === 'vertical' ? 1280 : 720
  const flujo = (c as any).captureStream(30) as MediaStream
  const rec = new MediaRecorder(flujo, { mimeType: 'video/webm' })
  const trozos: Blob[] = []
  rec.ondataavailable = (e) => trozos.push(e.data)
  const t0 = performance.now()
  let id = 0
  const bucle = () => { dibujarEscena(c, (performance.now() - t0) / 1000); id = requestAnimationFrame(bucle) }
  bucle()
  rec.start()
  await new Promise((r) => setTimeout(r, 3200))
  rec.stop()
  await new Promise((r) => (rec.onstop = r))
  cancelAnimationFrame(id)
  return URL.createObjectURL(new Blob(trozos, { type: 'video/webm' }))
}

function Escena({ ruta }: { ruta: string }) {
  React.useEffect(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null
    if (!v) return
    const listo = () => {
      v.currentTime = 2.5
      // De lado el visor se rearma cuando sabe la forma del video -otro <video>-: se espera a que
      // quede quieto antes de abrir la tira, como lo haría la persona.
      v.addEventListener('seeked', () => {
        setTimeout(() => {
          if (tira) (document.querySelector('[data-testid="btn-filtro"]') as HTMLElement | null)?.click()
          setTimeout(() => { ;(window as any).listo = true }, 700)
        }, 800)
      }, { once: true })
    }
    if (v.readyState >= 2) listo()
    else v.addEventListener('loadeddata', listo, { once: true })
  }, [])
  const toma = {
    ...grabacionNueva({ id: '008a7133', tituloGuion: 'Larralde', duracionMs: 19000, ruta }),
    orientacion: forma
  }
  return <ReproductorGrabacion grabacion={toma as any} onCerrar={() => {}} onBorrar={() => {}} onRepetir={() => {}} />
}

grabarEscena().then((ruta) => createRoot(document.getElementById('root')!).render(<Escena ruta={ruta} />))
