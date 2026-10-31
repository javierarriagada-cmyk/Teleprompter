/* Prototipo: video perezoso y revelados. La demo del teléfono vive en demo-real/arrancar.js. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
        setTimeout(() => resolve(video), 800)
      })
    }

    async function play() {
      await cargar()
      caja.classList.add('playing')
      try { await video.play() } catch (e) {}
    }

    if (btn) btn.addEventListener('click', play)
  }

  function armarRevelados() {
    const nodos = document.querySelectorAll('.revela')
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
    armarVideo()
    armarRevelados()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
  else iniciar()
})()
