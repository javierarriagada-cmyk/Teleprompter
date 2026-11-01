// ARMA EL SITIO sigoteleprompter.com -sitio/public/-. 27-09-2026, docs/el-sitio.md version 2.
//
//   node sitio/armar.mjs      (desde la carpeta Teleprompter, despues de npm ci)
//
// Se arma con un script, y no escribiendo el HTML a mano, por tres cosas que tienen que salir
// de la aplicacion y no de una copia que se separe:
//
//   1. LA MARCA sale del trazo de src/components/trazoMarca.ts: el logo de la pagina y el de
//      la aplicacion son la misma forma. trazoMarca.ts se LEE, no se edita.
//   2. LA LECTURA del telefono sale de correr la conduccion de la aplicacion -seguidor,
//      avance- y sus subtitulos AQUI, al armar -sitio/fuente/lectura.js-. A la pagina llega
//      solo un JSON de numeros. Ningun codigo de la aplicacion viaja a la pagina -todo
//      JavaScript publicado se puede leer-: ver la comprobacion del empaquetado, abajo.
//   3. LAS LETRAS son las de la aplicacion -@fontsource, las mismas que importa src/main.tsx-,
//      servidas desde el propio dominio, igual que GSAP y Lenis -sitio/fuente/vendor-: la
//      pagina no le pide nada a otro servidor, y eso es parte de lo que dice /privacidad.
//
//   4. LOS DOS IDIOMAS salen del mismo armado: las mismas plantillas y un archivo de textos por
//      idioma -sitio/fuente/textos/es.js y en.js-. Espanol en /, /privacidad y /soporte;
//      ingles en /en, /en/privacy y /en/support. La grabacion real de cada idioma, cuando
//      exista, va en textos/<idioma>.js, lectura.toma: ver sitio/fuente/lectura.js, "LA
//      LECTURA DEFINITIVA".
//
//   4. (-portugues-sitio, 2026-10-24-) LOS TRES IDIOMAS: se suma el portugues de Brasil, con el
//      mismo armado y las mismas plantillas -textos/pt.js-: /pt, /pt/privacidade, /pt/suporte,
//      /pt/ajuda y /pt/excluir-conta, las rutas que ya usa la app en portugues. El punto 4 de
//      arriba queda como estaba, y vale igual para los tres.
//
// Vite -que ya esta en el proyecto- solo se usa aca: para entender el TypeScript de src/ al
// calcular la lectura, y para juntar en un archivo el JavaScript de la pagina.
// Lo armado se sube al repositorio: Firebase publica sitio/public tal cual.
//
// NO PUBLICA. Publicar es de Javier: primero un canal de prueba,
// `firebase hosting:channel:deploy prueba` desde sitio/, y al dominio con su OK.

import fs from 'node:fs'
import path from 'node:path'
// -18-10-2026- pathToFileURL: en Windows import() no acepta C:\... -ver abajo, los idiomas-.
// Antes: import { fileURLToPath } from 'node:url'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build, createServer } from 'vite'

// Una sola decisión habilita la tienda, sus metadatos y su aviso legal; queda apagada hasta aprobación.
const PLAY_PUBLICADO = false

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FUENTE = path.join(RAIZ, 'sitio/fuente')
const PUBLICO = path.join(RAIZ, 'sitio/public')
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8')

// ---------- 1. la marca ----------

