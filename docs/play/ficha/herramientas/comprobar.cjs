// COMPRUEBA LA FICHA ANTES DE SUBIRLA -tarea 86-. node comprobar.cjs
// Imprime una línea OK o FALLA por cada cosa, y sale con código 1 si algo falla.
//
// Lo que se mira sale de la documentación de Play -answer/9866151, activos de vista previa, y
// answer/9859152, límites de texto- y de docs/tarea86.txt:
// - Cada PNG: tamaño exacto, 16:9 o 9:16 justo, sin alfa -tipo de color 2, RGB de 8 bits: 24 bits-,
//   peso bajo 8 MB -el gráfico, bajo 15 MB-. Se lee la cabecera IHDR del PNG: no hace falta nada
//   instalado, y es lo mismo que mira Play.
// - Textos: nombre hasta 30, breve hasta 80, completa hasta 4000 -y aviso fuera de 1500 a 2500-,
//   sin emojis, sin "…" ni "--" ni "!!", sin palabras prohibidas en la breve.
// - Titulares de las capturas: 7 palabras o menos.
// - PUESTA AL DÍA DEL 05-10-2026: qué capturas hay y en qué orden lo dice escenas.cjs; cada carpeta
//   tiene que tener esas y ninguna más -una 08.png vieja olvidada se subiría a Play sin que nadie la
//   viera-. Teléfono: entre 2 y 8, lados de 320 a 3840 px y el largo no más del doble del corto.
//   Tableta: lados de 1080 a 7680. La carpeta tableta-provisional/ ya no debe existir.
const fs = require('fs')
const path = require('path')
const FICHA = path.resolve(__dirname, '..')
const TITULARES = require('./titulares.cjs')
const { TELEFONO, TABLETA, deLado } = require('./escenas.cjs')
const { aireDeTitular } = require('./aire.cjs')
let fallas = 0
const ok = (bien, que) => { if (!bien) fallas++; console.log(`${bien ? 'OK   ' : 'FALLA'} ${que}`) }
// Un AVISO se imprime y no cuenta como falla: es lo ideal, no lo que Play exige.
const aviso = (bien, que) => console.log(`${bien ? 'OK   ' : 'AVISO'} ${que}`)

function png(ruta) {
  const b = fs.readFileSync(ruta)
  if (b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bits: b[24], color: b[25], peso: b.length }
}
function imagen(rel, w, h, maxMB, libre = false) {
  const ruta = path.join(FICHA, rel)
  if (!fs.existsSync(ruta)) return ok(false, `${rel}: no existe`)
  const d = png(ruta)
  if (!d) return ok(false, `${rel}: no es PNG`)
  const proporcion = libre || w * 9 === h * 16 || w * 16 === h * 9 || (w === 1024 && h === 500)
  ok(d.w === w && d.h === h && proporcion, `${rel}: ${d.w} x ${d.h} (se pide ${w} x ${h})`)
  ok(d.color === 2 && d.bits === 8, `${rel}: RGB de 24 bits, sin alfa (tipo de color ${d.color}, ${d.bits} bits)`)
  ok(d.peso < maxMB * 1024 * 1024, `${rel}: ${(d.peso / 1024 / 1024).toFixed(2)} MB (menos de ${maxMB} MB)`)
  return d
}
// Los lados que acepta Play -answer/9866151-: teléfono de 320 a 3840 y el largo no más del doble del
// corto; tableta de 1080 a 7680.
function lados(rel, d, min, max) {
  if (!d) return
  const corto = Math.min(d.w, d.h)
  const largo = Math.max(d.w, d.h)
  ok(corto >= min && largo <= max && largo <= corto * 2, `${rel}: lados ${corto} y ${largo}, entre ${min} y ${max}, el largo no más del doble`)
}
// Que en la carpeta estén justo las que se esperan, ni una más.
function soloEstas(dir, esperadas) {
  const hay = fs.existsSync(path.join(FICHA, dir)) ? fs.readdirSync(path.join(FICHA, dir)).filter((f) => !f.startsWith('.')).sort() : []
  const sobran = hay.filter((f) => !esperadas.includes(f))
  ok(sobran.length === 0, `${dir}: solo las ${esperadas.length} de escenas.cjs${sobran.length ? ` (sobran: ${sobran.join(', ')})` : ''}`)
}

console.log('— Gráfico de funciones')
for (const i of ['es', 'en']) imagen(`grafico-1024x500-${i}.png`, 1024, 500, 15)

console.log('— Capturas de teléfono')
// Antes: for (let n = 1; n <= 8; n++), con la 4 de lado.
ok(TELEFONO.length >= 2 && TELEFONO.length <= 8, `teléfono: ${TELEFONO.length} capturas por idioma (Play pide entre 2 y 8)`)
for (const c of ['es-419', 'en-US']) {
  const esperadas = TELEFONO.map((_, i) => `${String(i + 1).padStart(2, '0')}.png`)
  TELEFONO.forEach((e, i) => {
    const rel = `capturas/${c}/${esperadas[i]}`
    lados(rel, imagen(rel, deLado(e) ? 1920 : 1080, deLado(e) ? 1080 : 1920, 8), 320, 3840)
  })
  soloEstas(`capturas/${c}`, esperadas)
}

