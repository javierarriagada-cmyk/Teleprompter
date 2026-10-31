import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const OUTDIR = path.resolve('../capturas-prototipo/ronda-2/video-frames')
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
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
await page.waitForFunction(() => document.documentElement.classList.contains('coreografia'), { timeout: 20000 })
await page.evaluate(() => document.fonts && document.fonts.ready)
await new Promise(r => setTimeout(r, 1200))

// Smooth scroll through hero + cómo (E0 → E1 → E2 → E5) over ~10s
const frames = 90 // ~9s at 10fps
const targets = [0, 1.25, 2.9, 4.9] // vh units: E0 → E1 → E2 → E5 (TOTAL 5.1)
const times = [0, 0.25, 0.5, 1.0] // normalized timeline

function ease(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2 }

for (let i = 0; i < frames; i++) {
  const u = i / (frames - 1)
  // piece-wise along targets
  let yUnits
  if (u <= times[1]) {
    const t = ease(u / times[1])
    yUnits = targets[0] + (targets[1]-targets[0])*t
  } else if (u <= times[2]) {
    const t = ease((u - times[1]) / (times[2]-times[1]))
    yUnits = targets[1] + (targets[2]-targets[1])*t
  } else {
    const t = ease((u - times[2]) / (1-times[2]))
    yUnits = targets[2] + (targets[3]-targets[2])*t
  }
  await page.evaluate((yUnits) => {
    const escenario = document.getElementById('escenario')
    window.scrollTo(0, escenario.offsetTop + yUnits * window.innerHeight)
  }, yUnits)
  await new Promise(r => setTimeout(r, 40))
  const file = path.join(OUTDIR, `f${String(i).padStart(4,'0')}.png`)
  await page.screenshot({ path: file, type: 'png' })
  if (i % 15 === 0) console.log('frame', i, 'y', yUnits.toFixed(2))
}
await browser.close()
console.log('frames done', frames)

// encode mp4
const out = path.resolve('../capturas-prototipo/ronda-2/hero-como-telefono.mp4')
await new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', [
    '-y', '-framerate', '10', '-i', path.join(OUTDIR, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart',
    out
  ], { stdio: 'inherit' })
  ff.on('exit', code => code === 0 ? resolve() : reject(new Error('ffmpeg '+code)))
})
console.log('VIDEO', out, fs.statSync(out).size)
