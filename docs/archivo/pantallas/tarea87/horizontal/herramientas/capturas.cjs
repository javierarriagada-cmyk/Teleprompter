// Las capturas de la toma HORIZONTAL -tarea 87, subtítulos en horizontal, 04-10-2026-: node capturas.cjs antes|despues
// Con el vite de la app de la 87 en 5183 -../../implementacion/herramientas/vite.app.config.mjs- servido
// desde la rama en el estado que se quiere capturar -antes: d9e9c83; después: esta rama- y los videos
// del boceto hechos -sh ../../herramientas/videos.sh-. Saca, en la toma horizontal:
//   {etapa}-pie-normal.png y {etapa}-pie-mw.png       el visor de pie, 412×915;
//   {etapa}-lado-normal.png y {etapa}-lado-mw.png     el visor de lado, caso 1, 915×411;
//   {etapa}-cuadro-normal.png y {etapa}-cuadro-mw.png el cuadro exportado de 1920×1080, simulado -cuadro.tsx-.
// El renglón «MW» es de 32 letras antes y de 47 después -lo más largo que deja cada uno-: en el visor se
// escribe en la capa encima del subtítulo de verdad, con el video quieto, para medir dónde queda. Las
// medidas van a medidas-{etapa}.json.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
// despues-mw -04-10-2026, el visor achica el renglón ancho-: rehace solo las dos vistas «MW» del visor
// del después, con un subtítulo de verdad -?mw=47, archivosNativosApp.ts- en vez de escribirlo encima:
// así se ve el ajuste de la letra.
const soloMW = process.argv[2] === 'despues-mw';
const etapa = process.argv[2] === 'despues' || soloMW ? 'despues' : 'antes';
const N = etapa === 'despues' ? 47 : 32;
const OUT = path.join(__dirname, '..');
// PUERTO: 5183 por omisión; para el antes, el vite de un worktree en d9e9c83.
const BASE = `http://127.0.0.1:${process.env.PUERTO || 5183}/docs/pantallas`;
const MW = 'MW'.repeat(30).slice(0, N);

// En el visor: la letra, el ancho de cada renglón -con canvas, la misma letra- contra el disponible
// -el 88 % de la imagen-, y en cuántas líneas lo partió el navegador.
async function medirVisor(p) {
  return p.evaluate(() => {
    const capa = document.querySelector('.capa-subtitulos');
    const sub = capa && capa.querySelector('.subtitulo');
    if (!sub) return null;
    const cs = getComputedStyle(capa);
    const fs = parseFloat(cs.fontSize);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `700 ${fs}px Roboto`;
    const renglones = [...sub.querySelectorAll('.subtitulo-renglon')].map((r) => {
      const rg = document.createRange(); rg.selectNodeContents(r);
      const tops = new Set([...rg.getClientRects()].map((x) => Math.round(x.top)));
      return { texto: r.textContent, letras: r.textContent.length, ancho: +ctx.measureText(r.textContent).width.toFixed(1), lineas: tops.size };
    });
    const disponible = +(capa.getBoundingClientRect().width * 0.88).toFixed(1);
    return { imagen: { ancho: +capa.getBoundingClientRect().width.toFixed(1), alto: +capa.getBoundingClientRect().height.toFixed(1) }, letra: +fs.toFixed(2), disponible, renglones, cabe: renglones.every((r) => r.ancho <= disponible + 0.5 && r.lineas === 1), abajo: +(capa.getBoundingClientRect().bottom - sub.getBoundingClientRect().bottom).toFixed(1) };
  });
}
async function ponerMW(p) {
  await p.evaluate((MW) => {
    const v = document.querySelector('video'); if (v) v.pause();
    const sub = document.querySelector('.capa-subtitulos .subtitulo');
    sub.innerHTML = `<div class="subtitulo-renglon"><span class="subtitulo-palabra" data-estado="por-decir">${MW}</span></div>`;
  }, MW);
  await new Promise((r) => setTimeout(r, 150));
}
async function seek(p, t) {
  await p.evaluate(async (t) => {
    const v = document.querySelector('video');
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.pause(); v.currentTime = t;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  }, t);
  await new Promise((r) => setTimeout(r, 500));
}

