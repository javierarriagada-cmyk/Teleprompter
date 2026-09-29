// LA VERSIÓN PARA GOOGLE PLAY, EN UN COMANDO -tarea 84, A3, 29-09-2026-.
//
//   npm run play                 arma el AAB firmado para subir a Play Console
//   npm run play -- sinR8        lo mismo sin R8 -si R8 rompe algo en el teléfono, C3-
//   npm run play -- probar       además lo instala en el teléfono conectado como si viniera de
//                                Play, con la descarga del modelo inglés simulada -D5-
//
// ES UN CAMINO APARTE DE LA APK DE PRUEBA. npm run apk -scripts/apk.mjs- no cambia: sigue armando
// la APK debug con los dos modelos dentro y las herramientas de diagnóstico, la que Claude pone en
// el moto g86. Esto arma otra cosa, en otro modo:
//
//   1. vite build --mode play   la web sin herramientas de prueba y sin service worker -.env.play-
//   2. cap sync android         la copia adentro del proyecto Android, igual que apk.mjs
//   3. gradlew bundleRelease -PparaPlay
//                               el AAB: release, con R8, firmado con la llave de subida si está
//                               android/keystore.properties, y los modelos en sus paquetes
//   4. las comprobaciones de A4, que dicen OK o FALLA
//
// NINGUNA LLAVE NI CONTRASEÑA PASA POR ESTE ARCHIVO. La firma la hace Gradle leyendo
// android/keystore.properties, que git ignora. Aquí solo se lee ese archivo para comprobar la firma
// del AAB con jarsigner, y la contraseña no se imprime nunca.
//
// Java 21 y el SDK se buscan igual que en apk.mjs -ahí está por qué el 21-. Se repite la búsqueda
// en vez de importarla porque apk.mjs corre entero al importarlo.
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ANDROID = path.join(RAIZ, 'android')
const AAB = path.join(ANDROID, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
const HERRAMIENTAS = path.join(RAIZ, '.herramientas')
// La versión de bundletool queda fija: la misma herramienta da los mismos números de una vez a otra.
const VERSION_BUNDLETOOL = '1.18.3'
const BUNDLETOOL = path.join(HERRAMIENTAS, `bundletool-all-${VERSION_BUNDLETOOL}.jar`)
const win = process.platform === 'win32'
const args = process.argv.slice(2)

function buscarJava21() {
  if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', 'java' + (win ? '.exe' : '')))) {
    return process.env.JAVA_HOME
  }
  const candidatos = [
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'jdk21'),
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
    '/usr/lib/jvm/java-21-openjdk'
  ]
  for (const c of candidatos) {
    if (fs.existsSync(path.join(c, 'bin', 'java' + (win ? '.exe' : '')))) return c
  }
  return null
}

function buscarSdk() {
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) return process.env.ANDROID_HOME
  const c = path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk')
  return fs.existsSync(c) ? c : null
}

const java = buscarJava21()
const sdk = buscarSdk()
if (!java) {
  console.error('No encuentro un Java 21 -ver scripts/apk.mjs-. Bajalo de https://adoptium.net (Temurin 21).')
  process.exit(1)
}
if (!sdk) {
  console.error('No encuentro el SDK de Android. Instala Android Studio o define ANDROID_HOME.')
  process.exit(1)
}
for (const carpeta of ['model-es', 'model-en']) {
  if (!fs.existsSync(path.join(ANDROID, 'app', 'src', 'main', 'assets', carpeta, 'am'))) {
    console.error(`Falta el modelo ${carpeta}. Corre primero:  npm run modelo`)
    process.exit(1)
  }
}

