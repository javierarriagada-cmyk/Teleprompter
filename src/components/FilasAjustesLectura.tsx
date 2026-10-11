import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  IconoChevron, IconoTamanoLetra, IconoTipografia, IconoAnchoTexto, IconoPaleta, IconoEspejo, IconoReloj
} from './IconosApp'
import { hapticaSeleccion } from '../haptica'
import { Interruptor } from './Interruptor'
import { familiaLectura, colorLetraEfectiva, columnaLectura, INTERLINEADO_LECTURA, PASOS_LETRA } from './estiloLectura'
import { PAREJAS_COLOR } from '../datos/modelo'
import { bordesSeguros, colocarMenu } from '../lib/bordesSeguros'
import { t } from '../textos'
import { CURVA_RESORTE, MS_CHICO, movimientoApagado } from './movimiento'

// LAS FILAS DE LECTURA Y PANTALLA, COMPARTIDAS -ajustes de pantallas, 10-10-2026-.
//
// Eran de PantallaAjustes. Javier: las filas de LECTURA y PANTALLA del panel de Ajustes de la toma
// -el dock de LISTO en Grabar-, con sus menús y la línea de muestra, son las mismas de PantallaAjustes:
// un solo componente, usado en los dos lugares, sin copiar. Lo que se cambia en uno es el mismo ajuste
// que se cambia en el otro: los dos reciben el mismo AjustesLectura, que arma App una sola vez.
//
// FilaAjuste, MenuAdjuntoAjustes, CheckMenu, nombrePareja y nombreAncho se mudaron aquí desde
// PantallaAjustes.tsx sin cambios -con sus comentarios-; PantallaAjustes los importa de aquí.
//
// El menú de cada fila se dibuja aparte de las filas -MenuLectura-: el menú es fixed y se coloca con
// la fila en la pantalla -colocarMenu-. Dentro del dock, que lleva backdrop-filter, un fixed se
// colocaría contra el dock y no contra la pantalla; por eso el dock lo dibuja afuera.

// Los ajustes de lectura y pantalla, con sus manejadores. Los mismos nombres que las props de
// PantallaAjustes.
export interface AjustesLectura {
  fontSize: number
  onElegirLetra?: (n: number) => void
  tipoFuente: 'sans' | 'serif'
  setTipoFuente: (v: 'sans' | 'serif') => void
  columnaAngosta: boolean
  marginPercent: number
  setColumnaAngosta: (v: boolean) => void
  setMarginPercent: (v: number) => void
  colorFondo: string
  colorLetra: string
  setColorFondo: (v: string) => void
  setColorLetra: (v: string) => void
  mirror: boolean
  setMirror: (v: boolean) => void
  mostrarTiempo: boolean
  setMostrarTiempo: (v: boolean) => void
}

// Los menús de las filas de LECTURA.
export type MenuLectura = 'letra' | 'tipo' | 'ancho' | 'colores'

export function esMenuLectura(d: string | null): d is MenuLectura {
  return d === 'letra' || d === 'tipo' || d === 'ancho' || d === 'colores'
}

// 05-10-2026, tarea 95: dos nombres mas, para las dos parejas que vuelven de A9 -verde sobre
// negro y hueso sobre gris muy oscuro, modelo.ts-. Se reconocen por el valor exacto, igual que
// el ambar; lo que no calce con ninguna sigue cayendo en "Negro con blanco", que es la de
// omision. Antes, sin las dos lineas del verde y el gris.
export function nombrePareja(fondo: string, letra: string): string {
  const f = fondo.toUpperCase()
  const l = letra.toUpperCase()
  // -ajustes de pantallas, 10-10-2026- La función vino tal cual de PantallaAjustes; aquí la guardiana
  // T209 revisa el archivo y los valores se leen de PAREJAS_COLOR -modelo.ts, el mismo orden de la
  // lista-, con la misma cuenta. Antes:
  //   if (f === 'NEGRO' && l === 'AMBAR') return t('parejaNegroAmbar')
  //   if (f === 'NEGRO' && l === 'VERDE') return t('parejaNegroVerde')
  //   if (f === 'GRIS' && l === 'HUESO') return t('parejaGrisHueso')
  //   if (f === 'BLANCO') return t('parejaBlancoNegro')
  //   return t('parejaNegroBlanco')
  // con los valores hexadecimales de PAREJAS_COLOR[1], [2], [3] y [4].
  const [, ambar, verde, hueso, blanco] = PAREJAS_COLOR
  const es = (p: { fondo: string; letra: string }) => f === p.fondo.toUpperCase() && l === p.letra.toUpperCase()
  if (es(ambar)) return t('parejaNegroAmbar')
  if (es(verde)) return t('parejaNegroVerde')
  if (es(hueso)) return t('parejaGrisHueso')
  if (f === blanco.fondo.toUpperCase()) return t('parejaBlancoNegro')
  return t('parejaNegroBlanco')
}

