// LAS LICENCIAS QUE VIAJAN CON LA APP -tarea 100, 06-10-2026-.
//
//   npm run licencias            escribe public/licencias.json
//   npm run licencias -- --verificar   falla si el archivo no coincide con lo que generaría ahora
//
// Nada escrito de memoria: JavaScript sale de npm ls y del LICENSE del paquete; Android, del POM.
// Apache 2.0 se guarda una sola vez. @capacitor/cli no viaja en la app y se excluye.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(RAIZ, 'public', 'licencias.json')
const verificar = process.argv.includes('--verificar')

function normalizar(licencia) {
  const s = String(licencia || '').toUpperCase()
  if (s.includes('APACHE')) return 'Apache-2.0'
  if (s.includes('MIT')) return 'MIT'
  if (s.includes('OFL') || s.includes('OPEN FONT')) return 'OFL-1.1'
  if (s.includes('BSD')) return 'BSD'
  if (s.includes('LGPL')) return 'LGPL-2.1'
  return licencia || 'sin verificar'
}

function leerLicense(dir) {
  if (!dir || !fs.existsSync(dir)) return ''
  const nombre = fs.readdirSync(dir).find((f) => /^licen[sc]e/i.test(f))
  return nombre ? fs.readFileSync(path.join(dir, nombre), 'utf8') : ''
}

