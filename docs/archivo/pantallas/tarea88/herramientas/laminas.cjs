// Las láminas de la tarea 88 -docs/tarea88.txt, sección 0-. Con el servidor arriba -ver
// vite.config.mjs-: node docs/pantallas/tarea88/herramientas/laminas.cjs
// 412×915 dp de pie y 915×412 de lado -moto g86-, a 2 px por dp.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:5188/docs/pantallas/tarea88/herramientas/pagina.html';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => { localStorage.clear(); });
  const hechas = [];
  // El panel de la cámara en LISTO, con la fila nueva.
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  for (const tema of ['claro', 'oscuro']) for (const [motivo, nombre] of [['ninguno', 'frontal'], ['soloFrontal', 'trasera'], ['noDisponible', 'no-disponible']]) {
    await p.goto(`${BASE}?vista=panel&motivo=${motivo}&tema=${tema}`, { waitUntil: 'networkidle0' });
    await espera(300);
    await p.click('[data-testid="ficha-camara"]');
    await espera(500);
    const fila = await p.$eval('[data-testid="fila-gestos"]', (f) => ({ texto: f.textContent, motivo: f.getAttribute('data-motivo'), marcado: f.querySelector('[role="switch"]').getAttribute('aria-checked'), deshabilitado: f.querySelector('[role="switch"]').disabled }));
    const archivo = `panel-camara-${nombre}-${tema}.png`;
    await p.screenshot({ path: path.join(OUT, archivo) });
    hechas.push([archivo, fila]);
  }
  // Grabando en pausa: el punto y el símbolo grande, de pie y de lado.
  for (const [lado, ancho, alto, nombre] of [['0', 412, 915, 'de-pie'], ['1', 915, 412, 'de-lado']]) for (const tema of ['oscuro']) {
    await p.setViewport({ width: ancho, height: alto, deviceScaleFactor: 2 });
    await p.goto(`${BASE}?vista=pausa&lado=${lado}&tema=${tema}`, { waitUntil: 'networkidle0' });
    // El punto parpadea -2 s por vuelta-: se espera a que esté encendido.
    await p.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-testid="punto-grabando"]')).opacity) > 0.97, { polling: 20, timeout: 5000 });
    const punto = await p.$eval('[data-testid="punto-grabando"]', (e) => ({ clase: e.className, opacidad: getComputedStyle(e).opacity }));
    const simbolo = await p.$eval('[data-testid="simbolo-pausa-grande"]', (e) => { const r = e.getBoundingClientRect(); return { ancho: r.width, alto: r.height, x: r.x, y: r.y }; });
    const archivo = `pausa-punto-y-simbolo-${nombre}.png`;
    await p.screenshot({ path: path.join(OUT, archivo) });
    hechas.push([archivo, { punto, simbolo }]);
  }
  for (const [a, d] of hechas) console.log(a, JSON.stringify(d));
  await br.close();
})();
