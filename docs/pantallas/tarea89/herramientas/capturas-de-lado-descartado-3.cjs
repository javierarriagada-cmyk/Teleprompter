// DESCARTADO -04-10-2026, 11:26, revisión de Claude-: tercera versión del boceto. Claude la aprobó
// con dos ajustes que hace la cuarta -boceto.tsx-: el visor de lado siempre oscuro, también en tema
// claro, y los rótulos de la columna de 12 como mínimo con toque de 48. Sus capturas, láminas y
// medidas-de-lado.json están en descartado/tercera-version/.
// Capturas del boceto del visor de lado, TERCERA VERSIÓN -tarea 89, 04-10-2026, 11:09-. Con vite en
// 127.0.0.1:5182: node capturas-de-lado.cjs. Caso 1 y caso 2 en los dos giros, los dos temas y los dos
// tamaños -16-, y el caso 1 con Subtítulos abierto y con la toma guardada, giro 90 -8-. Las cajas
// medidas en Chrome van a medidas-de-lado.json.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'descartado', 'tercera-version');
const TAMANOS = [[915, 411], [800, 360]];
const VISTAS = [];
for (const caso of [1, 2]) for (const giro of [90, 270]) VISTAS.push({ caso, giro, estado: 'normal' });
for (const estado of ['subtitulos', 'guardada']) VISTAS.push({ caso: 1, giro: 90, estado });
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'language', { get: () => 'es-CL' }); Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] }); });
  const medidas = {};
  for (const v of VISTAS) for (const tema of ['oscuro', 'claro']) for (const [w, h] of TAMANOS) {
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await p.goto(`http://127.0.0.1:5182/docs/pantallas/tarea89/herramientas/boceto-descartado-3.html?caso=${v.caso}&giro=${v.giro}&estado=${v.estado}&tema=${tema}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    const nombre = `visor-de-lado-caso${v.caso}-${v.caso === 1 ? 'horizontal' : 'vertical'}-giro${v.giro}${v.estado === 'normal' ? '' : '-' + v.estado}-${w}x${h}-${tema}`;
    await p.screenshot({ path: path.join(OUT, `${nombre}.png`) });
    medidas[nombre] = await p.evaluate(() => {
      const cajas = {};
      document.querySelectorAll('[data-medida]').forEach((el) => { const r = el.getBoundingClientRect(); cajas[el.dataset.medida] = { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) }; });
      const op = document.querySelector('.opciones-subtitulos');
      if (op) { const r = op.getBoundingClientRect(); cajas.panelSubtitulos = { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) }; }
      const acc = document.querySelector('[data-medida="acciones"]');
      const hijos = acc ? [...acc.children].map((c) => Math.round(c.getBoundingClientRect().height)) : null;
      return { calculo: window.medidas, cajas, altosAcciones: hijos };
    });
  }
  fs.writeFileSync(path.join(OUT, 'medidas-de-lado.json'), JSON.stringify(medidas, null, 2));
  await br.close();
})();