function paquetesJs() {
  // -07-10-2026, Claude- En Windows npm es npm.cmd y sin shell daba "spawnSync npm ENOENT": la
  // comprobacion de npm run play salia siempre en FALLA. shell solo en Windows, como apk.mjs.
  // --long trae la ruta de cada paquete: los anidados -argparse/node_modules/sprintf-js- no estan en
  // node_modules/<nombre> y salian "sin verificar" teniendo su LICENSE.
  // Antes: execFileSync('npm', ['ls', '--omit=dev', '--all', '--json'], { cwd: RAIZ, ... })
  // npm ls sale con codigo 1 si node_modules tiene paquetes de mas -"extraneous", en el PC de Javier
  // hay varios @babel- aunque el JSON venga completo: se lee stdout igual y solo se corta si no es JSON.
  const r = spawnSync('npm', ['ls', '--omit=dev', '--all', '--json', '--long'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' })
  const crudo = r.stdout || ''
  if (!crudo.trim().startsWith('{')) throw new Error('npm ls no devolvio JSON: ' + (r.error?.message || r.stderr || '').slice(0, 500))
  const arbol = JSON.parse(crudo)
  const vistos = new Map()
  const porCli = new Set()
  const fuera = new Set()
  function caminar(nodo, esCli) {
    for (const [nombre, hijo] of Object.entries(nodo.dependencies || {})) {
      // Lo que sobra en node_modules no viaja en la app y cambia de un PC a otro: con eso adentro,
      // --verificar fallaria segun la maquina.
      if (hijo.extraneous || hijo.missing) continue
      // -20-10-2026, cuenta-google- Lo que no está instalado tampoco viaja: npm ls nombra igual las
      // dependencias pares opcionales que nadie instaló, sin versión ni ruta y sin marcarlas missing
      // -@react-native-async-storage/async-storage, de @firebase/auth-. Salían sin versión y «sin verificar».
      if (!hijo.version && !hijo.path) continue
      const cli = esCli || nombre === '@capacitor/cli'
      const clave = nombre + '@' + (hijo.version || '')
      if (cli) porCli.add(clave)
      else fuera.add(clave)
      caminar(hijo, cli)
      if (cli || nombre === '@capacitor/cli') continue
      const dir = hijo.path || path.join(RAIZ, 'node_modules', ...nombre.split('/'))
      const pkg = fs.existsSync(path.join(dir, 'package.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) : {}
      // -07-10-2026, Claude- Si el paquete declara Apache 2.0 y no trae archivo, el texto es el mismo
      // de siempre -va una sola vez en el JSON-: queda verificado por su package.json. Otra licencia
      // sin archivo sigue "sin verificar": a BSD y MIT les falta el copyright, que va en el texto.
      const declaradaApache = !leerLicense(dir) && normalizar(pkg.license) === 'Apache-2.0'
      vistos.set(clave, {
        nombre,
        version: hijo.version || pkg.version || '',
        licencia: leerLicense(dir) || declaradaApache ? normalizar(pkg.license) : 'sin verificar',
        texto: leerLicense(dir),
        nota: leerLicense(dir) ? '' : declaradaApache
          ? 'El paquete no trae archivo de licencia; su package.json declara Apache-2.0.'
          : `El paquete no trae archivo de licencia${pkg.license ? `; su package.json declara ${pkg.license}` : ''}. Sin verificar.`,
        origen: 'npm'
      })
    }
  }
  caminar(arbol, false)
  return [...vistos.values()].filter((p) => p.nombre !== '@capacitor/cli' && !(porCli.has(p.nombre + '@' + p.version) && !fuera.has(p.nombre + '@' + p.version)))
}

function coordenadas() {
  const vars = {}
  const variables = fs.readFileSync(path.join(RAIZ, 'android', 'variables.gradle'), 'utf8')
  for (const m of variables.matchAll(/(\w+)\s*=\s*'([^']+)'/g)) vars[m[1]] = m[2]
  const gradle = fs.readFileSync(path.join(RAIZ, 'android', 'app', 'build.gradle'), 'utf8')
  const lineas = gradle.split(/\r?\n/).filter((l) => /^\s*implementation /.test(l) && !l.includes('fileTree') && !l.includes('project('))
  return lineas.map((l) => {
    const m = l.match(/['"]([^'"]+)['"]/)
    if (!m) return null
    const partes = m[1].split(':')
    if (partes.length < 3) return null
    let version = partes[2].replace('@aar', '')
    if (version.startsWith('$')) version = vars[version.slice(1)] || version
    return { grupo: partes[0], artefacto: partes[1], version }
  }).filter(Boolean)
}

async function pomDe(c) {
  const ruta = `${c.grupo.replaceAll('.', '/')}/${c.artefacto}/${c.version}/${c.artefacto}-${c.version}.pom`
  const urls = [
    `https://repo1.maven.org/maven2/${ruta}`,
    `https://dl.google.com/dl/android/maven2/${ruta}`
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url)
      if (r.ok) return { url, texto: await r.text() }
    } catch { /* la otra fuente */ }
  }
  return null
}

function licenciaDePom(texto) {
  const nombre = texto.match(/<license>[\s\S]*?<name>([^<]+)<\/name>/)
  return normalizar(nombre ? nombre[1] : '')
}

async function paquetesAndroid() {
  const salida = []
  for (const c of coordenadas()) {
    if (c.grupo === 'net.java.dev.jna') {
      salida.push({
        nombre: `${c.grupo}:${c.artefacto}`,
        version: c.version,
        licencia: 'Apache-2.0',
        texto: '',
        origen: 'android',
        nota: 'Licencia doble, LGPL 2.1 o Apache 2.0. Se declara Apache 2.0, que es una de las dos que ofrece el POM.'
      })
      continue
    }
    const pom = await pomDe(c)
    // -20-10-2026, cuenta-google- Como en JavaScript: una licencia que no es Apache 2.0 y no trae su texto
    // queda «sin verificar», con la que declara el POM en la nota. Así llegó googleid: su POM dice
    // «Android Software Development Kit License» -developer.android.com/studio/terms.html- y no hay texto
    // que guardar. Antes: licencia: pom ? licenciaDePom(pom.texto) : 'sin verificar', sin nota.
    const declarada = pom ? licenciaDePom(pom.texto) : 'sin verificar'
    const urlDeclarada = pom ? (pom.texto.match(/<license>[\s\S]*?<url>([^<]+)<\/url>/) || [])[1] : ''
    // -20-10-2026, cuenta-google, aprobado por Javier- Si el POM no trae el texto, se busca guardado en
    // docs/licencias/<grupo>.<artefacto>/ y se lee con leerLicense, igual que el LICENSE de un paquete npm.
    // El de googleid es el texto de https://developer.android.com/studio/terms.html -«This is the Android
    // Software Development Kit License Agreement», versión del 28-04-2026-, bajado el 20-10-2026 y pasado a
    // texto plano sin cambiar nada.
    const textoGuardado = leerLicense(path.join(RAIZ, 'docs', 'licencias', `${c.grupo}.${c.artefacto}`))
    // Antes: const sinTexto = declarada !== 'Apache-2.0' && declarada !== 'sin verificar'
    const sinTexto = declarada !== 'Apache-2.0' && declarada !== 'sin verificar' && !textoGuardado
    salida.push({
      nombre: `${c.grupo}:${c.artefacto}`,
      version: c.version,
      licencia: sinTexto ? 'sin verificar' : declarada,
      // Antes: texto: '',
      texto: sinTexto ? '' : textoGuardado,
      origen: 'android',
      // Con el texto guardado, la fuente es la página de la licencia y el POM queda en la nota.
      // Antes: fuente: pom ? pom.url : '',
      fuente: textoGuardado && urlDeclarada ? urlDeclarada : pom ? pom.url : '',
      ...(textoGuardado && urlDeclarada ? { nota: `Texto de ${urlDeclarada}, guardado en docs/licencias/${c.grupo}.${c.artefacto}/. La licencia la declara su POM: ${pom.url}` } : {}),
      ...(sinTexto ? { nota: `Su POM declara ${declarada}${urlDeclarada ? ` -${urlDeclarada}-` : ''}, sin texto de licencia que guardar. Sin verificar.` } : {})
    })
  }
  return salida
}

function extras() {
  const archivo = path.join(RAIZ, 'docs', 'licencias-extra.json')
  return JSON.parse(fs.readFileSync(archivo, 'utf8')).map((e) => ({ ...e, origen: 'extra' }))
}

function armar(lista, textoApache) {
  const componentes = lista.map((x) => ({
    nombre: x.nombre,
    version: x.version,
    licencia: x.licencia,
    origen: x.origen,
    fuente: x.fuente || '',
    nota: x.nota || '',
    texto: x.licencia === 'Apache-2.0' ? '' : x.texto
  }))
  return { apache: textoApache, componentes }
}

const js = paquetesJs()
const android = await paquetesAndroid()
const lista = [...js, ...android, ...extras()]
// -20-10-2026, cuenta-google- Solo sirve el texto COMPLETO de Apache 2.0, el que trae sus términos. Con
// firebase llegó primero un aviso corto de James Coglan -«Copyright 2014-2020», que solo nombra la
// «Apache License»- y quedó como el texto de Apache de toda la app.
// Antes: let textoApache = (lista.find((x) => x.licencia === 'Apache-2.0' && x.texto && x.texto.includes('Apache License')) || {}).texto || ''
let textoApache = (lista.find((x) => x.licencia === 'Apache-2.0' && x.texto && x.texto.includes('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION')) || {}).texto || ''
if (!textoApache) {
  const r = await fetch('https://www.apache.org/licenses/LICENSE-2.0.txt')
  textoApache = r.ok ? await r.text() : ''
}
const generado = armar(lista, textoApache)
const json = JSON.stringify(generado, null, 2) + '\n'
if (verificar) {
  // -07-10-2026, Claude- Git en Windows deja el archivo con \r\n al hacer checkout; sin normalizar,
  // la comprobacion daba FALLA despues de cada cambio de rama aunque el contenido fuera el mismo.
  const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8').replace(/\r\n/g, '\n') : ''
  if (actual !== json) {
    console.error('FALLA  licencias al día: public/licencias.json no coincide. Corre npm run licencias.')
    process.exit(1)
  }
  console.log('OK  licencias al día')
} else {
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true })
  fs.writeFileSync(SALIDA, json)
  const porTipo = {}
  for (const c of generado.componentes) porTipo[c.licencia] = (porTipo[c.licencia] || 0) + 1
  console.log(`public/licencias.json  ${Buffer.byteLength(json)} bytes  ${generado.componentes.length} componentes`)
  console.log(porTipo)
}
