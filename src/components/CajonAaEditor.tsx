import React, { useRef, useState } from 'react'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, PAREJAS_COLOR } from '../datos/modelo'
import { hapticaSeleccion } from '../haptica'
import { SelectorLetra, SelectorAncho } from './ControlesAa'
import { movimientoApagado, MS_CHICO, MS_PANEL, CURVA_RESORTE } from './movimiento'
import { familiaLectura } from './estiloLectura'
import { t } from '../textos'

interface CajonAaEditorProps {
  abierto: boolean
  onCerrar: () => void
  guion: Guion
  fontSize?: number
  onLetraMenos?: () => void
  onLetraMas?: () => void
  marginPercent?: number
  setMarginPercent?: (m: number) => void
  columnaAngosta?: boolean
  setColumnaAngosta?: (v: boolean) => void
  colorFondo?: string
  setColorFondo?: (c: string) => void
  colorLetra?: string
  setColorLetra?: (c: string) => void
  tipoFuente?: 'sans' | 'serif'
  setTipoFuente?: (f: 'sans' | 'serif') => void
}

export function CajonAaEditor({
  abierto,
  onCerrar,
  guion,
  fontSize = 24,
  onLetraMenos,
  onLetraMas,
  marginPercent = 5,
  setMarginPercent,
  columnaAngosta = false,
  setColumnaAngosta,
  colorFondo = PAREJAS_COLOR[0].fondo,
  setColorFondo,
  colorLetra = PAREJAS_COLOR[0].letra,
  setColorLetra,
  tipoFuente = 'sans',
  setTipoFuente
}: CajonAaEditorProps) {
  const refAjustes = useCerrarAfuera(abierto, onCerrar)

  const [dragOffsetY, setDragOffsetY] = useState(0)
  const esArrastrandoModalRef = useRef(false)
  const dragStartYRef = useRef<number | null>(null)

  function obtenerClientY(e: React.PointerEvent<HTMLDivElement>): number {
    if (typeof e.clientY === 'number' && !isNaN(e.clientY)) return e.clientY
    if (e.nativeEvent && typeof (e.nativeEvent as any).clientY === 'number') return (e.nativeEvent as any).clientY
    return 0
  }

  function empezarArrastre(e: React.PointerEvent<HTMLDivElement>, elemento: HTMLElement | null) {
    dragStartYRef.current = obtenerClientY(e)
    esArrastrandoModalRef.current = true
    if (elemento && elemento.setPointerCapture) {
      try { elemento.setPointerCapture(e.pointerId) } catch (err) {}
    }
  }

  function handleAgarraderaPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    empezarArrastre(e, e.currentTarget)
  }

  function handleModalPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target && target.closest('button, input, select, label, textarea, a, option, [role="button"]')) {
      return
    }
    if (e.currentTarget.scrollTop > 0) {
      return
    }
    empezarArrastre(e, e.currentTarget)
  }

  function handleModalPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!esArrastrandoModalRef.current || dragStartYRef.current === null) return
    const currentY = obtenerClientY(e)
    const dy = Math.max(0, currentY - dragStartYRef.current)
    setDragOffsetY(dy)
  }

  function handleModalPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!esArrastrandoModalRef.current || dragStartYRef.current === null) return
    const currentY = obtenerClientY(e)
    const dy = Math.max(0, currentY - dragStartYRef.current)
    if (e.currentTarget.releasePointerCapture) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) {}
    }
    esArrastrandoModalRef.current = false
    dragStartYRef.current = null

    if (dy > 96) {
      onCerrar()
      setDragOffsetY(0)
    } else {
      setDragOffsetY(0)
    }
  }

  if (!abierto) return null

  return (
    /* EL CAJON Aa, SIN MUESTRA Y SIN VELO. 24-09-2026.
        Con el editor nuevo -EditorGuion, Tiptap- el guion mismo toma la letra,
        el tamano, el ancho y los colores de lectura en el momento en que se
        tocan. La muestra que vivia aca dentro -MuestraLectura, Tarea 72- sobraba,
        y el velo oscuro que tapaba el resto de la pantalla escondia justo lo que
        habia que mirar. El dueno, al probarlo: "se cambia todo
        instantaneamente, de ahi tendria que salir la previsualizacion".
        Es el patron de Apple Books y Kindle, de donde viene el "Aa": el libro
        cambia detras, a plena luz, y el cajon es bajo. La capa transparente
        sigue ahi para que tocar el guion cierre el cajon. */
    <div
      className="capa-cajon-aa"
      data-testid="capa-ajustes"
      onClick={onCerrar}
    >
      <div
        ref={refAjustes}
        data-testid="panel-ajustes"
        className="panel-superficie cajon-aa"
        onPointerDown={handleModalPointerDown}
        onPointerMove={handleModalPointerMove}
        onPointerUp={handleModalPointerUp}
        onPointerCancel={handleModalPointerUp}
        style={{
          paddingBottom: 'calc(var(--aire-4) + env(safe-area-inset-bottom, 0px))',
          transform: `translateY(${dragOffsetY}px)`,
          transition: esArrastrandoModalRef.current
            ? 'none'
            : movimientoApagado()
            ? 'none'
            : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`,
          animation: movimientoApagado() || esArrastrandoModalRef.current || dragOffsetY > 0
            ? 'none'
            : `panelSube ${MS_PANEL}ms ${CURVA_RESORTE} forwards`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-testid="agarradera-hoja-ajustes"
          className="cajon-aa-agarradera"
          onPointerDown={handleAgarraderaPointerDown}
          onPointerMove={handleModalPointerMove}
          onPointerUp={handleModalPointerUp}
          onPointerCancel={handleModalPointerUp}
        >
          <div className="cajon-aa-agarradera-raya" />
        </div>

        {/* Sin titulo y sin "Listo". El dueno, 24-09-2026: "la palabra
            texto y la palabra listo pierden todo sentido". El cajon se
            entiende solo -esta debajo del Aa que lo abrio- y se cierra
            tocando el guion o bajandolo por la agarradera. */}

        {/* TRES FILAS Y NINGUNA PALABRA. 24-09-2026.
            Los controles ya mostraban lo que hacen -la A chica y la A
            grande, el Aa en cada letra, las columnas dibujadas, las
            parejas pintadas- y el dueno vio que los nombres de al lado
            sobraban: "la verdad es que es innecesario". Sin nombres, los
            controles ocupan todo el ancho, como el cajon de temas de
            Apple Books: todo cae en la misma grilla y los blancos de
            toque crecen.
              1. Tamano: una pieza partida al medio. El numero se fue de
                 la vista -el cambio se ve en el guion- y queda para el
                 lector de pantalla.
              2. Letra y ancho, mitad y mitad: los dos cambian la forma
                 del texto.
              3. Colores: tres tarjetas anchas. Es lo que mas cambia el
                 guion y por eso tiene la fila entera.
            Los nombres siguen en aria-label y en title: el lector de
            pantalla y las pruebas los usan. Los selectores son el mismo
            objeto -.selector-aa-, no botoneras decoradas por separado.
            OJO con "Ancho": es el nombre del grupo -aria-label "Ancho del
            texto"- y de la primera opcion. Hasta el 23-09-2026 la fila
            decia "Ancho del texto" porque getByText encontraba dos
            "Ancho"; ahora las pruebas buscan el boton por rol. */}
        <div className="cajon-aa-filas">
          <SelectorLetra fontSize={fontSize} onMenos={onLetraMenos} onMas={onLetraMas} />

          {(setTipoFuente || setColumnaAngosta || setMarginPercent) && (
            <div className="fila-aa-par">
              {setTipoFuente && (
                <div className="selector-aa selector-aa-lleno" role="group" aria-label={t('tipografia')}>
                  {([
                    { valor: 'sans' as const, nombre: 'Sans' },
                    { valor: 'serif' as const, nombre: 'Serif' }
                  ]).map((o) => (
                    <button
                      key={o.valor}
                      type="button"
                      aria-label={o.nombre}
                      aria-pressed={tipoFuente === o.valor}
                      className={`btn-deformable selector-aa-opcion aa-${o.valor}${tipoFuente === o.valor ? ' activa' : ''}`}
                      onClick={() => {
                        hapticaSeleccion()
                        setTipoFuente(o.valor)
                      }}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              )}

              {(setColumnaAngosta || setMarginPercent) && (
                <SelectorAncho
                  columnaAngosta={columnaAngosta}
                  marginPercent={marginPercent}
                  setColumnaAngosta={setColumnaAngosta}
                  setMarginPercent={setMarginPercent}
                />
              )}
            </div>
          )}

          {/* Colores de lectura: parejas, no dos listas. Fuente: PAREJAS_COLOR. */}
          {setColorFondo && setColorLetra && (
            <div className="parejas-aa" role="group" aria-label={t('coloresLectura')}>
              {[
                { fondo: PAREJAS_COLOR[0].fondo, letra: PAREJAS_COLOR[0].letra, label: t('parejaNegroBlanco') },
                { fondo: PAREJAS_COLOR[1].fondo, letra: PAREJAS_COLOR[1].letra, label: t('parejaNegroAmbar') },
                { fondo: PAREJAS_COLOR[2].fondo, letra: PAREJAS_COLOR[2].letra, label: t('parejaBlancoNegro') }
              ].map((p, idx) => {
                const activo = colorFondo.toUpperCase() === p.fondo.toUpperCase() && colorLetra.toUpperCase() === p.letra.toUpperCase()
                return (
                  <button
                    key={idx}
                    type="button"
                    title={p.label}
                    aria-label={p.label}
                    aria-pressed={activo}
                    className={`btn-deformable pareja-aa${activo ? ' activa' : ''}`}
                    onClick={() => {
                      hapticaSeleccion()
                      setColorFondo(p.fondo)
                      setColorLetra(p.letra)
                    }}
                  >
                    {/* Fondo y letra de la pareja: son dato, no tema
                        -modelo.ts, PAREJAS_COLOR-. El Aa va en la letra
                        elegida, asi la tarjeta es el guion en chico. */}
                    <span
                      className="pareja-aa-muestra"
                      style={{ backgroundColor: p.fondo, color: p.letra, fontFamily: familiaLectura(tipoFuente) }}
                    >
                      Aa
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
