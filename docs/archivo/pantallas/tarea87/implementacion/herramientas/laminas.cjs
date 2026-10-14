// Las láminas comparativas de la implementación -tarea 87-. Después de capturas.cjs:
//   node docs/pantallas/tarea87/implementacion/herramientas/laminas.cjs
// Por navegación y tema, cada estado del boceto en tres columnas: el boceto aprobado -#63, ab86ccc,
// con la barra de estado de 24 dp que se suponía-, el mismo boceto con la barra de 45 dp que mide de
// verdad el moto g86 -respuesta 4 de Claude- y la app implementada. Debajo de la app, la comparación
// contra el piso -el boceto con 45-: acciones completas sobre la barra, video, alturas y letras.
// Arma: lamina-resumen.png -la primera que se mira- y comparar-visor-{nav}-{tema}.png -al lado de
// cada boceto-visor-{nav}-{tema}.png de ../-. Imprime los casos que quedan bajo el piso.
// -04-10-2026, Javier simplifica la 87- Los estados 3 y 4 -Para redes- y 10 -el tiempo estimado- se
// sacaron: queda el boceto y, en la columna de la app, «SE SACÓ». El subtítulo va a 1/6 del alto de la
// imagen -el boceto lo tenía a 1/8- y se verifica en cada captura. Y, de la mezcla con la tarea 90,
// comparar-visor-lado.png: el visor de lado a 915×411, caso 1 y caso 2, con el boceto aprobado de la
// 90, la app de main -subtítulo a 1/8- y la app de esta rama -a 1/6-.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const B = path.join(D, '..');
const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'medidas-app.json'), 'utf8'));
const M24 = JSON.parse(fs.readFileSync(path.join(B, 'herramientas', 'medidas-capturas.json'), 'utf8'));
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const NOMBRE = {
  1: '1 · Vertical con subtítulos, panel cerrado',
  // Antes: '2 · Panel abierto, Posición en Normal'.
  2: '2 · Panel abierto (sin Posición)',
  3: '3 · Panel abierto, Para redes — SE SACÓ',
  4: '4 · Panel cerrado, en Para redes — SE SACÓ',
  5: '5 · Horizontal: sin Posición',
  6: '6 · Sin subtítulos',
  7: '7 · Guardando (5 min)',
  8: '8 · Guardada, no se pudo compartir',
  9: '9 · Ya guardada: como hoy',
  10: '10 · Toma de 5 min: tiempo estimado — SE SACÓ'
};
const SACADOS = [3, 4, 10];
const NAV = { botones: 'barra de tres botones (48 dp)', gestos: 'navegación por gestos (24 dp supuestos)' };
// Antes: const PANEL = [2, 3].
const PANEL = [2];
const CSS = `body{margin:0;background:#2a2a2a;font-family:sans-serif;color:#eee;padding:20px;width:max-content}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:18px 0 8px}.s{font-size:14px;color:#bbb;margin-bottom:10px;max-width:2000px;line-height:1.45}
.fila{display:flex;gap:22px;align-items:flex-start}.grupo{display:flex;gap:6px;align-items:flex-start;padding:6px;background:#333;border-radius:6px}
.t{font-size:13px;font-weight:700;margin:0 0 4px 6px}.r{font-size:11px;margin-bottom:3px;color:#ddd;min-height:28px}
.v{font-size:10.5px;margin-top:4px;line-height:1.3}.ok{color:#7ee787}.mal{color:#ff7b72}
img{display:block;outline:1px solid #555}ul{margin:6px 0 0 18px;padding:0;font-size:14px;line-height:1.5;color:#ddd;max-width:1250px}`;
const r = (x) => Math.round(x);
const ge = (a, b) => JSON.stringify(a.map(r)) === JSON.stringify(b.map(r)) || (a.length === b.length && a.every((x, i) => x >= b[i] - 0.5));
const bajoPiso = [];
const subOk = [], subMal = [];
for (const [k, a] of Object.entries(M)) if ((k.startsWith('app-') || k.startsWith('lado-')) && a.subtituloAbajo != null) (Math.abs(a.subtituloAbajo - a.imagen.alto / 6) <= 1 ? subOk : subMal).push(k);
const T90 = path.join(B, '..', 'tarea90');
// El visor de lado: por caso, el boceto de la 90, la app de main y la de esta rama.
function ladoHtml(tema, f, vistas) {
  return vistas.map(([caso, panel]) => {
    const n90 = `visor-de-lado-caso${caso}-${caso === '1' ? 'horizontal' : 'vertical'}-giro90${panel ? '-subtitulos' : ''}-915x411-${tema}.png`;
    const a = M[`lado-caso${caso}${panel}-915x411-${tema}`];
    const w = r(915 * f);
    const celda = (t, f2) => fs.existsSync(f2) ? img(w, t, f2) : `<div style="width:${w}px"><div class="r">${t}</div><div style="width:${w}px;height:${r(411 * f)}px;border:1px dashed #777;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px">no hay</div></div>`;
    const ok = Math.abs(a.subtituloAbajo - a.imagen.alto / 6) <= 1;
    const pie = `<div class="v"><div class="${ok ? 'ok' : 'mal'}">${ok ? '✓' : '✗'} subtítulo a ${a.subtituloAbajo} dp del borde de abajo = alto ${a.imagen.alto}/6 (${r(a.imagen.alto / 6)}); antes 1/8 (${r(a.imagen.alto / 8)})</div><div class="${!a.posicion ? 'ok' : 'mal'}">${!a.posicion ? '✓ sin Posición' : '✗ aparece Posición'}${a.panel ? ' (panel abierto)' : ''} · ${a.visorArriba ? '<span class="mal">✗ con la tarjeta de pie</span>' : '<span class="ok">✓ sin la tarjeta de pie de la 87</span>'}</div><div>imagen ${a.imagen.ancho}×${a.imagen.alto}${a.columna ? ` · columna ${a.columna.ancho}` : ''}${a.tarjeta ? ` · tarjeta ${a.tarjeta.ancho}×${a.tarjeta.alto}` : ''}</div></div>`;
    return `<div class="t">Caso ${caso} · toma ${caso === '1' ? 'HORIZONTAL 16:9' : 'VERTICAL 9:16'}${panel ? ' · panel de Subtítulos abierto' : ''}</div><div class="grupo" style="margin-bottom:12px">${celda('Boceto aprobado de la 90', path.join(T90, 'boceto', n90))}${celda('App de main 900a982 (1/8)', path.join(T90, 'app-real', n90))}<div style="width:${w}px"><div class="r">App de esta rama (1/6)</div><img src="${b64(path.join(D, `app-lado-caso${caso}${panel}-915x411-${tema}.png`))}" style="width:${w}px">${pie}</div></div>`;
  }).join('');
}
// Compara la app contra el piso -el boceto con 45- y devuelve las líneas de la verificación.
function comparar(k) {
  const a = M[`app-${k}`];
  const b = M[`boceto45-${k}`];
  const c = M24[`boceto-${k}`];
  const e = Number(k.split('-')[0]);
  const v = [];
  const marca = (ok, texto) => { v.push(`<div class="${ok ? 'ok' : 'mal'}">${ok ? '✓' : '✗'} ${texto}</div>`); if (!ok) bajoPiso.push(`${k}: ${texto}`) };
  marca(a.todasSobreLaBarra && !a.raizSeDesplaza && !a.arribaSeDesplaza, `${a.acciones.length} acciones completas sobre la barra (fila ${r(a.fila.top)}–${r(a.fila.bottom)}, barra desde ${a.limite}), sin desplazar`);
  const dv = a.video.height - b.video.height;
  marca(dv >= -0.5, `video ${r(a.video.height)} dp; piso ${r(b.video.height)} (${dv >= 0 ? '+' : ''}${r(dv)}); boceto aprobado ${r(c.video.height)}`);
  if (PANEL.includes(e)) marca(dv >= 50, `panel abierto: el nombre escondido y sin Posición le dan ${r(dv)} dp al video`);
  if (a.subtituloAbajo !== null) marca(Math.abs(a.subtituloAbajo - a.imagen.alto / 6) <= 1, `subtítulo a ${a.subtituloAbajo} dp del borde de abajo de la imagen = alto ${a.imagen.alto}/6 (${r(a.imagen.alto / 6)}); antes 1/8 (${r(a.imagen.alto / 8)})`);
  marca(ge(a.altoAcciones, b.altoAcciones) && ge(a.letraAcciones, b.letraAcciones), `acciones de ${[...new Set(a.altoAcciones)].join('/')} dp${a.letraAcciones.length ? `, letra ${[...new Set(a.letraAcciones)].join('/')}` : ''} (piso ${[...new Set(b.altoAcciones)].join('/')})`);
  // El segmentado era el de Posición, que se sacó: queda solo la fila de estilos.
  if (b.altoSegmentado.length && !a.altoSegmentado.length) marca(ge(a.altoOpciones, b.altoOpciones), `segmentado de Posición: se sacó; estilos ${[...new Set(a.altoOpciones)].join('/')} dp (piso ${[...new Set(b.altoOpciones)].join('/')})`);
  else if (b.altoSegmentado.length) marca(ge(a.altoSegmentado, b.altoSegmentado) && ge(a.altoOpciones, b.altoOpciones), `segmentado ${[...new Set(a.altoSegmentado)].join('/')} dp, letra ${[...new Set(a.letraSegmentado)].join('/')}; estilos ${[...new Set(a.altoOpciones)].join('/')}`);
  marca(ge(a.altoBotonVisor, b.altoBotonVisor) && ge(a.altoCerrar, b.altoCerrar) && Math.min(...a.letraMeta) >= Math.min(...b.letraMeta), `avance/visor ${a.altoBotonVisor.join('/')} dp, cerrar ${a.altoCerrar.join('/')}, meta ${Math.min(...a.letraMeta)}`);
  if (a.tiempoEstimado) v.push(`<div>«${a.tiempoEstimado}»</div>`);
  if (a.aviso) v.push(`<div>aviso: «${a.aviso}»</div>`);
  return `<div class="v">${v.join('')}</div>`;
}
const img = (w, titulo, archivo, pie = '') => `<div style="width:${w}px"><div class="r">${titulo}</div><img src="${b64(archivo)}" style="width:${w}px">${pie}</div>`;
const sacado = (w) => `<div style="width:${w}px"><div class="r">La app implementada</div><div style="width:${w}px;height:${r(w * 915 / 412)}px;display:flex;align-items:center;justify-content:center;text-align:center;border:3px dashed #ff7b72;box-sizing:border-box;color:#ff7b72;font-weight:700;font-size:15px;padding:8px">SE SACÓ<br><span style="font-weight:400;font-size:12px;color:#ddd">Javier, 04-10-2026</span></div></div>`;
function grupo(e, nav, tema, w) {
  const k = `${e}-${nav}-${tema}`;
  if (SACADOS.includes(e)) return `<div><div class="t">${NOMBRE[e]}</div><div class="grupo">${img(w, 'Boceto aprobado<br>(barra de 24 dp)', path.join(B, `boceto-estado-${k}.png`))}${img(w, 'Boceto con la barra<br>de 45 dp (el piso)', path.join(D, `boceto45-estado-${k}.png`))}${sacado(w + 40)}</div></div>`;
  return `<div><div class="t">${NOMBRE[e]}</div><div class="grupo">${img(w, 'Boceto aprobado<br>(barra de 24 dp)', path.join(B, `boceto-estado-${k}.png`))}${img(w, 'Boceto con la barra<br>de 45 dp (el piso)', path.join(D, `boceto45-estado-${k}.png`))}${img(w + 40, 'La app implementada<br>(barra de 45 dp)', path.join(D, `app-estado-${k}.png`), comparar(k))}</div></div>`;
}
async function hoja(p, html, salida, ancho) {
  await p.setViewport({ width: ancho, height: 800, deviceScaleFactor: 1 });
  await p.setContent(`<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, salida) });
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) {
    const W = 150;
    const filas = [[1, 2, 3], [4, 5, 6, 7], [8, 9, 10]].map((f) => `<div class="fila" style="margin-bottom:16px">${f.map((e) => grupo(e, nav, tema, W)).join('')}</div>`).join('');
    await hoja(p, `<h1>Tarea 87 · IMPLEMENTACIÓN contra el boceto · ${NAV[nav]} · tema ${tema}</h1><div class="s">412×915 dp de pie (moto g86). Por estado: el boceto aprobado (#63, ab86ccc), el mismo boceto con la barra de estado de 45 dp que mide el teléfono -el piso- y la app de esta rama -vite + Chrome headless-. Verde: la app no queda bajo el piso. Rojo: queda bajo el piso. En la app las acciones usan los bordes seguros; la franja de gestos de 24 dp es una suposición de la captura, la mide Claude.</div>${filas}`, `comparar-visor-${nav}-${tema}.png`, 1900);
  }
  const m = (k) => M[k];
  const W = 170;
  let rs = `<h1>Tarea 87 · IMPLEMENTACIÓN · lámina resumen (04-10-2026)</h1>
<div class="s">La app de la rama tarea87-implementacion -simplificada y mezclada con main 900a982, tareas 90 y 91- al lado del boceto aprobado (#63, ab86ccc), 412×915 dp de pie, y de lado a 915×411 al lado del boceto aprobado de la 90.</div>
<ul>
<li><b>SE SACÓ «Normal / Para redes»</b> (estados 3 y 4) y <b>el tiempo estimado</b> (estado 10). <b>El subtítulo va a 1/6 del alto de la imagen</b> en todo -de pie, de lado y en el archivo-; el boceto lo tenía a 1/8: ${subOk.length} capturas verificadas, ${subMal.length ? `<span class="mal">${subMal.length} fuera</span>` : '<span class="ok">ninguna fuera</span>'}.</li>
<li><b>Barra de estado de 45 dp</b> (no 24): todo baja 21 dp. Con el panel cerrado el video mide ${r(m('app-1-botones-oscuro').video.height)} dp con tres botones y ${r(m('app-1-gestos-oscuro').video.height)} con gestos (el boceto aprobado: ${r(M24['boceto-1-botones-oscuro'].video.height)} y ${r(M24['boceto-1-gestos-oscuro'].video.height)}); igual que el boceto recalculado con 45.</li>
<li><b>El nombre de la toma se esconde con el panel de Subtítulos abierto</b> y el panel ya no tiene Posición: el video mide ${r(m('app-2-botones-oscuro').video.height)} dp con tres botones y ${r(m('app-2-gestos-oscuro').video.height)} con gestos, contra ${r(m('boceto45-2-botones-oscuro').video.height)} del boceto con 45 (+${r(m('app-2-botones-oscuro').video.height - m('boceto45-2-botones-oscuro').video.height)}) y ${r(M24['boceto-2-botones-oscuro'].video.height)} del aprobado. Antes de sacar Posición: 416 y 440.</li>
<li><b>De lado</b> (tarea 90): caso 1 con la columna de la 90 -sin la fila fija de abajo de la 87-, caso 2 con la tarjeta de la 90; el panel de Subtítulos de lado sin Posición; el subtítulo a 1/6 en los dos casos.</li>
<li><b>La X mientras se guarda no cancela</b>: el guardado sigue y al terminar sale el aviso aunque el visor esté cerrado.</li>
<li>Las cuatro acciones completas sobre la barra, sin desplazar, en los 28 casos de pie que quedan; ninguna medida bajo el piso: ${bajoPiso.length ? `<span class="mal">${bajoPiso.length} casos bajo el piso</span>` : '<span class="ok">0 casos</span>'}.</li>
</ul>`;
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) {
    // Antes: los estados 1, 3 y 7.
    rs += `<h2>${NAV[nav]} · tema ${tema}</h2><div class="fila">${grupo(1, nav, tema, W - 40)}${grupo(2, nav, tema, W - 40)}${grupo(7, nav, tema, W - 40)}</div>`;
  }
  rs += `<h2>De lado · 915×411 · giro 90 · app en oscuro</h2>${ladoHtml('oscuro', 0.42, [['1', ''], ['2', '']])}`;
  await hoja(p, rs, 'lamina-resumen.png', 1700);
  let lh = `<h1>Tarea 87 · el visor de lado (tarea 90) con el subtítulo a 1/6 · 915×411 · giro 90</h1><div class="s">Por caso y estado: el boceto aprobado de la 90, la app de main 900a982 -subtítulo a 1/8- y la app de esta rama -a 1/6-. De lado el visor siempre va en oscuro; «app en claro» es el tema del resto de la app. El caso 2 con el panel abierto no tiene boceto ni captura en la 90.</div>`;
  for (const tema of ['oscuro', 'claro']) lh += `<h2>App en ${tema}</h2>${ladoHtml(tema, 0.5, [['1', ''], ['1', '-panel'], ['2', ''], ['2', '-panel']])}`;
  await hoja(p, lh, 'comparar-visor-lado.png', 1500);
  await br.close();
  // Antes sin el Set: la resumen vuelve a comparar los mismos estados y salían repetidos.
  console.log(bajoPiso.length ? 'BAJO EL PISO:\n' + [...new Set(bajoPiso)].join('\n') : 'bajo el piso: ninguno');
  console.log('subtítulo a 1/6:', subOk.length, 'bien,', subMal.length, 'fuera', subMal.join(', '));
})();
