// BAJA EL MODELO DE VOSK EN ESPANOL Y LO DEJA EN LOS ASSETS DE ANDROID.
//
// El modelo NO vive en git: son 57 MB desempaquetados y en el historial
// engordan cada clonacion para siempre. Vive aca, y este script lo repone.
//
// Uso:  npm run modelo
//
// POR QUE EL 0.42 Y NO EL 0.3 QUE USA LA WEB.
//
// La version web baja el 0.3 desde ccoreilly.github.io porque alphacephei -que
// publica el 0.42, mas nuevo y mejor entrenado- no manda la cabecera
// Access-Control-Allow-Origin y el navegador bloquea la descarga.
//
// Adentro del APK ese impedimento no existe: el archivo viaja empaquetado y no
// lo baja ningun navegador. Asi que en Android usamos el modelo bueno.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const URL_MODELO = 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip'
const DESTINO = path.join(RAIZ, 'android', 'app', 'src', 'main', 'assets', 'model-es')

// Lo que tiene que haber adentro para que el modelo sirva. Si falta uno,
// StorageService lo copia igual y Vosk falla despues, en tiempo de ejecucion,
// con un error que no dice que falto esto.
const CARPETAS = ['am', 'conf', 'graph', 'ivector']

function yaEsta() {
  if (!fs.existsSync(DESTINO)) return false
  return CARPETAS.every((c) => fs.existsSync(path.join(DESTINO, c)))
}

if (yaEsta()) {
  console.log('El modelo ya esta en android/app/src/main/assets/model-es')
  process.exit(0)
}

const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'vosk-'))
const zip = path.join(tmp, 'modelo.zip')

console.log('Bajando el modelo de espanol (38 MB)...')
const res = await fetch(URL_MODELO)
if (!res.ok) {
  console.error(`No se pudo bajar: HTTP ${res.status} desde ${URL_MODELO}`)
  process.exit(1)
}
fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()))
console.log(`  ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`)

console.log('Descomprimiendo...')
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Expand-Archive -Path '${zip}' -DestinationPath '${tmp}' -Force`])
} else {
  execFileSync('unzip', ['-q', zip, '-d', tmp])
}

const dentro = fs.readdirSync(tmp).find((n) => n.startsWith('vosk-model'))
if (!dentro) {
  console.error('El zip no traia la carpeta del modelo')
  process.exit(1)
}

fs.mkdirSync(path.dirname(DESTINO), { recursive: true })
if (fs.existsSync(DESTINO)) fs.rmSync(DESTINO, { recursive: true, force: true })
fs.renameSync(path.join(tmp, dentro), DESTINO)
fs.rmSync(tmp, { recursive: true, force: true })

const faltan = CARPETAS.filter((c) => !fs.existsSync(path.join(DESTINO, c)))
if (faltan.length > 0) {
  console.error(`El modelo quedo incompleto, faltan: ${faltan.join(', ')}`)
  process.exit(1)
}

console.log(`Listo: ${DESTINO}`)
