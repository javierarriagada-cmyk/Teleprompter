// LAS CAPTURAS DEL BOCETO DEL PORTUGUÉS -portugues-voz, 2026-10-22-. Mismo método que mejoras-claridad y tarea90.
// Con un vite del repo en 127.0.0.1:5191 -npx vite --host 127.0.0.1 --port 5191, desde la raíz-:
//   node docs/pantallas/portugues/herramientas/capturas.cjs
// Abre app-real.html en un teléfono de 360 de ancho, con la app en español, siembra un guion en inglés y uno en
// portugués, entra al editor tocando la fila y abre el menú de idioma -2026-10-22, del código; antes, el boceto-. Guarda capturas/editor-<guion>-<tema>.png.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const D = path.join(__dirname, '..', 'capturas')
fs.mkdirSync(D, { recursive: true })
const BASE = 'http://127.0.0.1:5191/docs/pantallas/portugues/herramientas/app-real.html'
const ANCHO = 360, ALTO = 780
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

const TEXTO_EN = 'Hi everyone. Today I want to tell you about something we have been working on for months. It started as a small idea in a coffee shop, and now it is ready for you to try. Let me walk you through the three things that changed the most.'
const TEXTO_PT = 'Bom dia! Meu nome é Roberto e hoje eu vou contar uma história que começou em 1985, na cidade de Campinas, no interior de São Paulo. Naquela época eu trabalhava numa fábrica de peças para automóveis.'

async function sembrar(p) {
  const ahora = Date.now()
  await p.evaluate(async ({ ahora, TEXTO_EN, TEXTO_PT }) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open('teleprompter_db', 2)
      req.onerror = () => rej(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['guiones', 'grabaciones'], 'readwrite')
        const g = tx.objectStore('guiones')
        g.clear(); tx.objectStore('grabaciones').clear()
        const guion = (id, titulo, idioma, texto, t) => ({ id, titulo, idioma, creado: t, modificado: t, bloques: [{ id: id + '-b', nombre: '', texto }] })
        g.put(guion('g-en', 'Product launch', 'en', TEXTO_EN, ahora - 1000))
        g.put(guion('g-pt', 'A fábrica de Campinas', 'pt', TEXTO_PT, ahora - 3600000))
        tx.oncomplete = () => { db.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
    })
  }, { ahora, TEXTO_EN, TEXTO_PT })
}

async function captura(br, guion, tema) {
  const p = await br.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', guion, tema, e.message.slice(0, 200)))
  await p.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 2, isMobile: true, hasTouch: false })
  await p.evaluateOnNewDocument((tema) => {
    localStorage.setItem('sigo_idioma', 'es')
    // -2026-10-22- Cada captura parte sin el aviso del idioma visto y sin la marca de guía del idioma pendiente.
    localStorage.removeItem('teleprompter_aviso_idioma_guion_en')
    localStorage.removeItem('teleprompter_aviso_idioma_guion_es')
    localStorage.setItem('teleprompter_marca_idioma', 'true')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema, fontSize: 32, mostrarTiempo: true, anclajeZona: 'arriba' }))
  }, tema)
  await p.goto(`${BASE}?guion=${guion}`, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="tarjeta-lectura-portada"]', { timeout: 20000 })
  await sembrar(p)
  await p.reload({ waitUntil: 'networkidle2' })
  await p.waitForSelector(`[data-testid="fila-guion-g-${guion}"]`, { timeout: 20000 })
  await dormir(2500)
  await p.click(`[data-testid="fila-guion-g-${guion}"]`)
  await p.waitForSelector('[data-testid="btn-idioma-guion"]', { timeout: 15000 })
  // -2026-10-22- Del código: el aviso del punto 7 sale solo -guion en inglés, app en español- y el menú del
  // punto 6 se abre tocando el botón. Antes: dormir(1500) y se abría el boceto con window.__abrirBoceto.
  await dormir(1200)
  await p.click('[data-testid="btn-idioma-guion"]')
  await p.waitForSelector('[data-testid="menu-idioma-guion"]', { timeout: 5000 })
  await dormir(700)
  if (guion === 'en' && !(await p.$('[data-testid="aviso-flotante"]'))) console.log('FALTA EL AVISO', tema)
  const salida = path.join(D, `editor-${guion}-${tema}.png`)
  await p.screenshot({ path: salida })
  console.log('ok', path.basename(salida))
  await p.close()
}
;(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] })
  for (const tema of ['claro', 'oscuro']) for (const guion of ['en', 'pt']) await captura(br, guion, tema)
  await br.close()
})().catch((e) => { console.error(e); process.exit(1) })
