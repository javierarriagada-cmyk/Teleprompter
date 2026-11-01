// Portada aprobada: recorrido corto E0 → E1 → E2 → E5; ver NOTA-DEMO-REAL del PR #165.
// LA ONDA DE LA VOZ -escenas E1 y E2-. Motor real; dibujo Apple/Sony (t122u/t123u).
// Silencio = franja continua baja (no fila de puntos). Voz = barras con el mismo paso.

const MS_POR_BARRA = 70
const PX_POR_BARRA = 6
const SILENCIO = 0.18

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

  fuerza(t) {
    const v = this.voz
    let i = this.ultima || 0
    if (i >= v.length || (i > 0 && v[i - 1][1] > t)) i = 0
    while (i < v.length && v[i][1] <= t) i++
    this.ultima = i
    if (i >= v.length || t < v[i][0]) return SILENCIO
    const [a, b] = v[i]
    const silabas = Math.max(1, Math.round((b - a) / 170))
    const x = (t - a) / (b - a)
    const silaba = Math.abs(Math.sin(Math.PI * x * silabas))
    const grano = 0.84 + 0.16 * Math.abs(Math.sin(i * 12.9898 + Math.floor(t / MS_POR_BARRA) * 78.233))
    const borde = Math.min(1, x * 5, (1 - x) * 5)
    return Math.max(SILENCIO, (0.28 + 0.72 * silaba) * grano * borde)
  }

  dibujar(t, {
    x: xAhora, y, alto, izquierda = xAhora, pasado = 0, alfa = 1,
    tramo = null, limpiar = true, marca = false,
    color = '#D8D2CE', colorAhora = '#F0C070', barW = 3.2,
    plano = false
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

    // ¿Todo el tramo visible está en silencio? → una cápsula continua (Apple idle).
    let maxF = 0
    const muestras = []
    for (let k = -nPasado; k <= n; k++) {
      const tk = (Math.floor(t / MS_POR_BARRA) + k) * MS_POR_BARRA
      const x = xAhora - k * PX_POR_BARRA + desplazamiento
      if (x < -PX_POR_BARRA || x > this.ancho + PX_POR_BARRA) continue
      if (tramo && (x < tramo[0] - 2 || x > tramo[1] + 2)) continue
      const f = this.fuerza(tk)
      maxF = Math.max(maxF, f)
      muestras.push({ k, x, f })
    }
    const enSilencio = plano || maxF <= SILENCIO + 0.12

    if (enSilencio) {
      // Franja continua elegante (Apple idle). Si hay tramo, usarlo entero.
      let x0, x1
      if (tramo) { x0 = tramo[0] + 6; x1 = tramo[1] - 6 }
      else if (muestras.length > 2) {
        const xs = muestras.map((m) => m.x)
        x0 = Math.min(...xs) - 1; x1 = Math.max(...xs) + 1
      } else { x0 = xAhora - izquierda; x1 = xAhora + pasado }
      const hLine = Math.max(5, Math.min(7, alto * 0.18))
      ctx.globalAlpha = 0.82 * alfa
      ctx.fillStyle = color
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x0, y - hLine / 2, Math.max(4, x1 - x0), hLine, hLine / 2)
      else ctx.rect(x0, y - hLine / 2, Math.max(4, x1 - x0), hLine)
      ctx.fill()
      // acento suave en el "ahora"
      ctx.globalAlpha = 0.95 * alfa
      ctx.fillStyle = colorAhora
      const aw = Math.min(32, Math.max(16, (x1 - x0) * 0.16))
      if (ctx.roundRect) ctx.roundRect(xAhora - aw / 2, y - hLine / 2, aw, hLine, hLine / 2)
      else ctx.rect(xAhora - aw / 2, y - hLine / 2, aw, hLine)
      ctx.fill()
    } else {
      for (const { k, x, f } of muestras) {
        const silent = f <= SILENCIO + 0.08
        // Silencio: ancho = paso → franja continua (nunca fila de puntos).
        // Voz: barras más finas, mismo paso.
        const bw = silent ? PX_POR_BARRA + 0.2 : barW
        const h = silent ? Math.max(3.5, alto * 0.15) : Math.max(4, f * alto)
        const lejos = k >= 0 ? Math.min(1, k / Math.max(1, n)) : 0
        const opacidad = silent
          ? 0.78
          : (k >= 0 ? 0.95 - 0.7 * lejos : Math.max(0.12, 0.58 + k / Math.max(1, nPasado) * 0.42))
        ctx.globalAlpha = opacidad * alfa
        ctx.fillStyle = (!silent && k >= 0 && k < 2) ? colorAhora : color
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x - bw / 2, y - h / 2, bw, h, Math.min(bw / 2, h / 2))
        else ctx.rect(x - bw / 2, y - h / 2, bw, h)
        ctx.fill()
      }
    }
    if (marca && !enSilencio) {
      ctx.globalAlpha = 0.45 * alfa
      ctx.fillStyle = colorAhora
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(xAhora - 1, y - alto * 0.5, 2, alto, 1)
      else ctx.rect(xAhora - 1, y - alto * 0.5, 2, alto)
      ctx.fill()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }
}

/* Antes: comentarios del recorrido largo; quedan como historia.
// LA ONDA DE LA VOZ -escenas E1 y E2-. 27-09-2026, docs/el-sitio.md v2.
//
// Barras verticales que viajan hacia el telefono: cada barra es un instante de la voz, con los
// mismos tiempos que la lectura -datos.voz, cuando empieza y termina cada palabra-. La barra
// que toca el borde del telefono es lo que suena ahora, y esa palabra se enciende en la
// pantalla. En los silencios la onda se aplana. La forma de cada palabra -sus silabas, lo alto
// de cada barra- es dibujo: los tiempos no.
  // Que tan fuerte suena en el milisegundo t, de 0 a 1.
    // Busqueda lineal desde la ultima: las barras se piden en orden.
  // x: el x en pantalla donde suena ahora; lo que viene llega desde la izquierda.
  // pasado: cuanto se dibuja a la derecha de "ahora" -lo que ya sono-, en px.
  // tramo: [desde, hasta] en x, para dibujar varias ondas -una bajo cada telefono, E2- sin
  // que se pisen; limpiar en false para no borrar la anterior. marca: una raya en "ahora".
    // Del pasado al futuro, para que la busqueda de la fuerza vaya en orden.
      // Lejos, tenue; cerca del telefono, crema; lo ya dicho, se apaga.
*/
