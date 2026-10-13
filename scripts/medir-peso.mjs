// EL PESO DE SIGO EN CADA TELÉFONO -tarea 103, 06-10-2026-.
//
//   npm run peso                         mide el AAB de Play recién armado -npm run play-
//   npm run peso -- ruta/otro.aab        mide otro AAB
//   npm run peso -- --salida=peso.txt    además deja el informe en un archivo
//
// SOLO MIDE. No arma nada de la app, no firma y no sube nada: toma un AAB que ya existe, le pide a
// bundletool las APK que Play entregaría a cada teléfono y suma. Es la misma medición del informe
// docs/peso/informe.txt, repetible en cualquier AAB.
//
// LOS DOS NÚMEROS, Y POR QUÉ SON DOS.
//   Descarga: lo que baja el teléfono, comprimido. Es lo que bundletool get-size calcula y lo que
//             Play muestra en la ficha -con su propia compresión, así que puede variar unas
//             décimas-.
//   Instalado: lo que ocupa en el teléfono. bundletool no lo calcula, así que se estima: el tamaño
//             de las APK que quedan guardadas -base y paquetes install-time, tal como bundletool
//             las arma- más lo que la app copia después. Dos copias conocidas:
//               - VoskNativoPlugin pasa el modelo español por StorageService.unpack, que lo copia
//                 entero a la memoria de la app la primera vez -vosk-android, StorageService.sync-:
//                 cada paquete install-time se cuenta DOS veces, en su APK y en la copia.
//               - Un paquete on-demand -el inglés- queda como archivos sueltos sin comprimir
//                 -AssetPackLocation.assetsPath()- cuando se baja.
//             Lo que NO se cuenta, porque no se puede saber sin el teléfono: el código compilado
//             por Android -oat, vdex-, la caché de MediaPipe -una copia del .task al encender los
//             gestos, ver docs/peso/informe.txt- y los datos de la persona.
//
// Las funciones de abajo son puras -reciben textos o bytes y devuelven números- para que las
// pruebas las corran sin bundletool ni teléfono: src/pruebas/tarea103-peso.test.ts. El trabajo con
// bundletool está al final, y solo corre cuando se ejecuta este archivo, no cuando se importa.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const MiB = 1048576

// Los teléfonos que se miden. El moto g86 es el de Javier; el de 32 bits es como el moto e20 de
// Test Lab -Android 11 Go, solo armeabi-v7a-. Un teléfono arm64 declara también las ABI de 32 bits,
// como lo hace Android; bundletool elige la mejor.
export const DISPOSITIVOS = [
  {
    id: 'g86',
    nombre: 'moto g86 -arm64-v8a, 450 dpi (xxhdpi), Android 15, es-419-',
    spec: { supportedAbis: ['arm64-v8a', 'armeabi-v7a', 'armeabi'], supportedLocales: ['es-419'], screenDensity: 450, sdkVersion: 35 }
  },
  {
    id: 'e20',
    nombre: '32 bits tipo moto e20 -armeabi-v7a, 280 dpi (xhdpi), Android 11, es-419-',
    spec: { supportedAbis: ['armeabi-v7a', 'armeabi'], supportedLocales: ['es-419'], screenDensity: 280, sdkVersion: 30 }
  }
]

/** El MAX de la salida de bundletool get-size total -"MIN,MAX\n123,456"-, o null si no viene. */
export function leerGetSize(salida) {
  const m = String(salida).match(/^MIN,MAX\s*\r?\n\s*(\d+),(\d+)/m)
  return m ? Number(m[2]) : null
}

/** El versionCode de "bundletool dump manifest --xpath=/manifest/@android:versionCode". */
export function leerVersionCode(salida) {
  const m = String(salida).match(/^\s*(\d+)\s*$/m)
  return m ? Number(m[1]) : null
}

/**
 * Cómo entrega Play un paquete de recursos, leído del manifiesto del módulo -bundletool dump
 * manifest --module=...-: 'install-time', 'fast-follow', 'on-demand', o null si no es un paquete de
 * recursos -el módulo base no tiene <dist:delivery>-.
 */
export function leerEntrega(xml) {
  const texto = String(xml)
  if (!/<dist:delivery\b/.test(texto)) return null
  for (const tipo of ['install-time', 'fast-follow', 'on-demand']) {
    if (new RegExp(`<dist:${tipo}\\b`).test(texto)) return tipo
  }
  return null
}

/**
 * Las entradas de un zip -un AAB o una APK lo son- leídas del directorio central, sin bibliotecas.
 * Devuelve nombre, método -0 guardado, 8 comprimido-, tamaño comprimido, tamaño original y dónde
 * empieza el encabezado local. Un zip64 se rechaza con su motivo: un AAB de Sigo pesa ~110 MB y no
 * lo necesita, y leerlo mal en silencio daría números falsos.
 */
