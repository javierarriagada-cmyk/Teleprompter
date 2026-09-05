import { useEffect, useRef, useState } from 'react'
import { crearSeguidor, Posicion, tokenizarGuion } from '../lib/seguidor'

export function useSeguidor(guion: string) {
  const [posicion, setPosicion] = useState<Posicion>({ linea: 0, palabra: 0, movio: false })
  const seguidorRef = useRef<ReturnType<typeof crearSeguidor> | null>(null)

  useEffect(() => {
    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)
    seguidorRef.current = seguidor
    setPosicion({ linea: 0, palabra: 0, movio: false })
  }, [guion])

  function alRecibirFinal(fraseFinal: string) {
    const seguidor = seguidorRef.current
    if (!seguidor) return
    const pos = seguidor.avanzar(fraseFinal)
    setPosicion(pos)
  }

  function reiniciar() {
    if (seguidorRef.current) {
      seguidorRef.current.reiniciar()
    }
    setPosicion({ linea: 0, palabra: 0, movio: false })
  }

  return {
    lineaActual: posicion.linea,
    palabraActual: posicion.palabra,
    movio: posicion.movio,
    alRecibirFinal,
    reiniciar
  }
}
