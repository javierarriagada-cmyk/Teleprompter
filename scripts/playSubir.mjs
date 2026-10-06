// SUBIR EL AAB A LA PISTA INTERNA -tarea 99-. Lo llama play.mjs después de las comprobaciones.
// --simular no llama a la API. production se niega siempre.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PAQUETE, leerLlave, armarJwt, leerNotas, cuerpoDePista, versionNameDe, planDeSubida, pistaPedida, juntarConPista
} from './playApi.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function subirAInterna({ aab, lanzar, simular, pista = 'internal' }) {
  pistaPedida(pista)
  const notasPath = path.join(RAIZ, 'docs', 'play', 'notas-version.txt')
  if (!fs.existsSync(notasPath)) {
    throw new Error('Falta docs/play/notas-version.txt, con bloques <es-419> y <en-US>. No subí nada.')
  }
  const notas = leerNotas(fs.readFileSync(notasPath, 'utf8'))
  const versionName = versionNameDe(fs.readFileSync(path.join(RAIZ, 'android', 'app', 'build.gradle'), 'utf8'))
  const plan = planDeSubida({ aab, versionName, notas, lanzar })
  console.log(simular ? 'Simulación. No llamé a la API.' : 'Subiendo a internal.')
  console.log(`Pista ${plan.pista}, estado ${plan.estado}, nombre «${plan.nombre}»`)
  console.log(`Notas es-419: ${plan.notas['es-419']}`)
  console.log(`Notas en-US: ${plan.notas['en-US']}`)
  console.log(`Archivo ${plan.archivo}` + (plan.bytes ? ` (${plan.bytes} bytes)` : ' (todavía no está)'))
  if (simular) return plan

  const llave = leerLlave()
  const jwt = armarJwt(llave)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  })
  if (!tokenRes.ok) throw new Error(await tokenRes.text())
  const { access_token: token } = await tokenRes.json()
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAQUETE}`
  const auth = { authorization: `Bearer ${token}` }
  const edicion = await fetch(`${base}/edits`, { method: 'POST', headers: auth })
  if (!edicion.ok) throw new Error(await edicion.text())
  const { id } = await edicion.json()
  try {
    const sube = await fetch(`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PAQUETE}/edits/${id}/bundles?uploadType=media`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/octet-stream' },
      body: fs.readFileSync(aab)
    })
    if (!sube.ok) throw new Error(await sube.text())
    const bundle = await sube.json()
    const actual = await fetch(`${base}/edits/${id}/tracks/internal`, { headers: auth })
    if (!actual.ok) throw new Error(await actual.text())
    const cuerpo = juntarConPista(
      cuerpoDePista({ versionName, notas, lanzar, versionCode: bundle.versionCode }),
      (await actual.json()).releases,
      lanzar
    )
    const pistaRes = await fetch(`${base}/edits/${id}/tracks/internal`, {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo)
    })
    if (!pistaRes.ok) throw new Error(await pistaRes.text())
    const fin = await fetch(`${base}/edits/${id}:commit`, { method: 'POST', headers: auth })
    if (!fin.ok) throw new Error(await fin.text())
    console.log(lanzar ? 'Publicada a los testers.' : 'Quedó en borrador en la consola.')
    return plan
  } catch (e) {
    await fetch(`${base}/edits/${id}`, { method: 'DELETE', headers: auth }).catch(() => {})
    console.error('Borré la edición. Google dijo: ' + e.message)
    throw e
  }
}
