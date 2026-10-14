// El visor de la rama, de lado, desplazado hasta el final -tarea 89-: node rama.cjs
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, '..');
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
  const p = await br.newPage();
  for (const tema of ['oscuro', 'claro']) {
    await p.setViewport({ width: 915, height: 411, deviceScaleFactor: 2 });
    await p.goto(`http://127.0.0.1:5182/docs/pantallas/tarea89/herramientas/boceto.html?modo=hoy&tema=${tema}`, { waitUntil: 'networkidle0' });
    await p.evaluate(() => { const r = document.querySelector('[data-testid=reproductor-grabacion]'); r.scrollTop = r.scrollHeight; });
    await new Promise((r) => setTimeout(r, 300));
    await p.screenshot({ path: path.join(OUT, `visor-de-lado-rama-desplazado-${tema}.png`) });
  }
  await br.close();
})();
