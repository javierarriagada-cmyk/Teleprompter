import { configuracionLista, firebaseConfig } from './firebaseConfig'
import { tieneSuscripcion } from './suscripcion'

// LOS LÍMITES SIN SIGO+ -orden 2 «Sigo+ en la app», 26-10-2026-. Sin la suscripción, «Con la voz» sigue
// la lectura hasta limite_lectura_segundos y Grabar corta la toma en limite_grabacion_segundos; el aviso
// sale aviso_antes_segundos antes. Con tieneSuscripcion() no hay límite -'sinDatos' cuenta como sin
// suscripción-.
//
// Los tres números viven en Firebase Remote Config -firebase/remote-config, sobre la misma app de
// firebaseConfig.ts, sin Analytics-: se mueven desde la consola sin sacar versión. Si Remote Config no
// corre -isSupported() da false-, no hay red o un valor no sirve, vale el de omisión.
//
// El tiempo es el de la toma SIN las pausas, el mismo que muestra BarraDeTiempo. Cada lectura y cada toma
// empiezan en cero: quien llama pasa lo transcurrido de la toma en curso.

export interface Limites {
  lecturaSeg: number
  grabacionSeg: number
  avisoAntesSeg: number
}

// Antes: lecturaSeg: 300 (5 min). 27-10-2026, pasada teléfono PR 157: 4 min; aviso sigue 60 s antes (a los 3).
export const LIMITES_POR_OMISION: Limites = { lecturaSeg: 240, grabacionSeg: 180, avisoAntesSeg: 60 }

export const CLAVES_REMOTAS = {
  lectura: 'limite_lectura_segundos',
  grabacion: 'limite_grabacion_segundos',
  aviso: 'aviso_antes_segundos'
} as const

// Un límite sirve si es un entero entre 30 y 7200.
export function limiteValido(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 30 && v <= 7200
}
// El aviso sirve si es un entero entre 10 y el límite menos 10.
export function avisoValido(v: unknown, limite: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 10 && v <= limite - 10
}

// Lo que llega de Remote Config -números o null si no llegó- a límites que sirven. Un aviso que no sirve
// para un límite vuelve al de omisión; si tampoco sirve para ese límite, queda en límite menos 10.
export function armarLimites(remotos: { lectura?: number | null; grabacion?: number | null; aviso?: number | null }): Limites {
  const lecturaSeg = limiteValido(remotos.lectura) ? remotos.lectura : LIMITES_POR_OMISION.lecturaSeg
  const grabacionSeg = limiteValido(remotos.grabacion) ? remotos.grabacion : LIMITES_POR_OMISION.grabacionSeg
  const menor = Math.min(lecturaSeg, grabacionSeg)
  const avisoAntesSeg = avisoValido(remotos.aviso, menor)
    ? remotos.aviso
    : avisoValido(LIMITES_POR_OMISION.avisoAntesSeg, menor)
      ? LIMITES_POR_OMISION.avisoAntesSeg
      : menor - 10
  return { lecturaSeg, grabacionSeg, avisoAntesSeg }
}

let limites: Limites = LIMITES_POR_OMISION
export function limitesActuales(): Limites {
  return limites
}
// Para las pruebas: vuelve a los de omisión.
export function olvidarLimites() {
  limites = LIMITES_POR_OMISION
}

