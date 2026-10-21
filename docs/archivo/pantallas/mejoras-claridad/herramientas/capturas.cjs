// LAS CAPTURAS DE LOS BOCETOS -mejoras de claridad, 21-10-2026-. Con un vite del repo en 127.0.0.1:5191
// -npx vite --host 127.0.0.1 --port 5191, desde la raíz-:
//   node docs/archivo/pantallas/mejoras-claridad/herramientas/capturas.cjs
// Por cada mejora, tema y versión -antes, la app de hoy; después, la misma app con boceto-despues- abre
// app-real.html en un teléfono de 392 de ancho, siembra tres guiones y tres videos en IndexedDB, llega a
// la pantalla de la mejora tocando como una persona, y guarda capturas/<mejora>-<pantalla>-<tema>-<versión>.png.
// -paso 2- Con «codigo» como segundo argumento -node capturas.cjs 3 codigo- saca la app de la rama, ya con
// las mejoras en src/ y sin boceto, en los dos temas: capturas/<mejora>-<pantalla>-<tema>-codigo.png.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const D = path.join(__dirname, '..', 'capturas')
fs.mkdirSync(D, { recursive: true })
const BASE = 'http://127.0.0.1:5191/docs/archivo/pantallas/mejoras-claridad/herramientas/app-real.html'
const ANCHO = 392, ALTO = 852
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// Lo que se mira en cada mejora: las pantallas y los temas.
const MEJORAS = {
  1: { pantallas: ['entrada'], temas: ['oscuro'] },
  2: { pantallas: ['portada', 'editor'], temas: ['oscuro'] },
  3: { pantallas: ['portada'], temas: ['oscuro', 'claro'] },
  4: { pantallas: ['aviso'], temas: ['oscuro', 'claro'] },
  5: { pantallas: ['ajustes', 'editor'], temas: ['oscuro'] }
}

function mini(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs><rect width="240" height="160" fill="url(#g)"/><ellipse cx="120" cy="58" rx="28" ry="28" fill="#2b2624"/><path d="M72 160 Q72 95 120 95 Q168 95 168 160 Z" fill="#2b2624"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
async function sembrar(p) {
  const ahora = Date.now()
  const minis = [mini('#6b5a4e', '#2f2a27'), mini('#c9d6e3', '#6d7f92'), mini('#f1e3c8', '#b98b5a')]
  await p.evaluate(async ({ ahora, minis }) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open('teleprompter_db', 2)
      req.onerror = () => rej(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['guiones', 'grabaciones'], 'readwrite')
        const g = tx.objectStore('guiones'), v = tx.objectStore('grabaciones')
        g.clear(); v.clear()
        const palabras = (n, frase) => { const p = frase.split(' '); return Array.from({ length: n }, (_, i) => p[i % p.length]).join(' ') }
        const guion = (id, titulo, texto, t) => ({ id, titulo, idioma: 'es', creado: t, modificado: t, bloques: [{ id: id + '-b', nombre: '', texto }] })
        // 2631 palabras: 17:32 min a 150 por minuto, los números del encargo.
        g.put(guion('g-vieras', 'Si me vieras por dentro', palabras(2631, 'Si me vieras por dentro sabrías que cada palabra de este guion la escribí pensando en ti y en lo que vinimos a contar hoy.'), ahora - 1000))
        g.put(guion('g-lanzamiento', 'Lanzamiento de otoño', palabras(380, 'Hola a todos. Hoy les quiero contar algo que venimos preparando hace meses.'), ahora - 3600000))
        g.put(guion('g-saludo', 'Saludo para el canal', palabras(120, 'Bienvenidos de vuelta al canal. En este video vamos a revisar tres ideas simples.'), ahora - 86400000 * 3))
        const tomas = [['v1', 'g-vieras', 'Si me vieras por dentro'], ['v2', 'g-lanzamiento', 'Lanzamiento de otoño'], ['v3', 'g-saludo', 'Saludo para el canal']]
        tomas.forEach(([id, gid, titulo], i) => v.put({ id, guionId: gid, tituloGuion: titulo, creado: ahora - i * 3600000, duracionMs: 42000 + i * 17000, bytes: 120000, ruta: '/' + id + '.mp4', rutaMiniatura: minis[i], tieneAudio: true, incompleta: false, orientacion: 'vertical' }))
        tx.oncomplete = () => { db.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
    })
  }, { ahora, minis })
}
async function mantener(p, sel, ms) {
  const el = await p.waitForSelector(sel, { timeout: 15000 })
  const r = await el.boundingBox()
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
  await p.mouse.down()
  await dormir(ms)
  await p.mouse.up()
}

