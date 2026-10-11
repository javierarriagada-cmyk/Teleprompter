import React, { useRef, useState } from 'react'
import { IconoCerrar, IconoSubtitulos, IconoVoltear } from './IconosApp'
import {
  AjustesLectura, FilaAjuste, MenuAdjuntoAjustes, CheckMenu, MuestraLectura, FilasLectura, FilasPantalla,
  MenuLectura, esMenuLectura, useAnclasLectura
} from './FilasAjustesLectura'
import { hayCalidad } from './FichasListo'
import { ESTILOS_SUBTITULO, EstiloSubtitulo, estiloSubtituloGuardado, guardarEstiloSubtitulo } from '../lib/subtitulos'
import type { ClaveTexto } from '../textos'
import { t, useTextos } from '../textos'
import { CURVA_RESORTE, MS_CHICO, movimientoApagado } from './movimiento'

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

// Los nombres de los estilos, en el idioma de la app -los mismos de FichasListo y SubtitulosVisor-.
const CLAVE_SUBTITULO: Record<EstiloSubtitulo, ClaveTexto> = {
  no: 'subtitulosNo', amarillo: 'subtitulosAmarillo', rojo: 'subtitulosRojo', formal: 'subtitulosFormal'
}

type MenuDock = 'letra' | 'tipo' | 'ancho' | 'colores' | 'calidad' | 'subtitulos' | null

