// LAS CAPTURAS DE LA APP REAL -tarea 86-. node capturar.cjs [filtro]
//
// Abre captura.html -la app de src/, servida por npx vite en 127.0.0.1:5186- en Chrome sin
// ventana, con el tamaño de cada pantalla, la lleva al estado de cada captura tocando los mismos
// botones que una persona, y guarda la pantalla en crudas/. componer.cjs las pone después en su
// marco. Se necesita puppeteer-core y Chrome -como en docs/pantallas/tarea82/herramientas-.
//
// LO ÚNICO QUE NO ES DE LA APP: la imagen de la cámara. En el teléfono, la vista previa nativa va
// DETRÁS del WebView -src/lib/camara.ts, toBack: true, aspectMode: 'cover'- y el navegador no la
// tiene. Aquí se pone la foto de medios/persona-X.jpg -la persona que dice LISTA- exactamente
// donde el teléfono pone la vista previa: toda la pantalla con la cámara detrás, o el rectángulo
// del recuadro. Mismo método que las láminas aprobadas de la tarea 82.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')

const BASE = process.env.SIGO_URL || 'http://127.0.0.1:5186/docs/play/ficha/herramientas/captura.html'
const CRUDAS = path.join(__dirname, 'crudas')
const filtro = process.argv[2] || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Las personas -preparar-medios.sh, fuente/LICENCIA-personas.txt-: A, B y D verticales; C y E
// horizontales. Qué persona va en cada captura lo dice LISTA, abajo.
const foto = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'medios', `persona-${p}.jpg`)).toString('base64')

// Las pantallas. El teléfono vertical se captura en 360 x 640 -9:16- y el horizontal en 800 x 360,
// el de un teléfono común de lado: componer.cjs los pone en su marco. Las tabletas van a pantalla
// completa, en su tamaño exacto de Play -9:16 y 16:9-: 576 x 1024 por 2,5 da 1440 x 2560 y
// 720 x 1280 por 3 da 2160 x 3840.
const PANTALLAS = {
  'tel-v': { w: 360, h: 640, dsf: 3 },
  'tel-h': { w: 800, h: 360, dsf: 3 },
  'tab7-v': { w: 576, h: 1024, dsf: 2.5 },
  'tab7-h': { w: 1024, h: 576, dsf: 2.5 },
  'tab10-v': { w: 720, h: 1280, dsf: 3 },
  'tab10-h': { w: 1280, h: 720, dsf: 3 }
}

// En tableta se captura con la letra en 32 -uno de los pasos de Ajustes, PASOS_LETRA de
// src/components/estiloLectura.ts-: con 24 la
// pantalla grande quedaba medio vacía. Es lo que haría quien lee en una tableta, y es un ajuste
// que la app tiene hoy: no se inventa nada. Se probó también el ancho Angosto de lado: la columna
// quedaba sola al medio de la tableta y se veía peor; por eso de lado va con el ancho completo.
const AJUSTES_PANTALLA = { 'tab7-v': { fontSize: 32 }, 'tab10-v': { fontSize: 32 }, 'tab7-h': { fontSize: 32 }, 'tab10-h': { fontSize: 32 } }

// Hasta qué palabra del guion del pan "lee" la voz en cada captura de lectura.
const HASTA = { es: 'tibia,', en: 'warm,' }