async function captura(br, mejora, pantalla, tema, version, codigo = false) {
  const p = await br.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', mejora, pantalla, e.message.slice(0, 200)))
  await p.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 2, isMobile: true, hasTouch: false })
  await p.evaluateOnNewDocument((tema) => {
    localStorage.setItem('sigo_idioma', 'es')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema, fontSize: 32, mostrarTiempo: true, anclajeZona: 'arriba' }))
  }, tema)
  const url = `${BASE}?version=${version}&mejora=${pantalla === 'entrada' ? 1 : mejora}`
  await p.goto(url, { waitUntil: 'networkidle2' })
  if (pantalla !== 'entrada') {
    await p.waitForSelector('[data-testid="tarjeta-lectura-portada"]', { timeout: 20000 })
    await sembrar(p)
    await p.reload({ waitUntil: 'networkidle2' })
    await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 20000 })
    await dormir(2800)
  } else await dormir(1200)
  if (pantalla === 'editor') {
    await p.click('[data-testid="fila-guion-g-vieras"]')
    await dormir(1800)
  }
  if (pantalla === 'ajustes') {
    await p.click('[data-testid="btn-menu-superior-biblioteca"]')
    await dormir(1500)
  }
  if (pantalla === 'aviso') {
    await mantener(p, '[data-testid="fila-guion-g-saludo"]', 800)
    await dormir(500)
    await p.click('[data-testid="menu-opciones-g-saludo"] .peligro')
    await dormir(900)
  }
  // -paso 2- En la portada del código, la página baja hasta el final: se ven los títulos de video y su fecha.
  // -2026-10-21- Antes era la ÚNICA captura de la portada del código, y bajada la cabecera -con «Sig●»- queda
  // fuera de la pantalla: en la lámina parecía que la marca se había ido. Ahora primero la portada arriba,
  // con la marca, y después la bajada, en <mejora>-portada-abajo-<tema>-codigo.png. Antes:
  // if (codigo && pantalla === 'portada') { await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await dormir(600) }
  if (codigo && pantalla === 'portada') {
    await p.screenshot({ path: path.join(D, `${mejora}-portada-${tema}-codigo.png`) })
    console.log('ok', `${mejora}-portada-${tema}-codigo.png`)
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await dormir(600)
    pantalla = 'portada-abajo'
  }
  const salida = path.join(D, `${mejora}-${pantalla}-${tema}-${codigo ? 'codigo' : version}.png`)
  await p.screenshot({ path: salida })
  console.log('ok', path.basename(salida))
  await p.close()
}
;(async () => {
  const solo = process.argv[2]
  const codigo = process.argv[3] === 'codigo'
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] })
  for (const [mejora, m] of Object.entries(MEJORAS)) {
    if (solo && solo !== mejora) continue
    if (codigo) {
      for (const pantalla of m.pantallas) for (const tema of ['oscuro', 'claro']) await captura(br, mejora, pantalla, tema, 'antes', true)
      continue
    }
    for (const pantalla of m.pantallas) for (const tema of m.temas) for (const version of ['antes', 'despues']) {
      await captura(br, mejora, pantalla, tema, version)
    }
  }
  await br.close()
})().catch((e) => { console.error(e); process.exit(1) })