export function nombreAncho(columnaAngosta: boolean, marginPercent: number): string {
  if (columnaAngosta) return t('angosto')
  if (marginPercent === 12) return t('medio')
  return t('ancho')
}

export function FilaAjuste({
  testid,
  nombre,
  valor,
  explicacion,
  onClick,
  extra,
  icono
}: {
  // El icono de la izquierda -28-09-2026-: lo traia el dibujo aprobado y la pantalla salio sin el.
  icono?: React.ReactNode
  testid: string
  nombre: string
  valor?: string
  explicacion?: string
  onClick?: () => void
  extra?: React.ReactNode
}) {
  if (extra) {
    return (
      <div className={`fila-ajuste${explicacion ? ' con-explicacion' : ''}`} data-testid={testid}>
        {icono && <span className="fila-ajuste-icono" aria-hidden="true">{icono}</span>}
        <div className="fila-ajuste-textos">
          <div className="fila-ajuste-nombre">{nombre}</div>
          {explicacion && <div className="fila-ajuste-explicacion">{explicacion}</div>}
        </div>
        {extra}
      </div>
    )
  }
  return (
    <button
      type="button"
      className={`fila-ajuste${explicacion ? ' con-explicacion' : ''}`}
      data-testid={testid}
      aria-label={valor ? `${nombre}, ${valor}` : nombre}
      onClick={onClick}
    >
      {icono && <span className="fila-ajuste-icono" aria-hidden="true">{icono}</span>}
      <div className="fila-ajuste-textos">
        <div className="fila-ajuste-nombre">{nombre}</div>
        {explicacion && <div className="fila-ajuste-explicacion">{explicacion}</div>}
      </div>
      {valor && <span className="fila-ajuste-valor">{valor}</span>}
      <IconoChevron tamano={18} className="flecha-fila" />
    </button>
  )
}

