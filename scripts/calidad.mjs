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
import { PAQUETE, leerLlave, armarJwt, rangoDe28Dias } from './playApi.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const simular = process.argv.includes('--simular')
const hoy = new Date().toISOString().slice(0, 10)

function resumen(detalle) {
  const lineas = [`Calidad de ${PAQUETE}, últimos 28 días`]
  lineas.push(detalle.fallas ? `Fallas: ${detalle.fallas}` : 'Fallas: sin datos todavía')
  lineas.push(detalle.anr ? `ANR: ${detalle.anr}` : 'ANR: sin datos todavía')
  if (!detalle.problemas.length) lineas.push('Problemas: sin datos todavía')
  else for (const p of detalle.problemas) lineas.push(`${p.version} · ${p.tipo} · ${p.rastro} · ${p.reportes} reportes`)
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
// -06-10-2026, Claude- Antes todo iba por POST y un 404 se leia como «sin datos todavía». La
// busqueda de problemas es GET -discovery de la API-, asi que ese 404 lo causaba el metodo
// equivocado y el resumen habria mentido sin avisar. Ahora cualquier error de Google se muestra
// y corta; «sin datos» sale solo cuando la API dice que no tiene dias con datos.
// Antes: if (r.status === 404) return null
async function pedir(ruta, cuerpo) {
  const r = await fetch(`${base}/${ruta}`, cuerpo ? { method: 'POST', headers: auth, body: JSON.stringify(cuerpo) } : { headers: auth })
  if (!r.ok) throw new Error(`${ruta}: ${await r.text()}`)
  return r.json()
}
// La tasa es crashRate28dUserWeighted -o la de ANR- del ultimo dia con datos: ya es el promedio
// de 28 dias pesado por usuarios. Antes la consulta no pedia metricas y mandaba la fecha en
// segundos; Google rechaza las dos cosas. La API da la tasa como fraccion -0.0109 es 1,09 %-:
// confirmar contra la consola el primer dia que haya datos.
async function tasa(conjunto, metrica) {
  const info = await pedir(conjunto)
  const fin = (info.freshnessInfo?.freshnesses || []).find((f) => f.aggregationPeriod === 'DAILY')?.latestEndTime
  if (!fin) return { texto: null, crudo: info }
  const r = await pedir(`${conjunto}:query`, {
    timelineSpec: { aggregationPeriod: 'DAILY', ...rangoDe28Dias(fin) },
    metrics: [metrica, 'distinctUsers']
  })
  const ultima = (r.rows || []).at(-1)
  const valor = ultima?.metrics?.find((m) => m.metric === metrica)?.decimalValue?.value
  const usuarios = ultima?.metrics?.find((m) => m.metric === 'distinctUsers')?.decimalValue?.value
  if (valor === undefined) return { texto: null, crudo: r }
  return { texto: `${(Number(valor) * 100).toFixed(2)} % (${usuarios ?? '?'} usuarios el último día)`, crudo: r }
}
const fallas = await tasa('crashRateMetricSet', 'crashRate28dUserWeighted')
const anr = await tasa('anrRateMetricSet', 'anrRate28dUserWeighted')
const issues = await pedir('errorIssues:search?pageSize=10')
// Antes: version: p.versionCode || p.appVersion, dispositivo: p.deviceModel || p.device. Esos
// campos no existen en ErrorIssue; el problema trae tipo, causa, lugar y cantidad de reportes.
const problemas = (issues.errorIssues || [])
  .sort((a, b) => Number(b.errorReportCount || 0) - Number(a.errorReportCount || 0))
  .slice(0, 10)
  .map((p) => ({
    version: p.lastAppVersion?.versionCode || 'sin versión',
    tipo: p.type || 'sin tipo',
    rastro: [p.cause, p.location].filter(Boolean).join(' en ') || 'sin rastro',
    reportes: p.errorReportCount || '?'
  }))
const detalle = { fallas: fallas.texto, anr: anr.texto, problemas, crudo: { fallas: fallas.crudo, anr: anr.crudo, problemas: issues } }
console.log(resumen(detalle))
const dir = path.join(RAIZ, 'docs', 'play', 'calidad')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, `${hoy}.json`), JSON.stringify(detalle, null, 2))
console.log(`Detalle en docs/play/calidad/${hoy}.json`)
