// ARMA EL SITIO sigoteleprompter.com -sitio/public/-. 27-09-2026, docs/el-sitio.md.
//
//   node sitio/armar.mjs      (desde la carpeta Teleprompter, despues de npm ci)
//
// Reemplaza a la pagina provisoria del 25-09-2026. Se sigue armando con un script, y no
// escribiendo el HTML a mano, por tres cosas que tienen que salir de la aplicacion y no de
// una copia que se separe:
//
//   1. LA MARCA sale del trazo de src/components/trazoMarca.ts, como en la provisoria: el
//      logo de la pagina y el de la aplicacion son la misma forma. trazoMarca.ts se LEE.
//   2. LA DEMOSTRACION sale de correr la conduccion de la aplicacion -seguidor, avance-
//      sobre los tiempos de una toma real, AQUI, al armar: a la pagina llega solo un JSON con
//      el milisegundo y la palabra destacada. Ningun codigo de la aplicacion viaja a la
//      pagina -todo JavaScript publicado se puede leer-. Ver sitio/fuente/lectura.js y demo.js,
//      y la comprobacion de abajo.
//   3. LAS LETRAS son las de la aplicacion -@fontsource, las mismas que importa
//      src/main.tsx-, servidas desde el propio dominio: la pagina no le pide nada a nadie
//      mas, y eso es parte de lo que dice /privacidad.
//
// Lo que sale en sitio/public/ es HTML, CSS y JavaScript planos, sin dependencias: Vite -que
// ya esta en el proyecto- solo se usa aca, al armar, para entender el TypeScript de src/.
// Lo armado se sube al repositorio: Firebase publica sitio/public tal cual.
//
// NO PUBLICA. Publicar es de Javier -docs/el-sitio.md seccion 6-: primero un canal de
// prueba, `firebase hosting:channel:deploy prueba` desde sitio/, y al dominio con su OK.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, createServer } from 'vite'

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
// "esa palabra despues no acompana a Sigo"-. La caja de la marca ya trae el punto adentro.
const vb = [caja.x, caja.y, caja.ancho, caja.alto].map((n) => +n.toFixed(2)).join(' ')
const svgMarca = `<svg viewBox="${vb}" role="img" aria-label="Sigo"><path d="${nombre}" fill="currentColor"/><circle cx="${punto.cx}" cy="${punto.cy}" r="${punto.r}"/></svg>`
// En la portada la marca no es enlace: llevaria a la misma pagina.
const marcaPortada = `<span class="marca">${svgMarca}</span>`
const marcaInterior = `<a class="marca" href="/">${svgMarca}</a>`

const pie = `<footer class="pie envoltura">
  <ul>
    <li><span><a href="/privacidad">Privacidad</a></span><span><a href="/soporte">Soporte</a></span></li>
    <li><span><a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a></span><span>© Sigo</span></li>
  </ul>
</footer>`

// ---------- 2. la lectura y la demostracion ----------

// lectura.js importa el TypeScript de src/: Vite lo carga como lo cargaria una prueba.
const servidor = await createServer({
  root: RAIZ,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }
})
let lectura
let AUDIO
try {
  const modulo = await servidor.ssrLoadModule('/sitio/fuente/lectura.js')
  lectura = modulo.armarLectura(RAIZ)
  AUDIO = modulo.AUDIO
} finally {
  await servidor.close()
}
console.log(lectura.resumen)

