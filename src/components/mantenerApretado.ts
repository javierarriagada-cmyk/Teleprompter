import React, { useRef, useState } from 'react'
import { CURVA_RESORTE, MS_CHICO, movimientoApagado } from './movimiento'
import { hapticaAvisoMantener } from '../haptica'

// UN SOLO LUGAR PARA LOS TIEMPOS DEL GESTO. La fila de guion, la toma y el
// boton Leer de la tarjeta tienen que durar lo mismo. Si cada uno trae su
// numero, a la segunda tarea ya no es el mismo gesto.
//
// 300 ms: "te senti" — vibracion corta y la tarjeta se comprime.
// 500 ms: se suelta el menu o el atajo. Soltar entre medio no abre nada.
// Aca viven los TIEMPOS del gesto y nada mas. La vibracion del aviso no tiene
// duracion nuestra: la pone el sistema con su efecto de tic. Ver
// hapticaAvisoMantener en src/haptica.ts, donde esta escrito por que.
export const MS_MANTENER_APRETADO = 500
export const MS_AVISO_MANTENER = 300
const PX_PARA_CANCELAR = 10
export const ESCALA_AVISO = 0.97

export function estiloComprimirPorAviso(avisado: boolean): React.CSSProperties {
  return {
    transform: avisado ? `scale(${ESCALA_AVISO})` : 'scale(1)',
    transition: movimientoApagado() ? 'none' : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`,
    transformOrigin: 'center center'
  }
}

export function programarMantener(alDisparar: () => void, alAvisar?: () => void): {
  arrancar: () => void
  cancelar: () => void
  seDisparo: () => boolean
  seAviso: () => boolean
} {
  let timerAviso: ReturnType<typeof setTimeout> | null = null
  let timerMenu: ReturnType<typeof setTimeout> | null = null
  let disparo = false
  let aviso = false
  return {
    arrancar() {
      disparo = false
      aviso = false
      if (timerAviso) clearTimeout(timerAviso)
      if (timerMenu) clearTimeout(timerMenu)
      timerAviso = setTimeout(() => {
        aviso = true
        timerAviso = null
        alAvisar?.()
      }, MS_AVISO_MANTENER)
      timerMenu = setTimeout(() => {
        disparo = true
        timerMenu = null
        alDisparar()
      }, MS_MANTENER_APRETADO)
    },
    cancelar() {
      if (timerAviso) {
        clearTimeout(timerAviso)
        timerAviso = null
      }
      if (timerMenu) {
        clearTimeout(timerMenu)
        timerMenu = null
      }
    },
    seDisparo() {
      return disparo
    },
    seAviso() {
      return aviso
    }
  }
}

function posicionDe(e: { nativeEvent?: any; touches?: any; changedTouches?: any; clientX?: number; clientY?: number }): { x: number; y: number } {
  const native = e.nativeEvent
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  }
  const x = typeof e.clientX === 'number' ? e.clientX : native?.clientX ?? 0
  const y = typeof e.clientY === 'number' ? e.clientY : native?.clientY ?? 0
  return { x, y }
}

// Para el boton de la tarjeta y la tarjeta de una toma: mantener dispara
// onMantener. Un movimiento de mas de 10 px cancela el temporizador.
// A los 300 ms avisa (haptica corta + comprimido). A los 500 ms abre.
export function useMantenerApretado(opts: {
  onMantener: () => void
  onToque?: () => void
  onAviso?: () => void
}) {
  const timerAvisoRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerMenuRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const seMovioRef = useRef(false)
  const [avisado, setAvisado] = useState(false)

  function limpiarTimers() {
    if (timerAvisoRef.current) {
      clearTimeout(timerAvisoRef.current)
      timerAvisoRef.current = null
    }
    if (timerMenuRef.current) {
      clearTimeout(timerMenuRef.current)
      timerMenuRef.current = null
    }
  }

  function handleDown(e: React.SyntheticEvent) {
    e.stopPropagation()
    const { x, y } = posicionDe(e as any)
    startRef.current = { x, y }
    seMovioRef.current = false
    fueLongPressRef.current = false
    setAvisado(false)
    limpiarTimers()
    timerAvisoRef.current = setTimeout(() => {
      timerAvisoRef.current = null
      setAvisado(true)
      hapticaAvisoMantener()
      opts.onAviso?.()
    }, MS_AVISO_MANTENER)
    timerMenuRef.current = setTimeout(() => {
      fueLongPressRef.current = true
      timerMenuRef.current = null
      opts.onMantener()
    }, MS_MANTENER_APRETADO)
  }

  function handleMove(e: React.SyntheticEvent) {
    if (!startRef.current) return
    const { x, y } = posicionDe(e as any)
    if (Math.hypot(x - startRef.current.x, y - startRef.current.y) >= PX_PARA_CANCELAR) {
      seMovioRef.current = true
      limpiarTimers()
      setAvisado(false)
    }
  }

  function handleUp(e: React.SyntheticEvent) {
    e.stopPropagation()
    limpiarTimers()
    const eraLongPress = fueLongPressRef.current
    const seMovio = seMovioRef.current
    startRef.current = null
    seMovioRef.current = false
    setAvisado(false)
    if (!eraLongPress && !seMovio) {
      opts.onToque?.()
    }
  }

  return {
    fueLongPressRef,
    avisado,
    props: {
      onPointerDown: handleDown,
      onPointerMove: handleMove,
      onPointerUp: handleUp,
      onPointerCancel: handleUp,
      onMouseDown: handleDown,
      onMouseUp: handleUp,
      onTouchStart: handleDown,
      onTouchEnd: handleUp,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }
}
