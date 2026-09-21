import React, { useRef } from 'react'

// UN SOLO LUGAR PARA LOS 500 ms. La fila de guion, la toma y el boton Leer
// de la tarjeta tienen que durar lo mismo. Si cada uno trae su numero, a la
// segunda tarea ya no es el mismo gesto.
export const MS_MANTENER_APRETADO = 500
const PX_PARA_CANCELAR = 10

export function programarMantener(alDisparar: () => void): {
  arrancar: () => void
  cancelar: () => void
  seDisparo: () => boolean
} {
  let timer: ReturnType<typeof setTimeout> | null = null
  let disparo = false
  return {
    arrancar() {
      disparo = false
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        disparo = true
        timer = null
        alDisparar()
      }, MS_MANTENER_APRETADO)
    },
    cancelar() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
    seDisparo() {
      return disparo
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
export function useMantenerApretado(opts: {
  onMantener: () => void
  onToque?: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const seMovioRef = useRef(false)

  function limpiarTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handleDown(e: React.SyntheticEvent) {
    e.stopPropagation()
    const { x, y } = posicionDe(e as any)
    startRef.current = { x, y }
    seMovioRef.current = false
    fueLongPressRef.current = false
    limpiarTimer()
    timerRef.current = setTimeout(() => {
      fueLongPressRef.current = true
      timerRef.current = null
      opts.onMantener()
    }, MS_MANTENER_APRETADO)
  }

  function handleMove(e: React.SyntheticEvent) {
    if (!startRef.current) return
    const { x, y } = posicionDe(e as any)
    if (Math.hypot(x - startRef.current.x, y - startRef.current.y) >= PX_PARA_CANCELAR) {
      seMovioRef.current = true
      limpiarTimer()
    }
  }

  function handleUp(e: React.SyntheticEvent) {
    e.stopPropagation()
    limpiarTimer()
    const eraLongPress = fueLongPressRef.current
    const seMovio = seMovioRef.current
    startRef.current = null
    seMovioRef.current = false
    if (!eraLongPress && !seMovio) {
      opts.onToque?.()
    }
  }

  return {
    fueLongPressRef,
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
