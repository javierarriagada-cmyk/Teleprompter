// LA LÁMINA DE REVISIÓN DE LA FICHA -tarea 86-. node lamina.cjs -> ../lamina-ficha.png
// Todo en una imagen, para que Javier elija sin abrir veinte archivos: los tres gráficos, las 8
// capturas por idioma en su orden, los textos con sus conteos, las tabletas marcadas PROVISIONAL,
// las fotos con su licencia y la evidencia. Las imágenes van reducidas a JPEG solo aquí dentro:
// los PNG que se suben a Play son los de ../capturas y ../grafico-*.png, sin tocar.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { LETRAS, marca, conDestacado, C } = require('./componer-base.cjs')
const T = require('./textos.cjs')
const FICHA = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, 'crudas', 'tmp', 'lamina')
fs.mkdirSync(TMP, { recursive: true })

const largo = (s) => [...s].length
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
let n = 0
function mini(rel, ancho) {
  const sal = path.join(TMP, `${n++}.jpg`)
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(FICHA, rel), '-vf', `scale=${ancho * 2}:-1:flags=lanczos`, '-q:v', '3', sal])
  return `<img src="data:image/jpeg;base64,${fs.readFileSync(sal).toString('base64')}" style="width:${ancho}px">`
}

const W = 2480
const CARPETA = { es: 'es-419', en: 'en-US' }
const NOMBRE_IDIOMA = { es: 'Español (Latinoamérica)', en: 'English (United States)' }

function graficos() {
  const nota = { A: 'Recomendada: la idea entera en una mirada, la marca y la línea que sigue la voz.', B: 'La marca primero, al centro. La más limpia en el carrusel.', C: 'Tipográfica, en crema con luz tibia. La más sobria.' }
  return ['es', 'en'].map((i) => `<div class="fila">${['A', 'B', 'C'].map((v) => `<figure>${mini(`grafico-1024x500-${i}-${v}.png`, 740)}<figcaption><b>${i.toUpperCase()} · ${v}</b> ${esc(nota[v])}</figcaption></figure>`).join('')}</div>`).join('')
}
function telefonos(i) {
  const figs = []
  for (let k = 1; k <= 8; k++) {
    const h = k === 4
    figs.push(`<figure class="tel"><div class="num">${k}</div>${mini(`capturas/${CARPETA[i]}/${String(k).padStart(2, '0')}.png`, h ? 684 : 216)}</figure>`)
  }
  return `<h3>${NOMBRE_IDIOMA[i]} — capturas/${CARPETA[i]}/01..08.png</h3><div class="fila tels">${figs.join('')}</div>`
}
function tabletas() {
  const filas = []
  for (const p of ['7', '10']) {
    const grupos = ['es', 'en'].map((i) => {
      const dir = `capturas/tableta-provisional/${CARPETA[i]}/${p}`
      const lista = fs.readdirSync(path.join(FICHA, dir)).filter((f) => f.endsWith('.png')).sort()
      return `<div class="grupo"><div class="eti-g">${p}" · ${CARPETA[i]}</div><div class="fila">${lista.map((f) => mini(`${dir}/${f}`, f.includes('de-lado') ? 480 : 152)).join('')}</div></div>`
    })
    filas.push(`<div class="fila">${grupos.join('')}</div>`)
  }
  return filas.join('')
}
function textos(i) {
  const t = T[i]
  return `<div class="col">
<h3>${NOMBRE_IDIOMA[i]} — ${t.archivo}</h3>
<div class="k">Nombre · ${largo(t.nombre)}/30</div><div class="nombre">${esc(t.nombre)}</div><div class="nota">${esc(t.nombreNota)}</div>
<div class="k">Alternativas de nombre, opcionales</div>${t.nombresAlternativos.map(([a, nota]) => `<div class="alt"><span>${esc(a)}</span> <em>${largo(a)}/30</em> — ${esc(nota)}</div>`).join('')}
<div class="k">Descripción breve · elegir una</div>${t.breves.map(([b, nota], k) => `<div class="breve"><b>${'ABC'[k]}</b> <span>${esc(b)}</span> <em>${largo(b)}/80</em><div class="nota">${esc(nota)}</div></div>`).join('')}
<div class="k">Descripción completa · ${largo(t.completa)}/4000</div><div class="completa">${esc(t.completa)}</div>
</div>`
}

