// EL BANCO DEL MOTOR -13-10-2026-: `npm run banco`. NO es parte de `npm test`.
//
// Repite todas las tomas grabadas con el motor de hoy y saca sus cifras -la cuenta vive en
// src/pruebas/bancoMotor.ts, con lo que mide cada columna-. Imprime una tabla por toma y los
// totales por grupo, y guarda todo en docs/mediciones/banco-motor/<AAAA-MM-DD>-<commit>.json.
// No toca el motor: si una cifra cambia de un dia a otro, cambio el codigo, no el banco.
//
// Corre con vite-node -viene con vitest, no es una dependencia nueva- porque usa los modulos
// TypeScript de src/ tal cual.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
// Antes: import { medirTomaEnBanco, cifrasDe, juntarCrudos, CifrasBanco, CrudosToma } from '../src/pruebas/bancoMotor'
import { medirTomaEnBanco, cifrasDe, juntarCrudos, CifrasBanco, CrudosToma, OpcionesBanco } from '../src/pruebas/bancoMotor'
import { omegaParaAsentar } from '../src/lib/deslizar'

// LOS GRUPOS Y SUS CARPETAS. Larralde viene de la rama registros-tarea89, traido con
// `git checkout origin/registros-tarea89 -- docs/registros/tarea89/`.
const GRUPOS: Array<{ nombre: string; carpeta: string }> = [
  { nombre: 'Español', carpeta: 'docs/registros/motor-24-sep' },
  { nombre: 'Inglés', carpeta: 'docs/registros/ingles-27-sep' },
  { nombre: 'Larralde', carpeta: 'docs/registros/tarea89' }
]

function tomasEn(carpeta: string): string[] {
  if (!fs.existsSync(carpeta)) return []
  const r: string[] = []
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const p = path.join(carpeta, e.name)
    if (e.isDirectory()) r.push(...tomasEn(p))
    else if (e.name.endsWith('.motor.txt')) r.push(p)
  }
  return r.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
}

const f1 = (x: number | null) => (x !== null && Number.isFinite(x) ? x.toFixed(1) : '-')
const f0 = (x: number | null) => (x !== null && Number.isFinite(x) ? x.toFixed(0) : '-')
const COLUMNAS: Array<[string, (c: CifrasBanco) => string]> = [
  ['dif tel', (c) => (Number.isFinite(c.difTelefono) ? c.difTelefono.toFixed(2) : '-')],
  ['atraso med', (c) => f1(c.atrasoMedio)],
  ['p90', (c) => f1(c.atrasoP90)],
  ['tel med', (c) => f1(c.atrasoMedioTelefono)],
  ['tel p90', (c) => f1(c.atrasoP90Telefono)],
  ['vivo%', (c) => f0(c.renglonVivo)],
  ['abajo%', (c) => f0(c.renglonDeAbajo)],
  ['+abajo%', (c) => f0(c.masAbajo)],
  ['adel%', (c) => f0(c.pantallaAdelante)],
  ['cambios', (c) => String(c.cambiosDeRenglon)],
  ['ms quieto', (c) => f0(c.msHastaQuieto)],
  ['vel px/s', (c) => f0(c.velocidadMax)],
  // -resorte-: el tiron de arranque es la cifra principal; el de antes ahora se llama «salto max».
  // Antes: ['tiron', (c) => f0(c.tironMax)],
  ['tiron arranque', (c) => f0(c.tironInicioMax)],
  ['salto max', (c) => f0(c.tironMax)],
  ['ms mitad', (c) => f0(c.msMitad)],
  ['pasada', (c) => f1(c.pasadaMax)],
  ['solapes', (c) => String(c.solapes)],
  ['tiron motor', (c) => f1(c.tironMotor)],
  ['dest med', (c) => f1(c.destacadoMedio)],
  ['dest max', (c) => f1(c.destacadoMax)],
  ['cuadro med', (c) => f0(c.cuadroMediana)],
  ['p95', (c) => f0(c.cuadroP95)],
  ['max', (c) => f0(c.cuadroMax)],
  ['>50', (c) => String(c.cuadrosSobre50)]
]

function fila(nombre: string, c: CifrasBanco): string {
  return `| ${nombre} | ${COLUMNAS.map(([, f]) => f(c)).join(' | ')} |`
}