const t = leer('src/components/trazoMarca.ts')
const cadena = (n) => {
  const m = t.match(new RegExp(`export const ${n} = '([^']+)'`))
  if (!m) throw new Error(`src/components/trazoMarca.ts ya no exporta ${n} como cadena: revisar armar.mjs.`)
  return m[1]
}
const objeto = (n) => {
  const m = t.match(new RegExp(`export const ${n} = (\\{[^}]+\\})`))
  if (!m) throw new Error(`src/components/trazoMarca.ts ya no exporta ${n} como objeto: revisar armar.mjs.`)
  return JSON.parse(m[1].replace(/(\w+):/g, '"$1":'))
}
const nombre = cadena('MARCA_TRAZO_NOMBRE')
const punto = objeto('MARCA_PUNTO')
const caja = objeto('MARCA_CAJA')
// "Sig" y el punto rojo, sin el lema: "TELEPROMPTER" es solo del arranque -trazoMarca.ts,
// "esa palabra despues no acompana a Sigo"-.
const vb = [caja.x, caja.y, caja.ancho, caja.alto].map((n) => +n.toFixed(2)).join(' ')
// Con resplandor: el punto es la luz de grabar encendida -docs/el-sitio.md, E0-. Cada marca
// lleva su propio filtro: dos ids iguales en la misma pagina se pisan.
function marca(id, { resplandor = true, etiqueta = true, rotulo = '' } = {}) {
  const brillo = resplandor
    ? `<defs><filter id="${id}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="16"/></filter></defs><circle class="resplandor" cx="${punto.cx}" cy="${punto.cy}" r="${(punto.r * 1.35).toFixed(2)}" filter="url(#${id})"/>`
    : ''
  const aria = etiqueta ? `role="img" aria-label="${rotulo}"` : 'aria-hidden="true"'
  return `<svg class="marca-svg" viewBox="${vb}" ${aria}>${brillo}<path d="${nombre}" fill="currentColor"/><circle class="punto" cx="${punto.cx}" cy="${punto.cy}" r="${punto.r}"/></svg>`
}

// ---------- los idiomas ----------

// UNA SOLA FUENTE PARA LOS TEXTOS -27-09-2026-: sitio/fuente/textos/<idioma>.js. Las plantillas
// son las mismas para los dos idiomas; cada texto es una marca {{clave}}. Asi no hay dos paginas
// copiadas a mano que se separen: una frase nueva va en los dos archivos, o el armado se para.
const IDIOMAS = {}
// -portugues-sitio, 2026-10-24- Suma el portugues de Brasil. Antes: for (const idioma of ['es', 'en']) {
for (const idioma of ['es', 'en', 'pt']) {
  // -18-10-2026- EN WINDOWS: import() con una ruta C:\... falla -«Only URLs with a scheme in: file,
  // data, and node are supported»-; con la dirección file:// anda en los dos sistemas. El sitio no se
  // podía armar en el PC de Javier. Antes: IDIOMAS[idioma] = (await import(path.join(FUENTE, 'textos', `${idioma}.js`))).default
  IDIOMAS[idioma] = (await import(pathToFileURL(path.join(FUENTE, 'textos', `${idioma}.js`)).href)).default
}
// No se cambian textos legales ni rutas al activar Play; solo las descripciones de portada.
if (PLAY_PUBLICADO) for (const t of Object.values(IDIOMAS)) {
  t.meta = { ...t.meta, descripcion: t.nuevaPortada.metaPublicada, ogDescripcion: t.nuevaPortada.ogPublicada }
}
const hojas = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? hojas(v, `${pre}${k}.`) : [`${pre}${k}`]))
// -portugues-sitio, 2026-10-24- LAS CLAVES ENTRE LOS TRES ARCHIVOS, no solo entre es y en: cada idioma tiene
// que tener todas las claves que tenga cualquiera de los otros. Antes:
// {
//   const es = new Set(hojas(IDIOMAS.es))
//   const en = new Set(hojas(IDIOMAS.en))
//   const faltan = [...[...es].filter((k) => !en.has(k)).map((k) => `en: ${k}`), ...[...en].filter((k) => !es.has(k)).map((k) => `es: ${k}`)]
//   if (faltan.length) throw new Error(`Los textos de los dos idiomas no tienen las mismas claves. Falta ${faltan.join(', ')}.`)
// }
{
  const claves = Object.fromEntries(Object.entries(IDIOMAS).map(([i, t]) => [i, new Set(hojas(t))]))
  const todas = new Set(Object.values(claves).flatMap((c) => [...c]))
  const faltan = Object.entries(claves).flatMap(([i, c]) => [...todas].filter((k) => !c.has(k)).map((k) => `${i}: ${k}`))
  if (faltan.length) throw new Error(`Los textos de los tres idiomas no tienen las mismas claves. Falta ${faltan.join(', ')}.`)
}

const DOMINIO = 'https://sigoteleprompter.com'
// -sitio-cuenta, 20-10-2026- Suma borrarCuenta. Antes: const PAGINAS = ['portada', 'privacidad', 'soporte', 'ayuda']
const PAGINAS = ['portada', 'privacidad', 'terminos', 'soporte', 'ayuda', 'borrarCuenta']
// La ruta publica -/en/privacy- al archivo que la sirve con cleanUrls -en/privacy.html-. La
// portada en ingles es en.html y no en/index.html: asi /en se sirve sin redirigir a /en/.
const archivoDe = (ruta) => (ruta === '/' ? 'index.html' : `${ruta.slice(1)}.html`)

