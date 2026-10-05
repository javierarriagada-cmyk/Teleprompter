// LAS LÁMINAS DE LA TAREA 96 -05-10-2026-. node docs/pantallas/tarea96/herramientas/laminas.mjs [filtro]
//
// Con el servidor de las láminas arriba -ver vite.config.mjs-, abre visor.html en Chrome sin ventana por
// el protocolo de depuración -sin dependencias: el WebSocket de Node- y guarda cada vista en
// docs/pantallas/tarea96/. Mide también las filas de la columna de lado, para ver si el Filtro cabe.
// CHROME: la ruta de Chrome -por omisión la de Windows-.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const SALIDA = process.env.SALIDA || path.join(aqui, '..')
const URL_BASE = process.env.SIGO_URL || 'http://127.0.0.1:5196/docs/pantallas/tarea96/herramientas/visor.html'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const filtro = process.argv[2] || ''
const PUERTO = 9396
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const VISTAS = [
  // Teléfono de pie -moto g86, 412×915-, oscuro.
  { nombre: 'visor-de-pie-tira-calido-oscuro', w: 412, h: 915, qs: 'forma=vertical&tono=calido&tira=si&tema=oscuro' },
  { nombre: 'visor-de-pie-bn-oscuro', w: 412, h: 915, qs: 'forma=vertical&tono=bn&tira=no&tema=oscuro' },
  // De lado, la columna -caso 1, toma horizontal- a 915×412 y 800×360: se miden las dos -¿cabe la fila
  // del Filtro?-, y la lámina es la de 800×360, la más justa.
  { nombre: 'medida-de-lado-915x412', w: 915, h: 412, qs: 'forma=horizontal&tono=calido&tira=no&tema=oscuro', foto: false },
  { nombre: 'visor-de-lado-800x360-tira-calido-oscuro', w: 800, h: 360, qs: 'forma=horizontal&tono=calido&tira=si&tema=oscuro' },
  // Solo para revisar -no van a docs/: node laminas.mjs revisar con SALIDA=otra carpeta-: la tarjeta
  // de lado -caso 2, toma vertical-, donde la tira se desplaza.
  { nombre: 'revisar-caso2-915x412-tira', w: 915, h: 412, qs: 'forma=vertical&tono=calido&tira=si&tema=oscuro' }
]

const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'sigo96-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${datos}`, '--hide-scrollbars', '--lang=es-CL', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' })

async function pestana() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json`)
      const lista = await r.json()
      const p = lista.find((x) => x.type === 'page')
      if (p) return p
    } catch {}
    await sleep(200)
  }
  throw new Error('Chrome no contestó')
}

const p = await pestana()
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise((ok) => (ws.onopen = ok))
let n = 0
const pendientes = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pendientes.has(d.id)) {
    pendientes.get(d.id)(d)
    pendientes.delete(d.id)
  }
}
const cdp = (method, params = {}) => new Promise((ok) => { const id = ++n; pendientes.set(id, ok); ws.send(JSON.stringify({ id, method, params })) })
const evaluar = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value

await cdp('Page.enable')
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
const medidas = {}
for (const v of VISTAS) {
  if (filtro && !v.nombre.includes(filtro)) continue
  if (!filtro && v.nombre.startsWith('revisar')) continue
  await cdp('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: 2, mobile: true })
  await cdp('Page.navigate', { url: `${URL_BASE}?${v.qs}` })
  let listo = false
  for (let i = 0; i < 80 && !listo; i++) { await sleep(250); listo = await evaluar('window.listo === true') }
  if (!listo) console.log('  sin listo:', v.nombre)
  await sleep(400)
  medidas[v.nombre] = await evaluar(`(() => {
    const c = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), ancho: Math.round(r.width), alto: Math.round(r.height) } }
    const filas = [...document.querySelectorAll('[data-fila-accion]')].map((e) => ({ id: e.getAttribute('data-testid') || e.getAttribute('aria-label'), alto: Math.round(e.getBoundingClientRect().height) }))
    const tira = document.querySelector('[data-testid="tira-filtros"]')
    const v = document.querySelector('video')
    return { filas, columna: c(document.querySelector('[data-testid="visor-lado-columna"]')), tira: c(tira), tiraDesborda: tira ? tira.scrollWidth > tira.clientWidth + 1 : null, miniatura: c(document.querySelector('.miniatura-filtro-marco')), video: c(v), filtroVideo: v && v.style.filter, videoWidth: v && v.videoWidth, ventana: [innerWidth, innerHeight] }
  })()`)
  if (v.foto !== false) {
    const foto = await cdp('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(SALIDA, `${v.nombre}.png`), Buffer.from(foto.result.data, 'base64'))
  }
  console.log('ok', v.nombre, JSON.stringify(medidas[v.nombre]))
}
// Las medidas, solo en la pasada completa: la de un filtro no pisa las demás.
if (!filtro) fs.writeFileSync(path.join(SALIDA, 'medidas.json'), JSON.stringify(medidas, null, 1))
ws.close()
chrome.kill()
