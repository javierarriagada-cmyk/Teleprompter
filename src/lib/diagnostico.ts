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
  | { ms: number; tipo: 'cuadro'; posicion: number; calce: number; scroll: number; freno: string; trabado: number }
  // LA VARA DEL MOTOR -24-09-2026-. Las palabras que el reconocedor nativo ubico en el
  // audio, cada una con el milisegundo en que empezo y termino de decirse, en el MISMO
  // reloj que el resto. ms es cuando llegaron. La diferencia entre las dos es el
  // retraso del reconocedor; y con estas y 'cuadro' sale a cuantas palabras y
  // renglones va la pantalla de la voz.
  | { ms: number; tipo: 'palabras'; final: boolean; palabras: Array<{ w: string; ini: number; fin: number }> }
  // Que palabras caen en cada renglon de la pantalla: el primer token de cada uno. Se
  // anota al empezar y cada vez que cambia -otra letra, otro ancho-. Sin esto el
  // atraso solo se puede medir en palabras, y el que lee lo siente en renglones.
  | { ms: number; tipo: 'renglones'; inicios: number[] }
  // Cuando el lado nativo entrego cada resultado, en el reloj del registro. ms menos
  // nativo es lo que tarda en cruzar a JavaScript: separa la demora de Vosk de la
  // del telefono.
  | { ms: number; tipo: 'llegada'; final: boolean; nativo: number
      // -24-09-2026, el oido propio-: en que ms del registro termina el trozo de audio,
      // cuando se leyo del microfono, cuando termino Vosk, y el nivel del trozo -0 a 1-.
      audio?: number; leido?: number; procesado?: number; rms?: number }
  // El arranque del oido: donde quedo guardado el audio que escucho Vosk y de a
  // cuantas muestras lo lee. Con el audio se afina el reconocedor en el PC.
  | { ms: number; tipo: 'oido'; inicio: number; ruta: string; muestrasPorTrozo: number }

const MAX_ENTRADAS = 60000

let activo = false
let entradas: EntradaDiagnostico[] = []
let t0 = 0
// Cuenta cada vez que se enciende. Lo que se anota una sola vez por lectura -los
// renglones- mira esto para volver a anotarse si el registro empezo despues.
let generacion = 0

export function activarDiagnostico(valor: boolean) {
  activo = valor
  if (valor) {
    entradas = []
    t0 = performance.now()
    generacion++
  }
}

export function generacionDiagnostico(): number {
  return generacion
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

// Para anotar un instante que no es "ahora" -el tiempo de una palabra en el audio-
// en el mismo reloj del registro.
export function msDelRegistro(msPerformance: number): number {
  return Math.round(msPerformance - t0)
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
    } else if (e.tipo === 'palabras') {
      filas.push(`${e.ms}\tpalabras\t${e.final ? 'FINAL' : 'parcial'}: ${e.palabras.map((p) => `${p.w}@${p.ini}-${p.fin}`).join(' ')}`)
    } else if (e.tipo === 'renglones') {
      filas.push(`${e.ms}\trenglones\t${e.inicios.join(' ')}`)
    } else if (e.tipo === 'llegada') {
      const extra = e.audio === undefined ? '' : ` audio=${e.audio} leido=${e.leido} procesado=${e.procesado} rms=${(e.rms ?? 0).toFixed(4)}`
      filas.push(`${e.ms}\tllegada\t${e.final ? 'FINAL' : 'parcial'} nativo=${e.nativo}${extra}`)
    } else if (e.tipo === 'oido') {
      filas.push(`${e.ms}\toido\tinicio=${e.inicio} trozo=${e.muestrasPorTrozo} ruta=${e.ruta}`)
    } else {
      filas.push(
        `${e.ms}\tcuadro\tpos=${e.posicion.toFixed(2)} calce=${e.calce} scroll=${e.scroll} freno=${e.freno} trabado=${e.trabado}`
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