// Lo que va en el <head> de cada pagina para el idioma: la direccion canonica, la de la misma
// pagina en el otro idioma -hreflang, con el espanol como x-default- y og:locale.
// -portugues-sitio, 2026-10-24- CON TRES IDIOMAS «el otro idioma» deja de existir: son «los otros». hreflang
// de los tres -el portugues como «pt», sin pais, para que lo encuentre tambien Portugal-, x-default sigue en
// espanol, un og:locale:alternate por cada uno de los otros dos, y scriptIdioma recibe las rutas de la
// pagina en los tres idiomas. Antes:
// function cabeceraIdioma(t, pagina) {
//   const otro = IDIOMAS[t.idioma === 'es' ? 'en' : 'es']
//   return [
//     `<link rel="canonical" href="${DOMINIO}${t.rutas[pagina]}">`,
//     `<meta property="og:url" content="${DOMINIO}${t.rutas[pagina]}">`,
//     `<meta property="og:locale" content="${t.locale}">`,
//     `<meta property="og:locale:alternate" content="${otro.locale}">`,
//     `<link rel="alternate" hreflang="es" href="${DOMINIO}${IDIOMAS.es.rutas[pagina]}">`,
//     `<link rel="alternate" hreflang="en" href="${DOMINIO}${IDIOMAS.en.rutas[pagina]}">`,
//     `<link rel="alternate" hreflang="x-default" href="${DOMINIO}${IDIOMAS.es.rutas[pagina]}">`,
//     scriptIdioma(t, otro.rutas[pagina])
//   ].join('\n')
// }
function cabeceraIdioma(t, pagina) {
  const otros = Object.values(IDIOMAS).filter((o) => o.idioma !== t.idioma)
  const rutas = Object.fromEntries(Object.values(IDIOMAS).map((o) => [o.idioma, o.rutas[pagina]]))
  return [
    `<link rel="canonical" href="${DOMINIO}${t.rutas[pagina]}">`,
    `<meta property="og:url" content="${DOMINIO}${t.rutas[pagina]}">`,
    `<meta property="og:locale" content="${t.locale}">`,
    ...otros.map((o) => `<meta property="og:locale:alternate" content="${o.locale}">`),
    ...Object.values(IDIOMAS).map((o) => `<link rel="alternate" hreflang="${o.idioma}" href="${DOMINIO}${o.rutas[pagina]}">`),
    `<link rel="alternate" hreflang="x-default" href="${DOMINIO}${IDIOMAS.es.rutas[pagina]}">`,
    scriptIdioma(t, rutas)
  ].join('\n')
}

// EL IDIOMA EN EL NAVEGADOR -27-09-2026-. Va en el <head>, antes que nada se dibuje:
//   - Si la persona eligio un idioma -tocando ES o EN, queda en localStorage-, se respeta
//     siempre: una pagina en el otro idioma la lleva a la suya. No hay bucle: cada pagina solo
//     manda a la del idioma elegido, y esa no manda a ninguna parte.
//   - La primera vez, si no eligio nada y el idioma del navegador no empieza con "es", la
//     portada en espanol la lleva a la de ingles UNA vez: queda anotado y no se repite. Nunca
//     obliga: con el selector vuelve y queda elegido. En /en no se adivina nada.
//   - A los buscadores no se los mueve: cada pagina tiene su direccion y su hreflang.
//   - Si localStorage no esta -modo privado estricto-, no se mueve a nadie.
// No es logica de la aplicacion: es la pagina recordando un idioma.
// -portugues-sitio, 2026-10-24- CON TRES IDIOMAS. Recibe las rutas de la pagina en los tres -{ es, en, pt }-,
// no una «otra»:
//   - La eleccion guardada acepta 'pt' ademas de 'es' y 'en', y lleva a la misma pagina en ese idioma.
//   - La primera vez, la portada en espanol lleva a /pt si el navegador esta en portugues -pt-BR o pt-PT,
//     todo lo que empiece con «pt»-, a /en si esta en otro idioma que no sea espanol ni portugues, y no
//     mueve a nadie si esta en espanol. Igual que antes: una sola vez y nunca a los buscadores.
// Antes:
// function scriptIdioma(t, otra) {
//   const js = `(function(){var C='sigo-idioma',A='sigo-idioma-auto',yo='${t.idioma}',otra='${otra}';` +
//     `try{var s=window.localStorage,e=s.getItem(C);` +
//     `if(e==='es'||e==='en'){if(e!==yo)location.replace(otra);}` +
//     `else if(yo==='es'&&!s.getItem(A)&&!/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)){s.setItem(A,'1');` +
//     `var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(l&&!/^es/i.test(l))location.replace(otra);}}catch(_){}` +
//     (las dos lineas siguientes, el click que guarda la eleccion, no cambian)
function scriptIdioma(t, rutas) {
  const js = `(function(){var C='sigo-idioma',A='sigo-idioma-auto',yo='${t.idioma}',r=${JSON.stringify(rutas)};` +
    `try{var s=window.localStorage,e=s.getItem(C);` +
    `if(e==='es'||e==='en'||e==='pt'){if(e!==yo)location.replace(r[e]);}` +
    `else if(yo==='es'&&!s.getItem(A)&&!/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)){s.setItem(A,'1');` +
    `var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(l&&/^pt/i.test(l))location.replace(r.pt);else if(l&&!/^es/i.test(l))location.replace(r.en);}}catch(_){}` +
    `document.addEventListener('click',function(v){var a=v.target&&v.target.closest?v.target.closest('a[data-idioma]'):null;` +
    `if(a){try{localStorage.setItem(C,a.getAttribute('data-idioma'));}catch(_){}}});})();`
  return `<script>${js}</script>`
}

