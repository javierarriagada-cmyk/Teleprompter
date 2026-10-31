// Arnés de láminas — recuadro detrás (t116u). Solo vive en docs/; no toca src/.
// node docs/pantallas/recuadro-detras/herramientas/capturar.cjs
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')

const URL = 'http://127.0.0.1:5183/'
const ROOT = '/workspace/recuadro-detras/docs/pantallas/recuadro-detras'
const CAP = path.join(ROOT, 'capturas')
const LAM = path.join(ROOT, 'laminas')
fs.mkdirSync(CAP, { recursive: true })
fs.mkdirSync(LAM, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CAM = (w, h) =>
  'data:image/png;base64,' + fs.readFileSync(`/workspace/t82shots/camara-${w}x${h}.png`).toString('base64')

// Viewports: moto g86 de lado 915×411 (tarea 89); Redmi 13C de lado 800×360 (tarea 76 / tarea 82).
const TELEFONOS = [
  { id: 'g86', label: 'moto g86', w: 915, h: 411 },
  { id: 'redmi', label: 'Redmi 13C', w: 800, h: 360 }
]
const ESQUINAS = ['der-abajo', 'der-arriba', 'izq-abajo', 'izq-arriba']
const TEMAS = ['oscuro', 'claro']
const MOMENTOS = ['listo', 'grabando', 'controles']

const GUION_LARGO =
  'Buenas. Hoy te cuento cómo queda la lectura de lado, con la cámara en el recuadro. ' +
  'La idea es no perder la palabra cuando el renglón vivo pasa cerca de la esquina. ' +
  'Lee con calma, sin apurarte, como si se lo contaras a alguien que está al otro lado. ' +
  'Fíjate en el ritmo: el texto avanza cuando tú hablas, no al revés. ' +
  'Si una frase se enreda, respira y sigue desde la siguiente. ' +
  'Al final, revisamos si el recuadro detrás deja leer igual de bien en las cuatro esquinas.'

async function abrir(browser, { w, h, tema, esquina, propuesta }) {
  const p = await browser.newPage()
  const ctx = browser.defaultBrowserContext()
  try {
    await ctx.overridePermissions('http://127.0.0.1:5183', ['camera', 'microphone'])
  } catch (_) {}
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const par =
    tema === 'claro'
      ? { colorFondo: '#FFFFFF', colorLetra: '#000000' }
      : { colorFondo: '#000000', colorLetra: '#FFFFFF' }
  await p.evaluateOnNewDocument(
    (aj, esq) => {
      Object.defineProperty(navigator, 'language', { get: () => 'es-CL' })
      Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] })
      localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
      localStorage.setItem(
        'teleprompter_ajustes',
        JSON.stringify({
          tema: aj.tema,
          ...aj,
          fontSize: 24,
          columnaAngosta: false,
          mostrarTiempo: true,
          fondoToma: 'recuadro',
          modoCamara: 'frontal'
        })
      )
      localStorage.setItem('sigo_recuadro_esquina_h', esq)
      localStorage.setItem('teleprompter_marca_recuadro', 'true')
      localStorage.setItem('teleprompter_marca_idioma', 'true')
      localStorage.setItem('teleprompter_marca_palma', 'true')
      localStorage.setItem('teleprompter_marca_subtitulos', 'true')
    },
    { tema, ...par },
    esquina
  )
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  // Esperar a que salga la capa de entrada.
  await p.waitForFunction(() => !document.querySelector('[data-testid="capa-entrada-espejo"]'), {
    timeout: 20000
  }).catch(() => {})
  await sleep(400)

  // Alargar el guion activo en IndexedDB si existe; si no, el Hola basta.
  await p.evaluate((texto) => {
    // Intentar parchar el texto visible de la tarjeta no cambia el motor; al entrar a Grabar
    // se usa el guion del repo. Parcheamos vía localStorage de respaldo si aplica.
    try {
      const raw = localStorage.getItem('teleprompter_guiones_v1')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr[0]) {
          arr[0].texto = texto
          if (arr[0].bloques && arr[0].bloques[0]) arr[0].bloques[0].texto = texto
          localStorage.setItem('teleprompter_guiones_v1', JSON.stringify(arr))
        }
      }
    } catch (_) {}
  }, GUION_LARGO)

  await p.evaluate((src) => {
    const d = document.createElement('div')
    d.id = 'camara-simulada'
    d.style.cssText = `position:fixed;inset:0;z-index:-1;background:url(${src}) center/100% 100% no-repeat;pointer-events:none`
    document.body.prepend(d)
  }, CAM(w, h))
  await p.addStyleTag({ content: 'video{opacity:0 !important}' })

  if (propuesta) {
    // Solo en el arnés: sin carril, aire como sin recuadro.
    await p.addStyleTag({
      content: `
        .layout-tel-h {
          --carril-recuadro-h: 0px !important;
          --columna-aire-h-recuadro: 28px !important;
        }
      `
    })
  }

  await p.waitForSelector('[data-testid="btn-grabar-tarjeta"]', { timeout: 30000 })
  await p.evaluate(() => {
    document.querySelector('[data-testid="btn-grabar-tarjeta"]').click()
  })
  await p.waitForSelector('[data-testid="btn-empezar-toma"]', { timeout: 25000 })
  // Esperar a que la cámara web encienda: sin eso LISTO no aplica el carril ni pinta el recuadro.
  await p.waitForSelector('[data-testid="recuadro-camara"]', { timeout: 25000 })
  await sleep(600)

  // Si el texto del guion es el corto de bienvenida, forzar el largo en el DOM del contenedor
  // no cambia el motor; dejamos el Hola real de la app (misma letra) para fidelidad.
  if (propuesta) {
    await p.evaluate(() => {
      const c = document.querySelector('[data-testid="contenedor-lectura"]')
      if (c) {
        c.classList.add('lectura-sobre-imagen')
        const fondo = (c.style.getPropertyValue('--fondo-lectura') || '').toLowerCase()
        if (fondo === '#ffffff') c.classList.add('letra-oscura')
      }
      // El velo no debe teñir el hueco del recuadro cuando la columna lo cruza.
      const velo = document.querySelector('[data-testid="velo-lectura"]')
      if (velo) velo.style.display = 'none'
    })
  }

  await p.evaluate(() => {
    const r = document.querySelector('[data-testid="recuadro-camara"]')
    const d = document.getElementById('camara-simulada')
    if (!r || !d) return
    const b = r.getBoundingClientRect()
    Object.assign(d.style, {
      inset: 'auto',
      left: b.left + 'px',
      top: b.top + 'px',
      width: b.width + 'px',
      height: b.height + 'px',
      borderRadius: getComputedStyle(r).borderRadius,
      zIndex: '0'
    })
  })
  return p
}

