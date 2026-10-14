// svg-de-pantalla.mjs — convierte una pantalla web en un SVG por capas (para Penpot).
// Uso (desde la raíz del repo, con el servidor de desarrollo corriendo):
//   npx -y -p puppeteer-core@23 node docs/pantallas/portada/svg-de-pantalla.mjs \
//     --url http://127.0.0.1:5173/ --out salida.svg [--png salida.png] [--width 412] [--height 915] \
//     [--setup ./mi-setup.mjs] [--chrome /usr/bin/google-chrome] [--dpr 2.625]
// --setup: módulo con `export default async (page) => {...}` (se llama antes y después de cargar:
//   page.__fase === 'antes' | 'despues'). Las coordenadas del SVG son siempre CSS px (DPR 1).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split(/\s*--/).filter(Boolean).map(s => { const [k, ...v] = s.split(' '); return [k, v.join(' ')]; }));
const W = +(args.width || 412), H = +(args.height || 915);
const binDir = (process.env.PATH || '').split(':').find(p => p.endsWith(path.join('node_modules', '.bin')));
const req = createRequire(binDir ? path.join(binDir, '..', 'x.js') : import.meta.url);
const puppeteer = req('puppeteer-core');
const setup = args.setup ? (await import(pathToFileURL(path.resolve(args.setup)).href)).default : null;

const b = await puppeteer.launch({ executablePath: args.chrome || '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL'] });
const page = await b.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: +(args.dpr || 2.625), isMobile: true, hasTouch: true });
if (setup) { page.__fase = 'antes'; await setup(page); }
await page.goto(args.url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));
if (setup) { page.__fase = 'despues'; await setup(page); }
if (args.png) await page.screenshot({ path: args.png });

