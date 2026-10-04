// Capturas de la APP IMPLEMENTADA de la tarea 87, al lado del boceto aprobado -ab86ccc-. Con los dos
// servidores arriba -el del boceto en 5182 y el de la app en 5183, ver app.html- y los videos del
// boceto hechos -sh ../../herramientas/videos.sh-: node capturas.cjs
// 412×915 dp de pie -moto g86- a 2 px por dp. La barra de estado es la medida del moto g86: 45 dp.
// Abajo, la barra de tres botones -48 dp- o la franja de gestos, que NO está medida: aquí se supone
// de 24 dp y se dice. Por cada estado, navegación y tema se capturan:
//   app-estado-N-{nav}-{tema}.png        la app implementada, a 412×915 justos;
//   boceto45-estado-N-{nav}-{tema}.png   el boceto aprobado con la misma barra de estado de 45 dp
//                                        -?estado_dp=45-, para comparar igual con igual.
// y se mide en las dos lo mismo -medidas-app.json-: que las acciones queden completas sobre la
// barra, el video, la imagen, la letra y los toques.
const puppeteer = require('/workspace/tp-shot/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..');
const ALTO = 915;
const ESTADO = 45;
const BARRA = { botones: 48, gestos: 24 };
const ESTADOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

async function seek(p) {
  await p.evaluate(async () => {
    const v = document.querySelector('video');
    if (!v) return;
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.currentTime = 3.5;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  });
  await new Promise((r) => setTimeout(r, 500));
}
const tocar = async (p, id) => { await p.click(`[data-testid="${id}"]`); await new Promise((r) => setTimeout(r, 300)); };

async function medir(p, barra) {
  return p.evaluate((ALTO, barra) => {
    const R = (el) => { const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1), width: +r.width.toFixed(1) }; };
    const raiz = document.querySelector('[data-testid="reproductor-grabacion"]');
    const arriba = document.querySelector('[data-testid="visor-arriba"]');
    const v = document.querySelector('video');
    const acciones = [...document.querySelectorAll('.accion-toma')];
    const limite = ALTO - barra;
    const ew = v.clientWidth, eh = v.clientHeight, vw = v.videoWidth, vh = v.videoHeight;
    const k = Math.min(ew / vw, eh / vh);
    const fs = (sel) => [...document.querySelectorAll(sel)].map((e) => parseFloat(getComputedStyle(e).fontSize));
    const alturas = (sel) => [...document.querySelectorAll(sel)].map((e) => +e.getBoundingClientRect().height.toFixed(1));
    const capa = document.querySelector('.capa-subtitulos'), sub = document.querySelector('.subtitulo');
    return {
      raizSeDesplaza: raiz.scrollHeight > raiz.clientHeight + 1,
      arribaSeDesplaza: arriba ? arriba.scrollHeight > arriba.clientHeight + 1 : null,
      video: R(v),
      imagen: { ancho: +(vw * k).toFixed(1), alto: +(vh * k).toFixed(1) },
      fila: acciones.length ? { top: Math.min(...acciones.map((a) => R(a).top)), bottom: Math.max(...acciones.map((a) => R(a).bottom)) } : null,
      acciones: acciones.map((a) => ({ etiqueta: a.getAttribute('aria-label'), ...R(a), desactivada: a.disabled, texto: a.textContent })),
      todasSobreLaBarra: acciones.every((a) => { const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= limite + 0.5; }),
      limite,
      letraAcciones: fs('.accion-toma span'),
      altoAcciones: alturas('.accion-toma'),
      anchoAcciones: [...document.querySelectorAll('.accion-toma')].map((e) => +e.getBoundingClientRect().width.toFixed(1)),
      altoSegmentado: alturas('.segmentado-opcion'),
      letraSegmentado: fs('.segmentado-opcion'),
      altoOpciones: alturas('.opcion-subtitulos'),
      letraMeta: fs('.texto-meta'),
      altoBotonVisor: alturas('.boton-visor'),
      altoCerrar: alturas('.cerrar-visor'),
      altoFicha: alturas('.boton-subtitulos'),
      letraSubtitulo: capa ? parseFloat(getComputedStyle(capa).fontSize) : null,
      subtituloAbajo: capa && sub ? +(capa.getBoundingClientRect().bottom - sub.getBoundingClientRect().bottom).toFixed(1) : null,
      nombreVisible: !!([...document.querySelectorAll('[data-testid="visor-arriba"] div')].find((d) => d.textContent === 'Larralde')),
      tiempoEstimado: (document.querySelector('[data-testid="tiempo-estimado-guardado"]') || {}).textContent || null,
      ficha: (document.querySelector('[data-testid="btn-subtitulos"]') || {}).textContent || null,
      aviso: (document.querySelector('.aviso-breve, [role="status"]') || {}).textContent || null
    };
  }, ALTO, barra);
}