async function abrir(b, { idioma, pantalla, ajustes = {}, subtitulos = 'no' }) {
  const p = await b.newPage()
  const { w, h, dsf } = PANTALLAS[pantalla]
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dsf })
  const lang = idioma === 'es' ? 'es-419' : 'en-US'
  await p.evaluateOnNewDocument((lang, aj, sub) => {
    Object.defineProperty(navigator, 'language', { get: () => lang })
    Object.defineProperty(navigator, 'languages', { get: () => [lang, lang.slice(0, 2)] })
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true')
    localStorage.setItem('teleprompter_ajustes', JSON.stringify(aj))
    // El estilo de subtítulos que la app recuerda -src/lib/subtitulos.ts, CLAVE_ESTILO-: así
    // el visor abre con el Amarillo puesto, como lo vería quien ya lo eligió una vez.
    localStorage.setItem('sigo_subtitulos_estilo', sub)
  }, lang, { tema: 'oscuro', colorFondo: '#000000', colorLetra: '#FFFFFF', fontSize: 24, columnaAngosta: false, mostrarTiempo: true, anclajeZona: 'medio', fondoToma: 'detras', modoCamara: 'frontal', ladoCamara: 'frontal', calidadVideo: '1080p', ...AJUSTES_PANTALLA[pantalla], ...ajustes }, subtitulos)
  p.on('pageerror', (e) => console.log('  error de la página:', e.message))
  await p.goto(`${BASE}?idioma=${idioma}`, { waitUntil: 'networkidle2' })
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 30000 })
  await sleep(1200)
  return p
}

// La imagen de la cámara donde la pondría el teléfono -ver arriba-. El video del navegador se
// oculta: su cámara falsa no es la del teléfono.
async function camara(p, { recuadro = false, persona } = {}) {
  await p.addStyleTag({ content: 'video{opacity:0 !important}' })
  await p.evaluate((src, recuadro) => {
    let d = document.getElementById('camara-de-la-ficha')
    if (!d) {
      d = document.createElement('div')
      d.id = 'camara-de-la-ficha'
      document.body.prepend(d)
    }
    const r = recuadro ? document.querySelector('[data-testid="recuadro-camara"]')?.getBoundingClientRect() : null
    const caja = r ? `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:inherit` : 'inset:0'
    d.style.cssText = `position:fixed;${caja};z-index:-1;background:url(${src}) center 30%/cover no-repeat;pointer-events:none`
  }, foto(persona), recuadro)
}

async function entrar(p, puerta) {
  await p.click(`[data-testid="${puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'}"]`)
  await p.waitForSelector('[data-testid="btn-empezar-toma"]')
  await sleep(1500)
}

// Empezar y que la voz lea hasta la palabra dada, de a tres palabras, como frases cortas.
async function leerHasta(p, idioma) {
  await p.click('[data-testid="btn-empezar-toma"]')
  await sleep(4200)
  const texto = await p.evaluate(() => document.querySelector('[data-testid="columna-texto"]')?.innerText || '')
  const palabras = texto.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean)
  const fin = palabras.indexOf(HASTA[idioma])
  for (let i = 0; i <= fin; i += 3) {
    await p.evaluate((t) => window.__sigoVoz.decir(t), palabras.slice(i, Math.min(i + 3, fin + 1)).join(' ').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ''))
    await sleep(380)
  }
  await sleep(2200)
}

async function tocar(p) {
  // Un solo click en la superficie, como un toque -docs/pantallas/tarea82/herramientas/shots.js-.
  await p.evaluate(() => document.querySelector('[data-testid="teleprompter-view-container"]').click())
  await sleep(800)
}

