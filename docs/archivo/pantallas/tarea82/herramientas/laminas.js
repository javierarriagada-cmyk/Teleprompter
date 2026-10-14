// Láminas boceto | app real -tarea 82-. node laminas.js
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const B = '/workspace/teleprompter-review/bocetos/';
const OUT = '/workspace/t82shots/laminas/';
fs.mkdirSync(OUT, { recursive: true });
const ESTADOS = [
  ['leer-listo', 'tel-horizontal-listo', 'Leer · LISTO'],
  ['leer-leyendo', 'tel-horizontal-lectura', 'Leer · leyendo, sin controles'],
  ['leer-leyendo-controles', 'tel-horizontal-lectura-controles', 'Leer · leyendo, con controles'],
  ['grabar-listo-detras', 'tel-horizontal-grabar-listo-camara-fondo', 'Grabar · LISTO · cámara detrás'],
  ['grabar-listo-recuadro', 'tel-horizontal-grabar-listo-recuadro', 'Grabar · LISTO · recuadro'],
  ['grabar-grabando-detras', 'tel-horizontal-grabar-grabando-camara-fondo', 'Grabar · grabando · cámara detrás, sin controles'],
  ['grabar-grabando-detras-controles', 'tel-horizontal-grabar-grabando-camara-fondo-controles', 'Grabar · grabando · cámara detrás, con controles'],
  ['grabar-grabando-recuadro', 'tel-horizontal-grabar-grabando-recuadro', 'Grabar · grabando · recuadro, sin controles'],
  ['grabar-grabando-recuadro-controles', 'tel-horizontal-grabar-grabando-recuadro-controles', 'Grabar · grabando · recuadro, con controles'],
  ['grabar-pausa-tacho', 'tel-horizontal-grabar-grabando-camara-fondo-controles', 'Grabar · en pausa con el tacho · cámara detrás (no hay boceto de la pausa: se compara con «con controles»)'],
];
const tam = (f) => { try { const m = fs.readFileSync(B + f + '.html', 'utf8').match(/name="tam" content="(\d+)x(\d+)"/); return m ? `${m[1]}x${m[2]}` : null; } catch (e) { return null; } };
function boceto(base, tema, size) {
  const sx = tema === 'claro' ? '-claro' : '';
  for (const n of [`${base}-${size}${sx}`, `${base}${sx}`]) if (fs.existsSync(B + n + '.png') && (tam(n) === size || n === `${base}${sx}`)) return { f: B + n + '.png', size: tam(n) };
  return null;
}
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  for (const [id, base, titulo] of ESTADOS) for (const tema of ['oscuro', 'claro']) {
    let filas = '';
    for (const size of ['800x360', '844x390']) {
      const app = `/workspace/t82shots/app/${id}-${size}-${tema}.png`;
      const bo = boceto(base, tema, size);
      if (!fs.existsSync(app) || !bo) { console.log('falta', id, size, tema, !!bo); continue; }
      const [w, h] = size.split('x').map(Number);
      const [bw, bh] = bo.size.split('x').map(Number);
      filas += `<div class="fila"><div class="c"><div class="r">Boceto aprobado · ${bo.size.replace('x', '×')}${bo.size !== size ? ' (el boceto de este estado se dibujó solo a ese tamaño)' : ''}</div><img src="${b64(bo.f)}" style="width:${bw}px;height:${bh}px"></div><div class="c"><div class="r">App real · Chrome + vite · ${size.replace('x', '×')}</div><img src="${b64(app)}" style="width:${w}px;height:${h}px"></div></div>`;
    }
    const html = `<html><head><meta charset="utf-8"><style>body{margin:0;background:#2a2a2a;font-family:"Source Sans 3",sans-serif;color:#eee;padding:20px;width:max-content}h1{font-size:22px;margin:0 0 4px}.s{font-size:14px;color:#bbb;margin-bottom:14px}.fila{display:flex;gap:24px;margin-bottom:18px;align-items:flex-start}.r{font-size:14px;margin-bottom:6px;color:#ddd}img{display:block;outline:1px solid #555}</style></head><body><h1>Tarea 82 · ${titulo} · tema ${tema}</h1><div class="s">Izquierda: boceto aprobado (docs/pantallas/tarea82/). Derecha: la app real${id.startsWith('grabar') ? '; la cámara se simula con la imagen de fondo de los bocetos' : ''}.</div>${filas}</body></html>`;
    await p.setViewport({ width: 1800, height: 900, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    const el = await p.$('body');
    await el.screenshot({ path: `${OUT}lamina-${id}-${tema}.png` });
  }
  await br.close();
})();
