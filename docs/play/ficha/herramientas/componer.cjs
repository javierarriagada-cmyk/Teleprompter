// EL MARCO DE CADA CAPTURA Y EL GRÁFICO DE FUNCIONES -tarea 86-. node componer.cjs
//
// Toma las pantallas de crudas/ -las saca capturar.cjs de la app real- y arma, en ../:
//   capturas/{es-419,en-US}/01..07.png            teléfono, con su titular arriba
//   capturas/tableta/{es-419,en-US}/{7,10}/       tabletas, a pantalla completa
//   grafico-1024x500-{es,en}.png                    el gráfico de funciones, uno por idioma
// Qué va en cada número, y cuál va de lado, lo dice escenas.cjs. Antes: 01..08 y
// capturas/tableta-provisional/, mientras la tableta -tarea 83- no estaba en main.
// Cada imagen se dibuja en HTML en Chrome sin ventana y se pasa por ffmpeg a PNG RGB de 24 bits:
// Play no acepta alfa -support.google.com/googleplay/android-developer/answer/9866151-, y la
// captura de Chrome puede traer canal alfa aunque la página sea opaca.
//
// La paleta, las letras y la marca están en componer-base.cjs.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const TITULARES = require('./titulares.cjs')

const AQUI = __dirname
const FICHA = path.resolve(AQUI, '..')
const CRUDAS = path.join(AQUI, 'crudas')
const TMP = path.join(AQUI, 'crudas', 'tmp')

const { LETRAS, marca, html, conDestacado, C } = require('./componer-base.cjs')
const datos = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')

// ---------- el marco del teléfono ----------
// SIN DIBUJO DE TELÉFONO: Play pide no usar imágenes de dispositivos -answer/9866151-. La
// pantalla va sola, con esquinas redondeadas y una sombra larga -"sombras largas del teléfono",
// docs/el-sitio.md 6-. El titular ocupa menos del 20 % de alto -Play: "taglines" hasta 20 %-:
// 380 de 1920 en vertical y 210 de 1080 de lado.
function marcoTelefono({ cruda, etiqueta, titular, horizontal }) {
  const W = horizontal ? 1920 : 1080
  const H = horizontal ? 1080 : 1920
  // La pantalla guarda la proporción de la cruda: 9:16 en vertical -792 x 1408- y 20:9 de lado
  // -1600 x 720, un teléfono común acostado-.
  const p = horizontal ? { w: 1600, h: 720, x: 160, y: 250 } : { w: 792, h: 1408, x: 144, y: 420 }
  const tit = horizontal ? { top: 58, eti: 26, tam: 66 } : { top: 92, eti: 30, tam: 80 }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${LETRAS}
body{width:${W}px;height:${H}px;position:relative;background:
  radial-gradient(ellipse ${W * 0.9}px ${H * 0.55}px at 50% ${horizontal ? 70 : 62}%, rgba(240,192,112,.22), rgba(240,192,112,0) 70%),
  radial-gradient(ellipse ${W}px ${H * 0.4}px at 50% 0%, rgba(242,236,232,.07), rgba(0,0,0,0) 70%),
  linear-gradient(180deg, ${C.suelo} 0%, ${C.hondo} 100%)}
.arriba{position:absolute;left:0;right:0;top:${tit.top}px;text-align:center;padding:0 72px}
.eti{font-size:${tit.eti}px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${C.ambar};margin-bottom:${horizontal ? 14 : 20}px}
.eti:before{content:"";display:inline-block;width:.42em;height:.42em;border-radius:50%;background:${C.ambar};margin-right:.6em;vertical-align:.12em}
h1{font-size:${tit.tam}px;font-weight:600;line-height:1.08;letter-spacing:-.018em;color:${C.crema};text-wrap:balance}
.pantalla{position:absolute;left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;border-radius:${horizontal ? 40 : 52}px;overflow:hidden;
  box-shadow:0 0 0 2px rgba(231,225,222,.16),0 0 0 12px rgba(11,10,9,.9),0 0 0 13px rgba(231,225,222,.10),0 50px 110px rgba(0,0,0,.65),0 18px 40px rgba(0,0,0,.45)}
.pantalla img{display:block;width:100%;height:100%}
</style></head><body>
<div class="arriba"><div class="eti sans">${html(etiqueta)}</div><h1 class="serif">${titular.split("|").map(conDestacado).join("<br>")}</h1></div>
<div class="pantalla"><img src="${datos(cruda)}"></div>
</body></html>`
}

// ---------- el gráfico de funciones ----------
// 1024 x 500. Play -answer/9866151-: sin dispositivos ni capturas, lo esencial al centro y lejos
// de los bordes, colores vivos y no blanco puro, negro ni gris oscuro. Por eso no usa el suelo
// oscuro de la app: va en ámbar, color de Sigo. Todo lo que importa queda dentro de la zona segura
// de 64 px -docs/tarea86.txt-.
//
// ES LA PROPUESTA A. Había tres -A ámbar, B celeste, C crema-; Javier dejó la elección a criterio
// y queda la A: es la única que muestra la idea entera -la marca, la frase y los renglones con la
// línea que sigue la voz-. Las otras dos están en la historia del PR #60.
//
// La bajada ya no dice "sin internet" -Javier, 29-09-2026: el uso sin conexión no es el titular-;
// dice para qué sirve, con las palabras que se buscan: teleprompter, voz, video.
const FRASES = {
  es: { frase: 'El texto sigue|tu voz.', bajada: 'Teleprompter de voz para tus videos',
    renglones: [['Hola, hoy vamos a hacer', 0], ['pan casero en menos', 1], ['de una hora, con cuatro', 2]] },
  en: { frase: 'The script|follows|your voice.', bajada: 'Voice teleprompter for your videos',
    renglones: [['Hi, today we are going', 0], ['to make homemade bread', 1], ['in under an hour, with', 2]] }
}
// Los renglones son el primer párrafo del guion del pan -guiones.ts-: el ya leído, apagado; el
// que se lee, con la línea bajo las palabras -el seguidor de la app-; el que viene, entero.
function renglones(r, tinta, linea, tam) {
  return r.map(([t, i]) => {
    const op = i === 0 ? 0.38 : 1
    const sub = i === 1 ? `box-shadow:inset 0 -${Math.round(tam * 0.09)}px 0 ${linea};` : ''
    return `<div style="opacity:${op};white-space:nowrap"><span style="${sub}padding-bottom:2px">${html(t)}</span></div>`
  }).join('')
}
function grafico(idioma) {
  const f = FRASES[idioma]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${LETRAS}body{width:1024px;height:500px;position:relative;overflow:hidden}</style></head><body>
<div style="position:absolute;inset:0;background:radial-gradient(ellipse 700px 420px at 30% 40%, #F6D495 0%, ${C.ambar} 60%, #E8B45E 100%)"></div>
<div style="position:absolute;left:84px;top:50%;transform:translateY(-50%);width:440px">
  ${marca({ alto: 112, color: C.suelo, id: `a${idioma}` })}
  <div class="serif" style="margin-top:34px;font-size:${idioma === 'es' ? 56 : 50}px;font-weight:600;line-height:1.04;letter-spacing:-.02em;color:${C.suelo}">${f.frase.split('|').map(html).join('<br>')}</div>
  <div class="sans" style="margin-top:22px;font-size:24px;font-weight:600;color:rgba(21,19,18,.72)">${html(f.bajada)}</div>
</div>
<div class="serif" style="position:absolute;right:84px;top:50%;transform:translateY(-50%);font-size:32px;line-height:1.6;color:${C.suelo};padding:28px 34px;border-radius:24px;background:rgba(242,236,232,.55);box-shadow:0 20px 50px rgba(120,70,0,.25)">${renglones(f.renglones, C.suelo, C.suelo, 32)}</div>
</body></html>`
}

