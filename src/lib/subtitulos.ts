import leven from 'leven'
import { leerCorpus } from './repetidor'
import { tokenizarGuion } from './seguidor'

// LOS SUBTITULOS DE UNA TOMA, ARMADOS CON EL GUION Y EL RELOJ DEL RECONOCEDOR.
// 24-09-2026.
//
// El TEXTO sale del guion, que esta bien escrito. El RELOJ sale de lo que oyo
// Vosk: el registro de la toma -<id>.motor.txt, tomaVideo.ts- guarda cada
// palabra de las frases cerradas con su comienzo y su fin, en milisegundos
// desde que empezo el video -anotarPalabras en MotorNativo.ts-. Lo oido se
// calza con el guion palabra por palabra, asi que los errores del reconocedor
// no se ven: en la toma 008a7133 oyo "diga" por "dice" y "tamos" por
// "estamos", y el subtitulo dice lo que dice el guion.
//
// Medido en el PC con el prototipo -teleprom/02-lecturas/subtitulos/
// armar-srt.mjs-, sobre esa toma de 66 s: 156 de las 157 palabras leidas
// tomaron su hora de lo oido y 1 se repartio por letras. Javier vio el video
// quemado: "los subtitulos estan muy bien".
//
// Lo que se tomo de FiloStudio -subBlock en editor-largo-shorts.js-: la
// palabra que no tiene hora la toma repartida POR LETRAS entre sus vecinas, y
// los renglones van parejos. Alli el tiempo de CADA palabra era estimado,
// porque el .srt solo traia el de la frase; aca es real.
//
// LA ULTIMA FRASE. Se reviso el 24-09-2026 si al cortar la toma se perdian las
// ultimas palabras: el registro se escribe al cortar el video y el motor se
// detiene despues -handleStop en App.tsx-, asi que lo que el reconocedor
// cierra al detenerse no llega al registro. En las 27 tomas guardadas no quedo
// NINGUNA palabra oida despues de la ultima frase cerrada: la pausa antes de
// apretar el boton la cierra. Si alguien corta hablando, esas palabras toman
// la hora del seguidor -el calce- y no se pierden. No se toco el orden del corte.

// DÓNDE VA EL SUBTÍTULO -tarea 87, 04-10-2026, decidido por Javier-. UNA sola posición para todo:
// el borde de abajo del bloque -la caja del último renglón- queda a 1/6 del alto de la IMAGEN,
// contado desde abajo, igual en vertical y en horizontal. La usan el visor -CapaSubtitulos, en
// SubtitulosVisor.tsx- y, del lado nativo, la MISMA cifra está en UbicacionSubtitulos.java
// -MARGEN_ABAJO-, que usa CapaDeSubtitulos.java para el archivo guardado: si se cambia una, se
// cambia la otra. Antes: un octavo -0,125, "160 sobre 1280" del prototipo-, escrito a mano en los
// dos lados.
export const MARGEN_ABAJO_SUBTITULOS = 1 / 6

export type PalabraSubtitulo = {
  texto: string      // como esta en el guion, con su puntuacion
  desdeMs: number
  hastaMs: number
}

export type Subtitulo = {
  desdeMs: number
  hastaMs: number
  renglones: PalabraSubtitulo[][]   // uno o dos
}

// Renglones de hasta 32 letras, dos como maximo. Una frase de 57 letras
// cortada de a 32 da tres renglones: por eso "no cabe" se decide armando los
// renglones, no contando letras.
export const MAX_LETRAS_RENGLON = 32
// Una pausa de la voz de mas de esto corta el subtitulo aunque la oracion siga.
export const PAUSA_QUE_CORTA_MS = 450
export const MAX_MS_SUBTITULO = 5000
// Cuanto se queda en pantalla despues de su ultima palabra, si el siguiente
// no llego antes.
export const SE_QUEDA_MS = 600
// El seguidor anota a que palabra llego cuando la reconoce, no cuando se dijo:
// va unos 0,3 s atras de la voz -medido el 24-09-2026-. Solo se usa para las
// palabras que no tienen hora propia.
export const ATRASO_DEL_CALCE_MS = 300

