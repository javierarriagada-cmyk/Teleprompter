// LAS CAPTURAS DE LA APP REAL Y DEL BOCETO APROBADO -tarea 90, 04-10-2026-. Con el vite de las capturas en
// 127.0.0.1:5190 -la configuración de vite del repo más fs.strict false y un plugin que cambia
// src/lib/archivosNativos.ts por archivosNativos-de-prueba.ts; ver docs/tarea90.txt, CAPTURAS-:
//   node docs/pantallas/tarea90/herramientas/capturas-app-real.cjs
// Por cada vista, tema y tamaño saca la del boceto -boceto-aprobado.html, en docs/pantallas/tarea90/boceto/-
// y la de la app real -app-real.html, en docs/pantallas/tarea90/app-real/-, y mide las cajas de las dos en
// Chrome -medidas-comparadas.json-.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
fs.mkdirSync(path.join(D, 'boceto'), { recursive: true });
fs.mkdirSync(path.join(D, 'app-real'), { recursive: true });
const BASE = 'http://127.0.0.1:5190/docs/pantallas';
const TAMANOS = [[915, 411], [800, 360]];
const VISTAS = [];
for (const caso of [1, 2]) for (const giro of [90, 270]) VISTAS.push({ caso, giro, estado: 'normal' });
for (const estado of ['subtitulos', 'guardada']) for (const giro of [90, 270]) VISTAS.push({ caso: 1, giro, estado });

const caja = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) }; };
async function medirBoceto(p) {
  return p.evaluate(() => {
    const c = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) }; };
    const q = (s) => document.querySelector(s);
    const acc = q('[data-medida="acciones"]');
    const filas = acc ? [...acc.children].map((e) => Math.round(e.getBoundingClientRect().height)) : [...document.querySelectorAll('[data-medida="panel"] .acciones-toma > *')].map((e) => Math.round(e.getBoundingClientRect().height));
    const rot = [...document.querySelectorAll('.accion-toma span, .boton-subtitulos-valor')].filter((e) => e.offsetParent).map((e) => ({ t: e.textContent, px: parseFloat(getComputedStyle(e).fontSize) }));
    return { video: c(q('[data-medida="video"]')), barra: c(q('[data-medida="barra-avance"]')), columna: c(q('[data-medida="columna"]')), tarjeta: c(q('[data-medida="panel"]')), panelSubtitulos: c(q('.opciones-subtitulos')), filas, cerrar: c(q('.cerrar-visor')), boton: c(q('.boton-visor')), avance: c(q('.avance-visor')), rotulos: rot };
  });
}
async function medirApp(p) {
  return p.evaluate(() => {
    const c = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) }; };
    const q = (s) => document.querySelector(s);
    const raiz = q('[data-testid="reproductor-grabacion"]');
    const enColumna = [...document.querySelectorAll('[data-fila-accion]')];
    const filas = enColumna.length ? enColumna.map((e) => Math.round(e.getBoundingClientRect().height)) : [...document.querySelectorAll('.visor-lado-tarjeta .acciones-toma > *')].map((e) => Math.round(e.getBoundingClientRect().height));
    const rot = [...document.querySelectorAll('.accion-toma span, .boton-subtitulos-valor')].filter((e) => e.offsetParent).map((e) => ({ t: e.textContent, px: parseFloat(getComputedStyle(e).fontSize) }));
    const sup = q('[data-testid="visor-lado-columna"]') || q('[data-testid="visor-lado-tarjeta"]');
    return { tema: raiz && raiz.getAttribute('data-tema'), caso: raiz && raiz.getAttribute('data-caso'), fondoRaiz: raiz && getComputedStyle(raiz).backgroundColor, fondoControles: sup && getComputedStyle(sup).backgroundColor, video: c(q('[data-testid="visor-lado-video"]')), barra: c(q('[data-testid="visor-lado-barra"]')), columna: c(q('[data-testid="visor-lado-columna"]')), tarjeta: c(q('[data-testid="visor-lado-tarjeta"]')), panelSubtitulos: c(q('.opciones-subtitulos')), filas, cerrar: c(q('.cerrar-visor')), boton: c(q('.boton-visor')), avance: c(q('.avance-visor')), rotulos: rot, videoWidth: q('video') && q('video').videoWidth, videoHeight: q('video') && q('video').videoHeight };
  });
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'language', { get: () => 'es-CL' }); Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] }); });
  const medidas = {};
  for (const v of VISTAS) for (const tema of ['oscuro', 'claro']) for (const [w, h] of TAMANOS) {
    const nombre = `visor-de-lado-caso${v.caso}-${v.caso === 1 ? 'horizontal' : 'vertical'}-giro${v.giro}${v.estado === 'normal' ? '' : '-' + v.estado}-${w}x${h}-${tema}`;
    const qs = `caso=${v.caso}&giro=${v.giro}&estado=${v.estado}&tema=${tema}`;
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await p.goto(`${BASE}/tarea90/herramientas/boceto-aprobado.html?${qs}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await p.screenshot({ path: path.join(D, 'boceto', `${nombre}.png`) });
    const boceto = await medirBoceto(p);
    await p.goto(`${BASE}/tarea90/herramientas/app-real.html?${qs}`, { waitUntil: 'networkidle0' });
    await p.waitForFunction('window.listo === true', { timeout: 15000 }).catch(() => console.log('sin listo', nombre));
    await new Promise((r) => setTimeout(r, 700));
    await p.screenshot({ path: path.join(D, 'app-real', `${nombre}.png`) });
    const app = await medirApp(p);
    medidas[nombre] = { vista: { ...v, tema, w, h }, boceto, app };
    console.log(nombre);
  }
  fs.writeFileSync(path.join(D, 'medidas-comparadas.json'), JSON.stringify(medidas, null, 2));
  await br.close();
})();
