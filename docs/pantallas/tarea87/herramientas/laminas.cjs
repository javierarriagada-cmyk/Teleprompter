// Las láminas del boceto -tarea 87-. Después de capturas.cjs y de capturas.cjs --resumen:
// node laminas.cjs
// Arma: lamina-resumen.png -la primera que se mira-, boceto-visor-{oscuro,claro}.png -los ocho
// estados-, app-hoy-{oscuro,claro}.png -la app de hoy en los estados 1, 3, 4 y 7- y
// lamina-aprobacion.png -hoy al lado del boceto, estado por estado, los dos temas-.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(D, f)).toString('base64');
const NOMBRE = {
  1: '1 · Vertical con subtítulos, en Normal',
  2: '2 · La misma, en Para redes: el subtítulo sube',
  3: '3 · Horizontal con subtítulos: sin Posición',
  4: '4 · Sin subtítulos (sin registro): sin Posición',
  5: '5 · Guardando (toma de 5 min): avance en el botón tocado',
  6: '6 · Guardada, pero no se pudo compartir',
  7: '7 · Ya guardada: como hoy',
  8: '8 · Toma de 5 min: el tiempo estimado antes de guardar'
};
const HOY = [1, 3, 4, 7];
const CSS = `body{margin:0;background:#2a2a2a;font-family:sans-serif;color:#eee;padding:20px;width:max-content}
h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:18px 0 8px}.s{font-size:14px;color:#bbb;margin-bottom:14px;max-width:1800px;line-height:1.45}
.fila{display:flex;gap:16px;align-items:flex-start}.c{width:W px}.r{font-size:13px;margin-bottom:6px;color:#ddd;min-height:34px}
img{display:block;outline:1px solid #555}.nada{border:1px dashed #666;color:#999;font-size:13px;padding:12px;box-sizing:border-box}
ul{margin:6px 0 0 18px;padding:0;font-size:14px;line-height:1.5;color:#ddd;max-width:1800px}`;
const col = (w, titulo, archivo) => `<div style="width:${w}px"><div class="r">${titulo}</div>${archivo ? `<img src="${b64(archivo)}" style="width:${w}px">` : `<div class="nada" style="width:${w}px;height:120px">No existe hoy</div>`}</div>`;
async function hoja(p, html, salida, ancho) {
  await p.setViewport({ width: ancho, height: 800, deviceScaleFactor: 1 });
  await p.setContent(`<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, salida) });
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  const W = 230;
  for (const tema of ['oscuro', 'claro']) {
    const filas = [[1, 2, 3, 4], [5, 6, 7, 8]].map((f) => `<div class="fila" style="margin-bottom:16px">${f.map((e) => col(W, NOMBRE[e], `boceto-estado-${e}-${tema}.png`)).join('')}</div>`).join('');
    await hoja(p, `<h1>Tarea 87 · BOCETO del visor de la toma · tema ${tema}</h1><div class="s">Teléfono de pie, 412×915 dp (moto g86), con las barras del sistema dibujadas encima. Si la tarjeta no cabe, se ve entera y la raya roja marca dónde termina la pantalla: lo de abajo se alcanza desplazando (visor desplazable de la tarea 89). Medidas en medidas-implementacion.md.</div>${filas}`, `boceto-visor-${tema}.png`, 1000);
    await hoja(p, `<h1>Tarea 87 · la app de HOY (main c03d734) · tema ${tema}</h1><div class="s">El ReproductorGrabacion de verdad, con lo nativo fingido. Estados 1, 3, 4 y 7.</div><div class="fila">${HOY.map((e) => col(W, NOMBRE[e], `hoy-estado-${e}-${tema}.png`)).join('')}</div>`, `app-hoy-${tema}.png`, 1000);
  }
  // Aprobación: por tema, una fila Hoy y una fila Boceto, columna por estado.
  let ap = `<h1>Tarea 87 · lámina de aprobación · hoy | boceto, estado por estado</h1><div class="s">Arriba de cada tema, la app de hoy (main c03d734) donde el estado existe; abajo, el boceto. 412×915 dp de pie; la raya roja es el fin de la pantalla.</div>`;
  const WA = 200;
  for (const tema of ['oscuro', 'claro']) {
    ap += `<h2>Tema ${tema} · hoy</h2><div class="fila">${[1, 2, 3, 4, 5, 6, 7, 8].map((e) => col(WA, NOMBRE[e], HOY.includes(e) ? `hoy-estado-${e}-${tema}.png` : null)).join('')}</div>`;
    ap += `<h2>Tema ${tema} · boceto</h2><div class="fila">${[1, 2, 3, 4, 5, 6, 7, 8].map((e) => col(WA, NOMBRE[e], `boceto-estado-${e}-${tema}.png`)).join('')}</div>`;
  }
  await hoja(p, ap, 'lamina-aprobacion.png', 1800);
  // Resumen: lo que hay que mirar primero.
  const WR = 250;
  let rs = `<h1>Tarea 87 · BOCETO · lámina resumen, sin código</h1>
<div class="s">Visor de pie de main c03d734 (412×915 dp, moto g86), con las piezas de Sigo de hoy. Lo nuevo, nada más:</div>
<ul>
<li><b>Posición: Normal / Para redes</b> — la cabeza <code>.panel-ficha-cabeza</code> y el <code>.segmentado</code> de las fichas de LISTO, debajo del selector de subtítulos. Solo en una toma <b>vertical</b> recién grabada, con subtítulos y estilo distinto de No. Debajo, a la derecha, la única línea con redes: «Instagram, TikTok y YouTube Shorts» (texto meta, --color-apagado).</li>
<li><b>Para redes</b> sube el subtítulo: el borde pintado de abajo a 0,35 del alto de la imagen (672 px en 1080×1920) en vez de 0,125. En las guías: celeste 0,125, naranja 0,35, gris el 14 % de arriba (zona de Meta). La letra no cambia (1/32 del alto).</li>
<li><b>Guardar y compartir</b> — una <code>.accion-toma</code> más, con IconoCompartir, entre Guardar y Repetir, en toda toma recién grabada.</li>
<li><b>Tiempo estimado</b> — «Guardar tarda alrededor de 1 min» en la segunda línea meta bajo la duración, en tomas de 1 min o más con subtítulos: duración × 11,2 s/min, redondeado hacia arriba de a 5 s (1 min → 15 s; 5 min → 1 min; 20 min → 3 min 45 s). Se oculta mientras guarda.</li>
<li>Para decidir: la tarjeta de pie crece de 989 a 1095 dp (1114 con el tiempo estimado) y ya hoy no cabe en 915: las acciones quedan bajo la barra y se alcanzan desplazando (tarea 89). El visor de lado del #68 no está en main: ahí van las mismas piezas en la columna de la derecha (descrito en medidas-implementacion.md, sin lámina).</li>
</ul>`;
  for (const tema of ['oscuro', 'claro']) {
    rs += `<h2>Tema ${tema}</h2><div class="fila">${col(WR, 'Hoy · estado 1 (main)', `hoy-estado-1-${tema}.png`)}${col(WR, 'Boceto · 1 · Normal, con guías', `guias-estado-1-${tema}.png`)}${col(WR, 'Boceto · 2 · Para redes, con guías', `guias-estado-2-${tema}.png`)}${col(WR, 'Boceto · 8 · tiempo estimado', `boceto-estado-8-${tema}.png`)}${col(WR, 'Boceto · 5 · guardando', `boceto-estado-5-${tema}.png`)}</div>`;
  }
  await hoja(p, rs, 'lamina-resumen.png', 1400);
  await br.close();
})();