// ---------- a PNG sin alfa ----------
async function dibujar(b, contenido, w, h, salida) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await p.setContent(contenido, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await new Promise((r) => setTimeout(r, 250))
  const tmp = path.join(TMP, path.basename(salida))
  await p.screenshot({ path: tmp, clip: { x: 0, y: 0, width: w, height: h } })
  await p.close()
  sinAlfa(tmp, salida)
}
function sinAlfa(entrada, salida) {
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  // -pred mixed: el filtro de PNG que mejor comprime estas pantallas; las de tableta de 10"
  // bajan de 5,5 a 3,2 MB sin perder nada. Pesan menos en el repositorio y en la subida.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', entrada, '-pix_fmt', 'rgb24', '-pred', 'mixed', '-compression_level', '9', '-frames:v', '1', salida])
}

// Qué se compone y en qué orden: escenas.cjs. Antes estaba aquí, repetido:
//   const NOMBRES_TEL = ['01-leer', '02-grabar-detras', '03-grabar-recuadro', '04-de-lado', '05-editor', '06-subtitulos', '07-portada', '08-ajustes']
//   const TABLETAS = { 7: ['01-leer', '02-grabar-detras', '03-de-lado', '04-editor'], 10: [...lo mismo] }
// con el comentario «Las tabletas que se ven bien con el diseño de teléfono de hoy -ver LEEME.md-».
// Las tabletas van a pantalla completa y sin titular: para pantallas grandes Play pide "excluir texto
// adicional que no sea parte de la app" -answer/9866151, tabletas y Chromebook-.
const { TELEFONO, TABLETA, deLado } = require('./escenas.cjs')

;(async () => {
  fs.mkdirSync(TMP, { recursive: true })
  const solo = process.argv[2] || ''
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--font-render-hinting=none'] })
  try {
    for (const [idioma, carpeta] of [['es', 'es-419'], ['en', 'en-US']]) {
      if (!solo || solo === 'tel') {
        for (const [i, e] of TELEFONO.entries()) {
          const cruda = path.join(CRUDAS, `${idioma}-tel-${e.nombre}.png`)
          const horizontal = deLado(e)
          const titular = TITULARES[idioma][e.nombre]
          if (!titular) throw new Error(`falta el titular de ${e.nombre} en titulares.cjs (${idioma})`)
          await dibujar(b, marcoTelefono({ cruda, ...titular, horizontal }), horizontal ? 1920 : 1080, horizontal ? 1080 : 1920, path.join(FICHA, 'capturas', carpeta, `${String(i + 1).padStart(2, '0')}.png`))
          console.log('  captura', carpeta, i + 1, e.nombre)
        }
      }
      if (!solo || solo === 'tab') {
        for (const [pulgadas, lista] of Object.entries(TABLETA)) {
          for (const e of lista) {
            sinAlfa(path.join(CRUDAS, `${idioma}-tab${pulgadas}-${e.nombre}.png`), path.join(FICHA, 'capturas', 'tableta', carpeta, String(pulgadas), `${e.nombre}.png`))
          }
          console.log('  tableta', carpeta, pulgadas)
        }
      }
      if (!solo || solo === 'grafico') {
        await dibujar(b, grafico(idioma), 1024, 500, path.join(FICHA, `grafico-1024x500-${idioma}.png`))
        console.log('  gráfico', idioma)
      }
    }
  } finally {
    await b.close()
  }
})()

