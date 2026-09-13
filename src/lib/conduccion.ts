import { Seguidor, Posicion, Token, MIN_PALABRAS_COINCIDENTES } from './seguidor'
import { MotorDeAvance } from './avance'
import { anotar } from './diagnostico'

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
  }

  if (pos.movio && enVentana) {
    const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
    const limiteSiguiente = obtenerLimiteLineaSiguiente(ref, limitesDeLinea)
    const tokenCapped = Math.min(pos.hastaToken, limiteSiguiente)

    motor.confirmar(tokenCapped, tMs)
    return { ...pos, hastaToken: tokenCapped }
  } else if (contarPalabras(texto) >= PALABRAS_PARA_QUE_UN_FALLO_CUENTE) {
    console.warn(`[Seguidor] Final no movió o cayó fuera de ventana para texto "${texto}"`)
    motor.falloCalce(tMs)
  }
  return null
}
