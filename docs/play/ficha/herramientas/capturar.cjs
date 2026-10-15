// LAS CAPTURAS DE LA APP REAL -tarea 86-. node capturar.cjs [filtro]
//
// Abre captura.html -la app de src/, servida por npx vite en 127.0.0.1:5186- en Chrome sin
// ventana, con el tamaño de cada pantalla, la lleva al estado de cada captura tocando los mismos
// botones que una persona, y guarda la pantalla en crudas/. componer.cjs las pone después en su
// marco. Se necesita puppeteer-core y Chrome -como en docs/pantallas/tarea82/herramientas-.
//
// LO ÚNICO QUE NO ES DE LA APP: la imagen de la cámara. En el teléfono, la vista previa nativa va
// DETRÁS del WebView -src/lib/camara.ts, toBack: true, aspectMode: 'cover'- y el navegador no la
// tiene. Aquí se pone la foto de medios/persona-X.jpg -la persona que dice escenas.cjs- exactamente
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
// horizontales. Qué persona va en cada captura lo dice escenas.cjs.
const foto = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'medios', `persona-${p}.jpg`)).toString('base64')

// Las pantallas. El teléfono vertical se captura en 360 x 640 -9:16- y el horizontal en 800 x 360,
// el de un teléfono común de lado: componer.cjs los pone en su marco. Las tabletas van a pantalla
// completa, en su tamaño exacto de Play -9:16 y 16:9-.
//
// LAS TABLETAS, CON EL DISEÑO DE TABLETA -05-10-2026-. La tarea 83 está en main y useLayout ya
// devuelve 'tab-v' y 'tab-h', pero solo con 600 dp o más de ancho: el 576 x 1024 de antes caía en
// 'tel-v' y mostraba el teléfono agrandado. Ahora el 7" va en 612 x 1088 -un 7" común mide unos
// 600 dp de ancho- y el 10" en 810 x 1440 -unos 800 dp-, los dos en 9:16 justo; por su escala dan
// 1440 x 2560 y 2160 x 3840. De lado, lo mismo girado: 1088 x 612 y 1440 x 810 son 'tab-h'.
// Antes: tab7 576 x 1024 por 2,5 y tab10 720 x 1280 por 3.
const PANTALLAS = {
  'tel-v': { w: 360, h: 640, dsf: 3 },
  'tel-h': { w: 800, h: 360, dsf: 3 },
  'tab7-v': { w: 612, h: 1088, dsf: 1440 / 612 },
  'tab7-h': { w: 1088, h: 612, dsf: 2560 / 1088 },
  'tab10-v': { w: 810, h: 1440, dsf: 2160 / 810 },
  'tab10-h': { w: 1440, h: 810, dsf: 3840 / 1440 }
}

// LA LETRA LA PONE LA APP -05-10-2026-: 24 en el teléfono y 32 en la tableta, letraPorOmision de
// src/hooks/useLayout.ts, que se usa cuando los ajustes no traen fontSize. Por eso los ajustes
// sembrados ya no la llevan. Antes se forzaba 24 en todo y 32 en las tabletas, a mano, porque la
// app todavía no tenía tableta: «En tableta se captura con la letra en 32 -uno de los pasos de
// Ajustes-: con 24 la pantalla grande quedaba medio vacía». Se probó también el ancho Angosto de
// lado: la columna quedaba sola al medio de la tableta y se veía peor; de lado va con el ancho
// completo.

// Hasta qué palabra del guion del pan "lee" la voz en cada captura de lectura.
const HASTA = { es: 'tibia,', en: 'warm,' }

// El filtro elegido en la captura de la tira: B/N, el único que se nota en una miniatura de la ficha. Se
// probó Cálido: en el visor apenas se distingue de Natural. Los seis están en src/lib/filtros.ts, TONOS.
const FILTRO = 'bn'

// Dónde va el recuadro en la 08, en fracciones de la pantalla: recuadroY es el borde de arriba -ver la
// escena grabar-recuadro-. Probado el 05-10-2026: 0,52 -el de fábrica- y 0,22 tapan el renglón que
// se lee; 0,70 y 0,80 lo dejan abajo, oscurecido por el velo de la lectura, y con 0,80 se corta. En
// 0,04 queda arriba a la derecha, con la cara clara, y la lectura libre en los dos idiomas.
const RECUADRO = { x: 0.64, y: 0.04 }

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
    // -tomas-largas, 15-10-2026, decisión de Javier- La app ya no recuerda el estilo: cada toma parte en
    // «No» y se elige en el visor. La escena visor lo elige allí, como la persona -elegirSubtitulos-.
    // Antes: localStorage.setItem('sigo_subtitulos_estilo', sub)
  }, lang, { tema: 'oscuro', colorFondo: '#000000', colorLetra: '#FFFFFF', columnaAngosta: false, mostrarTiempo: true, anclajeZona: 'medio', fondoToma: 'detras', modoCamara: 'frontal', ladoCamara: 'frontal', calidadVideo: '1080p', ...ajustes }, subtitulos)
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

