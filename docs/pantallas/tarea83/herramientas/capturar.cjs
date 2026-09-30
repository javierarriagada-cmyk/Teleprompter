// LAS CAPTURAS DE LA APP REAL EN TABLETA -tarea 83, 30-09-2026-. node capturar.cjs [filtro]
//
// Abre la app de siempre -index.html y src/main.tsx, servida por npx vite en 127.0.0.1:5183 desde
// la raíz del repo- en Chrome sin ventana, con el tamaño de la tableta, la lleva a cada estado
// tocando los mismos botones que una persona y guarda la pantalla en crudas/. componer.cjs las pone
// después al lado del boceto aprobado. Se necesita puppeteer-core y Chrome, como en
// docs/pantallas/tarea82/herramientas: no se agrega nada al package.json.
//
// LO ÚNICO QUE NO ES DE LA APP: la imagen de la cámara. En la tableta la vista previa nativa va
// DETRÁS del WebView -src/lib/camara.ts, toBack: true- y el navegador no la tiene. Se dibuja una
// imagen de referencia -la misma de los bocetos, sigo-bocetos.css .camara: un degradé con una
// silueta- donde la pondría la tableta: toda la ventana con la cámara detrás, o el hueco del
// recuadro medido en la pantalla.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')

const URL = process.env.SIGO_URL || 'http://127.0.0.1:5183/'
const CRUDAS = path.join(__dirname, 'crudas')
const filtro = process.argv[2] || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Las dos referencias de la hoja -sección 3 y 4-, con la misma escala que los bocetos -1,5-.
const PANTALLAS = {
  'tab-v': { w: 820, h: 1180 },
  'tab-h': { w: 1180, h: 820 }
}

// La cámara de referencia de los bocetos -sigo-bocetos.css, .camara y .sil-.
const CSS_CAMARA = `
#camara-simulada{position:fixed;z-index:-1;overflow:hidden;pointer-events:none;background:
  radial-gradient(55% 60% at 22% 28%,rgba(255,214,170,.38),transparent 70%),
  radial-gradient(50% 60% at 82% 72%,rgba(120,160,205,.34),transparent 70%),
  linear-gradient(160deg,#4d5866 0%,#5f524a 55%,#3b3532 100%)}
#camara-simulada .sil{position:absolute;left:50%;bottom:0;width:var(--silw,30%);aspect-ratio:1/1.05;transform:translateX(-50%);filter:blur(1.2px);opacity:.9}
#camara-simulada .sil::before{content:"";position:absolute;left:29%;top:0;width:42%;aspect-ratio:1;border-radius:50%;background:#2b2624}
#camara-simulada .sil::after{content:"";position:absolute;left:0;right:0;bottom:0;height:52%;border-radius:50% 50% 0 0/80% 80% 0 0;background:#2b2624}
video{opacity:0 !important}`

async function abrir(b, { pantalla, tema, puerta, fondoToma = 'detras' }) {
  const p = await b.newPage()
  const { w, h } = PANTALLAS[pantalla]
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1.5 })
  // Tema claro con la pareja Blanco con negro y tema oscuro con Negro con blanco, como las dos hojas.
  const par = tema === 'claro' ? { colorFondo: '#FFFFFF', colorLetra: '#000000' } : { colorFondo: '#000000', colorLetra: '#FFFFFF' }
  // SIN fontSize a propósito: así se ve la letra por omisión de la tableta -32, useLayout.ts-.
  await p.evaluateOnNewDocument((aj) => {
    Object.defineProperty(navigator, 'language', { get: () => 'es-CL' })
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] })
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify(aj))
  }, { tema, ...par, columnaAngosta: false, mostrarTiempo: true, fondoToma, modoCamara: 'frontal', ladoCamara: 'frontal', calidadVideo: '1080p' })
  p.on('pageerror', (e) => console.log('  error de la página:', e.message))
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.addStyleTag({ content: CSS_CAMARA })
  const boton = puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'
  await p.waitForSelector(`[data-testid="${boton}"]`, { timeout: 30000 })
  await sleep(800)
  await p.click(`[data-testid="${boton}"]`)
  await p.waitForSelector('[data-testid="btn-empezar-toma"]')
  await sleep(1500)
  return p
}

