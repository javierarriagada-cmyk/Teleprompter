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
// -banco-largo, 17-10-2026- Y solo en la APK de prueba -HERRAMIENTAS-: en Play no se enciende.

import { HERRAMIENTAS } from './herramientas'

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
      audio?: number; leido?: number; procesado?: number; rms?: number
      // Cuantas veces el oido cambio de microfono por atraso -VoskNativoPlugin, el relevo-.
      relevos?: number }
  // El arranque del oido: donde quedo guardado el audio que escucho Vosk y de a
  // cuantas muestras lo lee. Con el audio se afina el reconocedor en el PC.
  | { ms: number; tipo: 'oido'; inicio: number; ruta: string; muestrasPorTrozo: number }
  // UN CALCE QUE NO SE APLICÓ -tarea 89, 04-10-2026-. 'calce' se anota ANTES de mirar la
  // ventana de conduccion.ts -ref - 10 a ref + 40-: un 'calce token 60' no prueba que el
  // motor se haya movido. Esta línea dice cuándo el calce cayó fuera y con qué ventana, y
  // dónde quedó el seguidor por dentro -que avanza aunque el motor no lo acepte-.
  | { ms: number; tipo: 'ventana'; token: number; ref: number; desde: number; hasta: number; final: boolean; seguidor: number }
  // QUIÉN MOVIÓ AL SEGUIDOR Y AL MOTOR SIN LA VOZ -tarea 89-: el arrastre del texto
  // -irAToken- o un seguidor nuevo -cambió el guion que recibe useSeguidor-. Los dos
  // vuelven a empezar el arranque del motor.
  // 'devuelto' -tercera vuelta-: la conducción rechazó un calce fuera de la ventana y devolvió el
  // seguidor a donde está el motor -conduccion.ts-.
  // 'reiniciado' -cuarta vuelta-: Parar terminó la toma -token 0- o el texto se movió en LISTO
  // -token N-; seguidor y motor quedan como recién creados -conduccion.ts, reiniciarToma-.
  | { ms: number; tipo: 'seguidor'; evento: 'irAToken' | 'creado' | 'devuelto' | 'reiniciado'; token: number }
  // LA PANTALLA QUE SE ESTABA LEYENDO -tarea 89-: el diseño y el tamaño del contenedor
  // del texto, junto a los renglones. De lado los renglones son otros.
  | { ms: number; tipo: 'pantalla'; diseno: string; ancho: number; alto: number }
  // EL VISOR DE LADO -tarea 90, 04-10-2026-: lo que Claude tiene que ver en el moto g86 -la barra de
  // estado que vuelve a ocultarse, el giro 270, la forma del video, los bordes de la WebView y la letra
  // del sistema-. evento es la primera palabra de la línea y detalle el resto, en clave=valor. Ver
  // src/lib/registroVisorLado.ts, que además las guarda fuera de la toma -el registro de diagnóstico
  // solo está encendido mientras se graba-.
  | { ms: number; tipo: 'visor-lado'; evento: string; detalle: string }
  // LOS CUADROS DE CADA 5 S -banco-largo, 17-10-2026-. Desde que 'cuadro' se anota solo cuando cambia
  // algo -ver anotar-, lo que el banco sacaba de cada cuadro va resumido aquí: cuántos cuadros se
  // dibujaron en el tramo y, de los intervalos entre uno y el anterior, la mediana, el p95, el máximo
  // y cuántos pasan de 50 ms. ms es el del último cuadro del tramo: el tramo va del 'cuadros' anterior
  // -o del primer cuadro- hasta aquí.
  | { ms: number; tipo: 'cuadros'; n: number; mediana: number; p95: number; max: number; sobre50: number }

// -banco-largo, 17-10-2026- EL TOPE, PARA QUE UNA TOMA DE 60 MIN QUEDE ENTERA. Con 60000 la bitácora se
// cortaba a los ~11 min -toma 8038ca25 del Redmi: 30:25 de video, bitácora hasta 686 s, 87 filas por
// segundo, 58 de ellas 'cuadro'-. Con 'cuadro' solo cuando cambia, esa misma toma da 44 filas por
// segundo -medido sobre su bitácora-; el peor caso, el texto moviéndose en todos los cuadros, vuelve a
// unas 92. 60 min a 100 filas por segundo son 360000. Solo en la APK de prueba: en Play no se anota.
// Antes: const MAX_ENTRADAS = 60000
export const MAX_ENTRADAS = 360000
// Cada cuánto va una fila 'cuadros'.
export const MS_TRAMO_CUADROS = 5000

