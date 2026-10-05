// LA FLECHA Y LA SEGUNDA FILA DE FICHAS EN GRABAR, EN LA APP REAL -tarea 93, 05-10-2026-. node fichas.cjs [filtro]
//
// Con el servidor de las láminas arriba, desde la raíz del repo:
//   npx vite --config docs/pantallas/tarea93/herramientas/vite.config.mjs --port 5193 --host 127.0.0.1
// Abre la app de siempre -index.html- en Chrome sin ventana, entra a Grabar y guarda LISTO con la segunda
// fila cerrada y abierta -tocando la flecha como una persona-, en tel-v y tel-h, en claro y oscuro: 8 láminas
// en docs/pantallas/tarea93/fichas-*.png. Imita docs/pantallas/tarea83/herramientas/controles.cjs.
//
// LO QUE NO ES DE LA APP: no hay cámara en el navegador. Grabar se ve sobre el fondo de referencia de los
// bocetos -el mismo de controles.cjs-.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const path = require('path')

const URL = process.env.SIGO_URL || 'http://127.0.0.1:5193/'
const SALIDA = process.env.SALIDA || path.join(__dirname, '..')
const filtro = process.argv[2] || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Teléfono -moto g86, 412×915- a 2 px por dp.
const PANTALLAS = {
  'tel-v': { w: 412, h: 915, e: 2 },
  'tel-h': { w: 915, h: 412, e: 2 }
}

// La cámara de referencia de los bocetos -la misma de controles.cjs-.
const CSS_CAMARA = `
#camara-simulada{position:fixed;z-index:-1;overflow:hidden;pointer-events:none;background:
  radial-gradient(55% 60% at 22% 28%,rgba(255,214,170,.38),transparent 70%),
  radial-gradient(50% 60% at 82% 72%,rgba(120,160,205,.34),transparent 70%),
  linear-gradient(160deg,#4d5866 0%,#5f524a 55%,#3b3532 100%)}
#camara-simulada .sil{position:absolute;left:50%;bottom:0;width:var(--silw,30%);aspect-ratio:1/1.05;transform:translateX(-50%);filter:blur(1.2px);opacity:.9}
#camara-simulada .sil::before{content:"";position:absolute;left:29%;top:0;width:42%;aspect-ratio:1;border-radius:50%;background:#2b2624}
#camara-simulada .sil::after{content:"";position:absolute;left:0;right:0;bottom:0;height:52%;border-radius:50% 50% 0 0/80% 80% 0 0;background:#2b2624}
video{opacity:0 !important}`

async function abrirGrabar(b, { pantalla, tema }) {
  const p = await b.newPage()
  const { w, h, e } = PANTALLAS[pantalla]
  await p.setViewport({ width: w, height: h, deviceScaleFactor: e })
  const par = tema === 'claro' ? { colorFondo: '#FFFFFF', colorLetra: '#000000' } : { colorFondo: '#000000', colorLetra: '#FFFFFF' }
  await p.evaluateOnNewDocument((aj) => {
    Object.defineProperty(navigator, 'language', { get: () => 'es-CL' })
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] })
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify(aj))
  }, { tema, ...par, columnaAngosta: false, mostrarTiempo: true, fondoToma: 'detras', modoCamara: 'frontal', ladoCamara: 'frontal', calidadVideo: '1080p' })
  p.on('pageerror', (err) => console.log('  error de la página:', err.message))
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.addStyleTag({ content: CSS_CAMARA })
  await p.evaluate(() => {
    const d = document.createElement('div')
    d.id = 'camara-simulada'
    d.innerHTML = '<div class="sil"></div>'
    d.style.cssText = 'inset:0;--silw:30%'
    document.body.prepend(d)
  })
  await p.waitForSelector('[data-testid="btn-grabar-tarjeta"]', { timeout: 30000 })
  await sleep(800)
  await p.click('[data-testid="btn-grabar-tarjeta"]')
  await p.waitForSelector('[data-testid="ficha-flecha"]')
  await sleep(1500)
  return p
}

const ESTADOS = [
  ['cerrada', async () => {}],
  // La flecha abre la segunda fila; se espera a que termine el resorte de unos 240 ms.
  ['abierta', async (p) => { await p.click('[data-testid="ficha-flecha"]'); await p.waitForSelector('[data-testid="segunda-fila-fichas"]'); await sleep(700) }]
]

;(async () => {
  const b = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--lang=es-CL', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--hide-scrollbars']
  })
  for (const pantalla of Object.keys(PANTALLAS)) {
    for (const tema of ['claro', 'oscuro']) {
      for (const [nombre, pasos] of ESTADOS) {
        const id = `fichas-${pantalla}-${nombre}-${tema}`
        if (filtro && !id.includes(filtro)) continue
        const ctx = await b.createBrowserContext()
        try {
          const p = await abrirGrabar(ctx, { pantalla, tema })
          await pasos(p)
          // ¿La primera fila cabe sin deslizar? scrollWidth contra clientWidth del carril.
          const desliza = await p.evaluate(() => {
            const c = document.querySelector('.carril-fichas:not(.segunda-fila-fichas)')
            return c ? [c.scrollWidth, c.clientWidth] : null
          })
          await p.screenshot({ path: path.join(SALIDA, `${id}.png`) })
          console.log('  lista', id, 'carril scrollWidth/clientWidth', JSON.stringify(desliza))
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
