// LA PANTALLA DE LECTURA DE SIGO, EN LA PORTADA: EL QUE DIBUJA. 27-09-2026, docs/el-sitio.md.
//
// ESTE ARCHIVO SE PUBLICA, Y TODO JAVASCRIPT PUBLICADO SE PUEDE LEER. Por eso aca no hay nada
// del motor ni de la pantalla de lectura de la aplicacion -Javier, 27-09-2026: "la pagina no
// debe incluir ni copiar la logica del motor"-: ni el seguidor, ni el avance, ni la
// conduccion, ni el destacado, ni copias reescritas. No importa nada de src/.
//
// La palabra destacada ya viene decidida en el JSON que arma sitio/fuente/lectura.js al
// armar el sitio: cada cuadro es [milisegundo de la toma, numero de la palabra], y
// palabrasDestacadas dice cuantas palabras lleva la linea, contando desde esa.
//
// Aca solo se hace lo que hace cualquier pagina con un texto: medir donde quedo esa palabra en
// esta pantalla, subir su renglon hasta arriba con una transicion suave cualquiera, y poner la
// linea bajo las palabras, contra el reloj.

const MS_ANTES = 900        // quieta antes de empezar
const MS_AL_TERMINAR = 2800 // en el ultimo cuadro antes de volver a empezar
const MS_FUNDIDO = 450      // la vuelta se funde: subir el texto de golpe se leeria como un defecto
const MS_SUBIR = 320        // lo que tarda el texto en subir un renglon
const MS_LINEA = 240        // lo que tarda la linea en ir de un lugar al otro
// Con movimiento reducido se muestra quieta en este punto de la lectura: con el destacado a la
// vista y el texto ya desplazado.
const FRACCION_QUIETA = 0.62

