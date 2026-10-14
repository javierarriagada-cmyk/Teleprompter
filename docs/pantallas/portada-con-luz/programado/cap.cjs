// node cap.cjs <url> <tema> <salida.png>  — portada 412x915, siembra 2 guiones y 3 videos en IndexedDB.
const puppeteer = require('/tmp/capvf/node_modules/puppeteer-core')
const [,, URL, TEMA, SALIDA] = process.argv
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function mini(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs><rect width="240" height="160" fill="url(#g)"/><ellipse cx="120" cy="58" rx="28" ry="28" fill="#2b2624"/><path d="M72 160 Q72 95 120 95 Q168 95 168 160 Z" fill="#2b2624"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
;(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] })
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument((tema) => {
    localStorage.setItem('sigo_idioma', 'es')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema, fontSize: 32, mostrarTiempo: true, anclajeZona: 'arriba' }))
  }, TEMA)
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="tarjeta-lectura-portada"]', { timeout: 20000 })
  await sleep(1500)
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
        const guion = (id, titulo, texto, t) => ({ id, titulo, idioma: 'es', creado: t, modificado: t, bloques: [{ id: id + '-b', nombre: '', texto }] })
        g.put(guion('g-lanzamiento', 'Lanzamiento de otoño', 'Hola a todos. Hoy les quiero contar algo que venimos preparando hace meses. '.repeat(6), ahora - 1000))
        g.put(guion('g-saludo', 'Saludo para el canal', 'Bienvenidos de vuelta al canal. En este video vamos a revisar tres ideas simples. '.repeat(3), ahora - 86400000))
        ;['v1', 'v2', 'v3'].forEach((id, i) => v.put({ id, guionId: i ? 'g-saludo' : 'g-lanzamiento', tituloGuion: i ? 'Saludo para el canal' : 'Lanzamiento de otoño', creado: ahora - i * 3600000, duracionMs: 42000 + i * 17000, bytes: 120000, ruta: '/' + id + '.mp4', rutaMiniatura: minis[i], tieneAudio: true, incompleta: false, orientacion: 'vertical' }))
        tx.oncomplete = () => { db.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
    })
  }, { ahora, minis })
  await p.reload({ waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 20000 })
  await sleep(2500)
  console.log('tema', await p.evaluate(() => document.documentElement.getAttribute('data-tema')))
  await p.screenshot({ path: SALIDA })
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
