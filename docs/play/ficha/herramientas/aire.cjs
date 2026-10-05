// EL AIRE ENTRE LOS RENGLONES DEL TITULAR, MEDIDO EN LA IMAGEN -tarea 86, 05-10-2026-. Lo usa
// comprobar.cjs.
//
// El defecto que encontró Javier: en los titulares de dos renglones, la franja amarilla del segundo
// -el destacado, .dest de componer-base.cjs- tocaba la cola de la «p» de «Las pausas» y la coma de
// «Mira a la cámara,». La franja pinta el área de contenido de la letra, más alta que el renglón con
// line-height 1.08, y sube hasta las colas del renglón de arriba. Se mide en los PÍXELES del PNG que
// va a Play, no en el HTML: lo que importa es lo que se ve, y una cuenta con las métricas de la letra
// podría dar bien con la imagen mal.
//
// Cómo: se lee el PNG -RGB de 8 bits, lo único que produce componer.cjs; zlib viene con Node-, se
// buscan en la zona del titular las filas con franja amarilla y, por cada franja, se sube fila por
// fila hasta la primera que tenga tinta del renglón de arriba, en todo el ancho. El aire es cuántas
// filas limpias quedan entre las dos. La tinta es la letra crema -clara y sin color- o la franja de
// arriba, si el renglón de arriba también la tiene. La etiqueta ámbar no cuenta: tiene color.
const fs = require('fs')
const zlib = require('zlib')

function leerPng(ruta) {
  const b = fs.readFileSync(ruta)
  let p = 8
  let w = 0, h = 0, color = 0, bits = 0
  const datos = []
  while (p < b.length) {
    const largo = b.readUInt32BE(p)
    const tipo = b.toString('ascii', p + 4, p + 8)
    const cuerpo = b.subarray(p + 8, p + 8 + largo)
    if (tipo === 'IHDR') { w = cuerpo.readUInt32BE(0); h = cuerpo.readUInt32BE(4); bits = cuerpo[8]; color = cuerpo[9] }
    if (tipo === 'IDAT') datos.push(cuerpo)
    p += 12 + largo
  }
  if (bits !== 8 || (color !== 2 && color !== 6)) throw new Error(`${ruta}: PNG de ${bits} bits y tipo ${color}; se esperaba RGB o RGBA de 8 bits`)
  const bpp = color === 2 ? 3 : 4
  const crudo = zlib.inflateSync(Buffer.concat(datos))
  const fila = w * bpp
  const px = Buffer.alloc(h * fila)
  for (let y = 0; y < h; y++) {
    const filtro = crudo[y * (fila + 1)]
    const ent = crudo.subarray(y * (fila + 1) + 1, (y + 1) * (fila + 1))
    const sal = px.subarray(y * fila, (y + 1) * fila)
    const arriba = y > 0 ? px.subarray((y - 1) * fila, y * fila) : null
    for (let i = 0; i < fila; i++) {
      const a = i >= bpp ? sal[i - bpp] : 0
      const u = arriba ? arriba[i] : 0
      const c = arriba && i >= bpp ? arriba[i - bpp] : 0
      let v = ent[i]
      if (filtro === 1) v += a
      else if (filtro === 2) v += u
      else if (filtro === 3) v += (a + u) >> 1
      else if (filtro === 4) {
        const pp = a + u - c
        const pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c
      }
      sal[i] = v & 255
    }
  }
  return { w, h, bpp, px }
}

// La franja: el amarillo #FFE066, o mezclado a medias con el fondo en el borde. El fondo, con el
// resplandor ámbar, llega a una diferencia rojo-azul de unos 30; la franja a medias pasa de 70. Lo que
// la separa de la etiqueta ámbar #F0C070 es el verde: 0,88 del rojo en la franja, 0,80 en el ámbar, y
// la mezcla con el fondo casi no lo mueve. Con 0,6 la primera medición contaba la etiqueta como franja.
const esFranja = (r, g, b) => r > 120 && r - b > 60 && g > 0.85 * r
// La letra del titular: crema #F2ECE8, o gris en el borde que se mezcla con el fondo oscuro; sin
// color: entre canales, menos de 25. Con 45 entraban los bordes de la etiqueta, que Chrome suaviza
// con colores -subpíxeles: 89,125,101 y 123,116,81 medidos-, y una franja de un solo renglón medía
// "aire" contra la etiqueta. Y más clara que 100 en los tres canales: los bordes de color de la
// etiqueta quedan bajo 100 -77,95,83 medido-, y la letra crema llega a 100 con algo más de un tercio
// del píxel cubierto: lo que queda fuera es un borde que casi no se ve.
const esTinta = (r, g, b) => Math.min(r, g, b) > 100 && Math.max(r, g, b) - Math.min(r, g, b) < 25

// Devuelve, por cada franja que tiene un renglón arriba, cuántas filas limpias las separan.
// altoZona: hasta dónde llega el titular -la pantalla empieza ahí-. ventana: cuánto subir buscando el
// renglón de arriba -algo más que un renglón; sin tinta en ese tramo, la franja está en el primero-.
function aireDeTitular(ruta, { altoZona, ventana }) {
  const { w, bpp, px } = leerPng(ruta)
  const at = (x, y) => { const i = (y * w + x) * bpp; return [px[i], px[i + 1], px[i + 2]] }
  // Una fila es de franja si tiene 30 px de amarillo o más. Dentro de la franja las letras negras la
  // cortan en pedazos, pero entre letra y letra sigue habiendo amarillo de sobra: la franja entera
  // queda como un solo tramo de filas, y su borde de arriba es la primera.
  const franjaEnFila = []
  for (let y = 0; y < altoZona; y++) {
    let n = 0
    for (let x = 0; x < w; x++) if (esFranja(...at(x, y))) n++
    franjaEnFila.push(n >= 30)
  }
  // Tinta: letra crema en cualquier punto de la fila, o una fila de franja -el renglón de arriba
  // destacado-. Un píxel amarillo suelto no es franja: los bordes de color de la etiqueta pasan por
  // amarillo -174,176,112 medido- y medían "aire" contra ella.
  const tintaEnFila = (y) => {
    if (franjaEnFila[y]) return true
    for (let x = 0; x < w; x++) if (esTinta(...at(x, y))) return true
    return false
  }
  const aires = []
  for (let y = 1; y < altoZona; y++) {
    if (!franjaEnFila[y] || franjaEnFila[y - 1]) continue
    // y es el borde de arriba de una franja: se sube hasta la tinta.
    let limpio = 0
    let hallada = false
    for (let yy = y - 1; yy >= Math.max(0, y - ventana); yy--) {
      if (tintaEnFila(yy)) { hallada = true; break }
      limpio++
    }
    if (hallada) aires.push({ y, aire: limpio })
  }
  return aires
}

module.exports = { aireDeTitular, leerPng }
