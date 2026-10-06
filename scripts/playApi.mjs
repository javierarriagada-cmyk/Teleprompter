// LA API DE PLAY, SIN DEPENDENCIAS -tarea 99, 06-10-2026-.
//
// Un JWT RS256 firmado con crypto de Node, cambiado por un token en
// https://oauth2.googleapis.com/token, y después fetch. La llave se lee y no se imprime,
// no se copia y no entra al repositorio. Nunca producción.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const PAQUETE = 'com.sigoteleprompter.app'
export const CUENTA = 'sigo-play@sigoteleprompter.iam.gserviceaccount.com'
export const SCOPES = [
  'https://www.googleapis.com/auth/androidpublisher',
  'https://www.googleapis.com/auth/playdeveloperreporting'
]
export const RUTA_LLAVE_OMISION = 'C:/Users/56990/sigo-llave/play-api.json'

const b64 = (b) => Buffer.from(b).toString('base64url')

export function rutaDeLaLlave() {
  return process.env.SIGO_PLAY_KEY || RUTA_LLAVE_OMISION
}

// Lee la llave y devuelve solo el correo y la clave privada. No imprime el archivo.
export function leerLlave(ruta = rutaDeLaLlave()) {
  const cruda = fs.readFileSync(ruta, 'utf8')
  const j = JSON.parse(cruda)
  if (!j.client_email || !j.private_key) throw new Error('la llave no trae client_email o private_key')
  return { email: j.client_email, private_key: j.private_key }
}

export function armarJwt(llave, ahora = Math.floor(Date.now() / 1000)) {
  const cabecera = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const cuerpo = b64(JSON.stringify({
    iss: llave.email,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600
  }))
  const firma = crypto.createSign('RSA-SHA256').update(`${cabecera}.${cuerpo}`).sign(llave.private_key)
  return `${cabecera}.${cuerpo}.${b64(firma)}`
}

export function pistaPedida(pista) {
  if (pista === 'production' || pista === 'prod') {
    throw new Error('Sigo no sube a producción. La cuenta no tiene ese permiso y este script se niega, aunque se fuerce.')
  }
  if (pista && pista !== 'internal') {
    throw new Error(`Pista no admitida: ${pista}. Solo internal.`)
  }
  return 'internal'
}

export function leerNotas(texto) {
  const es = texto.match(/<es-419>([\s\S]*?)<\/es-419>/)
  const en = texto.match(/<en-US>([\s\S]*?)<\/en-US>/)
  if (!es || !en) throw new Error('faltan los bloques <es-419> y <en-US> en docs/play/notas-version.txt')
  return { 'es-419': es[1].trim(), 'en-US': en[1].trim() }
}

export function leerBloques(texto) {
  const bloques = [...texto.matchAll(/\[\[([\s\S]*?)\]\]/g)].map((m) => m[1])
  if (bloques.length < 3) throw new Error('la ficha no trae los tres bloques [[ ]]: nombre, breve y completa')
  return { nombre: bloques[0], breve: bloques[1], completa: bloques[2] }
}

export function validarTextos(bloques, archivo) {
  const largo = (s) => [...s].length
  const errores = []
  if (largo(bloques.nombre) > 30) errores.push(`${archivo}: nombre ${largo(bloques.nombre)} de 30`)
  if (largo(bloques.breve) > 80) errores.push(`${archivo}: breve ${largo(bloques.breve)} de 80`)
  if (largo(bloques.completa) > 4000) errores.push(`${archivo}: completa ${largo(bloques.completa)} de 4000`)
  if (/\b(best|#1|top|new|free|mejor|gratis|nuevo|nueva|descarga|download|install|instala)\b|n\.º ?1/i.test(bloques.breve)) {
    errores.push(`${archivo}: la breve tiene una palabra que Play no quiere`)
  }
  return errores
}

export function cuerpoDePista({ versionName, notas, lanzar, versionCode }) {
  pistaPedida('internal')
  const release = {
    status: lanzar ? 'completed' : 'draft',
    name: `${versionName} – prueba interna`,
    releaseNotes: [
      { language: 'es-419', text: notas['es-419'] },
      { language: 'en-US', text: notas['en-US'] }
    ]
  }
  if (versionCode) release.versionCodes = [String(versionCode)]
  return { track: 'internal', releases: [release] }
}

// -06-10-2026, Claude- El PUT de la pista la reemplaza entera. Con solo la release nueva, un
// borrador podia sacar de la pista la version que ya tienen los testers -la 597-. Al dejar un
// borrador se conservan las releases que no son borrador; al lanzar, la nueva reemplaza a todas.
export function juntarConPista(cuerpo, actuales = [], lanzar) {
  if (lanzar) return cuerpo
  return { ...cuerpo, releases: [...actuales.filter((r) => r.status !== 'draft'), ...cuerpo.releases] }
}

// -06-10-2026, Claude- La API de calidad pide fechas como dia calendario -anio, mes, dia- en
// America/Los_Angeles, no segundos: con { seconds } Google rechaza la consulta. El fin es el
// ultimo dia con datos que informa la propia API -latestEndTime-, y el inicio, 28 dias antes.
export function rangoDe28Dias(fin) {
  const d = new Date(Date.UTC(fin.year, fin.month - 1, fin.day - 28))
  const zona = { id: 'America/Los_Angeles' }
  return {
    startTime: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), timeZone: zona },
    endTime: { year: fin.year, month: fin.month, day: fin.day, timeZone: zona }
  }
}

export function versionNameDe(gradle) {
  const linea = gradle.split(/\r?\n/).find((l) => /^\s*versionName\s+"/.test(l))
  const m = linea && linea.match(/versionName\s+"([^"]+)"/)
  if (!m) throw new Error('no encuentro versionName en android/app/build.gradle')
  return m[1]
}

export function medidasPng(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) }
}

export function validarImagen(nombre, buffer, tipo) {
  const d = medidasPng(buffer)
  if (!d) return `${nombre}: no es un PNG`
  const corto = Math.min(d.w, d.h)
  const largo = Math.max(d.w, d.h)
  if (tipo === 'featureGraphic' && (d.w !== 1024 || d.h !== 500)) return `${nombre}: el gráfico mide ${d.w}×${d.h}, Play pide 1024×500`
  if (tipo === 'phoneScreenshots' && (corto < 320 || largo > 3840 || largo > corto * 2)) return `${nombre}: lados ${corto} y ${largo} fuera de 320–3840`
  if ((tipo === 'sevenInchScreenshots' || tipo === 'tenInchScreenshots') && (corto < 1080 || largo > 7680 || largo > corto * 2)) {
    return `${nombre}: lados ${corto} y ${largo} fuera de 1080–7680`
  }
  if (buffer.length > 8 * 1024 * 1024) return `${nombre}: pesa más de 8 MB`
  return null
}

export function planDeSubida({ aab, versionName, notas, lanzar, versionCode }) {
  const pista = cuerpoDePista({ versionName, notas, lanzar, versionCode })
  return {
    pista: pista.track,
    estado: pista.releases[0].status,
    nombre: pista.releases[0].name,
    notas,
    archivo: aab,
    bytes: fs.existsSync(aab) ? fs.statSync(aab).size : null
  }
}
