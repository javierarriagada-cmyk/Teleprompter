/* Demo REAL: Pantalla + Reloj (mismos módulos que usa escenas.js).
   Los datos y el HTML del teléfono vienen embebidos (demo-datos.js / tel-sigo.js)
   para que file:// abra con doble clic sin fetch CORS.
   Hero: lectura con voz. Cómo funciona: scrollytelling sticky de 3 momentos.
   prefers-reduced-motion: tres cuadros quietos, igual de claros. */
import { Pantalla, Reloj } from './pantalla.js'
import datos from './demo-datos.js'
import htmlTel from './tel-sigo.js'

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function subtituloHtml(datos, t) {
  const s = datos.subtitulos.find((x) => t >= x[0] && t < x[1])
  if (!s) return ''
  return s[2]
    .map((r) => `<span class="subtitulo-renglon">${r.map(([w, a, b]) =>
      `<span class="sp" data-estado="${t >= b ? 'dicha' : t >= a ? 'diciendose' : 'por-decir'}">${w}</span>`
    ).join(' ')}</span>`)
    .join('')
}

export async function arrancarDemo() {
  const mount = document.querySelector('[data-tel-mount]')
  if (!mount) return

  mount.innerHTML = htmlTel
  const tel = mount.querySelector('.telefono')
  if (!tel) return
  const rotulo = tel.querySelector('.rotulo')
  if (rotulo) rotulo.hidden = true

  const pantalla = new Pantalla(tel, datos)
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
  await fonts
  // Medir dos veces: tras layout + fuentes
  if (!pantalla.medir()) {
    requestAnimationFrame(() => pantalla.medir())
  }
  pantalla.oyeVoz = true

  const pausa = datos.pausa || [25248, 28121, 49]
  const relojHero = new Reloj(0, Math.min(datos.hastaMs, pausa[0] + 6000), { antes: 700, despues: 1600 })
  const relojHabla = new Reloj(600, pausa[0] - 200, { antes: 400, despues: 1000 })
  const relojEspera = new Reloj(pausa[0], pausa[1], { antes: 200, despues: 1400 })
  const tSub = (datos.subtitulos[2] && datos.subtitulos[2][0]) || 5000
  const relojSubs = new Reloj(tSub, tSub + 10000, { antes: 200, despues: 900 })

  if (reduce()) {
    relojHero.congelar(datos.voz[Math.min(18, datos.voz.length - 1)][0] + 60)
    relojHabla.congelar(datos.voz[Math.min(14, datos.voz.length - 1)][0] + 60)
    relojEspera.congelar(pausa[0] + 900)
    relojSubs.congelar(tSub + 1800)
  }

  const video = tel.querySelector('.video')
  const capaSub = tel.querySelector('.capa-subtitulos')
  const subEl = tel.querySelector('.subtitulo')
  const estiloVideo = tel.querySelector('.video-estilo')
  const frases = [...document.querySelectorAll('[data-como-frase]')]
  const heroCopy = document.querySelector('[data-hero-copy]')
  const comoLeyenda = document.querySelector('[data-como-leyenda]')

  if (estiloVideo && datos.estilos) {
    estiloVideo.dataset.estilo = 'amarillo'
    estiloVideo.textContent = datos.estilos.amarillo || 'Amarillo'
  }
  if (capaSub) capaSub.dataset.estilo = 'amarillo'

  let momento = 'hero'
  let relojActivo = relojHero

  function aplicarModo(m) {
    if (m === momento) return
    momento = m
    const habla = m === 'hero' || m === '0'
    const espera = m === '1'
    const enVideo = m === '2'
    tel.classList.toggle('grabando', habla)
    tel.classList.toggle('espera', espera)
    tel.classList.toggle('es-video', enVideo)
    if (video) video.style.opacity = enVideo ? '1' : '0'
    if (capaSub) capaSub.style.opacity = enVideo ? '1' : ''
    pantalla.oyeVoz = habla || espera
    const siguiente = m === '0' ? relojHabla : m === '1' ? relojEspera : m === '2' ? relojSubs : relojHero
    if (siguiente !== relojActivo) {
      siguiente.reiniciar(performance.now())
      relojActivo = siguiente
    }
    frases.forEach((el) => {
      el.classList.toggle('activa', el.getAttribute('data-como-frase') === String(m))
    })
    if (heroCopy) heroCopy.classList.toggle('fuera', m !== 'hero')
    if (comoLeyenda) comoLeyenda.classList.toggle('visible', m !== 'hero')
  }

  function cuadro(ahora) {
    const { t, alfa, vuelta = 0 } = relojActivo.valor(ahora)
    if (momento === '2') {
      if (subEl) subEl.innerHTML = subtituloHtml(datos, t)
      if (capaSub) capaSub.style.opacity = String(alfa)
    } else {
      pantalla.dibujar(t, ahora)
      if (pantalla.desliza) pantalla.desliza.style.opacity = String(alfa)
    }
    requestAnimationFrame(cuadro)
  }

  const tramos = [...document.querySelectorAll('[data-demo-tramo]')]
  function leerScroll() {
    const vh = window.innerHeight
    let actual = 'hero'
    for (const tr of tramos) {
      const r = tr.getBoundingClientRect()
      // Active when the tramo's top has crossed mid-upper viewport
      if (r.top <= vh * 0.42) actual = tr.getAttribute('data-demo-tramo')
    }
    aplicarModo(actual)
  }

  aplicarModo('hero')
  // Force first paint measuring after layout
  requestAnimationFrame(() => {
    pantalla.medir()
    tel.classList.add('grabando')
    requestAnimationFrame(cuadro)
  })
  window.addEventListener('scroll', leerScroll, { passive: true })
  window.addEventListener('resize', () => { pantalla.medir(); leerScroll() })
  leerScroll()

  window.__sigoDemo = {
    aplicarModo: (m) => { aplicarModo(String(m)); window.scrollTo(0, 0) },
    irA(m) {
      const tr = document.querySelector(`[data-demo-tramo="${m}"]`)
      if (tr) {
        const y = window.scrollY + tr.getBoundingClientRect().top - window.innerHeight * 0.2
        window.scrollTo(0, Math.max(0, y))
        aplicarModo(String(m))
      } else if (m === 'hero') {
        window.scrollTo(0, 0)
        aplicarModo('hero')
      }
    },
    pantalla,
    datos,
    pausa,
  }
}
