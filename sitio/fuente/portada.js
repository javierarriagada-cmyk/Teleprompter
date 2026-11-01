// Video, revelados y galería aprobados: se inicializan también si no hay demo, sin código de la app.
export function iniciarPortada() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function armarVideo() {
    const marco = document.querySelector('[data-video]')
    if (!marco) return
    const caja = marco.querySelector('.video-caja') || marco
    const btn = marco.querySelector('[data-video-play]')
    const poster = marco.querySelector('[data-video-poster]')
    let video = null
    let cargado = false

    function cargar() {
      if (cargado) return Promise.resolve(video)
      cargado = true
      video = document.createElement('video')
      video.setAttribute('playsinline', '')
      video.setAttribute('controls', '')
      video.setAttribute('preload', 'metadata')
      video.src = marco.dataset.archivo
      video.poster = poster.src
      caja.insertBefore(video, poster)
      return new Promise((resolve) => {
        video.addEventListener('loadeddata', () => resolve(video), { once: true })
        setTimeout(() => resolve(video), 800)
      })
    }

    async function play() {
      await cargar()
      caja.classList.add('is-playing')
      try { await video.play() } catch (error) { console.warn('Sigo: no se pudo reproducir el video.', error); caja.classList.remove('is-playing') }
    }

    if (btn) btn.addEventListener('click', play)
  }

  function armarRevelados() {
    const nodos = document.querySelectorAll('.revela')
    if (!nodos.length) return
    if (reduce || !('IntersectionObserver' in window)) {
      nodos.forEach((n) => n.classList.add('revelado'))
      return
    }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('revelado')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' })
    nodos.forEach((n) => io.observe(n))
  }


  function armarGaleria() {
    const root = document.querySelector('[data-galeria]')
    if (!root) return
    const pista = root.querySelector('[data-galeria-pista]')
    const puntos = root.querySelector('[data-galeria-puntos]')
    const contador = root.querySelector('[data-galeria-contador] [data-gal-n]')
    if (!pista || !puntos) return
    const slides = [...pista.querySelectorAll('.g-slide')]
    if (!slides.length) return

    puntos.replaceChildren()
    slides.forEach((_, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('role', 'tab')
      b.setAttribute('aria-label', root.dataset.etiqueta.replace('{n}', String(i + 1)).replace('{total}', String(slides.length)))
      if (i === 0) b.setAttribute('aria-current', 'true')
      b.addEventListener('click', () => {
        slides[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      })
      puntos.appendChild(b)
    })

    const bots = () => [...puntos.querySelectorAll('button')]
    function activo() {
      const mid = pista.scrollLeft + pista.clientWidth / 2
      let best = 0, bestDist = Infinity
      slides.forEach((s, i) => {
        const c = s.offsetLeft + s.offsetWidth / 2
        const d = Math.abs(c - mid)
        if (d < bestDist) { bestDist = d; best = i }
      })
      bots().forEach((b, i) => {
        if (i === best) b.setAttribute('aria-current', 'true')
        else b.removeAttribute('aria-current')
      })
      if (contador) contador.textContent = String(best + 1)
    }
    pista.addEventListener('scroll', () => {
      window.requestAnimationFrame(activo)
    }, { passive: true })
    activo()
  }


  armarVideo()
  armarRevelados()
  armarGaleria()
}
