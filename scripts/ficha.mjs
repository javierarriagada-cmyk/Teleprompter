// LA FICHA A PLAY, EN BORRADOR -tarea 99, 06-10-2026-.
//
//   npm run ficha -- subir          valida y, si todo da, deja la ficha en borrador
//   npm run ficha -- subir --simular  muestra qué subiría, sin llamar a la API
//
// El envío a revisión lo hace Javier en la consola. Este script hace edits.commit
// con changesNotSentForReview=true. No toca el ícono. Nunca producción.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PAQUETE, leerLlave, armarJwt, leerBloques, validarTextos, validarImagen, rutaDeLaLlave
} from './playApi.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FICHA = path.join(RAIZ, 'docs', 'play', 'ficha')
const args = process.argv.slice(2)
const simular = args.includes('--simular')
const subir = args.includes('subir')
// -15-10-2026- --directo: con la publicación administrada APAGADA, Google no acepta borradores -400
// "Changes are sent for review automatically. The query parameter changesNotSentForReview must not be
// set."-: el commit va sin esa marca, entra a revisión y se publica sola al aprobarse. Lo eligió Javier
// para la ficha 0.9.1 -camino A-. Sin --directo, todo sigue como antes: borrador.
const directo = args.includes('--directo')

function listar(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
}

function plan() {
  const errores = []
  const textos = {}
  for (const idioma of ['es-419', 'en-US']) {
    const archivo = `textos-${idioma}.txt`
    const bloques = leerBloques(fs.readFileSync(path.join(FICHA, archivo), 'utf8'))
    errores.push(...validarTextos(bloques, archivo))
    textos[idioma] = bloques
  }
  const imagenes = []
  const tipos = [
    ['phoneScreenshots', (idioma) => path.join(FICHA, 'capturas', idioma)],
    ['sevenInchScreenshots', (idioma) => path.join(FICHA, 'capturas', 'tableta', idioma, '7')],
    ['tenInchScreenshots', (idioma) => path.join(FICHA, 'capturas', 'tableta', idioma, '10')]
  ]
  for (const idioma of ['es-419', 'en-US']) {
    for (const [tipo, dirDe] of tipos) {
      const archivos = listar(dirDe(idioma))
      if (tipo === 'phoneScreenshots' && (archivos.length < 2 || archivos.length > 8)) {
        errores.push(`${idioma}: ${archivos.length} capturas de teléfono, Play pide entre 2 y 8`)
      }
      for (const nombre of archivos) {
        const ruta = path.join(dirDe(idioma), nombre)
        const buf = fs.readFileSync(ruta)
        const mal = validarImagen(nombre, buf, tipo)
        if (mal) errores.push(`${idioma} ${tipo}: ${mal}`)
        imagenes.push({ idioma, tipo, nombre, bytes: buf.length })
      }
    }
    const grafico = path.join(FICHA, idioma === 'es-419' ? 'grafico-1024x500-es.png' : 'grafico-1024x500-en.png')
    const buf = fs.readFileSync(grafico)
    const mal = validarImagen(path.basename(grafico), buf, 'featureGraphic')
    if (mal) errores.push(mal)
    imagenes.push({ idioma, tipo: 'featureGraphic', nombre: path.basename(grafico), bytes: buf.length })
  }
  return { errores, textos, imagenes }
}

const hecho = plan()
if (!subir) {
  console.log('Nada que hacer. Para cargar la ficha: npm run ficha -- subir')
  process.exit(0)
}
if (hecho.errores.length) {
  for (const e of hecho.errores) console.error('FALLA  ' + e)
  console.error('No subí nada.')
  process.exit(1)
}
console.log(simular ? 'Simulación. No llamé a la API.' : 'Validación OK.')
for (const idioma of ['es-419', 'en-US']) {
  const t = hecho.textos[idioma]
  console.log(`${idioma}: nombre «${t.nombre}», breve ${[...t.breve].length}, completa ${[...t.completa].length}`)
}
for (const im of hecho.imagenes) console.log(`${im.idioma} ${im.tipo} ${im.nombre} ${im.bytes} bytes`)
// Antes: console.log('El ícono no se toca. Al terminar queda en borrador: el envío a revisión lo hace Javier en la consola.')
console.log(directo
  ? 'El ícono no se toca. --directo: al terminar entra a revisión y se publica sola cuando Google la apruebe.'
  : 'El ícono no se toca. Al terminar queda en borrador: el envío a revisión lo hace Javier en la consola.')