// "ES · EN": arriba a la derecha y en el pie. Son enlaces de verdad -funcionan sin JavaScript-
// a la misma pagina en el otro idioma.
// -portugues-sitio, 2026-10-24- «ES · EN · PT», con los mismos enlaces de verdad. SIN BANDERAS -Javier, con la
// regla del W3C «Do not use flag icons to indicate languages», https://www.w3.org/TR/i18n-html-tech-lang/
// seccion 7-: una bandera es un pais, no un idioma. Antes, la ultima linea era:
//   return `<nav class="idioma idioma-${lugar}" aria-label="${t.selector.etiqueta}">${enlace('es')}<span aria-hidden="true">·</span>${enlace('en')}</nav>`
function selector(t, pagina, lugar) {
  const enlace = (i) => {
    const actual = i === t.idioma
    return `<a href="${IDIOMAS[i].rutas[pagina]}" lang="${i}" hreflang="${i}" data-idioma="${i}"${actual ? ' aria-current="page"' : ''}>${i.toUpperCase()}</a>`
  }
  return `<nav class="idioma idioma-${lugar}" aria-label="${t.selector.etiqueta}">${Object.keys(IDIOMAS).map(enlace).join('<span aria-hidden="true">·</span>')}</nav>`
}

// Antes, en el pie: <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a>
// en los dos idiomas. Desde el 07-10-2026 el correo es el de cada idioma -textos, correo-: en
// ingles, hello@.
// -sitio-cuenta, 20-10-2026- El pie suma «Borrar cuenta» / «Delete account». Antes, la primera línea era:
//     <li><span><a href="${t.rutas.privacidad}">${t.pie.privacidad}</a></span><span><a href="${t.rutas.soporte}">${t.pie.soporte}</a></span><span><a href="${t.rutas.ayuda}">${t.pie.ayuda}</a></span></li>
// Antes: el pie agrupaba los enlaces legales en una fila de spans; se guarda abajo como historia.
// function pie(t, pagina) {
//   return `<footer class="pie">
//   <ul>
//     <li><span><a href="${t.rutas.privacidad}">${t.pie.privacidad}</a></span><span><a href="${t.rutas.terminos}">${t.pie.terminos}</a></span><span><a href="${t.rutas.soporte}">${t.pie.soporte}</a></span><span><a href="${t.rutas.ayuda}">${t.pie.ayuda}</a></span><span><a href="${t.rutas.borrarCuenta}">${t.pie.borrarCuenta}</a></span></li>
//     <li><span><a href="mailto:${t.correo}">${t.correo}</a></span><span>© Sigo</span></li>
//   </ul>
//   ${selector(t, pagina, 'pie')}
// </footer>`
// }
// El mismo pie editorial se usa en la portada y en las páginas que ya enlazan la app y Play.
function pie(t, pagina) {
  const enlaces = ['ayuda', 'soporte', 'privacidad', 'terminos', 'borrarCuenta']
  return `<footer class="pie">
  <ul class="pie-links">${enlaces.map(p => `<li><a href="${t.rutas[p]}">${t.pie[p]}</a></li>`).join('')}</ul>
  <div class="pie-meta"><span><a href="mailto:${t.correo}">${t.correo}</a></span>${selector(t, pagina, 'pie')}</div>
  <p class="pie-copyright">${t.nuevaPortada.copyright}</p>
  ${PLAY_PUBLICADO ? `<p class="pie-marca">${t.nuevaPortada.playAviso}</p>` : ''}
</footer>`
}

