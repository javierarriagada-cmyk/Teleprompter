// Capturas del boceto -tarea 87-. Con el servidor del boceto en 127.0.0.1:5182 -ver boceto.html- y
// los videos hechos -sh videos.sh-: node capturas.cjs
// Teléfono de pie, 412×915 dp -moto g86, 1080×2400-, a 2 px por dp. Si la tarjeta no cabe -el visor
// se desplaza desde la tarea 89-, se captura ENTERA, con una raya roja donde termina la pantalla:
// lo de abajo de la raya se ve desplazando. Las barras del sistema se dibujan en la primera pantalla.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, '..');
const ALTO = 915;
const PROPUESTA = [1, 2, 3, 4, 5, 6, 7, 8];
const HOY = [1, 3, 4, 7];
const soloResumen = process.argv.includes('--resumen');
async function capturar(p, url, archivo) {
  await p.setViewport({ width: 412, height: ALTO, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  // El video en el segundo 3,5: ahí el registro de la toma 008a7133 dice "que podríamos llamar /
  // la concepción trágica", un subtítulo de dos renglones -el más alto que hay-.
  await p.evaluate(async () => {
    const v = document.querySelector('video');
    if (!v) return;
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.currentTime = 3.5;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  });
  await new Promise((r) => setTimeout(r, 500));
  const alto = await p.evaluate(() => document.querySelector('[data-testid="reproductor-grabacion"]').scrollHeight);
  if (alto > ALTO) {
    await p.setViewport({ width: 412, height: alto, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 400));
    await p.evaluate((ALTO) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:0;right:0;top:${ALTO}px;border-top:2px dashed #e5484d;z-index:10000`;
      const s = document.createElement('span');
      s.textContent = 'fin de la pantalla · lo de abajo se ve desplazando';
      s.style.cssText = 'position:absolute;right:6px;top:2px;color:#e5484d;font:700 11px sans-serif;background:rgba(0,0,0,.6);padding:1px 4px';
      d.appendChild(s);
      document.body.appendChild(d);
      // El aviso breve va fijo abajo: con la página más alta que la pantalla, se deja donde queda en
      // el teléfono -sobre la barra de tres botones, a --aire-5 = 32 dp-, no al fondo de la captura.
      const a = document.querySelector('[data-testid="aviso-flotante"]');
      if (a) a.style.bottom = `${document.documentElement.clientHeight - (ALTO - 48 - 32)}px`;
    }, ALTO);
  }
  await p.screenshot({ path: path.join(OUT, archivo) });
  return alto;
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL', '--autoplay-policy=no-user-gesture-required'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'es-CL' });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] });
    localStorage.setItem('sigo_subtitulos_estilo', 'amarillo');
  });
  const medidas = {};
  for (const tema of ['oscuro', 'claro']) {
    const base = 'http://127.0.0.1:5182/docs/pantallas/tarea87/herramientas/boceto.html';
    if (soloResumen) {
      for (const e of [1, 2]) await capturar(p, `${base}?modo=propuesta&estado=${e}&tema=${tema}&subs=si&guias=si`, `guias-estado-${e}-${tema}.png`);
      continue;
    }
    for (const e of PROPUESTA) {
      const subs = e === 4 ? 'no' : 'si';
      medidas[`boceto-${e}-${tema}`] = await capturar(p, `${base}?modo=propuesta&estado=${e}&tema=${tema}&subs=${subs}`, `boceto-estado-${e}-${tema}.png`);
    }
    for (const e of HOY) {
      const subs = e === 4 ? 'no' : 'si';
      medidas[`hoy-${e}-${tema}`] = await capturar(p, `${base}?modo=hoy&estado=${e}&tema=${tema}&subs=${subs}`, `hoy-estado-${e}-${tema}.png`);
    }
  }
  console.log(JSON.stringify(medidas));
  await br.close();
})();