// Menu anclado a la fila que lo abrio -boceto tarea 102; endurecido PASO 2-.
// Sin scrim: la capa atrapa el toque afuera con fondo transparente. Se coloca
// debajo (o arriba si no cabe) alineado a la derecha. Cierre: afuera, Escape
// y el gesto de atras de Android (via onRegistrarCerrarDentro en App).
// Antes: role="listbox" / aria-pressed; ahora role="menu" / menuitemradio.
export function MenuAdjuntoAjustes({
  anclaRef,
  onCerrar,
  testid,
  children
}: {
  anclaRef: React.RefObject<HTMLElement | null>
  onCerrar: () => void
  testid: string
  children: React.ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const focoPrevioRef = useRef<HTMLElement | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    function colocar() {
      const ancla = anclaRef.current
      const menu = menuRef.current
      if (!ancla || !menu) return
      const r = ancla.getBoundingClientRect()
      const mh = menu.offsetHeight
      const mw = menu.offsetWidth
      // -07-10-2026, Claude, revision de la 102- La app dibuja de borde a borde: innerHeight
      // incluye lo que queda bajo la barra de botones de Android. Medido en el moto g86: el menu de
      // Idioma -la ultima fila- se abria hacia abajo y "English" quedaba tapado por la barra. La
      // cuenta pasa a colocarMenu -lib/bordesSeguros.ts-, que descuenta los bordes seguros y la
      // comparte el menu del guion.
      // Antes: espacioAbajo = window.innerHeight - r.bottom - 4; arriba si no cabia; top acotado
      // entre 8 y innerHeight - mh - 8; left = r.right - mw acotado a la pantalla.
      const c = colocarMenu(
        { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
        { alto: mh, ancho: mw },
        { alto: window.innerHeight, ancho: window.innerWidth },
        bordesSeguros(),
        'derecha'
      )
      setCoords({ top: c.top, left: c.left })
    }
    colocar()
    const id = requestAnimationFrame(colocar)
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
    }
  }, [anclaRef, children])

  // Al abrir: foco al primer menuitemradio. Al cerrar: devolver el foco a la fila.
  useEffect(() => {
    const activo = document.activeElement
    focoPrevioRef.current =
      (activo instanceof HTMLElement ? activo : null)
      ?? (anclaRef.current?.querySelector('button') as HTMLElement | null)
      ?? (anclaRef.current as HTMLElement | null)
    const menu = menuRef.current
    const primera = menu?.querySelector('[role="menuitemradio"]') as HTMLElement | null
    if (primera) {
      primera.focus()
    } else if (menu) {
      menu.focus()
    }
    return () => {
      const devolver = focoPrevioRef.current
      if (devolver && typeof devolver.focus === 'function') {
        try { devolver.focus() } catch { /* el ancla pudo desmontarse */ }
      }
    }
  }, [anclaRef])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const animar = !movimientoApagado()
  const estiloMenu: React.CSSProperties = coords
    ? {
        top: coords.top,
        left: coords.left,
        ...(animar
          ? { animation: `menu-adjunto-abre ${MS_CHICO}ms ${CURVA_RESORTE} forwards` }
          : {})
      }
    : { top: -9999, left: 0 }

  return (
    <>
      <div
        className="capa-menu-adjunto"
        data-testid="capa-dialogo-ajustes"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        className="menu-adjunto-ajustes"
        data-testid={testid}
        role="menu"
        tabIndex={-1}
        style={estiloMenu}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  )
}

export function CheckMenu({ visible }: { visible: boolean }) {
  if (!visible) return <span className="check-menu-adjunto" aria-hidden="true" />
  return <span className="check-menu-adjunto" aria-hidden="true">✓</span>
}

// Las anclas de los cuatro menús de LECTURA: las filas las cuelgan y MenuLectura se coloca con ellas.
export interface AnclasLectura {
  letra: React.RefObject<HTMLDivElement>
  tipo: React.RefObject<HTMLDivElement>
  ancho: React.RefObject<HTMLDivElement>
  colores: React.RefObject<HTMLDivElement>
}

export function useAnclasLectura(): AnclasLectura {
  const letra = useRef<HTMLDivElement>(null)
  const tipo = useRef<HTMLDivElement>(null)
  const ancho = useRef<HTMLDivElement>(null)
  const colores = useRef<HTMLDivElement>(null)
  return { letra, tipo, ancho, colores }
}

// LA LÍNEA DE MUESTRA, pintada con los ajustes de hoy: cambia apenas se toca uno.
export function MuestraLectura({ ajustes }: { ajustes: AjustesLectura }) {
  const letra = colorLetraEfectiva(ajustes.colorFondo, ajustes.colorLetra)
  const col = columnaLectura(ajustes.columnaAngosta)
  return (
    <div
      className="muestra-lectura-ajustes"
      data-testid="muestra-lectura-ajustes"
      style={{
        backgroundColor: ajustes.colorFondo,
        color: letra,
        fontFamily: familiaLectura(ajustes.tipoFuente),
        fontSize: ajustes.fontSize,
        lineHeight: INTERLINEADO_LECTURA,
        maxWidth: col.maxWidth,
        textAlign: col.textAlign
      }}
    >
      {t('lineaMuestraLectura')}
    </div>
  )
}