// ELEGIR EL ESTILO DE SUBTÍTULOS EN EL VISOR -tomas-largas, 15-10-2026-. El botón Subtítulos abre las
// opciones; cada una se llama por su nombre en el idioma de la app -src/textos, subtitulosAmarillo-.
// Al elegir, las opciones se cierran solas -SubtitulosVisor.tsx-.
const NOMBRE_SUBTITULO = { amarillo: { es: 'Amarillo', en: 'Yellow' } }
async function elegirSubtitulos(p, idioma, estilo) {
  await p.click('[data-testid="btn-subtitulos"]')
  await p.waitForSelector('[data-testid="opciones-subtitulos"]')
  await p.click(`[data-testid="opciones-subtitulos"] button[aria-label="${NOMBRE_SUBTITULO[estilo][idioma]}"]`)
  await sleep(600)
}

const ESCENAS = {
  async leer(b, o) { const p = await abrir(b, o); await entrar(p, 'leer'); await leerHasta(p, o.idioma); return p },
  async 'grabar-detras'(b, o) {
    const p = await abrir(b, o); await entrar(p, 'grabar'); await camara(p, o)
    await leerHasta(p, o.idioma); await tocar(p); await camara(p, o); return p
  },
  // EL RECUADRO -la 08, 05-10-2026-. Arriba a la derecha, sobre lo ya leído: así el renglón que se lee
  // queda libre debajo y al lado, y la cara no tapa la lectura. Es un lugar que cualquiera elige arrastrándolo
  // -RecuadroCamara.tsx; la app lo guarda en recuadroX y recuadroY-. En el lugar de fábrica -0,64 y
  // 0,52, App.tsx- el recuadro caía sobre el renglón que se lee: en inglés la lectura pasaba detrás de
  // la cara. Antes: abrir(b, { ...o, ajustes: { fondoToma: 'recuadro' } }).
  async 'grabar-recuadro'(b, o) {
    const p = await abrir(b, { ...o, ajustes: { fondoToma: 'recuadro', recuadroX: RECUADRO.x, recuadroY: RECUADRO.y } }); await entrar(p, 'grabar')
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
    // -tomas-largas, 15-10-2026- La toma parte en «No»: se elige Amarillo en el visor, como la persona.
    await elegirSubtitulos(p, o.idioma, 'amarillo')
    await p.evaluate(() => new Promise((r) => { const v = document.querySelector('[data-testid="video-grabacion"]'); v.currentTime = 9.2; v.addEventListener('seeked', r, { once: true }) }))
    await sleep(800)
    return p
  },
  // LA PAUSA -05-10-2026-. Grabando con la cámara detrás, se toca la pantalla para ver los controles
  // y se aprieta Pausa: el mismo botón queda en Seguir, al lado de Parar -F10, App.tsx,
  // btn-pausa-lectura-. Lo que en el teléfono se ve además y aquí no: el punto rojo que parpadea.
  // Lo enciende grabandoVideo, que solo es cierto cuando el grabador NATIVO arrancó -tomaVideo.ts,
  // iniciarTomaVideo, Capacitor.isNativePlatform-; en el navegador no hay grabador y no se finge.
  async pausa(b, o) {
    const p = await abrir(b, o); await entrar(p, 'grabar'); await camara(p, o)
    await leerHasta(p, o.idioma); await tocar(p)
    await p.click('[data-testid="btn-pausa-lectura"]')
    await sleep(1500)
    await camara(p, o); return p
  },
  // LA TIRA DE FILTROS ABIERTA -tarea 96, 05-10-2026-. El visor de la misma toma, con la tira abierta y
  // un filtro elegido para que se vea el cambio en el video. Las miniaturas: en el teléfono el cuadro lo
  // saca el nativo -extraerMiniatura-; aquí el plugin web no lo tiene y la app usa la miniatura de la
  // toma -SelectorFiltro.tsx, "Si el nativo falla, queda el poster"-, que es el mismo cuadro: la toma de
  // ejemplo es una imagen quieta.
  async filtros(b, o) {
    const p = await ESCENAS.visor(b, o)
    await p.click('[data-testid="btn-filtro"]')
    await p.waitForSelector('[data-testid="tira-filtros"]')
    await sleep(600)
    await p.click(`[data-testid="filtro-${FILTRO}"]`)
    await sleep(1200)
    return p
  },
  // La portada y los ajustes no van en la ficha desde el 05-10-2026 -escenas.cjs-: quedan aquí,
  // andando, por si vuelven. El recuadro volvió el mismo día, como la 08. Antes: «La portada, el
  // recuadro y los ajustes no van en la ficha desde el 05-10-2026».
  async portada(b, o) { return abrir(b, o) },
  async ajustes(b, o) {
    const p = await abrir(b, { ...o, ajustes: { tema: 'claro', colorFondo: '#000000', colorLetra: '#FFFFFF' } })
    await p.click('[data-testid="btn-menu-superior-biblioteca"]')
    await p.waitForSelector('[data-testid="pantalla-ajustes"]')
    await sleep(1200)
    return p
  }
}

// Qué se captura, en qué pantalla y con qué persona: escenas.cjs. Cada archivo de crudas/ se llama
// <idioma>-tel-<nombre> o <idioma>-tab<pulgadas>-<nombre>.
const { TELEFONO, TABLETA } = require('./escenas.cjs')
const LISTA = [
  ...TELEFONO.map((e) => [`tel-${e.nombre}`, e.escena, e.pantalla, e.persona]),
  ...Object.entries(TABLETA).flatMap(([pulgadas, lista]) => lista.map((e) => [`tab${pulgadas}-${e.nombre}`, e.escena, e.pantalla, e.persona]))
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