(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--lang=es-CL', '--autoplay-policy=no-user-gesture-required'] });
  const p = await br.newPage();
  await p.setViewport({ width: 412, height: ALTO, deviceScaleFactor: 2 });
  const medidas = {};
  const app = 'http://127.0.0.1:5183/docs/pantallas/tarea87/implementacion/herramientas/app.html';
  // El boceto se sirve desde un worktree de main -c03d734 más docs/pantallas/tarea87/herramientas-
  // en el puerto 5184, para que use el ReproductorGrabacion de antes -el que se aprobó- y no el de
  // esta rama. Antes: 'http://127.0.0.1:5182/…', servido desde esta rama.
  const boceto = 'http://127.0.0.1:5184/docs/pantallas/tarea87/herramientas/boceto.html';
  for (const nav of ['botones', 'gestos']) for (const tema of ['oscuro', 'claro']) for (const e of ESTADOS) {
    // Lo recordado: estilo amarillo; Para redes en el 4 -ya elegido antes-.
    await p.evaluateOnNewDocument((e) => {
      localStorage.clear();
      localStorage.setItem('sigo_subtitulos_estilo', 'amarillo');
      localStorage.setItem('sigo_subtitulos_posicion', e === 4 ? 'redes' : 'normal');
      Object.defineProperty(navigator, 'language', { get: () => 'es-CL' });
    }, e);
    const subs = e === 6 ? 'no' : 'si';
    const extra = e === 7 ? '&guardar=colgado' : e === 8 ? '&compartir=falla' : '';
    await p.goto(`${app}?estado=${e}&tema=${tema}&nav=${nav}&subs=${subs}${extra}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 300));
    await seek(p);
    if (e === 2 || e === 3) await tocar(p, 'btn-subtitulos');
    if (e === 3) await tocar(p, 'btn-posicion-redes');
    if (e === 7 || e === 8) { await tocar(p, 'btn-compartir-nueva'); await new Promise((r) => setTimeout(r, 400)); }
    await new Promise((r) => setTimeout(r, 300));
    medidas[`app-${e}-${nav}-${tema}`] = await medir(p, BARRA[nav]);
    await p.screenshot({ path: path.join(OUT, `app-estado-${e}-${nav}-${tema}.png`) });

    await p.goto(`${boceto}?modo=propuesta&estado=${e}&tema=${tema}&nav=${nav}&subs=${subs}&estado_dp=${ESTADO}`, { waitUntil: 'networkidle0' });
    await seek(p);
    medidas[`boceto45-${e}-${nav}-${tema}`] = await medir(p, BARRA[nav]);
    await p.screenshot({ path: path.join(OUT, `boceto45-estado-${e}-${nav}-${tema}.png`) });
  }
  fs.writeFileSync(path.join(__dirname, 'medidas-app.json'), JSON.stringify(medidas, null, 1));
  const malas = Object.entries(medidas).filter(([k, m]) => k.startsWith('app') && !m.todasSobreLaBarra).map(([k]) => k);
  console.log('app con acciones fuera:', malas.length ? malas.join(', ') : 'ninguna');
  await br.close();
})();
