// LA COREOGRAFIA: el telefono fijo y el scroll como hilo. 27-09-2026, docs/el-sitio.md v2.
//
// Todo el escenario -E0 a E6- es una sola seccion alta con una capa pegada a la pantalla
// -.fijo-. Una linea de tiempo de GSAP, atada al scroll con ScrollTrigger, mueve el telefono,
// los textos y las luces; una unidad de la linea es una pantalla de scroll. Lo que no se
// interpola -que formatos estan pintados, si esta grabando, cuantas barras de senal quedan,
// el estilo de subtitulos- se decide en cada cuadro segun donde va el scroll, y funciona igual
// subiendo que bajando.
//
// La lectura del telefono NO va con el scroll: corre con su reloj, con los tiempos del JSON,
// como corre en la aplicacion. El scroll decide que se ve de ella.

import { Pantalla, Reloj } from './pantalla.js'
import { Onda } from './onda.js'

// [escena, desde, hasta, mejor cuadro -el que se muestra quieto con movimiento reducido-]
const ESCENAS = [
  [0, 0, 0.6, 0],
  [1, 0.6, 2.2, 1.9],
  [2, 2.2, 3.9, 3.45],
  [3, 3.9, 5.6, 5.45],
  [4, 5.6, 7.5, 6.3],
  [5, 7.5, 9.5, 8.3],
  [6, 9.5, 10.9, 10.7]
]
const TOTAL = 10.9
// Donde deja el scroll cada capitulo de la pildora.
const CAPITULOS = { 1: 1.3, 2: 3.0, 3: 5.4, 4: 6.0, 5: 8.1, 6: 10.6 }
// Los formatos se pintan en E3, uno tras otro, y quedan.
const PINTA = [['negrita', 4.45], ['ambar', 4.65], ['celeste', 4.85], ['salvia', 5.05], ['destacado', 5.25]]
const GRABA = [6.75, 7.55]
const LENTE = [6.0, 6.6]
const VIDEO = [7.8, 9.55]
const ESTILOS = [['amarillo', 7.5], ['rojo', 8.6], ['formal', 9.05]]
// Sin internet: las cuatro barras se apagan de a una, despues el wifi, despues el avion.
const SENAL = [10.0, 10.1, 10.2, 10.3]
const SIN_WIFI = 10.4
const AVION = 10.5

const escenaEn = (p) => (ESCENAS.find((e) => p < e[2]) || ESCENAS[ESCENAS.length - 1])[0]

