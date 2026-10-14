const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  const A = '/workspace/t82shots/app/';
  const h = (t) => ['oscuro', 'claro'].map(tema => `<div class="c"><div class="r">${t} · ${tema === 'oscuro' ? 'Negro con blanco' : 'Blanco con negro'}</div><img src="${b64(A + `grabar-${t.includes('grabando') ? 'grabando' : 'listo'}-detras-pared-800x360-${tema}.png`)}" style="width:800px;height:360px"></div>`).join('');
  const v = ['oscuro', 'claro'].map(tema => `<div class="c"><div class="r">vertical 390×844 · LISTO · ${tema === 'oscuro' ? 'Negro con blanco' : 'Blanco con negro'}</div><img src="${b64(A + `vertical-grabar-listo-detras-pared-390x844-${tema}.png`)}" style="width:390px;height:844px"></div>`).join('');
  const j = JSON.parse(fs.readFileSync('/workspace/t82shots/contraste-app.json', 'utf8'));
  const tabla = (vista) => { const pares = [...new Set(j.map(f => f.pareja))]; const est = [...new Set(j.map(f => f.estilo))]; const vid = [...new Set(j.map(f => f.video))];
    return `<table><tr><th>${vista}</th>${vid.map(x => `<th>${x}</th>`).join('')}</tr>${pares.map(pa => est.map(e => `<tr><td>${pa} · ${e}</td>${vid.map(x => { const f = j.find(f => f.pareja === pa && f.estilo === e && f.video === x && f.vista.startsWith(vista)); return `<td class="${f.ratio >= 4.5 ? 'ok' : f.ratio >= 3 ? 'm' : 'b'}">${f.ratio.toFixed(2).replace('.', ',')}</td>`; }).join('')}</tr>`).join('')).join('')}</table>`; };
  const html = `<html><head><meta charset="utf-8"><style>body{margin:0;background:#2a2a2a;font-family:"Source Sans 3",sans-serif;color:#eee;padding:20px;width:max-content}h1{font-size:22px;margin:0 0 4px}.s{font-size:14px;color:#bbb;margin:0 0 14px;max-width:1620px}.fila{display:flex;gap:24px;margin-bottom:18px;align-items:flex-start}.r{font-size:14px;margin-bottom:6px}img{display:block;outline:1px solid #555}table{border-collapse:collapse;font-size:14px;margin-right:24px}td,th{border:1px solid #555;padding:3px 8px;text-align:right}td:first-child,th:first-child{text-align:left}.ok{color:#9CC5A1}.m{color:#F0C070}.b{color:#FF7A7A}</style></head><body>
  <h1>Tarea 82 · Regla E en la app real · la pared blanca del peor caso</h1>
  <div class="s">La cámara detrás se simula con la «pared» de los bocetos. Tablas: contraste medido en la app real -Chrome, DPR 2, el glifo █ a 24 px adentro de contenedor-lectura con el CSS de la app, centro contra el píxel 1 px CSS afuera del borde, fuera del panel- sobre video liso. La acotación queda igual que sin cámara -#aaa a media opacidad sobre el lienzo: 2,51 y 1,47-, que es lo que pide el encargo.</div>
  <div class="fila">${h('Grabar LISTO')}</div><div class="fila">${h('Grabar grabando')}</div>
  <div class="fila">${v}<div>${tabla('horizontal')}<br>${tabla('vertical')}</div></div></body></html>`;
  await p.setViewport({ width: 1800, height: 900 });
  await p.setContent(html, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: '/workspace/t82shots/laminas/lamina-regla-e-pared-blanca.png' });
  await br.close();
})();