// El seguidor avisa por consola cada final que no ubica -conduccion.ts, solo con HERRAMIENTAS-.
// En el banco son cientos de lineas que tapan la tabla: se cuentan y se dice cuantas fueron.
let avisosSeguidor = 0
const warnOriginal = console.warn
console.warn = (...a: unknown[]) => {
  if (typeof a[0] === 'string' && a[0].startsWith('[Seguidor]')) { avisosSeguidor++; return }
  warnOriginal(...a)
}

const commit = execSync('git rev-parse --short HEAD').toString().trim()
// La fecha del reloj de la caja -la de Javier-, no la de UTC.
const hoy = new Date()
const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
const salida: any = { fecha, commit, columnas: COLUMNAS.map(([n]) => n), grupos: [] }
const lineas: string[] = []
lineas.push(`| toma | ${COLUMNAS.map(([n]) => n).join(' | ')} |`)
lineas.push(`|${'---|'.repeat(COLUMNAS.length + 1)}`)
const totales: string[] = [lineas[0], lineas[1]]

for (const g of GRUPOS) {
  const archivos = tomasEn(g.carpeta)
  const crudos: CrudosToma[] = []
  const tomas: any[] = []
  for (const a of archivos) {
    const r = medirTomaEnBanco(fs.readFileSync(a, 'utf8'))
    crudos.push(r.crudos)
    const corto = path.relative(g.carpeta, a).replace(/\.motor\.txt$/, '')
    tomas.push({ archivo: a, cifras: r.cifras, avisos: r.avisos })
    lineas.push(fila(`${g.nombre} ${corto.length > 24 ? corto.slice(0, 24) : corto}`, r.cifras))
    for (const av of r.avisos) console.warn(`  aviso ${a}: ${av}`)
  }
  const total = cifrasDe(juntarCrudos(crudos))
  totales.push(fila(`**${g.nombre}** (${archivos.length})`, total))
  salida.grupos.push({ nombre: g.nombre, carpeta: g.carpeta, tomas, total })
}

// HOY CONTRA EL RESORTE -13-10-2026, resorte-sin-rebote-: el mismo banco deslizando de las cuatro
// maneras, solo las cifras del deslizamiento. El resorte asienta al 98% en 250, 300 y 350 ms.
const MANERAS: Array<{ nombre: string; deslizar: OpcionesBanco['deslizar'] }> = [
  { nombre: 'hoy', deslizar: 'hoy' },
  ...[250, 300, 350].map((ms) => ({ nombre: `resorte ${ms} (w=${omegaParaAsentar(ms).toFixed(4)})`, deslizar: { omega: omegaParaAsentar(ms) } }))
]
// -14-10-2026-: mas la columna topes, cuantas veces actuo el tope del resorte.
// Antes:
// '| grupo | manera | tiron arranque max | tiron arranque med | salto max | vel px/s | ms quieto | ms mitad | solapes | pasada |',
// '|---|---|---|---|---|---|---|---|---|---|'
const comparacion: string[] = [
  '| grupo | manera | tiron arranque max | tiron arranque med | salto max | vel px/s | ms quieto | ms mitad | solapes | pasada | topes |',
  '|---|---|---|---|---|---|---|---|---|---|---|'
]
salida.comparacionResorte = []
for (const g of GRUPOS) {
  for (const m of MANERAS) {
    const c = cifrasDe(juntarCrudos(tomasEn(g.carpeta).map((a) => medirTomaEnBanco(fs.readFileSync(a, 'utf8'), { deslizar: m.deslizar }).crudos)))
    comparacion.push(`| ${g.nombre} | ${m.nombre} | ${f0(c.tironInicioMax)} | ${f0(c.tironInicioMedio)} | ${f0(c.tironMax)} | ${f0(c.velocidadMax)} | ${f0(c.msHastaQuieto)} | ${f0(c.msMitad)} | ${c.solapes} | ${f1(c.pasadaMax)} | ${c.topesResorte} |`)
    salida.comparacionResorte.push({ grupo: g.nombre, manera: m.nombre, cifras: c })
  }
}

console.log(`(${avisosSeguidor} finales que el seguidor no ubico, sin imprimir)`)
console.log('\nPOR TOMA\n' + lineas.join('\n'))
console.log('\nTOTALES POR GRUPO\n' + totales.join('\n'))
console.log('\nHOY CONTRA EL RESORTE\n' + comparacion.join('\n'))
const destino = `docs/mediciones/banco-motor/${fecha}-${commit}.json`
fs.mkdirSync(path.dirname(destino), { recursive: true })
fs.writeFileSync(destino, JSON.stringify(salida, null, 1) + '\n')
console.log(`\nguardado en ${destino}`)
