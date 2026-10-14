// La lámina de la toma HORIZONTAL -tarea 87, subtítulos en horizontal, 04-10-2026-. Después de
// capturas.cjs antes y despues: node laminas.cjs. Arma ../lamina-horizontal.png: por fila, el visor de
// pie, el visor de lado -caso 1- y el cuadro exportado de 1920×1080 -simulado, cuadro.tsx-; en cada uno,
// un renglón del corpus y uno de «MW" -32 letras antes, 47 después-, antes a la izquierda y después a la
// derecha, con la letra, el ancho del renglón y el disponible -88 % de la imagen-.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const A = JSON.parse(fs.readFileSync(path.join(__dirname, 'medidas-antes.json'), 'utf8'));
const B = JSON.parse(fs.readFileSync(path.join(__dirname, 'medidas-despues.json'), 'utf8'));
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(D, f)).toString('base64');
// -04-10-2026- Con el ajuste del visor: la letra del cuadro y la achicada. Antes: `letra ${m.letra} px · …`.
const visor = (m) => `letra ${m.letraBase && m.letraBase !== m.letra ? `${m.letraBase} → <b>${m.letra}</b> (ajuste, como el archivo: ${(m.letra * 1920 / m.imagen.ancho).toFixed(2)} en 1920)` : m.letra} px · imagen ${m.imagen.ancho}×${m.imagen.alto} · disponible ${m.disponible} · ` + m.renglones.map((r) => `<span class="${r.ancho <= m.disponible + 0.5 ? 'ok' : 'mal'}">${r.letras} letras = ${r.ancho} px${r.ancho > m.disponible + 0.5 ? ` (se sale ${(r.ancho - m.disponible).toFixed(1)})` : ''}</span>`).join(' · ') + ` · abajo ${m.abajo} (= alto/6 ${(m.imagen.alto / 6).toFixed(1)})`;
const cuadro = (m) => `letra ${m.letraBase} px${m.ajustada ? ` → <b>${m.letra}</b> (ajuste: el renglón medía ${m.renglonMasAnchoBase})` : ''} · renglón más ancho ${m.renglonMasAncho} / disponible ${m.disponible} · renglones de ${m.letrasPorRenglon.join(' y ')} letras (máx. ${m.maxLetras})`;
const celda = (t, img, w, pie) => `<div class="c" style="width:${w}px"><div class="t">${t}</div><img src="${b64(img)}" style="width:${w}px"><div class="p">${pie}</div></div>`;
const fila = (titulo, n, w, med) => `<h2>${titulo}</h2><div class="f">${celda('ANTES (d9e9c83) · ' + n.etiqueta, 'antes-' + n.arch + '.png', w, med(A[n.clave]))}${celda('DESPUÉS · ' + n.etiqueta, 'despues-' + n.arch + '.png', w, med(B[n.clave]))}</div>`;
const CSS = `body{margin:0;padding:20px;background:#2a2a2a;color:#eee;font-family:sans-serif;width:max-content}h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:16px 0 6px}
.s{font-size:13px;color:#ccc;max-width:1700px;line-height:1.45}.f{display:flex;gap:18px}.c{background:#333;padding:6px;border-radius:6px}.t{font-size:12px;font-weight:700;margin-bottom:4px}
.p{font-size:11.5px;margin-top:4px;line-height:1.35;max-width:100%}.ok{color:#7ee787}.mal{color:#ff7b72;font-weight:700}img{display:block;outline:1px solid #555}`;
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await br.newPage();
  await p.setViewport({ width: 1800, height: 800 });
  let h = `<h1>Tarea 87 · el subtítulo en la toma HORIZONTAL · antes y después (04-10-2026)</h1>
<div class="s">Después: renglones de hasta 47 letras en horizontal (32 en vertical) y la letra contra el lado corto del cuadro, 1/18 (60 px en 1080, 40 en 720). La posición a 1/6 no cambia. El renglón «MW» es una sola palabra de 32 letras antes y de 47 después. Antes se escribió en la capa encima del subtítulo real con el video quieto; en el después del visor es un subtítulo de verdad -la palabra «concepción» del registro cambiada por 47 «MW», ?mw=47- y el visor achica la letra de ese subtítulo como el archivo (04-10-2026, aprobado por Javier). El cuadro exportado es una simulación en canvas, con Roboto 700 y las cuentas de CapaDeSubtitulos.java (con su ajuste: si el renglón pasa del 88 %, se achica la letra de todo el subtítulo). Las líneas celestes marcan el 6 % de cada lado y el 1/6 de abajo.</div>`;
  h += fila('Visor de pie · 412×915 · renglón del corpus', { etiqueta: 'corpus', arch: 'pie-normal', clave: 'pieNormal' }, 412, visor);
  h += fila('Visor de pie · renglón «MW»', { etiqueta: 'MW', arch: 'pie-mw', clave: 'pieMW' }, 412, visor);
  h += fila('Visor de lado, caso 1 · 915×411 · renglón del corpus', { etiqueta: 'corpus', arch: 'lado-normal', clave: 'ladoNormal' }, 820, visor);
  h += fila('Visor de lado, caso 1 · renglón «MW»', { etiqueta: 'MW', arch: 'lado-mw', clave: 'ladoMW' }, 820, visor);
  h += fila('Cuadro exportado 1920×1080 (simulado) · renglón del corpus', { etiqueta: 'corpus', arch: 'cuadro-normal', clave: 'cuadro-normal' }, 820, cuadro);
  h += fila('Cuadro exportado 1920×1080 (simulado) · renglón «MW»', { etiqueta: 'MW', arch: 'cuadro-mw', clave: 'cuadro-mw' }, 820, cuadro);
  h += `<h2>Guardianas (sin captura)</h2><div class="s">Vertical 1080×1920: letra ${A['cuadro-vertical'].letra} → ${B['cuadro-vertical'].letra}, renglones ${JSON.stringify(A['cuadro-vertical'].renglones)} → ${JSON.stringify(B['cuadro-vertical'].renglones)}. 720p horizontal 1280×720: letra ${A['cuadro-720'].letra} → ${B['cuadro-720'].letra}.</div>`;
  await p.setContent(`<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${h}</body></html>`, { waitUntil: 'load' });
  await (await p.$('body')).screenshot({ path: path.join(D, 'lamina-horizontal.png') });
  await br.close();
})();
