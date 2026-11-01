import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../capturas-prototipo/ronda-3')
const BASE = 'http://127.0.0.1:8765/index.html'
const CHROME = '/usr/bin/google-chrome-stable'
fs.mkdirSync(OUT, { recursive: true })

async function forceLoad(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('.revela').forEach((n) => n.classList.add('revelado'))
    const imgs = [...document.querySelectorAll('img')]
    await Promise.all(imgs.map((img) => {
      if (img.loading === 'lazy') img.loading = 'eager'
      if (!img.complete) {
        return new Promise((res) => {
          img.addEventListener('load', res, { once: true })
          img.addEventListener('error', res, { once: true })
          // kick
          const s = img.getAttribute('src'); img.removeAttribute('src'); img.setAttribute('src', s)
        })
      }
      return Promise.resolve()
    }))
    await document.fonts.ready
  })
  await new Promise((r) => setTimeout(r, 600))
}

async function waitReady(page) {
  await page.waitForFunction(() => document.documentElement.classList.contains('coreografia'), { timeout: 25000 })
  await page.waitForSelector('.telefono[data-telefono="sigo"] [data-token]', { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 800))
}

async function scrollBest(page, k) {
  await page.evaluate((k) => {
    const escenario = document.getElementById('escenario')
    const BEST = { 1: 1.25, 2: 2.9, 5: 4.2 }
    window.scrollTo(0, escenario.offsetTop + BEST[k] * window.innerHeight)
  }, k)
  await new Promise((r) => setTimeout(r, 1400))
  if (k === 2) {
    try {
      await page.waitForFunction(() => {
        const s = document.querySelector('.telefono[data-telefono="sigo"]')
        const c = document.querySelector('.telefono[data-telefono="comun"]')
        return s?.classList.contains('espera') && c?.classList.contains('se-escapa')
      }, { timeout: 9000 })
      await new Promise((r) => setTimeout(r, 300))
    } catch {}
  }
}

async function shotViewport(page, name) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, type: 'png' })
  console.log('OK', name, fs.statSync(file).size)
}

async function shotFull(page, name) {
  await forceLoad(page)
  // scroll through to trigger any lazy
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight
    for (let y = 0; y < h; y += Math.floor(window.innerHeight * 0.7)) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 80))
    }
    window.scrollTo(0, 0)
  })
  await forceLoad(page)
  await new Promise((r) => setTimeout(r, 400))
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, type: 'png', fullPage: true })
  console.log('FULL', name, fs.statSync(file).size)
}

async function shotSection(page, sel, name) {
  await forceLoad(page)
  const el = await page.$(sel)
  if (!el) { console.log('MISS', name, sel); return }
  await el.scrollIntoViewIfNeeded()
  await new Promise((r) => setTimeout(r, 500))
  const file = path.join(OUT, `${name}.png`)
  await el.screenshot({ path: file, type: 'png' })
  console.log('SEC', name, fs.statSync(file).size)
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none']
})

// Phone full + sections
{
  const page = await browser.newPage()
  await page.setViewport({ width: 392, height: 894, deviceScaleFactor: 2 })
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 90000 })
  await waitReady(page)

  // Measure E2 air
  await scrollBest(page, 2)
  const m = await page.evaluate(() => {
    const s = document.querySelector('.telefono[data-telefono="sigo"]')
    const c = document.querySelector('.telefono[data-telefono="comun"]')
    const rot = document.querySelector('.telefono[data-telefono="sigo"] .rotulo')
    const pill = document.querySelector('.pildora')
    const br = (el) => el && el.getBoundingClientRect()
    const sr = br(s), cr = br(c), rr = br(rot), pr = br(pill)
    return {
      marginL: +(cr.left).toFixed(1),
      marginR: +(window.innerWidth - sr.right).toFixed(1),
      gutter: +(sr.left - cr.right).toFixed(1),
      phoneBottom: +sr.bottom.toFixed(1),
      rotBottom: rr ? +rr.bottom.toFixed(1) : null,
      pillTop: pr ? +pr.top.toFixed(1) : null,
      airUnderRot: rr && pr ? +(pr.top - rr.bottom).toFixed(1) : null,
      airUnderPhone: +(window.innerHeight - sr.bottom).toFixed(1),
      anyTouch: cr.left < 1 || sr.right > window.innerWidth - 1,
      esperaVisible: getComputedStyle(document.querySelector('.tarjeta[data-tarjeta="espera"]') || document.body).display,
    }
  })
  console.log('E2_MEASURE', JSON.stringify(m))
  await shotViewport(page, 'como-e2-tel')

  await scrollBest(page, 5)
  const e5 = await page.evaluate(() => {
    const chips = document.querySelector('.estilos-subtitulo')
    const pill = document.querySelector('.pildora')
    const br = (el) => el && el.getBoundingClientRect()
    const cr = br(chips), pr = br(pill)
    return {
      chipsLeft: cr ? +cr.left.toFixed(1) : null,
      chipsRight: cr ? +(window.innerWidth - cr.right).toFixed(1) : null,
      chipsBottom: cr ? +cr.bottom.toFixed(1) : null,
      pillTop: pr ? +pr.top.toFixed(1) : null,
      gapChipsPill: cr && pr ? +(pr.top - cr.bottom).toFixed(1) : null,
    }
  })
  console.log('E5_MEASURE_TEL', JSON.stringify(e5))
  await shotViewport(page, 'como-e5-tel')

  await shotFull(page, 'pagina-completa-tel')

  for (const [sel, name] of [
    ['#video', 'sec-video-tel'],
    ['#para', 'sec-para-tel'],
    ['#app', 'sec-app-tel'],
    ['#guiones', 'sec-guiones-tel'],
    ['#cierre', 'sec-cierre-tel'],
  ]) await shotSection(page, sel, name)

  await page.close()
}

// Desk
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 90000 })
  await waitReady(page)

  await scrollBest(page, 5)
  const e5 = await page.evaluate(() => {
    const chips = document.querySelector('.estilos-subtitulo')
    const pill = document.querySelector('.pildora')
    const texto = document.querySelector('.texto-escena[data-escena="5"]')
    const br = (el) => el && el.getBoundingClientRect()
    const cr = br(chips), pr = br(pill), tr = br(texto)
    return {
      chipsLeft: cr ? +cr.left.toFixed(1) : null,
      chipsFromTextoLeft: cr && tr ? +(cr.left - tr.left).toFixed(1) : null,
      chipsRight: cr ? +(window.innerWidth - cr.right).toFixed(1) : null,
      gapChipsPill: cr && pr ? +(pr.top - cr.bottom).toFixed(1) : null,
      esperaDisplay: getComputedStyle(document.querySelector('.tarjeta[data-tarjeta="espera"]')).display,
    }
  })
  console.log('E5_MEASURE_DESK', JSON.stringify(e5))
  await shotViewport(page, 'como-e5-desk')

  await scrollBest(page, 2)
  await shotViewport(page, 'como-e2-desk')

  await shotFull(page, 'pagina-completa-desk')
  await page.close()
}

await browser.close()
console.log('DONE', OUT)
