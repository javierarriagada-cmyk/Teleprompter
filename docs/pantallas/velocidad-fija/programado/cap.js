// uso: node cap.js <url> <salida.png> <pasos json> [ancho alto]
// pasos: ["click:<sel>", "espera:<ms>", "toque:<x>,<y>", "eval:<js>"]
const puppeteer = require('/tmp/capvf/node_modules/puppeteer-core');
const [,, base, salida, pasosJ = '[]', W = '412', H = '915'] = process.argv;
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--lang=es-CL', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)) });
  await p.setViewport({ width: +W, height: +H, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument((extra) => {
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    localStorage.setItem('sigo_idioma', 'es');
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true');
    localStorage.setItem('teleprompter_ajustes', JSON.stringify({ tema: 'oscuro', fontSize: 32, mostrarTiempo: true, anclajeZona: 'arriba' }));
  }, JSON.parse(process.env.LS || '{}'));
  await p.goto(base + '/', { waitUntil: 'networkidle2' });
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));
  for (const paso of JSON.parse(pasosJ)) {
    const [k, ...r] = paso.split(':'); const v = r.join(':');
    if (k === 'click') { await p.waitForSelector(v, { timeout: 15000 }); await p.click(v); await new Promise(r => setTimeout(r, 900)); }
    else if (k === 'espera') await new Promise(r => setTimeout(r, +v));
    else if (k === 'toque') { const [x, y] = v.split(',').map(Number); await p.touchscreen.tap(x, y); await new Promise(r => setTimeout(r, 900)); }
    else if (k === 'eval') console.log('EVAL', JSON.stringify(await p.evaluate(v)));
  }
  await p.screenshot({ path: salida });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
