// ALINEAR UNA TOMA CONTRA SU GUION -13-10-2026, banco del motor-.
//
// Esto vivia entero dentro de scripts/medir-toma.mjs y se saco TAL CUAL, con sus comentarios,
// para que lo use tambien el banco -scripts/banco-motor.ts, `npm run banco`- sin copiarlo. Es
// JavaScript plano -con su alinearToma.d.ts al lado- porque medir-toma.mjs se sigue corriendo
// con node a secas: `node scripts/medir-toma.mjs <archivo>`.

export function normalizar(s) {
  return s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, '').replace(/\s+/g, ' ').trim()
}

export function leven(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}
export function similar(a, b) {
  if (a === b) return true
  return leven(a, b) <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 4))
}

// Los tokens del guion, igual que tokenizarGuion: las acotaciones -entre [] o ()-
// se cuentan como tokens pero no se leen.
export function tokensDelGuion(lineas) {
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

// -13-10-2026, banco del motor-: recibe el TEXTO del registro, no la ruta, para que lo use
// tambien el banco -que corre con vite-node y en las pruebas-. La lectura del archivo quedo
// en medir-toma.mjs.
// Antes:
// function leer(ruta) {
//   const texto = fs.readFileSync(ruta, 'utf8')
export function leerRegistro(texto) {
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
  // -banco-largo, 17-10-2026- Las filas 'cuadros' de la bitácora nueva -cada 5 s, diagnostico.ts-: un
  // registro viejo no las tiene y queda []. Los 'cuadro' de la nueva se leen igual: uno que no se
  // escribió era igual al anterior, y aquí cada cuadro vale hasta el siguiente.
  const tramosCuadros = [] // { ms, n, mediana, p95, max, sobre50 }
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
    } else if (c[1] === 'cuadros') {
      const v = (k) => { const x = new RegExp(k + '=(\\d+)').exec(c[2]); return x ? Number(x[1]) : NaN }
      tramosCuadros.push({ ms, n: v('n'), mediana: v('mediana'), p95: v('p95'), max: v('max'), sobre50: v('sobre50') })
    }
  }
  // Antes: return { guion, cab, oidas, cuadros, renglones, retrasos, cruces, capturas, procesos, oido }
  return { guion, cab, oidas, cuadros, renglones, retrasos, cruces, capturas, procesos, oido, tramosCuadros }
}

// Alineamiento de lo oido contra el guion: maximo de coincidencias en orden.
// Y SOLO CERCA DE DONDE IBA LA PANTALLA -24-09-2026-. El guion repite palabras -"estamos",
// "somos"- y sin esto el alineamiento, al final de una toma cortada, emparejaba las ultimas
// palabras dichas con apariciones 50 tokens mas adelante: la medicion decia que la persona iba
// 15 renglones delante de la pantalla -3% de una toma- cuando la pantalla la seguia bien. Una
// palabra solo se empareja con tokens a menos de CERCANIA del calce de ese momento.
export const CERCANIA = 25
export function alinear(oidas, tokens, calceEn) {
  const cerca = (o, t) => !calceEn || Math.abs(t - calceEn(o.ini)) <= CERCANIA
  const idx = tokens.map((t, i) => ({ ...t, i })).filter((t) => !t.acot)
  const m = oidas.length, n = idx.length
  const D = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      D[i][j] = Math.max(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1] + (similar(oidas[i - 1].w, idx[j - 1].w) && cerca(oidas[i - 1], idx[j - 1].i) ? 1 : 0))
  const pares = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (similar(oidas[i - 1].w, idx[j - 1].w) && cerca(oidas[i - 1], idx[j - 1].i) && D[i][j] === D[i - 1][j - 1] + 1) { pares.push([i - 1, idx[j - 1].i]); i--; j-- }
    else if (D[i - 1][j] >= D[i][j - 1]) i--
    else j--
  }
  return pares.reverse() // [indiceOida, tokenGuion]
}

