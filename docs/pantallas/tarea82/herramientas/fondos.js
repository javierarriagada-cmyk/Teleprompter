const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage();
  for (const [w, h] of [[800, 360], [844, 390], [390, 844]]) for (const v of ['', 'pared']) {
    await p.setViewport({ width: w, height: h });
    await p.goto('file:///workspace/teleprompter-review/bocetos/sigo-bocetos.css');
    await p.setContent(`<html><head><link rel="stylesheet" href="file:///workspace/teleprompter-review/bocetos/sigo-bocetos.css"></head><body><div class="pantalla"><div class="camara ${v}" style="--silw:30%"><div class="sil"></div></div></div></body></html>`);
    await new Promise(r => setTimeout(r, 300));
    await p.screenshot({ path: `/workspace/t82shots/camara${v ? '-' + v : ''}-${w}x${h}.png` });
  }
  await b.close();
})();