export function DockListo({
  fichas,
  botonGrabar,
  onVoltear,
  conVoltear,
  duracion,
  mostrarDuracion,
  ajustesLectura,
  conCamara,
  calidadVideo,
  setCalidadVideo,
  calidadesSoportadas,
  minutosDisponibles,
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
  ajustesLectura: AjustesLectura
  conCamara: boolean
  calidadVideo: string
  setCalidadVideo?: (q: string) => void
  calidadesSoportadas: string[]
  minutosDisponibles: number | null
  // Mientras se arrastra el recuadro el dock no se ve, como hoy las fichas y el círculo.
  oculto?: boolean
}) {
  useTextos()
  const [abierto, setAbierto] = useState(false)
  const [menu, setMenu] = useState<MenuDock>(null)
  const anclasLectura = useAnclasLectura()
  const anclaCalidad = useRef<HTMLDivElement>(null)
  const anclaSubtitulos = useRef<HTMLDivElement>(null)
  // Los subtítulos: la MISMA clave que la ficha de hoy y el reproductor -sigo_subtitulos_estilo-.
  const [estiloSub, setEstiloSub] = useState<EstiloSubtitulo>(estiloSubtituloGuardado)
  const mostrarCalidad = hayCalidad(conCamara, calidadesSoportadas)
  const animar = !movimientoApagado()

  function cerrar() {
    setMenu(null)
    setAbierto(false)
  }

  function alternarMenu(m: Exclude<MenuDock, null>) {
    setMenu(menu === m ? null : m)
  }

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
          <div
            className="dock-panel-ajustes"
            data-testid="panel-ajustes-toma"
            role="region"
            aria-labelledby="titulo-ajustes-toma"
            // Crece hacia arriba con una animación corta; sin movimiento si el sistema lo pide.
            style={animar ? { animation: `dock-crece ${MS_CHICO}ms ${CURVA_RESORTE} both` } : undefined}
          >
            <div className="dock-panel-cabeza">
              <h2 className="dock-panel-titulo" id="titulo-ajustes-toma">{t('tituloAjustesToma')}</h2>
              <button
                type="button"
                className="dock-panel-cerrar"
                data-testid="btn-cerrar-ajustes-toma"
                aria-label={t('cerrar')}
                onClick={cerrar}
              >
                <IconoCerrar tamano={18} />
              </button>
            </div>
            <MuestraLectura ajustes={ajustesLectura} />
            <div className="dock-panel-cuerpo">
              <h3 className="dock-seccion">{t('seccionLectura')}</h3>
              <FilasLectura
                ajustes={ajustesLectura}
                anclas={anclasLectura}
                dialogo={menu}
                setDialogo={setMenu}
              />
              <h3 className="dock-seccion">{t('seccionVideo')}</h3>
              {/* Calidad, con la misma condición de hoy -hayCalidad-. Sin ícono: Calidad no tiene uno en
                  Sigo, y no se dibuja ninguno nuevo; el hueco del ícono queda para que alinee. */}
              {mostrarCalidad && (
                <div className="envoltorio-fila-con-menu" ref={anclaCalidad}>
                  <FilaAjuste
                    testid="fila-calidad"
                    icono={<span />}
                    nombre={t('calidad')}
                    valor={calidadVideo}
                    onClick={() => alternarMenu('calidad')}
                  />
                </div>
              )}
              <div className="envoltorio-fila-con-menu" ref={anclaSubtitulos}>
                <FilaAjuste
                  testid="fila-subtitulos"
                  icono={<IconoSubtitulos tamano={22} />}
                  nombre={t('subtitulos')}
                  valor={t(CLAVE_SUBTITULO[estiloSub])}
                  onClick={() => alternarMenu('subtitulos')}
                />
              </div>
              <h3 className="dock-seccion">{t('seccionPantalla')}</h3>
              <FilasPantalla ajustes={ajustesLectura} />
            </div>
          </div>
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
          <div className="dock-lugar-grabar" onClickCapture={cerrar}>
            {botonGrabar}
          </div>
          <div className="dock-lugar-duracion" data-testid="dock-duracion">
            {mostrarDuracion && (
              <>
                <span className="dock-duracion" data-testid="dock-duracion-valor">{duracion}</span>
                <span className="dock-rotulo-chico">{t('duraAprox')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Los menús de las filas, afuera del dock -el desenfoque del dock haría que un fixed se colocara
          contra el dock y no contra la pantalla-. En tema oscuro, como el dock. */}
      {abierto && menu && (
        <div data-tema="oscuro" className="menus-dock">
          {esMenuLectura(menu) && (
            <MenuLectura
              ajustes={ajustesLectura}
              anclas={anclasLectura}
              dialogo={menu}
              onCerrar={() => setMenu(null)}
            />
          )}
          {menu === 'calidad' && (
            <MenuAdjuntoAjustes anclaRef={anclaCalidad} onCerrar={() => setMenu(null)} testid="dialogo-calidad">
              <div className="lista-menu-adjunto">
                {calidadesSoportadas.map((q) => (
                  <button
                    key={q}
                    type="button"
                    data-testid={`btn-calidad-${q}`}
                    className={`fila-menu-adjunto${calidadVideo === q ? ' elegida' : ''}`}
                    role="menuitemradio"
                    aria-checked={calidadVideo === q}
                    onClick={() => {
                      setCalidadVideo?.(q)
                      setMenu(null)
                    }}
                  >
                    <span className="fila-menu-adjunto-etiqueta">{q}</span>
                    <CheckMenu visible={calidadVideo === q} />
                  </button>
                ))}
              </div>
              {/* Lo que alcanza el espacio, como en el panel de la ficha de Calidad. */}
              {typeof minutosDisponibles === 'number' && (
                <div
                  data-testid="linea-minutos-disponibles"
                  className={`aviso-ficha menu-dock-aviso${minutosDisponibles < 2 ? ' aviso-ficha-urgente' : ''}`}
                >
                  {minutosDisponibles >= 2
                    ? t('minutosDisponibles', { n: Math.floor(minutosDisponibles) })
                    : t('menosDeDosMinutos')}
                </div>
              )}
            </MenuAdjuntoAjustes>
          )}
          {menu === 'subtitulos' && (
            <MenuAdjuntoAjustes anclaRef={anclaSubtitulos} onCerrar={() => setMenu(null)} testid="dialogo-subtitulos">
              <div className="lista-menu-adjunto">
                {ESTILOS_SUBTITULO.map((e) => (
                  <button
                    key={e.valor}
                    type="button"
                    data-testid={`btn-subtitulo-${e.valor}`}
                    className={`fila-menu-adjunto${estiloSub === e.valor ? ' elegida' : ''}`}
                    role="menuitemradio"
                    aria-checked={estiloSub === e.valor}
                    onClick={() => {
                      setEstiloSub(e.valor)
                      guardarEstiloSubtitulo(e.valor)
                      setMenu(null)
                    }}
                  >
                    <span className="fila-menu-adjunto-etiqueta">{t(CLAVE_SUBTITULO[e.valor])}</span>
                    <CheckMenu visible={estiloSub === e.valor} />
                  </button>
                ))}
              </div>
            </MenuAdjuntoAjustes>
          )}
        </div>
      )}
    </>
  )
}