async function momento(p, m) {
  if (m === 'listo') return
  await p.evaluate(() => document.querySelector('[data-testid="btn-empezar-toma"]').click())
  await sleep(4200)
  if (m === 'controles') {
    await p.evaluate(() => document.querySelector('[data-testid="teleprompter-view-container"]').click())
    await sleep(700)
  }
}

async function medir(p) {
  return p.evaluate(() => {
    const cont = document.querySelector('[data-testid="contenedor-lectura"]')
    const rec = document.querySelector('[data-testid="recuadro-camara"]')
    const banda = document.querySelector('[data-testid="banda-lectura"]')
    const panel = document.querySelector('[data-testid="panel-lectura"]')
    const lay = document.querySelector('.layout-tel-h')
    if (!cont) return null
    const cs = getComputedStyle(cont)
    const padL = parseFloat(cs.paddingLeft) || 0
    const padR = parseFloat(cs.paddingRight) || 0
    const w = cont.clientWidth - padL - padR
    const sample = (cont.innerText || '').split('\n').map((s) => s.trim()).filter((s) => s.length > 20)[0] || ''
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = cs.font
    const cw = ctx.measureText('M').width || 14
    const chars = Math.floor(w / cw)
    const recBox = rec ? rec.getBoundingClientRect() : null
    const bandaBox = banda ? banda.getBoundingClientRect() : null
    // Si no hay banda (propuesta la esconde o detrás), estimar renglón vivo por topBanda típico.
    let zonaViva = bandaBox
    if (!zonaViva) {
      // Aprox: banda arriba (~4 renglones). Usar primer bloque de texto cerca del top del contenedor.
      const cb = cont.getBoundingClientRect()
      zonaViva = { left: cb.left + padL, right: cb.right - padR, top: cb.top + 8, bottom: cb.top + 8 + (parseFloat(cs.lineHeight) || 32) * 4, x: cb.left + padL, y: cb.top + 8, width: w, height: (parseFloat(cs.lineHeight) || 32) * 4 }
    }
    let cruza = false
    if (recBox && zonaViva) {
      cruza = !(zonaViva.right < recBox.left || zonaViva.left > recBox.right || zonaViva.bottom < recBox.top || zonaViva.top > recBox.bottom)
    }
    let vivo = null
    const candidatos = []
    cont.querySelectorAll('*').forEach((el) => {
      if (el.children.length === 0 && (el.textContent || '').trim().length > 8) candidatos.push(el)
    })
    if (zonaViva) {
      for (const el of candidatos) {
        const b = el.getBoundingClientRect()
        if (b.height < 8 || b.height > 80) continue
        if (!(b.bottom < zonaViva.top || b.top > zonaViva.bottom)) {
          vivo = { text: (el.textContent || '').trim().slice(0, 60), box: { x: b.x, y: b.y, w: b.width, h: b.height } }
          break
        }
      }
    }
    const carril = lay ? getComputedStyle(lay).getPropertyValue('--carril-recuadro-h').trim() : '?'
    return {
      columnaPx: Math.round(w),
      charsApprox: chars,
      carril,
      rec: recBox ? { x: Math.round(recBox.x), y: Math.round(recBox.y), w: Math.round(recBox.width), h: Math.round(recBox.height) } : null,
      banda: bandaBox ? { y: Math.round(bandaBox.y), h: Math.round(bandaBox.height) } : null,
      panel: !!panel,
      cruzaRecuadro: cruza,
      vivo,
      layout: !!lay,
      sample: sample.slice(0, 40)
    }
  })
}

