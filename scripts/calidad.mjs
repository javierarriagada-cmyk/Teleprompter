// LA CALIDAD EN PLAY, SOLO LECTURA -tarea 99, 06-10-2026-.
//
//   npm run calidad
//   npm run calidad -- --simular
//
// Tasa de fallas y de ANR de los últimos 28 días, y los 10 problemas más frecuentes.
// Sin datos no falla: dice «sin datos todavía». El detalle va a docs/play/calidad/, fuera de git.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAQUETE, leerLlave, armarJwt } from './playApi.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const simular = process.argv.includes('--simular')
const hoy = new Date().toISOString().slice(0, 10)

function resumen(detalle) {
  const lineas = [`Calidad de ${PAQUETE}, últimos 28 días`]
  lineas.push(detalle.fallas ? `Fallas: ${detalle.fallas}` : 'Fallas: sin datos todavía')
  lineas.push(detalle.anr ? `ANR: ${detalle.anr}` : 'ANR: sin datos todavía')
  if (!detalle.problemas.length) lineas.push('Problemas: sin datos todavía')
  else for (const p of detalle.problemas) lineas.push(`${p.version} · ${p.dispositivo} · ${p.rastro}`)
  return lineas.join('\n')
}

if (simular) {
  const detalle = { fallas: null, anr: null, problemas: [] }
  console.log('Simulación. No llamé a la API.')
  console.log(resumen(detalle))
  console.log(`Guardaría el detalle en docs/play/calidad/${hoy}.json`)
  process.exit(0)
}

const llave = leerLlave()
const jwt = armarJwt(llave)
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
})
if (!tokenRes.ok) throw new Error(await tokenRes.text())
const { access_token: token } = await tokenRes.json()
const base = `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${PAQUETE}`
const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
async function consultar(ruta, cuerpo) {
  const r = await fetch(`${base}/${ruta}`, { method: 'POST', headers: auth, body: JSON.stringify(cuerpo) })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
const cuerpo = { timelineSpec: { aggregationPeriod: 'DAILY', startTime: { seconds: Math.floor(Date.now() / 1000) - 28 * 86400 } } }
const fallas = await consultar('crashRateMetricSet:query', cuerpo)
const anr = await consultar('anrRateMetricSet:query', cuerpo)
const issues = await consultar('errorIssues:search', { pageSize: 10 })
const problemas = (issues?.errorIssues || []).slice(0, 10).map((p) => ({
  version: p.versionCode || p.appVersion || 'sin versión',
  dispositivo: p.deviceModel || p.device || 'sin dispositivo',
  rastro: String(p.cause || p.errorReport || '').split('\n')[0] || 'sin rastro'
}))
const detalle = { fallas: fallas?.rows?.length ? fallas : null, anr: anr?.rows?.length ? anr : null, problemas }
console.log(resumen(detalle))
const dir = path.join(RAIZ, 'docs', 'play', 'calidad')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, `${hoy}.json`), JSON.stringify(detalle, null, 2))
console.log(`Detalle en docs/play/calidad/${hoy}.json`)
