// ARMA ../textos-es-419.txt y ../textos-en-US.txt desde textos.cjs -tarea 86-. node armar-textos.cjs
// Cuenta caracteres como Play: por carácter visible -code point-, no por byte; "—" y "á" valen 1.
// comprobar.cjs vuelve a contar desde los .txt, así que un texto editado a mano también se revisa.
// Desde la revisión de Javier -29-09-2026- hay un solo nombre y una sola breve: las elegidas. Las
// propuestas que no quedaron están en la historia del PR #60.
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
    RAYA, `DESCRIPCIÓN BREVE (máximo 80) — ${largo(t.breve)} caracteres`, RAYA,
    `[[${t.breve}]]`, t.breveNota, '',
    RAYA, `DESCRIPCIÓN COMPLETA (máximo 4000; ideal 1500 a 2500) — ${largo(t.completa)} caracteres`, RAYA,
    `[[${t.completa}]]`, ''
  ]
  fs.writeFileSync(path.join(__dirname, '..', t.archivo), partes.join('\n'))
  console.log(`  ${t.archivo}: nombre ${largo(t.nombre)}, breve ${largo(t.breve)}, completa ${largo(t.completa)}`)
}