const svg = await page.evaluate((W, H) => {
  const cv = document.createElement('canvas').getContext('2d');
  const hex = c => { // -> [#rrggbb, alpha]
    if (!c || c === 'transparent') return null;
    const cs = c.match(/^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\)/);
    if (cs) { let a = cs[4] === undefined ? 1 : (cs[4].endsWith('%') ? parseFloat(cs[4]) / 100 : +cs[4]); if (!a) return null;
      return ['#' + cs.slice(1, 4).map(n => Math.round(Math.min(1, Math.max(0, +n)) * 255).toString(16).padStart(2, '0')).join(''), a]; }
    cv.fillStyle = '#000'; cv.fillStyle = c; const f = cv.fillStyle;
    if (f.startsWith('#')) return [f, 1];
    const m = f.match(/[\d.]+/g); if (!m) return null;
    const a = m[3] === undefined ? 1 : +m[3]; if (a === 0) return null;
    return ['#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''), a];
  };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const usados = {};
  const slug = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const uid = base => { base = base || 'objeto'; if (/^\d/.test(base)) base = 'n-' + base; usados[base] = (usados[base] || 0) + 1; return usados[base] > 1 ? `${base}-${usados[base]}` : base; };
  const nombre = (el, pref) => {
    const t = el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.id || (el.textContent || '').trim().slice(0, 30) || (typeof el.className === 'string' ? el.className.split(' ')[0] : '') || el.tagName;
    return uid((pref ? pref + '-' : '') + slug(t));
  };
  const visible = (el, r) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; };
  const notas = new Set();
  const n2 = v => Math.round(v * 100) / 100;
  const pintar = (c, attr) => { const h = hex(c); return h ? ` ${attr}="${h[0]}"${h[1] < 1 ? ` ${attr}-opacity="${n2(h[1])}"` : ''}` : null; };
  let objetos = 0, grupos = 0;
  const filtros = [];
  const caja = (el, s, r) => {
    const bg = s.backgroundColor, bw = parseFloat(s.borderTopWidth) || 0, sh = s.boxShadow !== 'none';
    const fill = pintar(bg, 'fill'), stroke = bw && s.borderTopStyle !== 'none' ? pintar(s.borderTopColor, 'stroke') : null;
    if (s.backgroundImage !== 'none') notas.add('degradado/imagen de fondo (aprox. color plano)');
    if (s.backdropFilter && s.backdropFilter !== 'none') notas.add('backdrop-filter/blur (omitido)');
    if (!fill && !stroke && !sh) return '';
    let f = '';
    if (sh) {
      const m = s.boxShadow.match(/(rgba?\([^)]+\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);
      if (m) { const h = hex(m[1]); if (h) { const id = 'sombra-' + filtros.length; filtros.push(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="${m[2]}" dy="${m[3]}" stdDeviation="${n2(+m[4] / 2)}" flood-color="${h[0]}" flood-opacity="${n2(h[1])}"/></filter>`); f = ` filter="url(#${id})"`; notas.add('box-shadow -> feDropShadow (solo la primera sombra)'); } }
    }
    objetos++;
    const rx = Math.min(parseFloat(s.borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
    const o = +s.opacity < 1 ? ` opacity="${n2(+s.opacity)}"` : '';
    return `<rect id="${nombre(el, 'caja')}" x="${n2(r.left + bw / 2)}" y="${n2(r.top + bw / 2)}" width="${n2(Math.max(0, r.width - bw))}" height="${n2(Math.max(0, r.height - bw))}"${rx ? ` rx="${n2(rx)}"` : ''}${fill || ' fill="none"'}${stroke ? stroke + ` stroke-width="${bw}"` : ''}${o}${f}/>`;
  };
  const textos = (nodo, s) => {
    const rg = document.createRange(); rg.selectNodeContents(nodo);
    const txt = nodo.textContent; const lineas = [];
    // agrupar caracteres por línea con rects de Range
    for (let i = 0; i < txt.length; i++) {
      rg.setStart(nodo, i); rg.setEnd(nodo, i + 1); const r = rg.getClientRects()[0]; if (!r || !r.width && txt[i] !== ' ') continue;
      let l = lineas.find(l => Math.abs(l.top - r.top) < 2);
      if (!l) { l = { top: r.top, bottom: r.bottom, left: r.left, t: '' }; lineas.push(l); }
      l.t += txt[i]; l.left = Math.min(l.left, r.left);
    }
    const fs = parseFloat(s.fontSize); cv.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const mt = cv.measureText('Hg'); const asc = mt.fontBoundingBoxAscent || fs * 0.8, desc = mt.fontBoundingBoxDescent || fs * 0.2;
    const fill = pintar(s.color, 'fill') || ' fill="#000000"';
    const ls = s.letterSpacing !== 'normal' ? ` letter-spacing="${parseFloat(s.letterSpacing)}"` : '';
    const tt = s.textTransform;
    return lineas.filter(l => l.t.trim() && l.bottom > 0 && l.top < H).map(l => {
      let t = l.t.replace(/\s+/g, ' ').trim(); if (tt === 'uppercase') t = t.toUpperCase(); if (tt === 'lowercase') t = t.toLowerCase();
      const base = l.top + ((l.bottom - l.top) - (asc + desc)) / 2 + asc;
      objetos++;
      return `<text id="${uid('texto-' + slug(t).slice(0, 30))}" x="${n2(l.left)}" y="${n2(base)}" font-family="${esc(s.fontFamily.replace(/"/g, "'"))}" font-size="${fs}" font-weight="${s.fontWeight}"${s.fontStyle === 'italic' ? ' font-style="italic"' : ''}${ls}${fill}${+s.opacity < 1 ? ` opacity="${n2(+s.opacity)}"` : ''}>${esc(t)}</text>`;
    }).join('\n');
  };
  const icono = (el, r) => {
    const c = el.cloneNode(true); const col = hex(getComputedStyle(el).color);
    const fix = (orig, cl) => { // resolver currentColor y colores computados
      const s = getComputedStyle(orig);
      for (const a of ['fill', 'stroke']) {
        const v = cl.getAttribute(a);
        if (v && /currentColor/i.test(v)) cl.setAttribute(a, hex(s.color)?.[0] || '#000000');
        else if (v && v !== 'none' && !v.startsWith('url')) { const h = hex(s[a]) || hex(v); if (h) cl.setAttribute(a, h[0]); }
        else if (!v && orig !== el && s[a] && s[a] !== 'none' && !s[a].startsWith('url') && /var\(|fill|stroke/.test(orig.getAttribute('style') || '') ) { const h = hex(s[a]); if (h) cl.setAttribute(a, h[0]); }
      }
      cl.removeAttribute('class'); cl.removeAttribute('style');
      [...orig.children].forEach((ch, i) => fix(ch, cl.children[i]));
    };
    fix(el, c);
    const s = getComputedStyle(el);
    if (!c.getAttribute('fill')) c.setAttribute('fill', s.fill && s.fill !== 'none' ? (hex(s.fill)?.[0] || 'none') : 'none');
    if (!c.getAttribute('stroke') && s.stroke && s.stroke !== 'none') c.setAttribute('stroke', hex(s.stroke)?.[0] || (col ? col[0] : '#000000'));
    c.setAttribute('id', nombre(el.closest('[data-testid],[aria-label],button') || el, 'icono'));
    c.setAttribute('x', n2(r.left)); c.setAttribute('y', n2(r.top)); c.setAttribute('width', n2(r.width)); c.setAttribute('height', n2(r.height));
    if (!c.getAttribute('viewBox')) c.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    c.removeAttribute('aria-hidden'); objetos++;
    let html0 = new XMLSerializer().serializeToString(c).replace(/ xmlns="[^"]*"/g, '');
    if (s.transform && s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
      const cx = n2(r.left + r.width / 2), cy = n2(r.top + r.height / 2), m = s.transform.match(/matrix\(([^)]+)\)/);
      if (m) { const [a, b2, c2, d] = m[1].split(',').map(Number); html0 = `<g transform="translate(${cx} ${cy}) matrix(${a} ${b2} ${c2} ${d} 0 0) translate(${-cx} ${-cy})">${html0}</g>`; }
    }
    let html = html0;
    if (0) html = new XMLSerializer().serializeToString(c).replace(/ xmlns="[^"]*"/g, '');
    return html.replace(/rgba?\([^)]*\)/g, m => hex(m)?.[0] || '#000000').replace(/var\([^)]*\)/g, '#000000');
  };
  const recorrer = (el, prof) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!visible(el, r) && el !== document.body) { if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return ''; }
    if (el instanceof SVGSVGElement) return r.width && r.top < H && r.bottom > 0 ? icono(el, r) : '';
    if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(el.tagName)) {
      if (!r.width || r.top >= H || r.bottom <= 0) return '';
      objetos += 2; notas.add('imágenes/vídeos/miniaturas -> rect gris con nombre');
      const n = el.getAttribute('alt') || el.getAttribute('aria-label') || el.closest('[data-testid]')?.getAttribute('data-testid') || el.tagName.toLowerCase();
      const fsz = Math.max(8, Math.min(12, r.height / 4));
      return `<g id="${uid('miniatura-' + slug(n))}"><rect x="${n2(r.left)}" y="${n2(r.top)}" width="${n2(r.width)}" height="${n2(r.height)}" rx="${parseFloat(s.borderTopLeftRadius) || 0}" fill="#808080"/><text x="${n2(r.left + 4)}" y="${n2(r.top + r.height / 2 + fsz / 3)}" font-family="sans-serif" font-size="${fsz}" fill="#ffffff">${esc(n.slice(0, 30))}</text></g>`;
    }
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) return '';
    const partes = [];
    if (el !== document.body && el !== document.documentElement) { const c = caja(el, s, r); if (c) partes.push(c); }
    else { const f = pintar(s.backgroundColor, 'fill'); if (f) { objetos++; partes.push(`<rect id="${uid('fondo-pagina')}" x="0" y="0" width="${W}" height="${H}"${f}/>`); } }
    for (const ps of ['::before']) {
      const p = getComputedStyle(el, ps);
      if (p.content !== 'none' && p.content !== 'normal' && p.display !== 'none') {
        const pw = parseFloat(p.width) || r.width, ph = parseFloat(p.height) || r.height, f = pintar(p.backgroundColor, 'fill');
        if (f && el !== document.body) { objetos++; notas.add('pseudo-elemento ::before -> rect centrado (posición aproximada)');
          partes.push(`<rect id="${nombre(el, 'fondo')}" x="${n2(r.left + (r.width - pw) / 2)}" y="${n2(r.top + (r.height - ph) / 2)}" width="${n2(pw)}" height="${n2(ph)}" rx="${n2(Math.min(parseFloat(p.borderTopLeftRadius) || 0, pw / 2))}"${f}/>`); }
      }
    }
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3 && ch.textContent.trim()) { const t = textos(ch, s); if (t) partes.push(t); }
      else if (ch.nodeType === 1) { const sub = recorrer(ch, prof + 1); if (sub) partes.push(sub); }
    }
    if (el.tagName === 'INPUT' && el.value && el.type !== 'checkbox' && el.type !== 'range') {
      objetos++; partes.push(`<text id="${uid('valor-' + slug(el.value))}" x="${n2(r.left + parseFloat(s.paddingLeft))}" y="${n2(r.top + r.height / 2 + parseFloat(s.fontSize) / 3)}" font-family="${esc(s.fontFamily.replace(/"/g, "'"))}" font-size="${parseFloat(s.fontSize)}"${pintar(s.color, 'fill') || ''}>${esc(el.value)}</text>`);
    }
    if (!partes.length) return '';
    // agrupar: elementos con testid/aria-label/rol semántico o con varios hijos dibujados
    const semantico = el.hasAttribute('data-testid') || el.hasAttribute('aria-label') || /^(HEADER|MAIN|SECTION|NAV|UL|OL|LI|BUTTON|FOOTER|ARTICLE|LABEL)$/.test(el.tagName);
    let clip = '';
    if (el !== document.body && (s.overflowX !== 'visible' || s.overflowY !== 'visible') && partes.length > 1) {
      const id = 'recorte-' + filtros.length; const rx = parseFloat(s.borderTopLeftRadius) || 0;
      filtros.push(`<clipPath id="${id}"><rect x="${n2(r.left)}" y="${n2(r.top)}" width="${n2(r.width)}" height="${n2(r.height)}"${rx ? ` rx="${n2(rx)}"` : ''}/></clipPath>`); clip = ` clip-path="url(#${id})"`;
    }
    if (((semantico || partes.length > 1) && el !== document.body) || clip) { grupos++; return `<g id="${nombre(el, el.hasAttribute('data-testid') ? '' : 'grupo')}"${clip}>\n${partes.join('\n')}\n</g>`; }
    return partes.join('\n');
  };
  const cuerpo = recorrer(document.body, 0);
  const fuentes = [...new Set([...document.querySelectorAll('*')].map(e => getComputedStyle(e).fontFamily))];
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<!-- generado por svg-de-pantalla.mjs desde ${esc(location.href)}; fuentes no incrustadas: ${esc(fuentes.join(' | ').replace(/--/g, '-'))} -->\n${filtros.length ? `<defs>${filtros.join('')}</defs>\n` : ''}<g id="pantalla">\n${cuerpo}\n</g>\n</svg>\n`, objetos, grupos, notas: [...notas] };
}, W, H);
writeFileSync(args.out, svg.svg);
console.log(JSON.stringify({ out: args.out, objetos: svg.objetos, grupos: svg.grupos, notas: svg.notas }));
await b.close();