export function listarZip(buf) {
  const minimo = 22
  if (buf.length < minimo) throw new Error(`no es un zip: ${buf.length} bytes`)
  let fin = -1
  for (let i = buf.length - minimo; i >= Math.max(0, buf.length - minimo - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fin = i; break }
  }
  if (fin < 0) throw new Error('no es un zip: falta el fin del directorio central')
  const total = buf.readUInt16LE(fin + 10)
  const inicioDir = buf.readUInt32LE(fin + 16)
  if (total === 0xffff || inicioDir === 0xffffffff) throw new Error('zip64 no soportado por medir-peso')
  const entradas = []
  let p = inicioDir
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`directorio central roto en la entrada ${n}`)
    const metodo = buf.readUInt16LE(p + 10)
    const comprimido = buf.readUInt32LE(p + 20)
    const original = buf.readUInt32LE(p + 24)
    const largoNombre = buf.readUInt16LE(p + 28)
    const largoExtra = buf.readUInt16LE(p + 30)
    const largoComentario = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const nombre = buf.toString('utf8', p + 46, p + 46 + largoNombre)
    entradas.push({ nombre, metodo, comprimido, original, local })
    p += 46 + largoNombre + largoExtra + largoComentario
  }
  return entradas
}

/** Los bytes originales de una entrada -descomprimidos si venía comprimida-. */
export function leerEntrada(buf, entrada) {
  const p = entrada.local
  if (buf.readUInt32LE(p) !== 0x04034b50) throw new Error(`encabezado local roto: ${entrada.nombre}`)
  const datos = p + 30 + buf.readUInt16LE(p + 26) + buf.readUInt16LE(p + 28)
  const crudo = buf.subarray(datos, datos + entrada.comprimido)
  if (entrada.metodo === 0) return crudo
  if (entrada.metodo === 8) return zlib.inflateRawSync(crudo)
  throw new Error(`método de compresión ${entrada.metodo} no soportado: ${entrada.nombre}`)
}

/**
 * La parte de la app a la que pertenece una entrada del AAB. Las bibliotecas nativas se separan
 * por ABI -cada teléfono baja una sola-; lo que no es de la app -metadatos del paquete- es null.
 */
export function categoria(nombre) {
  if (nombre.startsWith('BUNDLE-METADATA/') || nombre.startsWith('META-INF/') || nombre === 'BundleConfig.pb') return null
  const modulo = nombre.split('/')[0]
  if (modulo !== 'base') return `paquete ${modulo}`
  const lib = nombre.match(/^base\/lib\/([^/]+)\/(.+)$/)
  if (lib) {
    const [, abi, archivo] = lib
    if (/mediapipe/.test(archivo)) return `MediaPipe ${archivo} (${abi})`
    if (/vosk/.test(archivo)) return `Vosk ${archivo} (${abi})`
    return `otras bibliotecas nativas (${abi})`
  }
  if (/^base\/assets\/[^/]+\.task$/.test(nombre)) return 'modelo de gestos (.task)'
  if (nombre.startsWith('base/dex/')) return 'código Java/Kotlin (dex)'
  if (nombre.startsWith('base/assets/public/')) return 'app web (assets/public)'
  if (nombre.startsWith('base/res/') || nombre === 'base/resources.pb') return 'recursos Android (res)'
  return 'otros de base'
}

/** Si una categoría le llega a un teléfono con esas ABI -la elegida por bundletool, la primera que haya-. */
export function abiElegida(abisDelTelefono, abisDelAab) {
  return abisDelTelefono.find((a) => abisDelAab.includes(a)) || null
}

/**
 * Suma las entradas del AAB por categoría: bytes originales y una estimación de lo que pesan
 * comprimidas -deflate, nivel 6-. La estimación se pasa por función para que las pruebas no tengan
 * que comprimir nada.
 */
export function resumirPorCategoria(entradas, comprimidoDe) {
  const suma = new Map()
  for (const e of entradas) {
    const c = categoria(e.nombre)
    if (c === null) continue
    const actual = suma.get(c) || { categoria: c, original: 0, comprimido: 0, archivos: 0 }
    actual.original += e.original
    actual.comprimido += comprimidoDe(e)
    actual.archivos += 1
    suma.set(c, actual)
  }
  return [...suma.values()].sort((a, b) => b.original - a.original)
}

/** El módulo de una APK que deja bundletool extract-apks: "base-master.apk" -> base. */
export function moduloDeApk(nombreApk) {
  return path.basename(nombreApk).replace(/\.apk$/, '').split('-')[0]
}

