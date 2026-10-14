// VELOCIDAD FIJA -tarea 106, 14-10-2026, boceto aprobado: docs/pantallas/velocidad-fija/-.
//
// El segundo modo de lectura. «Con la voz» es el de siempre: el texto sigue lo que oye el
// reconocedor -seguidor.ts, avance.ts, conduccion.ts- y NADA de este archivo lo toca. «Velocidad
// fija» no escucha: el texto sube solo, a un ritmo que la persona elige.
//
// SIN NUMEROS: SIETE NIVELES PROPORCIONALES. El primer boceto ofrecia de 80 a 220 palabras por minuto
// de 10 en 10; Javier lo cambio por siete niveles, cada uno 14 % mas rapido que el anterior -la
// diferencia se siente igual subiendo de 1 a 2 que de 6 a 7-. Las palabras por minuto solo mueven el
// texto y calculan la duracion: NUNCA se muestran. En pantalla hay una barra de siete tramos y TalkBack
// dice «Velocidad, nivel N de 7».
import type { EstadoAvance, MotorDeAvance } from './avance'
import { segundosDeLectura } from '../datos/modelo'
import type { Renglon } from './renglones'

export type ModoLectura = 'voz' | 'fija'

export const NIVELES_PPM = [100, 114, 130, 148, 169, 193, 220]
export const NIVELES = NIVELES_PPM.length
export const NIVEL_POR_OMISION = 4

export function acotarNivel(nivel: number): number {
  if (!Number.isFinite(nivel)) return NIVEL_POR_OMISION
  return Math.min(NIVELES, Math.max(1, Math.round(nivel)))
}

export function ppmDeNivel(nivel: number): number {
  return NIVELES_PPM[acotarNivel(nivel) - 1]
}

// Un toque: un nivel arriba o abajo, sin salirse de 1..7.
export function subirNivel(nivel: number): number { return acotarNivel(nivel + 1) }
export function bajarNivel(nivel: number): number { return acotarNivel(nivel - 1) }

// «dura aprox.» con Velocidad fija: palabras ÷ palabras por minuto del nivel, con la MISMA cuenta de
// siempre -segundosDeLectura-.
export function segundosConNivel(palabras: number, nivel: number): number {
  return segundosDeLectura(palabras, ppmDeNivel(nivel))
}

// LO QUE SE GUARDA. Claves propias: «Con la voz» sin nada guardado es lo de siempre.
const CLAVE_MODO = 'sigo_modo_lectura'
const CLAVE_NIVEL = 'sigo_nivel_velocidad'

export function modoGuardado(): ModoLectura {
  try { return localStorage.getItem(CLAVE_MODO) === 'fija' ? 'fija' : 'voz' } catch { return 'voz' }
}
export function nivelGuardado(): number {
  try {
    const v = localStorage.getItem(CLAVE_NIVEL)
    return v === null ? NIVEL_POR_OMISION : acotarNivel(Number(v))
  } catch { return NIVEL_POR_OMISION }
}

// Un solo estado para toda la app: la ficha, el panel, el dock y la toma leen y escriben el mismo.
type EstadoVelocidad = { modo: ModoLectura; nivel: number }
let estado: EstadoVelocidad | null = null
const oyentes = new Set<() => void>()
export function estadoVelocidad(): EstadoVelocidad {
  if (estado === null) estado = { modo: modoGuardado(), nivel: nivelGuardado() }
  return estado
}
export function suscribirVelocidad(f: () => void): () => void {
  oyentes.add(f)
  return () => { oyentes.delete(f) }
}
function cambiar(nuevo: EstadoVelocidad) {
  estado = nuevo
  oyentes.forEach((f) => f())
}
export function fijarModo(modo: ModoLectura) {
  try { localStorage.setItem(CLAVE_MODO, modo) } catch { /* sin guardado, sigue en memoria */ }
  cambiar({ ...estadoVelocidad(), modo })
}
export function fijarNivel(nivel: number) {
  const n = acotarNivel(nivel)
  try { localStorage.setItem(CLAVE_NIVEL, String(n)) } catch { /* sin guardado, sigue en memoria */ }
  cambiar({ ...estadoVelocidad(), nivel: n })
}
// Para las pruebas: vuelve a leer lo guardado.
export function olvidarEstadoVelocidad() { estado = null }

// EL MOTOR DE VELOCIDAD FIJA. Habla el mismo idioma que el de la voz -MotorDeAvance-, asi la vista,
// la pastilla del tiempo y el arrastre a mano lo usan sin saber cual es. No oye: confirmar, tentativo,
// falloCalce y voz no hacen nada. Avanza solo mientras corre -seguir/pausar-, a las palabras por
// minuto del nivel, y se detiene en la ultima palabra.
export interface MotorFijo extends MotorDeAvance {
  readonly esFijo: true
  seguir(tMs: number): void
  pausar(tMs: number): void
  cambiarNivel(nivel: number, tMs: number): void
  corriendo(): boolean
}

