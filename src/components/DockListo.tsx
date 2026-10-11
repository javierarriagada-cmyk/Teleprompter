import React, { useState } from 'react'
// Antes -hasta 2026-10-10, cuarta vuelta-:
// import React, { useRef, useState } from 'react'
// import { IconoCerrar, IconoSubtitulos, IconoVoltear } from './IconosApp'
// import {
//   AjustesLectura, FilaAjuste, MenuAdjuntoAjustes, CheckMenu, MuestraLectura, FilasLectura, FilasPantalla,
//   MenuLectura, esMenuLectura, useAnclasLectura
// } from './FilasAjustesLectura'
// import { hayCalidad } from './FichasListo'
// import { ESTILOS_SUBTITULO, EstiloSubtitulo, estiloSubtituloGuardado, guardarEstiloSubtitulo } from '../lib/subtitulos'
// import type { ClaveTexto } from '../textos'
// import { CURVA_RESORTE, MS_CHICO, movimientoApagado } from './movimiento'
// Cuarta vuelta: el panel de Ajustes de la toma, sus filas y sus menús viven en PanelAjustes.tsx -un solo
// panel para toda la app-; el dock lo monta adentro.
import { IconoVoltear } from './IconosApp'
import type { AjustesLectura } from './FilasAjustesLectura'
import { PanelAjustes } from './PanelAjustes'
import { t, useTextos } from '../textos'
import { movimientoApagado } from './movimiento'

// GRABAR EN LISTO: UN SOLO DOCK DE VIDRIO -ajustes de pantallas, 10-10-2026, boceto 5-.
//
// Solo con el teléfono de pie y en Grabar. Todo lo que se toca antes de grabar vive en un solo panel
// abajo, translúcido: fondo oscuro al 62 %, el fondo desenfocado detrás -backdrop-filter- y un borde
// fino. Las medidas y los colores viven en styles-ajustes.css -.dock-listo-.
//
// Cerrado: arriba las fichas -FichasListo con enDock-; abajo Voltear, Grabar y lo que dura el guion.
// Abierto -el engranaje de las fichas-: el mismo dock crece hacia arriba con el panel de Ajustes de la
// toma. No es una hoja modal: no oscurece la pantalla, y tocar afuera o la X lo cierra. La fila de
// abajo sigue a la vista; tocar Grabar cierra el panel y arranca.
//
// Las filas de LECTURA y PANTALLA, sus menús y la línea de muestra son las de PantallaAjustes
// -FilasAjustesLectura.tsx-. VIDEO -Calidad y Subtítulos- existe solo aquí.
//
// -cuarta vuelta, 10-10-2026- El panel es PanelAjustes, el mismo de la portada, el editor y la ficha Más:
// en Grabar con Lectura, Video y Pantalla; en Leer -que ahora también tiene dock- con Lectura y Pantalla.
// En Leer abajo va el play de hoy al centro, nada a la izquierda y lo que dura a la derecha.

// Antes -hasta 2026-10-10, cuarta vuelta-: CLAVE_SUBTITULO y
// type MenuDock = 'letra' | 'tipo' | 'ancho' | 'colores' | 'calidad' | 'subtitulos' | null
// vivían aquí. Se mudaron a PanelAjustes.tsx con la sección Video.

export function IndicadorCargaExpressive() {
  const animar = !movimientoApagado()
  return (
    <span
      data-testid="indicador-carga-expressive"
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        marginRight: 8,
        verticalAlign: 'middle',
        backgroundColor: 'currentColor',
        borderRadius: animar ? '50%' : '3px',
        animation: animar
          ? 'girarCargaM3 2s linear infinite, siluetaCargaM3 3s cubic-bezier(.34, 1.3, .64, 1) infinite'
          : 'none'
      }}
    />
  )
}