async function marcarVivo(p) {
  await p.evaluate(() => {
    document.getElementById('marca-vivo-lamina')?.remove()
    const banda = document.querySelector('[data-testid="banda-lectura"]')
    const rec = document.querySelector('[data-testid="recuadro-camara"]')
    const cont = document.querySelector('[data-testid="contenedor-lectura"]')
    const mark = document.createElement('div')
    mark.id = 'marca-vivo-lamina'
    mark.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50'
    let zona = null
    if (banda) {
      zona = banda.getBoundingClientRect()
    } else if (cont) {
      const cb = cont.getBoundingClientRect()
      const cs = getComputedStyle(cont)
      const lh = parseFloat(cs.lineHeight) || 32
      zona = { left: cb.left, top: cb.top + 4, width: cb.width, height: lh * 4, bottom: cb.top + 4 + lh * 4 }
    }
    if (zona) {
      const r = document.createElement('div')
      r.style.cssText = `position:absolute;left:${zona.left}px;top:${zona.top}px;width:${zona.width}px;height:${zona.height}px;outline:2px solid #ff6b00;outline-offset:-1px;box-sizing:border-box`
      const lab = document.createElement('div')
      lab.textContent = 'renglón vivo'
      lab.style.cssText = `position:absolute;left:${zona.left + 4}px;top:${Math.max(2, zona.top - 16)}px;font:600 11px sans-serif;color:#ff6b00;background:rgba(0,0,0,.55);padding:1px 5px;border-radius:3px`
      mark.appendChild(r)
      mark.appendChild(lab)
    }
    if (rec) {
      const b = rec.getBoundingClientRect()
      const r = document.createElement('div')
      r.style.cssText = `position:absolute;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;outline:2px dashed #3dbbff;outline-offset:1px`
      const lab = document.createElement('div')
      lab.textContent = 'recuadro'
      const labTop = b.bottom + 2 > window.innerHeight - 18 ? b.top - 16 : b.bottom + 2
      lab.style.cssText = `position:absolute;left:${b.left}px;top:${labTop}px;font:600 11px sans-serif;color:#3dbbff;background:rgba(0,0,0,.55);padding:1px 5px;border-radius:3px`
      mark.appendChild(r)
      mark.appendChild(lab)
    }
    document.body.appendChild(mark)
  })
}