let activo = false
let entradas: EntradaDiagnostico[] = []
let t0 = 0
// Cuenta cada vez que se enciende. Lo que se anota una sola vez por lectura -los
// renglones- mira esto para volver a anotarse si el registro empezo despues.
let generacion = 0
// -banco-largo- Si llegó al tope, en qué ms: la bitácora lo dice en vez de cortarse callada.
let cortadaEnMs: number | null = null

// EL FIN DE LA ÚLTIMA PALABRA DEL ÚLTIMO FINAL -tarea 88, segunda vuelta, 04-10-2026-, en el reloj de
// performance.now(). Lo lee el vigía de los gestos para cortar la pausa por palma donde terminó la voz
// -vigiaGestos.ts, oirFinal; pausaToma.ts, desdeDePalma-. Se anota aunque el registro esté apagado: no
// guarda nada más que este número.
let finUltimaPalabraPerf: number | null = null

// UNA FILA 'cuadro' SOLO CUANDO CAMBIA ALGO -banco-largo, 17-10-2026-. La vista anota un 'cuadro' en
// cada cuadro que dibuja -TeleprompterView, animate()-, unos 58 por segundo, y casi todos eran iguales
// al anterior: en la toma 8038ca25, 29813 de 40085. Se escribe solo si cambia lo que la fila dice -pos
// con sus dos decimales, calce, scroll, freno, trabado-; un cuadro que no se escribió es igual al
// último escrito. Lo que se pierde es la hora de cada cuadro: eso va resumido cada MS_TRAMO_CUADROS en
// una fila 'cuadros'. Es puro -sin reloj ni estado global- para que lo usen el registro y las pruebas.
export type ResumenCuadros = { n: number; mediana: number; p95: number; max: number; sobre50: number }
export type CompactadorCuadros = {
  // Un cuadro dibujado: si hay que escribir su fila y, si cerró un tramo, su resumen.
  cuadro(ms: number, clave: string): { escribir: boolean; resumen: ResumenCuadros | null }
  // El tramo que sigue abierto -null si no hubo cuadros desde el último resumen- y el ms de su último cuadro.
  pendiente(): { ms: number; resumen: ResumenCuadros } | null
}
// El mismo percentil que el banco -percentil de src/pruebas/alinearToma.js-, sobre una lista ordenada.
const enOrden = (orden: number[], p: number) => orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))]
export function resumirIntervalos(n: number, intervalos: number[]): ResumenCuadros {
  const orden = [...intervalos].sort((a, b) => a - b)
  let max = 0
  let sobre50 = 0
  for (const x of orden) {
    if (x > max) max = x
    if (x > 50) sobre50++
  }
  return orden.length
    ? { n, mediana: enOrden(orden, 50), p95: enOrden(orden, 95), max, sobre50 }
    : { n, mediana: 0, p95: 0, max: 0, sobre50: 0 }
}
export function crearCompactadorCuadros(msTramo: number = MS_TRAMO_CUADROS): CompactadorCuadros {
  let ultimaClave: string | null = null
  let ultimoMs: number | null = null
  let desdeMs: number | null = null
  let n = 0
  let intervalos: number[] = []
  return {
    cuadro(ms, clave) {
      if (ultimoMs !== null) intervalos.push(ms - ultimoMs)
      if (desdeMs === null) desdeMs = ms
      ultimoMs = ms
      n++
      const escribir = clave !== ultimaClave
      ultimaClave = clave
      let resumen: ResumenCuadros | null = null
      if (ms - desdeMs >= msTramo) {
        resumen = resumirIntervalos(n, intervalos)
        desdeMs = ms
        n = 0
        intervalos = []
      }
      return { escribir, resumen }
    },
    pendiente() {
      if (n === 0 || ultimoMs === null) return null
      return { ms: ultimoMs, resumen: resumirIntervalos(n, intervalos) }
    }
  }
}
// La fila 'cuadros' como va en la bitácora.
export function filaCuadros(ms: number, r: ResumenCuadros): string {
  return `${ms}\tcuadros\tn=${r.n} mediana=${r.mediana} p95=${r.p95} max=${r.max} sobre50=${r.sobre50}`
}
export function claveDeCuadro(e: { posicion: number; calce: number; scroll: number; freno: string; trabado: number }): string {
  return `pos=${e.posicion.toFixed(2)} calce=${e.calce} scroll=${e.scroll} freno=${e.freno} trabado=${e.trabado}`
}
let compactador = crearCompactadorCuadros()