const empaquetado = await build({
  root: RAIZ,
  configFile: false,
  logLevel: 'warn',
  publicDir: false,
  build: {
    write: false,
    target: 'es2019',
    minify: 'esbuild',
    lib: { entry: path.join(FUENTE, 'demo.js'), formats: ['iife'], name: 'SigoDemo', fileName: () => 'demo.js' }
  }
})
const salidaDemo = (Array.isArray(empaquetado) ? empaquetado[0] : empaquetado).output
const codigoDemo = salidaDemo[0].code.trim()
// NINGUN CODIGO DE LA APLICACION EN LA PAGINA. demo.js no importa nada; si alguien le agrega
// un import de src/, el empaquetado lo meteria entero y en silencio. Se para aca.
if (salidaDemo.length !== 1 || /from\s+['"]|import\s*\(/.test(leer('sitio/fuente/demo.js'))) {
  throw new Error('sitio/fuente/demo.js importa algo: a la pagina no viaja codigo de la aplicacion. Lo que haga falta se calcula en lectura.js y va en el JSON.')
}

// ---------- 3. el sonido, si hay ----------

let htmlSonido = ''
let audioPublico = null
let audioOrigen = null
if (AUDIO) {
  audioOrigen = path.resolve(RAIZ, AUDIO)
  if (!fs.existsSync(audioOrigen)) throw new Error(`lectura.js dice AUDIO = '${AUDIO}' y ese archivo no existe.`)
  audioPublico = `lectura${path.extname(AUDIO).toLowerCase()}`
  // Arranca sin sonido y el audio no se baja hasta que alguien lo pide: preload none.
  htmlSonido = `<audio src="/${audioPublico}" preload="none"></audio>
          <button type="button" class="btn-flotante-40" data-control="sonido" data-estado="sin" aria-pressed="false" aria-label="Escuchar la lectura">
            <svg class="icono-sin-sonido" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
            <svg class="icono-con-sonido" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.5a8 8 0 0 1 0 11"/></svg>
          </button>`
}

// ---------- 4. las paginas ----------

// Sin los comentarios: explican la hoja a quien la edita, no a quien la baja.
const estilo = leer('sitio/fuente/estilo.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n').trim()

function llenar(plantilla, valores) {
  let html = leer(`sitio/fuente/${plantilla}`)
  for (const [marca, valor] of Object.entries(valores)) {
    // split/join y no replace: el codigo minificado trae "$&" y replace lo interpretaria.
    const partes = html.split(marca)
    if (partes.length !== 2) throw new Error(`sitio/fuente/${plantilla}: la marca ${marca} aparece ${partes.length - 1} veces, tiene que aparecer una.`)
    html = partes.join(valor)
  }
  const sobrante = html.match(/\/\*@\w+\*\/|<!--@\w+-->/)
  if (sobrante) throw new Error(`sitio/fuente/${plantilla}: quedo sin llenar ${sobrante[0]}.`)
  return html
}

if (/<\/script/i.test(codigoDemo)) throw new Error('El codigo de la demostracion trae "</script": romperia la pagina.')

const paginas = {
  'index.html': llenar('portada.html', {
    '/*@estilo*/': estilo,
    '<!--@marca-->': marcaPortada,
    '/*@tipo*/': lectura.pantalla.tipo,
    '/*@medidas*/': `--letra-lectura:${lectura.pantalla.letra}px;--margen:${lectura.pantalla.margen}%`,
    '<!--@guion-->': lectura.html,
    '<!--@sonido-->': htmlSonido,
    '<!--@pie-->': pie,
    '/*@datos*/': JSON.stringify(lectura.datos),
    '/*@demo*/': codigoDemo
  }),
  'privacidad.html': llenar('privacidad.html', { '/*@estilo*/': estilo, '<!--@marca-->': marcaInterior, '<!--@pie-->': pie }),
  'soporte.html': llenar('soporte.html', { '/*@estilo*/': estilo, '<!--@marca-->': marcaInterior, '<!--@pie-->': pie })
}

fs.mkdirSync(path.join(PUBLICO, 'fuentes'), { recursive: true })
for (const [archivo, html] of Object.entries(paginas)) {
  fs.writeFileSync(path.join(PUBLICO, archivo), html)
  console.log(`sitio/public/${archivo}`, html.length, 'bytes')
}

// ---------- 5. las letras ----------

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

// Un audio de una toma anterior no se queda publicado si ya no es el de la demostracion.
for (const viejo of fs.readdirSync(PUBLICO).filter((f) => /^lectura\.\w+$/.test(f) && f !== audioPublico)) {
  fs.rmSync(path.join(PUBLICO, viejo))
  console.log(`sitio/public/${viejo} borrado: ya no es el audio de la demostracion`)
}
if (audioPublico) {
  fs.copyFileSync(audioOrigen, path.join(PUBLICO, audioPublico))
  console.log(`sitio/public/${audioPublico}`)
}
