// LAS PÁGINAS DE 16 KB, .so POR .so -docs/play/ANTES-DE-SUBIR.txt, punto 4 y paso A3-.
//
//   node scripts/elf16k.mjs <carpeta con las .so>
//
// La prueba oficial -developer.android.com/guide/practices/page-sizes- tiene dos condiciones: cada LOAD
// alineado a 2^14, y el GNU_RELRO terminado en un múltiplo de 0x4000 cuando comparte su LOAD con datos
// escribibles que vienen después. Si el RELRO tiene su propio LOAD, un resto distinto de cero igual cumple
// -18-10-2026: libvosk.so y libsurface_util_jni.so-. Lo que mira npm run play -PAGE_ALIGNMENT_16K- es la
// declaración del paquete, no cada .so, y daba OK aunque libjnidispatch.so tuviera el RELRO mal -15-10-2026-.
// En este PC no hay readelf: los encabezados ELF64 se leen a mano.
//
// Nació en el scratchpad de Claude el 18-10-2026 y se usó con la 0.10.0, la 0.11.0 y la 0.11.1; vive aquí
// desde el 27-10-2026 para no perderse con la carpeta temporal. Sale con código 1 si alguna .so da FALLA, o si
// la carpeta no trae ninguna: una carpeta vacía no puede dar OK -el 18-10 una búsqueda en una carpeta vacía
// dio 0 en todo y parecía bien-.
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
if (!dir || !fs.existsSync(dir)) {
  console.error('uso: node scripts/elf16k.mjs <carpeta con las .so> -por ejemplo base/lib/arm64-v8a del .aab abierto-')
  process.exit(1)
}
const archivos = fs.readdirSync(dir).filter((x) => x.endsWith('.so'))
if (archivos.length === 0) {
  console.error(`FALLA  ${dir} no trae ninguna .so: no hay nada que revisar.`)
  process.exit(1)
}
let fallas = 0
for (const f of archivos) {
  const b = fs.readFileSync(path.join(dir, f))
  if (b.readUInt32BE(0) !== 0x7f454c46 || b[4] !== 2) { console.log(f, 'no es ELF64'); fallas++; continue }
  const phoff = Number(b.readBigUInt64LE(0x20)), phentsize = b.readUInt16LE(0x36), phnum = b.readUInt16LE(0x38)
  const loads = []
  let relro = null
  for (let i = 0; i < phnum; i++) {
    const o = phoff + i * phentsize
    const tipo = b.readUInt32LE(o)
    const vaddr = Number(b.readBigUInt64LE(o + 16)), memsz = Number(b.readBigUInt64LE(o + 40)), align = Number(b.readBigUInt64LE(o + 48))
    if (tipo === 1) loads.push({ vaddr, fin: vaddr + memsz, align })
    if (tipo === 0x6474e552) relro = { vaddr, fin: vaddr + memsz }
  }
  const malAlineados = loads.filter((l) => l.align < 0x4000).map((l) => '0x' + l.align.toString(16))
  let comparte = false, resto = 0
  if (relro) {
    const suyo = loads.find((l) => relro.vaddr >= l.vaddr && relro.vaddr < l.fin)
    comparte = !!suyo && relro.fin < suyo.fin
    resto = relro.fin % 0x4000
  }
  const ok = loads.length > 0 && malAlineados.length === 0 && (!comparte || resto === 0)
  if (!ok) fallas++
  console.log(`${f.padEnd(34)} LOAD ${loads.length}, alineacion ${[...new Set(loads.map((l) => '0x' + l.align.toString(16)))].join('/')}${malAlineados.length ? ' MAL ' + malAlineados : ''}; RELRO ${relro ? `fin % 0x4000 = ${resto}, comparte LOAD: ${comparte ? 'si' : 'no'}` : 'no tiene'} -> ${ok ? 'OK' : 'FALLA'}`)
}
if (fallas) process.exitCode = 1