console.log('— Aire entre los renglones de los titulares')
// -Javier, 05-10-2026- La franja amarilla del segundo renglón no puede tocar el primero: entre la parte
// más baja del primer renglón y el borde de arriba de la franja, al menos 16 px a 1080 de ancho, y
// proporcional al ancho en los otros tamaños. Se mide en los píxeles del PNG -aire.cjs-. La zona del
// titular llega hasta donde empieza la pantalla -componer.cjs, marcoTelefono: 420 de pie, 250 de lado-,
// y se sube hasta un renglón y medio de la letra -80 y 66- buscando el renglón de arriba. Las tabletas
// no llevan titular. Un titular de un renglón no tiene nada que medir y lo dice.
for (const c of ['es-419', 'en-US']) TELEFONO.forEach((e, i) => {
  const rel = `capturas/${c}/${String(i + 1).padStart(2, '0')}.png`
  if (!fs.existsSync(path.join(FICHA, rel))) return
  const lado = deLado(e)
  const ancho = lado ? 1920 : 1080
  const minimo = Math.ceil(16 * ancho / 1080)
  const aires = aireDeTitular(path.join(FICHA, rel), { altoZona: lado ? 250 : 420, ventana: lado ? 106 : 128 })
  if (!aires.length) return console.log(`OK    ${rel}: titular de un renglón, sin franja debajo de otro`)
  for (const { y, aire } of aires) ok(aire >= minimo, `${rel}: aire de ${aire} px sobre la franja de la fila ${y} (al menos ${minimo})`)
})

console.log('— Capturas de tableta')
// Antes, en capturas/tableta-provisional/, con «al menos 4» contados en la carpeta.
const TAB = { 7: [1440, 2560], 10: [2160, 3840] }
ok(!fs.existsSync(path.join(FICHA, 'capturas/tableta-provisional')), 'capturas/tableta-provisional/ ya no está: la tableta de la tarea 83 está en main')
for (const c of ['es-419', 'en-US']) for (const [p, [a, b]] of Object.entries(TAB)) {
  const lista = TABLETA[p] || []
  ok(lista.length >= 4, `tableta ${p}" ${c}: ${lista.length} capturas (Play pide al menos 4)`)
  for (const e of lista) {
    const rel = `capturas/tableta/${c}/${p}/${e.nombre}.png`
    lados(rel, imagen(rel, deLado(e) ? b : a, deLado(e) ? a : b, 8), 1080, 7680)
  }
  soloEstas(`capturas/tableta/${c}/${p}`, lista.map((e) => `${e.nombre}.png`))
}

console.log('— Lámina')
// La lámina no va a Play: solo se mira que exista, sin alfa y con un peso razonable.
const lamina = fs.existsSync(path.join(FICHA, 'lamina-ficha.png')) ? png(path.join(FICHA, 'lamina-ficha.png')) : null
imagen('lamina-ficha.png', lamina?.w || 0, lamina?.h || 0, 50, true)

console.log('— Textos')
const largo = (s) => [...s].length
const EMOJI = /\p{Extended_Pictographic}/u
const PROHIBIDAS_BREVE = /\b(best|#1|top|new|free|mejor|gratis|nuevo|nueva|descarga|download|install|instala)\b|n\.º ?1/i
for (const archivo of ['textos-es-419.txt', 'textos-en-US.txt']) {
  const t = fs.readFileSync(path.join(FICHA, archivo), 'utf8')
  const bloques = [...t.matchAll(/\[\[([\s\S]*?)\]\]/g)].map((m) => m[1])
  ok(bloques.length === 3, `${archivo}: 3 bloques [[ ]] -nombre, breve, completa- (hay ${bloques.length})`)
  const [nombre, breve, completa] = bloques
  ok(largo(nombre) <= 30, `${archivo}: nombre "${nombre}" ${largo(nombre)} de 30`)
  ok(largo(breve) <= 80, `${archivo}: breve ${largo(breve)} de 80`)
  ok(!PROHIBIDAS_BREVE.test(breve), `${archivo}: breve sin palabras que Play no quiere -mejor, gratis, nuevo, descarga-`)
  ok(largo(completa) <= 4000, `${archivo}: completa ${largo(completa)} de 4000`)
  // -05-10-2026- AVISO y no FALLA, como dice la cabecera: 1500 a 2500 es lo ideal del encargo de la 86,
  // y el límite de Play es 4000. Con lo que Javier pidió sumar el 05-10 -la pausa, los gestos, los
  // filtros, la tableta- la completa pasa de 2500. Antes: ok(...), que la contaba como falla.
  aviso(largo(completa) >= 1500 && largo(completa) <= 2500, `${archivo}: completa ${largo(completa)}, lo ideal del encargo es entre 1500 y 2500`)
  for (const s of bloques) {
    ok(!EMOJI.test(s) && !/…|--|!!|\?\?/.test(s), `${archivo}: "${s.slice(0, 32)}…" sin emojis ni puntuación repetida`)
  }
}

console.log('— Titulares de las capturas')
// Por escena, en el orden de escenas.cjs. Antes: lista.forEach sobre un arreglo de 8.
for (const [i, porEscena] of Object.entries(TITULARES)) TELEFONO.forEach((e, n) => {
  const t = porEscena[e.nombre]
  if (!t) return ok(false, `${i} ${n + 1}: falta el titular de ${e.nombre}`)
  const palabras = t.titular.replace(/==|\|/g, ' ').split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length
  ok(palabras <= 7, `${i} ${n + 1}: "${t.titular.replace(/==|\|/g, '')}" ${palabras} palabras de 7`)
})

console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK')
process.exit(fallas ? 1 : 0)
