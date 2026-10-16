import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface RecuadroCamaraProps {
  recuadroX: number // fracción 0..1
  recuadroY: number // fracción 0..1
  colorFondo?: string
  onChangePosicion?: (x: number, y: number) => void
  onArrastrandoChange?: (arrastrando: boolean) => void
  arrastrable?: boolean
  // Donde quedo dibujado el hueco, en px de la pantalla -ver el efecto de abajo-.
  onRect?: (rect: { x: number; y: number; width: number; height: number }) => void
  // TELÉFONO DE LADO -tarea 82, 29-09-2026-. Con esto el recuadro deja de ser la fracción de la
  // pantalla vertical y pasa a vivir en una de las cuatro esquinas de la zona libre entre los
  // rieles. null o ausente: la pantalla vertical de siempre, sin ningún cambio.
  horizontal?: RecuadroHorizontal | null
}

// Las cuatro esquinas donde se imanta el recuadro en horizontal.
export type EsquinaRecuadroH = 'der-arriba' | 'der-abajo' | 'izq-arriba' | 'izq-abajo'

export interface RecuadroHorizontal {
  // El ancho de los rieles NO viene acá: sale de la hoja de estilos -styles-horizontal.css,
  // --riel-izq-grabar y --riel-der-, que es la que los dibuja. Un solo lugar para la medida: si
  // se cambia el riel, el tope del arrastre lo sigue solo.
  esquina: EsquinaRecuadroH
  onEsquina: (e: EsquinaRecuadroH) => void
  // El diseño de la ventana -tarea 83, 30-09-2026-: al pasar de uno a otro -girar la tableta- la
  // posición que dejó un arrastre ya no vale, igual que al pasar de vertical a horizontal.
  diseno?: string
}

// 144 x 81 -16:9-: la forma del video que se graba de lado, del tamaño de la hoja de medidas
// aprobada. La fórmula vertical -W * 0,32 y 4/3- en 844 x 390 daba 270 x 360: casi todo el alto,
// encima de los rieles y del texto. Son medidas de geometría para el arrastre, no de estilo.
export const RECUADRO_H_ANCHO = 144
export const RECUADRO_H_ALTO = 81
export const RECUADRO_H_MARGEN = 12

// LA MEDIDA Y LA ZONA EN TABLETA -tarea 83, 30-09-2026-. En la tableta el recuadro es otro
// -180 x 240 en vertical, 256 x 144 de lado- y la zona libre también: entre la barra de 72 y el
// dock de 172 en vertical, entre los rieles de 168 de lado. Esas medidas las escribe
// styles-tableta.css en variables -las mismas que dibujan la barra, el dock y los rieles- y acá se
// leen. En el teléfono de lado no hay variables y quedan las constantes de arriba: la 82 no cambia.
interface MedidaEsquinas {
  ancho: number
  alto: number
  margenX: number
  margenY: number
  // Lo que ocupan los controles a cada lado de la zona libre, sin el área segura.
  zonaIzq: number
  zonaDer: number
  zonaArr: number
  zonaAba: number
}

// La zona libre entre los rieles, en px del contenedor, con el área segura y el margen de 12.
function zonaLibreH(
  W: number,
  H: number,
  pad: { izq: number; der: number; arr: number; aba: number; rielIzq: number; rielDer: number; medida: MedidaEsquinas }
) {
  const m = pad.medida
  const minX = pad.izq + m.zonaIzq + m.margenX
  const maxX = Math.max(minX, W - pad.der - m.zonaDer - m.margenX - m.ancho)
  const minY = pad.arr + m.zonaArr + m.margenY
  const maxY = Math.max(minY, H - pad.aba - m.zonaAba - m.margenY - m.alto)
  return { minX, maxX, minY, maxY }
}

function posicionDeEsquina(e: EsquinaRecuadroH, z: { minX: number; maxX: number; minY: number; maxY: number }) {
  return {
    x: e.startsWith('izq') ? z.minX : z.maxX,
    y: e.endsWith('arriba') ? z.minY : z.maxY
  }
}

