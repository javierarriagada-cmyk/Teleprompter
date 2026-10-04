// DESCARTADO -04-10-2026, 11:09, respuestas de Javier y Claude-: segunda versión del boceto. La
// reemplaza la tercera -boceto.tsx-: la barra de avance va bajo el video, sin barra de estado, con el
// recorte de 44 dp y los dos giros. Sus capturas y láminas están en descartado/segunda-version/.
// Capturas del boceto del visor de lado, SEGUNDA VERSIÓN -tarea 89, 04-10-2026-. Con vite corriendo en
// 127.0.0.1:5182: node capturas-de-lado.cjs. 2 casos x 2 temas x 2 tamaños = 8 capturas, y las medidas
// de cada una -las cajas de video, columna o tarjeta y acciones, en dp- en medidas-de-lado.json.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'descartado', 'segunda-version');
const TAMANOS = [[915, 411], [800, 360]];
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'language', { get: () => 'es-CL' }); Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] }); });
  const medidas = {};
  for (const caso of [1, 2]) for (const tema of ['oscuro', 'claro']) for (const [w, h] of TAMANOS) {
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await p.goto(`http://127.0.0.1:5182/docs/pantallas/tarea89/herramientas/boceto-descartado-2.html?caso=${caso}&tema=${tema}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    const nombre = `visor-de-lado-caso${caso}-${caso === 1 ? 'horizontal' : 'vertical'}-${w}x${h}-${tema}`;
    await p.screenshot({ path: path.join(OUT, `${nombre}.png`) });
    medidas[nombre] = await p.evaluate(() => {
      const cajas = {};
      document.querySelectorAll('[data-medida]').forEach((el) => { const r = el.getBoundingClientRect(); cajas[el.dataset.medida] = { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) }; });
      const col = document.querySelector('[data-medida="columna"]');
      let contenido = null;
      if (col) { const hijos = [...col.children].filter((c) => c.getBoundingClientRect().height > 0 && c.style.position !== 'absolute'); const a = hijos[0].getBoundingClientRect().top; const b = hijos[hijos.length - 1].getBoundingClientRect().bottom; contenido = { desde: Math.round(a), hasta: Math.round(b), suma: Math.round(hijos.reduce((s, c) => s + c.getBoundingClientRect().height, 0)) }; }
      return { calculo: window.medidas, cajas, contenidoColumna: contenido };
    });
  }
  fs.writeFileSync(path.join(OUT, 'medidas-de-lado.json'), JSON.stringify(medidas, null, 2));
  await br.close();
})();
