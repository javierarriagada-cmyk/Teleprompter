// LA FRANJA DE LA INVITACION A PROBAR SIGO -Javier, 07-10-2026-. Solo en la portada.
//
// La franja es un enlace de verdad a #prueba: sin JavaScript salta igual. Esto agrega lo que
// necesita JavaScript:
//   - LA X la cierra POR ESTA VISITA: queda en sessionStorage, y el <script> del <head> de
//     portada.html la esconde antes de pintar si se recarga. En otra visita vuelve.
//   - EL SELECTOR ES · EN baja mientras la franja se ve -estilo.css-; cuando la franja sale de
//     la pantalla, vuelve a su lugar: la clase franja-fuera.
//   - EL FOCO va a la seccion al tocar la franja. El salto mismo, directo y sin recorrer las
//     escenas, lo hace escenas.js con Lenis, o el navegador si no hay Lenis.
// No depende de GSAP ni de las letras: corre apenas esta el documento.

const CLAVE = 'sigo-franja-prueba'

export function iniciarFranja() {
  const franja = document.getElementById('franja-prueba')
  if (!franja) return
  const doc = document.documentElement
  const cerrar = franja.querySelector('.franja-cerrar')
  const enlace = franja.querySelector('a[href="#prueba"]')
  const seccion = document.getElementById('prueba')

  if (cerrar) {
    cerrar.addEventListener('click', () => {
      franja.hidden = true
      doc.classList.add('franja-cerrada')
      try {
        window.sessionStorage.setItem(CLAVE, 'cerrada')
      } catch (error) {
        // NADA FALLA EN SILENCIO: sin sessionStorage -modo privado estricto- la franja se
        // cierra igual, pero vuelve si se recarga la pagina.
        console.warn('Sigo: no se pudo anotar en sessionStorage que la franja se cerro; vuelve al recargar.', error)
      }
      // La pagina subio lo que medía la franja: ScrollTrigger vuelve a medir el escenario.
      if (window.ScrollTrigger) window.ScrollTrigger.refresh()
    })
  }

  if (enlace && seccion) {
    // preventScroll: el foco no mueve nada; el salto lo hace escenas.js o el navegador.
    enlace.addEventListener('click', () => seccion.focus({ preventScroll: true }))
  }

  if ('IntersectionObserver' in window) {
    new window.IntersectionObserver((entradas) => {
      const fuera = !entradas[entradas.length - 1].isIntersecting
      doc.classList.toggle('franja-fuera', fuera)
    }).observe(franja)
  } else {
    console.warn('Sigo: este navegador no tiene IntersectionObserver; el selector de idioma queda bajado mientras la franja exista.')
  }
}
