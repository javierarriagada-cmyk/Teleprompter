// node cap.cjs <url> <tema> <carpeta> <sufijo> [extra] — 412x915, siembra 2 guiones y 3 videos, recorre editor, Ajustes, menu pegado, LISTO y visor.
// Con 'extra': portada, fichas de LISTO, aviso breve, dock de LISTO abierto, menu pegado de Ajustes y -con los permisos negados- un dialogo.
const puppeteer = require('/tmp/capvf/node_modules/puppeteer-core')
const [,, URL, TEMA, DIR, SUF, EXTRA] = process.argv
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function mini(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs><rect width="240" height="160" fill="url(#g)"/><ellipse cx="120" cy="58" rx="28" ry="28" fill="#2b2624"/><path d="M72 160 Q72 95 120 95 Q168 95 168 160 Z" fill="#2b2624"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
;(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument((tema) => {
    localStorage.setItem('sigo_idioma', 'es')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema, fontSize: 32, mostrarTiempo: true, anclajeZona: 'arriba' }))
  }, TEMA)
  if (EXTRA === 'negar') await p.evaluateOnNewDocument(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('camera permission denied'), { code: 'cameraPermissionDenied', name: 'NotAllowedError' })) })
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
  const portada = async () => {
    await p.goto(URL, { waitUntil: 'networkidle2' })
    await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 20000 })
    await sleep(2500)
  }
  const shot = async (n) => { await sleep(900); await p.screenshot({ path: `${DIR}/${n}-${SUF}.png` }); console.log('ok', n) }
  const paso = async (n, fn) => { try { await portada(); await fn(); await shot(n) } catch (e) { console.log('FALLO', n, e.message.slice(0, 150)) } }
  if (EXTRA === 'negar') {
    // La camara rechaza el permiso como el plugin en Android -cameraPermissionDenied-: App abre el dialogo de permiso real.
    await paso('10-dialogo', async () => { await p.click('[data-testid="btn-grabar-tarjeta"]'); await p.waitForSelector('.dialogo-ajustes', { timeout: 20000 }); await sleep(800) })
  } else if (EXTRA === 'extra') {
    await paso('6-portada', async () => {})
    await paso('7-listo-fichas', async () => { await p.click('[data-testid="btn-leer-tarjeta"]'); await sleep(2500) })
    await paso('8-aviso-breve', async () => { await p.evaluate(() => { const el = document.querySelector('[data-testid="fila-guion-g-saludo"]'); el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 400 })) }); await sleep(1000); for (let i = 0; i < 2; i++) { await p.evaluate(() => { const b = document.querySelector('.fila-menu-adjunto-guion.peligro'); if (b) b.click() }); await sleep(400) } })
    await paso('9-dock-abierto', async () => { await p.click('[data-testid="btn-grabar-tarjeta"]'); await sleep(3500); await p.click('[data-testid="btn-ajustes-toma"]'); await sleep(1200) })
    await paso('11-menu-ajustes', async () => { await p.click('[data-testid="btn-menu-superior-biblioteca"]'); await sleep(1200); await p.click('[data-testid="fila-tipo-letra"]'); await sleep(1000) })
  } else {
  await paso('1-editor', async () => { await p.click('[data-testid="btn-leer-tarjeta"]').catch(()=>{}); await sleep(100); await portada(); await p.evaluate(() => document.querySelector('[data-testid^="fila-guion-g-lanzamiento"] .fila-guion-cara, [data-testid="fila-guion-g-lanzamiento"]').click()); await sleep(1500) })
    await paso('2-ajustes', async () => { await p.click('[data-testid="btn-menu-superior-biblioteca"]'); await sleep(1200) })
    await paso('3-menu-pegado', async () => { await p.evaluate(() => { const el = document.querySelector('[data-testid="fila-guion-g-saludo"]'); el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 400 })) }); await sleep(1000) })
    await paso('4-listo-panel', async () => { await p.click('[data-testid="btn-leer-tarjeta"]'); await sleep(2500); await p.click('[data-testid="ficha-letra"]'); await sleep(1000) })
    await paso('5-visor', async () => { await p.click('[data-testid="tarjeta-grabacion-v1"]'); await sleep(2000) })
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