// La franja conserva la acción aprobada, con el selector real y el controlador franja.js.
function franja(t) {
  if (PLAY_PUBLICADO) return ''
  return `<div class="franja-prueba" id="franja-prueba">
  ${selector(t, 'portada', 'franja')}
  <a class="franja-msg" href="#prueba">${t.prueba.franja} <span>${t.prueba.franjaAccion}</span></a>
  <button class="franja-cerrar" type="button" aria-label="${t.nuevaPortada.cerrar}" aria-controls="franja-prueba"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11"/></svg></button>
</div>`
}

// Las tres insignias son los SVG oficiales sin cambios; el idioma decide cuál se sirve.
function accionPlay(t) {
  if (!PLAY_PUBLICADO) return textos(leer('sitio/fuente/invitacion.html'), t, 'invitacion.html')
  const idioma = { es: 'Spanish-LATAM', en: 'English', pt: 'Portuguese-Brazil' }[t.idioma]
  return `<a class="cierre-play" href="https://play.google.com/store/apps/details?id=com.sigoteleprompter.app"><img src="/activos/google-play/GetItOnGooglePlay_Badge_Web_color_${idioma}.svg" alt="${t.nuevaPortada.playAlt}" height="56"></a>`
}

// Llena las marcas {{clave}} con los textos del idioma. Las listas de privacidad y soporte se
// arman aca. Si una marca no tiene texto, se para.
function textos(html, t, donde) {
  const derivados = {
    'privacidad.lista': t.privacidad.puntos.map((x) => `<li>${x}</li>`).join('\n    '),
    'terminos.secciones': t.terminos.secciones.map((s) => `<h2>${s.titulo}</h2>\n  ${s.parrafos.map((x) => `<p>${x}</p>`).join('\n  ')}`).join('\n  '),
    'soporte.lista': t.soporte.puntos.map((x) => `<li>${x}</li>`).join('\n    '),
    // -18-10-2026- LAS FOTOS VAN DESPUÉS -Javier-: el manual sale primero solo con texto, para que Ayuda
    // de la app deje de abrir una página inexistente. s.captura dice qué foto va en cada sección: queda
    // en los textos como la lista de lo que falta, pero no se muestra. Antes:
    // 'ayuda.secciones': t.ayuda.secciones.map((s) => `<h2>${s.titulo}</h2>\n  ${s.parrafos.map((x) => `<p>${x}</p>`).join('\n  ')}\n  <p class="captura">${s.captura}</p>`).join('\n  ')
    // -18-10-2026, más tarde- CON FOTO DONDE YA HAY -Javier: «saca las fotos»-: la sección con s.imagen la
    // muestra debajo del texto, con s.alt; las demás siguen solo con texto y su s.captura dice qué foto falta.
    // Las fotos salen del emulador y viven en sitio/fuente/capturas: abajo se copian a public/capturas.
    // Antes: 'ayuda.secciones': t.ayuda.secciones.map((s) => `<h2>${s.titulo}</h2>\n  ${s.parrafos.map((x) => `<p>${x}</p>`).join('\n  ')}`).join('\n  ')
    'ayuda.secciones': t.ayuda.secciones.map((s) => `<h2>${s.titulo}</h2>\n  ${s.parrafos.map((x) => `<p>${x}</p>`).join('\n  ')}` +
      (s.imagen ? `\n  <figure class="captura"><img src="/capturas/${s.imagen}" alt="${s.alt}" width="540" height="1111" loading="lazy" decoding="async"></figure>` : '')).join('\n  ')
  }
  return html.replace(/\{\{([\w.]+)\}\}/g, (_, clave) => {
    if (clave in derivados) return derivados[clave]
    const v = clave.split('.').reduce((o, k) => (o == null ? undefined : o[k]), t)
    if (typeof v !== 'string') throw new Error(`${donde} (${t.idioma}): no hay texto para {{${clave}}} en textos/${t.idioma}.js.`)
    return v
  })
}