export function iniciarEscenas(datos) {
  const gsap = window.gsap
  const ScrollTrigger = window.ScrollTrigger
  const doc = document.documentElement
  if (!gsap || !ScrollTrigger) {
    // NADA FALLA EN SILENCIO: sin las bibliotecas la pagina queda como sin JavaScript -las
    // escenas en fila, quietas-, y se dice por que.
    console.warn('Sigo: no cargo GSAP o ScrollTrigger (/vendor). La pagina queda sin coreografia.')
    doc.classList.remove('js')
    return
  }
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.config({ ignoreMobileResize: true })

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))

  const escenario = $('#escenario')
  const telSigo = $('.telefono[data-telefono="sigo"]')
  const telComun = $('.telefono[data-telefono="comun"]')
  const telefonos = $('.telefonos')
  const entrada = $('.entrada')
  const textos = {}
  $$('.texto-escena').forEach((el) => { textos[el.dataset.escena] = el })
  const luces = {}
  $$('.luces .luz').forEach((el) => { luces[el.className.replace('luz ', '').replace('luz-', '')] = el })
  const pildora = $('.pildora')
  const pildoraFondo = $('.pildora-fondo')
  const capitulos = $$('.pildora a')
  const tarjetas = {}
  $$('.tarjeta').forEach((el) => { tarjetas[el.dataset.tarjeta] = el })
  const estilosSub = $$('.estilos-subtitulo span')
  const haz = $('.haz', telSigo)
  const video = $('.video', telSigo)
  const capaSub = $('.capa-subtitulos', telSigo)
  const subEl = $('.subtitulo', capaSub)
  const barraVideo = $('.video-barra i', telSigo)
  const barras = $$('.senal i', telSigo)
  const canvas = $('.onda')

  const sigo = new Pantalla(telSigo, datos)
  const comun = new Pantalla(telComun, datos)
  comun.modo = 'fijo'
  telComun.dataset.modo = 'fijo'
  const onda = new Onda(canvas, datos.voz)
  // El telefono mide siempre lo mismo -el tamano lo pone una transformacion-, asi que las
  // palabras se miden una vez. demo.js llama aca cuando ya esta la letra verdadera.
  if (!sigo.medir() || !comun.medir()) {
    console.warn('Sigo: el telefono no tiene palabras que medir. La pagina queda sin coreografia.')
    doc.classList.remove('js')
    return
  }

  // El destacado barre la frase de izquierda a derecha: cada trozo empieza un poco despues.
  $$('.f-destacado', telSigo).forEach((el, i) => el.style.setProperty('--retraso', `${i * 60}ms`))

  // El titular de E1 se arma palabra por palabra.
  $$('[data-palabra-a-palabra]').forEach((h) => {
    h.innerHTML = h.textContent.trim().split(/\s+/).map((w) => `<span class="p">${w}</span>`).join(' ')
  })

  // Los relojes. La lectura entera da vueltas; E2 da vueltas sobre el tramo de la pausa de
  // pensar: seis segundos antes, la pausa, y cuatro despues.
  const relojLectura = new Reloj(0, datos.hastaMs, { antes: 700, despues: 2600 })
  const pausa = datos.pausa || [datos.hastaMs / 2, datos.hastaMs / 2 + 2000]
  const relojE2 = new Reloj(pausa[0] - 6500, pausa[1] + 4200, { antes: 250, despues: 1500 })
  comun.ponerFijo(relojE2.desde)
  // E3 da vueltas sobre el comienzo, para que los formatos se pinten donde se ven.
  const relojE3 = new Reloj(0, 9500, { antes: 500, despues: 1800 })
  if (reducido) {
    // Quieto en su mejor cuadro: la lectura en "Sin apuro", con el destacado a la vista; E2
    // al final de la pausa, cuando el comun ya se llevo la frase.
    const k = Math.min(datos.voz.length - 1, 25)
    relojLectura.congelar(datos.voz[k][0] + 120)
    relojE2.congelar(pausa[1] - 150)
    relojE3.congelar(6200)
  }

  // ---------- las posiciones del telefono en cada escena ----------

  let L = null
  function medidas() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const movil = vw < 900
    const E = {}
    if (movil) {
      const s = Math.min((0.6 * vh) / 800, (0.72 * vw) / 380)
      const cy = 0.31 * vh + 400 * s
      E.e0 = { x: 0, y: 0.64 * vh + 400 * s - vh / 2, rotationX: 26, rotationY: 0, rotationZ: 0, scale: s }
      E.e1 = { x: 0.12 * vw, y: cy - vh / 2, rotationX: 0, rotationY: -8, rotationZ: 0, scale: s }
      E.e3 = { x: 0, y: cy - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s }
      const s2 = Math.min((0.44 * vw) / 380, (0.37 * vh) / 800)
      const cy2 = 0.4 * vh + 400 * s2
      E.e2sigo = { x: 0.235 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s2 }
      E.e2comun = { x: -0.235 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s2 }
      const sz = s * 1.45
      E.e4zoom = { x: 0, y: 0.4 * vh - 22 * sz + 400 * sz - vh / 2, rotationX: 30, rotationY: -10, rotationZ: 0, scale: sz }
      E.e4graba = { ...E.e3, rotationY: -5 }
      const sv = Math.min((0.9 * vw) / 800, (0.36 * vh) / 380)
      E.e5 = { x: 0, y: 0.56 * vh - vh / 2, rotationX: 0, rotationY: 0, rotationZ: -90, scale: sv }
      // Debajo de los rotulos: entre los telefonos no hay lugar para verla.
      E.onda2Y = cy2 + 400 * s2 + 70
      E.espera2Y = cy2 - 400 * s2 - 52
      E.s = s
    } else {
      const s = Math.min((0.82 * vh) / 800, 1)
      const xR = 0.19 * vw
      E.e0 = { x: 0, y: 0.72 * vh + 400 * s - vh / 2, rotationX: 28, rotationY: 0, rotationZ: 0, scale: s * 0.98 }
      E.e1 = { x: xR, y: 0.01 * vh, rotationX: 4, rotationY: -12, rotationZ: 0, scale: s }
      E.e3 = { x: xR, y: 0, rotationX: 0, rotationY: -5, rotationZ: 0, scale: s }
      const s2 = Math.min((0.5 * vh) / 800, (0.26 * vw) / 380)
      const cy2 = 0.33 * vh + 400 * s2
      E.e2sigo = { x: 0.14 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: -4, rotationZ: 0, scale: s2 }
      E.e2comun = { x: -0.14 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 4, rotationZ: 0, scale: s2 }
      const sz = s * 1.75
      E.e4zoom = { x: xR * 0.7, y: 0.3 * vh - 22 * sz + 400 * sz - vh / 2, rotationX: 30, rotationY: -22, rotationZ: 0, scale: sz }
      E.e4graba = { ...E.e3, rotationY: -8 }
      const sv = Math.min((0.6 * vw) / 800, (0.5 * vh) / 380)
      E.e5 = { x: 0, y: 0.63 * vh - vh / 2, rotationX: 0, rotationY: 0, rotationZ: -90, scale: sv }
      E.onda2Y = cy2
      E.s = s
    }
    E.e6 = E.e3
    E.vw = vw
    E.vh = vh
    E.movil = movil
    return E
  }

  // ---------- la linea de tiempo ----------

  let tl = null
  let disparador = null
  function construir() {
    const tiempo = tl ? tl.time() : 0
    if (tl) tl.kill()
    if (disparador) disparador.kill()
    L = medidas()
    escenario.style.height = `${Math.round(TOTAL * L.vh + L.vh)}px`
    for (const [k, p] of Object.entries(CAPITULOS)) {
      const ancla = document.getElementById(`e${k}`)
      if (ancla) ancla.style.top = `${Math.round(p * L.vh)}px`
    }
    luces.tibia.style.setProperty('--luz-x', L.movil ? '50%' : '69%')
    luces.lente.style.setProperty('--luz-x', L.movil ? '50%' : '62%')
    luces.noche.style.setProperty('--luz-x', L.movil ? '50%' : '69%')

    const facil = 'power2.inOut'
    tl = gsap.timeline({ paused: true, defaults: { ease: facil } })
    gsap.set(telSigo, { ...L.e0, transformPerspective: 0 })
    gsap.set(telComun, { ...L.e2comun, x: L.e2comun.x - 0.3 * L.vw, autoAlpha: 0 })
    gsap.set(Object.values(textos), { autoAlpha: 0 })
    gsap.set(entrada, { autoAlpha: 1, y: 0, scale: 1 })
    gsap.set([luces.tibia, luces.lente, luces.cine, luces.noche], { opacity: 0 })
    gsap.set(luces.entrada, { opacity: 1 })
    gsap.set([pildora, canvas, haz, video], { autoAlpha: 0 })
    gsap.set('.rotulo', { opacity: 0 })

    // E0 -> E1
    tl.to(entrada, { autoAlpha: 0, y: -0.14 * L.vh, scale: 0.94, duration: 0.6, ease: 'power1.in' }, 0.05)
    tl.to(telSigo, { ...L.e1, duration: 1 }, 0)
    tl.to(luces.entrada, { opacity: 0, duration: 0.8 }, 0.2)
    tl.to(luces.tibia, { opacity: 1, duration: 0.8 }, 0.3)
    tl.to(pildora, { autoAlpha: 1, duration: 0.3 }, 0.75)
    tl.set(textos[1], { autoAlpha: 1 }, 0.95)
    tl.fromTo($$('.p', textos[1]), { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.14, duration: 0.3, ease: 'power2.out' }, 1.0)
    tl.fromTo($('.bajada', textos[1]), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3 }, 1.45)
    tl.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.0)

    // E1 -> E2: aparece el comun al lado
    tl.to(textos[1], { autoAlpha: 0, y: -30, duration: 0.3 }, 2.2)
    tl.to(canvas, { autoAlpha: 0, duration: 0.2 }, 2.2)
    tl.to(telSigo, { ...L.e2sigo, duration: 0.7 }, 2.2)
    tl.to(telComun, { ...L.e2comun, autoAlpha: 1, duration: 0.7 }, 2.2)
    tl.to('.rotulo', { opacity: 1, duration: 0.3 }, 2.7)
    tl.fromTo(textos[2], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 2.5)
    tl.to(canvas, { autoAlpha: 1, duration: 0.3 }, 2.75)

    // E2 -> E3
    tl.to(textos[2], { autoAlpha: 0, y: -30, duration: 0.3 }, 3.9)
    tl.to(canvas, { autoAlpha: 0, duration: 0.2 }, 3.9)
    tl.to('.rotulo', { opacity: 0, duration: 0.2 }, 3.9)
    tl.to(telComun, { autoAlpha: 0, x: L.e2comun.x - 0.3 * L.vw, duration: 0.5 }, 3.9)
    tl.to(telSigo, { ...L.e3, duration: 0.55 }, 3.9)
    tl.fromTo(textos[3], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 4.15)

    // E3 -> E4: gira hasta mostrar el lente, el haz, y despues grabando
    tl.to(textos[3], { autoAlpha: 0, y: -30, duration: 0.3 }, 5.6)
    tl.to(luces.tibia, { opacity: 0, duration: 0.5 }, 5.6)
    tl.to(luces.lente, { opacity: 1, duration: 0.5 }, 5.7)
    tl.to(telSigo, { ...L.e4zoom, duration: 0.7 }, 5.6)
    tl.fromTo(textos[4], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 5.9)
    tl.to(haz, { autoAlpha: 1, duration: 0.25 }, 6.05)
    tl.to(haz, { autoAlpha: 0, duration: 0.2 }, 6.55)
    tl.to(telSigo, { ...L.e4graba, duration: 0.55 }, 6.5)

    // E4 -> E5: se acuesta y se vuelve un cuadro de video
    tl.to(textos[4], { autoAlpha: 0, y: -30, duration: 0.3 }, 7.5)
    tl.to(luces.lente, { opacity: 0, duration: 0.4 }, 7.5)
    tl.to(luces.cine, { opacity: 1, duration: 0.5 }, 7.55)
    tl.to(telSigo, { ...L.e5, duration: 0.6 }, 7.5)
    tl.to(video, { autoAlpha: 1, duration: 0.3 }, 7.85)
    tl.fromTo(textos[5], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 7.85)

    // E5 -> E6: vuelve a quedar de pie; se va la senal
    tl.to(textos[5], { autoAlpha: 0, y: -30, duration: 0.3 }, 9.5)
    tl.to(video, { autoAlpha: 0, duration: 0.25 }, 9.5)
    tl.to(luces.cine, { opacity: 0, duration: 0.4 }, 9.5)
    tl.to(luces.noche, { opacity: 1, duration: 0.5 }, 9.55)
    tl.to(telSigo, { ...L.e6, duration: 0.5 }, 9.5)
    tl.fromTo(textos[6], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 9.8)
    tl.to(pildora, { autoAlpha: 0, duration: 0.2 }, TOTAL - 0.2)
    tl.set({}, {}, TOTAL)

    tl.time(Math.min(tiempo, TOTAL))
    disparador = ScrollTrigger.create({
      trigger: escenario,
      start: 'top top',
      end: 'bottom bottom',
      animation: reducido ? null : tl,
      scrub: reducido ? false : (tactil ? 0.35 : true),
      onUpdate: reducido ? (st) => {
        // Movimiento reducido: cada escena quieta en su mejor cuadro, sin interpolar.
        const e = ESCENAS[escenaEn(st.progress * TOTAL)]
        if (tl.time() !== e[3]) tl.time(e[3])
      } : undefined
    })
    if (reducido) tl.time(ESCENAS[escenaEn(disparador.progress * TOTAL)][3])
    onda.medir()
  }

  const tactil = window.matchMedia('(pointer: coarse)').matches

  // ---------- cada cuadro ----------

  const estadoPrevio = {}
  function cambia(clave, valor) {
    if (estadoPrevio[clave] === valor) return false
    estadoPrevio[clave] = valor
    return true
  }

  let relojActivo = null
  let vueltaPrevia = -1

  function cuadro() {
    const ahora = performance.now()
    const p = tl.time()
    // Pasado el escenario -el cierre a la vista-, no se dibuja nada.
    if (!disparador.isActive && disparador.progress >= 1) return
    const esc = escenaEn(p)

    // Los formatos, grabando, el lente, el video, la senal.
    for (const [f, desde] of PINTA) if (cambia(`pinta-${f}`, p >= desde)) telSigo.classList.toggle(`pinta-${f}`, p >= desde)
    const graba = p >= GRABA[0] && p < GRABA[1]
    if (cambia('graba', graba)) telSigo.classList.toggle('grabando', graba)
    const lente = p >= LENTE[0] && p < LENTE[1]
    if (cambia('lente', lente)) telSigo.classList.toggle('ilumina-lente', lente)
    barras.forEach((b, i) => { const off = p >= SENAL[i]; if (cambia(`senal${i}`, off)) b.classList.toggle('apagada', off) })
    if (cambia('wifi', p >= SIN_WIFI)) telSigo.classList.toggle('sin-wifi', p >= SIN_WIFI)
    if (cambia('avion', p >= AVION)) telSigo.classList.toggle('avion', p >= AVION)
    if (cambia('oye', esc === 1)) telSigo.classList.toggle('oye-voz', esc === 1)
    sigo.oyeVoz = esc === 1
    let estilo = ESTILOS[0][0]
    for (const [e, desde] of ESTILOS) if (p >= desde) estilo = e
    if (cambia('estilo', estilo)) {
      capaSub.dataset.estilo = estilo
      estilosSub.forEach((s) => s.classList.toggle('activo', s.dataset.estilo === estilo))
      estadoPrevio.sub = ''
    }
    const cap = esc >= 1 ? esc : 0
    if (cambia('capitulo', cap)) ponerCapitulo(cap)

    // La lectura: en E2, el tramo de la pausa, igual en los dos telefonos.
    const enE2 = p >= 2.45 && p < 3.95
    const enE3 = p >= 3.95 && p < 5.65
    const reloj = enE2 ? relojE2 : enE3 ? relojE3 : relojLectura
    let deGolpe = false
    if (reloj !== relojActivo) {
      if (enE2 || enE3) reloj.reiniciar(ahora)
      relojActivo = reloj
      deGolpe = true
      vueltaPrevia = -1
    }
    const { t, alfa, vuelta = 0 } = reloj.valor(ahora)
    if (vuelta !== vueltaPrevia) { deGolpe = true; vueltaPrevia = vuelta }
    const a = alfa.toFixed(2)
    if (cambia('alfa', a)) { sigo.desliza.style.opacity = a; comun.desliza.style.opacity = a }
    sigo.dibujar(t, ahora, deGolpe)
    if (esc === 2 || (p > 2.2 && p < 4.4)) comun.dibujar(t, ahora, deGolpe)

    // La onda
    const alfaOnda = +gsap.getProperty(canvas, 'opacity')
    if (alfaOnda > 0.01) {
      if (esc <= 1) {
        const x = L.vw / 2 + gsap.getProperty(telSigo, 'x') - 190 * gsap.getProperty(telSigo, 'scale')
        const y = L.vh / 2 + gsap.getProperty(telSigo, 'y') + (86 - 400) * gsap.getProperty(telSigo, 'scale')
        onda.dibujar(t, { x, y, alto: L.movil ? 46 : 78, izquierda: x })
      } else {
        onda.dibujar(t, { x: L.vw / 2, y: L.onda2Y, alto: L.movil ? 34 : 56, izquierda: L.vw / 2, pasado: L.vw / 2 })
      }
      estadoPrevio.ondaLimpia = false
    } else if (!estadoPrevio.ondaLimpia) {
      onda.dibujar(0, { x: 0, y: 0, alto: 0, alfa: 0 })
      estadoPrevio.ondaLimpia = true
    }

    // Los subtitulos: con el reloj de la lectura, en el cuadro de video.
    if (p >= VIDEO[0] - 0.3 && p < VIDEO[1]) ponerSubtitulo(t)

    ponerTarjetas(p, esc, t)
  }

  // ---------- subtitulos ----------

  function ponerSubtitulo(t) {
    const s = datos.subtitulos.find((x) => t >= x[0] && t < x[1])
    let html = ''
    if (s) {
      html = s[2].map((r) => `<span class="subtitulo-renglon">${r.map(([w, a, b]) => `<span class="sp" data-estado="${t >= b ? 'dicha' : t >= a ? 'diciendose' : 'por-decir'}">${w}</span>`).join(' ')}</span>`).join('')
    }
    if (cambia('sub', html)) subEl.innerHTML = html
    barraVideo.style.width = `${Math.min(100, (100 * Math.max(0, t)) / datos.hastaMs)}%`
  }

  // ---------- tarjetas ----------

  // Donde va cada tarjeta, en px del telefono desde su centro, y de que lado se apoya.
  const LUGARES = {
    espera: { telefono: 'sigo', x: 235, y: -250, lado: 'izq' },
    corre: { telefono: 'comun', x: -235, y: -250, lado: 'der' },
    negrita: { x: 235, y: -250, lado: 'izq' },
    ambar: { x: 235, y: -160, lado: 'izq' },
    celeste: { x: 235, y: -70, lado: 'izq' },
    salvia: { x: 235, y: 20, lado: 'izq' },
    destacado: { x: 235, y: 110, lado: 'izq' },
    lente: { x: 150, y: -300, lado: 'izq' },
    camara: { x: 235, y: -220, lado: 'izq' },
    avion: { x: 235, y: -250, lado: 'izq' }
  }

  function tarjetasVisibles(p, esc, t) {
    const v = new Set()
    const enPausa = t >= pausa[0] + 250 && t < pausa[1] + 200
    if (esc === 2 && p > 2.8 && enPausa) { v.add('espera'); if (!L.movil) v.add('corre') }
    if (esc === 3) {
      const pintados = PINTA.filter(([, d]) => p >= d).map(([f]) => f)
      if (L.movil) { if (pintados.length) v.add(pintados[pintados.length - 1]) } else pintados.forEach((f) => v.add(f))
    }
    if (p >= 6.05 && p < 6.6) v.add('lente')
    if (p >= GRABA[0] + 0.1 && p < 7.45) v.add('camara')
    if (p >= AVION && p < TOTAL) v.add('avion')
    return v
  }

  function ponerTarjetas(p, esc, t) {
    const v = tarjetasVisibles(p, esc, t)
    for (const [nombre, el] of Object.entries(tarjetas)) {
      const ver = v.has(nombre)
      if (cambia(`tarjeta-${nombre}`, ver)) gsap.to(el, { autoAlpha: ver ? 1 : 0, duration: reducido ? 0 : 0.35, overwrite: 'auto' })
      if (!ver && +gsap.getProperty(el, 'opacity') < 0.01) continue
      const lugar = LUGARES[nombre]
      const tel = lugar.telefono === 'comun' ? telComun : telSigo
      const s = gsap.getProperty(tel, 'scale')
      const cx = L.vw / 2 + gsap.getProperty(tel, 'x')
      const cy = L.vh / 2 + gsap.getProperty(tel, 'y')
      let x
      let y
      if (L.movil) {
        // En un telefono no hay costados: van centradas, abajo del telefono.
        x = L.vw / 2 - el.offsetWidth / 2
        y = esc === 2 ? L.espera2Y : Math.min(L.vh - 110, cy + 320 * s)
      } else {
        x = cx + lugar.x * s
        if (lugar.lado === 'der') x -= el.offsetWidth
        y = cy + lugar.y * s
      }
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    }
  }

  // ---------- la pildora ----------

  function ponerCapitulo(k) {
    capitulos.forEach((a) => {
      const activo = +a.dataset.capitulo === k
      a.classList.toggle('activo', activo)
      if (activo) a.setAttribute('aria-current', 'step')
      else a.removeAttribute('aria-current')
    })
    const a = capitulos.find((x) => +x.dataset.capitulo === k)
    if (a) {
      pildoraFondo.style.width = `${a.offsetWidth}px`
      pildoraFondo.style.transform = `translateX(${a.offsetLeft - 5}px)`
    }
  }
  capitulos.forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault()
    const k = +a.dataset.capitulo
    const y = escenario.offsetTop + CAPITULOS[k] * L.vh
    if (lenis) lenis.scrollTo(y, { duration: 1.4 })
    else window.scrollTo({ top: y, behavior: reducido ? 'auto' : 'smooth' })
  }))

  // ---------- el scroll suave ----------

  let lenis = null
  if (!reducido && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((tiempo) => lenis.raf(tiempo * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  // ---------- arranque ----------

  construir()
  gsap.ticker.add(cuadro)

  let anchoPrevio = window.innerWidth
  let altoPrevio = window.innerHeight
  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    // La barra del navegador del telefono cambia el alto al bajar: eso no rearma nada.
    if (w === anchoPrevio && Math.abs(h - altoPrevio) < 120) return
    anchoPrevio = w
    altoPrevio = h
    construir()
    ScrollTrigger.refresh()
    for (const k of Object.keys(estadoPrevio)) delete estadoPrevio[k]
  })

  // La entrada: la marca y el titular aparecen, el telefono sube a escena y una luz tibia barre
  // desde arriba, donde esta el lente.
  if (!reducido && window.scrollY < 10) {
    gsap.from('.marca-gigante', { opacity: 0, y: 26, scale: 0.97, duration: 1.3, ease: 'power3.out' })
    gsap.from('.titular-entrada', { opacity: 0, y: 34, duration: 1.2, delay: 0.25, ease: 'power3.out' })
    gsap.from(telefonos, { y: 0.45 * L.vh, duration: 1.7, delay: 0.3, ease: 'power3.out' })
    gsap.fromTo(luces.entrada, { '--barrido': '0%' }, { '--barrido': '330%', duration: 2.8, ease: 'power2.inOut', delay: 0.1 })
  }
  doc.classList.add('coreografia')
}
