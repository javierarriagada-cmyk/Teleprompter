// ARMA ../textos-es-419.txt y ../textos-en-US.txt desde textos.cjs -tarea 86-. node armar-textos.cjs
// Cuenta caracteres como Play: por carácter visible -code point-, no por byte; "—" y "á" valen 1.
// comprobar.cjs vuelve a contar desde los .txt, así que un texto editado a mano también se revisa.
const fs = require('fs')
const path = require('path')
const T = require('./textos.cjs')
const largo = (s) => [...s].length
const RAYA = '='.repeat(78)
for (const t of Object.values(T)) {
  const partes = [
    `FICHA DE SIGO EN GOOGLE PLAY — ${t.idioma}`,
    'Generado por herramientas/armar-textos.cjs desde herramientas/textos.cjs. Los conteos son de la máquina.',
    'Lo que va entre dobles corchetes se copia tal cual a Play Console; lo demás son notas.',
    '',
    RAYA, `NOMBRE (máximo 30) — ${largo(t.nombre)} caracteres`, RAYA,
    `[[${t.nombre}]]`, t.nombreNota, '',
    'Alternativas, SOLO si Javier decide cambiarlo (opcionales):',
    ...t.nombresAlternativos.map(([n, nota], i) => `  ${i + 1}. {{${n}}} — ${largo(n)} caracteres. ${nota}`), '',
    RAYA, 'DESCRIPCIÓN BREVE (máximo 80) — tres propuestas; se elige una', RAYA,
    ...t.breves.flatMap(([b, nota], i) => [`Propuesta ${'ABC'[i]} — ${largo(b)} caracteres. ${nota}`, `[[${b}]]`, '']),
    RAYA, `DESCRIPCIÓN COMPLETA (máximo 4000; ideal 1500 a 2500) — ${largo(t.completa)} caracteres`, RAYA,
    `[[${t.completa}]]`, ''
  ]
  fs.writeFileSync(path.join(__dirname, '..', t.archivo), partes.join('\n'))
  console.log(`  ${t.archivo}: nombre ${largo(t.nombre)}, breves ${t.breves.map(([b]) => largo(b)).join('/')}, completa ${largo(t.completa)}`)
  for (const [n] of t.nombresAlternativos) console.log(`    alternativa "${n}": ${largo(n)}`)
}
