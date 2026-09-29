// LA ENTRADA DE LAS CAPTURAS -tarea 86-. Monta el MISMO App de src/App.tsx, con sus mismas letras
// y hojas de estilo -como src/main.tsx-, y le pone delante lo que en un teléfono de verdad viene
// del usuario: sus guiones, una toma ya grabada y una voz que lee. Nada de la pantalla se dibuja
// aquí: lo que sale en las capturas es la app.
import './camaraWeb'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import '@fontsource/source-serif-4/latin-ext-400.css'
import '@fontsource/source-serif-4/latin-ext-600.css'
import App from '../../../../src/App'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import { RepositorioIndexedDB } from '../../../../src/datos/RepositorioIndexedDB'
import { RepositorioGrabacionesIndexedDB } from '../../../../src/datos/RepositorioGrabacionesIndexedDB'
import { guionesDeEjemplo } from './guiones'
import { VozGuiada } from './vozGuiada'

const parametros = new URLSearchParams(location.search)
const idioma = parametros.get('idioma') === 'en' ? 'en' : 'es'

// El registro de la toma, con el formato que escribe el teléfono -src/lib/tomaVideo.ts y
// src/lib/repetidor.ts, leerCorpus-: el guion tal cual se leyó y, por cada frase, sus palabras
// con su hora. Con eso el reproductor arma los subtítulos igual que con una toma de verdad.
function registroDeToma(texto: string): string {
  const lineas = ['# motor de voz: nativo', '# ---------- GUION, TAL CUAL SE LEYO ----------']
  for (const l of texto.split('\n')) lineas.push('# | ' + l)
  lineas.push('# ---')
  const dicho = texto.replace(/\[[^\]]*\]/g, ' ')
  let ms = 600
  for (const frase of dicho.split(/(?<=[.:!?])\s+/)) {
    const palabras = frase.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
    if (!palabras.length) continue
    const partes = palabras.map((w) => { const a = ms; ms += 330; return `${w}@${a}-${ms - 40}` })
    lineas.push(`${ms}\tpalabras\tFINAL ${partes.join(' ')}`)
    ms += 450
  }
  return lineas.join('\n')
}

async function sembrar() {
  const ahora = Date.now()
  // Una sola vez por perfil del navegador: capturar.cjs abre cada captura en un perfil limpio.
  if (localStorage.getItem('ficha_sembrada') === idioma) return
  localStorage.setItem('teleprompter_bienvenida_puesta', 'true')
  const repo = new RepositorioIndexedDB()
  const guiones = guionesDeEjemplo(idioma, ahora)
  // Del más antiguo al más nuevo: la portada ordena por el último cambio y el guion de la
  // captura -el del pan- tiene que quedar arriba.
  for (const g of [...guiones].reverse()) await repo.guardar(g)
  const principal = guiones[0]
  const toma = `toma-ejemplo-${idioma}`
  ;(window as any).__sigoArchivos[`/grabaciones/${toma}.motor.txt`] = registroDeToma(principal.bloques[0].texto)
  await new RepositorioGrabacionesIndexedDB().guardar({
    id: toma,
    guionId: principal.id,
    tituloGuion: principal.titulo,
    creado: ahora - 3600 * 1000,
    duracionMs: 42000,
    bytes: 38 * 1024 * 1024,
    ruta: new URL(`./medios/toma-${idioma}.mp4`, location.href).href,
    rutaMiniatura: new URL(`./medios/miniatura-${idioma}.jpg`, location.href).href,
    tieneAudio: true,
    incompleta: false,
    calidad: '1080p'
  })
  localStorage.setItem('ficha_sembrada', idioma)
}

;(async () => {
  // El registro vive en memoria -camaraWeb.ts-: se vuelve a poner en cada carga.
  const g = guionesDeEjemplo(idioma, Date.now())[0]
  ;(window as any).__sigoArchivos[`/grabaciones/toma-ejemplo-${idioma}.motor.txt`] = registroDeToma(g.bloques[0].texto)
  await sembrar()
  const voz = new VozGuiada()
  ;(window as any).__sigoVoz = voz
  createRoot(document.getElementById('root')!).render(<App motor={voz} />)
})()
