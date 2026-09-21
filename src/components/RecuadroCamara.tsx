import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface RecuadroCamaraProps {
  modoCamara: 'frontal' | 'trasera'
  recuadroX: number // fracción 0..1
  recuadroY: number // fracción 0..1
  onChangePosicion?: (x: number, y: number) => void
  onArrastrandoChange?: (arrastrando: boolean) => void
  arrastrable?: boolean
}

export function RecuadroCamara({
  modoCamara,
  recuadroX,
  recuadroY,
  onChangePosicion,
  onArrastrandoChange,
  arrastrable = false
}: RecuadroCamaraProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [dimensiones, setDimensiones] = useState<{ W: number; H: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null)

  const recalcularDimensiones = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const parent = el.parentElement || document.body
    const w = parent.clientWidth || window.innerWidth
    const h = parent.clientHeight || window.innerHeight
    if (w > 0 && h > 0) {
      setDimensiones({ W: w, H: h })
    }
  }, [])

  useEffect(() => {
    recalcularDimensiones()
    const el = containerRef.current
    if (!el) return
    const target = el.parentElement || el
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        recalcularDimensiones()
      })
      observer.observe(target)
      return () => observer.disconnect()
    }
  }, [recalcularDimensiones])

  const getContainerDimensions = () => {
    if (dimensiones) return dimensiones
    const el = containerRef.current
    const parent = el?.parentElement || document.body
    return {
      W: parent.clientWidth || window.innerWidth || 360,
      H: parent.clientHeight || window.innerHeight || 640
    }
  }

  const { W, H } = dimensiones || getContainerDimensions()
  const recuadroW = W * 0.32
  const recuadroH = recuadroW * (4 / 3)

  const currentX = dragPos ? dragPos.x : recuadroX * W
  const currentY = dragPos ? dragPos.y : recuadroY * H

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrable) return
    e.stopPropagation()
    const target = e.currentTarget
    try {
      target.setPointerCapture(e.pointerId)
    } catch (err) {}

    isDraggingRef.current = true
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: currentX,
      startY: currentY
    }
    if (onArrastrandoChange) {
      onArrastrandoChange(true)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrable || !isDraggingRef.current || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.pointerX
    const dy = e.clientY - dragStartRef.current.pointerY
    const rawX = dragStartRef.current.startX + dx
    const rawY = dragStartRef.current.startY + dy

    const { W: winW, H: winH } = getContainerDimensions()
    const rW = winW * 0.32
    const rH = rW * (4 / 3)

    const clampedX = Math.max(0, Math.min(winW - rW, rawX))
    const clampedY = Math.max(0, Math.min(winH - rH, rawY))

    setDragPos({ x: clampedX, y: clampedY })

    // Escalón 1 (DIRECTO): Manda la orden de posición en cada movimiento del dedo
    const fracX = winW > 0 ? clampedX / winW : 0
    const fracY = winH > 0 ? clampedY / winH : 0
    if (onChangePosicion) {
      onChangePosicion(fracX, fracY)
    }
  }

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrable || !isDraggingRef.current || !dragStartRef.current) return
    const target = e.currentTarget
    try {
      target.releasePointerCapture(e.pointerId)
    } catch (err) {}

    isDraggingRef.current = false

    const dx = e.clientX - dragStartRef.current.pointerX
    const dy = e.clientY - dragStartRef.current.pointerY
    const rawX = dragStartRef.current.startX + dx
    const rawY = dragStartRef.current.startY + dy

    dragStartRef.current = null

    const { W: winW, H: winH } = getContainerDimensions()
    const rW = winW * 0.32
    const rH = rW * (4 / 3)

    const clampedX = Math.max(0, Math.min(winW - rW, rawX))
    const clampedY = Math.max(0, Math.min(winH - rH, rawY))

    setDragPos({ x: clampedX, y: clampedY })

    const fracX = winW > 0 ? clampedX / winW : 0
    const fracY = winH > 0 ? clampedY / winH : 0

    if (onChangePosicion) {
      onChangePosicion(fracX, fracY)
    }
    if (onArrastrandoChange) {
      onArrastrandoChange(false)
    }
  }

  return (
    <div
      ref={containerRef}
      data-testid="recuadro-camara"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      style={{
        position: 'absolute',
        left: currentX,
        top: currentY,
        width: recuadroW,
        height: recuadroH,
        borderRadius: 'var(--redondeo)',
        overflow: 'hidden',
        border: '1px solid var(--color-borde)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        zIndex: 0,
        touchAction: 'none',
        cursor: arrastrable ? 'grab' : 'default',
        boxSizing: 'border-box',
        visibility: dimensiones ? 'visible' : 'hidden',
        backgroundColor: 'transparent'
      }}
    />
  )
}