// -venía de PantallaAjustes.tsx, borrada el 12-10-2026-
// El tamano tambien vive aca -28-09-2026-: el Aa del editor abre esta misma pantalla, y
// Javier pidio un solo estilo de ajustes en toda la app. Los pasos son PASOS_LETRA.

// LECTURA: Tamaño de letra, Tipografía, Ancho del texto, Colores de lectura. Cada fila con su valor y
// la flecha; tocarla abre -o cierra- su menú pegado a la fila.
export function FilasLectura({
  ajustes,
  anclas,
  dialogo,
  setDialogo
}: {
  ajustes: AjustesLectura
  anclas: AnclasLectura
  dialogo: string | null
  setDialogo: (d: MenuLectura | null) => void
}) {
  const alternar = (d: MenuLectura) => setDialogo(dialogo === d ? null : d)
  return (
    <>
      <div className="envoltorio-fila-con-menu" ref={anclas.letra}>
        <FilaAjuste
          testid="fila-tamano-letra"
          icono={<IconoTamanoLetra tamano={22} />}
          nombre={t('tamanoLetra')}
          valor={String(ajustes.fontSize)}
          onClick={() => alternar('letra')}
        />
      </div>
      <div className="envoltorio-fila-con-menu" ref={anclas.tipo}>
        <FilaAjuste
          testid="fila-tipo-letra"
          icono={<IconoTipografia tamano={22} />}
          nombre={t('tipografia')}
          valor={ajustes.tipoFuente === 'serif' ? t('tipoSerif') : t('tipoSans')}
          onClick={() => alternar('tipo')}
        />
      </div>
      <div className="envoltorio-fila-con-menu" ref={anclas.ancho}>
        <FilaAjuste
          testid="fila-ancho-texto"
          icono={<IconoAnchoTexto tamano={22} />}
          nombre={t('anchoTexto')}
          valor={nombreAncho(ajustes.columnaAngosta, ajustes.marginPercent)}
          onClick={() => alternar('ancho')}
        />
      </div>
      <div className="envoltorio-fila-con-menu" ref={anclas.colores}>
        <FilaAjuste
          testid="fila-colores"
          icono={<IconoPaleta tamano={22} />}
          nombre={t('coloresLectura')}
          valor={nombrePareja(ajustes.colorFondo, ajustes.colorLetra)}
          onClick={() => alternar('colores')}
        />
      </div>
    </>
  )
}

// PANTALLA: Espejo y Mostrar tiempo, con el interruptor en la misma fila.
export function FilasPantalla({ ajustes }: { ajustes: AjustesLectura }) {
  return (
    <>
      <FilaAjuste
        testid="fila-espejo"
        icono={<IconoEspejo tamano={22} />}
        nombre={t('espejo')}
        explicacion={t('espejoExplicacion')}
        extra={(
          <Interruptor
            encendido={ajustes.mirror}
            onCambiar={ajustes.setMirror}
            etiqueta={t('espejo')}
            testid="switch-espejo"
          />
        )}
      />
      <FilaAjuste
        testid="fila-mostrar-tiempo"
        icono={<IconoReloj tamano={22} />}
        nombre={t('mostrarTiempo')}
        extra={(
          <Interruptor
            encendido={ajustes.mostrarTiempo}
            onCambiar={ajustes.setMostrarTiempo}
            etiqueta={t('mostrarTiempo')}
            testid="switch-mostrar-tiempo"
          />
        )}
      />
    </>
  )
}

