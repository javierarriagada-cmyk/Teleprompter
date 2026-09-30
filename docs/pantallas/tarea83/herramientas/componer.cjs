// LA APP AL LADO DEL BOCETO -tarea 83, 30-09-2026-. node componer.cjs
//
// Toma cada captura de crudas/ -capturar.cjs- y la pone al lado del boceto aprobado del mismo
// estado, con el nombre de los dos. Los bocetos son los PNG sueltos de los que salieron
// hoja-tableta.png y hoja-tableta-claro.png -la misma lámina, en grande-; viven fuera del repo, en
// la carpeta de revisión del 29-09-2026: BOCETOS apunta ahí. La composición la dibuja el mismo
// Chrome: no hace falta ninguna biblioteca de imágenes.
const puppeteer = require(process.env.PUPPETEER || '/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')

const BOCETOS = process.env.BOCETOS || '/workspace/teleprompter-review/bocetos'
const CRUDAS = path.join(__dirname, 'crudas')
const SALIDA = path.join(__dirname, '..')

// Qué boceto va con cada estado. Donde la hoja no dibujó ese estado se usa el más cercano y se
// dice en la leyenda.
const PAREJAS = {
  'leer-listo': ['listo', ''],
  'leer-leyendo': ['lectura', ''],
  'leer-leyendo-controles': ['lectura-controles', ''],
  'grabar-listo-detras': ['grabar-listo-camara-fondo', ''],
  'grabar-listo-recuadro': ['grabar-listo-recuadro', ''],
  'grabar-grabando-detras': ['grabar-grabando-camara-fondo', ''],
  'grabar-grabando-detras-controles': ['grabar-grabando-camara-fondo-controles', ''],
  'grabar-grabando-recuadro': ['grabar-grabando-recuadro', ''],
  'grabar-grabando-recuadro-controles': ['grabar-grabando-recuadro-controles', ''],
  'grabar-pausa-tacho': ['grabar-grabando-camara-fondo-controles', 'la hoja no dibuja la pausa: se compara con grabando con controles']
}

const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')

;(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  const p = await b.newPage()
  const hechas = []
  for (const f of fs.readdirSync(CRUDAS).filter((x) => x.endsWith('.png')).sort()) {
    const m = f.match(/^(tab-[vh])-(.+)-(oscuro|claro)\.png$/)
    if (!m) continue
    const [, pantalla, estado, tema] = m
    const par = PAREJAS[estado]
    if (!par) continue
    let [boceto, nota] = par
    const orient = pantalla === 'tab-v' ? 'vertical' : 'horizontal'
    // La tableta vertical no tiene boceto de Leer con controles: el más cercano es Grabar con
    // controles y el recuadro, que muestra la misma barra y el mismo dock.
    if (pantalla === 'tab-v' && boceto === 'lectura-controles') {
      boceto = 'grabar-grabando-recuadro-controles'
      nota = 'la hoja no dibuja Leer vertical con controles: se compara con Grabar con controles'
    }
    const archivoBoceto = path.join(BOCETOS, `tableta-${orient}-${boceto}${tema === 'claro' ? '-claro' : ''}.png`)
    if (!fs.existsSync(archivoBoceto)) {
      console.log('  sin boceto para', f)
      continue
    }
    const hoja = tema === 'claro' ? 'hoja-tableta-claro.png' : 'hoja-tableta.png'
    const w = pantalla === 'tab-v' ? 820 : 1180
    const h = pantalla === 'tab-v' ? 1180 : 820
    const fondo = tema === 'claro' ? '#E9E6E1' : '#0E0D0C'
    const letra = tema === 'claro' ? '#1A1815' : '#E7E1DE'
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;background:${fondo};color:${letra};font:15px/1.4 "Source Sans 3",system-ui,sans-serif}
      .fila{display:flex;gap:32px;padding:28px 32px 32px}
      figure{margin:0}
      figcaption{margin:0 0 10px;font-weight:600}
      figcaption span{font-weight:400;opacity:.7}
      img{display:block;width:${w}px;height:${h}px;outline:1px solid rgba(128,128,128,.5)}
      .nota{padding:0 32px 24px;opacity:.75}
    </style></head><body><div class="fila">
      <figure><figcaption>App real, Chrome ${w}×${h} <span>· ${pantalla} · ${estado} · tema ${tema}</span></figcaption><img src="${b64(path.join(CRUDAS, f))}"></figure>
      <figure><figcaption>Boceto aprobado <span>· ${path.basename(archivoBoceto)} (de ${hoja})</span></figcaption><img src="${b64(archivoBoceto)}"></figure>
    </div>${nota ? `<div class="nota">Nota: ${nota}.</div>` : ''}</body></html>`
    await p.setViewport({ width: 2 * w + 96, height: h + 90 + (nota ? 30 : 0), deviceScaleFactor: 1 })
    await p.setContent(html, { waitUntil: 'load' })
    const salida = path.join(SALIDA, `comparar-${pantalla}-${estado}-${tema}.png`)
    await p.screenshot({ path: salida, fullPage: true })
    hechas.push(path.basename(salida))
  }
  await b.close()
  console.log(hechas.join('\n'))
})()
