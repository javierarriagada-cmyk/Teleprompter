// LOS CONTROLES DE VELOCIDAD FIJA -tarea 106, 14-10-2026, boceto aprobado: docs/pantallas/
// velocidad-fija/-. Armados con las piezas de siempre: FilaAjuste, MenuAdjuntoAjustes y CheckMenu de los
// ajustes, la ficha-listo de LISTO y dock-rotulo-chico del dock. La logica vive en lib/velocidadFija.ts.
import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconoMicrofono, IconoVelocimetro, IconoMas } from './IconosApp'
import { FilaAjuste, MenuAdjuntoAjustes, CheckMenu } from './FilasAjustesLectura'
import { t, useTextos } from '../textos'
import { ModoLectura, NIVELES, fijarModo, fijarNivel, subirNivel, bajarNivel } from '../lib/velocidadFija'
import { useVelocidadFija } from '../hooks/useVelocidadFija'
import { hapticaSeleccion } from '../haptica'

// La barra de siete tramos, llena hasta el nivel. Parada: el tramo 1 abajo.
export function BarraNivel({ nivel, vertical = false, chica = false }: { nivel: number; vertical?: boolean; chica?: boolean }) {
  const tramos = Array.from({ length: NIVELES }, (_, i) => i + 1)
  return (
    <span className={`barra-nivel${vertical ? ' vertical' : ''}${chica ? ' chica' : ''}`} aria-hidden="true">
      {(vertical ? [...tramos].reverse() : tramos).map((n) => (
        <span key={n} className={`tramo-nivel${n <= nivel ? ' lleno' : ''}`} />
      ))}
    </span>
  )
}

// EL UNICO CONTROL DE VELOCIDAD: una pastilla con «−» a la izquierda, «+» a la derecha y la barra entre
// ellos. Parado -de lado, y de pie al leer-: «+» arriba, la barra y «−» abajo. Cada toque, un nivel;
// «−» apagado en 1 y «+» en 7.
export function ControlVelocidad({ vertical = false }: { vertical?: boolean }) {
  useTextos()
  const { nivel } = useVelocidadFija()
  const tocar = (n: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticaSeleccion()
    fijarNivel(n)
  }
  const menos = (
    <button type="button" className="boton-nivel" data-testid="btn-velocidad-menos" disabled={nivel <= 1}
      aria-label={t('masLento')} onClick={tocar(bajarNivel(nivel))}>
      <span className="raya-menos" aria-hidden="true" />
    </button>
  )
  const mas = (
    <button type="button" className="boton-nivel" data-testid="btn-velocidad-mas" disabled={nivel >= NIVELES}
      aria-label={t('masRapido')} onClick={tocar(subirNivel(nivel))}>
      <IconoMas tamano={18} />
    </button>
  )
  return (
    <div
      className={`control-velocidad${vertical ? ' vertical' : ''}`}
      role="group"
      aria-label={t('velocidadNivel', { n: nivel })}
      data-testid="control-velocidad"
      data-nivel={nivel}
      onClick={(e) => e.stopPropagation()}
    >
      {vertical ? mas : menos}
      <BarraNivel nivel={nivel} vertical={vertical} />
      {vertical ? menos : mas}
    </div>
  )
}

const MODOS: Array<{ v: ModoLectura; icono: (t: number) => React.ReactNode; clave: 'modoConLaVoz' | 'modoVelocidadFija' }> = [
  { v: 'voz', icono: (n) => <IconoMicrofono tamano={n} />, clave: 'modoConLaVoz' },
  { v: 'fija', icono: (n) => <IconoVelocimetro tamano={n} />, clave: 'modoVelocidadFija' }
]

// EN AJUSTES, entre la cabecera y la muestra: el selector de Material 3 en dos mitades, la linea que
// explica y, con Velocidad fija, la fila Velocidad con el control adentro -sin menu de opciones-.
export function SelectorModoLectura() {
  useTextos()
  const { modo } = useVelocidadFija()
  return (
    <div className="selector-modo-bloque" data-testid="selector-modo-lectura">
      <div className="selector-modo" role="radiogroup" aria-label={t('modoLectura')}>
        {MODOS.map((m) => (
          <button key={m.v} type="button" role="radio" aria-checked={modo === m.v} data-testid={`btn-modo-${m.v}`}
            className={`selector-modo-mitad${modo === m.v ? ' elegida' : ''}`}
            onClick={() => { hapticaSeleccion(); fijarModo(m.v) }}>
            {m.icono(18)}<span>{t(m.clave)}</span>
          </button>
        ))}
      </div>
      <div className="selector-modo-explicacion">{t(modo === 'voz' ? 'explicacionModoVoz' : 'explicacionModoFija')}</div>
      {modo === 'fija' && (
        <div className="tarjeta-seccion-ajustes tarjeta-velocidad">
          <FilaAjuste testid="fila-velocidad" icono={<IconoVelocimetro tamano={22} />} nombre={t('velocidad')}
            extra={<ControlVelocidad />} />
        </div>
      )}
    </div>
  )
}

