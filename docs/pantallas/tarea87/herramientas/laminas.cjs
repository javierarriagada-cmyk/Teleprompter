// Las láminas del boceto -tarea 87-. Después de capturas.cjs y de capturas.cjs --resumen:
// node laminas.cjs
// -04-10, segunda vuelta- Dos navegaciones -botones 48 dp, gestos 24 dp-, diez estados, y en cada
// captura del boceto la verificación de capturas.cjs: las acciones completas sobre la barra.
// Arma: lamina-resumen.png -la primera que se mira-, lamina-aprobacion.png -hoy | boceto, estado por
// estado, los dos temas y las dos navegaciones-, boceto-visor-{nav}-{tema}.png y app-hoy-{nav}-{tema}.png.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'medidas-capturas.json'), 'utf8'));
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(D, f)).toString('base64');
const NOMBRE = {
  1: '1 · Vertical con subtítulos, panel cerrado',
  2: '2 · Panel de Subtítulos abierto, Posición en Normal',
  3: '3 · Panel abierto, Para redes: el subtítulo sube',
  4: '4 · Panel cerrado, en Para redes',
  5: '5 · Horizontal con subtítulos: sin Posición',
  6: '6 · Sin subtítulos (sin registro)',
  7: '7 · Guardando (5 min): solo el apretado muestra el avance',
  8: '8 · Guardada, pero no se pudo compartir',
  9: '9 · Ya guardada: como hoy',
  10: '10 · Toma de 5 min: tiempo estimado'
};
const HOY = [1, 5, 6, 9];
const NAV = { botones: 'barra de tres botones (48 dp)', gestos: 'navegación por gestos (24 dp)' };
const CSS = `body{margin:0;background:#2a2a2a;font-family:sans-serif;color:#eee;padding:20px;width:max-content}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:18px 0 8px}.s{font-size:14px;color:#bbb;margin-bottom:10px;max-width:1900px;line-height:1.45}
.fila{display:flex;gap:14px;align-items:flex-start}.r{font-size:12px;margin-bottom:4px;color:#ddd;min-height:30px}
.v{font-size:11px;margin-top:4px;min-height:28px;line-height:1.3}.ok{color:#7ee787}.mal{color:#ff7b72}
img{display:block;outline:1px solid #555}.nada{border:1px dashed #666;color:#999;font-size:12px;padding:10px;box-sizing:border-box}
ul{margin:6px 0 0 18px;padding:0;font-size:14px;line-height:1.5;color:#ddd;max-width:1150px}.guia{color:#ff9f9f;font-weight:700}`;
function verif(clave) {
  const m = M[clave];
  if (!m) return '';
  if (clave.startsWith('boceto')) {
    return `<div class="v ${m.todasSobreLaBarra ? 'ok' : 'mal'}">${m.todasSobreLaBarra ? '✓' : '✗'} ${m.acciones.length} acciones completas, fila ${Math.round(m.fila.top)}–${Math.round(m.fila.bottom)} dp, barra desde ${m.limite}; video ${Math.round(m.video.height)} dp (imagen ${Math.round(m.imagen.ancho)}×${Math.round(m.imagen.alto)})</div>`;
  }
  return `<div class="v ${m.todasSobreLaBarra ? 'ok' : 'mal'}">${m.todasSobreLaBarra ? '✓ acciones sobre la barra' : '✗ acciones bajo el borde: hay que desplazar'}; fila ${Math.round(m.fila.top)}–${Math.round(m.fila.bottom)} dp</div>`;
}
const col = (w, titulo, archivo, clave) => `<div style="width:${w}px"><div class="r">${titulo}</div>${archivo ? `<img src="${b64(archivo)}" style="width:${w}px">${verif(clave)}` : `<div class="nada" style="width:${w}px;height:100px">No existe hoy</div>`}</div>`;
async function hoja(p, html, salida, ancho) {
  await p.setViewport({ width: ancho, height: 800, deviceScaleFactor: 1 });
  await p.setContent(`<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, salida) });
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) {
    const W = 200;
    const filas = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]].map((f) => `<div class="fila" style="margin-bottom:14px">${f.map((e) => col(W, NOMBRE[e], `boceto-estado-${e}-${nav}-${tema}.png`, `boceto-${e}-${nav}-${tema}`)).join('')}</div>`).join('');
    await hoja(p, `<h1>Tarea 87 · BOCETO del visor de la toma · ${NAV[nav]} · tema ${tema}</h1><div class="s">412×915 dp de pie (moto g86), barras del sistema dibujadas encima. Las acciones van fijas abajo; el video se achica para que lo demás quepa. Cada captura dice lo que verificó capturas.cjs.</div>${filas}`, `boceto-visor-${nav}-${tema}.png`, 1100);
    await hoja(p, `<h1>Tarea 87 · la app de HOY (main c03d734) · ${NAV[nav]} · tema ${tema}</h1><div class="s">El ReproductorGrabacion de verdad. Si la tarjeta no cabe se ve entera; la raya roja es el fin de la pantalla.</div><div class="fila">${HOY.map((e) => col(W, NOMBRE[e], `hoy-estado-${e}-${nav}-${tema}.png`, `hoy-${e}-${nav}-${tema}`)).join('')}</div>`, `app-hoy-${nav}-${tema}.png`, 900);
  }
  // Aprobación.
  const WA = 170;
  let ap = `<h1>Tarea 87 · lámina de aprobación · hoy | boceto, estado por estado</h1><div class="s">Por navegación y tema: arriba la app de hoy (main c03d734) donde el estado existe -entera, con la raya roja del fin de la pantalla-; abajo el boceto a 412×915 justos. Verde: las acciones completas sobre la barra sin desplazar. Rojo: hoy hay que desplazar.</div>`;
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    ap += `<h2>${NAV[nav]} · tema ${tema} · hoy</h2><div class="fila">${ids.map((e) => col(WA, NOMBRE[e], HOY.includes(e) ? `hoy-estado-${e}-${nav}-${tema}.png` : null, `hoy-${e}-${nav}-${tema}`)).join('')}</div>`;
    ap += `<h2>${NAV[nav]} · tema ${tema} · boceto</h2><div class="fila">${ids.map((e) => col(WA, NOMBRE[e], `boceto-estado-${e}-${nav}-${tema}.png`, `boceto-${e}-${nav}-${tema}`)).join('')}</div>`;
  }
  await hoja(p, ap, 'lamina-aprobacion.png', 1900);
  // Resumen.
  const WR = 210;
  const b = (k) => M[k];
  let rs = `<h1>Tarea 87 · BOCETO · lámina resumen (segunda vuelta, 04-10-2026), sin código</h1>
<div class="s">Visor de pie de main c03d734, 412×915 dp (moto g86), con las piezas de Sigo de hoy. Lo que cambió con la revisión de Claude:</div>
<ul>
<li><b>Las acciones quedan fijas abajo</b>, completas sobre la barra del sistema, sin desplazar, en los 40 casos (10 estados × 2 temas × 2 navegaciones). El video se achica para que lo demás quepa: de pie con el panel cerrado mide ${b('boceto-1-botones-oscuro').video.height} dp de alto con tres botones y ${b('boceto-1-gestos-oscuro').video.height} con gestos (hoy 641, con las acciones bajo el borde); con el panel de Subtítulos abierto, ${b('boceto-2-botones-oscuro').video.height} y ${b('boceto-2-gestos-oscuro').video.height} dp.</li>
<li><b>Posición: Normal / Para redes va dentro del panel de Subtítulos</b>, bajo los cuatro estilos; con el panel cerrado no se ve, y la ficha dice «Amarillo · Para redes».</li>
<li><b>Guardando:</b> solo el botón apretado muestra el avance; los otros tres y la ficha quedan desactivados.</li>
<li><b>Tiempo estimado</b> redondeado hacia arriba de a 5 s: «Guardar tarda alrededor de 1 min» en una toma de 5 min.</li>
<li class="guia">Las líneas punteadas (0,125 · 0,35 · 14 % de arriba) y su rótulo rojo son GUÍAS DEL BOCETO: no van en la app.</li>
<li>Letra y toques como hoy: acciones de 69 dp (64 con dos), letra de 11; segmentado de 40; estilos de 68; avance y cerrar de 44.</li>
</ul>`;
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) {
    rs += `<h2>${NAV[nav]} · tema ${tema}</h2><div class="fila">${col(WR, 'Hoy · estado 1 (main)', `hoy-estado-1-${nav}-${tema}.png`, `hoy-1-${nav}-${tema}`)}${col(WR, 'Boceto · 1 · panel cerrado · <span class="guia">guías del boceto</span>', `guias-estado-1-${nav}-${tema}.png`, `boceto-1-${nav}-${tema}`)}${col(WR, 'Boceto · 3 · panel abierto, Para redes · <span class="guia">guías del boceto</span>', `guias-estado-3-${nav}-${tema}.png`, `boceto-3-${nav}-${tema}`)}${col(WR, 'Boceto · 10 · tiempo estimado', `boceto-estado-10-${nav}-${tema}.png`, `boceto-10-${nav}-${tema}`)}${col(WR, 'Boceto · 7 · guardando', `boceto-estado-7-${nav}-${tema}.png`, `boceto-7-${nav}-${tema}`)}</div>`;
  }
  await hoja(p, rs, 'lamina-resumen.png', 1200);
  await br.close();
})();
