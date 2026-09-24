// MEDIR UNA TOMA: A CUANTAS PALABRAS Y A CUANTOS RENGLONES VA LA PANTALLA DE LA VOZ.
//
//   node scripts/medir-toma.mjs <archivo.motor.txt> [mas archivos...]
//
// Paso 2 del plan del motor -memoria plan-del-motor-medir-antes-de-tocar-: una
// definicion numerica de bueno, medida sobre lecturas reales. 24-09-2026.
//
// DE DONDE SALE CADA COSA, todo en el mismo reloj -el del registro, cero al empezar
// el video-:
//
//   CUANDO SE DIJO CADA PALABRA DEL GUION. De las lineas 'palabras FINAL': Vosk
//   nativo entrega cada palabra reconocida con el milisegundo en que empezo y
//   termino en el audio. Se alinean contra el guion -programacion dinamica, con la
//   misma tolerancia de letras que el seguidor- y cada palabra del guion que quedo
//   emparejada tiene su tiempo. Las que el reconocedor no oyo se interpolan entre
//   sus vecinas. Esta es la vara: no depende de lo que hizo el motor.
//
//   QUE MOSTRABA LA PANTALLA. De las lineas 'cuadro': la posicion del motor -en
//   palabras- y el renglon vivo -trabado-.
//
//   QUE PALABRAS TIENE CADA RENGLON. De la linea 'renglones'.
//
// LAS CIFRAS:
//
//   atraso en palabras   palabra que se esta diciendo menos palabra que muestra el
//                        motor. Positivo: la pantalla va atrasada.
//   atraso en renglones  renglon de la palabra que se dice menos renglon vivo. El
//                        renglon vivo se dibuja segundo en la ventana -un renglon de
//                        holgura arriba, MARGEN_RENGLONES_ARRIBA-, asi que el renglon
//                        de la ventana donde se lee es 2 + este atraso.
//   retraso del reconocedor   cuanto tarda una palabra en APARECER EN UN PARCIAL
//                        desde que termino de decirse. Los parciales son lo que
//                        mueve la pantalla. Se toma del texto de los parciales: la
//                        palabra k de la frase aparecio cuando el parcial llego a
//                        tener k palabras; y termino de decirse cuando dice el
//                        final. Medirlo con la llegada del FINAL -la primera
//                        version- daba 8 a 11 s: el final llega al cerrar la frase,
//                        a veces 20 s despues.
//   cruce a JavaScript   de las lineas 'llegada': lo que tarda un resultado desde
//                        que Vosk lo entrega hasta que la aplicacion lo recibe.
//   microfono y proceso  con el oido propio -24-09-2026-: cuanto pasa desde que
//                        termina el audio de un trozo hasta que se lee, y cuanto
//                        tarda Vosk en procesarlo. Lo que sobra del retraso es lo que
//                        Vosk se guarda las palabras antes de mostrarlas.
//
// Se mide cada 100 ms mientras hay voz -entre la primera y la ultima palabra dicha-.

import fs from 'fs'

function normalizar(s) {
  return s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, '').replace(/\s+/g, ' ').trim()
}

function leven(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}
function similar(a, b) {
  if (a === b) return true
  return leven(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 4))
}

// Los tokens del guion, igual que tokenizarGuion: las acotaciones -entre [] o ()-
// se cuentan como tokens pero no se leen.
function tokensDelGuion(lineas) {
  const tokens = []
  let enAcot = false
  for (const linea of lineas) {
    for (const frag of linea.split(/\s+/).filter(Boolean)) {
      let buf = ''
      const cerrar = () => { const n = normalizar(buf); if (n) tokens.push({ w: n, acot: enAcot }); buf = '' }
      for (const ch of frag) {
        if (ch === '[' || ch === '(') { cerrar(); enAcot = true }
        else if (ch === ']' || ch === ')') { cerrar(); enAcot = false }
        else buf += ch
      }
      cerrar()
    }
  }
  return tokens
}