const binJava = path.join(java, 'bin', 'java' + (win ? '.exe' : ''))
const entorno = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk }
function correr(cmd, cmdArgs, cwd) {
  execFileSync(cmd, cmdArgs, { cwd, env: entorno, stdio: 'inherit', shell: win })
}
function leer(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { env: entorno, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { ok: r.status === 0, salida: (r.stdout || '') + (r.stderr || '') }
}

console.log('\n[1/4] Armando el paquete web para Play...')
// --mode play: sin motor web, sin herramientas de prueba, sin service worker -.env.play, vite.config.ts-.
correr('npx', ['vite', 'build', '--mode', 'play'], RAIZ)

console.log('\n[2/4] Copiandolo adentro del proyecto Android...')
correr('npx', ['cap', 'sync', 'android'], RAIZ)

console.log('\n[3/4] Compilando el AAB...')
const gradleArgs = ['bundleRelease', '-PparaPlay', '--no-daemon']
if (args.includes('sinR8')) gradleArgs.push('-PsinR8')
correr(path.join(ANDROID, win ? 'gradlew.bat' : 'gradlew'), gradleArgs, ANDROID)

const mbAab = (fs.statSync(AAB).size / 1048576).toFixed(1)
console.log(`\nListo: ${AAB}  (${mbAab} MB)`)

// Y UNA COPIA EN EL ESCRITORIO, como la APK de prueba -apk.mjs-, con otro nombre para no
// confundirlas: Sigo-play.aab es la que se sube a Play Console.
try {
  const escritorio = path.join(os.homedir(), 'Desktop')
  if (fs.existsSync(escritorio)) {
    const copia = path.join(escritorio, 'Sigo-play.aab')
    if (fs.existsSync(copia)) fs.rmSync(copia)
    fs.copyFileSync(AAB, copia)
    console.log(`Copia en el Escritorio: ${copia}`)
  }
} catch (e) {
  console.log(`(no se pudo dejar la copia en el Escritorio: ${e.message})`)
}

// BUNDLETOOL SE BAJA UNA VEZ, a .herramientas/ -ignorada por git-, no al repositorio.
async function asegurarBundletool() {
  if (fs.existsSync(BUNDLETOOL)) return true
  fs.mkdirSync(HERRAMIENTAS, { recursive: true })
  const url = `https://github.com/google/bundletool/releases/download/${VERSION_BUNDLETOOL}/bundletool-all-${VERSION_BUNDLETOOL}.jar`
  console.log(`Bajando bundletool ${VERSION_BUNDLETOOL} a .herramientas/ -una sola vez-...`)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    fs.writeFileSync(BUNDLETOOL, Buffer.from(await res.arrayBuffer()))
    return true
  } catch (e) {
    console.log(`No se pudo bajar bundletool: ${e.message}`)
    return false
  }
}

// Los datos de la llave, si están. Solo para comprobar y para firmar las APK de prueba local.
function leerLlave() {
  const archivo = path.join(ANDROID, 'keystore.properties')
  if (!fs.existsSync(archivo)) return null
  const datos = {}
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z]+)\s*=\s*(.*)\s*$/)
    if (m && !linea.trim().startsWith('#')) datos[m[1]] = m[2]
  }
  if (datos.storeFile && !path.isAbsolute(datos.storeFile)) datos.storeFile = path.join(ANDROID, datos.storeFile)
  return datos
}

console.log('\n[4/4] Comprobaciones')
const resultados = []
function anotarResultado(ok, texto) {
  resultados.push(ok)
  console.log(`  ${ok === null ? 'AVISO' : ok ? 'OK   ' : 'FALLA'}  ${texto}`)
}

const llave = leerLlave()
if (llave) {
  // jarsigner -verify: el AAB se firma como un jar. "jar verified." es la firma entera y válida.
  const v = leer(path.join(java, 'bin', 'jarsigner' + (win ? '.exe' : '')), ['-verify', AAB])
  const firmado = v.ok && /jar verified\./.test(v.salida) && !/unsigned/i.test(v.salida)
  anotarResultado(firmado, firmado ? 'el AAB está firmado con la llave de subida' : 'el AAB NO quedó firmado: revisa android/keystore.properties')
} else {
  anotarResultado(null, 'no hay android/keystore.properties: el AAB salió SIN FIRMAR y Play no lo acepta -ver android/keystore.properties.ejemplo-')
}