/**
 * EL TAMAÑO INSTALADO ESTIMADO. Recibe las APK que bundletool armó para el teléfono, la entrega de
 * cada paquete y el tamaño sin comprimir del contenido de cada paquete. Devuelve:
 *   alInstalar     las APK que Android guarda al instalar: base + paquetes install-time.
 *   primeraLectura alInstalar + la copia que StorageService hace de cada paquete install-time.
 *   conAPedido     primeraLectura + los paquetes on-demand y fast-follow ya bajados, como archivos.
 */
export function estimarInstalado({ apks, entregas, contenidoDePaquete }) {
  let alInstalar = 0
  for (const a of apks) {
    const modulo = moduloDeApk(a.nombre)
    if (modulo === 'base' || entregas[modulo] === 'install-time') alInstalar += a.bytes
  }
  let copias = 0
  let aPedido = 0
  for (const [modulo, entrega] of Object.entries(entregas)) {
    const bytes = contenidoDePaquete[modulo] || 0
    if (entrega === 'install-time') copias += bytes
    else if (entrega === 'on-demand' || entrega === 'fast-follow') aPedido += bytes
  }
  return { alInstalar, primeraLectura: alInstalar + copias, conAPedido: alInstalar + copias + aPedido }
}

/** "55,5" -MB de 1.048.576 bytes, coma decimal, como lo muestra Play en español-. */
export function formatearMB(bytes, decimales = 1) {
  return (bytes / MiB).toFixed(decimales).replace('.', ',')
}

// --- De aquí para abajo, el trabajo con bundletool. Solo al ejecutar el archivo. ---------------

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HERRAMIENTAS = path.join(RAIZ, '.herramientas')
// La misma versión que scripts/play.mjs: la misma herramienta da los mismos números.
const VERSION_BUNDLETOOL = '1.18.3'
const BUNDLETOOL = path.join(HERRAMIENTAS, `bundletool-all-${VERSION_BUNDLETOOL}.jar`)

function buscarJava() {
  const win = process.platform === 'win32'
  if (process.env.JAVA_HOME) {
    const j = path.join(process.env.JAVA_HOME, 'bin', 'java' + (win ? '.exe' : ''))
    if (fs.existsSync(j)) return j
  }
  return 'java'
}

