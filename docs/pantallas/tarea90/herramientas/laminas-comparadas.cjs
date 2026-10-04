// LAS LÁMINAS «BOCETO | APP REAL» -tarea 90, 04-10-2026-. Después de capturas-app-real.cjs:
//   node docs/pantallas/tarea90/herramientas/laminas-comparadas.cjs
// Una lámina por vista, tema y tamaño -32-: a la izquierda el boceto aprobado con la barra de 52, a la
// derecha la app real, y debajo la tabla de medidas de las dos con la diferencia. Una medida de la app que
// queda POR DEBAJO del boceto -más de 1 dp- sale en rojo: el boceto es el piso. Y la resumen.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const M = JSON.parse(fs.readFileSync(path.join(D, 'medidas-comparadas.json'), 'utf8'));
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const CSS = `body{margin:0;background:#2a2a2a;font-family:'Source Sans 3',sans-serif;color:#eee;padding:20px;width:max-content}
h1{font-size:20px;margin:0 0 6px}.s{font-size:14px;color:#bbb;margin-bottom:10px;max-width:1880px}
.par{display:flex;gap:24px}.par h2{font-size:15px;margin:0 0 4px;color:#ddd}img{display:block;outline:1px solid #555}
table{border-collapse:collapse;font-size:13px;margin-top:12px}td,th{border:1px solid #555;padding:3px 8px;text-align:left}th{background:#333}
.bajo{color:#ff6b6b;font-weight:700}.igual{color:#8fd18f}.mas{color:#ffd27f}`;
const ESTADO = { normal: '', subtitulos: ' · Subtítulos abierto', guardada: ' · toma guardada' };
const fmt = (c) => (c ? `${c.ancho}×${c.alto} en ${c.x},${c.y}` : '—');
// Lo que es piso: tamaños de toque, de letra, el video y la columna. Una posición distinta no es «menos».
function filasTabla(b, a) {
  const f = [];
  const comparar = (nombre, cb, ca, piso) => {
    if (!cb && !ca) return;
    let clase = 'igual', nota = 'igual';
    if (cb && ca) {
      const dAn = ca.ancho - cb.ancho, dAl = ca.alto - cb.alto, dX = ca.x - cb.x, dY = ca.y - cb.y;
      if (piso && (dAn < -1 || dAl < -1)) { clase = 'bajo'; nota = `POR DEBAJO ${dAn}×${dAl}`; }
      else if (Math.abs(dAn) > 1 || Math.abs(dAl) > 1) { clase = 'mas'; nota = `${dAn > 0 ? '+' : ''}${dAn}×${dAl > 0 ? '+' : ''}${dAl}`; }
      else if (Math.abs(dX) > 1 || Math.abs(dY) > 1) { clase = 'mas'; nota = `corrida ${dX},${dY}`; }
    } else { clase = 'bajo'; nota = ca ? 'no está en el boceto' : 'FALTA en la app'; }
    f.push(`<tr><td>${nombre}</td><td>${fmt(cb)}</td><td>${fmt(ca)}</td><td class="${clase}">${nota}</td></tr>`);
  };
  comparar('video', b.video, a.video, true);
  comparar('barra de reproducción', b.barra, a.barra, true);
  comparar('columna', b.columna, a.columna, true);
  comparar('tarjeta', b.tarjeta, a.tarjeta, true);
  comparar('panel de Subtítulos', b.panelSubtitulos, a.panelSubtitulos, true);
  comparar('X', b.cerrar, a.cerrar, true);
  comparar('botón de la barra', b.boton, a.boton, true);
  comparar('avance', b.avance, a.avance, true);
  const fb = b.filas.join(', '), fa = a.filas.join(', ');
  const minA = Math.min(...a.filas), bajoFilas = a.filas.some((h, i) => b.filas[i] !== undefined && h < b.filas[i] - 1) || minA < 48;
  f.push(`<tr><td>filas de acción</td><td>${fb}</td><td>${fa}</td><td class="${bajoFilas ? 'bajo' : fb === fa ? 'igual' : 'mas'}">${bajoFilas ? 'POR DEBAJO' : fb === fa ? 'igual' : 'distinto, ≥ 48'}</td></tr>`);
  const rb = b.rotulos.map((r) => `${r.t} ${r.px}`).join(', ') || '—', ra = a.rotulos.map((r) => `${r.t} ${r.px}`).join(', ') || '—';
  const bajoRot = a.rotulos.some((r) => r.px < 12);
  f.push(`<tr><td>rótulos</td><td>${rb}</td><td>${ra}</td><td class="${bajoRot ? 'bajo' : rb === ra ? 'igual' : 'mas'}">${bajoRot ? 'POR DEBAJO de 12' : rb === ra ? 'igual' : 'distinto, ≥ 12'}</td></tr>`);
  f.push(`<tr><td>tema del visor</td><td>oscuro</td><td>data-tema=${a.tema}, controles ${a.fondoControles}</td><td class="${a.tema === 'oscuro' ? 'igual' : 'bajo'}">${a.tema === 'oscuro' ? 'oscuro' : 'NO OSCURO'}</td></tr>`);
  return f.join('');
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  const nombres = Object.keys(M);
  const resumen = [];
  for (const n of nombres) {
    const { vista: v, boceto: b, app: a } = M[n];
    const t = `Caso ${v.caso} · toma ${v.caso === 1 ? 'HORIZONTAL 16:9' : 'VERTICAL 9:16'} · giro ${v.giro}${ESTADO[v.estado]} · ${v.w}×${v.h} · app en ${v.tema}`;
    const html = `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<h1>Tarea 90 · visor de lado · ${t}</h1>
<div class="s">Izquierda: el boceto aprobado -PR #67, cuarta versión- con la barra de reproducción de 52. Derecha: la app real -ReproductorGrabacion.tsx en Chrome, con los bordes del moto g86 escritos como los escribe Capacitor-. Debajo, las cajas medidas en las dos; en rojo lo que la app deja por debajo del boceto.</div>
<div class="par"><div><h2>BOCETO</h2><img src="${b64(path.join(D, 'boceto', n + '.png'))}" style="width:${v.w}px;height:${v.h}px"></div><div><h2>APP REAL</h2><img src="${b64(path.join(D, 'app-real', n + '.png'))}" style="width:${v.w}px;height:${v.h}px"></div></div>
<table><tr><th>medida</th><th>boceto</th><th>app real</th><th>diferencia</th></tr>${filasTabla(b, a)}</table></body></html>`;
    await p.setViewport({ width: 1900, height: 200, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    const bajo = html.includes('class="bajo"');
    await (await p.$('body')).screenshot({ path: path.join(D, `lamina-comparada-${n.replace('visor-de-lado-', '')}.png`) });
    resumen.push({ n, v, b, a, bajo });
  }
  const sel = resumen.filter((r) => r.v.tema === 'claro' || (r.v.estado === 'normal' && r.v.w === 915));
  const celdas = sel.map((r) => `<div class="c"><div class="r">${r.v.caso === 1 ? 'Caso 1' : 'Caso 2'} · giro ${r.v.giro}${ESTADO[r.v.estado]} · ${r.v.w}×${r.v.h} · app en ${r.v.tema}${r.bajo ? ' · <span class="bajo">POR DEBAJO</span>' : ''}</div><div class="par" style="gap:6px"><img src="${b64(path.join(D, 'boceto', r.n + '.png'))}" style="width:${r.v.w / 2.6}px;height:${r.v.h / 2.6}px"><img src="${b64(path.join(D, 'app-real', r.n + '.png'))}" style="width:${r.v.w / 2.6}px;height:${r.v.h / 2.6}px"></div><div class="r2">${r.a.video ? `video ${r.a.video.ancho}×${r.a.video.alto}` : ''}${r.a.columna ? ` · columna ${r.a.columna.ancho}` : ''}${r.a.tarjeta ? ` · tarjeta ${r.a.tarjeta.ancho}×${r.a.tarjeta.alto}` : ''} · filas ${r.a.filas.join(',')}</div></div>`).join('');
  const nBajo = resumen.filter((r) => r.bajo).length;
  const html = `<html><head><meta charset="utf-8"><style>${CSS}.g{display:grid;grid-template-columns:repeat(3,auto);gap:14px 22px}.r{font-size:13px;color:#ddd;margin-bottom:3px}.r2{font-size:12px;color:#ff9fc8;margin-top:3px}</style></head><body>
<h1>Tarea 90 · visor de lado · RESUMEN · boceto aprobado | app real</h1>
<div class="s">En cada par: a la izquierda el boceto -PR #67 con la barra de 52-, a la derecha la app real. Todas las vistas con la app en claro -el visor sale oscuro igual- y las de 915×411 en oscuro. ${nBajo === 0 ? 'Ninguna medida de la app queda por debajo del boceto -${resumen.length} de ${resumen.length} láminas-.' : `<span class="bajo">${nBajo} láminas con medidas por debajo del boceto.</span>`} Caso 1: video 638×359 a 915 y 548×308 a 800, barra de 52, columna 185 y 160. Caso 2: video 231×411 y 203×360, tarjeta 320 de ancho, 128 y 85 de fondo a cada lado.</div>
<div class="g">${celdas}</div></body></html>`;
  await p.setViewport({ width: 1900, height: 200, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, 'lamina-comparada-resumen.png') });
  console.log('láminas con medidas por debajo:', resumen.filter((r) => r.bajo).map((r) => r.n));
  await br.close();
})();
