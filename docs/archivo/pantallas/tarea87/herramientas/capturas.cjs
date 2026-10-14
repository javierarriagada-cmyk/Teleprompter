// Capturas del boceto -tarea 87-. Con el servidor del boceto en 127.0.0.1:5182 -ver boceto.html- y
// los videos hechos -sh videos.sh-: node capturas.cjs
// Teléfono de pie, 412×915 dp -moto g86, 1080×2400-, a 2 px por dp, con las barras del sistema
// dibujadas encima.
// -04-10, segunda vuelta- Dos navegaciones -botones: 48 dp; gestos: 24 dp-. El boceto se captura a
// 412×915 justos: las acciones tienen que verse completas sin desplazar, y esto lo VERIFICA en cada
// captura -medidas-capturas.json-. "Hoy" se sigue capturando entero, con la raya roja donde termina
// la pantalla, para que se vea lo que hoy queda abajo.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..');
const ALTO = 915;
const PROPUESTA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const HOY = [1, 5, 6, 9];
const BARRA = { botones: 48, gestos: 24 };
const soloResumen = process.argv.includes('--resumen');

async function preparar(p, url) {
  await p.setViewport({ width: 412, height: ALTO, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  // El video en el segundo 3,5: ahí el registro de la toma 008a7133 dice "que podríamos llamar /
  // la concepción trágica", un subtítulo de dos renglones -el más alto que hay-.
  await p.evaluate(async () => {
    const v = document.querySelector('video');
    if (!v) return;
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.currentTime = 3.5;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  });
  await new Promise((r) => setTimeout(r, 600));
}

// Lo que se verifica: las cuatro -o dos- acciones completas sobre la barra, sin desplazar; y que
// letra y toques no bajen de lo de hoy.
async function medir(p, barra) {
  return p.evaluate((ALTO, barra) => {
    const R = (el) => { const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1), width: +r.width.toFixed(1) }; };
    const raiz = document.querySelector('[data-testid="reproductor-grabacion"]');
    const arriba = document.querySelector('[data-testid="visor-arriba"]');
    const v = document.querySelector('video');
    const acciones = [...document.querySelectorAll('.accion-toma')];
    const limite = ALTO - barra;
    const img = (() => {
      const ew = v.clientWidth, eh = v.clientHeight, vw = v.videoWidth, vh = v.videoHeight;
      const k = Math.min(ew / vw, eh / vh);
      return { ancho: +(vw * k).toFixed(1), alto: +(vh * k).toFixed(1) };
    })();
    const fs = (sel) => [...document.querySelectorAll(sel)].map((e) => parseFloat(getComputedStyle(e).fontSize));
    const alturas = (sel) => [...document.querySelectorAll(sel)].map((e) => +e.getBoundingClientRect().height.toFixed(1));
    return {
      raizSeDesplaza: raiz.scrollHeight > raiz.clientHeight + 1,
      arribaSeDesplaza: arriba ? arriba.scrollHeight > arriba.clientHeight + 1 : null,
      arribaAltoTotal: arriba ? arriba.scrollHeight : null,
      video: R(v),
      imagen: img,
      fila: acciones.length ? { top: Math.min(...acciones.map((a) => R(a).top)), bottom: Math.max(...acciones.map((a) => R(a).bottom)) } : null,
      acciones: acciones.map((a) => ({ etiqueta: a.getAttribute('aria-label'), ...R(a), desactivada: a.disabled })),
      todasSobreLaBarra: acciones.every((a) => { const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= limite + 0.5; }),
      limite,
      letraAcciones: fs('.accion-toma span'),
      altoAcciones: alturas('.accion-toma'),
      altoSegmentado: alturas('.segmentado-opcion'),
      altoOpciones: alturas('.opcion-subtitulos'),
      letraSegmentado: fs('.segmentado-opcion'),
      letraMeta: fs('.texto-meta'),
      altoBotonVisor: alturas('.boton-visor'),
      altoCerrar: alturas('.cerrar-visor')
    };
  }, ALTO, barra);
}

async function rayaRoja(p) {
  const alto = await p.evaluate(() => document.querySelector('[data-testid="reproductor-grabacion"]').scrollHeight);
  if (alto > ALTO) {
    await p.setViewport({ width: 412, height: alto, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 400));
    await p.evaluate((ALTO) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:0;right:0;top:${ALTO}px;border-top:2px dashed #e5484d;z-index:10000`;
      const s = document.createElement('span');
      s.textContent = 'fin de la pantalla · lo de abajo se ve desplazando';
      s.style.cssText = 'position:absolute;right:6px;top:2px;color:#e5484d;font:700 11px sans-serif;background:rgba(0,0,0,.6);padding:1px 4px';
      d.appendChild(s);
      document.body.appendChild(d);
    }, ALTO);
  }
  return alto;
}

(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL', '--autoplay-policy=no-user-gesture-required'] });
  const p = await br.newPage();
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'es-CL' });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] });
    localStorage.setItem('sigo_subtitulos_estilo', 'amarillo');
  });
  const base = 'http://127.0.0.1:5182/docs/pantallas/tarea87/herramientas/boceto.html';
  const medidas = {};
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) {
    if (soloResumen) {
      for (const e of [1, 3]) {
        await preparar(p, `${base}?modo=propuesta&estado=${e}&tema=${tema}&nav=${nav}&subs=si&guias=si`);
        await p.screenshot({ path: path.join(OUT, `guias-estado-${e}-${nav}-${tema}.png`) });
      }
      continue;
    }
    for (const e of PROPUESTA) {
      const subs = e === 6 ? 'no' : 'si';
      await preparar(p, `${base}?modo=propuesta&estado=${e}&tema=${tema}&nav=${nav}&subs=${subs}`);
      medidas[`boceto-${e}-${nav}-${tema}`] = await medir(p, BARRA[nav]);
      await p.screenshot({ path: path.join(OUT, `boceto-estado-${e}-${nav}-${tema}.png`) });
    }
    for (const e of HOY) {
      const subs = e === 6 ? 'no' : 'si';
      await preparar(p, `${base}?modo=hoy&estado=${e}&tema=${tema}&nav=${nav}&subs=${subs}`);
      const m = await p.evaluate((ALTO, barra) => {
        const acc = [...document.querySelectorAll('.accion-toma')].map((a) => a.getBoundingClientRect());
        const v = document.querySelector('video').getBoundingClientRect();
        return { video: { height: v.height, width: v.width }, fila: { top: Math.min(...acc.map((r) => r.top)), bottom: Math.max(...acc.map((r) => r.bottom)) }, todasSobreLaBarra: acc.every((r) => r.top >= 0 && r.bottom <= ALTO - barra + 0.5) };
      }, ALTO, BARRA[nav]);
      m.altoRaiz = await rayaRoja(p);
      medidas[`hoy-${e}-${nav}-${tema}`] = m;
      await p.screenshot({ path: path.join(OUT, `hoy-estado-${e}-${nav}-${tema}.png`) });
    }
  }
  if (!soloResumen) fs.writeFileSync(path.join(__dirname, 'medidas-capturas.json'), JSON.stringify(medidas, null, 1));
  const malas = Object.entries(medidas).filter(([k, m]) => k.startsWith('boceto') && !m.todasSobreLaBarra).map(([k]) => k);
  console.log('boceto con acciones fuera:', malas.length ? malas.join(', ') : 'ninguno');
  await br.close();
})();
