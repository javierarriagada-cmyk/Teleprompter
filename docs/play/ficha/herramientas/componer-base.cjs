// LO COMÚN DE LAS IMÁGENES DE LA FICHA -tarea 86-: la paleta, las letras y la marca Sig●.
// Lo usan componer.cjs y lamina.cjs; va aparte porque componer.cjs, al cargarse, ya dibuja.
//
// Colores y letras: solo los de Sigo -src/styles.css, docs/el-sitio.md 6, sitio/fuente/estilo.css-.
// La marca Sig● es el mismo dibujo de src/components/trazoMarca.ts, leído igual que en
// sitio/armar.mjs: si la marca cambia allá, cambia aquí sin tocar nada.
const fs = require('fs')
const path = require('path')
const RAIZ = path.resolve(__dirname, '../../../..')

// La paleta -docs/el-sitio.md 6 y COLORES_TRAMO del editor-. Nada nuevo.
const C = {
  hondo: '#0B0A09', suelo: '#151312', panel: '#2D2927', letra: '#E7E1DE', crema: '#F2ECE8',
  apagado: '#9C948E', rojo: '#E11D2E', ambar: '#F0C070', celeste: '#8FB8DE', verde: '#9CC5A1',
  destacado: '#FFE066', tintaDestacado: '#111111'
}

// ---------- las letras y la marca ----------
const fuente = (paquete, archivo) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(RAIZ, 'node_modules/@fontsource', paquete, 'files', archivo)).toString('base64')
const LETRAS = `
@font-face{font-family:"Source Serif 4";font-weight:400;src:url(${fuente('source-serif-4', 'source-serif-4-latin-400-normal.woff2')})}
@font-face{font-family:"Source Serif 4";font-weight:600;src:url(${fuente('source-serif-4', 'source-serif-4-latin-600-normal.woff2')})}
@font-face{font-family:"Source Serif 4";font-weight:400;font-style:italic;src:url(${fuente('source-serif-4', 'source-serif-4-latin-400-italic.woff2')})}
@font-face{font-family:"Source Sans 3";font-weight:400;src:url(${fuente('source-sans-3', 'source-sans-3-latin-400-normal.woff2')})}
@font-face{font-family:"Source Sans 3";font-weight:600;src:url(${fuente('source-sans-3', 'source-sans-3-latin-600-normal.woff2')})}
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow:hidden}
.serif{font-family:"Source Serif 4",Georgia,serif}
.sans{font-family:"Source Sans 3",system-ui,sans-serif}
.dest{background:${C.destacado};color:${C.tintaDestacado};border-radius:.12em;padding:0 .14em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
`
const trazo = fs.readFileSync(path.join(RAIZ, 'src/components/trazoMarca.ts'), 'utf8')
const cadena = (n) => trazo.match(new RegExp(`export const ${n} = '([^']+)'`))[1]
const objeto = (n) => JSON.parse(trazo.match(new RegExp(`export const ${n} = (\\{[^}]+\\})`))[1].replace(/(\w+):/g, '"$1":'))
const NOMBRE = cadena('MARCA_TRAZO_NOMBRE')
const PUNTO = objeto('MARCA_PUNTO')
const CAJA = objeto('MARCA_CAJA')
// Con resplandor, como en la portada del sitio: el punto es la luz de grabar encendida.
function marca({ alto, color, id, resplandor = true }) {
  const vb = [CAJA.x - 30, CAJA.y - 30, CAJA.ancho + 60, CAJA.alto + 60].map((n) => +n.toFixed(2)).join(' ')
  const ancho = alto * (CAJA.ancho + 60) / (CAJA.alto + 60)
  const brillo = resplandor ? `<defs><filter id="${id}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="14"/></filter></defs><circle cx="${PUNTO.cx}" cy="${PUNTO.cy}" r="${(PUNTO.r * 1.35).toFixed(2)}" fill="${C.rojo}" opacity="0.5" filter="url(#${id})"/>` : ''
  return `<svg width="${ancho.toFixed(1)}" height="${alto}" viewBox="${vb}" style="display:block;margin:-${(alto * 30 / (CAJA.alto + 60)).toFixed(1)}px">${brillo}<path d="${NOMBRE}" fill="${color}"/><circle cx="${PUNTO.cx}" cy="${PUNTO.cy}" r="${PUNTO.r}" fill="${C.rojo}"/></svg>`
}

const html = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const conDestacado = (t) => html(t).replace(/==([^=]+)==/g, '<span class="dest">$1</span>')

module.exports = { LETRAS, marca, html, conDestacado, C }