// Un subtitulo no termina en "de la" o "que": esas palabras pasan al siguiente,
// con la que las completa.
// EL INGLES -27-09-2026, docs/ingles.txt-: lo mismo con "the", "of", "to"... Van en la misma
// lista y no en una por idioma: no se pisan -"a" ata en los dos- y asi un subtitulo no
// necesita saber el idioma del guion. Se comparan despues de norm(): sin apostrofo -"i'm"
// queda "im"-.
const ATADAS = new Set((
  'a al como con de del el en entre la las lo los mi mas o para pero por que se si sin su sus tan te tu un una y ya ' +
  'an the of to in on at by for with from into onto about as and or but nor so if than that this these those ' +
  'my your his her its our their im youre were theyre is are was be not no very just'
).split(' '))

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '')
}

function parecido(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  return 1 - leven(a, b) / Math.max(a.length, b.length)
}

type Oida = { w: string; a: number; b: number }
type Calce = { ms: number; token: number }

function leerOidasYCalces(registro: string): { oidas: Oida[]; calces: Calce[] } {
  const oidas: Oida[] = []
  const calces: Calce[] = []
  for (const linea of registro.split(/\r?\n/)) {
    if (linea.startsWith('#')) continue
    const c = linea.split('\t')
    if (c.length < 3) continue
    if (c[1] === 'palabras' && c[2].startsWith('FINAL')) {
      for (const m of c[2].matchAll(/(\S+)@(-?\d+)-(-?\d+)/g)) oidas.push({ w: norm(m[1]), a: +m[2], b: +m[3] })
    } else if (c[1] === 'calce') {
      // "token N: ..." = el seguidor llego hasta la palabra N, contando desde 0.
      const m = c[2].match(/^token (\d+):/)
      if (m) calces.push({ ms: +c[0], token: +m[1] })
    }
  }
  return { oidas, calces }
}