// Busca, avanzando de a 0,25 s, la hora en que el subtítulo de la capa trae «MWMW».
async function buscarMW(p) {
  for (let t = 0.5; t < 20; t += 0.25) {
    await p.evaluate(async (t) => { const v = document.querySelector('video'); v.pause(); v.currentTime = t; await new Promise((r) => v.addEventListener('seeked', r, { once: true })); }, t);
    await new Promise((r) => setTimeout(r, 80));
    if (await p.evaluate(() => /MWMW/.test((document.querySelector('.capa-subtitulos') || {}).textContent || ''))) { await new Promise((r) => setTimeout(r, 300)); return t; }
  }
  return null;
}
async function soloLasDeMW() {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  const archivo = path.join(__dirname, 'medidas-despues.json');
  const medidas = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  await p.evaluateOnNewDocument(() => { localStorage.clear(); localStorage.setItem('sigo_subtitulos_estilo', 'amarillo'); });
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await p.goto(`${BASE}/tarea87/implementacion/herramientas/app.html?estado=5&tema=oscuro&nav=botones&subs=si&mw=47`, { waitUntil: 'networkidle0' });
  await seek(p, 0.5);
  const t1 = await buscarMW(p);
  medidas.pieMW = { ...(await medirVisor(p)), hora: t1, letraBase: await p.evaluate(() => +parseFloat(document.querySelector('.capa-subtitulos').dataset.letraBase).toFixed(2)) };
  await p.screenshot({ path: path.join(OUT, 'despues-pie-mw.png') });
  await p.setViewport({ width: 915, height: 411, deviceScaleFactor: 2 });
  await p.goto(`${BASE}/tarea90/herramientas/app-real.html?caso=1&giro=90&tema=oscuro&subs=si&mw=47`, { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => window.listo === true, { timeout: 10000 }).catch(() => {});
  const t2 = await buscarMW(p);
  medidas.ladoMW = { ...(await medirVisor(p)), hora: t2, letraBase: await p.evaluate(() => +parseFloat(document.querySelector('.capa-subtitulos').dataset.letraBase).toFixed(2)) };
  await p.screenshot({ path: path.join(OUT, 'despues-lado-mw.png') });
  fs.writeFileSync(archivo, JSON.stringify(medidas, null, 1));
  console.log(JSON.stringify({ pieMW: medidas.pieMW, ladoMW: medidas.ladoMW }, null, 1));
  await br.close();
}

(async () => {
  if (soloMW) return soloLasDeMW();
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await br.newPage();
  const medidas = { etapa, letrasMW: N };
  await p.evaluateOnNewDocument(() => { localStorage.clear(); localStorage.setItem('sigo_subtitulos_estilo', 'amarillo'); });
  // De pie: el estado 5 de las capturas de la 87 -la toma horizontal-.
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await p.goto(`${BASE}/tarea87/implementacion/herramientas/app.html?estado=5&tema=oscuro&nav=botones&subs=si`, { waitUntil: 'networkidle0' });
  await seek(p, 3.5);
  medidas.pieNormal = await medirVisor(p);
  await p.screenshot({ path: path.join(OUT, `${etapa}-pie-normal.png`) });
  await ponerMW(p);
  medidas.pieMW = await medirVisor(p);
  await p.screenshot({ path: path.join(OUT, `${etapa}-pie-mw.png`) });
  // De lado, caso 1.
  await p.setViewport({ width: 915, height: 411, deviceScaleFactor: 2 });
  await p.goto(`${BASE}/tarea90/herramientas/app-real.html?caso=1&giro=90&tema=oscuro&subs=si`, { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => window.listo === true, { timeout: 10000 }).catch(() => {});
  await seek(p, 3.5);
  medidas.ladoNormal = await medirVisor(p);
  await p.screenshot({ path: path.join(OUT, `${etapa}-lado-normal.png`) });
  await ponerMW(p);
  medidas.ladoMW = await medirVisor(p);
  await p.screenshot({ path: path.join(OUT, `${etapa}-lado-mw.png`) });
  // El cuadro exportado, 1920×1080, y la guardiana vertical 1080×1920.
  for (const [n, qs] of [['cuadro-normal', 'w=1920&h=1080&ms=3500'], ['cuadro-mw', 'w=1920&h=1080&mw=1'], ['cuadro-vertical', 'w=1080&h=1920&ms=3500'], ['cuadro-720', 'w=1280&h=720&ms=3500']]) {
    const [w, h] = qs.match(/w=(\d+)&h=(\d+)/).slice(1).map(Number);
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.goto(`${BASE}/tarea87/horizontal/herramientas/cuadro.html?${qs}`, { waitUntil: 'networkidle0' });
    await p.waitForFunction(() => window.listo === true, { timeout: 10000 });
    medidas[n] = await p.evaluate(() => window.medidas);
    if (n === 'cuadro-normal' || n === 'cuadro-mw') await (await p.$('canvas')).screenshot({ path: path.join(OUT, `${etapa}-${n}.png`) });
  }
  fs.writeFileSync(path.join(__dirname, `medidas-${etapa}.json`), JSON.stringify(medidas, null, 1));
  console.log(JSON.stringify(medidas, null, 1));
  await br.close();
})();
