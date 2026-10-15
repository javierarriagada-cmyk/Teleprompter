// EL BANCO LARGO EN EL TELÉFONO -motor-largo, 15-10-2026-. node scripts/banco-largo.mjs [minutos]
//
// Lo corre Javier con el teléfono conectado por USB y la APK DE PRUEBA instalada -npm run apk; la de
// Play no es depurable, run-as falla y el banco no existe en ella-. Por omisión, 35 minutos.
//
//   1. Lista los audios que guardó el oído -files/oido/*.pcm, 16 kHz mono- y los registros de las
//      tomas -files/grabaciones/*.motor.txt-. De cada registro saca qué audio es suyo -línea 'oido',
//      ruta=- y lo que Vosk oyó en él -las líneas 'oyo FINAL'-: ese es el guion que sigue el motor.
//      Un audio sin registro que lo nombre no entra: el motor no tendría qué seguir. No se inventa
//      nada: si no queda ningún audio con su texto, se dice y no se lanza.
//   2. Deja el pedido -files/banco-largo/pedido.json, por adb run-as- y abre la app. La app lo toma al
//      abrir -hooks/useBancoLargo.ts-: arma el guion, entra a Grabar con la cámara a 1080p y aprieta
//      Empezar. El MISMO lazo de Vosk lee esos audios en orden, a ritmo real, repitiéndolos hasta los
//      minutos pedidos -BancoLargo.java-, y al terminar aprieta Parar.
//   3. Espera, mostrando cada línea nueva, y al final baja la tabla a
//      docs/mediciones/banco-largo/<nombre>.txt y la imprime resumida.
//
// LA TABLA: una línea por minuto de audio -minuto, vosk_ms_por_s = ms de acceptWaveForm por segundo de
// audio, atraso_ms = atraso acumulado contra el tiempo real, calce y estado del motor, temp de la CPU o
// «sin temperatura», y relevo=N si el lazo habría relevado el micrófono-. Las mismas líneas quedan en
// el .motor.txt de la toma, como 'banco-largo', junto a las 'detenido' -lib/vigiaDetencion.ts-.
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const PAQUETE = 'com.sigoteleprompter.app'
const BYTES_POR_MINUTO = 16000 * 2 * 60

// ── La parte que no necesita teléfono -src/pruebas/bancoLargo.test.ts- ──────────────────────────

// Del texto de un .motor.txt: el nombre del .pcm de su línea 'oido' y lo que Vosk oyó, en orden.
export function audioYTextoDeRegistro(texto) {
  let pcm = null
  const frases = []
  for (const linea of texto.split('\n')) {
    const [, tipo, detalle = ''] = linea.split('\t')
    if (tipo === 'oido' && !pcm) {
      const m = detalle.match(/ruta=(\S+)/)
      if (m) pcm = path.posix.basename(m[1])
    } else if (tipo === 'oyo' && detalle.startsWith('FINAL: ')) {
      const f = detalle.slice('FINAL: '.length).trim()
      if (f) frases.push(f)
    }
  }
  return { pcm, texto: frases.join(' ') }
}

// Los audios que entran -con texto-, del más viejo al más nuevo, y el guion: el texto de cada uno
// como un párrafo, repetido tantas veces como vueltas da el audio hasta los minutos pedidos.
export function armarPedido({ audios, registros, minutos, nombre, idioma = 'es' }) {
  const textoDe = new Map()
  for (const r of registros) {
    const { pcm, texto } = audioYTextoDeRegistro(r)
    if (pcm && texto) textoDe.set(pcm, texto)
  }
  const entran = audios.filter((a) => a.bytes > 0 && textoDe.has(a.nombre)).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const sinTexto = audios.filter((a) => !textoDe.has(a.nombre)).map((a) => a.nombre)
  const minutosDistintos = entran.reduce((s, a) => s + a.bytes, 0) / BYTES_POR_MINUTO
  if (!entran.length || minutosDistintos <= 0) return { pedido: null, entran, sinTexto, minutosDistintos, vueltas: 0 }
  const vueltas = Math.ceil(minutos / minutosDistintos)
  const parrafos = []
  for (let v = 0; v < vueltas; v++) for (const a of entran) parrafos.push(textoDe.get(a.nombre))
  return {
    pedido: { minutos, archivos: entran.map((a) => a.nombre), guion: parrafos.join('\n\n'), idioma, nombre },
    entran,
    sinTexto,
    minutosDistintos,
    vueltas
  }
}