// LA FICHA DEL MODO. En LISTO de Leer va abajo a la izquierda -abajo-, con «sigue tu voz» o la barra
// chica debajo; en Grabar, en su propia linea arriba de las fichas -enLinea, el rotulo al lado-; de lado,
// primera en el riel -compacta: el icono y la barra, o «Voz»-. Tocarla abre su menu adjunto: el modo y,
// con Velocidad fija, el control.
export function FichaModoLectura({ variante }: { variante: 'abajo' | 'enLinea' | 'compacta' }) {
  useTextos()
  const { modo, nivel } = useVelocidadFija()
  const ancla = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  const compacta = variante === 'compacta'
  const rotulo = variante === 'compacta' ? null : modo === 'fija'
    ? <span className="dock-rotulo-chico rotulo-barra-nivel"><BarraNivel nivel={nivel} chica /></span>
    : <span className="dock-rotulo-chico">{t('sigueTuVoz')}</span>
  // Los menus van afuera del vidrio del dock, como los de PanelAjustes.
  const host = typeof document !== 'undefined' ? (document.querySelector('.menus-dock') as HTMLElement | null) ?? document.body : null
  const menu = abierto && (
    <MenuAdjuntoAjustes anclaRef={ancla} onCerrar={() => setAbierto(false)} testid="dialogo-modo-lectura">
      <div className="lista-menu-adjunto">
        {MODOS.map((m) => (
          <button key={m.v} type="button" data-testid={`btn-menu-modo-${m.v}`}
            className={`fila-menu-adjunto${modo === m.v ? ' elegida' : ''}`}
            role="menuitemradio" aria-checked={modo === m.v}
            onClick={() => { hapticaSeleccion(); fijarModo(m.v) }}>
            <span className="icono-menu-modo" aria-hidden="true">{m.icono(20)}</span>
            <span className="fila-menu-adjunto-etiqueta">{t(m.clave)}</span>
            <CheckMenu visible={modo === m.v} />
          </button>
        ))}
      </div>
      {modo === 'fija' && (
        <div className="menu-modo-velocidad">
          <span className="dock-rotulo-chico">{t('rotuloVelocidad')}</span>
          <ControlVelocidad />
        </div>
      )}
    </MenuAdjuntoAjustes>
  )
  return (
    <div ref={ancla} className={`ficha-modo-lectura ${variante}`}>
      <button type="button" className={`ficha-listo${abierto ? ' abierta' : ''}`} data-testid="ficha-modo-lectura"
        aria-label={modo === 'voz' ? t('modoConLaVoz') : t('velocidadFijaNivel', { n: nivel })}
        aria-expanded={abierto}
        onClick={(e) => { e.stopPropagation(); setAbierto(!abierto) }}>
        {modo === 'voz' ? <IconoMicrofono tamano={16} /> : <IconoVelocimetro tamano={16} />}
        {compacta
          ? (modo === 'voz' ? <span>{t('modoVozCorto')}</span> : <BarraNivel nivel={nivel} chica />)
          : <span>{t(modo === 'voz' ? 'modoConLaVoz' : 'modoVelocidadFija')}</span>}
      </button>
      {rotulo}
      {menu && host && createPortal(menu, host)}
    </div>
  )
}

// AL LEER CON VELOCIDAD FIJA: el control parado, con «velocidad» debajo. De pie va contra el borde
// derecho a la altura de Pausa y Parar -no cabe acostado en el lugar vacio de la fila: faltan 54 px-;
// de lado, en el riel izquierdo, vacio al leer.
export function ControlVelocidadLectura({ deLado }: { deLado: boolean }) {
  useTextos()
  return (
    <div className={`control-velocidad-lectura${deLado ? ' de-lado' : ' de-pie'}`} data-testid="control-velocidad-lectura"
      onClick={(e) => e.stopPropagation()}>
      <ControlVelocidad vertical />
      <span className="dock-rotulo-chico">{t('rotuloVelocidad')}</span>
    </div>
  )
}
