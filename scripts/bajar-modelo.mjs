// BAJA LOS MODELOS DE VOSK -ESPANOL E INGLES- Y LOS DEJA EN LOS ASSETS DE ANDROID.
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
//
// EL INGLES -27-09-2026, docs/ingles.txt D3-: viaja tambien adentro del APK, para que
// "funciona sin internet" siga siendo cierto desde el primer momento. Es el modelo chico
// oficial para ingles de Estados Unidos, del mismo tamano que el espanol. Cada idioma va en
// su carpeta -model-es, model-en- y VoskNativoPlugin carga la del idioma del guion.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(RAIZ, 'android', 'app', 'src', 'main', 'assets')
const MODELOS = [
  { idioma: 'espanol', url: 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip', carpeta: 'model-es', mb: 38 },
  { idioma: 'ingles', url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip', carpeta: 'model-en', mb: 40 }
]

// Lo que tiene que haber adentro para que el modelo sirva. Si falta uno,
// StorageService lo copia igual y Vosk falla despues, en tiempo de ejecucion,
// con un error que no dice que falto esto.
const CARPETAS = ['am', 'conf', 'graph', 'ivector']

function yaEsta(destino) {
  if (!fs.existsSync(destino)) return false
  return CARPETAS.every((c) => fs.existsSync(path.join(destino, c)))
}

for (const m of MODELOS) {
  const DESTINO = path.join(ASSETS, m.carpeta)
  if (yaEsta(DESTINO)) {
    console.log(`El modelo de ${m.idioma} ya esta en android/app/src/main/assets/${m.carpeta}`)
  } else {
    const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'vosk-'))
    const zip = path.join(tmp, 'modelo.zip')

    console.log(`Bajando el modelo de ${m.idioma} (${m.mb} MB)...`)
    const res = await fetch(m.url)
    if (!res.ok) {
      console.error(`No se pudo bajar: HTTP ${res.status} desde ${m.url}`)
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
  }

  // LA RED DE VOSK CORRE DE A 3 CUADROS -24-09-2026, medido-. El modelo viene sin
  // --frames-per-chunk y con el valor por omision retiene las palabras: aparecen en los
  // parciales 250 ms despues de dichas; con 3, 140 ms, reconociendo lo mismo. Las cifras
  // estan en VoskNativoPlugin.java, arriba de SEGUNDOS_POR_TROZO. La carpeta del modelo no
  // esta en git, asi que la linea se agrega aca: si no, se pierde al volver a bajarlo.
  // En el ingles se aplica igual y SE MIDE con las lecturas de la traductora -D4-.
  const conf = path.join(DESTINO, 'conf', 'model.conf')
  const textoConf = fs.readFileSync(conf, 'utf8')
  if (!textoConf.includes('--frames-per-chunk')) {
    fs.writeFileSync(conf, textoConf.replace(/\s*$/, '') + '\n--frames-per-chunk=3\n')
  }

  console.log(`Listo: ${DESTINO}`)
}
