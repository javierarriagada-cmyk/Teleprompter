/* Prototipo: video perezoso, franja de prueba y revelados bajo el escenario.
   La demo del teléfono es la real: demo-real/demo.js → escenas.js. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function armarFranja() {
    const franja = document.getElementById('franja-prueba')
    if (!franja) return
    const doc = document.documentElement
    const cerrar = franja.querySelector('.franja-cerrar')
    const enlace = franja.querySelector('a[href="#prueba"]')
    const seccion = document.getElementById('prueba')
    const CLAVE = 'sigo-franja-prueba'

    if (cerrar) {
      cerrar.addEventListener('click', () => {
        franja.hidden = true
        doc.classList.add('franja-cerrada')
        try { window.sessionStorage.setItem(CLAVE, 'cerrada') } catch (e) {}
        if (window.ScrollTrigger) window.ScrollTrigger.refresh()
      })
    }
    if (enlace && seccion) {
      enlace.addEventListener('click', () => seccion.focus({ preventScroll: true }))
    }
    if ('IntersectionObserver' in window) {
      new window.IntersectionObserver((entradas) => {
        const fuera = !entradas[entradas.length - 1].isIntersecting
        doc.classList.toggle('franja-fuera', fuera)
      }).observe(franja)
    }
  }

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
      video.src = 'activos/video/sigo-version-google-play-es.mp4'
      video.poster = 'activos/video/poster.webp'
      caja.insertBefore(video, poster)
      return new Promise((resolve) => {
        video.addEventListener('loadeddata', () => resolve(video), { once: true })
        setTimeout(() => resolve(video), 800)
      })
    }

    async function play() {
      await cargar()
      caja.classList.add('is-playing')
      try { await video.play() } catch (e) {}
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

  function iniciar() {
    armarFranja()
    armarVideo()
    armarRevelados()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
  else iniciar()
})()
