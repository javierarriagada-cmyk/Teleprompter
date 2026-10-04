// DESCARTADO -04-10-2026, 11:26, revisión de Claude-: tercera versión del boceto. Claude la aprobó
// con dos ajustes que hace la cuarta -boceto.tsx-: el visor de lado siempre oscuro, también en tema
// claro, y los rótulos de la columna de 12 como mínimo con toque de 48. Sus capturas, láminas y
// medidas-de-lado.json están en descartado/tercera-version/.
// Láminas del visor de lado, TERCERA VERSIÓN -tarea 89, 04-10-2026, 11:09-. Después de
// capturas-de-lado.cjs: node laminas-de-lado.cjs. Una lámina por captura -24- con sus cotas, y la resumen.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..', 'descartado', 'tercera-version');
const M = JSON.parse(fs.readFileSync(path.join(D, 'medidas-de-lado.json'), 'utf8'));
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(D, f)).toString('base64');
const CSS = `body{margin:0;background:#2a2a2a;font-family:'Source Sans 3',sans-serif;color:#eee;padding:20px;width:max-content}
h1{font-size:21px;margin:0 0 4px}.s{font-size:14px;color:#bbb;margin-bottom:12px;max-width:1100px;line-height:1.35}
.marco{position:relative}.marco img{display:block;outline:1px solid #555}
.cota{position:absolute;font:600 12px sans-serif;color:#ff5fa2;display:flex;align-items:center;justify-content:center}
.ch{height:14px;border-left:1px solid #ff5fa2;border-right:1px solid #ff5fa2}.ch::before{content:'';position:absolute;left:0;right:0;top:7px;border-top:1px dashed #ff5fa2}
.ch span,.cv span{background:#2a2a2a;padding:0 3px;position:relative;white-space:nowrap}
.cv{width:14px;border-top:1px solid #ff5fa2;border-bottom:1px solid #ff5fa2}.cv::before{content:'';position:absolute;top:0;bottom:0;left:7px;border-left:1px dashed #ff5fa2}
.cv span{writing-mode:vertical-rl;transform:rotate(180deg)}
ul{font-size:14px;color:#ddd;margin:12px 0 0;padding-left:18px;max-width:1100px;line-height:1.4}`;
const lado = (c) => c.giro === 90 ? 'recorte 44 a la izquierda, barra de tres botones 48 a la derecha' : 'barra de tres botones 48 a la izquierda, recorte 44 a la derecha';
const ESTADO = { normal: '', subtitulos: ' · Subtítulos abierto', guardada: ' · toma ya guardada' };
function texto(n) {
  const m = M[n], c = m.calculo, k = m.cajas;
  const base = `Giro ${c.giro}: ${lado(c)}. Sin barra de estado -SystemBars.hide StatusBar-.`;
  if (c.caso === 1) {
    const items = [
      `Ancho útil: ${c.W} − 44 − 48 = ${c.util} dp. Alto del video: ${c.H} − ${c.altoBarra} de la barra de avance = ${c.altoVideo} dp.`,
      `Video 16:9: ${c.altoVideo} × 16/9 = ${(c.altoVideo * 16 / 9).toFixed(1)} → ${c.anchoVideo} × ${c.altoVideo} dp, con la barra de avance de ${k['barra-avance'].ancho} × ${c.altoBarra} debajo.`,
      `Columna: ${c.util} − ${c.anchoVideo} = ${c.columna} dp a todo el alto -${c.columna >= 124 ? `cabe el riel de 124 con ${c.columna - 124} de más` : 'no cabe el riel de 124'}; nunca baja de 112-.`
    ];
    if (c.estado === 'subtitulos') items.push(`Panel de Subtítulos: ${k.panelSubtitulos.ancho} × ${k.panelSubtitulos.alto} dp, a 8 de la columna, a la altura de su botón, sobre el video. Tocar una opción la elige y lo cierra -como hoy-.`);
    else if (c.estado === 'guardada') items.push('Toma guardada: Compartir y Borrar, solo con el símbolo y sin selector de subtítulos, como hoy. Las dos filas se reparten la columna.');
    else items.push(`Columna: nombre y duración con la X; Guardar, Subtítulos -el estilo elegido-, Repetir y Borrar, una fila cada uno -${m.altosAcciones.join(', ')} dp de alto-.`);
    return { titulo: `Caso 1 · toma HORIZONTAL 16:9 · giro ${c.giro}${ESTADO[c.estado]} · ${c.W}×${c.H} dp`, sub: `El video a todo el alto que deja la barra de avance, que va debajo a todo su ancho; los controles en una columna al costado. ${base}`, items };
  }
  return {
    titulo: `Caso 2 · toma VERTICAL 9:16 · giro ${c.giro} · ${c.W}×${c.H} dp`,
    sub: `El video a todo el alto; la tarjeta de controles de ${c.panel} a su lado, sin estirarse, el grupo centrado sobre el fondo de la app. ${base}`,
    items: [
      `Video: ${c.H} × 9/16 = ${(c.H * 9 / 16).toFixed(1)} → ${c.anchoVideo} × ${c.altoVideo} dp.`,
      `Grupo: ${c.anchoVideo} + ${c.separacion} + ${c.panel} = ${c.grupo} dp, centrado en ${c.util} útiles: ${c.margen} dp de fondo a cada lado.`,
      `Tarjeta: ${k.panel.ancho} × ${k.panel.alto} dp, centrada en el alto -nombre con la X, barra de avance, Subtítulos, Guardar · Repetir · Borrar-.`
    ]
  };
}
function cotas(n) {
  const m = M[n], k = m.cajas, c = m.calculo; let h = '';
  const ch = (x, w, t) => `<div class="cota ch" style="left:${x}px;top:-18px;width:${w}px"><span>${t}</span></div>`;
  const cv = (x, y, hh, t) => `<div class="cota cv" style="left:${x}px;top:${y}px;height:${hh}px"><span>${t}</span></div>`;
  h += ch(k.recorte.x, 44, '44');
  h += ch(c.giro === 90 ? c.W - 48 : 0, 48, '48');
  h += ch(k.video.x, k.video.ancho, `video ${k.video.ancho}`);
  if (k.columna) h += ch(k.columna.x, k.columna.ancho, `col ${k.columna.ancho}`);
  if (k.panel) h += ch(k.panel.x, k.panel.ancho, `tarjeta ${k.panel.ancho}`);
  h += cv(c.W + 4, k.video.y, k.video.alto, `video ${k.video.alto}`);
  if (k['barra-avance'] && k.columna) h += cv(c.W + 4, k['barra-avance'].y, k['barra-avance'].alto, `${k['barra-avance'].alto}`);
  if (k.panel) h += cv(c.W + 22, k.panel.y, k.panel.alto, `${k.panel.alto}`);
  return h;
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  const nombres = Object.keys(M);
  for (const n of nombres) {
    const t = texto(n), W = M[n].calculo.W, H = M[n].calculo.H;
    const html = `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<h1>Tarea 89 · visor de lado · ${t.titulo} · tema ${n.endsWith('claro') ? 'claro' : 'oscuro'} · BOCETO, sin código</h1>
<div class="s">${t.sub}</div>
<div class="marco" style="margin:22px 50px 0 0;width:${W}px"><img src="${b64(n + '.png')}" style="width:${W}px;height:${H}px">${cotas(n)}</div>
<ul>${t.items.map((i) => `<li>${i}</li>`).join('')}</ul></body></html>`;
    await p.setViewport({ width: 1200, height: 200, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await (await p.$('body')).screenshot({ path: path.join(D, `lamina-${n}.png`) });
  }
  // LA RESUMEN: giro 90 en los dos temas y tamaños para los dos casos, los dos estados del caso 1 a 915,
  // y el giro 270 a 915 oscuro, a la mitad. Todas las demás están en sus láminas.
  const celda = (n) => { const c = M[n].calculo, k = M[n].cajas; const pie = c.caso === 1 ? `video ${k.video.ancho}×${k.video.alto} + barra ${c.altoBarra} · columna ${k.columna.ancho}` : `video ${k.video.ancho}×${k.video.alto} · tarjeta ${k.panel.ancho}×${k.panel.alto} · ${c.margen} a cada lado`; return `<div><div class="r">${c.W}×${c.H} · giro ${c.giro}${ESTADO[c.estado]} · ${n.endsWith('claro') ? 'claro' : 'oscuro'}</div><img src="${b64(n + '.png')}" style="width:${c.W / 2}px;height:${c.H / 2}px"><div class="r2">${pie}</div></div>`; };
  const sel = (f) => nombres.filter(f).map(celda).join('');
  const html = `<html><head><meta charset="utf-8"><style>${CSS}.fila{display:flex;gap:16px;align-items:flex-end;margin-bottom:16px}.r{font-size:13px;color:#ddd;margin-bottom:4px}.r2{font-size:13px;color:#ff9fc8;margin-top:4px}img{display:block;outline:1px solid #555}h2{font-size:17px;margin:10px 0 6px}</style></head><body>
<h1>Tarea 89 · visor de lado · RESUMEN PARA REVISAR · tercera versión del boceto, sin código</h1>
<div class="s" style="max-width:1900px">La disposición la elige la forma del VIDEO -videoWidth/videoHeight-. Sin barra de estado -SystemBars.hide({ bar: StatusBar }) de @capacitor/core 8, que Sigo ya usa-. Recorte del moto g86: 125 px = 44 dp. Giro 90: recorte a la izquierda y barra de tres botones -48- a la derecha; giro 270: al revés. La barra de avance -.barra-visor, 48- va bajo el video.</div>
<h2>Caso 1 · toma HORIZONTAL 16:9 · giro 90</h2><div class="fila">${sel((n) => n.includes('caso1') && n.includes('giro90-') && !n.includes('subtitulos') && !n.includes('guardada'))}</div>
<h2>Caso 1 · giro 270 · Subtítulos abierto · toma guardada</h2><div class="fila">${sel((n) => n.includes('caso1') && ((n.includes('giro270') && n.includes('915x411')) || (n.includes('915x411') && (n.includes('subtitulos') || n.includes('guardada')))) && (n.endsWith('oscuro') || n.includes('giro270')) )}</div>
<h2>Caso 2 · toma VERTICAL 9:16 · giro 90 y giro 270</h2><div class="fila">${sel((n) => n.includes('caso2') && (n.includes('giro90') || n.includes('915x411-oscuro')))}</div>
<ul><li>915×411: útil 915 − 44 − 48 = 823; video 363 de alto -411 − 48- → 645 × 363; columna 823 − 645 = 178 -cabe el riel de 124 con 54 de más-.</li><li>800×360: útil 708; video 312 de alto -360 − 48- → 555 × 312; columna 708 − 555 = 153 -cabe con 29 de más-.</li><li>Los dos giros dan las mismas medidas, en espejo: el recorte y la barra suman 92 en los dos. La columna nunca baja de 112.</li><li>Caso 2: video 231 × 411 y 203 × 360; tarjeta 320 × 236; 128 y 85 de fondo a cada lado.</li></ul></body></html>`;
  await p.setViewport({ width: 2000, height: 200, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, 'lamina-visor-de-lado-resumen.png') });
  await br.close();
})();