// ---------- 2. la lectura ----------

// lectura.js importa el TypeScript de src/: Vite lo carga como lo cargaria una prueba. Una
// lectura por idioma: el guion del telefono es el de textos/<idioma>.js.
const servidor = await createServer({
  root: RAIZ,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }
})
const lecturas = {}
try {
  const modulo = await servidor.ssrLoadModule('/sitio/fuente/lectura.js')
  for (const [idioma, t] of Object.entries(IDIOMAS)) {
    // -portugues-sitio, 2026-10-24- Con el idioma del guion -lectura.js-. Antes: lecturas[idioma] = modulo.armarLectura(RAIZ, t.lectura)
    lecturas[idioma] = modulo.armarLectura(RAIZ, t.lectura, idioma)
    console.log(`${idioma}: ${lecturas[idioma].resumen}`)
  }
} finally {
  await servidor.close()
}

// ---------- 3. el JavaScript de la pagina ----------

const empaquetado = await build({
  root: RAIZ,
  configFile: false,
  logLevel: 'warn',
  publicDir: false,
  build: {
    write: false,
    target: 'es2019',
    minify: 'esbuild',
    lib: { entry: path.join(FUENTE, 'demo.js'), formats: ['iife'], name: 'Sigo', fileName: () => 'sitio.js' }
  }
})
const salida = (Array.isArray(empaquetado) ? empaquetado[0] : empaquetado).output
// NINGUN CODIGO DE LA APLICACION EN LA PAGINA. Todo lo que el empaquetado junto tiene que ser
// de sitio/fuente, y nunca lectura.js -que si usa la aplicacion, pero solo aca, al armar- ni
// los textos -van en el HTML-. Si alguien agrega un import de src/ o de una biblioteca, se para.
const modulos = Object.values(salida[0].modules || {}).length ? Object.keys(salida[0].modules) : salida[0].moduleIds
// -18-10-2026- EN WINDOWS el empaquetado nombra los módulos con / -C:/Users/...- y FUENTE viene con \:
// no calzaba ninguno y todos salían como ajenos. Se comparan los dos con /, que en Linux no cambia nada.
// Antes: const ajenos = (modulos || []).filter((m) => !m.startsWith(FUENTE + path.sep) || m.endsWith(`${path.sep}lectura.js`) || m.includes(`${path.sep}vendor${path.sep}`) || m.includes(`${path.sep}textos${path.sep}`))
const conBarras = (p) => p.replace(/\\/g, '/')
const fuenteConBarras = conBarras(FUENTE) + '/'
const ajenos = (modulos || []).filter((m) => {
  const b = conBarras(m)
  return !b.startsWith(fuenteConBarras) || b.endsWith('/lectura.js') || b.includes('/vendor/') || b.includes('/textos/')
})
if (salida.length !== 1 || !modulos || !modulos.length || ajenos.length) {
  throw new Error(`El JavaScript de la pagina junta algo que no es de sitio/fuente: ${ajenos.join(', ') || '(sin lista de modulos)'}. A la pagina no viaja codigo de la aplicacion: lo que haga falta se calcula en lectura.js y va en el JSON.`)
}
const codigo = salida[0].code

// ---------- 4. las paginas ----------

// Sin los comentarios: explican la hoja a quien la edita, no a quien la baja.
const estilo = leer('sitio/fuente/estilo.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n').trim()

function llenar(texto, valores, donde) {
  let html = texto
  for (const [marca, valor] of Object.entries(valores)) {
    // split/join y no replace: el texto puede traer "$&" y replace lo interpretaria.
    const partes = html.split(marca)
    if (partes.length !== 2) throw new Error(`${donde}: la marca ${marca} aparece ${partes.length - 1} veces, tiene que aparecer una.`)
    html = partes.join(valor)
  }
  const sobrante = html.match(/\/\*@[\w-]+\*\/|<!--@[\w-]+-->|@(guion|nombre|rotulo)@|\{\{[\w.]+\}\}/)
  if (sobrante) throw new Error(`${donde}: quedo sin llenar ${sobrante[0]}.`)
  return html
}

