import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'

// BANCO LARGO, SUBTÍTULOS SIN CORTE Y BITÁCORA FUERA DE PLAY -banco-largo, 17-10-2026-. Solo lógica.
// Esta tanda corre con las herramientas -la APK de prueba-; sin ellas, bancoLargo-play.test.ts.

const archivos: Record<string, string> = {}
vi.mock('../lib/archivosNativos', () => ({
  directorioGrabaciones: async () => '/grabaciones',
  juntos: (a: string, b: string) => `${a}/${b}`,
  leerTexto: async (ruta: string) => {
    if (!(ruta in archivos)) throw new Error('leerTexto: no existe ' + ruta)
    return archivos[ruta]
  }
}))

import {
  activarDiagnostico,
  anotar,
  comoTexto,
  msDelRegistro,
  abrirPalabrasDeToma,
  cerrarPalabrasDeToma,
  palabrasComoTexto,
  MAX_ENTRADAS
} from '../lib/diagnostico'
import { armarSubtitulos } from '../lib/subtitulos'
import { textoDeSubtitulos } from '../lib/archivosDeToma'
import { leerCorpus, repetirLectura } from '../lib/repetidor'
import { medirTomaEnBanco, cifrasDe, juntarCrudos } from './bancoMotor'
import { compactarRegistro } from './compactarRegistro'

const CABECERA = (guion: string) =>
  ['# motor de voz: nativo', '# ---------- GUION, TAL CUAL SE LEYO ----------', ...guion.split('\n').map((l) => `# | ${l}`), '# ---------------------------------------------', ''].join('\n')

// Una toma de 30 min como la del Redmi: la vista anota un cuadro cada 16 ms -el texto avanzando-, y cada
// 2 s llega un final con dos palabras y su calce. Devuelve el guion leído.
function tomaDe30Min(): { guion: string; ultimaPalabraMs: number } {
  const t0 = -msDelRegistro(0)
  const palabras: string[] = []
  let ultimaPalabraMs = 0
  const DURACION = 30 * 60 * 1000
  let k = 0
  for (let ms = 0; ms <= DURACION; ms += 16) {
    anotar({ tipo: 'cuadro', posicion: ms / 1000, calce: Math.floor(ms / 1000), scroll: Math.floor(ms / 400), freno: '-', trabado: Math.floor(ms / 8000), ms: t0 + ms })
    if (ms % 2000 === 0 && ms > 0) {
      const a = `palabra${k}`
      const b = `otra${k}`
      palabras.push(a, b)
      anotar({ tipo: 'oyo', texto: `${a} ${b}`, final: true, ms: t0 + ms })
      anotar({ tipo: 'palabras', final: true, palabras: [{ w: a, ini: ms - 900, fin: ms - 500 }, { w: b, ini: ms - 450, fin: ms - 100 }], ms: t0 + ms })
      anotar({ tipo: 'calce', token: palabras.length - 1, texto: `${a} ${b}`, ms: t0 + ms + 1 })
      ultimaPalabraMs = ms - 100
      k++
    }
  }
  return { guion: palabras.join(' '), ultimaPalabraMs }
}