// La cámara donde la pondría la tableta. Se llama justo antes de la captura: el hueco del
// recuadro se mide en ese momento.
async function camara(p, recuadro) {
  await p.evaluate((recuadro) => {
    let d = document.getElementById('camara-simulada')
    if (!d) {
      d = document.createElement('div')
      d.id = 'camara-simulada'
      d.innerHTML = '<div class="sil"></div>'
      document.body.prepend(d)
    }
    const r = recuadro ? document.querySelector('[data-testid="recuadro-camara"]')?.getBoundingClientRect() : null
    d.style.cssText = r
      ? `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:10px;--silw:${r.height > r.width ? '62%' : '30%'}`
      : 'inset:0;--silw:30%'
  }, recuadro)
  await sleep(200)
}

async function empezar(p) {
  await p.click('[data-testid="btn-empezar-toma"]')
  // Los tres segundos de la cuenta, y la subida del texto.
  await sleep(4200)
}
async function tocar(p) {
  // Un solo click en la superficie, como un toque -docs/pantallas/tarea82/herramientas/shots.js-.
  await p.evaluate(() => document.querySelector('[data-testid="teleprompter-view-container"]').click())
  await sleep(800)
}

// [nombre, puerta, fondo, pasos]. Los estados que pide el encargo, en el orden de la hoja.
const ESTADOS = [
  ['leer-listo', 'leer', null, async () => {}],
  ['leer-leyendo', 'leer', null, async (p) => { await empezar(p) }],
  ['leer-leyendo-controles', 'leer', null, async (p) => { await empezar(p); await tocar(p) }],
  ['grabar-listo-detras', 'grabar', 'detras', async () => {}],
  ['grabar-listo-recuadro', 'grabar', 'recuadro', async () => {}],
  ['grabar-grabando-detras', 'grabar', 'detras', async (p) => { await empezar(p) }],
  ['grabar-grabando-detras-controles', 'grabar', 'detras', async (p) => { await empezar(p); await tocar(p) }],
  ['grabar-grabando-recuadro', 'grabar', 'recuadro', async (p) => { await empezar(p) }],
  ['grabar-grabando-recuadro-controles', 'grabar', 'recuadro', async (p) => { await empezar(p); await tocar(p) }],
  ['grabar-pausa-tacho', 'grabar', 'detras', async (p) => {
    await empezar(p); await tocar(p)
    await p.click('[data-testid="btn-pausa-lectura"]'); await sleep(700)
  }]
]

;(async () => {
  fs.mkdirSync(CRUDAS, { recursive: true })
  const b = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--lang=es-CL', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  })
  for (const pantalla of Object.keys(PANTALLAS)) {
    for (const tema of ['oscuro', 'claro']) {
      for (const [nombre, puerta, fondoToma, pasos] of ESTADOS) {
        const id = `${pantalla}-${nombre}-${tema}`
        if (filtro && !id.includes(filtro)) continue
        // Un contexto limpio por captura: cada una parte de la misma portada con el guion Hola.
        const ctx = await b.createBrowserContext()
        try {
          const p = await abrir(ctx, { pantalla, tema, puerta, fondoToma: fondoToma || 'detras' })
          await pasos(p)
          if (puerta === 'grabar') await camara(p, fondoToma === 'recuadro')
          await p.screenshot({ path: path.join(CRUDAS, `${id}.png`) })
          console.log('  lista', id)
        } catch (e) {
          console.log('  FALLÓ', id, e.message)
        } finally {
          await ctx.close()
        }
      }
    }
  }
  await b.close()
})()
