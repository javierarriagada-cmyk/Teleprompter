// Capturas del boceto -tarea 89-. Con vite corriendo en 127.0.0.1:5182: node capturas.cjs
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, '..');
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'language', { get: () => 'es-CL' }); Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] }); });
  for (const modo of ['hoy', 'propuesta']) for (const tema of ['oscuro', 'claro']) {
    await p.setViewport({ width: 915, height: 411, deviceScaleFactor: 2 });
    await p.goto(`http://127.0.0.1:5182/docs/pantallas/tarea89/herramientas/boceto.html?modo=${modo}&tema=${tema}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await p.screenshot({ path: path.join(OUT, `visor-de-lado-${modo}-${tema}.png`) });
  }
  await br.close();
})();
