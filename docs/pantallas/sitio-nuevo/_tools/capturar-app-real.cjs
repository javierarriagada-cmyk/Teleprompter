// Capturas de la app real (src/ en main via Vite) para el prototipo sitio-nuevo.
// No modifica src/. Salidas: activos/capturas-app/*.png y crops WebP.
// Uso: con `npx vite --host 127.0.0.1 --port 5199` desde un worktree de main:
//   node docs/pantallas/sitio-nuevo/_tools/capturar-app-real.mjs
const puppeteer = require('/tmp/capvf/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'activos', 'capturas-app')
const CROPS = path.join(ROOT, 'activos', 'capturas-webp', 'crops')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(CROPS, { recursive: true })

const BASE = process.env.APP_URL || 'http://127.0.0.1:5199/'
// Proto-tel usa 360/780; user pidió ~392. Usamos 392×850 (~9:19.5) DPR 2.
const ANCHO = 392
const ALTO = 850
const DPR = 2
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TEXTO = 'Hoy quiero contarte algo importante. Al grabar un video, corto o largo, leer de un papel siempre se nota. Ahora leo, hablo y el texto me sigue. Sin apuro. Sin perder el hilo. Y lo que no se me puede pasar, lo marco en amarillo. Si me detengo a pensar, el texto me espera. Cuando vuelvo a hablar, sigue conmigo.'

function mini(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs><rect width="240" height="160" fill="url(#g)"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

async function sembrar(p) {
  const ahora = Date.now()
  const minis = [mini('#6b5a4e', '#2f2a27'), mini('#c9d6e3', '#6d7f92')]
  await p.evaluate(async ({ ahora, minis, TEXTO }) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open('teleprompter_db', 2)
      req.onerror = () => rej(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['guiones', 'grabaciones'], 'readwrite')
        const g = tx.objectStore('guiones')
        const v = tx.objectStore('grabaciones')
        g.put({
          id: 'g-lanzamiento',
          titulo: 'Lanzamiento de otoño',
          idioma: 'es',
          creado: ahora - 1000,
          modificado: ahora - 1000,
          bloques: [{ id: 'g-lanzamiento-b', nombre: '', texto: TEXTO }]
        })
        g.put({
          id: 'g-saludo',
          titulo: 'Saludo para el canal',
          idioma: 'es',
          creado: ahora - 86400000,
          modificado: ahora - 86400000,
          bloques: [{ id: 'g-saludo-b', nombre: '', texto: 'Bienvenidos de vuelta al canal. En este video vamos a revisar tres ideas simples para grabar con calma.' }]
        })
        v.put({
          id: 'v1', guionId: 'g-lanzamiento', tituloGuion: 'Lanzamiento de otoño',
          creado: ahora - 3600000, duracionMs: 42000, bytes: 120000,
          ruta: '/v1.mp4', rutaMiniatura: minis[0], tieneAudio: true, incompleta: false, orientacion: 'vertical'
        })
        tx.oncomplete = () => { db.close(); res() }
        tx.onerror = () => rej(tx.error)
      }
    })
  }, { ahora, minis, TEXTO })
}

async function nuevaPagina(br, extraLS = {}) {
  const ctx = await br.createBrowserContext()
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 220)))
  await p.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: DPR, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument((ls) => {
    localStorage.setItem('sigo_idioma', 'es')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_marca_idioma', 'true')
    const base = {
      tema: 'oscuro',
      fontSize: 32,
      mostrarTiempo: true,
      anclajeZona: 'arriba',
      fondoToma: 'recuadro',
      recuadroX: 0.68,
      recuadroY: 0.58,
      ladoCamara: 'frontal'
    }
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ ...base, ...ls.ajustes }))
    if (ls.modo) localStorage.setItem('sigo_modo_lectura', ls.modo)
    if (ls.nivel != null) localStorage.setItem('sigo_nivel_fijo', String(ls.nivel))
  }, extraLS)
  await p.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"], [data-testid^="fila-guion-"]', { timeout: 30000 })
  await sleep(1800)
  await sembrar(p)
  await p.reload({ waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 30000 })
  await sleep(2200)
  return { p, ctx }
}

async function shot(p, nombre) {
  const dest = path.join(OUT, nombre + '.png')
  await sleep(600)
  await p.screenshot({ path: dest, type: 'png' })
  console.log('ok', nombre, dest)
  return dest
}

function aWebp(pngPath, webpName, { maxH } = {}) {
  const dest = path.join(CROPS, webpName)
  // Full-width phone screen; optional whole-line crop from bottom if taller than frame.
  // Target display size ~720 wide (DPR2 of 360) to match prior crops; keep native 784×1700 and let CSS object-fit.
  const args = ['-y', '-i', pngPath]
  if (maxH) {
    // Crop bottom if taller; keep top (status/UI). Fade applied in CSS if needed.
    args.push('-vf', `crop=iw:min(ih\\,${maxH}):0:0`)
  }
  args.push('-quality', '88', dest)
  execFileSync('ffmpeg', args, { stdio: 'pipe' })
  console.log('webp', webpName)
  return dest
}

