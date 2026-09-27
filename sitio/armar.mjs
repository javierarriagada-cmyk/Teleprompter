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
// Vite -que ya esta en el proyecto- solo se usa aca: para entender el TypeScript de src/ al
// calcular la lectura, y para juntar en un archivo el JavaScript de la pagina.
// Lo armado se sube al repositorio: Firebase publica sitio/public tal cual.
//
// NO PUBLICA. Publicar es de Javier: primero un canal de prueba,
// `firebase hosting:channel:deploy prueba` desde sitio/, y al dominio con su OK.

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
// "esa palabra despues no acompana a Sigo"-.
const vb = [caja.x, caja.y, caja.ancho, caja.alto].map((n) => +n.toFixed(2)).join(' ')
// Con resplandor: el punto es la luz de grabar encendida -docs/el-sitio.md, E0-. Cada marca
// lleva su propio filtro: dos ids iguales en la misma pagina se pisan.
function marca(id, { resplandor = true, etiqueta = true } = {}) {
  const brillo = resplandor
    ? `<defs><filter id="${id}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="16"/></filter></defs><circle class="resplandor" cx="${punto.cx}" cy="${punto.cy}" r="${(punto.r * 1.35).toFixed(2)}" filter="url(#${id})"/>`
    : ''
  const aria = etiqueta ? 'role="img" aria-label="Sigo"' : 'aria-hidden="true"'
  return `<svg class="marca-svg" viewBox="${vb}" ${aria}>${brillo}<path d="${nombre}" fill="currentColor"/><circle class="punto" cx="${punto.cx}" cy="${punto.cy}" r="${punto.r}"/></svg>`
}

const pie = `<footer class="pie">
  <ul>
    <li><span><a href="/privacidad">Privacidad</a></span><span><a href="/soporte">Soporte</a></span></li>
    <li><span><a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a></span><span>© Sigo</span></li>
  </ul>
</footer>`

// ---------- 2. la lectura ----------

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
try {
  const modulo = await servidor.ssrLoadModule('/sitio/fuente/lectura.js')
  lectura = modulo.armarLectura(RAIZ)
} finally {
  await servidor.close()
}
console.log(lectura.resumen)

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
// de sitio/fuente, y nunca lectura.js -que si usa la aplicacion, pero solo aca, al armar-.
// Si alguien agrega un import de src/ o de una biblioteca, se para aca.
const modulos = Object.values(salida[0].modules || {}).length ? Object.keys(salida[0].modules) : salida[0].moduleIds
const ajenos = (modulos || []).filter((m) => !m.startsWith(FUENTE + path.sep) || m.endsWith(`${path.sep}lectura.js`) || m.includes(`${path.sep}vendor${path.sep}`))
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
  const sobrante = html.match(/\/\*@[\w-]+\*\/|<!--@[\w-]+-->|@(guion|nombre|rotulo)@/)
  if (sobrante) throw new Error(`${donde}: quedo sin llenar ${sobrante[0]}.`)
  return html
}

const telefono = (nombre, rotulo) => llenar(leer('sitio/fuente/telefono.html'), { '@nombre@': nombre, '@rotulo@': rotulo, '@guion@': lectura.html }, 'telefono.html')

const paginas = {
  'index.html': llenar(leer('sitio/fuente/portada.html'), {
    '/*@estilo*/': estilo,
    '<!--@marca-->': marca('resplandor-entrada'),
    '<!--@marca-cierre-->': marca('resplandor-cierre'),
    '<!--@telefono-sigo-->': telefono('sigo', 'Sigo'),
    '<!--@telefono-comun-->': telefono('comun', 'Un teleprompter común'),
    '<!--@pie-->': pie,
    '/*@datos*/': JSON.stringify(lectura.datos)
  }, 'portada.html'),
  'privacidad.html': llenar(leer('sitio/fuente/privacidad.html'), { '/*@estilo*/': estilo, '<!--@marca-->': `<a href="/" aria-label="Sigo, inicio">${marca('', { resplandor: false, etiqueta: false })}</a>`, '<!--@pie-->': pie }, 'privacidad.html'),
  'soporte.html': llenar(leer('sitio/fuente/soporte.html'), { '/*@estilo*/': estilo, '<!--@marca-->': `<a href="/" aria-label="Sigo, inicio">${marca('', { resplandor: false, etiqueta: false })}</a>`, '<!--@pie-->': pie }, 'soporte.html')
}

if (/<\/script/i.test(JSON.stringify(lectura.datos))) throw new Error('Los datos de la lectura traen "</script": romperian la pagina.')

// Lo que arma este script, y nada mas: lo que quede de un armado anterior se borra.
const armados = new Set([...Object.keys(paginas), 'sitio.js', 'fuentes', 'vendor', 'icono.png'])
for (const viejo of fs.readdirSync(PUBLICO)) {
  if (armados.has(viejo)) continue
  fs.rmSync(path.join(PUBLICO, viejo), { recursive: true })
  console.log(`sitio/public/${viejo} borrado: ya no lo arma este script`)
}

for (const [archivo, html] of Object.entries(paginas)) {
  fs.writeFileSync(path.join(PUBLICO, archivo), html)
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
