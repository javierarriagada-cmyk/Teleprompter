import { crearCompactadorCuadros, filaCuadros } from '../lib/diagnostico'

// UN REGISTRO VIEJO PASADO A LA BITÁCORA NUEVA -banco-largo, 17-10-2026-, para las pruebas y para medir
// cuánto pesa. Es lo que habría escrito el teléfono con 'cuadro' solo cuando cambia: el mismo
// compactador que anotar -lib/diagnostico.ts-, fila por fila. La clave es el detalle de la fila, que
// es lo que escribe claveDeCuadro; las demás filas quedan tal cual.
export function compactarRegistro(texto: string): string {
  const comp = crearCompactadorCuadros()
  const salida: string[] = []
  const msDe: number[] = []   // el ms de cada fila de salida, NaN en la cabecera
  for (const l of texto.split(/\r?\n/)) {
    const c = l.split('\t')
    const ms = c.length >= 3 && /^\d+$/.test(c[0]) ? Number(c[0]) : NaN
    if (c[1] === 'cuadro' && !Number.isNaN(ms)) {
      const r = comp.cuadro(ms, c[2])
      if (r.escribir) { salida.push(l); msDe.push(ms) }
      if (r.resumen) { salida.push(filaCuadros(ms, r.resumen)); msDe.push(ms) }
      continue
    }
    salida.push(l)
    msDe.push(ms)
  }
  // El tramo abierto, tras la última fila con ms hasta el de su último cuadro -como comoTexto-.
  const abierto = comp.pendiente()
  if (abierto) {
    let k = salida.length
    while (k > 0 && (Number.isNaN(msDe[k - 1]) ? salida[k - 1] === '' : msDe[k - 1] > abierto.ms)) k--
    salida.splice(k, 0, filaCuadros(abierto.ms, abierto.resumen))
  }
  return salida.join('\n')
}
