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

export const LIMITES_POR_OMISION: Limites = { lecturaSeg: 300, grabacionSeg: 180, avisoAntesSeg: 60 }

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