const pagina = `<!doctype html><html><head><meta charset="utf-8"><style>${LETRAS}
body{width:${W}px;background:linear-gradient(180deg,${C.suelo},${C.hondo});color:${C.letra};font-family:"Source Sans 3",sans-serif;padding:96px 80px 120px}
header{display:flex;align-items:flex-end;gap:40px;padding-bottom:48px;border-bottom:1px solid rgba(231,225,222,.14);margin-bottom:24px}
header h1{font-family:"Source Serif 4",serif;font-weight:600;font-size:64px;color:${C.crema};letter-spacing:-.02em}
header p{font-size:26px;color:${C.apagado};margin-top:8px}
h2{font-family:"Source Serif 4",serif;font-weight:600;font-size:44px;color:${C.crema};margin:72px 0 8px}
h2 small{font-family:"Source Sans 3";font-size:22px;color:${C.apagado};font-weight:400;margin-left:16px}
.bajada{font-size:22px;color:${C.apagado};margin-bottom:28px;max-width:1900px;line-height:1.45}
h3{font-size:22px;font-weight:600;color:${C.ambar};letter-spacing:.06em;margin:32px 0 16px;text-transform:uppercase}
.fila{display:flex;gap:16px;align-items:flex-start}
figure{margin:0}
figure img,.fila img{display:block;border-radius:14px}
figcaption{font-size:19px;color:${C.apagado};margin-top:10px;max-width:740px;line-height:1.4}
figcaption b{color:${C.crema};margin-right:6px}
.tels{gap:16px}.tel{position:relative}
.num{position:absolute;top:-14px;left:-10px;width:36px;height:36px;border-radius:50%;background:${C.ambar};color:${C.suelo};font-weight:600;font-size:20px;display:flex;align-items:center;justify-content:center;z-index:2}
.cols{display:flex;gap:64px}.col{flex:1}
.k{font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${C.apagado};margin:26px 0 8px}
.nombre{font-family:"Source Serif 4",serif;font-size:40px;font-weight:600;color:${C.crema}}
.nota{font-size:18px;color:${C.apagado};margin-top:4px}
.alt{font-size:20px;color:${C.apagado};margin:6px 0}.alt span{color:${C.letra};font-weight:600}
em{font-style:normal;color:${C.verde};font-size:18px;font-weight:600}
.breve{background:rgba(231,225,222,.05);border:1px solid rgba(231,225,222,.1);border-radius:14px;padding:14px 18px;margin:10px 0;font-size:23px}
.breve b{display:inline-block;width:30px;color:${C.ambar}}
.completa{white-space:pre-wrap;font-size:19px;line-height:1.5;background:rgba(231,225,222,.04);border:1px solid rgba(231,225,222,.1);border-radius:14px;padding:22px 26px;color:${C.letra}}
.provisional{display:inline-block;background:${C.ambar};color:${C.suelo};font-family:"Source Sans 3";font-weight:600;font-size:26px;letter-spacing:.16em;padding:8px 18px;border-radius:10px;margin-left:18px;vertical-align:8px}
.grupo{flex:1}.eti-g{font-size:20px;font-weight:600;color:${C.crema};margin-bottom:10px}
.caja{background:rgba(231,225,222,.05);border:1px solid rgba(231,225,222,.1);border-radius:16px;padding:24px 30px;font-size:21px;line-height:1.5;color:${C.letra}}
.caja li{margin:6px 0 6px 24px}
code{font-family:ui-monospace,monospace;font-size:.86em;color:${C.celeste}}
table{border-collapse:collapse;width:100%;font-size:18px}td{padding:6px 12px;border-bottom:1px solid rgba(231,225,222,.08);vertical-align:top}td:first-child{color:${C.crema};width:34%}
</style></head><body>
<header>${marca({ alto: 120, color: C.crema, id: 'lam' })}<div><h1>La ficha de Google Play</h1><p>Propuesta para revisar · tarea 86 · 29-09-2026 · todo sale de la app real de main -5efe959-</p></div></header>

<h2>Gráfico de funciones <small>1024 x 500 · PNG 24 bits sin alfa · tres propuestas por idioma</small></h2>
<div class="bajada">Sin dispositivos ni capturas, como pide Play. Fondos en colores de Sigo -ámbar, celeste, crema-: Play pide colores vivos y no blanco puro, negro ni gris oscuro, así que el suelo oscuro de la app no sirve aquí. Todo lo esencial queda a más de 64 px del borde.</div>
${graficos()}

<h2>Capturas de teléfono <small>1080 x 1920 · la 4 en 1920 x 1080 · en este orden</small></h2>
<div class="bajada">Una historia en ocho pasos: hablas y el texto te sigue, te grabas leyendo -detrás, en recuadro, de lado-, marcas tu guion, el video sale con subtítulos, todos tus guiones a mano, y a tu manera. El titular dice el beneficio en 7 palabras o menos y ocupa menos del 20 % de alto. Sin marco de teléfono: Play no quiere imágenes de dispositivos.</div>
${telefonos('es')}
${telefonos('en')}

<h2>Textos <small>los conteos los hace herramientas/armar-textos.cjs</small></h2>
<div class="cols">${textos('es')}${textos('en')}</div>

<h2>Tabletas <span class="provisional">PROVISIONAL</span> <small>7": 1440 x 2560 / 2560 x 1440 · 10": 2160 x 3840 / 3840 x 2160</small></h2>
<div class="bajada">La app tal como se ve HOY en una tableta: el diseño de teléfono, más grande -la tarea 83 no está hecha; <code>useLayout</code> solo da tel-v y tel-h-. Leer, Grabar con la cámara detrás, de lado y el editor, con la letra en 32. A pantalla completa y sin titulares: para pantallas grandes Play pide no agregar texto fuera de la app. Cuando la 83 esté en main: <code>bash docs/play/ficha/herramientas/todo.sh tab</code>.</div>
${tabletas()}

<h2>Lo que hay que saber</h2>
<div class="cols">
<div class="col caja"><b>Qué no sale de la app en las capturas</b><ul>
<li><b>La imagen de la cámara</b> es una foto puesta donde el teléfono pone la vista previa: el navegador no tiene la cámara nativa. Mismo método de las láminas de la tarea 82.</li>
<li><b>La toma del visor -6-</b> es la foto quieta con un registro de voz sintético; los subtítulos los dibuja la app con ese registro.</li>
<li><b>La voz</b> es guiada: entrega las palabras del guion como si alguien leyera. El seguidor y la línea son los de la app.</li>
<li><b>Fotos</b>, CC0 1.0 de Wikimedia Commons: "Happy daughter" de Michael Dam -vertical- y "Sitting And Smiling" de Brooke Cagle -de lado-. La primera trae aviso de derechos de la personalidad. Para la versión final, mejor fotos propias o con permiso firmado: se cambian en herramientas/fuente/ y se corre todo.sh.</li>
<li><b>No se dice</b> que los guiones se respaldan con la copia de Android: no está comprobado -evidencia.md-.</li>
</ul></div>
<div class="col caja"><b>Evidencia -completa en evidencia.md-</b><table>
<tr><td>Sigue tu voz, es y en</td><td><code>src/motor/MotorNativo.ts:46, 67</code></td></tr>
<tr><td>Espera si haces una pausa</td><td><code>src/lib/avance.ts:43, 300</code></td></tr>
<tr><td>Español sin internet · inglés una descarga</td><td><code>android/model-es|model-en/build.gradle:18</code></td></tr>
<tr><td>Cámara detrás, recuadro u oculta</td><td><code>FichasListo.tsx:216-220 · camara.ts:192-206</code></td></tr>
<tr><td>Frontal o trasera · 1080p/720p/480p</td><td><code>FichasListo.tsx:248 · 139, 356</code></td></tr>
<tr><td>Subtítulos en tres estilos, quemados</td><td><code>subtitulos.ts:268-273 · CamaraNativaPlugin.java:436</code></td></tr>
<tr><td>Negrita, colores, destacado</td><td><code>EditorView.tsx:245-252, 511-513</code></td></tr>
<tr><td>Acotaciones · .txt .md .docx</td><td><code>acotaciones.ts:1-12 · EditorView.tsx:350</code></td></tr>
<tr><td>Ajustes de lectura · espejo · tema</td><td><code>PantallaAjustes.tsx:231-260, 291</code></td></tr>
</table><p style="margin-top:14px;font-size:18px;color:${C.apagado}">Play: answer/9866151 -activos de vista previa-, answer/9898842 -metadatos-, answer/9859152 -límites de texto-.</p></div>
</div>
</body></html>`

;(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  try {
    const p = await b.newPage()
    await p.setViewport({ width: W, height: 1200, deviceScaleFactor: 1 })
    await p.setContent(pagina, { waitUntil: 'load' })
    await p.evaluate(() => document.fonts.ready)
    const tmp = path.join(TMP, 'lamina.png')
    await p.screenshot({ path: tmp, fullPage: true })
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-pix_fmt', 'rgb24', '-pred', 'mixed', '-frames:v', '1', path.join(FICHA, 'lamina-ficha.png')])
    fs.writeFileSync(path.join(TMP, 'lamina.html'), pagina)
    console.log('  lámina lista')
  } finally {
    await b.close()
  }
})()