const ESCENAS = {
  async leer(b, o) { const p = await abrir(b, o); await entrar(p, 'leer'); await leerHasta(p, o.idioma); return p },
  async 'grabar-detras'(b, o) {
    const p = await abrir(b, o); await entrar(p, 'grabar'); await camara(p, o)
    await leerHasta(p, o.idioma); await tocar(p); await camara(p, o); return p
  },
  async 'grabar-recuadro'(b, o) {
    const p = await abrir(b, { ...o, ajustes: { fondoToma: 'recuadro' } }); await entrar(p, 'grabar')
    await leerHasta(p, o.idioma); await sleep(500); await camara(p, { ...o, recuadro: true }); return p
  },
  async editor(b, o) {
    const p = await abrir(b, o)
    const filas = await p.$$('[data-testid="lista-guiones-biblioteca"] > *')
    await filas[0].click()
    await p.waitForSelector('[data-testid="editor-guion"]')
    await sleep(1500)
    // Se selecciona la frase destacada, como con el dedo: así aparece arriba la barra de formato
    // -negrita, los tres colores y el destacado- y se ven los formatos junto a la barra.
    await p.evaluate((frase) => {
      const ed = document.querySelector('[data-testid="editor-guion"]')
      ed.focus()
      const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
      let n
      while ((n = w.nextNode())) {
        const i = n.data.indexOf(frase)
        if (i < 0) continue
        const r = document.createRange()
        r.setStart(n, i); r.setEnd(n, i + frase.length)
        const s = getSelection(); s.removeAllRanges(); s.addRange(r)
        n.parentElement.scrollIntoView({ block: 'center' })
        break
      }
    }, o.idioma === 'es' ? 'agua tibia' : 'warm water')
    await sleep(1200)
    return p
  },
  async visor(b, o) {
    const p = await abrir(b, { ...o, subtitulos: 'amarillo' })
    await p.click('[data-testid="tira-grabaciones"] button')
    await p.waitForSelector('[data-testid="video-grabacion"]')
    await sleep(1200)
    await p.evaluate(() => new Promise((r) => { const v = document.querySelector('[data-testid="video-grabacion"]'); v.currentTime = 9.2; v.addEventListener('seeked', r, { once: true }) }))
    await sleep(800)
    return p
  },
  async portada(b, o) { return abrir(b, o) },
  async ajustes(b, o) {
    const p = await abrir(b, { ...o, ajustes: { tema: 'claro', colorFondo: '#000000', colorLetra: '#FFFFFF' } })
    await p.click('[data-testid="btn-menu-superior-biblioteca"]')
    await p.waitForSelector('[data-testid="pantalla-ajustes"]')
    await sleep(1200)
    return p
  }
}

// Qué se captura: [nombre del archivo, escena, pantalla, persona]. Las personas se reparten para
// que haya variedad: A mujer de 30, B hombre de 60, C hombre de 25, D mujer de 55 -la toma del
// visor, en la cocina del guion del pan-, E mujer de 40.
const LISTA = [
  ['tel-01-leer', 'leer', 'tel-v'],
  ['tel-02-grabar-detras', 'grabar-detras', 'tel-v', 'A'],
  ['tel-03-grabar-recuadro', 'grabar-recuadro', 'tel-v', 'B'],
  ['tel-04-de-lado', 'grabar-detras', 'tel-h', 'E'],
  ['tel-05-editor', 'editor', 'tel-v'],
  ['tel-06-subtitulos', 'visor', 'tel-v'],
  ['tel-07-portada', 'portada', 'tel-v'],
  ['tel-08-ajustes', 'ajustes', 'tel-v'],
  ['tab7-01-leer', 'leer', 'tab7-v'],
  ['tab7-02-grabar-detras', 'grabar-detras', 'tab7-v', 'B'],
  ['tab7-03-de-lado', 'grabar-detras', 'tab7-h', 'C'],
  ['tab7-04-editor', 'editor', 'tab7-v'],
  ['tab10-01-leer', 'leer', 'tab10-v'],
  ['tab10-02-grabar-detras', 'grabar-detras', 'tab10-v', 'D'],
  ['tab10-03-de-lado', 'grabar-detras', 'tab10-h', 'C'],
  ['tab10-04-editor', 'editor', 'tab10-v']
]

;(async () => {
  fs.mkdirSync(CRUDAS, { recursive: true })
  for (const idioma of ['es', 'en']) {
    for (const [nombre, escena, pantalla, persona] of LISTA) {
      const id = `${idioma}-${nombre}`
      if (filtro && !id.includes(filtro)) continue
      // Un navegador limpio por captura: cada una parte de la misma portada sembrada.
      const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'] })
      try {
        const p = await ESCENAS[escena](b, { idioma, pantalla, persona })
        await p.screenshot({ path: path.join(CRUDAS, `${id}.png`) })
        console.log('  lista', id)
      } catch (e) {
        console.log('  FALLÓ', id, e.message)
      } finally {
        await b.close()
      }
    }
  }
})()