export function percentil(arr, p) {
  if (arr.length === 0) return NaN
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}

// LA MEDICION CONTRA LA VOZ, SACADA DEL BUCLE DE medir-toma.mjs -13-10-2026, banco del motor-.
// La usan medir-toma.mjs, con los cuadros que grabo el telefono, y el banco -scripts/
// banco-motor.ts-, con los cuadros que da repetirLectura sobre la misma toma. Es la misma
// cuenta de antes, linea por linea: la vara -cuando se dijo cada palabra- sale siempre de las
// 'palabras FINAL' alineadas con los cuadros GRABADOS -calceEn-, y lo que se compara contra ella
// es `cuadros`.
//   reg      lo que devuelve leerRegistro
//   cuadros  [{ ms, pos, trabado }] a medir -por omision, los grabados-
//   opciones.sinTelefono  -banco-largo, 17-10-2026- el registro no viene de un teléfono: lo armó
//            transcribir.py con el audio de la toma -docs/registros/largas/LEEME.txt- y sus 'cuadro' van
//            todos en pos=0. No hay calce grabado con que acotar la búsqueda, así que la vara es la de
//            medir.ts de la toma de 25 min -rama motor-investigacion, docs/mediciones/toma-25-min/
//            herramientas/medir.ts-: alinear sin cercanía, CONTANDO las acotaciones -Javier las lee-, y
//            sin los pares que saltan más de SALTO_VARA tokens del anterior. No depende del motor que mide.
export const SALTO_VARA = 50
export function medirContraLaVoz(reg, cuadros = reg.cuadros, opciones = {}) {
  const { guion, oidas, renglones } = reg
  const tokens = tokensDelGuion(guion)
  const calceEn = (t) => { let v = 0; for (const x of reg.cuadros) { if (x.ms > t) break; v = x.pos } return v }
  // Antes: const pares = alinear(oidas, tokens, reg.cuadros.length ? calceEn : null)
  let pares
  if (opciones.sinTelefono) {
    pares = []
    for (const [io, it] of alinear(oidas, tokens.map((t) => ({ ...t, acot: false })), null)) {
      const ult = pares.length ? pares[pares.length - 1][1] : 0
      if (it > ult && it - ult <= SALTO_VARA) pares.push([io, it])
    }
  } else pares = alinear(oidas, tokens, reg.cuadros.length ? calceEn : null)
  const r = { tokens, pares, conocidos: [], atrasoPal: [], atrasoRen: [], muestras: [], primerMov: null, dichoAntes: null }
  if (pares.length < 5 || cuadros.length === 0) return r

  // Cuando se dijo cada token del guion: el inicio de la palabra oida que le toco.
  const dicho = new Map()
  for (const [io, it] of pares) if (!dicho.has(it)) dicho.set(it, oidas[io].ini)
  const conocidos = [...dicho.entries()].sort((a, b) => a[0] - b[0])
  r.conocidos = conocidos
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
  r.tokenDichoEn = tokenDichoEn

  const t0 = conocidos[0][1], t1 = conocidos[conocidos.length - 1][1]
  let c = 0
  for (let t = t0; t <= t1; t += 100) {
    while (c + 1 < cuadros.length && cuadros[c + 1].ms <= t) c++
    const cu = cuadros[c]
    const tok = tokenDichoEn(t)
    if (tok === null) continue
    r.atrasoPal.push(tok - cu.pos)
    // -banco-: cada muestra queda a mano para las cifras que el banco agrega -el destacado-.
    r.muestras.push({ t, tok, pos: cu.pos })
    const rd = renglonDe(tok)
    if (rd !== null && cu.trabado !== null) r.atrasoRen.push(rd - cu.trabado)
  }
  // El arranque: cuanto se dijo antes de que la pantalla se moviera.
  r.primerMov = cuadros.find((x) => x.pos > 0.5) || null
  r.dichoAntes = r.primerMov ? tokenDichoEn(r.primerMov.ms) : null
  return r
}
