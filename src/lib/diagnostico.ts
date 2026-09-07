// Registro de diagnostico de una lectura.
//
// Guarda tres capas alineadas en el tiempo, para poder separar las tres causas posibles
// cuando algo se siente mal al leer:
//
//   OYO     lo que el reconocedor entrego, textual. Es lo mas cerca de la voz que se
//           puede guardar en texto.
//   CALCE   que hizo el seguidor con eso: en que palabra del guion lo ubico, o si no
//           lo reconocio.
//   CUADRO  que dibujo la vista: posicion del motor, ultimo calce y desplazamiento.
//
// Con las tres en la misma linea de tiempo se puede abrir el instante exacto de un
// tiron y ver si el problema fue que no oyo, que no calzo, o que el desplazamiento
// brinco con la posicion viniendo suave.
//
// Apagado por omision: no cuesta nada mientras no se enciende.

export type EntradaDiagnostico =
  | { ms: number; tipo: 'oyo'; texto: string; final: boolean }
  | { ms: number; tipo: 'calce'; token: number | null; texto: string }
  | { ms: number; tipo: 'cuadro'; posicion: number; calce: number; scroll: number; freno: string }

const MAX_ENTRADAS = 60000

let activo = false
let entradas: EntradaDiagnostico[] = []
let t0 = 0

export function activarDiagnostico(valor: boolean) {
  activo = valor
  if (valor) {
    entradas = []
    t0 = performance.now()
  }
}

export function diagnosticoActivo(): boolean {
  return activo
}

type SinMs<T> = T extends { ms: number } ? Omit<T, 'ms'> & { ms?: number } : never

export function anotar(e: SinMs<EntradaDiagnostico>) {
  if (!activo) return
  if (entradas.length >= MAX_ENTRADAS) return
  const ms = Math.round((e.ms ?? performance.now()) - t0)
  entradas.push({ ...e, ms } as EntradaDiagnostico)
}

export function cantidadEntradas(): number {
  return entradas.length
}

// Una linea por entrada, separada por tabuladores, para que se pueda leer de corrido y
// tambien abrir en una planilla.
export function comoTexto(): string {
  const filas: string[] = ['ms\ttipo\tdetalle']
  for (const e of entradas) {
    if (e.tipo === 'oyo') {
      filas.push(`${e.ms}\toyo\t${e.final ? 'FINAL' : 'parcial'}: ${e.texto}`)
    } else if (e.tipo === 'calce') {
      filas.push(`${e.ms}\tcalce\t${e.token === null ? 'NO CALZO' : 'token ' + e.token}: ${e.texto}`)
    } else {
      filas.push(
        `${e.ms}\tcuadro\tpos=${e.posicion.toFixed(2)} calce=${e.calce} scroll=${e.scroll} freno=${e.freno}`
      )
    }
  }
  return filas.join('\n')
}

export function descargar() {
  const blob = new Blob([comoTexto()], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const f = new Date()
  const dd = (n: number) => String(n).padStart(2, '0')
  a.href = url
  a.download = `lectura-${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}-${dd(f.getHours())}${dd(f.getMinutes())}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
