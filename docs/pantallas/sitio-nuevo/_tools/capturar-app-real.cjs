// Capturas app real (src/ en main via Vite). No modifica src/.
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
const ANCHO = 392
const ALTO = 850
const DPR = 2
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TEXTO =
  'Hoy quiero contarte algo importante. Al grabar un video, corto o largo, leer de un papel siempre se nota. Ahora leo, hablo y el texto me sigue. Sin apuro. Sin perder el hilo. Y lo que no se me puede pasar, lo marco en amarillo. Si me detengo a pensar, el texto me espera. Cuando vuelvo a hablar, sigue conmigo.'

function mini(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs><rect width="240" height="160" fill="url(#g)"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

async function sembrar(p) {
  const ahora = Date.now()
  const minis = [mini('#6b5a4e', '#2f2a27'), mini('#c9d6e3', '#6d7f92')]
  await p.evaluate(
    async ({ ahora, minis, TEXTO }) => {
      await new Promise((res, rej) => {
        const req = indexedDB.open('teleprompter_db', 2)
        req.onerror = () => rej(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction(['guiones', 'grabaciones'], 'readwrite')
          const g = tx.objectStore('guiones')
          const v = tx.objectStore('grabaciones')
          // Títulos sin «otoño» (evita fragmento «toño» si asoma detrás del panel)
          g.put({
            id: 'g-lanzamiento',
            titulo: 'Lanzamiento del canal',
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
            bloques: [
              {
                id: 'g-saludo-b',
                nombre: '',
                texto:
                  'Bienvenidos de vuelta al canal. En este video vamos a revisar tres ideas simples para grabar con calma.'
              }
            ]
          })
          g.put({
            id: 'g-clase',
            titulo: 'Clase de hoy',
            idioma: 'es',
            creado: ahora - 172800000,
            modificado: ahora - 172800000,
            bloques: [{ id: 'g-clase-b', nombre: '', texto: TEXTO }]
          })
          v.put({
            id: 'v1',
            guionId: 'g-lanzamiento',
            tituloGuion: 'Lanzamiento del canal',
            creado: ahora - 3600000,
            duracionMs: 42000,
            bytes: 120000,
            ruta: '/v1.mp4',
            rutaMiniatura: minis[0],
            tieneAudio: true,
            incompleta: false,
            orientacion: 'vertical'
          })
          tx.oncomplete = () => {
            db.close()
            res()
          }
          tx.onerror = () => rej(tx.error)
        }
      })
    },
    { ahora, minis, TEXTO }
  )
}

async function nuevaPagina(br, extraLS = {}, vp = null) {
  const ctx = await br.createBrowserContext()
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 180)))
  const view = vp || { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, isMobile: true, hasTouch: true }
  await p.setViewport(view)
  await p.evaluateOnNewDocument((ls) => {
    localStorage.setItem('sigo_idioma', 'es')
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_marca_idioma', 'true')
    const base = {
      tema: 'oscuro',
      fontSize: 28,
      mostrarTiempo: true,
      anclajeZona: 'arriba',
      fondoToma: 'recuadro',
      recuadroX: 0.72,
      recuadroY: 0.52,
      ladoCamara: 'frontal'
    }
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ ...base, ...ls.ajustes }))
    if (ls.modo) localStorage.setItem('sigo_modo_lectura', ls.modo)
    if (ls.nivel != null) localStorage.setItem('sigo_nivel_fijo', String(ls.nivel))
  }, extraLS)
  await p.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"], [data-testid^="fila-guion-"]', { timeout: 30000 })
  await sleep(1200)
  await sembrar(p)
  await p.reload({ waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 30000 })
  await sleep(1800)
  // Dismiss possible onboarding
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const ent = btns.find((b) => /entendido|cerrar|ok/i.test(b.textContent || ''))
    if (ent) ent.click()
  })
  await sleep(400)
  return { p, ctx }
}

async function shot(p, nombre) {
  const dest = path.join(OUT, nombre + '.png')
  await sleep(500)
  await p.screenshot({ path: dest, type: 'png' })
  console.log('ok', nombre)
  return dest
}

function aWebp(pngPath, webpName) {
  const dest = path.join(CROPS, webpName)
  execFileSync('ffmpeg', ['-y', '-i', pngPath, '-quality', '86', dest], { stdio: 'pipe' })
  console.log('webp', webpName)
  return dest
}

