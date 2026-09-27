// UNA PANTALLA DE LECTURA DIBUJADA A PARTIR DEL JSON. 27-09-2026, docs/el-sitio.md v2.
//
// SE PUBLICA, Y TODO JAVASCRIPT PUBLICADO SE PUEDE LEER: aca no hay nada del motor ni de la
// pantalla de la aplicacion -Javier, 27-09-2026-. Lo que se decide ya viene decidido en el
// JSON que arma sitio/fuente/lectura.js: [ms, palabra destacada], cuantas palabras lleva la
// linea, y cuando suena cada palabra. Aca se hace lo que hace cualquier pagina con un texto:
// medir donde quedo esa palabra, subir su renglon con una transicion suave cualquiera y poner
// una linea debajo.
//
// Dos modos:
//   'sigo'  el renglon de la palabra destacada sube arriba y la linea va bajo las palabras.
//   'fijo'  un teleprompter comun: el texto sube a velocidad pareja, oiga o no oiga.

const MS_SUBIR = 320   // lo que tarda el texto en subir un renglon
const MS_LINEA = 240   // lo que tarda la linea en ir de un lugar al otro
const AIRE_ARRIBA = 6  // el renglon vivo no queda pegado al borde

export class Pantalla {
  constructor(telefono, datos) {
    this.tel = telefono
    this.datos = datos
    this.desliza = telefono.querySelector('.desliza')
    this.capa = telefono.querySelector('.capa-destacado')
    this.palabras = Array.from(telefono.querySelectorAll('.columna [data-token]'))
    this.modo = 'sigo'
    this.oyeVoz = false
    this.subida = null
    this.dibujado = ''
    this.lineas = []
    this.suena = -1
    this.geo = []
    this.renglones = []
    this.fijo = null
  }

  // Donde quedo cada palabra -en px del telefono, que mide siempre lo mismo: el tamano de la
  // pagina lo pone una transformacion por fuera-, y que palabras van en el mismo renglon.
  medir() {
    this.geo = this.palabras.map((el) => ({ arriba: el.offsetTop, izquierda: el.offsetLeft, ancho: el.offsetWidth, alto: el.offsetHeight }))
    this.renglones = []
    this.geo.forEach((g, i) => {
      const ult = this.renglones[this.renglones.length - 1]
      if (ult && Math.abs(ult.arriba - g.arriba) < g.alto / 2) ult.hasta = i
      else this.renglones.push({ arriba: g.arriba, desde: i, hasta: i })
    })
    this.renglonDe = new Array(this.geo.length)
    this.renglones.forEach((r, k) => { for (let i = r.desde; i <= r.hasta; i++) this.renglonDe[i] = k })
    this.subida = null
    this.dibujado = ''
    return this.geo.length > 0
  }

