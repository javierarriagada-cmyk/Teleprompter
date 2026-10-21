// LAS LÁMINAS «ANTES | DESPUÉS» -mejoras de claridad, 21-10-2026-. Después de capturas.cjs:
//   node docs/archivo/pantallas/mejoras-claridad/herramientas/laminas.cjs
// Una lámina por mejora y tema -la 3 y la 4 también en claro-: a la izquierda la app de hoy, a la derecha
// la misma app con la mejora, en teléfonos de 392 de ancho. Mismo método que tarea90/laminas-comparadas.cjs.
// Escribe lamina-<n>-<nombre>-<tema>.png e index.html en docs/archivo/pantallas/mejoras-claridad/.
// -paso 2- Con «codigo» -node laminas.cjs codigo, después de capturas.cjs <n> codigo- arma las láminas de la
// 1, la 3 y la 4 en los dos temas con el DESPUÉS sacado de la app de la rama, ya con el código:
// lamina-codigo-<n>-<nombre>-<tema>.png. La entrada es oscura en los dos temas: su «antes» es el oscuro.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core')
const fs = require('fs')
const path = require('path')
const D = path.join(__dirname, '..')
const C = path.join(D, 'capturas')
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')

const LAMINAS = [
  { n: 1, nombre: 'arranque', titulo: 'Arranque', pantallas: ['entrada'], temas: ['oscuro'],
    antes: 'TELEPROMPTER chico y apagado bajo «Sig●».',
    despues: 'TELEPROMPTER un 10 % más grande y más claro, con una línea roja corta entre la marca y la palabra. Mismos tiempos; la palabra y la línea se apagan al empezar el viaje.',
    codigo: 'TELEPROMPTER un 10 % más grande y más claro, igual que en el splash nativo. SIN la línea roja: no tiene aire entre la «g» y la palabra dentro del círculo del splash. Mismos tiempos.' },
  { n: 2, nombre: 'minutos-aproximados', titulo: '«≈» delante de los minutos', pantallas: ['portada', 'editor'], temas: ['oscuro'],
    antes: '«17:32 min» en la tarjeta, en las filas y en el editor, como si fuera exacto.',
    despues: '«≈18 min»: la misma estimación, en minutos redondeados. Tarjeta grande, filas de la lista y «2631 palabras · ≈18 min» en el editor. Leer no cambia.' },
  { n: 3, nombre: 'portada', titulo: 'La portada', pantallas: ['portada'], temas: ['oscuro', 'claro'],
    antes: 'La tarjeta grande sin decir qué es, un «+» solo, y los videos con el título cortado en un renglón.',
    despues: '«Continuar con este guion» arriba del título, en la letra de la etiqueta de la duración; «+ Nuevo guion» en el mismo lugar, 48 de alto; títulos de video en dos renglones. La tarjeta y «Sig●» no cambian.',
    codigo: '«Continuar con este guion» entre la duración y el título; «+ Nuevo guion», 48 de alto; títulos de video en dos renglones y la fecha debajo, en todas. A la derecha, la portada arriba -con «Sig●»- y bajada hasta los videos.' },
  { n: 4, nombre: 'aviso-borrar', titulo: 'Borrar un guion: el aviso', pantallas: ['aviso'], temas: ['oscuro', 'claro'],
    antes: '«Guion borrado · Deshacer» chico, pegado abajo, 5 s.',
    despues: 'Más arriba -sobre los botones y barras de abajo-, un poco más grande, Deshacer con 48 de alto, y dura 6 s. Sin cartel de confirmación. Archivar no cambia.',
    codigo: 'A 96 del borde, 56 de alto, letra de 16, Deshacer con 48 de alto, 6 s. En claro, Deshacer en --aviso-accion: 6,0 a 1 sobre el aviso blanco.' },
  { n: 5, nombre: 'ajustes', titulo: 'Ajustes', pantallas: ['ajustes', 'editor'], temas: ['oscuro'],
    antes: 'El recuadro de muestra sin nombre, las filas a 15, y «Aa» en el editor.',
    despues: '«VISTA PREVIA» en el estilo de .dock-seccion; el nombre de cada fila a 16 -alto 48-; en el editor, el engranaje de la portada en lugar del «Aa».' }
]
const CSS = `body{margin:0;background:#0d0b0a;font-family:'Source Sans 3',system-ui,sans-serif;color:#e7e1de;padding:36px 40px 40px;width:max-content}
h1{font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:30px;margin:0 0 4px;letter-spacing:-0.01em}
h1 .n{display:inline-block;width:10px;height:10px;border-radius:50%;background:#E11D2E;margin:0 12px 5px 0;vertical-align:middle}
.sub{font-size:14px;color:#8A837C;margin-bottom:26px;letter-spacing:.04em;text-transform:uppercase}
.par{display:flex;gap:56px}.lado h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8A837C;margin:0 0 6px;font-weight:700}
.lado.d h2{color:#e7e1de}.lado.d h2::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#E11D2E;margin-right:8px;vertical-align:middle}
.nota{font-size:14px;line-height:1.45;color:#bdb5ae;max-width:${392 * 2 + 24}px;min-height:42px;margin-bottom:14px}
.tels{display:flex;gap:24px}
.tel{width:392px;height:852px;border-radius:34px;overflow:hidden;box-shadow:0 0 0 1px #2c2724,0 0 0 9px #191513,0 0 0 10px #2c2724,0 24px 60px rgba(0,0,0,.55);margin:10px}
.tel img{width:392px;height:852px;display:block}`
;(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  const p = await br.newPage()
  if (process.argv[2] === 'codigo') {
    for (const l of LAMINAS.filter((x) => [1, 3, 4].includes(x.n))) for (const tema of ['oscuro', 'claro']) {
      const antes = (pa) => { const f = path.join(C, `${l.n}-${pa}-${tema}-antes.png`); return fs.existsSync(f) ? f : path.join(C, `${l.n}-${pa}-oscuro-antes.png`) }
      // -2026-10-21- En la 3, el después lleva dos teléfonos: la portada arriba -con «Sig●»- y bajada hasta los
      // videos. Antes, uno solo, el bajado, y la marca no se veía. Antes:
      // const tels = (v) => l.pantallas.map((pa) => `<div class="tel"><img src="${b64(v === 'antes' ? antes(pa) : path.join(C, `${l.n}-${pa}-${tema}-codigo.png`))}"></div>`).join('')
      const pantallasCodigo = (pa) => (l.n === 3 && pa === 'portada' ? ['portada', 'portada-abajo'] : [pa])
      const tels = (v) => l.pantallas.flatMap((pa) => (v === 'antes' ? [pa] : pantallasCodigo(pa))).map((pa) => `<div class="tel"><img src="${b64(v === 'antes' ? antes(pa) : path.join(C, `${l.n}-${pa}-${tema}-codigo.png`))}"></div>`).join('')
      const html = `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<h1><span class="n"></span>${l.n}. ${l.titulo}</h1>
<div class="sub">Sigo · mejoras de claridad · paso 2, el código · tema ${tema} · teléfono de 392</div>
<div class="par"><div class="lado"><h2>Antes · main</h2><div class="nota">${l.antes}</div><div class="tels">${tels('antes')}</div></div>
<div class="lado d"><h2>Después · la app de la rama</h2><div class="nota">${l.codigo}</div><div class="tels">${tels('codigo')}</div></div></div></body></html>`
      await p.setViewport({ width: 2000, height: 400, deviceScaleFactor: 2 })
      await p.setContent(html, { waitUntil: 'load' })
      const nombre = `lamina-codigo-${l.n}-${l.nombre}-${tema}.png`
      await (await p.$('body')).screenshot({ path: path.join(D, nombre) })
      console.log('ok', nombre)
    }
    await br.close()
    return
  }
  const hechas = []
  for (const l of LAMINAS) for (const tema of l.temas) {
    const tels = (v) => l.pantallas.map((pa) => `<div class="tel"><img src="${b64(path.join(C, `${l.n}-${pa}-${tema}-${v}.png`))}"></div>`).join('')
    const html = `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<h1><span class="n"></span>${l.n}. ${l.titulo}</h1>
<div class="sub">Sigo · mejoras de claridad · tema ${tema} · teléfono de 392 · app real</div>
<div class="par"><div class="lado"><h2>Antes · hoy</h2><div class="nota">${l.antes}</div><div class="tels">${tels('antes')}</div></div>
<div class="lado d"><h2>Después · boceto</h2><div class="nota">${l.despues}</div><div class="tels">${tels('despues')}</div></div></div></body></html>`
    await p.setViewport({ width: 2000, height: 400, deviceScaleFactor: 2 })
    await p.setContent(html, { waitUntil: 'load' })
    const nombre = `lamina-${l.n}-${l.nombre}-${tema}.png`
    await (await p.$('body')).screenshot({ path: path.join(D, nombre) })
    hechas.push({ l, tema, nombre })
    console.log('ok', nombre)
  }
  const indice = `<!doctype html>
<!-- LAS LÁMINAS DE LAS MEJORAS DE CLARIDAD, en orden -21-10-2026-. Las arma herramientas/laminas.cjs. -->
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sigo · mejoras de claridad · bocetos</title>
<style>body{margin:0;background:#0d0b0a;color:#e7e1de;font-family:'Source Sans 3',system-ui,sans-serif;padding:32px}
h1{font-family:'Source Serif 4',Georgia,serif;font-weight:600;margin:0 0 6px}p{color:#bdb5ae;margin:0 0 28px;max-width:70ch}
h2{font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:20px;margin:36px 0 10px}img{max-width:100%;display:block;border-radius:12px}</style></head>
<body><h1>Sigo · cinco mejoras de claridad · bocetos</h1>
<p>Paso 1, solo bocetos. Cada lámina: a la izquierda la app de hoy, a la derecha la misma app -sus componentes y su CSS- con la mejora, en un teléfono de 392 de ancho. La 3 y la 4 también en tema claro.</p>
${hechas.map((h) => `<h2>${h.l.n}. ${h.l.titulo} · ${h.tema}</h2>\n<img src="${h.nombre}" alt="${h.l.n}. ${h.l.titulo}, tema ${h.tema}: antes y después">`).join('\n')}
</body></html>
`
  fs.writeFileSync(path.join(D, 'index.html'), indice)
  await br.close()
})().catch((e) => { console.error(e); process.exit(1) })
