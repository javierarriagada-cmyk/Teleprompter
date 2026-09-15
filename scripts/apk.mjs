// DEL CODIGO AL TELEFONO, EN UN COMANDO.
//
//   npm run apk            construye el APK
//   npm run apk -- poner   construye e instala en lo que este conectado
//                          -el emulador, o tu telefono por cable-
//
// POR QUE EXISTE ESTE ARCHIVO.
//
// El APK sale de tres pasos encadenados y ninguno se puede saltar:
//
//   1. vite build      arma el paquete web. Capacitor es un envoltorio: adentro
//                      del APK corre este mismo codigo, en un navegador sin barra
//                      de direcciones. Este paso no desaparece nunca.
//   2. cap sync        copia ese paquete adentro del proyecto Android.
//   3. gradlew         compila el APK de verdad.
//
// Hacerlos a mano es donde se cuelan los errores: compilar y olvidarse de
// sincronizar deja el APK con el codigo de ayer, y eso no da ningun error -da algo
// peor, que es un telefono mostrando una version vieja sin que nadie se entere-.
//
// LAS VERSIONES DE JAVA, QUE COSTARON DOS INTENTOS.
//
// Android Studio trae OpenJDK 25 y Gradle no lo soporta: "Unsupported class file
// major version 69". Con el 17 falla mas adelante, en Capacitor: "invalid source
// release: 21". El punto justo es JAVA 21, y por eso se busca ese y no el que
// venga en el PATH.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ANDROID = path.join(RAIZ, 'android')
const APK = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const win = process.platform === 'win32'

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
  console.error('No encuentro un Java 21.')
  console.error('Gradle no anda con el 25 que trae Android Studio ni con el 17.')
  console.error('Bajalo de https://adoptium.net (Temurin 21) y volve a intentar.')
  process.exit(1)
}
if (!sdk) {
  console.error('No encuentro el SDK de Android. Instala Android Studio o define ANDROID_HOME.')
  process.exit(1)
}

const modelo = path.join(ANDROID, 'app', 'src', 'main', 'assets', 'model-es', 'am')
if (!fs.existsSync(modelo)) {
  console.error('Falta el modelo de voz. Corre primero:  npm run modelo')
  process.exit(1)
}

const entorno = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk }
function correr(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, env: entorno, stdio: 'inherit', shell: win })
}

console.log('\n[1/3] Armando el paquete web...')
correr('npx', ['vite', 'build'], RAIZ)

console.log('\n[2/3] Copiandolo adentro del proyecto Android...')
correr('npx', ['cap', 'sync', 'android'], RAIZ)

console.log('\n[3/3] Compilando el APK...')
// CON LA RUTA COMPLETA, NO "gradlew.bat" A SECAS. En Windows, cmd no busca en el
// directorio actual, asi que con shell:true da "no se reconoce como un comando"
// aunque el archivo este ahi al lado. Con la ruta entera anda en los dos sistemas.
correr(path.join(ANDROID, win ? 'gradlew.bat' : 'gradlew'), ['assembleDebug', '--no-daemon'], ANDROID)

const mb = (fs.statSync(APK).size / 1048576).toFixed(1)
console.log(`\nListo: ${APK}  (${mb} MB)`)

if (process.argv.includes('poner')) {
  const adb = path.join(sdk, 'platform-tools', 'adb' + (win ? '.exe' : ''))
  console.log('\nInstalando en el dispositivo conectado...')
  try {
    correr(adb, ['install', '-r', APK], RAIZ)
    correr(adb, ['shell', 'monkey', '-p', 'com.teleprompter.app', '-c', 'android.intent.category.LAUNCHER', '1'], RAIZ)
    console.log('Instalado y abierto.')
  } catch {
    console.error('\nNo se pudo instalar. Hay algo conectado?')
    console.error(`Comprobalo con:  "${adb}" devices`)
    console.error('Si es tu telefono, necesita Depuracion USB activada.')
  }
}