if (simular) process.exit(0)

const llave = leerLlave()
const jwt = armarJwt(llave)
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
})
if (!tokenRes.ok) throw new Error(await tokenRes.text())
const { access_token: token } = await tokenRes.json()
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAQUETE}`
const auth = { authorization: `Bearer ${token}` }
const edicion = await fetch(`${base}/edits`, { method: 'POST', headers: auth })
if (!edicion.ok) throw new Error(await edicion.text())
const { id } = await edicion.json()
try {
  for (const idioma of ['es-419', 'en-US']) {
    const t = hecho.textos[idioma]
    const r = await fetch(`${base}/edits/${id}/listings/${idioma}`, {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ language: idioma, title: t.nombre, shortDescription: t.breve, fullDescription: t.completa })
    })
    if (!r.ok) throw new Error(await r.text())
  }
  console.log('Textos cargados.')
  const grupos = new Map()
  for (const im of hecho.imagenes) {
    const k = im.idioma + '|' + im.tipo
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k).push(im)
  }
  for (const [k, lista] of grupos) {
    const [idioma, tipo] = k.split('|')
    const borra = await fetch(`${base}/edits/${id}/listings/${idioma}/${tipo}`, { method: 'DELETE', headers: auth })
    if (!borra.ok && borra.status !== 404) throw new Error(await borra.text())
    for (const im of lista) {
      const ruta = im.tipo === 'featureGraphic'
        ? path.join(FICHA, im.nombre)
        : path.join(FICHA, 'capturas', im.tipo === 'phoneScreenshots' ? idioma : path.join('tableta', idioma, im.tipo === 'sevenInchScreenshots' ? '7' : '10'), im.nombre)
      // -07-10-2026, Claude- Primera corrida real: Google respondio 400 "Invalid JSON payload" con el PNG.
      // Los archivos van a la direccion de subida -/upload/androidpublisher/...-, como el AAB en
      // playSubir.mjs, y con su tipo de imagen.
      // Antes: fetch(`${base}/edits/${id}/listings/${idioma}/${tipo}?uploadType=media`, { ... 'application/octet-stream' ... })
      const sube = await fetch(`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PAQUETE}/edits/${id}/listings/${idioma}/${tipo}?uploadType=media`, {
        method: 'POST', headers: { ...auth, 'content-type': 'image/png' }, body: fs.readFileSync(ruta)
      })
      if (!sube.ok) throw new Error(await sube.text())
    }
  }
  // Antes: const fin = await fetch(`${base}/edits/${id}:commit?changesNotSentForReview=true`, { method: 'POST', headers: auth })
  const fin = await fetch(`${base}/edits/${id}:commit${directo ? '' : '?changesNotSentForReview=true'}`, { method: 'POST', headers: auth })
  if (!fin.ok) throw new Error(await fin.text())
  // Antes: console.log('Quedó en borrador. El envío a revisión lo hace Javier en la consola.')
  console.log(directo ? 'Enviada a revisión: se publica sola cuando Google la apruebe.' : 'Quedó en borrador. El envío a revisión lo hace Javier en la consola.')
} catch (e) {
  await fetch(`${base}/edits/${id}`, { method: 'DELETE', headers: auth }).catch(() => {})
  console.error('Borré la edición. Google dijo: ' + e.message)
  process.exit(1)
}
void rutaDeLaLlave
