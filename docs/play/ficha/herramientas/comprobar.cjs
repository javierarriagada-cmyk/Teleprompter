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
const fs = require('fs')
const path = require('path')
const FICHA = path.resolve(__dirname, '..')
const TITULARES = require('./titulares.cjs')
let fallas = 0
const ok = (bien, que) => { if (!bien) fallas++; console.log(`${bien ? 'OK   ' : 'FALLA'} ${que}`) }

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
}

console.log('— Gráfico de funciones')
for (const i of ['es', 'en']) imagen(`grafico-1024x500-${i}.png`, 1024, 500, 15)

console.log('— Capturas de teléfono')
for (const c of ['es-419', 'en-US']) for (let n = 1; n <= 8; n++) imagen(`capturas/${c}/${String(n).padStart(2, '0')}.png`, n === 4 ? 1920 : 1080, n === 4 ? 1080 : 1920, 8)

console.log('— Capturas de tableta (provisionales)')
const TAB = { 7: [1440, 2560], 10: [2160, 3840] }
for (const c of ['es-419', 'en-US']) for (const [p, [a, b]] of Object.entries(TAB)) {
  const dir = path.join(FICHA, 'capturas/tableta-provisional', c, p)
  const lista = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort() : []
  ok(lista.length >= 4, `tableta ${p}" ${c}: ${lista.length} capturas (Play pide al menos 4)`)
  for (const f of lista) {
    const lado = f.includes('de-lado')
    imagen(`capturas/tableta-provisional/${c}/${p}/${f}`, lado ? b : a, lado ? a : b, 8)
  }
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
  ok(largo(completa) >= 1500 && largo(completa) <= 2500, `${archivo}: completa entre 1500 y 2500 -lo ideal del encargo-`)
  for (const s of bloques) {
    ok(!EMOJI.test(s) && !/…|--|!!|\?\?/.test(s), `${archivo}: "${s.slice(0, 32)}…" sin emojis ni puntuación repetida`)
  }
}

console.log('— Titulares de las capturas')
for (const [i, lista] of Object.entries(TITULARES)) lista.forEach(({ titular }, n) => {
  const palabras = titular.replace(/==|\|/g, ' ').split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length
  ok(palabras <= 7, `${i} ${n + 1}: "${titular.replace(/==|\|/g, '')}" ${palabras} palabras de 7`)
})

console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK')
process.exit(fallas ? 1 : 0)