function leer(ruta) {
  const texto = fs.readFileSync(ruta, 'utf8')
  const guion = []
  const cab = {}
  const oidas = []    // palabras finales con tiempo
  const cuadros = []  // { ms, pos, trabado }
  const retrasos = [] // ms desde el fin de la palabra hasta su primer parcial
  const cruces = []   // ms del lado nativo a JavaScript
  const capturas = [] // ms desde que termina el audio del trozo hasta que se lee
  const procesos = [] // ms que tarda Vosk con cada trozo
  let oido = null
  let primera = []    // cuando el parcial de la frase en curso llego a k+1 palabras
  let renglones = null
  for (const l of texto.split(/\r?\n/)) {
    if (l.startsWith('# | ')) { guion.push(l.slice(4)); continue }
    if (l.startsWith('# |')) { guion.push(l.slice(3)); continue }
    const m = /^# (letra|columna|motor de voz|donde lees): (.*)$/.exec(l)
    if (m) { cab[m[1]] = m[2]; continue }
    const c = l.split('\t')
    if (c.length < 3) continue
    const ms = Number(c[0])
    if (c[1] === 'palabras' && c[2].startsWith('FINAL: ')) {
      let k = 0
      for (const p of c[2].slice(7).split(' ')) {
        const mm = /^(.*)@(\d+)-(\d+)$/.exec(p)
        if (mm) {
          oidas.push({ w: normalizar(mm[1]), ini: Number(mm[2]), fin: Number(mm[3]), llegada: ms })
          retrasos.push((k < primera.length ? primera[k] : ms) - Number(mm[3]))
          k++
        }
      }
      primera = []
    } else if (c[1] === 'oyo' && c[2].startsWith('parcial: ')) {
      const n = c[2].slice(9).split(' ').filter(Boolean).length
      while (primera.length < n) primera.push(ms)
    } else if (c[1] === 'llegada') {
      const nat = /nativo=(-?\d+)/.exec(c[2])
      if (nat) cruces.push(ms - Number(nat[1]))
      const au = /audio=(-?\d+) leido=(-?\d+) procesado=(-?\d+)/.exec(c[2])
      if (au) { capturas.push(Number(au[2]) - Number(au[1])); procesos.push(Number(au[3]) - Number(au[2])) }
    } else if (c[1] === 'oido') {
      oido = c[2]
    } else if (c[1] === 'cuadro') {
      const pos = /pos=([\d.]+)/.exec(c[2]); const tr = /trabado=(\d+)/.exec(c[2])
      if (pos) cuadros.push({ ms, pos: Number(pos[1]), trabado: tr ? Number(tr[1]) : null })
    } else if (c[1] === 'renglones') {
      renglones = c[2].split(' ').map(Number)
    }
  }
  return { guion, cab, oidas, cuadros, renglones, retrasos, cruces, capturas, procesos, oido }
}

// Alineamiento de lo oido contra el guion: maximo de coincidencias en orden.
function alinear(oidas, tokens) {
  const idx = tokens.map((t, i) => ({ ...t, i })).filter((t) => !t.acot)
  const m = oidas.length, n = idx.length
  const D = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      D[i][j] = Math.max(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1] + (similar(oidas[i - 1].w, idx[j - 1].w) ? 1 : 0))
  const pares = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (similar(oidas[i - 1].w, idx[j - 1].w) && D[i][j] === D[i - 1][j - 1] + 1) { pares.push([i - 1, idx[j - 1].i]); i--; j-- }
    else if (D[i - 1][j] >= D[i][j - 1]) i--
    else j--
  }
  return pares.reverse() // [indiceOida, tokenGuion]
}

