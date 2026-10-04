// Lámina hoy | boceto, por tema -tarea 89-. Después de capturas.cjs: node lamina.cjs
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(D, f)).toString('base64');
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  for (const tema of ['oscuro', 'claro']) {
    const html = `<html><head><meta charset="utf-8"><style>body{margin:0;background:#2a2a2a;font-family:sans-serif;color:#eee;padding:20px;width:max-content}h1{font-size:22px;margin:0 0 4px}.s{font-size:14px;color:#bbb;margin-bottom:14px;max-width:1880px}.fila{display:flex;gap:24px}.r{font-size:14px;margin-bottom:6px;color:#ddd}img{display:block;width:915px;height:411px;outline:1px solid #555}</style></head><body>
<h1>Tarea 89 · defecto 2 · visor de lado · tema ${tema} · BOCETO, sin código</h1>
<div class="s">915×411 dp, teléfono de lado con la barra de tres botones a la derecha (48 dp, dibujada encima). Izquierda: el ReproductorGrabacion de hoy, con el video al alto que toma una toma vertical (maxHeight 70vh). La tarjeta mide ~472 dp y la pantalla 411: centrada en una raíz fija sin desplazamiento, se corta arriba (la X) y abajo (Guardar, Repetir, Borrar). Derecha: la propuesta, con el video a todo el alto a la izquierda y los controles a la derecha, con las mismas piezas de Sigo.</div>
<div class="fila"><div><div class="r">Hoy · ReproductorGrabacion.tsx</div><img src="${b64(`visor-de-lado-hoy-${tema}.png`)}"></div><div><div class="r">Propuesta · video a un costado, controles al otro</div><img src="${b64(`visor-de-lado-propuesta-${tema}.png`)}"></div></div></body></html>`;
    await p.setViewport({ width: 1900, height: 600, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await (await p.$('body')).screenshot({ path: path.join(D, `lamina-visor-de-lado-${tema}.png`) });
  }
  await br.close();
})();