export function armarSubtitulos(registro: string): Subtitulo[] {
  const corpus = leerCorpus(registro)
  if (!corpus.guion.trim()) return []
  // Las acotaciones entre corchetes no se dicen -B9- y no van al subtitulo.
  const todos = tokenizarGuion(corpus.guion)
  const tokens = todos
    .filter((t) => !t.esAcotacion)
    .map((t) => ({ abs: t.tokenAbsoluto, n: norm(t.palabra), texto: corpus.guion.substring(t.desdeChar, t.hastaChar) }))
    .filter((t) => t.n)
  if (!tokens.length) return []

  const { oidas, calces } = leerOidasYCalces(registro)
  const ultimoCalce = calces.reduce((m, c) => Math.max(m, c.token), -1)
  const G = Math.min(tokens.length, Math.max(ultimoCalce + 6, oidas.length + 20))
  const O = oidas.length

  // Calzar lo oido con el guion: programacion dinamica. Calzar vale segun el
  // parecido; saltarse una palabra -del guion o de lo oido- cuesta. Se puede
  // terminar en cualquier punto del guion: nadie lee el guion entero siempre.
  const SALTO = -0.4
  const S: Float64Array[] = Array.from({ length: O + 1 }, () => new Float64Array(G + 1))
  const P: Int8Array[] = Array.from({ length: O + 1 }, () => new Int8Array(G + 1))
  for (let i = 1; i <= O; i++) { S[i][0] = S[i - 1][0] + SALTO; P[i][0] = 1 }
  for (let j = 1; j <= G; j++) { S[0][j] = S[0][j - 1] + SALTO; P[0][j] = 2 }
  for (let i = 1; i <= O; i++) {
    for (let j = 1; j <= G; j++) {
      const p = parecido(oidas[i - 1].w, tokens[j - 1].n)
      const diag = S[i - 1][j - 1] + (p >= 0.6 ? p : -0.8)
      const arriba = S[i - 1][j] + SALTO
      const izq = S[i][j - 1] + SALTO
      if (diag >= arriba && diag >= izq) { S[i][j] = diag; P[i][j] = 0 }
      else if (arriba >= izq) { S[i][j] = arriba; P[i][j] = 1 }
      else { S[i][j] = izq; P[i][j] = 2 }
    }
  }
  let fin = 0
  if (O > 0) {
    fin = 1
    for (let j = 1; j <= G; j++) if (S[O][j] > S[O][fin]) fin = j
  }

  const tiempo: Array<{ a: number | null; b: number } | null> = new Array(tokens.length).fill(null)
  {
    let i = O
    let j = fin
    while (i > 0 && j > 0) {
      if (P[i][j] === 0) {
        if (parecido(oidas[i - 1].w, tokens[j - 1].n) >= 0.6) tiempo[j - 1] = { a: oidas[i - 1].a, b: oidas[i - 1].b }
        i--; j--
      } else if (P[i][j] === 1) i--
      else j--
    }
  }

  // Lo que se dijo despues de la ultima frase cerrada no tiene hora propia: se
  // usa la del seguidor, menos su atraso.
  const finUltimaOida = O ? oidas[O - 1].b : -Infinity
  for (const c of calces) {
    if (c.ms <= finUltimaOida) continue
    const k = tokens.findIndex((t) => t.abs >= c.token)
    const idx = k < 0 ? tokens.length - 1 : (tokens[k].abs === c.token ? k : k - 1)
    if (idx < 0 || idx < fin - 1) continue
    if (tiempo[idx] === null) tiempo[idx] = { a: null, b: c.ms - ATRASO_DEL_CALCE_MS }
    fin = Math.max(fin, idx + 1)
  }
  if (fin === 0) return []

  // Las palabras sin hora de comienzo se reparten POR LETRAS entre las vecinas.
  const hora: Array<{ a: number; b: number }> = new Array(fin)
  {
    let k = 0
    while (k < fin) {
      const t = tiempo[k]
      if (t && t.a !== null) { hora[k] = { a: t.a, b: t.b }; k++; continue }
      let m = k
      while (m < fin && !(tiempo[m] && tiempo[m]!.a !== null)) m++
      const siguiente = m < fin ? tiempo[m]! : null
      const desde = k > 0 ? hora[k - 1].b : (siguiente ? (siguiente.a as number) - 400 * (m - k) : 0)
      let hasta = siguiente ? (siguiente.a as number) : (tiempo[m - 1]?.b ?? desde + 400 * (m - k))
      if (hasta <= desde) hasta = desde + 150 * (m - k)
      const pesos = tokens.slice(k, m).map((x) => Math.max(2, x.n.length))
      const total = pesos.reduce((s, x) => s + x, 0)
      let t0 = desde
      for (let q = k; q < m; q++) {
        const d = ((hasta - desde) * pesos[q - k]) / total
        hora[q] = { a: t0, b: t0 + d }
        t0 += d
      }
      k = m
    }
  }

  const palabras: PalabraSubtitulo[] = []
  for (let k = 0; k < fin; k++) palabras.push({ texto: tokens[k].texto, desdeMs: hora[k].a, hastaMs: hora[k].b })

  return cortarEnSubtitulos(palabras)
}

const largo = (ws: PalabraSubtitulo[]) => ws.reduce((s, x) => s + x.texto.length, 0) + Math.max(0, ws.length - 1)

// Renglones parejos, como armar(L) de FiloStudio: si la frase ocupa dos
// renglones, se busca el ancho mas chico que siga dando dos, para que no quede
// uno largo y uno cojo.
export function partirEnRenglones(ws: PalabraSubtitulo[]): PalabraSubtitulo[][] {
  const armar = (L: number) => {
    const ls: PalabraSubtitulo[][] = []
    let cur: PalabraSubtitulo[] = []
    for (const w of ws) {
      if (cur.length && largo([...cur, w]) > L) { ls.push(cur); cur = [] }
      cur.push(w)
    }
    if (cur.length) ls.push(cur)
    return ls
  }
  let ls = armar(MAX_LETRAS_RENGLON)
  if (ls.length > 1) {
    for (let L = Math.ceil(largo(ws) / ls.length); L < MAX_LETRAS_RENGLON; L++) {
      const t = armar(L)
      if (t.length === ls.length) { ls = t; break }
    }
  }
  return ls
}

