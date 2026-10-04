import { Seguidor, Posicion, Token, MIN_PALABRAS_COINCIDENTES } from './seguidor'
import { MotorDeAvance } from './avance'
import { anotar } from './diagnostico'
import { HERRAMIENTAS } from './herramientas'

export type Conduccion = {
  seguidor: Seguidor
  motor: MotorDeAvance
  tokens: Token[]
  limitesDeLinea: number[]
}

const PALABRAS_PARA_QUE_UN_FALLO_CUENTE = MIN_PALABRAS_COINCIDENTES

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

function obtenerLimiteLineaSiguiente(idx: number, limites: number[]): number {
  if (!limites || limites.length === 0) return idx + 20
  for (let i = 0; i < limites.length; i++) {
    if (limites[i] >= idx) {
      return i + 1 < limites.length ? limites[i + 1] : limites[i]
    }
  }
  return limites[limites.length - 1]
}

export function procesarParcial(c: Conduccion, texto: string, tMs: number): Posicion | null {
  const { seguidor: seg, motor, tokens, limitesDeLinea } = c
  if (!seg || !motor || tokens.length === 0) return null

  motor.voz(true, tMs)
  const st = motor.estadoEn(tMs)
  const pos = seg.avanzarTentativo(texto, tMs, st.ppmEstimadas, st.tUltimoCalceMs)
  anotar({ tipo: 'calce', token: pos.movio ? pos.hastaToken : null, texto })

  let enVentana = false
  if (pos.movio && tokens.length > 0) {
    const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
    const posMin = Math.max(0, ref - 10)
    const posMax = ref + 40
    enVentana = pos.hastaToken >= posMin && pos.hastaToken <= posMax
    // -tarea 89, 04-10-2026-: el 'calce' de arriba ya quedó anotado; si cae fuera de la
    // ventana no se aplica, y el registro tiene que decirlo para no leerlo como avance.
    if (!enVentana) anotar({ tipo: 'ventana', token: pos.hastaToken, ref, desde: posMin, hasta: posMax, final: false, seguidor: typeof seg.posicionToken === 'function' ? seg.posicionToken() : -1 })
  }

  if (pos.movio && enVentana) {
    const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
    const limiteSiguiente = obtenerLimiteLineaSiguiente(ref, limitesDeLinea)
    const tokenCapped = Math.min(pos.hastaToken, limiteSiguiente)

    motor.tentativo(tokenCapped, tMs)
    return { ...pos, hastaToken: tokenCapped }
  } else if (contarPalabras(texto) >= PALABRAS_PARA_QUE_UN_FALLO_CUENTE) {
    motor.falloCalce(tMs, true)
  }
  return null
}

export function procesarFinal(c: Conduccion, texto: string, tMs: number): Posicion | null {
  const { seguidor: seg, motor, tokens, limitesDeLinea } = c
  if (!seg || !motor || tokens.length === 0) return null

  motor.voz(true, tMs)
  const st = motor.estadoEn(tMs)
  const pos = seg.avanzar(texto, tMs, st.ppmEstimadas, st.tUltimoCalceMs)
  anotar({ tipo: 'calce', token: pos.movio ? pos.hastaToken : null, texto })

  let enVentana = false
  if (pos.movio && tokens.length > 0) {
    const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
    const posMin = Math.max(0, ref - 10)
    const posMax = ref + 40
    enVentana = pos.hastaToken >= posMin && pos.hastaToken <= posMax
    // -tarea 89, 04-10-2026-: el 'calce' de arriba ya quedó anotado; si cae fuera de la
    // ventana no se aplica, y el registro tiene que decirlo para no leerlo como avance.
    if (!enVentana) anotar({ tipo: 'ventana', token: pos.hastaToken, ref, desde: posMin, hasta: posMax, final: true, seguidor: typeof seg.posicionToken === 'function' ? seg.posicionToken() : -1 })
  }

  if (pos.movio && enVentana) {
    const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
    const limiteSiguiente = obtenerLimiteLineaSiguiente(ref, limitesDeLinea)
    const tokenCapped = Math.min(pos.hastaToken, limiteSiguiente)

    motor.confirmar(tokenCapped, tMs)
    return { ...pos, hastaToken: tokenCapped }
  } else if (contarPalabras(texto) >= PALABRAS_PARA_QUE_UN_FALLO_CUENTE) {
    // LO QUE DIJO LA PERSONA NO VA A LA CONSOLA EN PLAY -tarea 84, B4, 29-09-2026-: es un
    // registro de prueba con el texto oído. En la APK de prueba y en el navegador sigue igual.
    if (HERRAMIENTAS) console.warn(`[Seguidor] Final no movió o cayó fuera de ventana para texto "${texto}"`)
    motor.falloCalce(tMs)
  }
  return null
}