  cuadroEn(t) {
    const c = this.datos.cuadros
    if (t < c[0][0]) return c[0]
    let lo = 0
    let hi = c.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (c[mid][0] <= t) lo = mid
      else hi = mid - 1
    }
    return c[lo]
  }

  // La palabra que suena en t -la voz, no el motor-, o -1.
  palabraQueSuena(t) {
    const v = this.datos.voz
    for (let i = 0; i < v.length; i++) {
      if (t < v[i][0]) return -1
      if (t < v[i][1]) return i
    }
    return -1
  }

  // Un teleprompter comun, puesto a la velocidad con que habla la persona: arranca en la palabra
  // que se dice en t0 y avanza parejo.
  ponerFijo(t0) {
    const v = this.datos.voz
    const hablado = v.reduce((s, x) => s + (x[1] - x[0]), 0)
    // Palabras por ms mientras se habla, con los espacios cortos entre palabras incluidos.
    const porMs = v.length / (hablado / 0.86)
    let w0 = 0
    while (w0 + 1 < v.length && v[w0 + 1][0] <= t0) w0++
    this.fijo = { t0, w0, porMs }
  }

  dibujar(t, ahora, deGolpe = false) {
    if (!this.geo.length) return
    let y
    if (this.modo === 'fijo' && this.fijo) {
      const w = Math.max(0, this.fijo.w0 + (t - this.fijo.t0) * this.fijo.porMs)
      const i = Math.min(this.geo.length - 1, Math.floor(w))
      const r = this.renglones[this.renglonDe[i]]
      const siguiente = this.renglones[this.renglonDe[i] + 1]
      const fraccion = (w - r.desde) / (r.hasta - r.desde + 1)
      const alto = siguiente ? siguiente.arriba - r.arriba : this.geo[i].alto
      y = r.arriba + Math.min(1, Math.max(0, fraccion)) * alto - AIRE_ARRIBA
      this.desliza.style.transform = `translate3d(0, ${-y}px, 0)`
      return
    }

    const desde = this.cuadroEn(t)[1]
    const hasta = Math.min(this.geo.length, desde + this.datos.palabrasDestacadas)
    const objetivo = Math.max(0, this.geo[Math.min(desde, this.geo.length - 1)].arriba - AIRE_ARRIBA)
    if (deGolpe || !this.subida) {
      this.subida = { desde: objetivo, hasta: objetivo, t0: ahora }
    } else if (objetivo !== this.subida.hasta) {
      this.subida = { desde: this.yActual, hasta: objetivo, t0: ahora }
    }
    const x = Math.min(1, (ahora - this.subida.t0) / MS_SUBIR)
    y = this.subida.desde + (this.subida.hasta - this.subida.desde) * (1 - Math.pow(1 - x, 3))
    this.yActual = y
    this.desliza.style.transform = `translate3d(0, ${-y}px, 0)`

    const clave = `${desde}|${hasta}`
    if (clave !== this.dibujado || deGolpe) {
      this.dibujado = clave
      this.ponerLinea(desde, hasta, deGolpe)
    }

    const suena = this.oyeVoz ? this.palabraQueSuena(t) : -1
    if (suena !== this.suena) {
      if (this.suena >= 0) this.palabras[this.suena].classList.remove('suena')
      if (suena >= 0) this.palabras[suena].classList.add('suena')
      this.suena = suena
    }
  }

  // La linea bajo las palabras desde..hasta, un tramo por renglon. Cada tramo sigue en su
  // renglon: el del renglon nuevo nace desde su comienzo y se alarga, y el del renglon que se
  // deja se encoge hacia su final y se apaga.
  ponerLinea(desde, hasta, deGolpe) {
    const tramos = []
    for (let i = desde; i < hasta; i++) {
      const g = this.geo[i]
      const ult = tramos[tramos.length - 1]
      if (ult && ult.renglon === this.renglonDe[i]) ult.ancho = g.izquierda + g.ancho - ult.izquierda
      else tramos.push({ renglon: this.renglonDe[i], izquierda: g.izquierda, arriba: g.arriba, ancho: g.ancho, alto: g.alto })
    }
    const mover = deGolpe
      ? 'none'
      : `left ${MS_LINEA}ms cubic-bezier(0.2, 0.8, 0.2, 1), top ${MS_LINEA}ms cubic-bezier(0.2, 0.8, 0.2, 1), width ${MS_LINEA}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease`
    const quedan = []
    for (const tr of tramos) {
      let l = this.lineas.find((x) => x.renglon === tr.renglon && !quedan.includes(x))
      if (!l) {
        l = { el: document.createElement('div'), renglon: tr.renglon }
        l.el.className = 'linea-destacado'
        l.el.style.transition = 'none'
        l.el.style.left = `${tr.izquierda}px`
        l.el.style.top = `${tr.arriba + tr.alto}px`
        l.el.style.width = '0px'
        l.el.style.opacity = '0'
        this.capa.appendChild(l.el)
        void l.el.offsetWidth
      }
      l.el.style.transition = mover
      l.el.style.left = `${tr.izquierda}px`
      l.el.style.top = `${tr.arriba + tr.alto}px`
      l.el.style.width = `${tr.ancho}px`
      l.el.style.opacity = '1'
      quedan.push(l)
    }
    for (const l of this.lineas) {
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
    this.lineas = quedan
  }
}

// UN RELOJ QUE DA VUELTAS sobre un tramo de la lectura, con una espera quieta al final y un
// fundido para volver a empezar: el texto no sube de golpe al principio.
export class Reloj {
  constructor(desde, hasta, { antes = 900, despues = 2600, fundido = 450 } = {}) {
    this.desde = desde
    this.hasta = hasta
    this.antes = antes
    this.despues = despues
    this.fundido = fundido
    this.t0 = null
    this.quieto = null
  }

  get vuelta() { return this.antes + (this.hasta - this.desde) + this.despues }

  reiniciar(ahora) { this.t0 = ahora }

  congelar(t) { this.quieto = t }

  // { t: milisegundo de la toma, alfa: 1, o menos mientras se funde para dar la vuelta }
  valor(ahora) {
    if (this.quieto !== null) return { t: this.quieto, alfa: 1 }
    if (this.t0 === null) this.t0 = ahora
    const u = (ahora - this.t0) % this.vuelta
    const t = Math.min(this.hasta, this.desde - this.antes + u)
    let alfa = 1
    if (u < this.fundido) alfa = u / this.fundido
    else if (u > this.vuelta - this.fundido) alfa = (this.vuelta - u) / this.fundido
    return { t, alfa, vuelta: Math.floor((ahora - this.t0) / this.vuelta) }
  }
}