// EL MENÚ DE UNA FILA DE LECTURA, pegado a su fila. Elegir aplica y cierra, sin «Aceptar».
export function MenuLectura({
  ajustes,
  anclas,
  dialogo,
  onCerrar
}: {
  ajustes: AjustesLectura
  anclas: AnclasLectura
  dialogo: MenuLectura
  onCerrar: () => void
}) {
  const { fontSize, onElegirLetra, tipoFuente, setTipoFuente, columnaAngosta, marginPercent,
    setColumnaAngosta, setMarginPercent, colorFondo, colorLetra, setColorFondo, setColorLetra } = ajustes
  function elegirYCerrar(fn: () => void) {
    fn()
    onCerrar()
  }
  return (
    <MenuAdjuntoAjustes
      anclaRef={anclas[dialogo]}
      onCerrar={onCerrar}
      testid={`dialogo-${dialogo}`}
    >
      {/* Cada tamano se muestra a su tamano: se elige mirando, no leyendo un numero. */}
      {dialogo === 'letra' && (
        <div className="lista-menu-adjunto">
          {PASOS_LETRA.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`opcion-letra-${n}`}
              className={`fila-menu-adjunto${fontSize === n ? ' elegida' : ''}`}
              role="menuitemradio"
              aria-checked={fontSize === n}
              aria-label={`${t('tamanoLetra')} ${n}`}
              onClick={() => elegirYCerrar(() => onElegirLetra?.(n))}
            >
              <span style={{ fontFamily: familiaLectura(tipoFuente), fontSize: Math.min(n, 32) }}>Aa</span>
              <span className="fila-menu-adjunto-etiqueta">{n}</span>
              <CheckMenu visible={fontSize === n} />
            </button>
          ))}
        </div>
      )}

      {dialogo === 'tipo' && (
        <div className="lista-menu-adjunto">
          {([
            { v: 'sans' as const, n: t('tipoSans') },
            { v: 'serif' as const, n: t('tipoSerif') }
          ]).map((o) => (
            <button
              key={o.v}
              type="button"
              className={`fila-menu-adjunto${tipoFuente === o.v ? ' elegida' : ''}`}
              role="menuitemradio"
              aria-checked={tipoFuente === o.v}
              onClick={() => elegirYCerrar(() => setTipoFuente(o.v))}
            >
              <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
              <CheckMenu visible={tipoFuente === o.v} />
            </button>
          ))}
        </div>
      )}

      {dialogo === 'ancho' && (
        <div className="lista-menu-adjunto">
          {([
            { n: t('ancho'), angosta: false, margen: 5, activo: !columnaAngosta && marginPercent !== 12 },
            { n: t('medio'), angosta: false, margen: 12, activo: !columnaAngosta && marginPercent === 12 },
            { n: t('angosto'), angosta: true, margen: 5, activo: !!columnaAngosta }
          ]).map((o) => (
            <button
              key={o.n}
              type="button"
              className={`fila-menu-adjunto${o.activo ? ' elegida' : ''}`}
              role="menuitemradio"
              aria-label={o.n}
              aria-checked={o.activo}
              onClick={() => elegirYCerrar(() => {
                // La vibracion corta de elegir, como en el cajon que reemplaza -T203-.
                hapticaSeleccion()
                setColumnaAngosta(o.angosta)
                setMarginPercent(o.margen)
              })}
            >
              <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
              <CheckMenu visible={o.activo} />
            </button>
          ))}
        </div>
      )}

      {dialogo === 'colores' && (
        <div className="lista-menu-adjunto">
          {PAREJAS_COLOR.map((p) => {
            const activa = colorFondo.toUpperCase() === p.fondo.toUpperCase() && colorLetra.toUpperCase() === p.letra.toUpperCase()
            return (
              <button
                key={`${p.fondo}-${p.letra}`}
                type="button"
                className={`fila-menu-adjunto${activa ? ' elegida' : ''}`}
                role="menuitemradio"
                aria-label={nombrePareja(p.fondo, p.letra)}
                aria-checked={activa}
                onClick={() => elegirYCerrar(() => {
                  hapticaSeleccion()
                  setColorFondo(p.fondo)
                  setColorLetra(p.letra)
                })}
              >
                <span
                  className="muestra-pareja"
                  style={{ backgroundColor: p.fondo, color: colorLetraEfectiva(p.fondo, p.letra) }}
                >
                  Aa
                </span>
                <span className="fila-menu-adjunto-etiqueta">{nombrePareja(p.fondo, p.letra)}</span>
                <CheckMenu visible={activa} />
              </button>
            )
          })}
        </div>
      )}
    </MenuAdjuntoAjustes>
  )
}