// LAS PALABRAS DE LA TOMA -banco-largo, 17-10-2026-. Los subtítulos salen de las filas 'palabras FINAL'
// -y de los 'calce' para lo dicho después de la última frase cerrada, subtitulos.ts-, y vivían solo en
// la bitácora: con el tope se cortaban a los ~11 min, también en Play. Son de la toma, no de la
// bitácora: se juntan aquí aparte, en todas las versiones, sin tope, desde abrirPalabrasDeToma hasta
// cerrarPalabrasDeToma, y tomaVideo.ts las escribe junto al mp4 como <id>.palabras.txt. Con el mismo
// reloj que el registro -t0-: abrirPalabrasDeToma lo pone, porque en Play activarDiagnostico ya no
// corre. Del 'calce' se guarda solo el token -lo único que leen los subtítulos-, y el NO CALZO no va.
type EntradaPalabras = Extract<EntradaDiagnostico, { tipo: 'palabras' }> | { ms: number; tipo: 'calce'; token: number }
let palabrasAbiertas = false
let palabrasToma: EntradaPalabras[] = []

export function abrirPalabrasDeToma() {
  t0 = performance.now()
  palabrasAbiertas = true
  palabrasToma = []
}

export function cerrarPalabrasDeToma() {
  palabrasAbiertas = false
}

export function cantidadPalabrasDeToma(): number {
  return palabrasToma.length
}

// En el formato de la bitácora, para que subtitulos.ts, leerCorpus y medir-toma.mjs lo lean igual.
export function palabrasComoTexto(): string {
  const filas: string[] = ['ms\ttipo\tdetalle']
  for (const e of palabrasToma) {
    if (e.tipo === 'palabras') filas.push(`${e.ms}\tpalabras\t${e.final ? 'FINAL' : 'parcial'}: ${e.palabras.map((p) => `${p.w}@${p.ini}-${p.fin}`).join(' ')}`)
    else filas.push(`${e.ms}\tcalce\ttoken ${e.token}:`)
  }
  return filas.join('\n')
}

// -banco-largo- SOLO EN LA APK DE PRUEBA. En Play -HERRAMIENTAS en false- no se enciende: no se anota
// nada y no se escribe el .motor.txt -tomaVideo.ts-. Las palabras de la toma van aparte, arriba.
// Antes: activo = valor, con cualquier versión.
export function activarDiagnostico(valor: boolean) {
  activo = valor && HERRAMIENTAS
  if (activo) {
    entradas = []
    t0 = performance.now()
    generacion++
    finUltimaPalabraPerf = null
    compactador = crearCompactadorCuadros()
    cortadaEnMs = null
  }
}

// -tarea 88, segunda vuelta- El fin de la última palabra del FINAL que acaba de llegar, en Date.now(), y
// lo olvida: un FINAL sin palabras con hora da null. LA CONVERSIÓN, UNA SOLA VEZ: Vosk entrega "end" en
// segundos desde el arranque del audio -VoskNativoPlugin.escuchar, inicioEpochMs = System.currentTimeMillis()-;
// MotorNativo.anotarPalabras lo pasa a este registro como ceroAudioPerf + end * 1000 - t0, con
// ceroAudioPerf = inicioEpochMs - (Date.now() - performance.now()). Aquí se deshace: t0 + fin es
// performance.now() y se le suma (Date.now() - performance.now()). Queda inicioEpochMs + end * 1000, en
// el reloj de Date.now(). abrirPausa -tomaVideo.ts- sigue siendo el único que resta inicioVideoEpochMs.
export function tomarFinUltimaPalabraEpochMs(): number | null {
  const perf = finUltimaPalabraPerf
  finUltimaPalabraPerf = null
  if (perf === null) return null
  return Math.round(perf + (Date.now() - performance.now()))
}

export function generacionDiagnostico(): number {
  return generacion
}

export function diagnosticoActivo(): boolean {
  return activo
}

type SinMs<T> = T extends { ms: number } ? Omit<T, 'ms'> & { ms?: number } : never