const paginas = {}
for (const [idioma, t] of Object.entries(IDIOMAS)) {
  const lectura = lecturas[idioma]
  if (/<\/script/i.test(JSON.stringify(lectura.datos))) throw new Error('Los datos de la lectura traen "</script": romperian la pagina.')
  const telefono = (nombre, rotulo) => llenar(textos(leer('sitio/fuente/telefono.html'), t, 'telefono.html'), { '@nombre@': nombre, '@rotulo@': rotulo, '@guion@': lectura.html }, 'telefono.html')
  const marcaInterior = `<a href="${t.rutas.portada}" aria-label="${t.inicio}">${marca('', { resplandor: false, etiqueta: false })}</a>`
  const comunes = (pagina) => ({
    '/*@estilo*/': estilo,
    '<!--@cabecera-idioma-->': cabeceraIdioma(t, pagina),
    // Antes: todas las páginas tenían el selector flotante; la portada lo integra en la franja.
    ...(pagina === 'portada' ? { '<!--@franja-->': franja(t) } : { '<!--@selector-->': selector(t, pagina, 'arriba') }),
    '<!--@pie-->': pie(t, pagina)
  })
  paginas[archivoDe(t.rutas.portada)] = llenar(textos(leer('sitio/fuente/portada.html'), t, 'portada.html'), {
    ...comunes('portada'),
    // El HTML del video no existe sin una versión en este idioma; tampoco se solicita el MP4.
    '<!--@video-->': t.video.archivo ? textos(leer('sitio/fuente/video.html'), t, 'video.html') : '',
    '<!--@accion-play-->': accionPlay(t),
    '<!--@marca-->': marca(`resplandor-entrada-${idioma}`, { rotulo: t.nuevaPortada.marca }),
    '<!--@marca-cierre-->': marca(`resplandor-cierre-${idioma}`, { rotulo: t.nuevaPortada.marca }),
    '<!--@telefono-sigo-->': telefono('sigo', t.telefono.sigo),
    '<!--@telefono-comun-->': telefono('comun', t.nuevaPortada.rotuloComun),
    '/*@datos*/': JSON.stringify({ ...lectura.datos, estilos: t.estilos })
  }, `portada.html (${idioma})`)
  paginas[archivoDe(t.rutas.privacidad)] = llenar(textos(leer('sitio/fuente/privacidad.html'), t, 'privacidad.html'), { ...comunes('privacidad'), '<!--@marca-->': marcaInterior }, `privacidad.html (${idioma})`)
  paginas[archivoDe(t.rutas.terminos)] = llenar(textos(leer('sitio/fuente/terminos.html'), t, 'terminos.html'), { ...comunes('terminos'), '<!--@marca-->': marcaInterior }, `terminos.html (${idioma})`)
  paginas[archivoDe(t.rutas.soporte)] = llenar(textos(leer('sitio/fuente/soporte.html'), t, 'soporte.html'), { ...comunes('soporte'), '<!--@marca-->': marcaInterior }, `soporte.html (${idioma})`)
  // -18-10-2026- LA PÁGINA DE AYUDA -#134-: el PR la sumó a PAGINAS, al pie y a los textos, pero no la
  // escribía. Faltaba esta línea, y sitio/public quedaba sin ayuda.html ni en/help.html, mientras el
  // botón Ayuda de la app -#135- ya llevaba a /ayuda y daba 404.
  paginas[archivoDe(t.rutas.ayuda)] = llenar(textos(leer('sitio/fuente/ayuda.html'), t, 'ayuda.html'), { ...comunes('ayuda'), '<!--@marca-->': marcaInterior }, `ayuda.html (${idioma})`)
  // -sitio-cuenta, 20-10-2026- La página para borrar la cuenta sin la app. Sin esta línea no sale -lo que pasó
  // con Ayuda, #134-.
  paginas[archivoDe(t.rutas.borrarCuenta)] = llenar(textos(leer('sitio/fuente/borrar-cuenta.html'), t, 'borrar-cuenta.html'), { ...comunes('borrarCuenta'), '<!--@marca-->': marcaInterior }, `borrar-cuenta.html (${idioma})`)
}