function cortarEnSubtitulos(palabras: PalabraSubtitulo[]): Subtitulo[] {
  const grupos: PalabraSubtitulo[][] = []
  let actual: PalabraSubtitulo[] = []
  for (const x of palabras) {
    if (actual.length) {
      const prev = actual[actual.length - 1]
      const pausa = x.desdeMs - prev.hastaMs
      const cierra = /[.?!:;…]$/.test(prev.texto)
      const coma = /[,—–)]$/.test(prev.texto)
      const noCabe = partirEnRenglones([...actual, x]).length > 2
      const muyLargo = x.hastaMs - actual[0].desdeMs > MAX_MS_SUBTITULO
      if (cierra || pausa > PAUSA_QUE_CORTA_MS || noCabe || muyLargo || (coma && largo(actual) > MAX_LETRAS_RENGLON)) {
        // En un punto o en una pausa real manda la voz; solo cuando se corta por
        // espacio o por tiempo, "de la" pasa al subtitulo siguiente.
        const pasan: PalabraSubtitulo[] = []
        if (!cierra && pausa <= PAUSA_QUE_CORTA_MS) {
          while (actual.length > 2 && pasan.length < 2 && ATADAS.has(norm(actual[actual.length - 1].texto))) pasan.unshift(actual.pop()!)
        }
        grupos.push(actual)
        actual = pasan
      }
    }
    actual.push(x)
  }
  if (actual.length) grupos.push(actual)

  return grupos.map((ws, q) => {
    const siguiente = q + 1 < grupos.length ? grupos[q + 1][0].desdeMs : Infinity
    return {
      desdeMs: Math.max(0, ws[0].desdeMs),
      hastaMs: Math.min(siguiente, ws[ws.length - 1].hastaMs + SE_QUEDA_MS),
      renglones: partirEnRenglones(ws)
    }
  })
}

// LOS TRES ESTILOS, CERRADOS -Javier, 24-09-2026-: el amarillo del prototipo,
// uno rojo y uno formal, negro. Mas "no". Paquetes cerrados que se ven andando
// sobre la toma, no diez controles sueltos -como los paquetes de Canva y como
// el cajon Aa-.
export type EstiloSubtitulo = 'no' | 'amarillo' | 'rojo' | 'formal'
export const ESTILOS_SUBTITULO: Array<{ valor: EstiloSubtitulo; nombre: string }> = [
  { valor: 'no', nombre: 'No' },
  { valor: 'amarillo', nombre: 'Amarillo' },
  { valor: 'rojo', nombre: 'Rojo' },
  { valor: 'formal', nombre: 'Formal' }
]

// Se recuerda la ultima eleccion: el que siempre los quiere no toca nada. Es
// una comodidad de este telefono, no un dato: si se pierde, vuelve a "no".
const CLAVE_ESTILO = 'sigo_subtitulos_estilo'
export function estiloSubtituloGuardado(): EstiloSubtitulo {
  try {
    const v = localStorage.getItem(CLAVE_ESTILO)
    if (v && ESTILOS_SUBTITULO.some((e) => e.valor === v)) return v as EstiloSubtitulo
  } catch (e) {
  }
  return 'no'
}
export function guardarEstiloSubtitulo(estilo: EstiloSubtitulo): void {
  try {
    localStorage.setItem(CLAVE_ESTILO, estilo)
  } catch (e) {
  }
}

// El subtitulo que corresponde a un instante del video, o null.
export function subtituloEn(subtitulos: Subtitulo[], ms: number): Subtitulo | null {
  for (const s of subtitulos) {
    if (ms < s.desdeMs) return null
    if (ms < s.hastaMs) return s
  }
  return null
}
