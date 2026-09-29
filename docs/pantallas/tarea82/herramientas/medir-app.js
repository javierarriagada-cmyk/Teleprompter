// Contraste de la regla E en la APP REAL -tarea 82-. Mismo método que bocetos/medir-contraste.js:
// el glifo "█" a 24 px con el estilo real -acá, el CSS de la app: .lectura-sobre-imagen de
// contenedor-lectura con su --fondo-lectura-, sobre un "video" de color liso, y se compara el centro
// del glifo con el píxel 1 px CSS afuera de su borde. DPR 2. Fuera del panel de lectura.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAREJAS = {
  'Negro con blanco': { colorFondo: '#000000', colorLetra: '#FFFFFF', tramos: { celeste: '#8FB8DE', ámbar: '#F0C070', verde: '#9CC5A1' } },
  'Negro con ámbar': { colorFondo: '#000000', colorLetra: '#F5C24B', tramos: { celeste: '#8FB8DE', ámbar: '#F0C070', verde: '#9CC5A1' } },
  'Blanco con negro': { colorFondo: '#FFFFFF', colorLetra: '#000000', tramos: { celeste: '#2B679E', ámbar: '#8F5B00', verde: '#3C7347' } },
};
const VIDEOS = { 'pared blanca': '#FFFFFF', 'gris 50 %': '#808080', 'escena oscura': '#000000' };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const filas = [];
  for (const [pn, par] of Object.entries(PAREJAS)) for (const w of ['800x360', '390x844']) {
    const [W, H] = w.split('x').map(Number);
    const p = await b.newPage();
    await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await p.evaluateOnNewDocument((aj) => {
      localStorage.setItem('teleprompter_oscuro_impuesto', 'true');
      localStorage.setItem('teleprompter_ajustes', JSON.stringify(aj));
    }, { tema: 'oscuro', colorFondo: par.colorFondo, colorLetra: par.colorLetra, fontSize: 24, columnaAngosta: false, mostrarTiempo: false, fondoToma: 'detras' });
    await p.goto('http://127.0.0.1:5182/', { waitUntil: 'networkidle2' });
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'camara-simulada'; d.style.cssText = 'position:fixed;inset:0;z-index:-1'; document.body.prepend(d); });
    await p.addStyleTag({ content: 'video{opacity:0 !important}' });
    await p.click('[data-testid="btn-grabar-tarjeta"]');
    await p.waitForFunction(() => (document.querySelector('[data-testid="contenedor-lectura"]')?.className || '').includes('lectura-sobre-imagen'), { timeout: 15000 });
    await sleep(800);
    const estilos = { texto: { color: par.colorLetra }, ...Object.fromEntries(Object.entries(par.tramos).map(([k, v]) => [k, { color: v }])), acotación: { acot: true } };
    // Los glifos van ADENTRO de contenedor-lectura -heredan el halo E de la hoja de estilos- y abajo
    // del panel de lectura. La acotación usa la clase real acotacion-lectura con su estilo en línea
    // de renglones.tsx -opacity .5, #aaa-: la hoja de estilos tiene que ganarle.
    await p.evaluate((estilos, H, W) => {
      const c = document.querySelector('[data-testid="contenedor-lectura"]');
      const col = c.querySelector('[data-testid="columna-texto"]');
      const x0 = col.offsetLeft;
      const d = document.createElement('div');
      d.id = 'glifos';
      d.style.cssText = `position:absolute;left:${x0}px;top:${c.scrollTop + (H > W ? Math.round(H * 0.5) : H - 70)}px;font-family:"DejaVu Sans";font-size:24px;line-height:1;display:flex;gap:40px`;
      d.innerHTML = Object.entries(estilos).map(([k, e]) => e.acot
        ? `<span data-k="${k}" class="acotacion-lectura" style="opacity:0.5;font-style:italic;color:#aaa">█</span>`
        : `<span data-k="${k}" style="color:${e.color}">█</span>`).join('');
      c.appendChild(d);
    }, estilos, H, W);
    for (const [vn, v] of Object.entries(VIDEOS)) {
      await p.evaluate((v) => { document.getElementById('camara-simulada').style.background = v; }, v);
      await sleep(150);
      const shot = await p.screenshot({ encoding: 'base64' });
      const res = await p.evaluate(async (shot) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
        const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
        const cr = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
        const px = (X, Y) => [...x.getImageData(X, Y, 1, 1).data].slice(0, 3);
        return [...document.querySelectorAll('#glifos span')].map((s) => {
          const r = s.getBoundingClientRect(); const cy = Math.round(r.top + r.bottom); const cx = Math.round(r.left + r.right);
          const core = px(cx, cy);
          let X = cx; while (X < cv.width - 4) { const q = px(X, cy); if (Math.abs(q[0] - core[0]) + Math.abs(q[1] - core[1]) + Math.abs(q[2] - core[2]) > 24) break; X++; }
          const anillo = px(X + 2, cy);
          return { k: s.dataset.k, core, anillo, ratio: +cr(core, anillo).toFixed(2), sombra: getComputedStyle(s).textShadow.split('),').length };
        });
      }, shot);
      for (const r of res) filas.push({ pareja: pn, vista: w === '800x360' ? 'horizontal 800×360' : 'vertical 390×844', video: vn, estilo: r.k, ratio: r.ratio, sombras: r.sombra, core: r.core.join(','), anillo: r.anillo.join(',') });
    }
    await p.close();
  }
  await b.close();
  require('fs').writeFileSync('/workspace/t82shots/contraste-app.json', JSON.stringify(filas, null, 1));
  const min = {};
  for (const f of filas) { const k = `${f.pareja} | ${f.vista}`; min[k] = min[k] || []; min[k].push(`${f.estilo}/${f.video}: ${f.ratio}`); }
  for (const [k, v] of Object.entries(min)) console.log(k, '\n   ', v.join('  ·  '));
})();
