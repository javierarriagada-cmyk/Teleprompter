const puppeteer = require('/tmp/capvf/node_modules/puppeteer-core')
const URL = process.argv[2]
function mini(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs><rect width="240" height="160" fill="url(#g)"/><ellipse cx="120" cy="58" rx="28" ry="28" fill="#2b2624"/><path d="M72 160 Q72 95 120 95 Q168 95 168 160 Z" fill="#2b2624"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
;(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 412, height: 915 })
  await p.evaluateOnNewDocument(() => { localStorage.setItem('sigo_idioma', 'es'); localStorage.setItem('teleprompter_oscuro_impuesto', 'true'); localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema: 'oscuro', fontSize: 32 })) })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="tarjeta-lectura-portada"]')
  await new Promise(r => setTimeout(r, 1500))
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
  await p.reload({ waitUntil: 'networkidle2' }); await p.waitForSelector('[data-testid="tarjeta-grabacion-v1"]'); await new Promise(r => setTimeout(r, 1500))
  const r = await p.evaluate(() => ['.portada .fila-guion-caja.tarjeta-elevada', '.portada .tarjeta-video.borde-suave', '.portada .tarjeta-lectura-borde-iluminado.tarjeta-elevada', '.btn-grabar'].map(s => { const e = document.querySelector(s); if (!e) return s + ': NO HAY'; const c = getComputedStyle(e); return s + '\n  image=' + c.backgroundImage.slice(0, 160) + '\n  clip=' + c.backgroundClip + ' border=' + c.borderTopColor }))
  console.log(r.join('\n')); await b.close()
})()
