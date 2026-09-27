// LA ONDA DE LA VOZ -escenas E1 y E2-. 27-09-2026, docs/el-sitio.md v2.
//
// Barras verticales que viajan hacia el telefono: cada barra es un instante de la voz, con los
// mismos tiempos que la lectura -datos.voz, cuando empieza y termina cada palabra-. La barra
// que toca el borde del telefono es lo que suena ahora, y esa palabra se enciende en la
// pantalla. En los silencios la onda se aplana. La forma de cada palabra -sus silabas, lo alto
// de cada barra- es dibujo: los tiempos no.

const MS_POR_BARRA = 55
const PX_POR_BARRA = 7

export class Onda {
  constructor(canvas, voz) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.voz = voz
    this.ancho = 0
    this.alto = 0
  }

  medir() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.ancho = this.canvas.clientWidth
    this.alto = this.canvas.clientHeight
    this.canvas.width = Math.round(this.ancho * dpr)
    this.canvas.height = Math.round(this.alto * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // Que tan fuerte suena en el milisegundo t, de 0 a 1.
  fuerza(t) {
    const v = this.voz
    // Busqueda lineal desde la ultima: las barras se piden en orden.
    let i = this.ultima || 0
    if (i >= v.length || (i > 0 && v[i - 1][1] > t)) i = 0
    while (i < v.length && v[i][1] <= t) i++
    this.ultima = i
    if (i >= v.length || t < v[i][0]) return 0.035
    const [a, b] = v[i]
    const silabas = Math.max(1, Math.round((b - a) / 170))
    const x = (t - a) / (b - a)
    const silaba = Math.abs(Math.sin(Math.PI * x * silabas))
    const grano = 0.75 + 0.25 * Math.abs(Math.sin(i * 12.9898 + Math.floor(t / MS_POR_BARRA) * 78.233))
    const borde = Math.min(1, x * 6, (1 - x) * 6)
    return Math.max(0.06, (0.25 + 0.75 * silaba) * grano * borde)
  }

  // ahora: el x en pantalla donde suena ahora; lo que viene llega desde la izquierda.
  // pasado: cuanto se dibuja a la derecha de "ahora" -lo que ya sono-, en px.
  dibujar(t, { x: xAhora, y, alto, izquierda = xAhora, pasado = 0, alfa = 1 }) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.ancho, this.alto)
    if (alfa <= 0.01) return
    this.ultima = 0
    const desplazamiento = ((t % MS_POR_BARRA) / MS_POR_BARRA) * PX_POR_BARRA
    const n = Math.ceil(izquierda / PX_POR_BARRA) + 1
    const nPasado = Math.ceil(pasado / PX_POR_BARRA)
    // Del pasado al futuro, para que la busqueda de la fuerza vaya en orden.
    for (let k = -nPasado; k <= n; k++) {
      const tk = (Math.floor(t / MS_POR_BARRA) + k) * MS_POR_BARRA
      const x = xAhora - k * PX_POR_BARRA + desplazamiento
      if (x < -PX_POR_BARRA || x > this.ancho + PX_POR_BARRA) continue
      const f = this.fuerza(tk)
      const h = Math.max(2, f * alto)
      // Lejos, tenue; cerca del telefono, crema; lo ya dicho, se apaga.
      const lejos = k >= 0 ? Math.min(1, k / n) : 0
      const opacidad = k >= 0 ? 0.95 - 0.7 * lejos : Math.max(0, 0.5 + k / nPasado * 0.5)
      ctx.globalAlpha = opacidad * alfa
      ctx.fillStyle = k >= 0 && k < 3 ? '#FFE3C4' : '#E7E1DE'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x - 1.5, y - h / 2, 3, h, 1.5)
      else ctx.rect(x - 1.5, y - h / 2, 3, h)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}