async function asegurarBundletool() {
  if (fs.existsSync(BUNDLETOOL)) return
  fs.mkdirSync(HERRAMIENTAS, { recursive: true })
  const url = `https://github.com/google/bundletool/releases/download/${VERSION_BUNDLETOOL}/bundletool-all-${VERSION_BUNDLETOOL}.jar`
  console.log(`Bajando bundletool ${VERSION_BUNDLETOOL} a .herramientas/ -una sola vez-...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`no se pudo bajar bundletool: HTTP ${res.status} desde ${url}`)
  fs.writeFileSync(BUNDLETOOL, Buffer.from(await res.arrayBuffer()))
}

function medir(aab) {
  const java = buscarJava()
  const bt = (args) => {
    const r = spawnSync(java, ['-jar', BUNDLETOOL, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const salida = (r.stdout || '') + (r.stderr || '')
    if (r.status !== 0) throw new Error(`bundletool ${args[0]} falló: ${salida.trim().split('\n').pop() || r.error?.message}`)
    return salida
  }

  const buf = fs.readFileSync(aab)
  const entradas = listarZip(buf)
  const modulos = [...new Set(entradas.map((e) => e.nombre.split('/')[0]))]
    .filter((m) => entradas.some((e) => e.nombre === `${m}/manifest/AndroidManifest.xml`))
  const entregas = {}
  for (const m of modulos) {
    if (m === 'base') continue
    entregas[m] = leerEntrega(bt(['dump', 'manifest', `--bundle=${aab}`, `--module=${m}`]))
  }
  const contenidoDePaquete = {}
  for (const m of Object.keys(entregas)) {
    contenidoDePaquete[m] = entradas.filter((e) => e.nombre.startsWith(`${m}/assets/`)).reduce((s, e) => s + e.original, 0)
  }
  const versionCode = leerVersionCode(bt(['dump', 'manifest', `--bundle=${aab}`, '--xpath=/manifest/@android:versionCode']))

  // La compresión de cada entrada, para el desglose. Lo guardado se comprime aquí; lo ya comprimido
  // en el AAB se toma como viene.
  const comprimidoDe = (e) => (e.metodo === 8 ? e.comprimido : zlib.deflateRawSync(leerEntrada(buf, e), { level: 6 }).length)
  const cache = new Map()
  const comprimidoConCache = (e) => {
    if (!cache.has(e.nombre)) cache.set(e.nombre, comprimidoDe(e))
    return cache.get(e.nombre)
  }
  const abisDelAab = [...new Set(entradas.map((e) => (e.nombre.match(/^base\/lib\/([^/]+)\//) || [])[1]).filter(Boolean))]

  fs.mkdirSync(HERRAMIENTAS, { recursive: true })
  const apks = path.join(HERRAMIENTAS, 'peso.apks')
  bt(['build-apks', `--bundle=${aab}`, `--output=${apks}`, '--overwrite'])

  const telefonos = []
  for (const d of DISPOSITIVOS) {
    const spec = path.join(HERRAMIENTAS, `peso-${d.id}.json`)
    fs.writeFileSync(spec, JSON.stringify(d.spec))
    const todos = ['base', ...Object.keys(entregas)].join(',')
    const descargaInstalar = leerGetSize(bt(['get-size', 'total', `--apks=${apks}`, `--device-spec=${spec}`]))
    const descargaBase = leerGetSize(bt(['get-size', 'total', `--apks=${apks}`, `--device-spec=${spec}`, '--modules=base']))
    const descargaTodo = leerGetSize(bt(['get-size', 'total', `--apks=${apks}`, `--device-spec=${spec}`, `--modules=${todos}`]))
    const carpeta = path.join(HERRAMIENTAS, `peso-${d.id}`)
    fs.rmSync(carpeta, { recursive: true, force: true })
    bt(['extract-apks', `--apks=${apks}`, `--device-spec=${spec}`, `--output-dir=${carpeta}`, '--modules=_ALL_'])
    const listaApks = fs.readdirSync(carpeta).filter((n) => n.endsWith('.apk'))
      .map((n) => ({ nombre: n, bytes: fs.statSync(path.join(carpeta, n)).size }))
    const instalado = estimarInstalado({ apks: listaApks, entregas, contenidoDePaquete })
    const abi = abiElegida(d.spec.supportedAbis, abisDelAab)
    const suyas = entradas.filter((e) => {
      const lib = e.nombre.match(/^base\/lib\/([^/]+)\//)
      return !lib || lib[1] === abi
    })
    telefonos.push({ d, abi, descargaInstalar, descargaBase, descargaTodo, listaApks, instalado, desglose: resumirPorCategoria(suyas, comprimidoConCache) })
  }
  return { aab, bytesAab: buf.length, versionCode, entregas, contenidoDePaquete, telefonos }
}

export function armarInforme(r) {
  const l = []
  l.push(`AAB: ${r.aab}  (${formatearMB(r.bytesAab)} MB, versionCode ${r.versionCode ?? 'sin leer'})`)
  l.push('Paquetes de recursos: ' + Object.entries(r.entregas).map(([m, e]) => `${m} ${e} (${formatearMB(r.contenidoDePaquete[m])} MB sin comprimir)`).join(', '))
  l.push('MB = 1.048.576 bytes. Descarga: bundletool get-size total. Instalado: estimación -ver el encabezado de scripts/medir-peso.mjs-.')
  for (const t of r.telefonos) {
    l.push('')
    l.push(`== ${t.d.nombre}`)
    l.push(`  Descarga al instalar (base + install-time): ${formatearMB(t.descargaInstalar)} MB  -solo base: ${formatearMB(t.descargaBase)} MB-`)
    l.push(`  Descarga extra a pedido (on-demand/fast-follow): ${formatearMB(t.descargaTodo - t.descargaInstalar)} MB`)
    l.push(`  Instalado al terminar la instalación: ${formatearMB(t.instalado.alInstalar)} MB`)
    l.push(`  Instalado tras la primera lectura -copia de StorageService-: ${formatearMB(t.instalado.primeraLectura)} MB`)
    l.push(`  Instalado con los paquetes a pedido bajados: ${formatearMB(t.instalado.conAPedido)} MB`)
    l.push('  APK que entrega Play: ' + t.listaApks.map((a) => `${a.nombre} ${formatearMB(a.bytes, 2)}`).join(', '))
    l.push('  Desglose -sin comprimir / comprimido estimado, deflate 6-:')
    for (const c of t.desglose) {
      l.push(`    ${c.categoria.padEnd(52)} ${formatearMB(c.original, 2).padStart(7)} MB  ${formatearMB(c.comprimido, 2).padStart(7)} MB`)
    }
  }
  return l.join('\n')
}

const ejecutado = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (ejecutado) {
  const args = process.argv.slice(2)
  const aab = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(RAIZ, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab'))
  const salida = (args.find((a) => a.startsWith('--salida=')) || '').slice('--salida='.length)
  if (!fs.existsSync(aab)) {
    console.error(`No está el AAB: ${aab}\nArmalo con npm run play, o pasa la ruta: npm run peso -- ruta/al.aab`)
    process.exit(1)
  }
  try {
    await asegurarBundletool()
    const texto = armarInforme(medir(aab))
    console.log(texto)
    if (salida) {
      fs.writeFileSync(salida, texto + '\n')
      console.log(`\nInforme guardado en ${salida}`)
    }
  } catch (e) {
    console.error('No se pudo medir: ' + e.message)
    process.exit(1)
  }
}