export function DockListo({
  fichas,
  botonGrabar,
  onVoltear,
  conVoltear,
  duracion,
  mostrarDuracion,
  preparandoVoz = null,
  ajustesLectura,
  conCamara,
  calidadVideo,
  setCalidadVideo,
  calidadesSoportadas,
  minutosDisponibles,
  estabilizar,
  setEstabilizar,
  soportaEstabilizacion,
  oculto = false
}: {
  // Las fichas de la fila de arriba: FichasListo con enDock, que llama a abrirAjustes con el engranaje.
  fichas: (abrirAjustes: () => void) => React.ReactNode
  // El botón de Grabar de hoy -btn-empezar-toma-, el mismo de siempre.
  botonGrabar: React.ReactNode
  onVoltear?: () => void
  // Voltear aparece con la misma condición que el Voltear del panel de la cámara.
  conVoltear: boolean
  // Lo que dura el guion, con la misma estimación del editor -duracionDeLecturaReloj-.
  duracion: string
  mostrarDuracion: boolean
  // -ajustes de pantallas, segunda vuelta, 10-10-2026- Mientras baja la voz -fracción 0..1-, el lugar de
  // la duración dice «Preparando la voz…» con el porcentaje; al terminar -null- vuelve la duración.
  // Como la pastilla de hoy, sale aunque Mostrar tiempo esté apagado.
  preparandoVoz?: number | null
  ajustesLectura: AjustesLectura
  conCamara: boolean
  calidadVideo: string
  setCalidadVideo?: (q: string) => void
  calidadesSoportadas: string[]
  minutosDisponibles: number | null
  estabilizar?: boolean
  setEstabilizar?: (v: boolean) => void
  soportaEstabilizacion?: boolean
  // Mientras se arrastra el recuadro el dock no se ve, como hoy las fichas y el círculo.
  oculto?: boolean
}) {
  useTextos()
  const [abierto, setAbierto] = useState(false)
  // Antes -hasta 2026-10-10, cuarta vuelta-: const [menu, setMenu] = useState<MenuDock>(null), las anclas
  // -useAnclasLectura, anclaCalidad, anclaSubtitulos-, estiloSub y mostrarCalidad. Viven en PanelAjustes.
  // Donde PanelAjustes pone sus menús: al lado del dock, afuera del vidrio.
  const [hostMenus, setHostMenus] = useState<HTMLDivElement | null>(null)
  const animar = !movimientoApagado()

  function cerrar() {
    // Antes -hasta 2026-10-10, cuarta vuelta-: setMenu(null) -el menú abierto se va con el panel-.
    setAbierto(false)
  }

  // Antes -hasta 2026-10-10, cuarta vuelta-:
  // function alternarMenu(m: Exclude<MenuDock, null>) {
  //   setMenu(menu === m ? null : m)
  // }

  return (
    <>
      {/* Tocar afuera cierra el panel. Transparente: no oscurece la pantalla. */}
      {abierto && !oculto && (
        <button
          type="button"
          className="capa-dock-ajustes"
          data-testid="capa-dock-ajustes"
          aria-label={t('cerrar')}
          onClick={(e) => {
            e.stopPropagation()
            cerrar()
          }}
        />
      )}
      <div
        className={`dock-listo${abierto ? ' abierto' : ''}`}
        data-testid="dock-listo"
        data-abierto={abierto ? 'si' : 'no'}
        // El dock es oscuro siempre -fondo al 62 %-: adentro manda el tema oscuro, también con la
        // pareja blanca.
        data-tema="oscuro"
        style={oculto ? { display: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {abierto ? (
          // Antes -hasta 2026-10-10, cuarta vuelta-: el panel estaba escrito aquí -dock-panel-ajustes con
          // panel-ajustes-toma, el título tituloAjustesToma, btn-cerrar-ajustes-toma, MuestraLectura y en
          // dock-panel-cuerpo LECTURA -FilasLectura-, VIDEO -fila-calidad con hayCalidad, fila-subtitulos- y
          // PANTALLA -FilasPantalla-, con la animación dock-crece-. Es PanelAjustes, sin cambios de marcado.
          <PanelAjustes
            origen={conCamara ? 'grabar' : 'leer'}
            ajustesLectura={ajustesLectura}
            video={{ conCamara, calidadVideo, setCalidadVideo, calidadesSoportadas, minutosDisponibles, estabilizar, setEstabilizar, soportaEstabilizacion }}
            onCerrar={cerrar}
            hostMenus={hostMenus}
            animar={animar}
          />
        ) : (
          fichas(() => setAbierto(true))
        )}

        <div className="dock-fila-abajo">
          <div className="dock-lugar-voltear">
            {conVoltear && (
              <button
                type="button"
                className="dock-voltear"
                data-testid="btn-voltear-listo"
                aria-label={t('voltearCamara')}
                onClick={(e) => {
                  e.stopPropagation()
                  onVoltear?.()
                }}
              >
                <span className="dock-voltear-circulo" aria-hidden="true"><IconoVoltear tamano={20} /></span>
                <span className="dock-rotulo-chico">{t('voltear')}</span>
              </button>
            )}
          </div>
          {/* Grabar: el botón de hoy, con un brillo rojo suave alrededor. Con el panel abierto, tocarlo
              lo cierra y arranca -el toque llega igual al botón-. */}
          {/* -cuarta vuelta- En Leer el lugar es el mismo, sin el brillo rojo: el rojo es de grabar.
              Antes: <div className="dock-lugar-grabar" onClickCapture={cerrar}> */}
          <div className={`dock-lugar-grabar${conCamara ? '' : ' sin-brillo'}`} onClickCapture={cerrar}>
            {botonGrabar}
          </div>
          <div className="dock-lugar-duracion" data-testid="dock-duracion">
            {/* -ajustes de pantallas, segunda vuelta- Antes, solo: {mostrarDuracion && ( ...la duración... )} */}
            {preparandoVoz !== null ? (
              <span
                className="dock-preparando-voz"
                data-testid="dock-preparando-voz"
                aria-label={`${t('preparandoVoz')} ${Math.round(preparandoVoz * 100)} %`}
              >
                {/* Antes:
                <span className="dock-duracion">{Math.round(preparandoVoz * 100)} %</span>
                */}
                <span className="dock-duracion" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <IndicadorCargaExpressive />
                  <span>{Math.round(preparandoVoz * 100)} %</span>
                </span>
                <span className="dock-rotulo-chico">{t('preparandoVoz')}</span>
              </span>
            ) : mostrarDuracion && (
              <>
                <span className="dock-duracion" data-testid="dock-duracion-valor">{duracion}</span>
                <span className="dock-rotulo-chico">{t('duraAprox')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Los menús de las filas, afuera del dock -el desenfoque del dock haría que un fixed se colocara
          contra el dock y no contra la pantalla-. En tema oscuro, como el dock.
          Antes -hasta 2026-10-10, cuarta vuelta-: aquí iban, con {abierto && menu && (...)}, MenuLectura, el
          menú de Calidad -dialogo-calidad con btn-calidad-*, linea-minutos-disponibles- y el de Subtítulos
          -dialogo-subtitulos con btn-subtitulo-*-. Los dibuja PanelAjustes, en este mismo lugar. */}
      <div data-tema="oscuro" className="menus-dock" ref={setHostMenus} />
    </>
  )
}
