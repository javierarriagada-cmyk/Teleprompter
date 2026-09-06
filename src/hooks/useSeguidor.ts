import { useEffect, useRef, useState } from 'react'
import { crearSeguidor, Posicion, tokenizarGuion } from '../lib/seguidor'
import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'
import { crearRegistro, RegistroDeLectura } from '../lib/registro'
import { EventoFinal } from '../motor/MotorDeVoz'
import { Guion } from '../datos/modelo'

export function useSeguidor(guionEntrada: Guion | string) {
  const [posicion, setPosicion] = useState<Posicion>({ bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  const seguidorRef = useRef<ReturnType<typeof crearSeguidor> | null>(null)
  const motorAvanceRef = useRef<MotorDeAvance | null>(null)
  const registroRef = useRef<RegistroDeLectura | null>(null)

  const tokensRef = useRef<ReturnType<typeof tokenizarGuion>>([])
  const limitesBloqueMapRef = useRef<Map<number, number>>(new Map())
  const bloqueConfirmadoRef = useRef<number>(0)

  useEffect(() => {
    let guion: Guion
    if (typeof guionEntrada === 'string') {
      guion = {
        id: 'temporal',
        titulo: 'Guion temporal',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [
          {
            id: 'bloque-1',
            nombre: '',
            texto: guionEntrada
          }
        ]
      }
    } else {
      guion = guionEntrada
    }

    const tokens = tokenizarGuion(guion)
    tokensRef.current = tokens

    const limitesLineaMap = new Map<string, number>()
    const limitesBloqueMap = new Map<number, number>()

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const claveLinea = `${t.bloque}-${t.linea}`
      limitesLineaMap.set(claveLinea, i)
      limitesBloqueMap.set(t.bloque, i)
    }

    limitesBloqueMapRef.current = limitesBloqueMap

    const limitesDeLinea = Array.from(limitesLineaMap.values()).sort((a, b) => a - b)
    const limitesDeBloque = Array.from(limitesBloqueMap.values()).sort((a, b) => a - b)

    seguidorRef.current = crearSeguidor(tokens)
    motorAvanceRef.current = crearMotorDeAvance(undefined, limitesDeLinea, limitesDeBloque)
    registroRef.current = crearRegistro()
    bloqueConfirmadoRef.current = 0
    setPosicion({ bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  }, [guionEntrada])

  function alRecibirParcial(texto: string) {
    const seg = seguidorRef.current
    const motor = motorAvanceRef.current
    const tokens = tokensRef.current
    if (!seg || !motor || tokens.length === 0) return

    const tMs = performance.now()
    motor.voz(true, tMs)
    const pos = seg.avanzarTentativo(texto)

    if (pos.movio) {
      const bConf = bloqueConfirmadoRef.current
      const limiteBloqueActual = limitesBloqueMapRef.current.get(bConf) ?? (tokens.length - 1)

      let posAcotada = pos
      if (pos.hastaToken > limiteBloqueActual) {
        const tokenTope = Math.min(pos.hastaToken, limiteBloqueActual)
        const tok = tokens[tokenTope]
        posAcotada = {
          bloque: tok.bloque,
          linea: tok.linea,
          palabra: tok.indiceEnLinea,
          desdeToken: pos.desdeToken,
          hastaToken: tokenTope,
          movio: true
        }
      }

      motor.tentativo(posAcotada.hastaToken, tMs)
      setPosicion(posAcotada)
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
      bloqueConfirmadoRef.current = pos.bloque
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
    bloqueConfirmadoRef.current = 0
    setPosicion({ bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  }

  return {
    bloqueActual: posicion.bloque,
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