export function anotar(e: SinMs<EntradaDiagnostico>) {
  // -tarea 88, segunda vuelta- Antes de mirar si está activo: ver finUltimaPalabraPerf.
  if (e.tipo === 'palabras' && e.final) {
    const fines = e.palabras.map((p) => p.fin).filter((f) => Number.isFinite(f))
    if (fines.length) finUltimaPalabraPerf = t0 + Math.max(...fines)
  }
  // -banco-largo- Las palabras de la toma, también antes de mirar si está activo: van en todas las versiones.
  if (palabrasAbiertas) {
    if (e.tipo === 'palabras' && e.final) palabrasToma.push({ ...e, ms: Math.round((e.ms ?? performance.now()) - t0) })
    else if (e.tipo === 'calce' && e.token !== null) palabrasToma.push({ ms: Math.round((e.ms ?? performance.now()) - t0), tipo: 'calce', token: e.token })
  }
  // Antes: if (!activo) return. HERRAMIENTAS delante: en Play esta función termina aquí.
  if (!HERRAMIENTAS || !activo) return
  // Antes: if (entradas.length >= MAX_ENTRADAS) return -callado-.
  if (entradas.length >= MAX_ENTRADAS) {
    if (cortadaEnMs === null) cortadaEnMs = Math.round((e.ms ?? performance.now()) - t0)
    return
  }
  const ms = Math.round((e.ms ?? performance.now()) - t0)
  // -banco-largo- El cuadro igual al anterior no se escribe; cada 5 s, la fila 'cuadros'.
  if (e.tipo === 'cuadro') {
    const r = compactador.cuadro(ms, claveDeCuadro(e))
    if (r.escribir) entradas.push({ ...e, ms } as EntradaDiagnostico)
    if (r.resumen) entradas.push({ ms, tipo: 'cuadros', ...r.resumen })
    return
  }
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
  // -banco-largo- El tramo de cuadros que sigue abierto va como una fila 'cuadros' más, en su lugar
  // -tras la última entrada con ms hasta el de su último cuadro-, sin cerrarlo: anotar puede seguir.
  const abierto = compactador.pendiente()
  let lista: EntradaDiagnostico[] = entradas
  if (abierto) {
    let k = entradas.length
    while (k > 0 && entradas[k - 1].ms > abierto.ms) k--
    lista = [...entradas.slice(0, k), { ms: abierto.ms, tipo: 'cuadros', ...abierto.resumen }, ...entradas.slice(k)]
  }
  // Antes: for (const e of entradas) {
  for (const e of lista) {
    if (e.tipo === 'oyo') {
      filas.push(`${e.ms}\toyo\t${e.final ? 'FINAL' : 'parcial'}: ${e.texto}`)
    } else if (e.tipo === 'calce') {
      filas.push(`${e.ms}\tcalce\t${e.token === null ? 'NO CALZO' : 'token ' + e.token}: ${e.texto}`)
    } else if (e.tipo === 'palabras') {
      filas.push(`${e.ms}\tpalabras\t${e.final ? 'FINAL' : 'parcial'}: ${e.palabras.map((p) => `${p.w}@${p.ini}-${p.fin}`).join(' ')}`)
    } else if (e.tipo === 'renglones') {
      filas.push(`${e.ms}\trenglones\t${e.inicios.join(' ')}`)
    } else if (e.tipo === 'llegada') {
      const extra = e.audio === undefined ? '' : ` audio=${e.audio} leido=${e.leido} procesado=${e.procesado} rms=${(e.rms ?? 0).toFixed(4)} relevos=${e.relevos ?? 0}`
      filas.push(`${e.ms}\tllegada\t${e.final ? 'FINAL' : 'parcial'} nativo=${e.nativo}${extra}`)
    } else if (e.tipo === 'oido') {
      filas.push(`${e.ms}\toido\tinicio=${e.inicio} trozo=${e.muestrasPorTrozo} ruta=${e.ruta}`)
    } else if (e.tipo === 'ventana') {
      // -tarea 89-: el calce de arriba NO se aplicó.
      filas.push(`${e.ms}\tventana\tFUERA ${e.final ? 'FINAL' : 'parcial'} token=${e.token} ref=${e.ref} desde=${e.desde} hasta=${e.hasta} seguidor=${e.seguidor}`)
    } else if (e.tipo === 'seguidor') {
      filas.push(`${e.ms}\tseguidor\t${e.evento} token=${e.token}`)
    } else if (e.tipo === 'pantalla') {
      filas.push(`${e.ms}\tpantalla\t${e.diseno} ${e.ancho}x${e.alto}`)
    } else if (e.tipo === 'visor-lado') {
      filas.push(`${e.ms}\tvisor-lado\t${e.evento} ${e.detalle}`)
    } else if (e.tipo === 'cuadros') {
      filas.push(filaCuadros(e.ms, e))
    } else {
      filas.push(
        `${e.ms}\tcuadro\tpos=${e.posicion.toFixed(2)} calce=${e.calce} scroll=${e.scroll} freno=${e.freno} trabado=${e.trabado}`
      )
    }
  }
  // -banco-largo- Si llegó al tope, lo dice.
  if (cortadaEnMs !== null) filas.push(`${cortadaEnMs}\ttope\tla bitácora llegó a ${MAX_ENTRADAS} filas: desde aquí no se anotó nada`)
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
