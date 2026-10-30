// Captura menús reales de la app (Vite) con .fila-menu-adjunto.elegida visible.
// Uso: node cap-menus.cjs <url> <carpeta> <sufijo>
const puppeteer = require('/tmp/capvf/node_modules/puppeteer-core')
const fs = require('fs')
const [,, URL, DIR, SUF] = process.argv
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  fs.mkdirSync(DIR, { recursive: true })
  const b = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--lang=es-CL', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  })
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 180)))
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('sigo_idioma', 'es')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({
      tema: 'oscuro', fontSize: 32, tipoFuente: 'sans', mostrarTiempo: true, anclajeZona: 'arriba'
    }))
  })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"], [data-testid="tarjeta-lectura-portada"]', { timeout: 25000 })
  await sleep(1200)
  const ahora = Date.now()
  await p.evaluate(async (ahora) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open('teleprompter_db', 2)
      req.onerror = () => rej(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['guiones'], 'readwrite')
        const g = tx.objectStore('guiones')
        g.put({
          id: 'g-lanzamiento', titulo: 'Lanzamiento de otoño', idioma: 'es',
          creado: ahora - 1000, modificado: ahora - 1000,
          bloques: [{ id: 'g-lanzamiento-b', nombre: '', texto: 'Hola a todos. Hoy les quiero contar algo importante. '.repeat(10) }]
        })
        tx.oncomplete = () => { db.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
    })
  }, ahora)
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 20000 })
  await sleep(1800)

  const shot = async (n) => {
    await sleep(600)
    const path = `${DIR}/${n}-${SUF}.png`
    await p.screenshot({ path })
    console.log('ok', n, path)
  }
  const portada = async () => {
    await p.goto(URL, { waitUntil: 'networkidle2' })
    await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 20000 })
    await sleep(1600)
  }
  const abrirAjustes = async () => {
    await p.click('[data-testid="btn-menu-superior-biblioteca"]')
    await sleep(900)
    await p.waitForSelector('[data-testid="fila-tipo-letra"], [data-testid="fila-tema"]', { timeout: 10000 })
  }
  const paso = async (n, fn) => {
    try {
      await portada()
      await fn()
      await shot(n)
    } catch (e) {
      console.log('FALLO', n, String(e.message || e).slice(0, 220))
    }
  }

  await paso('1-tipografia', async () => {
    await abrirAjustes()
    await p.click('[data-testid="fila-tipo-letra"]')
    await p.waitForSelector('.fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  await paso('2-tema', async () => {
    await abrirAjustes()
    await p.click('[data-testid="fila-tema"]')
    await p.waitForSelector('.fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  await paso('3-idioma-app', async () => {
    await abrirAjustes()
    await p.click('[data-testid="fila-idioma"]')
    await p.waitForSelector('[data-testid="selector-idioma-app"] .fila-menu-adjunto.elegida, .fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  await paso('4-tamano', async () => {
    await abrirAjustes()
    await p.click('[data-testid="fila-tamano-letra"]')
    await p.waitForSelector('.fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  await paso('5-ancho', async () => {
    await abrirAjustes()
    await p.click('[data-testid="fila-ancho-texto"]')
    await p.waitForSelector('.fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  await paso('6-colores', async () => {
    await abrirAjustes()
    await p.click('[data-testid="fila-colores"]')
    await p.waitForSelector('.fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  await paso('7-modo-lectura', async () => {
    await p.click('[data-testid="btn-leer-tarjeta"]')
    await sleep(2800)
    await p.waitForSelector('[data-testid="ficha-modo-lectura"]', { timeout: 10000 })
    await p.click('[data-testid="ficha-modo-lectura"]')
    await p.waitForSelector('[data-testid="dialogo-modo-lectura"] .fila-menu-adjunto.elegida', { timeout: 8000 })
  })

  // Tema claro: tipografía — menús de Ajustes siguen en data-tema=oscuro (crema, no marrón)
  await paso('8-tipografia-claro', async () => {
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-tema', 'claro')
      try {
        const a = JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}')
        a.tema = 'claro'
        localStorage.setItem('teleprompter_ajustes', JSON.stringify(a))
      } catch {}
    })
    await abrirAjustes()
    await p.click('[data-testid="fila-tipo-letra"]')
    await p.waitForSelector('.fila-menu-adjunto.elegida', { timeout: 6000 })
  })

  // Idioma del guion (editor): hereda el tema de la pantalla (no fuerza oscuro)
  await paso('10-idioma-guion', async () => {
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-tema', 'oscuro')
      try {
        const a = JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}')
        a.tema = 'oscuro'
        localStorage.setItem('teleprompter_ajustes', JSON.stringify(a))
      } catch {}
    })
    const crear = await p.$('[data-testid="btn-crear-guion"]')
    if (!crear) throw new Error('sin btn-crear-guion')
    await crear.click()
    await p.waitForSelector('[data-testid="btn-idioma-guion"]', { timeout: 15000 })
    await sleep(1200)
    await p.click('[data-testid="btn-idioma-guion"]')
    await p.waitForSelector('[data-testid="menu-idioma-guion"] .fila-menu-adjunto.elegida', { timeout: 8000 })
  })

  await paso('11-idioma-guion-claro', async () => {
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-tema', 'claro')
      try {
        const a = JSON.parse(localStorage.getItem('teleprompter_ajustes') || '{}')
        a.tema = 'claro'
        localStorage.setItem('teleprompter_ajustes', JSON.stringify(a))
      } catch {}
    })
    const crear = await p.$('[data-testid="btn-crear-guion"]')
    if (!crear) throw new Error('sin btn-crear-guion')
    await crear.click()
    await p.waitForSelector('[data-testid="btn-idioma-guion"]', { timeout: 15000 })
    await sleep(1200)
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-tema', 'claro')
    })
    await p.click('[data-testid="btn-idioma-guion"]')
    await p.waitForSelector('[data-testid="menu-idioma-guion"] .fila-menu-adjunto.elegida', { timeout: 8000 })
  })

  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