// La esquina más cercana al centro del recuadro al soltarlo.
export function esquinaMasCercana(
  x: number,
  y: number,
  z: { minX: number; maxX: number; minY: number; maxY: number }
): EsquinaRecuadroH {
  const lado = x - z.minX < z.maxX - x ? 'izq' : 'der'
  const alto = y - z.minY < z.maxY - y ? 'arriba' : 'abajo'
  return `${lado}-${alto}` as EsquinaRecuadroH
}

// SOLO SE GUARDA UNA POSICIÓN VÁLIDA -recuadro-arrastre, 15-10-2026-. recuadroX y recuadroY son
// fracciones de la pantalla: números finitos entre 0 y 1. Cualquier otra cosa -NaN, negativo, más de 1-
// no se guarda: se avisa por consola y queda la posición de antes. guardar se llama solo si vale.
export function aceptarPosicionRecuadro(x: number, y: number, guardar: (x: number, y: number) => void): boolean {
  const vale = (v: number) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
  if (!vale(x) || !vale(y)) {
    console.warn('[Recuadro] posición no guardada: recuadroX y recuadroY tienen que ser fracciones finitas entre 0 y 1, llegó', x, y)
    return false
  }
  guardar(x, y)
  return true
}

export function RecuadroCamara({
  recuadroX,
  recuadroY,
  colorFondo = '#151312',
  onChangePosicion,
  onArrastrandoChange,
  arrastrable = false,
  onRect,
  horizontal = null
}: RecuadroCamaraProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [dimensiones, setDimensiones] = useState<{ W: number; H: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null)
  // -recuadro-arrastre- El último punto del dedo que llegó con un pointermove: al cancelar se usa este.
  const ultimoPunteroRef = useRef<{ x: number; y: number } | null>(null)

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

  // Al girar el teléfono la posición que dejó un arrastre ya no vale: en vertical es un punto de
  // la pantalla vertical y en horizontal manda la esquina. Tarea 82, 29-09-2026.
  const esHorizontal = !!horizontal
  // 30-09-2026, tarea 83: y al pasar entre los diseños de tableta.
  const disenoEsquinas = horizontal?.diseno ?? ''
  useEffect(() => {
    setDragPos(null)
  }, [esHorizontal, disenoEsquinas])

  const getContainerDimensions = () => {
    if (dimensiones) return dimensiones
    const el = containerRef.current
    const parent = el?.parentElement || document.body
    return {
      W: parent.clientWidth || window.innerWidth || 360,
      H: parent.clientHeight || window.innerHeight || 640
    }
  }

  // El área segura del contenedor -TeleprompterView la pone como padding- para que la zona
  // libre del teléfono de lado no se meta bajo la muesca ni la barra de navegación.
  const leerPadding = () => {
    const parent = containerRef.current?.parentElement
    const medidaTelefono = (rielIzq: number, rielDer: number): MedidaEsquinas => ({
      ancho: RECUADRO_H_ANCHO,
      alto: RECUADRO_H_ALTO,
      margenX: RECUADRO_H_MARGEN,
      margenY: RECUADRO_H_MARGEN,
      zonaIzq: rielIzq,
      zonaDer: rielDer,
      zonaArr: 0,
      zonaAba: 0
    })
    if (!parent || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
      return { izq: 0, der: 0, arr: 0, aba: 0, rielIzq: 0, rielDer: 0, medida: medidaTelefono(0, 0) }
    }
    const cs = window.getComputedStyle(parent)
    const n = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0)
    // Una variable de la hoja, o null si no está -en el teléfono no está-.
    const v = (nombre: string): number | null => {
      const x = parseFloat(cs.getPropertyValue(nombre))
      return Number.isFinite(x) ? x : null
    }
    // El recuadro solo existe en Grabar: el riel izquierdo es el de Grabar.
    const rielIzq = n(cs.getPropertyValue('--riel-izq-grabar'))
    const rielDer = n(cs.getPropertyValue('--riel-der'))
    const ancho = v('--recuadro-esq-ancho')
    const alto = v('--recuadro-esq-alto')
    const medida: MedidaEsquinas = ancho !== null && alto !== null
      ? {
          ancho,
          alto,
          margenX: v('--recuadro-esq-margen-x') ?? RECUADRO_H_MARGEN,
          margenY: v('--recuadro-esq-margen-y') ?? RECUADRO_H_MARGEN,
          zonaIzq: v('--recuadro-zona-izq') ?? rielIzq,
          zonaDer: v('--recuadro-zona-der') ?? rielDer,
          zonaArr: v('--recuadro-zona-arr') ?? 0,
          zonaAba: v('--recuadro-zona-aba') ?? 0
        }
      : medidaTelefono(rielIzq, rielDer)
    return {
      izq: n(cs.paddingLeft),
      der: n(cs.paddingRight),
      arr: n(cs.paddingTop),
      aba: n(cs.paddingBottom),
      rielIzq,
      rielDer,
      medida
    }
  }

  const { W, H } = dimensiones || getContainerDimensions()
  // 29-09-2026, tarea 82: en horizontal mide 144 x 81; en vertical, la fórmula de siempre.
  // 30-09-2026, tarea 83: en tableta, la medida de la hoja -leerPadding, medida-.
  const padEsquinas = horizontal ? leerPadding() : null
  const recuadroW = padEsquinas ? padEsquinas.medida.ancho : W * 0.32
  const recuadroH = padEsquinas ? padEsquinas.medida.alto : recuadroW * (4 / 3)

  const zonaH = horizontal && padEsquinas ? zonaLibreH(W, H, padEsquinas) : null
  const posEsquina = horizontal && zonaH ? posicionDeEsquina(horizontal.esquina, zonaH) : null

  const currentX = dragPos ? dragPos.x : posEsquina ? posEsquina.x : recuadroX * W
  const currentY = dragPos ? dragPos.y : posEsquina ? posEsquina.y : recuadroY * H

  // EL HUECO SE AVISA MEDIDO -28-09-2026-. La camara nativa se coloca con lo que mide el hueco en
  // la pantalla, no con la fraccion: ver rectRecuadro en lib/camara.ts. Solo se avisa si cambio.
  const ultimoRectRef = useRef<string>('')
  useEffect(() => {
    const el = containerRef.current
    if (!el || !onRect || !dimensiones) return
    const r = el.getBoundingClientRect()
    // Un hueco de 0 x 0 no es una medida -sin pantalla, como en las pruebas-: queda la fraccion.
    if (r.width <= 0 || r.height <= 0) return
    const rect = { x: r.left, y: r.top, width: r.width, height: r.height }
    const clave = [rect.x, rect.y, rect.width, rect.height].map((n) => Math.round(n)).join(',')
    if (clave === ultimoRectRef.current) return
    ultimoRectRef.current = clave
    onRect(rect)
  })

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
    ultimoPunteroRef.current = null
    if (onArrastrandoChange) {
      onArrastrandoChange(true)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrable || !isDraggingRef.current || !dragStartRef.current) return
    ultimoPunteroRef.current = { x: e.clientX, y: e.clientY }
    const dx = e.clientX - dragStartRef.current.pointerX
    const dy = e.clientY - dragStartRef.current.pointerY
    const rawX = dragStartRef.current.startX + dx
    const rawY = dragStartRef.current.startY + dy

    const { W: winW, H: winH } = getContainerDimensions()

    // 29-09-2026, tarea 82: de lado sigue al dedo DENTRO de la zona libre -se detiene contra el
    // borde del riel- y no toca recuadroX ni recuadroY, que son de la pantalla vertical.
    if (horizontal) {
      const z = zonaLibreH(winW, winH, leerPadding())
      setDragPos({ x: Math.max(z.minX, Math.min(z.maxX, rawX)), y: Math.max(z.minY, Math.min(z.maxY, rawY)) })
      return
    }

    const rW = winW * 0.32
    const rH = rW * (4 / 3)

    const clampedX = Math.max(0, Math.min(winW - rW, rawX))
    const clampedY = Math.max(0, Math.min(winH - rH, rawY))

    setDragPos({ x: clampedX, y: clampedY })

    // Escalón 1 (DIRECTO): Manda la orden de posición nativa en cada movimiento del dedo
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

    // LA CAUSA DEL 0,0 -recuadro-arrastre, 15-10-2026-. Un pointercancel de Chromium trae clientX y
    // clientY en 0: no es dónde está el dedo. Con la capa de TeleprompterView -capa-recuadro-arrastre, sin
    // touch-action: none- el toque empezaba en la capa, la WebView lo tomaba como desplazamiento y
    // cancelaba el puntero; con 0,0 el cálculo daba la posición de partida menos el punto del dedo,
    // negativa, y el tope la dejaba en 0,0 y la guardaba. Al cancelar vale el último punto que llegó con
    // un pointermove -o el de partida, si no se movió-. Antes:
    // const dx = e.clientX - dragStartRef.current.pointerX
    // const dy = e.clientY - dragStartRef.current.pointerY
    const fin = e.type === 'pointercancel'
      ? (ultimoPunteroRef.current ?? { x: dragStartRef.current.pointerX, y: dragStartRef.current.pointerY })
      : { x: e.clientX, y: e.clientY }
    ultimoPunteroRef.current = null
    const dx = fin.x - dragStartRef.current.pointerX
    const dy = fin.y - dragStartRef.current.pointerY
    const rawX = dragStartRef.current.startX + dx
    const rawY = dragStartRef.current.startY + dy

    dragStartRef.current = null

    const { W: winW, H: winH } = getContainerDimensions()

    // 29-09-2026, tarea 82: de lado, al soltar se imanta a la esquina más cercana y se guarda
    // la esquina -App, sigo_recuadro_esquina_h-. dragPos vuelve a null: la posición sale de la
    // esquina, así que al girar o al cambiar la zona libre el recuadro sigue en su esquina.
    if (horizontal) {
      const z = zonaLibreH(winW, winH, leerPadding())
      const x = Math.max(z.minX, Math.min(z.maxX, rawX))
      const y = Math.max(z.minY, Math.min(z.maxY, rawY))
      horizontal.onEsquina(esquinaMasCercana(x, y, z))
      setDragPos(null)
      if (onArrastrandoChange) {
        onArrastrandoChange(false)
      }
      return
    }

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

  // EL ASA DEL RECUADRO -recuadro-arrastre, 15-10-2026-. El hueco va en zIndex 0, debajo del texto
  // -zIndex 1-, porque su sombra pinta el fondo de toda la pantalla. Para que en LISTO el dedo que cae
  // sobre el recuadro lo mueva a él y no al texto, encima va el asa: una caja transparente con la misma
  // posición y medida, en zIndex 5, con los MISMOS manejadores y touch-action: none. El dedo llega
  // directo, sin copias de eventos. Solo existe mientras se puede arrastrar.
  const manejadores = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUpOrCancel,
    onPointerCancel: handlePointerUpOrCancel
  }
  return (
    <>
    {arrastrable && dimensiones && (
      <div
        data-testid="recuadro-camara-asa"
        {...manejadores}
        style={{
          position: 'absolute',
          left: currentX,
          top: currentY,
          width: recuadroW,
          height: recuadroH,
          zIndex: 5,
          touchAction: 'none',
          cursor: 'grab',
          background: 'transparent',
          pointerEvents: 'auto'
        }}
      />
    )}
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
        border: '1px solid var(--color-borde)',
        /*
         * EL HUECO TRANSPARENTE CON FONDO OPACO ALREDEDOR.
         * La vista previa nativa está por detrás del WebView (toBack: true).
         * Con boxShadow gigantesco, se pinta colorFondo opaco en toda la pantalla
         * ALREDEDOR de este recuadro, dejando únicamente transparente esta caja de recuadro
         * para ver la cámara nativa inferior. El texto de la página se renderiza a zIndex 1
         * (por encima), cumpliendo que el texto pasa POR ENCIMA de la imagen.
         */
        boxShadow: `0 0 0 9999px ${colorFondo}`,
        zIndex: 0,
        touchAction: 'none',
        cursor: arrastrable ? 'grab' : 'default',
        boxSizing: 'border-box',
        visibility: dimensiones ? 'visible' : 'hidden',
        backgroundColor: 'transparent',
        pointerEvents: 'auto'
      }}
    />
    </>
  )
}
