// LA CÁMARA GRABA A 14 Mbps -18-10-2026-. La cámara grababa a ~20 Mbps -Javier: «altísimo»-. Al guardar con
// subtítulos o filtro la recodificación la dejaba en 12, y sin recodificar quedaba en 20, porque solo se
// guarda una copia: la misma toma salía con dos pesos. Se decidió 14 en los dos lados. La recodificación es
// nuestra -CamaraNativaPlugin.java-. La grabación la arma @capgo/camera-preview, que no deja elegir el
// bitrate; CameraX sí: Recorder.Builder.setTargetVideoEncodingBitRate.
//
// El plugin vive en node_modules, no en el repo, y cada npm install lo trae limpio. Este script le agrega
// una línea a CameraXView.java antes de cada compilación -apk.mjs y play.mjs-, justo antes de
// «Recorder recorder = recorderBuilder.build();», que en la 8.11.4 está una sola vez. Si no la encuentra
// una sola vez -otra versión del plugin-, FALLA y para la compilación: una toma que vuelve a 20 sin que
// nadie se entere es justo lo que no puede pasar. Si la línea ya está, no hace nada.
//
// LICENCIA: el plugin es MPL-2.0. Un archivo suyo modificado que viaja dentro del APK obliga a ofrecer el
// código fuente de ese archivo. El cambio entero es la LINEA de abajo.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVO = path.join(RAIZ, 'node_modules', '@capgo', 'camera-preview', 'android', 'src', 'main', 'java',
  'app', 'capgo', 'capacitor', 'camera', 'preview', 'CameraXView.java')
export const BITRATE_GRABACION = 14_000_000
const ANCLA = /^([ \t]*)Recorder recorder = recorderBuilder\.build\(\);/gm
const LINEA = `recorderBuilder.setTargetVideoEncodingBitRate(${BITRATE_GRABACION}); // Sigo: scripts/parcharCamara.mjs`

// Pura, para poder probarla con un texto: devuelve el archivo con la línea puesta, o tal cual si ya estaba.
export function parchar(texto) {
  if (texto.includes(LINEA)) return { texto, cambio: false }
  const veces = [...texto.matchAll(ANCLA)].length
  if (veces !== 1) {
    throw new Error(`CameraXView.java: esperaba una vez «Recorder recorder = recorderBuilder.build();» y está ${veces}. ` +
      '¿Cambió la versión de @capgo/camera-preview? La grabación quedaría sin los 14 Mbps -scripts/parcharCamara.mjs-.')
  }
  const fin = texto.includes('\r\n') ? '\r\n' : '\n'
  return { texto: texto.replace(ANCLA, (todo, sangria) => sangria + LINEA + fin + todo), cambio: true }
}

export function parcharCamara() {
  const original = fs.readFileSync(ARCHIVO, 'utf8')
  const { texto, cambio } = parchar(original)
  if (cambio) fs.writeFileSync(ARCHIVO, texto)
  console.log(cambio
    ? 'Cámara: la grabación queda a 14 Mbps -CameraXView.java del plugin, parchado-'
    : 'Cámara: CameraXView.java ya graba a 14 Mbps')
}

// Suelto también: node scripts/parcharCamara.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) parcharCamara()
