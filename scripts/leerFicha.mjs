// LEER LA FICHA PUBLICADA, SIN CAMBIAR NADA -docs/play/ANTES-DE-SUBIR.txt, punto 6-.
//
//   node scripts/leerFicha.mjs                    compara lo publicado con docs/play/ficha
//   node scripts/leerFicha.mjs <archivo.json>     además guarda lo publicado en ese archivo
//
// Se corre antes y después de npm run ficha -- subir: antes, para ver qué cambiaría; después, para ver que
// quedó lo que se subió. La API de Play no deja leer sin abrir una edición, así que abre una, hace SOLO GET
// -los detalles, la ficha de cada idioma y las imágenes de cada tipo- y la borra. EL BORRADO NO SE TRAGA:
// se mira la respuesta y después se pide la edición otra vez, que ya no tiene que existir. El 06-10-2026
// Javier encontró una ficha «abierta y tomada» porque ficha.mjs borra con .catch(() => {}) y nadie supo si
// el borrado había fallado -memoria play-api-cerrar-y-confirmar-.
//
// Compara cada texto y la huella SHA-256 de cada imagen: las huellas que da la API calzan con las de los PNG
// del repo -comprobado el 25-10-2026 con es-419 y en-US-. Nació en el scratchpad de Claude ese día; vive
// aquí desde el 27-10-2026. La llave se lee con playApi.mjs y no se imprime, como el token.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { PAQUETE, IDIOMAS, leerLlave, armarJwt, leerBloques } from './playApi.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FICHA = path.join(RAIZ, 'docs', 'play', 'ficha')
const salida = process.argv[2]
// Las mismas carpetas y nombres que usa ficha.mjs para subir.
const TIPOS = {
  phoneScreenshots: (i) => path.join(FICHA, 'capturas', i),
  sevenInchScreenshots: (i) => path.join(FICHA, 'capturas', 'tableta', i, '7'),
  tenInchScreenshots: (i) => path.join(FICHA, 'capturas', 'tableta', i, '10'),
  featureGraphic: null
}
const GRAFICO = { 'es-419': 'grafico-1024x500-es.png', 'en-US': 'grafico-1024x500-en.png', 'pt-BR': 'grafico-1024x500-pt.png' }
const sha256 = (ruta) => crypto.createHash('sha256').update(fs.readFileSync(ruta)).digest('hex')
function locales(idioma, tipo) {
  if (tipo === 'featureGraphic') return [path.join(FICHA, GRAFICO[idioma])].filter((r) => fs.existsSync(r))
  const dir = TIPOS[tipo](idioma)
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(dir, f)) : []
}

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: armarJwt(leerLlave()) })
})
if (!tokenRes.ok) { console.error('token: ' + tokenRes.status + ' ' + (await tokenRes.text())); process.exit(1) }
const { access_token: token } = await tokenRes.json()
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAQUETE}`
const auth = { authorization: `Bearer ${token}` }
const leer = async (url) => {
  const r = await fetch(url, { headers: auth })
  if (!r.ok) throw new Error(`GET ${url.replace(base, '')}: ${r.status} ${await r.text()}`)
  return r.json()
}

const ed = await fetch(`${base}/edits`, { method: 'POST', headers: auth })
if (!ed.ok) { console.error('no se pudo abrir la edición: ' + ed.status + ' ' + (await ed.text())); process.exit(1) }
const { id } = await ed.json()
console.log('Edición abierta para leer.')
const publicado = { detalles: null, fichas: {}, imagenes: {} }
let error = null
let sigueAbierta = false
try {
  publicado.detalles = await leer(`${base}/edits/${id}/details`)
  const { listings = [] } = await leer(`${base}/edits/${id}/listings`)
  for (const l of listings) {
    publicado.fichas[l.language] = { nombre: l.title, breve: l.shortDescription, completa: l.fullDescription }
    publicado.imagenes[l.language] = {}
    for (const tipo of Object.keys(TIPOS)) {
      const { images = [] } = await leer(`${base}/edits/${id}/listings/${l.language}/${tipo}`)
      publicado.imagenes[l.language][tipo] = images.map((im) => ({ id: im.id, sha256: im.sha256, sha1: im.sha1 }))
    }
  }
} catch (e) {
  error = e
} finally {
  const borra = await fetch(`${base}/edits/${id}`, { method: 'DELETE', headers: auth })
  console.log(`Borrar la edición: HTTP ${borra.status}${borra.ok ? '' : ' ' + (await borra.text())}`)
  // El 25-10-2026 Google respondió 400 al pedir la edición ya borrada; 404 sería lo mismo. Un 2xx es que sigue.
  const queda = await fetch(`${base}/edits/${id}`, { headers: auth })
  sigueAbierta = queda.ok
  console.log(`Buscarla después de borrar: HTTP ${queda.status} ${sigueAbierta ? '-SIGUE ABIERTA: avisarle a Javier-' : '-ya no existe-'}`)
}
if (error) { console.error('Falló la lectura: ' + error.message); process.exit(1) }
if (sigueAbierta) process.exitCode = 1

if (salida) fs.writeFileSync(salida, JSON.stringify(publicado, null, 2))
console.log(`\nIdioma predeterminado: ${publicado.detalles.defaultLanguage}`)
console.log(`Idiomas publicados: ${Object.keys(publicado.fichas).join(', ') || 'ninguno'}`)
for (const idioma of IDIOMAS) {
  console.log(`\n== ${idioma}`)
  const pub = publicado.fichas[idioma]
  const repo = leerBloques(fs.readFileSync(path.join(FICHA, `textos-${idioma}.txt`), 'utf8'))
  if (!pub) {
    console.log('  no está publicada')
  } else {
    for (const k of ['nombre', 'breve', 'completa']) {
      const igual = pub[k] === repo[k]
      console.log(`  ${k}: ${igual ? 'IGUAL' : 'DISTINTO'} -publicado ${[...(pub[k] || '')].length}, repo ${[...repo[k]].length} caracteres-`)
      // Lo distinto, renglón por renglón, para mostrárselo a Javier antes de subir.
      if (!igual) {
        const a = (pub[k] || '').split('\n'), b = repo[k].split('\n')
        for (let n = 0; n < Math.max(a.length, b.length); n++) {
          if (a[n] !== b[n]) console.log(`    renglón ${n + 1}\n      publicado: ${JSON.stringify(a[n])}\n      repo:      ${JSON.stringify(b[n])}`)
        }
      }
    }
  }
  for (const tipo of Object.keys(TIPOS)) {
    const loc = locales(idioma, tipo).map(sha256)
    const pubIm = pub ? (publicado.imagenes[idioma][tipo] || []).map((im) => im.sha256) : []
    const mismoOrden = loc.length === pubIm.length && loc.every((h, i) => h === pubIm[i])
    const comunes = loc.filter((h) => pubIm.includes(h)).length
    console.log(`  ${tipo}: publicadas ${pubIm.length}, repo ${loc.length}, iguales ${comunes}${mismoOrden ? ' -mismas y en el mismo orden-' : ''}`)
  }
}