async function clickTest(p, sel) {
  const el = await p.$(sel)
  if (!el) return false
  await p.evaluate((s) => document.querySelector(s)?.click(), sel)
  return true
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
      '--autoplay-policy=no-user-gesture-required'
    ]
  })

  // --- GUIONES: Ajustes + Continuar con Google (sin título otoño detrás) ---
  {
    const { p, ctx } = await nuevaPagina(br)
    await clickTest(p, '[data-testid="btn-menu-superior-biblioteca"]')
    await p.waitForSelector('[data-testid="seccion-cuenta"], [data-testid="btn-continuar-con-google"]', { timeout: 20000 })
    await sleep(1000)
    await p.evaluate(() => {
      const el = document.querySelector('[data-testid="seccion-cuenta"]')
      el?.scrollIntoView({ block: 'start' })
      // Ocultar cualquier fila de biblioteca que asome detrás del panel
      document.querySelectorAll('[data-testid^="fila-guion-"]').forEach((n) => {
        n.style.visibility = 'hidden'
      })
      const lista = document.querySelector('[data-testid="lista-guiones-biblioteca"]')
      if (lista) lista.style.visibility = 'hidden'
    })
    await sleep(600)
    await shot(p, 'guiones-cuenta')
    await ctx.close()
  }

  // --- VIDEOS / GRABAR: cámara real (person still) + recuadro + timer ---
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fondoToma: 'recuadro', mostrarTiempo: true, fontSize: 26, recuadroX: 0.74, recuadroY: 0.48 }
    })
    await clickTest(p, '[data-testid="btn-grabar-tarjeta"]')
    await sleep(4000)
    // Ensure video has frames
    const cam = await p.evaluate(async () => {
      const v = document.querySelector('video')
      if (!v) return { video: false }
      await new Promise((r) => setTimeout(r, 500))
      return {
        video: true,
        w: v.videoWidth,
        h: v.videoHeight,
        ready: v.readyState,
        paused: v.paused
      }
    })
    console.log('camara', cam)
    await shot(p, 'grabar-recuadro')
    await ctx.close()
  }

  // --- CLASES / LEER ---
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fontSize: 30, mostrarTiempo: true },
      modo: 'voz'
    })
    await clickTest(p, '[data-testid="btn-leer-tarjeta"]')
    await sleep(2500)
    if (await clickTest(p, '[data-testid="btn-empezar-toma"]')) {
      await sleep(3200)
    }
    await p.evaluate(() => {
      const zona = document.querySelector('.zona-texto, .teleprompter, [data-testid="zona-lectura"], [data-testid="panel-lectura"]')
      if (zona) zona.scrollTop = Math.min(160, zona.scrollHeight / 5)
    })
    await sleep(400)
    await shot(p, 'leer')
    await ctx.close()
  }

  // --- ENSAYOS: dock LISTO con Velocidad fija + barras de nivel ---
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fontSize: 30, mostrarTiempo: true },
      modo: 'fija',
      nivel: 3
    })
    await clickTest(p, '[data-testid="btn-leer-tarjeta"]')
    await sleep(2800)
    // Force fija visible on dock
    await p.evaluate(() => {
      localStorage.setItem('sigo_modo_lectura', 'fija')
      localStorage.setItem('sigo_nivel_fijo', '3')
    })
    // Open mode ficha if needed and select fija
    const ficha = await p.$('[data-testid="ficha-modo-lectura"]')
    if (ficha) {
      await ficha.click()
      await sleep(700)
      await clickTest(p, '[data-testid="btn-modo-fija"]')
      await sleep(500)
      // close selector by clicking ficha again or outside so dock shows Velocidad fija + bars
      await p.evaluate(() => {
        const sel = document.querySelector('.selector-modo')
        if (sel) {
          const f = document.querySelector('[data-testid="ficha-modo-lectura"]')
          f?.click()
        }
      })
      await sleep(600)
    }
    // Reload listo state: go back and re-enter if dock still says voz
    const label = await p.evaluate(() => document.querySelector('[data-testid="ficha-modo-lectura"]')?.textContent || '')
    console.log('modo dock', label.slice(0, 80))
    if (!/fija|velocidad/i.test(label)) {
      // re-enter leer with ls already fija
      await clickTest(p, '[data-testid="btn-volver-listo"]')
      await sleep(800)
      await p.reload({ waitUntil: 'networkidle2' })
      await sleep(2000)
      await sembrar(p)
      await p.reload({ waitUntil: 'networkidle2' })
      await sleep(2000)
      await clickTest(p, '[data-testid="btn-leer-tarjeta"]')
      await sleep(2800)
    }
    const info = await p.evaluate(() => ({
      ficha: document.querySelector('[data-testid="ficha-modo-lectura"]')?.textContent?.slice(0, 60),
      barras: !!document.querySelector('.nivel-fijo, .barras-nivel, [class*="nivel"]')
    }))
    console.log('ensayos', info)
    await shot(p, 'ajustes-velocidad-fija')
    await ctx.close()
  }

  // --- GALERÍA / CARRUSEL ---
  // 1) Biblioteca
  {
    const { p, ctx } = await nuevaPagina(br)
    await sleep(800)
    await shot(p, 'galeria-biblioteca')
    await ctx.close()
  }

  // 2) Editor
  {
    const { p, ctx } = await nuevaPagina(br)
    await clickTest(p, '[data-testid="fila-guion-g-lanzamiento"]')
    await sleep(2000)
    await p.waitForSelector('[data-testid="editor-guion"], [data-testid="btn-menu-opciones-editor"]', { timeout: 15000 }).catch(() => null)
    await sleep(800)
    await shot(p, 'galeria-editor')
    await ctx.close()
  }

  // 3) Ajustes generales (panel desde biblioteca)
  {
    const { p, ctx } = await nuevaPagina(br)
    await clickTest(p, '[data-testid="btn-menu-superior-biblioteca"]')
    await sleep(1200)
    await p.evaluate(() => {
      document.querySelectorAll('[data-testid^="fila-guion-"]').forEach((n) => (n.style.visibility = 'hidden'))
      const lista = document.querySelector('[data-testid="lista-guiones-biblioteca"]')
      if (lista) lista.style.visibility = 'hidden'
    })
    await sleep(400)
    await shot(p, 'galeria-ajustes')
    await ctx.close()
  }

  // 4) Gestos / cámara panel en Grabar LISTO
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fondoToma: 'recuadro', fontSize: 26 }
    })
    await clickTest(p, '[data-testid="btn-grabar-tarjeta"]')
    await sleep(3500)
    if (await clickTest(p, '[data-testid="ficha-camara"]')) {
      await sleep(900)
    }
    await shot(p, 'galeria-camara-gestos')
    await ctx.close()
  }

  // 5) Subtítulos ficha en Grabar (si existe)
  {
    const { p, ctx } = await nuevaPagina(br, {
      ajustes: { tema: 'oscuro', fondoToma: 'recuadro', fontSize: 26 }
    })
    await clickTest(p, '[data-testid="btn-grabar-tarjeta"]')
    await sleep(3500)
    // open more / subtítulos
    const opened = await p.evaluate(() => {
      const sub = document.querySelector('[data-testid="ficha-subtitulos"]')
      if (sub) {
        sub.click()
        return 'sub'
      }
      const flecha = document.querySelector('[data-testid="ficha-flecha"]')
      if (flecha) {
        flecha.click()
        return 'flecha'
      }
      return 'none'
    })
    console.log('subtitulos open', opened)
    await sleep(1000)
    if (opened === 'flecha') {
      await clickTest(p, '[data-testid="ficha-subtitulos"]')
      await sleep(800)
    }
    await shot(p, 'galeria-subtitulos')
    await ctx.close()
  }

  // 6) Landscape Grabar
  {
    const { p, ctx } = await nuevaPagina(
      br,
      { ajustes: { tema: 'oscuro', fondoToma: 'recuadro', fontSize: 24, mostrarTiempo: true } },
      { width: 850, height: 392, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, isLandscape: true }
    )
    await clickTest(p, '[data-testid="btn-grabar-tarjeta"]')
    await sleep(4000)
    await shot(p, 'galeria-horizontal')
    await ctx.close()
  }

  // Leer mid-reading already as 'leer'; grabar as 'grabar-recuadro'
  // Copy extras for gallery naming
  fs.copyFileSync(path.join(OUT, 'leer.png'), path.join(OUT, 'galeria-leer.png'))
  fs.copyFileSync(path.join(OUT, 'grabar-recuadro.png'), path.join(OUT, 'galeria-grabar.png'))

  await br.close()

  // WebP crops for Para qué + Guiones + gallery
  aWebp(path.join(OUT, 'grabar-recuadro.png'), 'uso-videos.webp')
  aWebp(path.join(OUT, 'leer.png'), 'uso-clases.webp')
  aWebp(path.join(OUT, 'ajustes-velocidad-fija.png'), 'uso-ensayos.webp')
  aWebp(path.join(OUT, 'guiones-cuenta.png'), 'guiones-ui.webp')

  // Gallery phones — match prior 720x1280-ish via scale in ffmpeg
  const gal = [
    ['galeria-biblioteca.png', 'phone-01.webp'],
    ['galeria-grabar.png', 'phone-02.webp'],
    ['galeria-leer.png', 'phone-03.webp'],
    ['galeria-editor.png', 'phone-04.webp'],
    ['galeria-ajustes.png', 'phone-05.webp'],
    ['galeria-subtitulos.png', 'phone-06.webp']
  ]
  for (const [png, webp] of gal) {
    const src = path.join(OUT, png)
    const dest = path.join(CROPS, webp)
    execFileSync(
      'ffmpeg',
      ['-y', '-i', src, '-vf', 'scale=720:-2', '-quality', '85', dest],
      { stdio: 'pipe' }
    )
    console.log('webp', webp)
  }
  // Landscape 08
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      path.join(OUT, 'galeria-horizontal.png'),
      '-vf',
      'scale=1440:-2',
      '-quality',
      '85',
      path.join(CROPS, 'phone-08.webp')
    ],
    { stdio: 'pipe' }
  )
  console.log('webp phone-08.webp')
  console.log('DONE')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