const medidas = []

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1200,800',
      '--lang=es-CL',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  })
}

;(async () => {
  let browser = await launchBrowser()
  let shots = 0
  const jobs = []
  for (const tel of TELEFONOS) {
    for (const tema of TEMAS) {
      for (const esquina of ESQUINAS) {
        for (const mom of MOMENTOS) {
          for (const propuesta of [false, true]) {
            jobs.push({ tel, tema, esquina, mom, propuesta })
          }
        }
      }
    }
  }

  for (const job of jobs) {
    const { tel, tema, esquina, mom, propuesta } = job
    const tag = `${tel.id}-${tema}-${esquina}-${mom}-${propuesta ? 'propuesta' : 'hoy'}`
    const archivo = path.join(CAP, `${tag}.png`)
    if (fs.existsSync(archivo) && fs.statSync(archivo).size > 5000) {
      console.log(tag, 'skip')
      continue
    }
    process.stdout.write(tag + ' ... ')
    try {
      if (shots > 0 && shots % 8 === 0) {
        try { await browser.close() } catch (_) {}
        browser = await launchBrowser()
        console.log('\n[relaunch browser]')
        process.stdout.write(tag + ' ... ')
      }
      const p = await abrir(browser, { w: tel.w, h: tel.h, tema, esquina, propuesta })
      await momento(p, mom)
      await p.evaluate(() => {
        const r = document.querySelector('[data-testid="recuadro-camara"]')
        const d = document.getElementById('camara-simulada')
        if (!r || !d) return
        const b = r.getBoundingClientRect()
        Object.assign(d.style, {
          inset: 'auto',
          left: b.left + 'px',
          top: b.top + 'px',
          width: b.width + 'px',
          height: b.height + 'px'
        })
      })
      if (propuesta) {
        await p.evaluate(() => {
          const c = document.querySelector('[data-testid="contenedor-lectura"]')
          if (c) {
            c.classList.add('lectura-sobre-imagen')
            const fondo = (c.style.getPropertyValue('--fondo-lectura') || '').toLowerCase()
            if (fondo === '#ffffff') c.classList.add('letra-oscura')
          }
          const velo = document.querySelector('[data-testid="velo-lectura"]')
          if (velo) velo.style.display = 'none'
        })
      }
      const m = await medir(p)
      medidas.push({ tag, tel: tel.id, tema, esquina, mom, variante: propuesta ? 'propuesta' : 'hoy', ...m })
      await marcarVivo(p)
      await p.screenshot({ path: archivo })
      console.log('ok', m && m.columnaPx, 'px', m && m.charsApprox, 'ch', 'cruza', m && m.cruzaRecuadro)
      await p.close().catch(() => {})
      shots++
    } catch (e) {
      console.log('FAIL', e.message)
      medidas.push({ tag, tel: tel.id, tema, esquina, mom, variante: propuesta ? 'propuesta' : 'hoy', error: e.message })
      try { await browser.close() } catch (_) {}
      browser = await launchBrowser()
    }
  }

  fs.writeFileSync(path.join(ROOT, 'medidas.json'), JSON.stringify(medidas, null, 2))

  let page
  try {
    page = await browser.newPage()
  } catch (_) {
    browser = await launchBrowser()
    page = await browser.newPage()
  }
  await page.setViewport({ width: 2000, height: 1400, deviceScaleFactor: 1 })
  const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')

  for (const tel of TELEFONOS) {
    for (const tema of TEMAS) {
      for (const mom of MOMENTOS) {
        let filas = ''
        for (const esquina of ESQUINAS) {
          const hoy = path.join(CAP, `${tel.id}-${tema}-${esquina}-${mom}-hoy.png`)
          const prop = path.join(CAP, `${tel.id}-${tema}-${esquina}-${mom}-propuesta.png`)
          if (!fs.existsSync(hoy) || !fs.existsSync(prop)) continue
          const mh = medidas.find((x) => x.tag === `${tel.id}-${tema}-${esquina}-${mom}-hoy`)
          const mp = medidas.find((x) => x.tag === `${tel.id}-${tema}-${esquina}-${mom}-propuesta`)
          filas += `<div class="fila">
            <div class="meta">${esquina} · columna hoy ${mh?.columnaPx ?? '?'} px (~${mh?.charsApprox ?? '?'} ch) · propuesta ${mp?.columnaPx ?? '?'} px (~${mp?.charsApprox ?? '?'} ch) · vivo cruza recuadro: hoy ${mh?.cruzaRecuadro ? 'sí' : 'no'} / prop ${mp?.cruzaRecuadro ? 'sí' : 'no'}</div>
            <div class="par">
              <div class="c"><div class="r">Hoy · carril 168</div><img src="${b64(hoy)}" style="width:${tel.w}px;height:${tel.h}px"></div>
              <div class="c"><div class="r">Propuesta · sin carril, recuadro detrás + lectura-sobre-imagen</div><img src="${b64(prop)}" style="width:${tel.w}px;height:${tel.h}px"></div>
            </div>
          </div>`
        }
        if (!filas) continue
        const titulo = `Recuadro detrás · ${tel.label} ${tel.w}×${tel.h} · ${tema} · ${mom}`
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>
          body{margin:0;background:#2a2a2a;color:#eee;font-family:"Source Sans 3",system-ui,sans-serif;padding:20px;width:max-content}
          h1{font-size:20px;margin:0 0 4px} .s{font-size:13px;color:#bbb;margin-bottom:14px;max-width:1100px}
          .fila{margin-bottom:18px} .meta{font-size:12px;color:#ccc;margin-bottom:6px}
          .par{display:flex;gap:20px} .r{font-size:13px;margin-bottom:4px;color:#ddd}
          img{display:block;outline:1px solid #555}
          .leyenda span{display:inline-block;margin-right:14px;font-size:12px}
          .naranja{color:#ff6b00} .azul{color:#3dbbff}
        </style></head><body>
          <h1>${titulo}</h1>
          <div class="s">App real · Vite + Chrome headless · cámara simulada. Naranja: renglón vivo (banda). Azul punteado: recuadro 144×81. Las láminas salen del navegador, no de un teléfono; nada se probó en teléfono.</div>
          <div class="leyenda"><span class="naranja">■ renglón vivo</span><span class="azul">□ recuadro</span></div>
          ${filas}
        </body></html>`
        await page.setContent(html, { waitUntil: 'load' })
        const el = await page.$('body')
        const out = path.join(LAM, `comparativa-${tel.id}-${tema}-${mom}.png`)
        await el.screenshot({ path: out })
        console.log('lamina', out)
      }
    }
  }

  await browser.close().catch(() => {})
  console.log('listo', medidas.length, 'capturas')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
