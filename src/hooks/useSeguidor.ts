import { useEffect, useRef, useState } from 'react'
import { crearSeguidor, MIN_PALABRAS_COINCIDENTES, Posicion, tokenizarGuion } from '../lib/seguidor'
import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'
import { crearRegistro, RegistroDeLectura } from '../lib/registro'
import { anotar } from '../lib/diagnostico'
import { EventoFinal } from '../motor/MotorDeVoz'
import { Guion } from '../datos/modelo'

// Cuantas palabras tiene que traer un final del reconocedor para que, si no calza, eso cuente
// como evidencia de que el lector se perdio. Es el mismo minimo con el que el seguidor puede
// puntuar una frase: por debajo de eso no es que el lector este en otro lado, es que no hay
// con que decidir.
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

export function useSeguidor(guionEntrada: Guion | string) {
  const [posicion, setPosicion] = useState<Posicion>({ bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  const [motorAvance, setMotorAvance] = useState<MotorDeAvance | null>(null)
  const seguidorRef = useRef<ReturnType<typeof crearSeguidor> | null>(null)
  const motorAvanceRef = useRef<MotorDeAvance | null>(null)
  const registroRef = useRef<RegistroDeLectura | null>(null)

  const tokensRef = useRef<ReturnType<typeof tokenizarGuion>>([])
  const limitesDeLineaRef = useRef<number[]>([])
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
    limitesDeLineaRef.current = limitesDeLinea
    const limitesDeBloque = Array.from(limitesBloqueMap.values()).sort((a, b) => a - b)

    const motor = crearMotorDeAvance(undefined, limitesDeLinea, limitesDeBloque)
    seguidorRef.current = crearSeguidor(tokens)
    motorAvanceRef.current = motor
    setMotorAvance(motor)
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
    const st = motor.estadoEn(tMs)
    const pos = seg.avanzarTentativo(texto, tMs, st.ppmEstimadas, st.tUltimoCalceMs)
    anotar({ tipo: 'calce', token: pos.movio ? pos.hastaToken : null, texto })

    let enVentana = false
    if (pos.movio && tokensRef.current.length > 0) {
      const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
      const posMin = Math.max(0, ref - 10)
      const posMax = ref + 40
      enVentana = pos.hastaToken >= posMin && pos.hastaToken <= posMax
    }

    if (pos.movio && enVentana) {
      const idxActual = Math.min(tokensRef.current.length - 1, Math.max(0, Math.floor(st.posicion)))
      const limiteSiguiente = obtenerLimiteLineaSiguiente(idxActual, limitesDeLineaRef.current)
      const tokenCapped = Math.min(pos.hastaToken, limiteSiguiente)

      motor.tentativo(tokenCapped, tMs)
      setPosicion({ ...pos, hastaToken: tokenCapped })
    } else if (contarPalabras(texto) >= PALABRAS_PARA_QUE_UN_FALLO_CUENTE) {
      motor.falloCalce(tMs, true)
    }
  }

  function alRecibirFinal(fraseFinal: string | EventoFinal) {
    const seg = seguidorRef.current
    const motor = motorAvanceRef.current
    const reg = registroRef.current
    if (!seg || !motor) return

    const tMs = typeof fraseFinal === 'string' ? performance.now() : (fraseFinal?.finMs || performance.now())
    motor.voz(true, tMs)

    const texto = typeof fraseFinal === 'string' ? fraseFinal : (fraseFinal?.texto || '')
    const inicioMs = typeof fraseFinal === 'string' ? tMs - 1000 : (fraseFinal?.inicioMs || tMs - 1000)
    const finMs = tMs

    const st = motor.estadoEn(tMs)
    const pos = seg.avanzar(texto, tMs, st.ppmEstimadas, st.tUltimoCalceMs)
    anotar({ tipo: 'calce', token: pos.movio ? pos.hastaToken : null, texto })

    let enVentana = false
    if (pos.movio && tokensRef.current.length > 0) {
      const ref = Math.max(st.ultimoCalce, Math.floor(st.posicion))
      const posMin = Math.max(0, ref - 10)
      const posMax = ref + 40
      enVentana = pos.hastaToken >= posMin && pos.hastaToken <= posMax
    }

    if (pos.movio && enVentana) {
      const idxActual = Math.min(tokensRef.current.length - 1, Math.max(0, Math.floor(st.posicion)))
      const limiteSiguiente = obtenerLimiteLineaSiguiente(idxActual, limitesDeLineaRef.current)
      const tokenCapped = Math.min(pos.hastaToken, limiteSiguiente)

      bloqueConfirmadoRef.current = pos.bloque
      motor.confirmar(tokenCapped, tMs)
      if (reg) {
        reg.anotar({
          desdeToken: pos.desdeToken,
          hastaToken: tokenCapped,
          inicioMs,
          finMs,
          textoReconocido: texto
        })
      }
      setPosicion({ ...pos, hastaToken: tokenCapped })
    } else if (contarPalabras(texto) >= PALABRAS_PARA_QUE_UN_FALLO_CUENTE) {
      console.warn(`[Seguidor] Final no movió o cayó fuera de ventana para texto "${texto}"`)
      motor.falloCalce(tMs)
    }
    // Y SI EL FINAL ERA CORTO, NO PASA NADA. Ni confirma ni falla: es NEUTRO.
    //
    // Esto es lo que arregla que apareciera "Buscando tu posicion" cada dos o tres palabras
    // leyendo perfecto. Android emite finales de una o dos palabras todo el tiempo -"si",
    // "bueno", "y entonces"-, y con menos de tres palabras reconocibles el seguidor no tiene
    // con que puntuar, asi que devolvia movio:false. Aca se contaba como fallo, y dos de esos
    // seguidos hacian que el motor se declarara perdido.
    //
    // No poder sacar informacion de algo NO ES lo mismo que recibir informacion que contradice
    // donde creemos estar. Lo primero no dice nada y no debe mover ninguna decision; lo segundo
    // si, y para eso queda el contador. Si de verdad se perdio y ademas se callo, el camino por
    // TIEMPO -msSinCalceParaFrenar- lo agarra igual.
  }

  function alNotificarVoz(hayVoz: boolean) {
    if (motorAvanceRef.current) {
      motorAvanceRef.current.voz(hayVoz, performance.now())
    }
  }

  // El usuario movio el texto a mano hasta cierta palabra: la ventana de contexto se muda
  // con el. No es una recuperacion: es navegacion deliberada.
  function irAToken(token: number) {
    const seg = seguidorRef.current
    const motor = motorAvanceRef.current
    const tokens = tokensRef.current
    if (!seg || !motor || tokens.length === 0) return

    const destino = Math.max(0, Math.min(token, tokens.length - 1))
    seg.irAToken(destino)
    motor.irAToken(destino, performance.now())

    const t = tokens[destino]
    bloqueConfirmadoRef.current = t.bloque
    setPosicion({ bloque: t.bloque, linea: t.linea, palabra: t.indiceEnLinea, desdeToken: destino, hastaToken: destino, movio: true })
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
    totalTokens: tokensRef.current.length,
    movio: posicion.movio,
    alRecibirParcial,
    alRecibirFinal,
    alNotificarVoz,
    irAToken,
    reiniciar,
    motorAvance,
    registro: registroRef.current
  }
}
