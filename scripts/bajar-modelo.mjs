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
// -tarea 104- Eso sigue así en la APK de prueba. En la versión de Play los dos van en paquetes a
// pedido -android/model-es y model-en- y la voz del idioma de la app se baja sola al abrirla por
// primera vez: "funciona sin internet" vale después de esa descarga.
// -portugues-voz, 2026-10-22- EL PORTUGUÉS DE BRASIL -docs/investigacion/idiomas.md, rama investigacion-idiomas, 7.1 y 11.4-:
// vosk-model-small-pt-0.3, el único chico con licencia libre -Apache 2.0-, en model-pt. Viene en el
// formato viejo y se reordena al nuevo -reordenarFormatoViejo, abajo- antes de comprobar las carpetas.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(RAIZ, 'android', 'app', 'src', 'main', 'assets')
const MODELOS = [
  { idioma: 'espanol', url: 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip', carpeta: 'model-es', mb: 38 },
  // -portugues-voz, 2026-10-22- Suma el portugués. Antes, la lista terminaba en el inglés:
  // { idioma: 'ingles', url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip', carpeta: 'model-en', mb: 40 }
  { idioma: 'ingles', url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip', carpeta: 'model-en', mb: 40 },
  // formatoViejo: el zip trae todo suelto en la raíz -final.mdl, HCLr.fst, Gr.fst, mfcc.conf...-, sin am/,
  // conf/ ni graph/ y sin model.conf.
  { idioma: 'portugues', url: 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip', carpeta: 'model-pt', mb: 31, formatoViejo: true }
]

// Lo que tiene que haber adentro para que el modelo sirva. Si falta uno,
// StorageService lo copia igual y Vosk falla despues, en tiempo de ejecucion,
// con un error que no dice que falto esto.
const CARPETAS = ['am', 'conf', 'graph', 'ivector']

// -portugues-voz, 2026-10-22- EL FORMATO VIEJO AL NUEVO -idiomas.md, 11.4-. Se reordena en vez de aceptar el viejo porque el
// ajuste de la latencia -frames-per-chunk, abajo- solo existe en conf/model.conf, y porque PaqueteDeVoz
// -la versión de Play- da el modelo por bajado solo si encuentra am/. model.conf lleva los valores con
// que Vosk cargaba este modelo -leídos en su registro al cargar el original, sección 11.4-. Vosk 0.3.45 de
// Python lo cargó así en el PC; que vosk-android lo cargue igual está sin verificar en el teléfono.
function reordenarFormatoViejo(dir) {
  const mover = { 'final.mdl': 'am', 'mfcc.conf': 'conf', 'HCLr.fst': 'graph', 'Gr.fst': 'graph',
    'phones.txt': 'graph', 'disambig_tid.int': 'graph', 'word_boundary.int': 'graph/phones' }
  for (const [archivo, sub] of Object.entries(mover)) {
    const desde = path.join(dir, archivo)
    if (!fs.existsSync(desde)) continue
    fs.mkdirSync(path.join(dir, sub), { recursive: true })
    fs.renameSync(desde, path.join(dir, sub, archivo))
  }
  const conf = path.join(dir, 'conf', 'model.conf')
  if (!fs.existsSync(conf)) {
    fs.mkdirSync(path.dirname(conf), { recursive: true })
    fs.writeFileSync(conf, [
      '--min-active=200', '--max-active=7000', '--beam=13.0', '--lattice-beam=6.0',
      '--acoustic-scale=1.0', '--frame-subsampling-factor=3',
      '--endpoint.silence-phones=1:2:3:4:5:6:7:8:9:10',
      '--endpoint.rule2.min-trailing-silence=0.5', '--endpoint.rule3.min-trailing-silence=1.0',
      '--endpoint.rule4.min-trailing-silence=2.0', ''].join('\n'))
  }
}

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

    // -portugues-voz, 2026-10-22- Primero se reordena el formato viejo; la comprobación de abajo corre después, igual que
    // para es y en: si falta una carpeta, se para con su mensaje.
    if (m.formatoViejo) reordenarFormatoViejo(DESTINO)

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