export function esMotorFijo(m: MotorDeAvance | null | undefined): m is MotorFijo {
  return !!m && (m as Partial<MotorFijo>).esFijo === true
}

export function crearMotorFijo(totalTokens: number, nivel: number = NIVEL_POR_OMISION): MotorFijo {
  let posicion = 0
  let ppm = ppmDeNivel(nivel)
  let corre = false
  let tPrevio: number | null = null
  const ultimo = Math.max(0, totalTokens - 1)
  let ultimoEstado: EstadoAvance = armar(0)

  function armar(tMs: number): EstadoAvance {
    return {
      posicion,
      avanzando: corre && posicion < ultimo,
      estado: 'SIGUIENDO',
      motivoFreno: null,
      ppmEstimadas: ppm,
      // La «ultima palabra oida» es la que esta pasando: la vista no adelanta nada -no hay demora
      // del reconocedor que compensar-.
      ultimoCalce: Math.floor(posicion),
      tUltimoCalceMs: tMs
    }
  }
  function avanzarHasta(tMs: number) {
    if (corre && tPrevio !== null && tMs > tPrevio) {
      posicion = Math.min(ultimo, posicion + ((tMs - tPrevio) * ppm) / 60000)
    }
    tPrevio = tMs
  }

  return {
    esFijo: true,
    confirmar() {},
    tentativo() {},
    falloCalce() {},
    voz() {},
    estadoEn(tMs: number) {
      avanzarHasta(tMs)
      ultimoEstado = armar(tMs)
      return ultimoEstado
    },
    leerEstado() {
      return ultimoEstado
    },
    irAToken(token: number, tMs: number) {
      posicion = Math.max(0, Math.min(ultimo, token))
      tPrevio = tMs
      ultimoEstado = armar(tMs)
    },
    reiniciar() {
      posicion = 0
      corre = false
      tPrevio = null
      ultimoEstado = armar(0)
    },
    seguir(tMs: number) {
      corre = true
      tPrevio = tMs
    },
    pausar(tMs: number) {
      avanzarHasta(tMs)
      corre = false
      ultimoEstado = armar(tMs)
    },
    cambiarNivel(n: number, tMs: number) {
      // Lo andado hasta ahora va al ritmo de antes; desde aqui, al nuevo.
      avanzarHasta(tMs)
      ppm = ppmDeNivel(n)
    },
    corriendo() {
      return corre
    }
  }
}

// PALABRAS A PIXELES, PAREJO -correccion 1, 14-10-2026-. Medido en el telefono -.motor.txt, nivel 4-:
// la posicion del motor fijo subia pareja, pero la pantalla seguia la cadena de la voz -renglon trabado,
// blanco que cambia una vez por renglon- y quedaba quieta 2 a 3 s para despues saltar ~33 px en 250 ms.
// Con Velocidad fija el texto sube a pixeles por segundo constantes: un solo factor para todo el
// texto, del primer renglon al ultimo, sin escalones por renglon. Con la voz no se usa.
export function pxPorPalabra(renglones: Renglon[]): number {
  if (renglones.length < 2) return 0
  const primero = renglones[0]
  const ultimo = renglones[renglones.length - 1]
  const palabras = ultimo.desdeToken - primero.desdeToken
  return palabras > 0 ? (ultimo.top - primero.top) / palabras : 0
}

// El pixel de una posicion -en palabras, con fraccion-. Sin renglones, 0; con uno, su top.
export function pxDePosicion(posicion: number, renglones: Renglon[]): number {
  if (renglones.length === 0) return 0
  const primero = renglones[0]
  return primero.top + (posicion - primero.desdeToken) * pxPorPalabra(renglones)
}

// La inversa: la posicion -en palabras- de un pixel. Para soltar el arrastre donde quedo la pantalla.
// Sin renglones, o con uno solo, 0 -o el primer token-: no hay con que dividir.
export function posicionDePx(px: number, renglones: Renglon[]): number {
  if (renglones.length === 0) return 0
  const k = pxPorPalabra(renglones)
  const primero = renglones[0]
  if (k === 0) return primero.desdeToken
  return primero.desdeToken + (px - primero.top) / k
}

// El renglon de un pixel, para la franja de foco: el i con renglones[i].top <= px < renglones[i+1].top.
// Antes del primero, 0; despues del ultimo, el ultimo.
export function renglonDePx(px: number, renglones: Renglon[]): number {
  let i = 0
  while (i + 1 < renglones.length && renglones[i + 1].top <= px) i++
  return i
}