// Lo que arma este script, y nada mas: lo que quede de un armado anterior se borra.
// -18-10-2026- Y las fotos del manual, en capturas. Antes: [..., 'sitio.js', 'fuentes', 'vendor', 'icono.png']
const armados = new Set([...Object.keys(paginas).map((a) => a.split('/')[0]), 'sitio.js', 'fuentes', 'vendor', 'icono.png', 'capturas', 'activos'])
// Antes de limpiar se comprueba el destino absoluto: una ruta ajena al sitio nunca se borra.
if (path.resolve(PUBLICO) !== path.resolve(RAIZ, 'sitio/public')) throw new Error('Destino de armado fuera de sitio/public.')
for (const viejo of fs.readdirSync(PUBLICO)) {
  if (armados.has(viejo)) continue
  fs.rmSync(path.join(PUBLICO, viejo), { recursive: true })
  console.log(`sitio/public/${viejo} borrado: ya no lo arma este script`)
}

// -18-10-2026- LAS FOTOS DEL MANUAL, tal cual desde sitio/fuente/capturas. La carpeta se rehace entera: una
// foto que se saca de la fuente no queda servida.
fs.rmSync(path.join(PUBLICO, 'capturas'), { recursive: true, force: true })
fs.mkdirSync(path.join(PUBLICO, 'capturas'), { recursive: true })
for (const foto of fs.readdirSync(path.join(FUENTE, 'capturas'))) {
  fs.copyFileSync(path.join(FUENTE, 'capturas', foto), path.join(PUBLICO, 'capturas', foto))
}

// Los activos se publican desde una sola fuente; el MP4 aprobado se conserva únicamente en docs/play.
fs.rmSync(path.join(PUBLICO, 'activos'), { recursive: true, force: true })
fs.cpSync(path.join(FUENTE, 'activos'), path.join(PUBLICO, 'activos'), { recursive: true })
for (const t of Object.values(IDIOMAS)) {
  if (!t.video.archivo) continue
  if (!t.video.archivo.startsWith('/activos/video/') || t.video.archivo.includes('..')) throw new Error('Ruta de video fuera de /activos/video/.')
  const archivo = path.basename(t.video.archivo)
  fs.mkdirSync(path.join(PUBLICO, 'activos/video'), { recursive: true })
  fs.copyFileSync(path.join(RAIZ, 'docs/play/ficha/video', archivo), path.join(PUBLICO, 'activos/video', archivo))
}

for (const [archivo, html] of Object.entries(paginas)) {
  fs.mkdirSync(path.dirname(path.join(PUBLICO, archivo)), { recursive: true })
  // Se eliminan blancos finales del HTML generado, sin borrar los comentarios de la fuente.
  fs.writeFileSync(path.join(PUBLICO, archivo), html.replace(/[ \t]+$/gm, ''))
  console.log(`sitio/public/${archivo}`, Buffer.byteLength(html), 'bytes')
}
fs.writeFileSync(path.join(PUBLICO, 'sitio.js'), codigo)
console.log('sitio/public/sitio.js', Buffer.byteLength(codigo), 'bytes')

// ---------- 5. letras y bibliotecas ----------

fs.mkdirSync(path.join(PUBLICO, 'fuentes'), { recursive: true })
const letras = [
  ['source-serif-4', 'source-serif-4-latin-400-normal.woff2'],
  ['source-serif-4', 'source-serif-4-latin-600-normal.woff2'],
  ['source-sans-3', 'source-sans-3-latin-400-normal.woff2'],
  ['source-sans-3', 'source-sans-3-latin-600-normal.woff2']
]
for (const [paquete, archivo] of letras) {
  fs.copyFileSync(path.join(RAIZ, 'node_modules/@fontsource', paquete, 'files', archivo), path.join(PUBLICO, 'fuentes', archivo))
}
// Las dos familias son SIL Open Font License: la licencia viaja con las letras.
fs.copyFileSync(path.join(RAIZ, 'node_modules/@fontsource/source-serif-4/LICENSE'), path.join(PUBLICO, 'fuentes', 'OFL-source-serif-4.txt'))
fs.copyFileSync(path.join(RAIZ, 'node_modules/@fontsource/source-sans-3/LICENSE'), path.join(PUBLICO, 'fuentes', 'OFL-source-sans-3.txt'))

fs.mkdirSync(path.join(PUBLICO, 'vendor'), { recursive: true })
for (const archivo of fs.readdirSync(path.join(FUENTE, 'vendor'))) {
  fs.copyFileSync(path.join(FUENTE, 'vendor', archivo), path.join(PUBLICO, 'vendor', archivo))
}