describe('banco-largo: las palabras de la toma', () => {
  beforeEach(() => {
    for (const k of Object.keys(archivos)) delete archivos[k]
  })
  afterEach(() => {
    cerrarPalabrasDeToma()
    activarDiagnostico(false)
  })

  test('BL1 una toma de 30 min tiene sus palabras hasta el final -y la bitácora completa también-', () => {
    abrirPalabrasDeToma()
    activarDiagnostico(true)
    const { guion, ultimaPalabraMs } = tomaDe30Min()
    cerrarPalabrasDeToma()
    const palabras = CABECERA(guion) + palabrasComoTexto()
    const subs = armarSubtitulos(palabras)
    expect(subs.length).toBeGreaterThan(0)
    const ultimo = subs[subs.length - 1]
    const ultimaPalabra = ultimo.renglones[ultimo.renglones.length - 1]
    expect(ultimaPalabra[ultimaPalabra.length - 1].texto).toBe(guion.split(' ').pop())
    expect(ultimaPalabra[ultimaPalabra.length - 1].hastaMs).toBe(ultimaPalabraMs)
    // Lo de antes: con 60000 filas la bitácora se cortaba a los ~11 min. Ahora llega al final y no dice tope.
    const bitacora = comoTexto()
    expect(bitacora).not.toMatch(/\ttope\t/)
    const filas = bitacora.split('\n')
    expect(filas.length).toBeLessThan(MAX_ENTRADAS)
    const ultimaPalabras = filas.filter((l) => l.split('\t')[1] === 'palabras').pop()!
    expect(ultimaPalabras).toContain(guion.split(' ').pop()!)
  })

  test('BL2 una toma vieja sin archivo de palabras saca sus subtítulos del .motor.txt; una nueva, de su .palabras.txt', async () => {
    const guion = 'Hola a todos los que miran esto.'
    const viejo = CABECERA(guion) + 'ms\ttipo\tdetalle\n100\tpalabras\tFINAL: hola@100-400 a@420-500 todos@520-900\n'
    archivos['/grabaciones/vieja.motor.txt'] = viejo
    expect(await textoDeSubtitulos('vieja')).toBe(viejo)
    expect(armarSubtitulos((await textoDeSubtitulos('vieja'))!).length).toBeGreaterThan(0)
    // La nueva tiene los dos: manda el de palabras.
    archivos['/grabaciones/nueva.motor.txt'] = viejo
    archivos['/grabaciones/nueva.palabras.txt'] = CABECERA(guion) + 'ms\ttipo\tdetalle\n100\tpalabras\tFINAL: hola@100-400\n'
    expect(await textoDeSubtitulos('nueva')).toBe(archivos['/grabaciones/nueva.palabras.txt'])
    // Sin ninguno -toma de la web, o de antes del registro-, null.
    expect(await textoDeSubtitulos('sin-nada')).toBeNull()
  })

  test('BL3 dos cuadros iguales seguidos dejan una sola fila cuadro; cada 5 s va la fila cuadros', () => {
    activarDiagnostico(true)
    const t0 = -msDelRegistro(0)
    const cuadro = (ms: number, pos: number) => anotar({ tipo: 'cuadro', posicion: pos, calce: 3, scroll: 120, freno: '-', trabado: 1, ms: t0 + ms })
    cuadro(0, 3.5)
    cuadro(16, 3.5)
    cuadro(32, 3.501)   // con dos decimales es la misma fila
    cuadro(48, 3.52)
    let filas = comoTexto().split('\n').filter((l) => l.split('\t')[1] === 'cuadro')
    expect(filas).toEqual(['0\tcuadro\tpos=3.50 calce=3 scroll=120 freno=- trabado=1', '48\tcuadro\tpos=3.52 calce=3 scroll=120 freno=- trabado=1'])
    // Un tramo de 5 s: 313 cuadros, uno de 80 ms.
    for (let ms = 64; ms <= 5008; ms += 16) cuadro(ms === 2000 ? 2064 : ms, 3.52)
    const resumen = comoTexto().split('\n').filter((l) => l.split('\t')[1] === 'cuadros')
    expect(resumen).toHaveLength(1)
    expect(resumen[0]).toMatch(/^5008\tcuadros\tn=\d+ mediana=16 p95=16 max=\d+ sobre50=1$/)
    filas = comoTexto().split('\n').filter((l) => l.split('\t')[1] === 'cuadro')
    expect(filas).toHaveLength(2)
  })

  test('BL4 un registro viejo da las mismas cifras en el banco que en main e62dec7, y su forma nueva la misma vara', () => {
    const json = JSON.parse(fs.readFileSync('docs/mediciones/banco-motor/2026-10-17-e62dec7.json', 'utf8'))
    const ruta = 'docs/registros/tarea89/1-vertical-1080p-1b30bd7e.motor.txt'
    const deMain = json.grupos.flatMap((g: any) => g.tomas).find((t: any) => t.archivo === ruta)
    expect(deMain).toBeTruthy()
    const texto = fs.readFileSync(ruta, 'utf8')
    const hoy = medirTomaEnBanco(texto)
    expect(JSON.parse(JSON.stringify(hoy.cifras))).toEqual(deMain.cifras)
    // La misma toma escrita como la bitácora nueva: menos filas, y lo que sale de la vara es igual.
    const nueva = compactarRegistro(texto)
    expect(nueva.split('\n').length).toBeLessThan(texto.split('\n').length)
    const deNueva = medirTomaEnBanco(nueva)
    expect(deNueva.cifras.atrasoMedioTelefono).toBe(hoy.cifras.atrasoMedioTelefono)
    expect(deNueva.cifras.atrasoP90Telefono).toBe(hoy.cifras.atrasoP90Telefono)
    expect(deNueva.cifras.cuadroMax).toBe(hoy.cifras.cuadroMax)
    expect(deNueva.cifras.cuadrosSobre50).toBe(hoy.cifras.cuadrosSobre50)
    // Los cuadros que no se escribieron vuelven: el banco repite los mismos pasos.
    expect(repetirLectura(leerCorpus(nueva), { comoElTelefono: true }).serie.length).toBe(repetirLectura(leerCorpus(texto), { comoElTelefono: true }).serie.length)
  })

  test('BL5 Math.max sobre 200.000 valores no revienta: el repetidor y el banco recorren', () => {
    const N = 200000
    const grande = Array.from({ length: N }, (_, i) => i % 97)
    // Lo que había: con «...» revienta la pila.
    expect(() => Math.max(...grande)).toThrow(RangeError)
    // El banco: el máximo de los intervalos.
    const crudos = { atrasoPal: [], atrasoPalTelefono: [], atrasoRen: [], cambios: [], solapes: 0, adelantoDestacado: [], intervalos: grande, difTelefono: [], tironesMotor: grande, topesResorte: 0, tramosCuadros: [] }
    const c = cifrasDe(juntarCrudos([crudos]))
    expect(c.cuadroMax).toBe(96)
    expect(c.tironMotor).toBe(96)
    // El repetidor: 200.000 eventos.
    const lineas = [CABECERA('uno dos tres'), 'ms\ttipo\tdetalle']
    for (let i = 0; i < N; i++) lineas.push(`${i * 16}\tcuadro\tpos=0.00 calce=0`)
    lineas.push(`${N * 16}\toyo\tFINAL: uno dos tres`)
    const corpus = leerCorpus(lineas.join('\n'))
    expect(corpus.eventos.length).toBe(N + 1)
    expect(() => repetirLectura(corpus)).not.toThrow()
  })
})
