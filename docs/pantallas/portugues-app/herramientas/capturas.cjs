// LAS CAPTURAS DE LA APP EN PORTUGUÉS -portugues-app, punto 6, 2026-10-22-. Mismo método que
// docs/pantallas/portugues/herramientas/capturas.cjs. Con un vite del repo en 127.0.0.1:5191
// -npx vite --host 127.0.0.1 --port 5191, desde la raíz-:
//   node docs/pantallas/portugues-app/herramientas/capturas.cjs
// Teléfono de 360 de ancho, app en portugués, tema oscuro. Cada captura en un contexto nuevo: la primera
// apertura pone el Olá. Guarda capturas/<nombre>.png.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const D = path.join(__dirname, '..', 'capturas')
fs.mkdirSync(D, { recursive: true })
const BASE = 'http://127.0.0.1:5191/docs/pantallas/portugues-app/herramientas/app-real.html'
const ANCHO = 360, ALTO = 780
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const TEXTO_ES = 'Hola a todos. Hoy quiero contarles algo en lo que trabajamos durante meses. Empezó como una idea chica en un café, y ahora está lista para que la prueben.'

async function sembrarGuionEs(p) {
  await p.evaluate(async (TEXTO_ES) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open('teleprompter_db', 2)
      req.onerror = () => rej(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['guiones'], 'readwrite')
        const t = Date.now()
        tx.objectStore('guiones').put({ id: 'g-es', titulo: 'Lanzamiento', idioma: 'es', creado: t, modificado: t, bloques: [{ id: 'g-es-b', nombre: '', texto: TEXTO_ES }] })
        tx.oncomplete = () => { db.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
    })
  }, TEXTO_ES)
}

async function pagina(br) {
  const ctx = await br.createBrowserContext()
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
  await p.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 2, isMobile: true, hasTouch: false })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('sigo_idioma', 'pt')
    localStorage.setItem('teleprompter_marca_idioma', 'true')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema: 'oscuro', fontSize: 32, mostrarTiempo: true, anclajeZona: 'arriba' }))
  })
  await p.goto(BASE, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid^="fila-guion-"]', { timeout: 20000 })
  await dormir(4000)
  return { p, ctx }
}
async function guardar(p, nombre) {
  await p.screenshot({ path: path.join(D, nombre + '.png') })
  console.log('ok', nombre)
}
;(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=pt-BR'] })
  let { p, ctx } = await pagina(br)
  await guardar(p, '1-roteiros')
  await p.click('[data-testid^="fila-guion-bienvenida-"]')
  await p.waitForSelector('[data-testid="btn-idioma-guion"]', { timeout: 15000 })
  await dormir(1500)
  await guardar(p, '2-ola-editor')
  await ctx.close()
  ;({ p, ctx } = await pagina(br))
  await p.click('[aria-label="Configurações"]')
  await p.waitForSelector('[data-testid="fila-idioma"]', { timeout: 10000 })
  await dormir(800)
  await guardar(p, '3-configuracoes')
  await p.evaluate(() => document.querySelector('[data-testid="fila-idioma"]').scrollIntoView({ block: 'center' }))
  await p.click('[data-testid="fila-idioma"]')
  await p.waitForSelector('[data-testid="selector-idioma-app"]', { timeout: 5000 })
  await dormir(600)
  await guardar(p, '4-idioma-do-app')
  await ctx.close()
  ;({ p, ctx } = await pagina(br))
  await sembrarGuionEs(p)
  await p.reload({ waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="fila-guion-g-es"]', { timeout: 20000 })
  await dormir(1500)
  await p.click('[data-testid="fila-guion-g-es"]')
  await p.waitForSelector('[data-testid="btn-idioma-guion"]', { timeout: 15000 })
  await p.waitForSelector('[data-testid="aviso-flotante"]', { timeout: 8000 }).catch(() => console.log('FALTA EL AVISO'))
  await dormir(500)
  await guardar(p, '5-aviso-guion-em-espanhol')
  await ctx.close()
  await br.close()
})().catch((e) => { console.error(e); process.exit(1) })
