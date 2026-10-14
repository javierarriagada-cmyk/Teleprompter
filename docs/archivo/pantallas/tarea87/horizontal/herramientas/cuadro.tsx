// EL CUADRO EXPORTADO, SIMULADO -tarea 87, subtítulos en horizontal, 04-10-2026-. NO es código de la app.
// CapaDeSubtitulos.java no corre fuera del teléfono, así que aquí se repiten sus cuentas en un canvas,
// con Roboto 700 -la letra del sistema que usa Android- y los renglones que arma src/lib/subtitulos.ts
// de esta rama:
//   - la letra: letraSubtitulo(W, H) si existe; si no, H / 32 -antes-;
//   - si el renglón más ancho pasa del 88 % de W, se achica la letra de todo el subtítulo -el ajuste que
//     ya tenía CapaDeSubtitulos-;
//   - renglones de 1,25, el borde de abajo a 1/6 del alto, contorno de 0,14 de la letra.
// ?w=1920&h=1080&ms=3500 -el subtítulo de esa hora- o ?mw=1 -un renglón de LETRAS_POR_RENGLON letras
// «MW», o de 32 si no existe-.
import '@fontsource/source-sans-3/latin-400.css'
import * as S from '../../../../../src/lib/subtitulos'
import registro from '../../../../../src/pruebas/corpus/toma-008a7133-palabras.motor.txt?raw'

const q = new URLSearchParams(location.search)
const W = Number(q.get('w') || '1920')
const H = Number(q.get('h') || '1080')
const ms = Number(q.get('ms') || '3500')
const forma = W > H ? 'horizontal' : 'vertical'
const s: any = S
const maxLetras: number = s.LETRAS_POR_RENGLON ? s.LETRAS_POR_RENGLON[forma] : 32
const subs = s.armarSubtitulos(registro, forma) as S.Subtitulo[]
let renglones: string[][]
let horaDicha = ms
if (q.get('mw')) {
  renglones = [['MW'.repeat(30).slice(0, maxLetras)]]
} else {
  const sub = S.subtituloEn(subs, ms)!
  renglones = sub.renglones.map((r) => r.map((w) => w.texto))
  horaDicha = ms
}
const dichas = q.get('mw') ? 0 : 3

;(async () => {
  await document.fonts.load('700 60px Roboto')
  const c = document.getElementById('c') as HTMLCanvasElement
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, W * 0.3, H)
  g.addColorStop(0, '#3a4a5a')
  g.addColorStop(1, '#0d1114')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  const letraBase: number = s.letraSubtitulo ? s.letraSubtitulo(W, H) : H / 32
  let letra = letraBase
  const fuente = (l: number) => `700 ${l}px Roboto`
  x.font = fuente(letra)
  const anchoMax = W * 0.88
  const anchoDe = (r: string[]) => x.measureText(r.join(' ')).width
  const masAnchoBase = Math.max(...renglones.map(anchoDe))
  if (masAnchoBase > anchoMax) {
    letra = (letra * anchoMax) / masAnchoBase
    x.font = fuente(letra)
  }
  const masAncho = Math.max(...renglones.map(anchoDe))
  const alto = letra * 1.25
  const n = renglones.length
  const base = H * (1 - S.MARGEN_ABAJO_SUBTITULOS) - (n - 1) * alto
  const m = x.measureText('Hg')
  const descent = m.fontBoundingBoxDescent
  // Las guías: el 6 % de cada lado y el 1/6 de abajo.
  x.setLineDash([12, 10])
  x.lineWidth = 2
  x.strokeStyle = 'rgba(0,200,255,0.8)'
  for (const gx of [W * 0.06, W * 0.94]) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke() }
  x.beginPath(); x.moveTo(0, H * (1 - S.MARGEN_ABAJO_SUBTITULOS)); x.lineTo(W, H * (1 - S.MARGEN_ABAJO_SUBTITULOS)); x.stroke()
  x.setLineDash([])
  let k = 0
  renglones.forEach((r, i) => {
    const ancho = anchoDe(r)
    let px = (W - ancho) / 2
    const y = base + i * alto - descent
    for (let j = 0; j < r.length; j++) {
      const t = (j > 0 ? ' ' : '') + r[j]
      x.lineJoin = 'round'
      x.lineWidth = letra * 0.14 * 2
      x.strokeStyle = '#000'
      x.strokeText(t, px, y)
      x.fillStyle = k < dichas ? '#FFD200' : '#FFFFFF'
      x.fillText(t, px, y)
      px += x.measureText(t).width
      k++
    }
  })
  ;(window as any).medidas = { W, H, forma, maxLetras, letraBase: +letraBase.toFixed(2), letra: +letra.toFixed(2), ajustada: masAnchoBase > anchoMax, renglonMasAnchoBase: +masAnchoBase.toFixed(1), renglonMasAncho: +masAncho.toFixed(1), disponible: +anchoMax.toFixed(1), renglones: renglones.map((r) => r.join(' ')), letrasPorRenglon: renglones.map((r) => r.join(' ').length), hora: horaDicha }
  ;(window as any).listo = true
})()