// Pide los valores una vez. Nunca lanza: cualquier fallo deja los de omisión.
let cargando: Promise<void> | null = null
export function cargarLimites(): Promise<void> {
  if (cargando) return cargando
  cargando = (async () => {
    try {
      if (!configuracionLista()) return
      const rc = await import('firebase/remote-config')
      if (!(await rc.isSupported())) return
      const { getApp, getApps, initializeApp } = await import('firebase/app')
      // La misma app que cuenta.ts: si ya está, se usa; si no, se abre con firebaseConfig.
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
      const config = rc.getRemoteConfig(app)
      config.defaultConfig = {
        [CLAVES_REMOTAS.lectura]: LIMITES_POR_OMISION.lecturaSeg,
        [CLAVES_REMOTAS.grabacion]: LIMITES_POR_OMISION.grabacionSeg,
        [CLAVES_REMOTAS.aviso]: LIMITES_POR_OMISION.avisoAntesSeg
      }
      await rc.fetchAndActivate(config)
      const leer = (clave: string) => {
        const v = rc.getValue(config, clave)
        return v.getSource() === 'remote' ? v.asNumber() : null
      }
      limites = armarLimites({ lectura: leer(CLAVES_REMOTAS.lectura), grabacion: leer(CLAVES_REMOTAS.grabacion), aviso: leer(CLAVES_REMOTAS.aviso) })
    } catch (e) {
      console.warn('[limites]', e)
    }
  })()
  return cargando
}

export type TipoToma = 'lectura' | 'grabacion'

// El límite de la toma, en segundos, o null si no hay -con Sigo+-.
export function limiteDe(tipo: TipoToma, l: Limites = limites, conSuscripcion: boolean = tieneSuscripcion()): number | null {
  if (conSuscripcion) return null
  return tipo === 'lectura' ? l.lecturaSeg : l.grabacionSeg
}

// Lo que queda, en segundos, o null sin límite. Nunca menos de cero.
export function segundosQueQuedan(tipo: TipoToma, transcurridoSeg: number, l: Limites = limites, conSuscripcion: boolean = tieneSuscripcion()): number | null {
  const lim = limiteDe(tipo, l, conSuscripcion)
  return lim === null ? null : Math.max(0, lim - transcurridoSeg)
}

// Hay que avisar desde límite − aviso, mientras no se llegó al límite.
export function hayQueAvisar(tipo: TipoToma, transcurridoSeg: number, l: Limites = limites, conSuscripcion: boolean = tieneSuscripcion()): boolean {
  const lim = limiteDe(tipo, l, conSuscripcion)
  return lim !== null && transcurridoSeg >= lim - l.avisoAntesSeg && transcurridoSeg < lim
}

export function llegoAlLimite(tipo: TipoToma, transcurridoSeg: number, l: Limites = limites, conSuscripcion: boolean = tieneSuscripcion()): boolean {
  const lim = limiteDe(tipo, l, conSuscripcion)
  return lim !== null && transcurridoSeg >= lim
}

// Lo transcurrido de la toma SIN las pausas -la misma cuenta de BarraDeTiempo-, en segundos.
export function transcurridoSinPausas(ahoraMs: number, inicioMs: number, pausadoMs: number): number {
  return Math.max(0, ahoraMs - inicioMs - pausadoMs) / 1000
}

// -pasada teléfono PR 157, 27-10-2026- Al límite de lectura sin Sigo+: pausar (misma pausa de siempre).
// Antes: App forzaba velocidad fija (lecturaForzadaAFija + ritmoDeLosUltimosSegundos + cambiarRitmo).
export type AccionAlLimiteLectura = 'pausar' | 'forzarFija'
export function accionAlLimiteLectura(): AccionAlLimiteLectura {
  // Antes: el camino era 'forzarFija'. 27-10-2026: se pausa; la oferta se abre sola (oferta.ts).
  return 'pausar'
}

// EL AVISO ANTES DE EMPEZAR, EN LA VERSIÓN GRATIS -proxima-version, 2026-11-07-. Hoy quien no tiene Sigo+ se
// entera del límite a mitad de la toma: grabando, al minuto 2 sale «Te queda 1 minuto» y al 3 se corta; leyendo
// con voz, a los 4 minutos se pausa. Con un guion más largo se pierde el esfuerzo. Sigo ya sabe cuánto dura el
// guion -el «dura aprox.» del dock-: el aviso lo dice ANTES de empezar, una vez por guion y por tipo, y solo a
// quien le sirve. La decisión es pura: todo entra como parámetro y aquí no se lee nada de afuera.
export interface EntradaAvisoLimite {
  tipo: TipoToma
  // Velocidad fija elegida: en Leer no hay límite. En Grabar no cambia nada.
  fija: boolean
  // Lo que dura el guion, la misma cuenta del dock -segundosDeLectura con su ritmo-.
  segundosGuion: number
  limites: Limites
  conSuscripcion: boolean
  yaVisto: boolean
}
export type DecisionAvisoLimite =
  | { aviso: false }
  | { aviso: true; tipo: TipoToma; limiteSeg: number; segundosGuion: number }

