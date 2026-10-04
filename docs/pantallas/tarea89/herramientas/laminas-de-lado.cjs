// Láminas del visor de lado, SEGUNDA VERSIÓN -tarea 89, 04-10-2026-. Después de capturas-de-lado.cjs:
// node laminas-de-lado.cjs. Una lámina por captura -8- con sus cotas, y la lámina resumen para aprobar.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const M = JSON.parse(fs.readFileSync(path.join(D, 'medidas-de-lado.json'), 'utf8'));
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(D, f)).toString('base64');
const CSS = `body{margin:0;background:#2a2a2a;font-family:'Source Sans 3',sans-serif;color:#eee;padding:20px;width:max-content}
h1{font-size:22px;margin:0 0 4px}.s{font-size:14px;color:#bbb;margin-bottom:12px;max-width:1100px;line-height:1.35}
.marco{position:relative}.marco img{display:block;outline:1px solid #555}
.cota{position:absolute;font:600 12px sans-serif;color:#ff5fa2;display:flex;align-items:center;justify-content:center}
.ch{height:14px;border-left:1px solid #ff5fa2;border-right:1px solid #ff5fa2}.ch::before{content:'';position:absolute;left:0;right:0;top:7px;border-top:1px dashed #ff5fa2}
.ch span,.cv span{background:#2a2a2a;padding:0 4px;position:relative}
.cv{width:14px;border-top:1px solid #ff5fa2;border-bottom:1px solid #ff5fa2}.cv::before{content:'';position:absolute;top:0;bottom:0;left:7px;border-left:1px dashed #ff5fa2}
.cv span{writing-mode:vertical-rl;transform:rotate(180deg)}
ul{font-size:14px;color:#ddd;margin:12px 0 0;padding-left:18px;max-width:1100px;line-height:1.4}`;
function texto(n) {
  const m = M[n], c = m.calculo, k = m.cajas;
  const barra = `Barra de estado arriba ${c.IN.arriba} dp; barra de tres botones a la derecha ${c.IN.derecha} dp`;
  if (c.caso === 1) return {
    titulo: `Caso 1 · toma HORIZONTAL 16:9 · ${c.W}×${c.H} dp`,
    sub: `El video a todo el alto y con el mayor ancho posible; los controles en una columna angosta al costado, con el fondo y el borde de los rieles de la tarea 82. ${barra}.`,
    items: [
      `Ancho útil: ${c.W} − ${c.IN.derecha} = ${c.util} dp. Video 16:9 a ${c.H} de alto: ${c.H} × 16/9 = ${(c.H * 16 / 9).toFixed(1)} → ${c.videoIdeal} dp.`,
      `Columna: ${c.util} − ${c.videoIdeal} = ${c.util - c.videoIdeal} dp → ${c.columna} dp. ${c.columna >= 124 ? `Cabe el riel derecho de la 82 (124) y sobran ${c.columna - 124}: van a la columna -el video ya está a todo el alto-.` : c.columna === 112 ? 'NO cabe el riel derecho de la 82 (124): la columna queda en 112, el ancho del riel izquierdo de Leer, y el video sigue a todo el alto.' : ''}`,
      `Video: ${k.video.ancho} × ${k.video.alto} dp en x ${k.video.x}. Columna: ${k.columna.ancho} × ${k.columna.alto} dp en x ${k.columna.x}. Contenido de la columna: ${m.contenidoColumna.suma} dp en ${c.H - c.IN.arriba} útiles.`,
      `Columna, de arriba abajo: X · nombre y duración · avance y play con el tiempo · Guardar | Subtítulos · Repetir | Borrar (botones de ${Math.round(k.acciones.ancho / 2)} de ancho).`
    ]
  };
  return {
    titulo: `Caso 2 · toma VERTICAL 9:16 · ${c.W}×${c.H} dp`,
    sub: `El video a todo el alto; los controles juntos en una tarjeta de ${c.panel} -el ancho de los paneles de ficha de lado, tarea 82- a su lado, sin estirarse. ${barra}.`,
    items: [
      `Video: ${c.H} × 9/16 = ${(c.H * 9 / 16).toFixed(1)} → ${c.anchoVideo} × ${c.altoVideo} dp.`,
      `Grupo video + ${c.separacion} + tarjeta ${c.panel} = ${c.grupo} dp, centrado en ${c.util} útiles: ${c.margen} dp de fondo a cada lado.`,
      `Tarjeta: ${k.panel.ancho} × ${k.panel.alto} dp, centrada en el alto bajo la barra de estado. Es la tarjeta de hoy sin el video: nombre con la X, barra de avance, Subtítulos, Guardar · Repetir · Borrar.`
    ]
  };
}
function cotas(n, esc) {
  const m = M[n], k = m.cajas; let h = '';
  const ch = (x, y, w, t) => `<div class="cota ch" style="left:${x * esc}px;top:${y}px;width:${w * esc}px"><span>${t}</span></div>`;
  const cv = (x, y, hh, t) => `<div class="cota cv" style="left:${x}px;top:${y * esc}px;height:${hh * esc}px"><span>${t}</span></div>`;
  const W = m.calculo.W;
  if (k.columna) { h += ch(k.video.x, -18, k.video.ancho, `video ${k.video.ancho}`) + ch(k.columna.x, -18, k.columna.ancho, `col ${k.columna.ancho}`) + ch(W - m.calculo.IN.derecha, -18, m.calculo.IN.derecha, `${m.calculo.IN.derecha}`); }
  else { h += ch(k.video.x, -18, k.video.ancho, `video ${k.video.ancho}`) + ch(k.panel.x, -18, k.panel.ancho, `tarjeta ${k.panel.ancho}`); }
  h += cv(W * esc + 4, k.video.y, k.video.alto, `video ${k.video.alto}`);
  if (k.panel) h += cv(W * esc + 22, k.panel.y, k.panel.alto, `${k.panel.alto}`);
  return h;
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  const nombres = Object.keys(M);
  for (const n of nombres) {
    const t = texto(n), W = M[n].calculo.W, H = M[n].calculo.H;
    const html = `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<h1>Tarea 89 · defecto 2 · visor de lado · ${t.titulo} · tema ${n.endsWith('claro') ? 'claro' : 'oscuro'} · BOCETO, sin código</h1>
<div class="s">${t.sub}</div>
<div class="marco" style="margin:22px 50px 0 0;width:${W}px"><img src="${b64(n + '.png')}" style="width:${W}px;height:${H}px">${cotas(n, 1)}</div>
<ul>${t.items.map((i) => `<li>${i}</li>`).join('')}</ul></body></html>`;
    await p.setViewport({ width: 1200, height: 200, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await (await p.$('body')).screenshot({ path: path.join(D, `lamina-${n.replace('visor-de-lado-', 'visor-de-lado-')}.png`) });
  }
  // LA LÁMINA RESUMEN: las 8 juntas, a la mitad, con las medidas que hay que aprobar.
  const celda = (n) => { const c = M[n].calculo, k = M[n].cajas; const pie = c.caso === 1 ? `video ${k.video.ancho}×${k.video.alto} · columna ${k.columna.ancho}` : `video ${k.video.ancho}×${k.video.alto} · tarjeta ${k.panel.ancho}×${k.panel.alto}`; return `<div><div class="r">${c.W}×${c.H} · ${n.endsWith('claro') ? 'claro' : 'oscuro'}</div><img src="${b64(n + '.png')}" style="width:${c.W / 2}px;height:${c.H / 2}px"><div class="r2">${pie}</div></div>`; };
  const fila = (caso) => nombres.filter((n) => n.includes(`caso${caso}`)).map(celda).join('');
  const html = `<html><head><meta charset="utf-8"><style>${CSS}.fila{display:flex;gap:18px;align-items:flex-end;margin-bottom:18px}.r{font-size:13px;color:#ddd;margin-bottom:4px}.r2{font-size:13px;color:#ff9fc8;margin-top:4px}img{display:block;outline:1px solid #555}h2{font-size:17px;margin:10px 0 6px}</style></head><body>
<h1>Tarea 89 · defecto 2 · visor de lado · RESUMEN PARA APROBAR · boceto, sin código</h1>
<div class="s">Reemplaza al boceto descartado -una toma vertical vista de lado-. El visor elige la disposición por la forma del VIDEO -videoWidth/videoHeight al cargar-, no por la del teléfono. Barra de estado 24 dp arriba y barra de tres botones 48 dp a la derecha -AOSP dimens.xml-, dibujadas encima.</div>
<h2>Caso 1 · toma HORIZONTAL 16:9 · el principal · video a todo el alto, columna angosta del ancho de los rieles de la 82 (124; 112 si no cabe)</h2><div class="fila">${fila(1)}</div>
<h2>Caso 2 · toma VERTICAL 9:16 · video a todo el alto, controles juntos en una tarjeta de 320</h2><div class="fila">${fila(2)}</div>
<ul><li>915×411: 867 útiles; 16:9 a 411 = 731; columna 136 ≥ 124 → cabe, los 12 de más van a la columna.</li><li>800×360: 752 útiles; 16:9 a 360 = 640; columna 112 &lt; 124 → no cabe el riel derecho; la columna baja a 112 -el riel izquierdo de Leer- y el video sigue a todo el alto. Con menos de 112, se achica el video.</li><li>La barra de estado queda encima del video -24 dp-; en la columna, esos 24 van en el negro del visor para que se lean sus íconos claros.</li></ul></body></html>`;
  await p.setViewport({ width: 2000, height: 200, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, 'lamina-visor-de-lado-resumen.png') });
  await br.close();
})();
