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
//
// CORRECCION DEL 27-09-2026, revisada en un telefono de 390 px: tramos mas cortos -8,5
// pantallas, eran 10,9-, sin tiempos muertos: el texto de una escena entra mientras sale el de
// la anterior, y en cada tramo algo se mueve. Cada capitulo cambia el entorno -su luz- y algo
// del telefono -pose, pantalla-. En el celular el telefono es mas grande.

import { Pantalla, Reloj } from './pantalla.js'
import { Onda } from './onda.js'

// [escena, desde, hasta, mejor cuadro -el que se muestra quieto con movimiento reducido-]
const ESCENAS = [
  [0, 0, 0.45, 0],
  [1, 0.45, 1.55, 1.3],
  [2, 1.55, 3.05, 2.7],
  [3, 3.05, 4.3, 4.2],
  [4, 4.3, 5.6, 4.85],
  [5, 5.6, 7.25, 6.1],
  [6, 7.25, 8.5, 8.3]
]
const TOTAL = 8.5
// Donde deja el scroll cada capitulo de la pildora.
const CAPITULOS = { 1: 1.1, 2: 2.35, 3: 4.1, 4: 4.8, 5: 6.1, 6: 8.2 }
// Los formatos se pintan en E3, uno tras otro, y quedan.
const PINTA = [['negrita', 3.35], ['ambar', 3.5], ['celeste', 3.65], ['salvia', 3.8], ['destacado', 3.95]]
const GRABA = [5.0, 5.65]
const LENTE = [4.55, 5.0]
const VIDEO = [5.75, 7.3]
const ESTILOS = [['amarillo', 5.6], ['rojo', 6.3], ['formal', 6.8]]
// Sin internet: las cuatro barras se apagan de a una, despues el wifi, despues el avion.
const SIN_INTERNET = 7.4
const SENAL = [7.5, 7.6, 7.7, 7.8]
const SIN_WIFI = 7.9
const AVION = 8.0

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
  const tactil = window.matchMedia('(pointer: coarse)').matches
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
  const estiloVideo = $('.video-estilo', telSigo)
  const barraVideo = $('.video-barra i', telSigo)
  const tiempoVideo = $('.video-tiempo', telSigo)
  const totalVideo = $('.video-total', telSigo)
  const barras = [...$$('.senal i', telSigo), ...$$('.senal-grande i', telSigo)]
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
    // Solo en espacios comunes: un &nbsp; -"It&nbsp;follows"- deja juntas las palabras que no deben
    // quedar solas en un renglon.
    h.innerHTML = h.textContent.trim().split(/[ \t\n]+/).map((w) => `<span class="p">${w}</span>`).join(' ')
  })

  // Los relojes. La lectura entera da vueltas. E2 da vueltas sobre la pausa de pensar: dos
  // segundos antes -que la pausa llegue enseguida-, la pausa, y un poco despues. E3 sobre el
  // comienzo, donde estan los formatos. E5 sobre el primer parrafo, que se habla sin pausas
  // largas: siempre hay un subtitulo en pantalla.
  const relojLectura = new Reloj(0, datos.hastaMs, { antes: 700, despues: 2600 })
  const pausa = datos.pausa || [datos.hastaMs / 2, datos.hastaMs / 2 + 2000, 0]
  const relojE2 = new Reloj(pausa[0] - 2400, pausa[1] + 2600, { antes: 200, despues: 1400 })
  comun.ponerFijo(relojE2.desde)
  const relojE3 = new Reloj(0, 9500, { antes: 500, despues: 1800 })
  const relojE5 = new Reloj(300, 16500, { antes: 200, despues: 900 })
  // La frase que tocaba decir despues de la pausa: hasta el primer punto.
  const fraseTocaba = (() => {
    const desde = pausa[2] + 1
    let hasta = desde
    const palabras = $$('.columna [data-token]', telComun)
    while (hasta < palabras.length && !/[.?!]$/.test(palabras[hasta].textContent)) hasta++
    return [desde, Math.min(palabras.length, hasta + 1)]
  })()
  if (reducido) {
    // Quieto en su mejor cuadro: la lectura en "Sin apuro", con el destacado a la vista; E2 al
    // final de la pausa, cuando el comun ya se llevo la frase.
    const k = Math.min(datos.voz.length - 1, 25)
    relojLectura.congelar(datos.voz[k][0] + 120)
    relojE2.congelar(pausa[1] - 150)
    relojE3.congelar(6200)
    relojE5.congelar(datos.voz[Math.min(datos.voz.length - 1, 9)][0] + 100)
  }
  totalVideo.textContent = reloj2texto(relojE5.hasta)

  // ---------- las posiciones del telefono en cada escena ----------

  let L = null
  function medidas() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const movil = vw < 900
    const E = {}
    if (movil) {
      // EL TELEFONO GRANDE: tres cuartos del alto. El texto de la escena va arriba, compacto, y
      // la pildora flota sobre el borde de abajo del telefono.
      const s = Math.min((0.7 * vh) / 800, (0.84 * vw) / 380)
      const cy = 0.265 * vh + 400 * s
      E.e0 = { x: 0, y: 0.62 * vh + 400 * s - vh / 2, rotationX: 26, rotationY: 0, rotationZ: 0, scale: s * 0.92 }
      E.e1 = { x: 0.1 * vw, y: cy - vh / 2, rotationX: 0, rotationY: -10, rotationZ: 0, scale: s }
      E.e3 = { x: 0, y: cy - vh / 2 + 0.01 * vh, rotationX: 0, rotationY: 7, rotationZ: -1.5, scale: s * 1.02 }
      // En E2 los dos telefonos van derechos, sin giro: el comun mueve su texto en cada cuadro,
      // y dentro de un telefono girado en 3D ese texto se vuelve a dibujar entero cada vez
      // -medido en un telefono de gama media simulado: 22 a 33 cuadros largos de 99 con giro,
      // 9 a 14 sin el-.
      const s2 = Math.min((0.46 * vw) / 380, (0.42 * vh) / 800)
      const cy2 = 0.36 * vh + 400 * s2
      E.e2sigo = { x: 0.24 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s2 }
      E.e2comun = { x: -0.24 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s2 }
      E.ondaE2 = { y: cy2 + 400 * s2 + 64, medio: 190 * s2 }
      const sz = s * 1.4
      E.e4zoom = { x: 0, y: 0.38 * vh - 22 * sz + 400 * sz - vh / 2, rotationX: 30, rotationY: -10, rotationZ: 0, scale: sz }
      E.e4graba = { x: 0, y: cy - vh / 2, rotationX: 0, rotationY: -5, rotationZ: 0, scale: s }
      const sv = Math.min((0.6 * vh) / 780, (0.86 * vw) / 360)
      E.e5 = { x: 0, y: 0.305 * vh + 390 * sv - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: sv }
      E.e6 = { x: 0, y: cy - vh / 2, rotationX: 8, rotationY: 0, rotationZ: 0, scale: s }
      E.espera2Y = cy2 - 400 * s2 - 52
      E.s = s
    } else {
      const s = Math.min((0.82 * vh) / 800, 1)
      const xR = 0.19 * vw
      E.e0 = { x: 0, y: 0.72 * vh + 400 * s - vh / 2, rotationX: 28, rotationY: 0, rotationZ: 0, scale: s * 0.98 }
      E.e1 = { x: xR, y: 0.01 * vh, rotationX: 4, rotationY: -12, rotationZ: 0, scale: s }
      E.e3 = { x: xR * 0.95, y: 0, rotationX: 0, rotationY: 9, rotationZ: -1.5, scale: s * 1.03 }
      const s2 = Math.min((0.46 * vh) / 800, (0.27 * vw) / 380)
      const cy2 = 0.3 * vh + 400 * s2
      E.e2sigo = { x: 0.15 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s2 }
      E.e2comun = { x: -0.15 * vw, y: cy2 - vh / 2, rotationX: 0, rotationY: 0, rotationZ: 0, scale: s2 }
      E.ondaE2 = { y: cy2 + 400 * s2 + 88, medio: 190 * s2 }
      const sz = s * 1.75
      E.e4zoom = { x: xR * 0.7, y: 0.3 * vh - 22 * sz + 400 * sz - vh / 2, rotationX: 30, rotationY: -22, rotationZ: 0, scale: sz }
      E.e4graba = { x: xR, y: 0, rotationX: 0, rotationY: -8, rotationZ: 0, scale: s }
      const sv = Math.min((0.88 * vh) / 780, 1.25)
      E.e5 = { x: xR, y: 0, rotationX: 0, rotationY: -4, rotationZ: 0, scale: sv }
      E.e6 = { x: xR, y: 0.02 * vh, rotationX: 10, rotationY: -14, rotationZ: 0, scale: s }
      E.s = s
    }
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
    const x = L.movil ? '50%' : '69%'
    for (const l of ['tibia', 'color', 'cine', 'noche']) luces[l].style.setProperty('--luz-x', x)
    luces.lente.style.setProperty('--luz-x', L.movil ? '50%' : '62%')
    luces.duelo.style.setProperty('--izq', `${50 - (L.movil ? 24 : 15)}%`)
    luces.duelo.style.setProperty('--der', `${50 + (L.movil ? 24 : 15)}%`)

    const facil = 'power2.inOut'
    tl = gsap.timeline({ paused: true, defaults: { ease: facil } })
    gsap.set(telSigo, { ...L.e0, transformPerspective: 0 })
    gsap.set(telComun, { ...L.e2comun, x: L.e2comun.x - 0.3 * L.vw, autoAlpha: 0 })
    gsap.set(Object.values(textos), { autoAlpha: 0 })
    gsap.set(entrada, { autoAlpha: 1, y: 0, scale: 1 })
    gsap.set([luces.tibia, luces.duelo, luces.color, luces.lente, luces.cine, luces.noche], { opacity: 0 })
    gsap.set(luces.entrada, { opacity: 1 })
    gsap.set([pildora, canvas, haz, video], { autoAlpha: 0 })
    gsap.set('.rotulo', { opacity: 0 })

    // Cada texto entra mientras sale el anterior: no queda pantalla vacia entre escenas.
    const sale = (el, t) => tl.to(el, { autoAlpha: 0, y: -24, duration: 0.2, ease: 'power1.in' }, t)
    const entra = (el, t) => tl.fromTo(el, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, t)

    // E0 -> E1: el telefono sube y endereza; el titular se arma
    tl.to(entrada, { autoAlpha: 0, y: -0.14 * L.vh, scale: 0.94, duration: 0.4, ease: 'power1.in' }, 0.02)
    tl.to(telSigo, { ...L.e1, duration: 0.6 }, 0)
    tl.to(luces.entrada, { opacity: 0, duration: 0.5 }, 0.1)
    tl.to(luces.tibia, { opacity: 1, duration: 0.5 }, 0.15)
    tl.to(pildora, { autoAlpha: 1, duration: 0.2 }, 0.4)
    tl.set(textos[1], { autoAlpha: 1 }, 0.4)
    tl.fromTo($$('.p', textos[1]), { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.22, ease: 'power2.out' }, 0.42)
    tl.fromTo($('.bajada', textos[1]), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.22 }, 0.72)
    tl.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.5)

    // E1 -> E2: aparece el comun al lado; la luz se parte en fria y tibia
    sale(textos[1], 1.5)
    tl.to(canvas, { autoAlpha: 0, duration: 0.12 }, 1.5)
    tl.to(telSigo, { ...L.e2sigo, duration: 0.45 }, 1.5)
    tl.to(telComun, { ...L.e2comun, autoAlpha: 1, duration: 0.45 }, 1.5)
    tl.to(luces.tibia, { opacity: 0, duration: 0.3 }, 1.5)
    tl.to(luces.duelo, { opacity: 1, duration: 0.35 }, 1.55)
    tl.to('.rotulo', { opacity: 1, duration: 0.2 }, 1.85)
    entra(textos[2], 1.62)
    tl.to(canvas, { autoAlpha: 1, duration: 0.2 }, 1.9)

    // E2 -> E3: se va el comun; los colores del guion encienden la luz
    sale(textos[2], 3.0)
    tl.to(canvas, { autoAlpha: 0, duration: 0.12 }, 3.0)
    tl.to('.rotulo', { opacity: 0, duration: 0.12 }, 3.0)
    tl.to(telComun, { autoAlpha: 0, x: L.e2comun.x - 0.3 * L.vw, duration: 0.35 }, 3.0)
    tl.to(telSigo, { ...L.e3, duration: 0.4 }, 3.0)
    tl.to(luces.duelo, { opacity: 0, duration: 0.3 }, 3.0)
    tl.to(luces.color, { opacity: 1, duration: 0.5 }, 3.1)
    entra(textos[3], 3.12)

    // E3 -> E4: gira hasta mostrar el lente, el haz, y despues grabando
    sale(textos[3], 4.28)
    tl.to(luces.color, { opacity: 0, duration: 0.3 }, 4.28)
    tl.to(luces.lente, { opacity: 1, duration: 0.3 }, 4.32)
    tl.to(telSigo, { ...L.e4zoom, duration: 0.45 }, 4.28)
    entra(textos[4], 4.36)
    tl.to(haz, { autoAlpha: 1, duration: 0.15 }, 4.58)
    tl.to(haz, { autoAlpha: 0, duration: 0.12 }, 4.98)
    tl.to(telSigo, { ...L.e4graba, duration: 0.4 }, 4.95)

    // E4 -> E5: el telefono pierde el marco y se vuelve el video, grande
    sale(textos[4], 5.58)
    tl.to(luces.lente, { opacity: 0, duration: 0.3 }, 5.58)
    tl.to(luces.cine, { opacity: 1, duration: 0.35 }, 5.6)
    tl.to(telSigo, { ...L.e5, duration: 0.45 }, 5.58)
    tl.to(video, { autoAlpha: 1, duration: 0.2 }, 5.72)
    entra(textos[5], 5.66)

    // E5 -> E6: vuelve el marco; se va la senal
    sale(textos[5], 7.22)
    tl.to(video, { autoAlpha: 0, duration: 0.15 }, 7.22)
    tl.to(luces.cine, { opacity: 0, duration: 0.3 }, 7.22)
    tl.to(luces.noche, { opacity: 1, duration: 0.35 }, 7.25)
    tl.to(telSigo, { ...L.e6, duration: 0.4 }, 7.22)
    entra(textos[6], 7.3)
    tl.to(pildora, { autoAlpha: 0, duration: 0.15 }, TOTAL - 0.15)
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

  // ---------- cada cuadro ----------

  const estadoPrevio = {}
  function cambia(clave, valor) {
    if (estadoPrevio[clave] === valor) return false
    estadoPrevio[clave] = valor
    return true
  }
  const alternar = (el, clase, si, clave = clase) => { if (cambia(clave, si)) el.classList.toggle(clase, si) }

  let relojActivo = null
  let vueltaPrevia = -1

  function cuadro() {
    const ahora = performance.now()
    const p = tl.time()
    // Pasado el escenario -el cierre a la vista-, no se dibuja nada.
    if (!disparador.isActive && disparador.progress >= 1) return
    const esc = escenaEn(p)

    // Los formatos, grabando, el lente, el video, la senal.
    for (const [f, desde] of PINTA) alternar(telSigo, `pinta-${f}`, p >= desde)
    alternar(telSigo, 'grabando', p >= GRABA[0] && p < GRABA[1])
    alternar(telSigo, 'ilumina-lente', p >= LENTE[0] && p < LENTE[1])
    alternar(telSigo, 'es-video', p >= VIDEO[0] - 0.1 && p < VIDEO[1])
    alternar(telSigo, 'sin-internet', p >= SIN_INTERNET)
    barras.forEach((b, i) => { const off = p >= SENAL[i % 4]; if (cambia(`senal${i}`, off)) b.classList.toggle('apagada', off) })
    alternar(telSigo, 'sin-wifi', p >= SIN_WIFI)
    alternar(telSigo, 'avion', p >= AVION)
    alternar(telSigo, 'oye-voz', esc === 1)
    sigo.oyeVoz = esc === 1
    let estilo = ESTILOS[0][0]
    for (const [e, desde] of ESTILOS) if (p >= desde) estilo = e
    if (cambia('estilo', estilo)) {
      capaSub.dataset.estilo = estilo
      estiloVideo.dataset.estilo = estilo
      // El nombre del estilo en el idioma de la pagina: viene en el JSON, de textos/<idioma>.js.
      estiloVideo.textContent = datos.estilos[estilo]
      // El estilo nuevo se anuncia: la etiqueta late una vez.
      estiloVideo.classList.add('cambio')
      setTimeout(() => estiloVideo.classList.remove('cambio'), 260)
      estilosSub.forEach((s) => s.classList.toggle('activo', s.dataset.estilo === estilo))
      estadoPrevio.sub = ''
    }
    const cap = esc >= 1 ? esc : 0
    if (cambia('capitulo', cap)) ponerCapitulo(cap)

    // La lectura: cada escena con su reloj -ver arriba-.
    const enE2 = p >= 1.6 && p < 3.05
    const enE3 = p >= 3.05 && p < 4.3
    const enE5 = p >= 5.6 && p < 7.3
    const reloj = enE2 ? relojE2 : enE3 ? relojE3 : enE5 ? relojE5 : relojLectura
    let deGolpe = false
    if (reloj !== relojActivo) {
      if (reloj !== relojLectura) reloj.reiniciar(ahora)
      relojActivo = reloj
      deGolpe = true
      vueltaPrevia = -1
    }
    const { t, alfa, vuelta = 0 } = reloj.valor(ahora)
    if (vuelta !== vueltaPrevia) { deGolpe = true; vueltaPrevia = vuelta }
    const a = alfa.toFixed(2)
    if (cambia('alfa', a)) { sigo.desliza.style.opacity = a; comun.desliza.style.opacity = a }
    sigo.dibujar(t, ahora, deGolpe)
    if (p > 1.5 && p < 3.4) {
      comun.dibujar(t, ahora, deGolpe)
      ponerPausa(t, deGolpe)
    } else if (cambia('fueraE2', true)) {
      ponerPausa(-1, true)
    }
    if (p > 1.5 && p < 3.4) estadoPrevio.fueraE2 = false

    // La onda
    const alfaOnda = +gsap.getProperty(canvas, 'opacity')
    if (alfaOnda > 0.01) {
      if (esc <= 1) {
        const x = L.vw / 2 + gsap.getProperty(telSigo, 'x') - 190 * gsap.getProperty(telSigo, 'scale')
        const y = L.vh / 2 + gsap.getProperty(telSigo, 'y') + (86 - 400) * gsap.getProperty(telSigo, 'scale')
        onda.dibujar(t, { x, y, alto: L.movil ? 50 : 78, izquierda: x })
      } else {
        // E2: una onda bajo cada telefono, con su "ahora" al centro. Es la misma voz: cuando se
        // aplana, se aplana bajo los dos a la vez.
        const { y, medio } = L.ondaE2
        const alto = L.movil ? 40 : 60
        let primero = true
        for (const tel of [telComun, telSigo]) {
          const cx = L.vw / 2 + gsap.getProperty(tel, 'x')
          onda.dibujar(t, { x: cx, y, alto, izquierda: medio, pasado: medio, tramo: [cx - medio, cx + medio], limpiar: primero, marca: true })
          primero = false
        }
      }
      estadoPrevio.ondaLimpia = false
    } else if (!estadoPrevio.ondaLimpia) {
      onda.dibujar(0, { x: 0, y: 0, alto: 0, alfa: 0 })
      estadoPrevio.ondaLimpia = true
    }

    // Los subtitulos: en el video, con su reloj.
    if (p >= VIDEO[0] - 0.3 && p < VIDEO[1]) ponerSubtitulo(t)

    ponerTarjetas(p, esc, t)
  }

  // ---------- E2: lo que pasa en la pausa ----------

  // En el comun, la frase que tocaba decir llega a su marca antes que la voz: se tacha y sube.
  // En Sigo, "Te espera" con el punto rojo que respira mientras la voz calla.
  let escapadas = new Set()
  function ponerPausa(t, deGolpe) {
    const enPausa = t >= pausa[0] + 150 && t < pausa[1]
    alternar(telSigo, 'espera', enPausa)
    if (deGolpe || t < pausa[0]) {
      for (const i of escapadas) comun.palabras[i].classList.remove('escapa')
      escapadas = new Set()
    }
    if (t >= pausa[0]) {
      for (const i of comun.adelantadas(fraseTocaba[0], fraseTocaba[1], t)) {
        if (!escapadas.has(i)) { escapadas.add(i); comun.palabras[i].classList.add('escapa') }
      }
    }
    alternar(telComun, 'se-escapa', escapadas.size > 0 && t < pausa[1] + 1800)
  }

  // ---------- subtitulos ----------

  function reloj2texto(ms) {
    const s = Math.max(0, Math.floor(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  function ponerSubtitulo(t) {
    const s = datos.subtitulos.find((x) => t >= x[0] && t < x[1])
    let html = ''
    if (s) {
      html = s[2].map((r) => `<span class="subtitulo-renglon">${r.map(([w, a, b]) => `<span class="sp" data-estado="${t >= b ? 'dicha' : t >= a ? 'diciendose' : 'por-decir'}">${w}</span>`).join(' ')}</span>`).join('')
    }
    if (cambia('sub', html)) subEl.innerHTML = html
    barraVideo.style.width = `${Math.min(100, (100 * Math.max(0, t)) / relojE5.hasta)}%`
    const tt = reloj2texto(t)
    if (cambia('tiempoVideo', tt)) tiempoVideo.textContent = tt
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
    // En el celular los avisos de E2 ya van dentro de cada pantalla: sin tarjetas encima.
    if (esc === 2 && p > 1.9 && enPausa && !L.movil) { v.add('espera'); v.add('corre') }
    if (esc === 3) {
      const pintados = PINTA.filter(([, d]) => p >= d).map(([f]) => f)
      if (L.movil) { if (pintados.length) v.add(pintados[pintados.length - 1]) } else pintados.forEach((f) => v.add(f))
    }
    if (p >= LENTE[0] && p < LENTE[1]) v.add('lente')
    if (p >= GRABA[0] + 0.05 && p < GRABA[1] - 0.1) v.add('camara')
    if (p >= AVION && p < TOTAL && !L.movil) v.add('avion')
    return v
  }

  function ponerTarjetas(p, esc, t) {
    const v = tarjetasVisibles(p, esc, t)
    for (const [nombre, el] of Object.entries(tarjetas)) {
      const ver = v.has(nombre)
      if (cambia(`tarjeta-${nombre}`, ver)) gsap.to(el, { autoAlpha: ver ? 1 : 0, duration: reducido ? 0 : 0.3, overwrite: 'auto' })
      if (!ver && +gsap.getProperty(el, 'opacity') < 0.01) continue
      const lugar = LUGARES[nombre]
      const tel = lugar.telefono === 'comun' ? telComun : telSigo
      const s = gsap.getProperty(tel, 'scale')
      const cx = L.vw / 2 + gsap.getProperty(tel, 'x')
      const cy = L.vh / 2 + gsap.getProperty(tel, 'y')
      let x
      let y
      if (L.movil) {
        // En un telefono no hay costados: van centradas, sobre la parte de abajo del telefono.
        x = L.vw / 2 - el.offsetWidth / 2
        y = esc === 2 ? L.espera2Y : Math.min(L.vh - 120, cy + 270 * s)
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
    if (lenis) lenis.scrollTo(y, { duration: 1.2 })
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