export function decidirAvisoLimiteGratis(e: EntradaAvisoLimite): DecisionAvisoLimite {
  if (e.yaVisto) return { aviso: false }
  if (e.tipo === 'lectura' && e.fija) return { aviso: false }
  const lim = limiteDe(e.tipo, e.limites, e.conSuscripcion)
  if (lim === null) return { aviso: false }
  if (!(e.segundosGuion > lim)) return { aviso: false }
  return { aviso: true, tipo: e.tipo, limiteSeg: lim, segundosGuion: e.segundosGuion }
}

// Los segundos en reloj, como el dock: 250 → «4:10», 150 → «2:30».
export function relojDeSegundos(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// LOS NÚMEROS DEL AVISO. {tiempo}: «3 minutos», «1 minuto»; {corto}: «3 min». Si no son minutos exactos, los dos
// en reloj: «2:30». Las palabras vienen de los textos del idioma -limiteUnMinuto, limiteMinutos,
// limiteMinutosCorto-, que entran como parámetro para que la función siga pura.
export interface TextosNumerosLimite {
  limiteUnMinuto: string
  limiteMinutos: string
  limiteMinutosCorto: string
}
export function formatearLimite(limiteSeg: number, textos: TextosNumerosLimite): { tiempo: string; corto: string } {
  if (limiteSeg % 60 !== 0) {
    const reloj = relojDeSegundos(limiteSeg)
    return { tiempo: reloj, corto: reloj }
  }
  const n = limiteSeg / 60
  const tiempo = n === 1 ? textos.limiteUnMinuto : textos.limiteMinutos.replace('{n}', String(n))
  return { tiempo, corto: textos.limiteMinutosCorto.replace('{n}', String(n)) }
}

// SI YA SALIÓ PARA ESE GUION Y ESE TIPO. Se recuerda en localStorage, como sigo_oferta_inicial_vista en
// oferta.ts, y queda marcado al mostrarse. Una copia en memoria por si el guardado falla: así el aviso no
// vuelve a salir al tocar «Grabar …», que vuelve a apretar Empezar.
const CLAVE_AVISO_LIMITE = 'sigo_aviso_limite_vistos'
const vistosEnMemoria = new Set<string>()
function claveDeAviso(guionId: string, tipo: TipoToma) {
  return `${tipo}:${guionId}`
}
function leerVistos(): string[] {
  try {
    const crudo = localStorage.getItem(CLAVE_AVISO_LIMITE)
    const lista = crudo ? JSON.parse(crudo) : []
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
export function yaSalioAvisoLimite(guionId: string, tipo: TipoToma): boolean {
  const clave = claveDeAviso(guionId, tipo)
  return vistosEnMemoria.has(clave) || leerVistos().includes(clave)
}
export function marcarAvisoLimiteVisto(guionId: string, tipo: TipoToma) {
  const clave = claveDeAviso(guionId, tipo)
  vistosEnMemoria.add(clave)
  try {
    const lista = leerVistos()
    if (!lista.includes(clave)) localStorage.setItem(CLAVE_AVISO_LIMITE, JSON.stringify([...lista, clave]))
  } catch (e) {
    console.warn('[limites] no se guardó el aviso visto:', e)
  }
}
// Para las pruebas.
export function olvidarAvisosLimite() {
  vistosEnMemoria.clear()
  try { localStorage.removeItem(CLAVE_AVISO_LIMITE) } catch { /* */ }
}