function iniciar() {
  const raiz = document.getElementById('demo')
  const datosEl = document.getElementById('demo-datos')
  if (!raiz || !datosEl) return
  const datos = JSON.parse(datosEl.textContent)
  const pantalla = raiz.querySelector('.pantalla')
  const lienzo = raiz.querySelector('.lienzo')
  const cont = raiz.querySelector('.contenedor-lectura')
  const capa = raiz.querySelector('.capa-destacado')
  const botonPausa = raiz.querySelector('[data-control="pausa"]')
  const botonSonido = raiz.querySelector('[data-control="sonido"]')
  const audio = raiz.querySelector('audio')
  const cuadros = datos.cuadros
  const hastaMs = datos.hastaMs
  const palabras = Array.from(cont.querySelectorAll('[data-token]'))
  const reducido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }

  let escala = 1
  // La subida del texto: desde donde, hasta donde y cuando empezo.
  let subida = null
  let dibujado = ''
  let lineas = [] // { el, renglon }: una por renglon que toca el destacado

  // EL RELOJ. t es el milisegundo de la toma. Sin sonido lo lleva performance.now(); con
  // sonido, el audio: si el audio se atrasa, el texto lo espera.
  let t = -MS_ANTES
  let tRelojBase = null
  let corriendo = false
  // Hasta medir con la letra verdadera no corre el reloj: la lectura empezaria sin verse.
  let lista = false
  let pausadoPorUsuario = false
  let pausadoPorVista = false
  let fase = 'lectura' // 'lectura' | 'final' | 'fundido'
  let tFase = 0
  let unaVuelta = false
  let conSonido = false
  let raf = 0

  // ---------- el tamano ----------

  // El lienzo mide siempre lo mismo de ancho -lo fija la hoja: .lienzo, 360 px- y se
  // escala para llenar el marco: los renglones cortan igual en cualquier pantalla.
  function medir() {
    const ancho = pantalla.clientWidth
    const alto = pantalla.clientHeight - parseFloat(getComputedStyle(pantalla).paddingTop)
    if (!ancho || alto <= 0 || !palabras.length) return false
    escala = ancho / lienzo.offsetWidth
    const altoLienzo = alto / escala
    lienzo.style.height = `${altoLienzo}px`
    lienzo.style.transform = escala === 1 ? 'none' : `scale(${escala})`
    // Que el ultimo renglon pueda subir hasta arriba.
    cont.style.paddingBottom = `${Math.max(0, altoLienzo - palabras[palabras.length - 1].offsetHeight)}px`
    subida = null
    dibujado = ''
    return true
  }

  // ---------- el registro ----------

  function cuadroEn(tMs) {
    if (tMs < cuadros[0][0]) return cuadros[0]
    let lo = 0
    let hi = cuadros.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (cuadros[mid][0] <= tMs) lo = mid
      else hi = mid - 1
    }
    return cuadros[lo]
  }

  function tomaQuieta() {
    const objetivo = hastaMs * FRACCION_QUIETA
    for (const c of cuadros) if (c[0] >= objetivo) return c[0]
    return cuadros[cuadros.length - 1][0]
  }

  // ---------- dibujar ----------

  function dibujar(tMs, ahora, deGolpe) {
    const desde = cuadroEn(tMs)[1]
    const hasta = Math.min(palabras.length, desde + datos.palabrasDestacadas)

    // El renglon de la palabra destacada, arriba del todo. Si cambia a mitad de una subida, la
    // nueva parte desde donde va: nunca salta.
    const objetivo = Math.max(0, palabras[Math.min(desde, palabras.length - 1)].offsetTop)
    if (deGolpe || subida === null) {
      subida = { desde: objetivo, hasta: objetivo, t0: ahora }
    } else if (objetivo !== subida.hasta) {
      subida = { desde: cont.scrollTop, hasta: objetivo, t0: ahora }
    }
    const x = Math.min(1, (ahora - subida.t0) / MS_SUBIR)
    const suave = 1 - Math.pow(1 - x, 3)
    cont.scrollTop = subida.desde + (subida.hasta - subida.desde) * suave

    const clave = `${desde}|${hasta}`
    if (clave === dibujado && !deGolpe) return
    dibujado = clave
    ponerLinea(tramosDe(desde, hasta), deGolpe)
  }

  // Donde quedaron las palabras desde..hasta en esta pantalla, un tramo por renglon. Las
  // palabras de cada parrafo se envuelven un instante en un <span> sin estilo -no mueve ni un
  // pixel- y el navegador devuelve sus cajas, espacios incluidos: Chrome da una por palabra y
  // una por espacio, asi que las que estan a la misma altura se juntan en un tramo.
  function tramosDe(desde, hasta) {
    const origen = cont.getBoundingClientRect()
    const tramos = []
    let i = desde
    while (i < hasta && i < palabras.length) {
      const parrafo = palabras[i].parentNode
      let j = i
      while (j + 1 < hasta && j + 1 < palabras.length && palabras[j + 1].parentNode === parrafo) j++
      const envoltura = document.createElement('span')
      parrafo.insertBefore(envoltura, palabras[i])
      let nodo = palabras[i]
      while (nodo) {
        const siguiente = nodo.nextSibling
        envoltura.appendChild(nodo)
        if (nodo === palabras[j]) break
        nodo = siguiente
      }
      for (const caja of envoltura.getClientRects()) {
        if (!caja.width) continue
        const izquierda = (caja.left - origen.left) / escala
        const derecha = (caja.right - origen.left) / escala
        const arriba = (caja.top - origen.top) / escala + cont.scrollTop
        const alto = caja.height / escala
        const mismo = tramos.find((x) => Math.abs(x.arriba - arriba) < alto / 2)
        if (mismo) {
          const der = Math.max(mismo.izquierda + mismo.ancho, derecha)
          mismo.izquierda = Math.min(mismo.izquierda, izquierda)
          mismo.ancho = der - mismo.izquierda
        } else {
          tramos.push({ izquierda, arriba, ancho: derecha - izquierda, alto })
        }
      }
      while (envoltura.firstChild) parrafo.insertBefore(envoltura.firstChild, envoltura)
      envoltura.remove()
      i = j + 1
    }
    return tramos
  }

  // La linea bajo las palabras. Cada tramo sigue en su renglon: el del renglon nuevo nace desde
  // su comienzo y se alarga, y el del renglon que se deja se encoge hacia su final y se apaga.
  // El grosor y el aire a los lados los pone la hoja -.linea-destacado-; aca solo el lugar.
  function ponerLinea(tramos, deGolpe) {
    const mover = deGolpe || reducido.matches
      ? 'none'
      : `left ${MS_LINEA}ms cubic-bezier(0.2, 0.8, 0.2, 1), top ${MS_LINEA}ms cubic-bezier(0.2, 0.8, 0.2, 1), width ${MS_LINEA}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease`
    const quedan = []
    for (const tr of tramos) {
      const renglon = Math.round(tr.arriba)
      let l = lineas.find((x) => x.renglon === renglon && !quedan.includes(x))
      if (!l) {
        l = { el: document.createElement('div'), renglon }
        l.el.className = 'linea-destacado'
        l.el.style.transition = 'none'
        l.el.style.left = `${tr.izquierda}px`
        l.el.style.top = `${tr.arriba + tr.alto}px`
        l.el.style.width = '0px'
        l.el.style.opacity = '0'
        capa.appendChild(l.el)
        void l.el.offsetWidth
      }
      l.el.style.transition = mover
      l.el.style.left = `${tr.izquierda}px`
      l.el.style.top = `${tr.arriba + tr.alto}px`
      l.el.style.width = `${tr.ancho}px`
      l.el.style.opacity = '1'
      quedan.push(l)
    }
    for (const l of lineas) {
      if (quedan.includes(l)) continue
      if (mover === 'none') { l.el.remove(); continue }
      const izq = parseFloat(l.el.style.left) || 0
      const ancho = parseFloat(l.el.style.width) || 0
      l.el.style.transition = mover
      l.el.style.left = `${izq + ancho}px`
      l.el.style.width = '0px'
      l.el.style.opacity = '0'
      setTimeout(() => l.el.remove(), MS_LINEA + 60)
    }
    lineas = quedan
  }

  // La pantalla exactamente como esta en el milisegundo t, sin animar.
  function saltarA(tMs) {
    dibujar(tMs, performance.now(), true)
  }

  // ---------- el lazo ----------

  function relojMs(ahora) {
    if (conSonido && fase === 'lectura' && !audio.paused) return audio.currentTime * 1000
    if (tRelojBase === null) tRelojBase = ahora - t
    return ahora - tRelojBase
  }

  function cuadro(ahora) {
    raf = 0
    if (!corriendo) return
    if (fase === 'lectura') {
      t = relojMs(ahora)
      if (t >= hastaMs) {
        t = hastaMs
        if (conSonido) audio.pause()
        fase = 'final'
        tFase = ahora
      }
      dibujar(t, ahora, false)
    } else if (fase === 'final') {
      if (unaVuelta) { detener(); return }
      if (ahora - tFase >= MS_AL_TERMINAR) {
        fase = 'fundido'
        tFase = ahora
        cont.style.opacity = '0'
      }
    } else if (fase === 'fundido' && ahora - tFase >= MS_FUNDIDO) {
      t = conSonido ? 0 : -MS_ANTES
      tRelojBase = null
      saltarA(t)
      cont.style.opacity = '1'
      fase = 'lectura'
      if (conSonido) tocarAudio(0)
    }
    raf = requestAnimationFrame(cuadro)
  }

  function arrancar() {
    if (!lista || corriendo || pausadoPorUsuario || pausadoPorVista) return
    corriendo = true
    tRelojBase = null
    if (conSonido && fase === 'lectura' && t >= 0) tocarAudio(t)
    raf = requestAnimationFrame(cuadro)
    pintarBotones()
  }

  function detener() {
    corriendo = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    if (audio && !audio.paused) audio.pause()
    pintarBotones()
  }

  // ---------- los controles ----------

  function tocarAudio(desdeMs) {
    audio.currentTime = Math.max(0, desdeMs) / 1000
    const p = audio.play()
    if (p && p.catch) {
      p.catch((err) => {
        // NADA FALLA EN SILENCIO: si el telefono no deja sonar el audio, el boton vuelve a
        // "sin sonido" y la pantalla sigue con su propio reloj.
        console.warn(`Sigo, demostracion: el audio no pudo sonar (${err && err.name}). Sigue sin sonido.`)
        conSonido = false
        tRelojBase = null
        pintarBotones()
      })
    }
  }

  function pintarBotones() {
    botonPausa.dataset.estado = corriendo ? 'pausa' : 'reproducir'
    botonPausa.setAttribute('aria-label', corriendo ? 'Pausar la demostración' : 'Reproducir la demostración')
    if (botonSonido) {
      botonSonido.dataset.estado = conSonido ? 'con' : 'sin'
      botonSonido.setAttribute('aria-pressed', conSonido ? 'true' : 'false')
      botonSonido.setAttribute('aria-label', conSonido ? 'Quitar el sonido' : 'Escuchar la lectura')
    }
  }

  botonPausa.addEventListener('click', () => {
    if (corriendo) {
      pausadoPorUsuario = true
      detener()
      return
    }
    pausadoPorUsuario = false
    if (reducido.matches) {
      // Con movimiento reducido, reproducir es una vuelta entera desde el principio, y al
      // terminar se queda en el ultimo cuadro.
      unaVuelta = true
      fase = 'lectura'
      t = conSonido ? 0 : -MS_ANTES
      saltarA(t)
    } else if (fase !== 'lectura') {
      tFase = performance.now()
    }
    arrancar()
  })

  if (botonSonido && audio) {
    botonSonido.addEventListener('click', () => {
      if (conSonido) {
        conSonido = false
        audio.pause()
        tRelojBase = null
        pintarBotones()
        return
      }
      // Con sonido la lectura empieza de nuevo, desde la primera palabra. El play() va aca,
      // dentro del toque, o el telefono no lo deja sonar.
      conSonido = true
      pausadoPorUsuario = false
      unaVuelta = reducido.matches
      fase = 'lectura'
      t = 0
      tRelojBase = null
      cont.style.opacity = '1'
      saltarA(0)
      tocarAudio(0)
      if (!corriendo) arrancar()
      pintarBotones()
    })
  }

  // Fuera de la vista o con la pestana escondida no corre.
  let enPantalla = true
  function revisarVista() {
    pausadoPorVista = !(enPantalla && !document.hidden)
    if (pausadoPorVista) { if (corriendo) detener() } else if (!reducido.matches || unaVuelta) arrancar()
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entradas) => {
      enPantalla = entradas[entradas.length - 1].isIntersecting
      revisarVista()
    }).observe(pantalla)
  }
  document.addEventListener('visibilitychange', revisarVista)

  function empezar() {
    if (!medir()) {
      // NADA FALLA EN SILENCIO.
      console.warn(`Sigo, demostracion: la pantalla mide ${pantalla.clientWidth} x ${pantalla.clientHeight} px y tiene ${palabras.length} palabras. No se reproduce.`)
      return
    }
    raiz.dataset.lista = 'si'
    lista = true
    if (reducido.matches) {
      t = tomaQuieta()
      saltarA(t)
      fase = 'final'
      pintarBotones()
      return
    }
    saltarA(t)
    arrancar()
  }

  if ('ResizeObserver' in window) {
    let medida = ''
    new ResizeObserver(() => {
      const nueva = `${pantalla.clientWidth}x${pantalla.clientHeight}`
      if (nueva === medida) return
      const primera = medida === ''
      medida = nueva
      if (!primera && lista && medir()) saltarA(Math.max(t, cuadros[0][0]))
    }).observe(pantalla)
  }

  // Las palabras se miden con la letra verdadera: con la de reemplazo cortarian en otro lado.
  const fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
  fuentes.then(empezar, empezar)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
else iniciar()