;(async () => {
  const br = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--lang=es-CL',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--use-file-for-fake-video-capture=/tmp/capvf/cam.y4m',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required'
    ]
  })

  // 1) GUIONES: Ajustes con Continuar con Google / Cuenta + respaldo
  {
    const { p, ctx } = await nuevaPagina(br, { ajustes: { tema: 'oscuro' } })
    await p.click('[data-testid="btn-menu-superior-biblioteca"]')
    await p.waitForSelector('[data-testid="seccion-cuenta"], [data-testid="btn-continuar-con-google"]', { timeout: 20000 })
    await sleep(1200)
    // Scroll to top so Cuenta card is fully visible
    await p.evaluate(() => {
      const sc = document.querySelector('.panel-ajustes, .dock-listo, [data-testid="panel-ajustes"], .panel-ajustes-cuerpo, .lista-ajustes')
      const el = document.querySelector('[data-testid="seccion-cuenta"]')
      if (el) el.scrollIntoView({ block: 'start' })
      const panel = el?.closest('.panel-ajustes, .capa-ajustes, [class*="ajustes"]')
      if (panel) panel.scrollTop = 0
    })
    await sleep(800)
    const info = await p.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-continuar-con-google"]')
      const sec = document.querySelector('[data-testid="seccion-cuenta"]')
      return {
        btn: !!btn,
        sec: !!sec,
        texto: btn?.textContent?.trim() || sec?.textContent?.slice(0, 120) || 'NO'
      }
    })
    console.log('cuenta UI', info)
    await shot(p, 'guiones-cuenta')
    await ctx.close()
  }

  // 2) GRABAR: cámara en recuadro + timer (fake still detrás)
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fondoToma: 'recuadro', mostrarTiempo: true, fontSize: 34 }
    })
    await p.click('[data-testid="btn-grabar-tarjeta"]')
    await sleep(3500)
    // Empezar toma → cuenta regresiva / timer
    const empezar = await p.$('[data-testid="btn-empezar-toma"]')
    if (empezar) {
      await empezar.click()
      await sleep(2200) // mid-countdown or just into recording
    } else {
      console.log('sin btn-empezar-toma; capturo LISTO de Grabar')
      await sleep(1000)
    }
    // Ensure camera video element present
    const cam = await p.evaluate(() => ({
      video: !!document.querySelector('video'),
      cuenta: !!document.querySelector('[data-testid="cuenta-regresiva"]'),
      tiempo: !!document.querySelector('[data-testid="tiempo-grabacion"], .tiempo-grabacion, .cronometro')
    }))
    console.log('grabar estado', cam)
    await shot(p, 'grabar-recuadro')
    await ctx.close()
  }

  // 3) LEER: pantalla de lectura
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fontSize: 34, fondoTiempo: true },
      modo: 'voz'
    })
    await p.click('[data-testid="btn-leer-tarjeta"]')
    await sleep(2500)
    const empezar = await p.$('[data-testid="btn-empezar-toma"]')
    if (empezar) {
      await empezar.click()
      await sleep(2800)
    }
    // Scroll texto a mid if possible
    await p.evaluate(() => {
      const zona = document.querySelector('.zona-texto, .teleprompter, [data-testid="zona-lectura"]')
      if (zona) zona.scrollTop = Math.min(180, zona.scrollHeight / 4)
    })
    await sleep(500)
    await shot(p, 'leer')
    await ctx.close()
  }

  // 4) AJUSTES / ENSAYOS: velocidad fija (ficha abierta en LISTO)
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fontSize: 32 },
      modo: 'fija',
      nivel: 3
    })
    await p.click('[data-testid="btn-leer-tarjeta"]')
    await sleep(2500)
    const ficha = await p.$('[data-testid="ficha-modo-lectura"]')
    if (ficha) {
      await ficha.click()
      await sleep(900)
      const fija = await p.$('[data-testid="btn-modo-fija"]')
      if (fija) await fija.click()
      await sleep(600)
      // Reopen so selector shows with fija checked
      const ficha2 = await p.$('[data-testid="ficha-modo-lectura"]')
      if (ficha2) {
        const abierta = await p.evaluate(() => document.querySelector('.ficha-modo-lectura .selector-modo, .selector-modo'))
        if (!abierta) {
          await ficha2.click()
          await sleep(700)
        }
      }
    }
    const info = await p.evaluate(() => ({
      ficha: !!document.querySelector('[data-testid="ficha-modo-lectura"]'),
      selector: !!document.querySelector('.selector-modo'),
      fija: document.querySelector('[data-testid="btn-modo-fija"]')?.getAttribute('aria-checked')
    }))
    console.log('velocidad fija', info)
    await shot(p, 'ajustes-velocidad-fija')
    await ctx.close()
  }

  await br.close()

  // Convert to WebP for proto-tel (full frame; CSS crops with fade if needed)
  aWebp(path.join(OUT, 'grabar-recuadro.png'), 'uso-videos.webp')
  aWebp(path.join(OUT, 'leer.png'), 'uso-clases.webp')
  aWebp(path.join(OUT, 'ajustes-velocidad-fija.png'), 'uso-ensayos.webp')
  aWebp(path.join(OUT, 'guiones-cuenta.png'), 'guiones-ui.webp')
  console.log('DONE')
})().catch((e) => { console.error(e); process.exit(1) })