if (await asegurarBundletool()) {
  const bt = (btArgs) => leer(binJava, ['-jar', BUNDLETOOL, ...btArgs])

  // PÁGINAS DE 16 KB: Play las exige para las bibliotecas nativas desde Android 15. El AAB lo
  // declara en su configuración.
  const config = bt(['dump', 'config', `--bundle=${AAB}`])
  const alineado = /PAGE_ALIGNMENT_16K/.test(config.salida)
  anotarResultado(alineado, alineado ? 'alineación de 16 KB -PAGE_ALIGNMENT_16K-' : 'el AAB no declara PAGE_ALIGNMENT_16K')

  // EL PESO DE DESCARGA POR TELÉFONO. Se arman las APK que Play entregaría y se mide lo que baja
  // un teléfono arm64 en español y uno en inglés. El inglés además baja model-en la primera vez
  // que lee: se suma aparte, porque no es parte de la instalación.
  const apks = path.join(HERRAMIENTAS, 'medir.apks')
  if (fs.existsSync(apks)) fs.rmSync(apks)
  const armar = bt(['build-apks', `--bundle=${AAB}`, `--output=${apks}`])
  if (!armar.ok) {
    anotarResultado(false, 'bundletool no pudo armar las APK para medir: ' + armar.salida.trim().split('\n').pop())
  } else {
    for (const [nombre, locale] of [['español', 'es-419'], ['inglés', 'en-US']]) {
      const spec = path.join(HERRAMIENTAS, `telefono-${locale}.json`)
      fs.writeFileSync(spec, JSON.stringify({ supportedAbis: ['arm64-v8a'], supportedLocales: [locale], screenDensity: 420, sdkVersion: 35 }))
      const total = bt(['get-size', 'total', `--apks=${apks}`, `--device-spec=${spec}`])
      // --modules nombra TODO lo que se cuenta: con 'base,model_en' a secas bundletool deja fuera
      // model_es, que igual viene con la instalación -medido: daba 45,4 MB en vez de 83,4-.
      const conIngles = bt(['get-size', 'total', `--apks=${apks}`, `--device-spec=${spec}`, '--modules=base,model_es,model_en'])
      const mb = (r) => {
        const m = r.salida.match(/^MIN,MAX\s*\n\s*(\d+),(\d+)/m)
        return m ? (Number(m[2]) / 1048576).toFixed(1) : null
      }
      const instalacion = mb(total)
      const ingles = mb(conIngles)
      if (instalacion === null) {
        anotarResultado(false, `no se pudo medir el teléfono en ${nombre}: ${total.salida.trim().split('\n').pop()}`)
      } else {
        anotarResultado(true, `teléfono arm64 en ${nombre}: ${instalacion} MB al instalar` +
          (ingles !== null ? `; ${ingles} MB si además lee en inglés -model_en, a pedido-` : '') + ' -la APK de prueba: unos 130 MB-')
      }
    }
  }

  // EL NÚMERO DE VERSIÓN SUBE. Es la cantidad de commits -app/build.gradle-. Se compara con el del
  // AAB anterior que armó este comando en este computador -.herramientas/, ignorada-: si es igual,
  // es el mismo commit, y si ese ya se subió, Play rechaza este.
  const manifiesto = bt(['dump', 'manifest', `--bundle=${AAB}`, '--xpath=/manifest/@android:versionCode'])
  const version = Number((manifiesto.salida.match(/^\s*(\d+)\s*$/m) || [])[1])
  const archivoVersion = path.join(HERRAMIENTAS, 'ultimo-versionCode-play.txt')
  const anterior = fs.existsSync(archivoVersion) ? Number(fs.readFileSync(archivoVersion, 'utf8').trim()) : 0
  if (!version) {
    anotarResultado(false, 'no se pudo leer el versionCode del AAB')
  } else if (version > anterior) {
    anotarResultado(true, `versionCode ${version}` + (anterior ? `, mayor que el del AAB anterior -${anterior}-` : ' -primer AAB armado en este computador-'))
    fs.writeFileSync(archivoVersion, String(version))
  } else {
    anotarResultado(false, `versionCode ${version}, no mayor que el del AAB anterior -${anterior}-: si ese ya se subió, Play rechaza este. Haz un commit y vuelve a armar.`)
  }

  // COMO SI VINIERA DE PLAY, EN EL TELÉFONO -D5-. --local-testing deja los paquetes on-demand en
  // el teléfono y la biblioteca de Play finge descargarlos: se prueba la descarga del inglés sin
  // subir nada. Firma con la llave de subida si está, o con la de depuración del computador.
  if (args.includes('probar')) {
    const apksLocal = path.join(HERRAMIENTAS, 'probar.apks')
    if (fs.existsSync(apksLocal)) fs.rmSync(apksLocal)
    const firma = llave
      ? [`--ks=${llave.storeFile}`, `--ks-key-alias=${llave.keyAlias}`, `--ks-pass=pass:${llave.storePassword}`, `--key-pass=pass:${llave.keyPassword}`]
      : []
    console.log('\nArmando las APK de prueba local -bundletool --local-testing-...')
    const armarLocal = bt(['build-apks', `--bundle=${AAB}`, `--output=${apksLocal}`, '--local-testing', ...firma])
    if (!armarLocal.ok) {
      console.error('No se pudieron armar: ' + armarLocal.salida.trim().split('\n').pop())
    } else {
      const adb = path.join(sdk, 'platform-tools', 'adb' + (win ? '.exe' : ''))
      console.log('Instalando en el teléfono conectado...')
      const inst = bt(['install-apks', `--apks=${apksLocal}`, `--adb=${adb}`])
      console.log(inst.ok ? 'Instalado. Abre un guion en inglés y aprieta Empezar: se ve la descarga del modelo.' : 'No se pudo instalar: ' + inst.salida.trim().split('\n').pop())
    }
  }
} else {
  anotarResultado(false, 'sin bundletool no se pueden hacer las comprobaciones de 16 KB, peso y versión')
}

if (resultados.includes(false)) {
  console.log('\nHay comprobaciones en FALLA: no subas este AAB sin revisarlas.')
  process.exitCode = 1
}
