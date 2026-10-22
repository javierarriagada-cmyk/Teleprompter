// LAS LÁMINAS DEL BOCETO DEL PORTUGUÉS -portugues-voz, 2026-10-22-. Después de capturas.cjs:
//   node docs/pantallas/portugues/herramientas/laminas.cjs
// Una lámina por tema: el editor en un teléfono de 360, con la app en español. A la izquierda un guion en inglés
// -menú de tres idiomas abierto y el aviso del punto 7-; a la derecha uno en portugués -el menú, sin aviso-.
// Mismo método que mejoras-claridad/laminas.cjs. Escribe lamina-portugues-<tema>.png e index.html.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const D = path.join(__dirname, '..')
const C = path.join(D, 'capturas')
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')

const LADOS = [
  { guion: 'en', titulo: 'Guion en inglés', nota: 'Tocar «EN» abre el menú adjunto de Ajustes con los tres idiomas, cada uno en el suyo. Como el guion no está en el idioma de la app, sale el aviso EN INGLÉS, una vez por idioma, después de la marca de guía; «Switch to English», en el color del texto y en negrita, pone la app en inglés -fijarIdioma-.' },
  { guion: 'pt', titulo: 'Guion en portugués', nota: 'El mismo menú con «Português» elegido. Sin aviso: la app no está en portugués, no hay a qué cambiarla.' }
]
const CSS = `body{margin:0;background:#0d0b0a;font-family:'Source Sans 3',system-ui,sans-serif;color:#e7e1de;padding:36px 40px 40px;width:max-content}
h1{font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:30px;margin:0 0 4px;letter-spacing:-0.01em}
h1 .n{display:inline-block;width:10px;height:10px;border-radius:50%;background:#E11D2E;margin:0 12px 5px 0;vertical-align:middle}
.sub{font-size:14px;color:#8A837C;margin-bottom:26px;letter-spacing:.04em;text-transform:uppercase}
.par{display:flex;gap:56px}.lado h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#e7e1de;margin:0 0 6px;font-weight:700}
.nota{font-size:14px;line-height:1.45;color:#bdb5ae;max-width:380px;min-height:84px;margin-bottom:14px}
.tel{width:360px;height:780px;border-radius:34px;overflow:hidden;box-shadow:0 0 0 1px #2c2724,0 0 0 9px #191513,0 0 0 10px #2c2724,0 24px 60px rgba(0,0,0,.55);margin:10px}
.tel img{width:360px;height:780px;display:block}`
;(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  const p = await br.newPage()
  const hechas = []
  for (const tema of ['claro', 'oscuro']) {
    const html = `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<h1><span class="n"></span>5. El idioma del guion, con portugués</h1>
<div class="sub">Sigo · portugués · puntos 6 y 7, desde el código · tema ${tema} · teléfono de 360 · app real, en español</div>
<div class="par">${LADOS.map((l) => `<div class="lado"><h2>${l.titulo}</h2><div class="nota">${l.nota}</div><div class="tel"><img src="${b64(path.join(C, `editor-${l.guion}-${tema}.png`))}"></div></div>`).join('')}</div></body></html>`
    await p.setViewport({ width: 1400, height: 400, deviceScaleFactor: 2 })
    await p.setContent(html, { waitUntil: 'load' })
    const nombre = `lamina-portugues-${tema}.png`
    await (await p.$('body')).screenshot({ path: path.join(D, nombre) })
    hechas.push({ tema, nombre })
    console.log('ok', nombre)
  }
  fs.writeFileSync(path.join(D, 'index.html'), `<!doctype html>
<!-- LA LÁMINA DEL PORTUGUÉS -portugues-voz, 2026-10-22-. La arma herramientas/laminas.cjs. -->
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sigo · portugués · boceto</title>
<style>body{margin:0;background:#0d0b0a;color:#e7e1de;font-family:'Source Sans 3',system-ui,sans-serif;padding:32px}
h1{font-family:'Source Serif 4',Georgia,serif;font-weight:600;margin:0 0 6px}p{color:#bdb5ae;margin:0 0 28px;max-width:70ch}
h2{font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:20px;margin:36px 0 10px}img{max-width:100%;display:block;border-radius:12px}</style></head>
<body><h1>Sigo · el idioma del guion, con portugués · boceto</h1>
<p>Puntos 6 -menú de tres idiomas- y 7 -el aviso- de la orden «portugues-voz», capturados de la app real con el código de la rama -2026-10-22-. Antes: el boceto del punto 5, dibujado encima de la app.</p>
${hechas.map((h) => `<h2>Tema ${h.tema}</h2>\n<img src="${h.nombre}" alt="El editor con el menú de idioma abierto, tema ${h.tema}">`).join('\n')}
</body></html>
`)
  await br.close()
})().catch((e) => { console.error(e); process.exit(1) })