function percentil(arr, p) {
  if (arr.length === 0) return NaN
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-')

for (const ruta of process.argv.slice(2)) {
  const { guion, cab, oidas, cuadros, renglones, retrasos, cruces, capturas, procesos, oido } = leer(ruta)
  const tokens = tokensDelGuion(guion)
  const pares = alinear(oidas, tokens)
  console.log(`\n=== ${ruta.split(/[\\/]/).pop()}`)
  console.log(`letra ${cab.letra || '?'} | columna ${cab.columna || '?'} | motor ${cab['motor de voz'] || '?'}`)
  console.log(`guion ${tokens.length} palabras | oidas ${oidas.length} | emparejadas con el guion ${pares.length}`)
  if (pares.length < 5 || cuadros.length === 0) { console.log('muy pocos datos para medir'); continue }

  // Cuando se dijo cada token del guion: el inicio de la palabra oida que le toco.
  const dicho = new Map()
  for (const [io, it] of pares) if (!dicho.has(it)) dicho.set(it, oidas[io].ini)
  const conocidos = [...dicho.entries()].sort((a, b) => a[0] - b[0])
  // la palabra que se esta diciendo en el instante t: la ultima que ya empezo
  const tokenDichoEn = (t) => {
    let ult = null
    for (const [tok, ms] of conocidos) { if (ms <= t) ult = tok; else break }
    return ult
  }
  const renglonDe = (tok) => {
    if (!renglones) return null
    let r = 0
    for (let k = 0; k < renglones.length; k++) if (renglones[k] <= tok) r = k
    return r
  }

  const t0 = conocidos[0][1], t1 = conocidos[conocidos.length - 1][1]
  const atrasoPal = [], atrasoRen = []
  let c = 0
  for (let t = t0; t <= t1; t += 100) {
    while (c + 1 < cuadros.length && cuadros[c + 1].ms <= t) c++
    const cu = cuadros[c]
    const tok = tokenDichoEn(t)
    if (tok === null) continue
    atrasoPal.push(tok - cu.pos)
    const rd = renglonDe(tok)
    if (rd !== null && cu.trabado !== null) atrasoRen.push(rd - cu.trabado)
  }
  // El arranque: cuanto se dijo antes de que la pantalla se moviera.
  const primerMov = cuadros.find((x) => x.pos > 0.5)
  const dichoAntes = primerMov ? tokenDichoEn(primerMov.ms) : null

  console.log(`retraso del reconocedor, ms      mediana ${percentil(retrasos, 50)}  p90 ${percentil(retrasos, 90)}`)
  if (capturas.length) console.log(`  de eso, microfono, ms           mediana ${percentil(capturas, 50)}  p90 ${percentil(capturas, 90)}`)
  if (procesos.length) console.log(`  de eso, proceso de Vosk, ms     mediana ${percentil(procesos, 50)}  p90 ${percentil(procesos, 90)}`)
  if (cruces.length) console.log(`  de eso, cruce a JavaScript, ms  mediana ${percentil(cruces, 50)}  p90 ${percentil(cruces, 90)}`)
  if (oido) console.log(`oido: ${oido}`)
  console.log(`atraso de la pantalla, palabras  mediana ${f1(percentil(atrasoPal, 50))}  p90 ${f1(percentil(atrasoPal, 90))}`)
  if (atrasoRen.length) {
    const ventana = atrasoRen.map((x) => x + 2)
    console.log(`atraso en renglones              mediana ${f1(percentil(atrasoRen, 50))}  p90 ${f1(percentil(atrasoRen, 90))}`)
    console.log(`renglon de la ventana donde se lee: mediana ${f1(percentil(ventana, 50))}  (el objetivo es 2)`)
    const reparto = {}
    for (const v of ventana) reparto[v] = (reparto[v] || 0) + 1
    console.log('  reparto: ' + Object.keys(reparto).sort((a, b) => a - b).map((k) => `${k}: ${Math.round((100 * reparto[k]) / ventana.length)}%`).join('  '))
  } else console.log('sin renglones en el registro: solo se mide en palabras')
  if (primerMov) console.log(`arranque: la pantalla se movio a los ${primerMov.ms} ms, con ${dichoAntes === null ? '?' : dichoAntes + 1} palabras ya dichas`)
}
