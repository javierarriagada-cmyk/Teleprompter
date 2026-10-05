// LOS CONTROLES AL LEER Y GRABAR, EN LA APP REAL -tarea 83, parte B, 04-10-2026-. node controles.cjs [filtro]
//
// Con el servidor de las láminas de la 88 arriba, desde la raíz del repo:
//   npx vite --config docs/pantallas/tarea88/herramientas/vite.config.mjs --port 5183 --host 127.0.0.1
// Abre la app de siempre -index.html- en Chrome sin ventana, la lleva a cada estado tocando los mismos
// botones que una persona y guarda la pantalla en docs/pantallas/tarea83/controles-*.png. Las medidas de
// los botones y de la pastilla quedan en controles-medidas.json.
//
// LO QUE NO ES DE LA APP: no hay cámara ni grabación nativa en el navegador. Grabar se ve sobre el fondo
// de referencia de los bocetos -la de capturar.cjs- y SIN el punto rojo: el punto sale solo con la grabación nativa andando -grabandoVideo-.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')

const URL = process.env.SIGO_URL || 'http://127.0.0.1:5183/'
const SALIDA = process.env.SALIDA || path.join(__dirname, '..')
const filtro = process.argv[2] || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Teléfono -moto g86, 412×915- a 2 px por dp; tableta -sección 3 y 4 de la hoja- a 1,5.
const PANTALLAS = {
  'tel-v': { w: 412, h: 915, e: 2 },
  'tel-h': { w: 915, h: 412, e: 2 },
  'tab-v': { w: 820, h: 1180, e: 1.5 },
  'tab-h': { w: 1180, h: 820, e: 1.5 }
}

// La cámara de referencia de los bocetos -la misma de capturar.cjs-.
const CSS_CAMARA = `
#camara-simulada{position:fixed;z-index:-1;overflow:hidden;pointer-events:none;background:
  radial-gradient(55% 60% at 22% 28%,rgba(255,214,170,.38),transparent 70%),
  radial-gradient(50% 60% at 82% 72%,rgba(120,160,205,.34),transparent 70%),
  linear-gradient(160deg,#4d5866 0%,#5f524a 55%,#3b3532 100%)}
#camara-simulada .sil{position:absolute;left:50%;bottom:0;width:var(--silw,30%);aspect-ratio:1/1.05;transform:translateX(-50%);filter:blur(1.2px);opacity:.9}
#camara-simulada .sil::before{content:"";position:absolute;left:29%;top:0;width:42%;aspect-ratio:1;border-radius:50%;background:#2b2624}
#camara-simulada .sil::after{content:"";position:absolute;left:0;right:0;bottom:0;height:52%;border-radius:50% 50% 0 0/80% 80% 0 0;background:#2b2624}
video{opacity:0 !important}`

async function abrir(b, { pantalla, tema, puerta, pagina }) {
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
  await p.goto(pagina ? URL + pagina : URL, { waitUntil: 'networkidle2' })
  // La cámara de prueba de Chrome -un cuadro verde que se mueve- no es la de la toma: se esconde y en
  // Grabar se dibuja detrás la imagen de referencia de los bocetos, como en capturar.cjs.
  await p.addStyleTag({ content: CSS_CAMARA })
  if (puerta === 'grabar') {
    await p.evaluate(() => {
      const d = document.createElement('div')
      d.id = 'camara-simulada'
      d.innerHTML = '<div class="sil"></div>'
      d.style.cssText = 'inset:0;--silw:30%'
      document.body.prepend(d)
    })
  }
  const boton = puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'
  await p.waitForSelector(`[data-testid="${boton}"]`, { timeout: 30000 })
  await sleep(800)
  await p.click(`[data-testid="${boton}"]`)
  await p.waitForSelector('[data-testid="btn-empezar-toma"]')
  await sleep(1500)
  return p
}
async function empezar(p) {
  await p.click('[data-testid="btn-empezar-toma"]')
  await sleep(4200)
}
async function tocar(p) {
  await p.evaluate(() => document.querySelector('[data-testid="teleprompter-view-container"]').click())
  await sleep(800)
}
async function pausar(p) {
  await p.click('[data-testid="btn-pausa-lectura"]')
  await sleep(700)
}
const ESTADOS = [
  ['grabar-grabando', 'grabar', async (p) => { await empezar(p); await tocar(p) }],
  ['grabar-pausa', 'grabar', async (p) => { await empezar(p); await tocar(p); await pausar(p) }],
  ['grabar-pausa-seguro', 'grabar', async (p) => { await empezar(p); await tocar(p); await pausar(p); await p.click('[data-testid="btn-descartar-toma"]'); await sleep(600) }],
  ['leer-leyendo', 'leer', async (p) => { await empezar(p); await tocar(p) }],
  ['leer-pausa', 'leer', async (p) => { await empezar(p); await tocar(p); await pausar(p) }],
  // El aviso de LS-M2 sobre LISTO de Grabar -donde queda la toma después del corte-: aviso-m2.html.
  ['grabar-aviso-camara', 'grabar', async (p) => { await p.evaluate(() => window.mostrarAvisoM2()); await sleep(700) }, 'docs/pantallas/tarea83/herramientas/aviso-m2.html?recurso=camara'],
  ['grabar-aviso-microfono-en', 'grabar', async (p) => { await p.evaluate(() => window.mostrarAvisoM2()); await sleep(700) }, 'docs/pantallas/tarea83/herramientas/aviso-m2.html?recurso=microfono&idioma=en']
]

;(async () => {
  const b = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--lang=es-CL', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--hide-scrollbars']
  })
  const medidas = {}
  for (const pantalla of Object.keys(PANTALLAS)) {
    for (const tema of ['claro', 'oscuro']) {
      for (const [nombre, puerta, pasos, pagina] of ESTADOS) {
        const id = `controles-${pantalla}-${nombre}-${tema}`
        if (filtro && !id.includes(filtro)) continue
        const ctx = await b.createBrowserContext()
        try {
          const p = await abrir(ctx, { pantalla, tema, puerta, pagina })
          await pasos(p)
          medidas[id] = await p.evaluate(() => {
            const r = {}
            for (const s of ['btn-pausa-lectura', 'btn-parar-lectura', 'btn-descartar-toma', 'btn-salir-lectura', 'punto-grabando']) {
              const el = document.querySelector(`[data-testid="${s}"]`)
              if (el) { const c = el.getBoundingClientRect(); r[s] = [Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)] }
            }
            const pt = document.querySelector('.pastilla-tiempo')
            if (pt) { const c = pt.getBoundingClientRect(); r.pastilla = [Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)] }
            return r
          })
          await p.screenshot({ path: path.join(SALIDA, `${id}.png`) })
          console.log('  lista', id, JSON.stringify(medidas[id]))
        } catch (e) {
          console.log('  FALLÓ', id, e.message)
        } finally {
          await ctx.close()
        }
      }
    }
  }
  if (!filtro) fs.writeFileSync(path.join(SALIDA, 'controles-medidas.json'), JSON.stringify(medidas, null, 1) + '\n')
  await b.close()
})()
