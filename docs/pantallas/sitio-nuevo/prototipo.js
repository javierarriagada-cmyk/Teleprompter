/* Prototipo: demo del teléfono, video perezoso y revelados. Sin dependencias. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---- Hero: el texto avanza, espera, y aparecen subtítulos ---- */
  const guion = [
    'Tú hablas.',
    'Sigo te sigue.',
    'El texto avanza contigo',
    'y te espera cuando haces una pausa.',
    'Al terminar,',
    'tu video ya lleva sus subtítulos.'
  ]

  function armarDemo() {
    const tel = document.querySelector('[data-demo-tel]')
    if (!tel) return
    const col = tel.querySelector('[data-demo-columna]')
    const aviso = tel.querySelector('[data-demo-aviso]')
    const subs = tel.querySelector('[data-demo-subs]')
    const subTxt = tel.querySelector('[data-demo-subtxt]')
    if (!col) return

    const palabras = []
    guion.forEach((linea, li) => {
      const p = document.createElement('p')
      p.style.margin = li === 0 ? '0 0 0.55rem' : '0 0 0.55rem'
      linea.split(/\s+/).forEach((w, wi) => {
        const span = document.createElement('span')
        span.textContent = (wi ? ' ' : '') + w
        span.dataset.i = String(palabras.length)
        p.appendChild(span)
        palabras.push(span)
      })
      col.appendChild(p)
    })

    let i = 0
    let paused = false
    let mode = 'leer' // leer | pausa | subs | reset

    function pintar() {
      palabras.forEach((el, idx) => {
        el.classList.toggle('dicha', idx < i)
        el.classList.toggle('viva', idx === i)
      })
      const viva = palabras[Math.min(i, palabras.length - 1)]
      if (viva) {
        const top = viva.offsetTop
        col.style.transform = `translateY(${Math.max(42, 48) - (top / col.parentElement.clientHeight) * 100}%)`
        // Keep viva near mid band
        const mid = col.parentElement.clientHeight * 0.42
        col.style.transform = `translateY(${mid - top}px)`
      }
    }

    function ciclo() {
      if (reduce) {
        i = Math.min(3, palabras.length - 1)
        pintar()
        return
      }
      if (mode === 'leer') {
        tel.classList.add('grabando')
        if (aviso) aviso.classList.remove('on')
        if (subs) subs.classList.remove('on')
        if (i >= palabras.length) {
          mode = 'subs'
          setTimeout(ciclo, 400)
          return
        }
        // Pausa artificial a mitad (después de "pausa.")
        if (i === 12 && !paused) {
          mode = 'pausa'
          paused = true
          setTimeout(ciclo, 200)
          return
        }
        pintar()
        i += 1
        setTimeout(ciclo, 420)
        return
      }
      if (mode === 'pausa') {
        tel.classList.remove('grabando')
        if (aviso) aviso.classList.add('on')
        pintar()
        setTimeout(() => {
          if (aviso) aviso.classList.remove('on')
          mode = 'leer'
          ciclo()
        }, 1600)
        return
      }
      if (mode === 'subs') {
        tel.classList.remove('grabando')
        if (subs) {
          if (subTxt) subTxt.textContent = 'Sigo te sigue.'
          subs.classList.add('on')
        }
        setTimeout(() => {
          mode = 'reset'
          ciclo()
        }, 2200)
        return
      }
      // reset
      if (subs) subs.classList.remove('on')
      i = 0
      paused = false
      mode = 'leer'
      pintar()
      setTimeout(ciclo, 700)
    }

    pintar()
    setTimeout(ciclo, 600)
  }

  /* ---- Video perezoso ---- */
  function armarVideo() {
    const caja = document.querySelector('[data-video]')
    if (!caja) return
    const btn = caja.querySelector('[data-video-play]')
    const poster = caja.querySelector('[data-video-poster]')
    let video = null
    let cargado = false

    function cargar() {
      if (cargado) return Promise.resolve(video)
      cargado = true
      video = document.createElement('video')
      video.setAttribute('playsinline', '')
      video.setAttribute('controls', '')
      video.setAttribute('preload', 'metadata')
      video.src = 'activos/video/sigo-version-google-play-es.mp4'
      video.poster = 'activos/video/poster.jpg'
      caja.insertBefore(video, poster)
      return new Promise((resolve) => {
        video.addEventListener('loadeddata', () => resolve(video), { once: true })
        // file:// may not fire loadeddata promptly
        setTimeout(() => resolve(video), 800)
      })
    }

    async function play() {
      await cargar()
      caja.classList.add('playing')
      try { await video.play() } catch (e) {}
    }

    if (btn) btn.addEventListener('click', play)

    // Carga el source solo al acercarse
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => {
        if (ents.some((e) => e.isIntersecting)) {
          // No descarga el mp4 aún: solo marca cercanía; el click carga.
          io.disconnect()
        }
      }, { rootMargin: '200px' })
      io.observe(caja)
    }
  }

  /* ---- Revelados al scroll ---- */
  function armarRevelados() {
    const nodos = document.querySelectorAll('.revela, .tiempo')
    if (!nodos.length) return
    if (reduce || !('IntersectionObserver' in window)) {
      nodos.forEach((n) => n.classList.add('visible'))
      return
    }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' })
    nodos.forEach((n) => io.observe(n))
  }

  function iniciar() {
    armarDemo()
    armarVideo()
    armarRevelados()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
  else iniciar()
})()