// Las líneas 'minuto=...' de la tabla, en columnas.
export function resumirTabla(texto) {
  const filas = []
  for (const linea of texto.split('\n')) {
    if (!linea.startsWith('minuto=')) continue
    const o = {}
    for (const par of linea.split(' ')) {
      const i = par.indexOf('=')
      if (i > 0) o[par.slice(0, i)] = par.slice(i + 1)
    }
    filas.push(o)
  }
  const cols = ['minuto', 'vosk_ms_por_s', 'atraso_ms', 'calce', 'estado', 'temp', 'relevo']
  const ancho = cols.map((c) => Math.max(c.length, ...filas.map((f) => String(f[c] ?? '').length)))
  const fila = (vals) => vals.map((v, i) => String(v).padEnd(ancho[i])).join('  ')
  return [fila(cols), ...filas.map((f) => fila(cols.map((c) => f[c] ?? '')))].join('\n')
}

// ── El teléfono ─────────────────────────────────────────────────────────────────────────────────

function adb(args, opciones = {}) {
  return execFileSync('adb', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opciones })
}
const runAs = (cmd, opciones) => adb(['shell', 'run-as', PAQUETE, 'sh', '-c', `'${cmd}'`], opciones)
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function principal() {
  const minutos = Math.max(1, Number(process.argv[2]) || 35)
  const nombre = `tabla-${new Date().toISOString().replace(/[:.]/g, '-')}`
  try {
    runAs('ls files')
  } catch {
    console.error('run-as no anda: ¿teléfono conectado y la APK DE PRUEBA -npm run apk- instalada? La de Play no lleva el banco.')
    process.exit(1)
  }
  const audios = runAs('cd files/oido 2>/dev/null && for f in *.pcm; do [ -f "$f" ] && echo "$f $(stat -c %s "$f")"; done')
    .split('\n').map((l) => l.trim().split(' ')).filter((p) => p.length === 2 && p[0].endsWith('.pcm'))
    .map(([n, b]) => ({ nombre: n, bytes: Number(b) }))
  const listaRegistros = runAs('ls files/grabaciones 2>/dev/null').split('\n').map((l) => l.trim()).filter((l) => l.endsWith('.motor.txt'))
  const registros = listaRegistros.map((r) => runAs(`cat files/grabaciones/${r}`))
  const { pedido, entran, sinTexto, minutosDistintos, vueltas } = armarPedido({ audios, registros, minutos, nombre })
  console.log(`Audios en files/oido: ${audios.length}. Con su texto: ${entran.length} -${minutosDistintos.toFixed(1)} min distintos-. Sin registro que los nombre: ${sinTexto.length}${sinTexto.length ? ' (' + sinTexto.join(', ') + ')' : ''}.`)
  if (!pedido) {
    console.error('No queda ningún audio con su texto: el banco no se lanza. Hace falta grabar lecturas con la APK de prueba.')
    process.exit(1)
  }
  console.log(`Se repiten ${vueltas} vueltas hasta ${minutos} min. Tabla: files/banco-largo/${nombre}.txt`)
  runAs('mkdir -p files/banco-largo && cat > files/banco-largo/pedido.json', { input: JSON.stringify(pedido) })
  // La cámara necesita la pantalla encendida durante toda la toma.
  adb(['shell', 'svc', 'power', 'stayon', 'usb'])
  adb(['shell', 'am', 'force-stop', PAQUETE])
  adb(['shell', 'monkey', '-p', PAQUETE, '-c', 'android.intent.category.LAUNCHER', '1'])
  const limite = Date.now() + (minutos + 5) * 60 * 1000
  let vistas = 0
  let texto = ''
  while (Date.now() < limite) {
    await dormir(30000)
    try {
      texto = runAs(`cat files/banco-largo/${nombre}.txt 2>/dev/null`)
    } catch {
      continue
    }
    const lineas = texto.split('\n').filter(Boolean)
    for (const l of lineas.slice(vistas)) console.log('  ' + l)
    vistas = lineas.length
    if (lineas.filter((l) => l.startsWith('minuto=')).length >= minutos) break
  }
  adb(['shell', 'svc', 'power', 'stayon', 'false'])
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const destino = path.join(raiz, 'docs', 'mediciones', 'banco-largo', `${nombre}.txt`)
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.writeFileSync(destino, texto)
  console.log(`\nTabla en ${path.relative(raiz, destino)}\n`)
  console.log(resumirTabla(texto))
  if (texto.split('\n').filter((l) => l.startsWith('minuto=')).length < minutos) {
    console.log(`\nOJO: menos de ${minutos} minutos en la tabla: la toma se cortó o el teléfono se durmió.`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
