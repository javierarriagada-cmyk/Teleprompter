import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const OUT = path.resolve('../capturas-prototipo/ronda-2')
const BASE = 'http://127.0.0.1:8765/index.html'
const CHROME = '/usr/bin/google-chrome-stable'

async function shot(page, name, w, h) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await new Promise(r => setTimeout(r, 500))
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, type: 'png' })
  console.log('OK', name, w, h, fs.statSync(file).size)
}

async function waitReady(page) {
  await page.waitForFunction(() => document.documentElement.classList.contains('coreografia'), { timeout: 20000 })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  await page.waitForSelector('.telefono[data-telefono="sigo"] [data-token]', { timeout: 15000 })
  await new Promise(r => setTimeout(r, 1000))
}

async function scrollToCapitulo(page, k) {
  // ESCENAS best-frame progress (index [3]) on the short E0→E1→E2→E5 timeline
  await page.evaluate((k) => {
    const escenario = document.getElementById('escenario')
    const BEST = { 1: 1.25, 2: 2.9, 5: 4.2 }
    window.scrollTo(0, escenario.offsetTop + BEST[k] * window.innerHeight)
  }, k)
  await new Promise(r => setTimeout(r, 1400))
  // E2: wait until pause contrast is visible (badges), up to ~6s of Reloj loop
  if (k === 2) {
    try {
      await page.waitForFunction(() => {
        const s = document.querySelector('.telefono[data-telefono="sigo"]')
        const c = document.querySelector('.telefono[data-telefono="comun"]')
        const te = s && s.querySelector('.aviso-espera')
        const se = c && c.querySelector('.aviso-escapa')
        if (!s?.classList.contains('espera') || !c?.classList.contains('se-escapa')) return false
        if (!te || !se) return false
        const r = te.getBoundingClientRect()
        return +getComputedStyle(te).opacity > 0.9 && r.width > 40
      }, { timeout: 9000 })
      await new Promise(r => setTimeout(r, 350))
    } catch (e) {
      console.log('WARN E2 badges not yet visible')
    }
  }
}

async function measure(page, label) {
  const m = await page.evaluate(() => {
    const marca = document.querySelector('.marca-gigante')
    const titular = document.querySelector('.titular-entrada')
    const tel = document.querySelector('.telefono[data-telefono="sigo"]')
    const br = (el) => el ? el.getBoundingClientRect() : null
    const mr = br(marca), tr = br(titular), pr = br(tel)
    const vh = window.innerHeight
    return {
      vw: window.innerWidth, vh, scrollY: window.scrollY,
      marca: mr && { top: +mr.top.toFixed(1), h: +mr.height.toFixed(1), clippedTop: mr.top < -1 },
      titular: tr && { top: +tr.top.toFixed(1), bottom: +tr.bottom.toFixed(1), h: +tr.height.toFixed(1) },
      phone: pr && { top: +pr.top.toFixed(1), bottom: +pr.bottom.toFixed(1), h: +pr.height.toFixed(1), w: +pr.width.toFixed(1),
        fullyVisible: pr.top >= -2 && pr.bottom <= vh + 2 },
      gapTextPhone: tr && pr ? +(pr.top - tr.bottom).toFixed(1) : null,
    }
  })
  console.log('MEASURE', label, JSON.stringify(m))
  return m
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none']
})

{
  const page = await browser.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
  await waitReady(page)

  await page.setViewport({ width: 392, height: 894, deviceScaleFactor: 1 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await new Promise(r => setTimeout(r, 800))
  await measure(page, 'hero-tel')
  await shot(page, 'hero-telefono', 392, 894)

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await new Promise(r => setTimeout(r, 800))
  await measure(page, 'hero-desk')
  await shot(page, 'hero-escritorio', 1440, 900)

  for (const [k, name] of [[1,'como-0'],[2,'como-1'],[5,'como-2']]) {
    await page.setViewport({ width: 392, height: 894, deviceScaleFactor: 1 })
    await scrollToCapitulo(page, k)
    await measure(page, `${name}-tel`)
    await shot(page, `${name}-telefono`, 392, 894)

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await scrollToCapitulo(page, k)
    await measure(page, `${name}-desk`)
    await shot(page, `${name}-escritorio`, 1440, 900)
  }

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.evaluate(() => document.getElementById('para')?.scrollIntoView())
  await new Promise(r => setTimeout(r, 500))
  await shot(page, 'para-presentaciones', 1440, 900)
  await page.close()
}

{
  const page = await browser.newPage()
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
  await waitReady(page)
  for (const [k, name] of [[1,'rm-como-0'],[2,'rm-como-1'],[5,'rm-como-2']]) {
    await page.setViewport({ width: 392, height: 894, deviceScaleFactor: 1 })
    await scrollToCapitulo(page, k)
    await new Promise(r => setTimeout(r, 500))
    await shot(page, name, 392, 894)
  }
  // also desktop reduced-motion static frames
  for (const [k, name] of [[1,'rm-como-0-escritorio'],[2,'rm-como-1-escritorio'],[5,'rm-como-2-escritorio']]) {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await scrollToCapitulo(page, k)
    await new Promise(r => setTimeout(r, 500))
    await shot(page, name, 1440, 900)
  }
  await page.close()
}

await browser.close()
console.log('DONE')
