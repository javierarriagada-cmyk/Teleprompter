// Capturas de la app REAL -vite dev- para la tarea 82. node shots.js [filtro]
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const filtro = process.argv[2] || '';
const URL = 'http://127.0.0.1:5182/';
const fondo = (w, h, v = '') => 'data:image/png;base64,' + fs.readFileSync(`/workspace/t82shots/camara${v ? '-' + v : ''}-${w}x${h}.png`).toString('base64');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function abrir(b, { w, h, tema, puerta, fondoToma = 'detras', cam = '', esquina }) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1.5 });
  const par = tema === 'claro' ? { colorFondo: '#FFFFFF', colorLetra: '#000000' } : { colorFondo: '#000000', colorLetra: '#FFFFFF' };
  await p.evaluateOnNewDocument((aj, esq) => {
    Object.defineProperty(navigator, 'language', { get: () => 'es-CL' });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es'] });
    localStorage.setItem('teleprompter_oscuro_impuesto', 'true');
    localStorage.setItem('teleprompter_ajustes', JSON.stringify(aj));
    if (esq) localStorage.setItem('sigo_recuadro_esquina_h', esq);
  }, { tema, ...par, fontSize: 24, columnaAngosta: false, mostrarTiempo: true, fondoToma, modoCamara: 'frontal' }, esquina || null);
  await p.goto(URL, { waitUntil: 'networkidle2' });
  if (puerta === 'grabar') {
    // La cámara se simula con una imagen de fondo: el lienzo es transparente y lo de atrás se ve.
    await p.evaluate((src) => {
      const d = document.createElement('div');
      d.id = 'camara-simulada';
      d.style.cssText = `position:fixed;inset:0;z-index:-1;background:url(${src}) center/100% 100% no-repeat;pointer-events:none`;
      document.body.prepend(d);
    }, fondo(w, h, cam));
    await p.addStyleTag({ content: 'video{opacity:0 !important}' });
  }
  await p.waitForSelector(`[data-testid="${puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'}"]`, { timeout: 20000 });
  await p.click(`[data-testid="${puerta === 'leer' ? 'btn-leer-tarjeta' : 'btn-grabar-tarjeta'}"]`);
  await p.waitForSelector('[data-testid="btn-empezar-toma"]');
  await sleep(1500);
  return p;
}

async function empezar(p) {
  await p.click('[data-testid="btn-empezar-toma"]');
  await sleep(4200);
}
async function tocar(p) {
  // Un solo evento click en la superficie -como T70-: con el ratón, pointerup y click alternan dos
  // veces y los controles no quedan a la vista -en el teléfono el toque es uno-.
  await p.evaluate(() => document.querySelector('[data-testid="teleprompter-view-container"]').click());
  await sleep(700);
}
async function estado(p) {
  return p.evaluate(() => ({
    toma: document.querySelector('[data-testid="teleprompter-view-container"]')?.getAttribute('data-estado-toma'),
    sobre: document.querySelector('[data-testid="contenedor-lectura"]')?.className,
    punto: !!document.querySelector('[data-testid="punto-grabando"]'),
    controles: !!document.querySelector('[data-testid="btn-pausa-lectura"]'),
    lay: !!document.querySelector('.layout-tel-h')
  }));
}

const ESTADOS = {
  'leer-listo': async (b, o) => abrir(b, { ...o, puerta: 'leer' }),
  'leer-leyendo': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'leer' }); await empezar(p); return p; },
  'leer-leyendo-controles': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'leer' }); await empezar(p); await tocar(p); return p; },
  'grabar-listo-detras': async (b, o) => abrir(b, { ...o, puerta: 'grabar' }),
  'grabar-listo-recuadro': async (b, o) => abrir(b, { ...o, puerta: 'grabar', fondoToma: 'recuadro' }),
  'grabar-grabando-detras': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'grabar' }); await empezar(p); return p; },
  'grabar-grabando-detras-controles': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'grabar' }); await empezar(p); await tocar(p); return p; },
  'grabar-grabando-recuadro': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'grabar', fondoToma: 'recuadro' }); await empezar(p); return p; },
  'grabar-grabando-recuadro-controles': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'grabar', fondoToma: 'recuadro' }); await empezar(p); await tocar(p); return p; },
  'grabar-pausa-tacho': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'grabar' }); await empezar(p); await tocar(p); await p.click('[data-testid="btn-pausa-lectura"]'); await sleep(700); return p; },
  'grabar-listo-detras-pared': async (b, o) => abrir(b, { ...o, puerta: 'grabar', cam: 'pared' }),
  'grabar-grabando-detras-pared': async (b, o) => { const p = await abrir(b, { ...o, puerta: 'grabar', cam: 'pared' }); await empezar(p); return p; },
  'vertical-leer-listo': async (b, o) => abrir(b, { ...o, puerta: 'leer' }),
  'vertical-grabar-listo-detras-pared': async (b, o) => abrir(b, { ...o, puerta: 'grabar', cam: 'pared' }),
};

(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  fs.mkdirSync('/workspace/t82shots/app', { recursive: true });
  const tamanos = [[800, 360], [844, 390]];
  for (const [nombre, fn] of Object.entries(ESTADOS)) {
    if (filtro && !nombre.includes(filtro)) continue;
    const vertical = nombre.startsWith('vertical');
    for (const [w, h] of vertical ? [[390, 844]] : tamanos) for (const tema of ['oscuro', 'claro']) {
      if (vertical && !nombre.includes('pared') && false) continue;
      const archivo = `/workspace/t82shots/app/${nombre}-${w}x${h}-${tema}.png`;
      const p = await fn(b, { w, h, tema });
      // Con el recuadro, la cámara nativa se pone EN el hueco medido -onRect, setPreviewSize-: la
      // imagen simulada se achica al rectángulo del recuadro, como en el teléfono.
      await p.evaluate(() => {
        const r = document.querySelector('[data-testid="recuadro-camara"]');
        const d = document.getElementById('camara-simulada');
        if (!r || !d) return;
        const b = r.getBoundingClientRect();
        Object.assign(d.style, { inset: 'auto', left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
      });
      await sleep(150);
      await p.screenshot({ path: archivo });
      console.log(nombre, w, h, tema, JSON.stringify(await estado(p)));
      await p.close();
    }
  }
  await b.close();
})();
