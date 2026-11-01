import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTDIR = path.resolve(__dirname, '../capturas-prototipo/ronda-3/video-frames')
const BASE = 'http://127.0.0.1:8765/index.html'
const CHROME = '/usr/bin/google-chrome-stable'
fs.rmSync(OUTDIR, { recursive: true, force: true })
fs.mkdirSync(OUTDIR, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none']
})
const page = await browser.newPage()
await page.setViewport({ width: 392, height: 894, deviceScaleFactor: 1 })
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 90000 })
await page.waitForFunction(() => document.documentElement.classList.contains('coreografia'), { timeout: 25000 })
await page.evaluate(() => document.fonts && document.fonts.ready)
// Force-load images for the tour
await page.evaluate(() => {
  document.querySelectorAll('.revela').forEach((n) => n.classList.add('revelado'))
  document.querySelectorAll('img').forEach((img) => { img.loading = 'eager' })
})
await new Promise((r) => setTimeout(r, 1000))

const totalH = await page.evaluate(() => document.documentElement.scrollHeight)
const escenario = await page.evaluate(() => {
  const el = document.getElementById('escenario')
  return { top: el.offsetTop, h: el.offsetHeight }
})
console.log('scrollHeight', totalH, 'escenario', escenario)

// Phase A: hero → cómo (E0–E5) ~8s
// Phase B: rest of page to footer ~12s
const fps = 10
const phaseA = 80
const phaseB = 120
const targetsA = [0, 1.25, 2.9, 4.9]
const timesA = [0, 0.22, 0.48, 1.0]
function ease(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2 }

let frame = 0
for (let i = 0; i < phaseA; i++) {
  const u = i / (phaseA - 1)
  let yUnits
  if (u <= timesA[1]) {
    const t = ease(u / timesA[1])
    yUnits = targetsA[0] + (targetsA[1] - targetsA[0]) * t
  } else if (u <= timesA[2]) {
    const t = ease((u - timesA[1]) / (timesA[2] - timesA[1]))
    yUnits = targetsA[1] + (targetsA[2] - targetsA[1]) * t
  } else {
    const t = ease((u - timesA[2]) / (1 - timesA[2]))
    yUnits = targetsA[2] + (targetsA[3] - targetsA[2]) * t
  }
  await page.evaluate((yUnits) => {
    const el = document.getElementById('escenario')
    window.scrollTo(0, el.offsetTop + yUnits * window.innerHeight)
  }, yUnits)
  await new Promise((r) => setTimeout(r, 30))
  await page.screenshot({ path: path.join(OUTDIR, `f${String(frame).padStart(4,'0')}.png`), type: 'png' })
  frame++
  if (i % 20 === 0) console.log('A', i, yUnits.toFixed(2))
}

const startB = await page.evaluate(() => window.scrollY)
const endB = totalH - 894
for (let i = 0; i < phaseB; i++) {
  const t = ease(i / (phaseB - 1))
  const y = startB + (endB - startB) * t
  await page.evaluate((y) => window.scrollTo(0, y), y)
  await new Promise((r) => setTimeout(r, 30))
  await page.screenshot({ path: path.join(OUTDIR, `f${String(frame).padStart(4,'0')}.png`), type: 'png' })
  frame++
  if (i % 30 === 0) console.log('B', i, Math.round(y))
}

await browser.close()
console.log('frames', frame)

const out = path.resolve(__dirname, '../capturas-prototipo/ronda-3/recorrido-telefono.mp4')
await new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', [
    '-y', '-framerate', String(fps), '-i', path.join(OUTDIR, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart',
    out
  ], { stdio: 'inherit' })
  ff.on('exit', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg ' + code)))
})
console.log('VIDEO', out, fs.statSync(out).size)
