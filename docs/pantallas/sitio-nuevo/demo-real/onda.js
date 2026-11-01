// LA ONDA DE LA VOZ -escenas E1 y E2-. 27-09-2026, docs/el-sitio.md v2.
// Prototipo t122u/t123u: misma lógica de voz; dibujo a la vara Apple/Sony
// (pocas barras redondeadas, amplitud suave, silencio casi plano, DPR nítido).

const MS_POR_BARRA = 70
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
    let i = this.ultima || 0
    if (i >= v.length || (i > 0 && v[i - 1][1] > t)) i = 0
    while (i < v.length && v[i][1] <= t) i++
    this.ultima = i
    // Silencio: piso muy bajo (Apple Dynamic Island en pausa), no línea punteada.
    if (i >= v.length || t < v[i][0]) return 0.22
    const [a, b] = v[i]
    const silabas = Math.max(1, Math.round((b - a) / 170))
    const x = (t - a) / (b - a)
    const silaba = Math.abs(Math.sin(Math.PI * x * silabas))
    const grano = 0.82 + 0.18 * Math.abs(Math.sin(i * 12.9898 + Math.floor(t / MS_POR_BARRA) * 78.233))
    const borde = Math.min(1, x * 5, (1 - x) * 5)
    return Math.max(0.08, (0.22 + 0.78 * silaba) * grano * borde)
  }

  // x: el x en pantalla donde suena ahora.
  // pasado: cuanto se dibuja a la derecha de "ahora".
  // tramo: [desde, hasta] para varias ondas sin pisarse.
  // color / colorAhora: paleta Sigo (crema / acento cálido).
  dibujar(t, {
    x: xAhora, y, alto, izquierda = xAhora, pasado = 0, alfa = 1,
    tramo = null, limpiar = true, marca = false,
    color = '#E7E1DE', colorAhora = '#F0C070', barW = 4
  }) {
    const ctx = this.ctx
    if (limpiar) ctx.clearRect(0, 0, this.ancho, this.alto)
    if (alfa <= 0.01) return
    ctx.save()
    if (tramo) {
      ctx.beginPath()
      ctx.rect(tramo[0], y - alto, tramo[1] - tramo[0], alto * 2)
      ctx.clip()
    }
    this.ultima = 0
    const desplazamiento = ((t % MS_POR_BARRA) / MS_POR_BARRA) * PX_POR_BARRA
    const n = Math.ceil(izquierda / PX_POR_BARRA) + 1
    const nPasado = Math.ceil(pasado / PX_POR_BARRA)
    const halfBar = barW / 2
    for (let k = -nPasado; k <= n; k++) {
      const tk = (Math.floor(t / MS_POR_BARRA) + k) * MS_POR_BARRA
      const x = xAhora - k * PX_POR_BARRA + desplazamiento
      if (x < -PX_POR_BARRA || x > this.ancho + PX_POR_BARRA) continue
      const f = this.fuerza(tk)
      const h = Math.max(4, f * alto)
      const lejos = k >= 0 ? Math.min(1, k / n) : 0
      const opacidad = k >= 0 ? 0.92 - 0.72 * lejos : Math.max(0.08, 0.55 + k / Math.max(1, nPasado) * 0.45)
      ctx.globalAlpha = opacidad * alfa
      ctx.fillStyle = (k >= 0 && k < 2) ? colorAhora : color
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x - halfBar, y - h / 2, barW, h, halfBar)
      else ctx.rect(x - halfBar, y - h / 2, barW, h)
      ctx.fill()
    }
    if (marca) {
      // Playhead fino, no una raya gruesa de placeholder.
      ctx.globalAlpha = 0.55 * alfa
      ctx.fillStyle = colorAhora
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(xAhora - 1, y - alto * 0.55, 2, alto * 1.1, 1)
      else ctx.rect(xAhora - 1, y - alto * 0.55, 2, alto * 1.1)
      ctx.fill()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }
}
