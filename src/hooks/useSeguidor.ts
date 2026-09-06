import { useEffect, useRef, useState } from 'react'
import { crearSeguidor, Posicion, tokenizarGuion } from '../lib/seguidor'
import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'
import { crearRegistro, RegistroDeLectura } from '../lib/registro'
import { EventoFinal } from '../motor/MotorDeVoz'

export function useSeguidor(guion: string) {
  const [posicion, setPosicion] = useState<Posicion>({ linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  const seguidorRef = useRef<ReturnType<typeof crearSeguidor> | null>(null)
  const motorAvanceRef = useRef<MotorDeAvance | null>(null)
  const registroRef = useRef<RegistroDeLectura | null>(null)

  useEffect(() => {
    const tokens = tokenizarGuion(guion)
    const limitesMap = new Map<number, number>()
    for (let i = 0; i < tokens.length; i++) {
      limitesMap.set(tokens[i].linea, i)
    }
    const limitesDeLinea = Array.from(limitesMap.values()).sort((a, b) => a - b)

    seguidorRef.current = crearSeguidor(tokens)
    motorAvanceRef.current = crearMotorDeAvance(undefined, limitesDeLinea)
    registroRef.current = crearRegistro()
    setPosicion({ linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  }, [guion])

  function alRecibirParcial(texto: string) {
    const seg = seguidorRef.current
    const motor = motorAvanceRef.current
    if (!seg || !motor) return
    const tMs = performance.now()
    motor.voz(true, tMs)
    const pos = seg.avanzarTentativo(texto)
    if (pos.movio) {
      motor.tentativo(pos.hastaToken, tMs)
      setPosicion(pos)
    }
  }

  function alRecibirFinal(fraseFinal: string | EventoFinal) {
    const seg = seguidorRef.current
    const motor = motorAvanceRef.current
    const reg = registroRef.current
    if (!seg || !motor) return

    const tMs = performance.now()
    motor.voz(true, tMs)

    const texto = typeof fraseFinal === 'string' ? fraseFinal : (fraseFinal?.texto || '')
    const inicioMs = typeof fraseFinal === 'string' ? tMs - 1000 : (fraseFinal?.inicioMs || tMs - 1000)
    const finMs = typeof fraseFinal === 'string' ? tMs : (fraseFinal?.finMs || tMs)

    const pos = seg.avanzar(texto)
    if (pos.movio) {
      motor.confirmar(pos.hastaToken, tMs)
      if (reg) {
        reg.anotar({
          desdeToken: pos.desdeToken,
          hastaToken: pos.hastaToken,
          inicioMs,
          finMs,
          textoReconocido: texto
        })
      }
      setPosicion(pos)
    } else {
      console.warn(`[Seguidor] Final no movió para texto "${texto}"`)
      motor.falloCalce(tMs)
    }
  }

  function alNotificarVoz(hayVoz: boolean) {
    if (motorAvanceRef.current) {
      motorAvanceRef.current.voz(hayVoz, performance.now())
    }
  }

  function reiniciar() {
    if (seguidorRef.current) seguidorRef.current.reiniciar()
    if (motorAvanceRef.current) motorAvanceRef.current.reiniciar()
    if (registroRef.current) registroRef.current.limpiar()
    setPosicion({ linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  }

  return {
    lineaActual: posicion.linea,
    palabraActual: posicion.palabra,
    movio: posicion.movio,
    alRecibirParcial,
    alRecibirFinal,
    alNotificarVoz,
    reiniciar,
    motorAvance: motorAvanceRef.current,
    registro: registroRef.current
  }
}
