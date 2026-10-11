import React, { useEffect, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
// Antes -hasta 2026-10-10-: los íconos de las filas de lectura y pantalla, Interruptor, hapticaSeleccion,
// estiloLectura, PAREJAS_COLOR, bordesSeguros y movimiento se importaban aquí. Ajustes de pantallas,
// 10-10-2026: esas filas y sus menús viven en FilasAjustesLectura.tsx, compartidas con el panel de la toma.
// import {
//   IconoAtras, IconoChevron, IconoTamanoLetra, IconoTipografia, IconoAnchoTexto, IconoPaleta, IconoEspejo,
//   IconoReloj, IconoTema, IconoIdioma, IconoInfo, IconoCandado, IconoAyuda, IconoDocumento
// } from './IconosApp'
// import { hapticaSeleccion } from '../haptica'
// import { Interruptor } from './Interruptor'
// import { familiaLectura, colorLetraEfectiva, columnaLectura, INTERLINEADO_LECTURA, PASOS_LETRA } from './estiloLectura'
// import { PAREJAS_COLOR } from '../datos/modelo'
// import { bordesSeguros, colocarMenu } from '../lib/bordesSeguros'
// import { CURVA_RESORTE, MS_CHICO, movimientoApagado } from './movimiento'
import {
  IconoAtras, IconoTema, IconoIdioma, IconoInfo, IconoCandado, IconoAyuda, IconoDocumento
} from './IconosApp'
import { PantallaLicencias } from './PantallaLicencias'
import { IdiomaApp, idiomaApp, fijarIdioma } from '../lib/idioma'
import { t, useTextos } from '../textos'
import {
  AjustesLectura, FilaAjuste, MenuAdjuntoAjustes, CheckMenu, MuestraLectura, FilasLectura, FilasPantalla,
  MenuLectura, esMenuLectura, useAnclasLectura
} from './FilasAjustesLectura'

// PANTALLA DE AJUSTES -tarea 77, 28-09-2026-.
//
// Capa encima de todo, no un piso de navegacion. El atras del sistema solo
// la cierra: si se abrio desde LISTO, la lectura sigue ahi con la camara
// encendida. El engranaje de la portada y la ficha Mas llegan al mismo sitio.
//
// Cada fila muestra el valor actual. Tocar abre un dialogo; elegir aplica y
// cierra, sin "Aceptar". Los interruptores viven en la fila. Las claves de
// guardado no cambian: teleprompter_ajustes y sigo_subtitulos_estilo.
//
// 06-10-2026, boceto tarea 102: secciones en cards; opciones en menu adjunto a
// la fila (sin hoja inferior ni scrim); Acerca de pasa a una subpantalla.

export type DialogoAjustes =
  | 'letra'
  | 'tipo'
  | 'ancho'
  | 'colores'
  | 'tema'
  | 'idioma'
  | null

// Antes -hasta 2026-10-10-: nombrePareja y nombreAncho vivían aquí. Ajustes de pantallas, 10-10-2026:
// se mudaron sin cambios -con su comentario de la tarea 95- a FilasAjustesLectura.tsx.

// Privacidad y soporte se abren en el navegador del telefono. @capacitor/app no tiene openUrl
// -eso es de otro plugin-; en Android, Capacitor manda los enlaces externos al navegador del
// sistema, asi que window.open alcanza, y en la version web abre una pestana. 28-09-2026.
function abrirEnlace(url: string) {
  window.open(url, '_blank')
}

// Antes -hasta 2026-10-10-: FilaAjuste, MenuAdjuntoAjustes y CheckMenu vivían aquí. Ajustes de
// pantallas, 10-10-2026: se mudaron sin cambios -con sus comentarios- a FilasAjustesLectura.tsx, para
// que el panel de Ajustes de la toma use las mismas filas y los mismos menús.

export function PantallaAjustes({
  onCerrar,
  onRegistrarCerrarDentro,
  origen = 'portada',
  fontSize,
  onElegirLetra,
  tipoFuente,
  setTipoFuente,
  columnaAngosta,
  marginPercent,
  setColumnaAngosta,
  setMarginPercent,
  colorFondo,
  colorLetra,
  setColorFondo,
  setColorLetra,
  mirror,
  setMirror,
  mostrarTiempo,
  setMostrarTiempo,
  tema,
  setTema
}: {
  onCerrar: () => void
  // Tarea 102 PASO 2: el gesto de atras cierra menu / Acerca / Licencias antes
  // de salir de Ajustes. App lo engancha junto a handleVolverAtras.
  onRegistrarCerrarDentro?: (fn: (() => boolean) | null) => void
  // DESDE DONDE SE ABRE -28-09-2026-. Javier: "por que subtitulos esta en ajustes que pueden
  // estar para leer". Cada puerta muestra lo suyo: el guion y Leer, solo la lectura; Grabar,
  // lectura y video; la portada, todo -tambien apariencia y acerca de-.
  // 28-09-2026, mas tarde: LA SECCION VIDEO SALIO DE AJUSTES EN TODAS LAS PUERTAS. Javier: la calidad
  // ya esta en su ficha de Grabar, y los subtitulos pasan a la suya. Queda la lectura, y en la
  // portada tambien apariencia y acerca de.
  origen?: 'portada' | 'editor' | 'leer' | 'grabar'
  fontSize: number
  // El tamano tambien vive aca -28-09-2026-: el Aa del editor abre esta misma pantalla, y
  // Javier pidio un solo estilo de ajustes en toda la app. Los pasos son PASOS_LETRA.
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
  tema: 'claro' | 'oscuro'
  setTema: (t: 'claro' | 'oscuro') => void
}) {
  const idioma = useTextos()
  const [dialogo, setDialogo] = useState<DialogoAjustes>(null)
  const [licencias, setLicencias] = useState(false)
  const [pantallaAcerca, setPantallaAcerca] = useState(false)

  // Antes -hasta 2026-10-10-: anclaLetra, anclaTipo, anclaAncho y anclaColores, cuatro useRef aquí.
  // Ajustes de pantallas: son las anclas de las filas compartidas -useAnclasLectura-.
  const anclasLectura = useAnclasLectura()
  const anclaTema = useRef<HTMLDivElement>(null)
  const anclaIdioma = useRef<HTMLDivElement>(null)

  // Antes -hasta 2026-10-10-: const letra = colorLetraEfectiva(colorFondo, colorLetra) y
  // const col = columnaLectura(columnaAngosta), para la muestra. Ahora la pinta MuestraLectura.
  // Los ajustes de lectura y pantalla, juntos, para las filas compartidas: los mismos que llegan.
  const ajustesLectura: AjustesLectura = {
    fontSize, onElegirLetra, tipoFuente, setTipoFuente, columnaAngosta, marginPercent, setColumnaAngosta,
    setMarginPercent, colorFondo, colorLetra, setColorFondo, setColorLetra, mirror, setMirror,
    mostrarTiempo, setMostrarTiempo
  }
  const verApp = origen === 'portada'
  // La version real, la del paquete -1.0 (457)-. Estaba escrita a mano como 0.2.0.
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    // Solo en el telefono: en el navegador -y en las pruebas- el plugin no trae getInfo.
    if (!verApp || typeof (CapacitorApp as any).getInfo !== 'function') return
    try {
      CapacitorApp.getInfo()
        .then((i) => setVersion(`${i.version} (${i.build})`))
        .catch(() => setVersion(null))
    } catch {
      setVersion(null)
    }
  }, [verApp])

  // El gesto de atras: menu abierto → Acerca → Licencias → (App cierra Ajustes).
  useEffect(() => {
    if (!onRegistrarCerrarDentro) return
    onRegistrarCerrarDentro(() => {
      if (dialogo !== null) {
        setDialogo(null)
        return true
      }
      if (licencias) {
        setLicencias(false)
        return true
      }
      if (pantallaAcerca) {
        setPantallaAcerca(false)
        return true
      }
      return false
    })
    return () => onRegistrarCerrarDentro(null)
  }, [dialogo, licencias, pantallaAcerca, onRegistrarCerrarDentro])

  function elegirYCerrar(fn: () => void) {
    fn()
    setDialogo(null)
  }

  const enlacePrivacidad = idioma === 'es'
    ? 'https://sigoteleprompter.com/privacidad'
    : 'https://sigoteleprompter.com/en/privacy'
  const enlaceSoporte = idioma === 'es'
    ? 'https://sigoteleprompter.com/soporte'
    : 'https://sigoteleprompter.com/en/support'

  if (licencias) return <PantallaLicencias onCerrar={() => setLicencias(false)} />

  // Subpantalla Acerca de Sigo -boceto tarea 102-: Versión, Privacidad, Soporte, Licencias.
  if (pantallaAcerca) {
    return (
      <div
        className="pantalla-ajustes"
        data-testid="pantalla-acerca-sigo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pantalla-acerca"
      >
        <header className="barra-ajustes">
          <button
            type="button"
            className="btn-atras-ajustes"
            data-testid="btn-cerrar-acerca"
            aria-label={t('volver')}
            onClick={() => setPantallaAcerca(false)}
          >
            <IconoAtras tamano={22} />
          </button>
          <h1 className="titulo-ajustes" id="titulo-pantalla-acerca">{t('acercaDeSigo')}</h1>
        </header>
        <div className="cuerpo-ajustes">
          <div className="tarjeta-seccion-ajustes" style={{ marginTop: 16 }}>
            <div className="fila-ajuste" data-testid="fila-version">
              <span className="fila-ajuste-icono" aria-hidden="true"><IconoInfo tamano={22} /></span>
              <div className="fila-ajuste-nombre">{t('version')}</div>
              <span className="fila-ajuste-valor">{version ?? '—'}</span>
            </div>
            <FilaAjuste
              testid="fila-privacidad"
              icono={<IconoCandado tamano={22} />}
              nombre={t('privacidad')}
              onClick={() => abrirEnlace(enlacePrivacidad)}
            />
            <FilaAjuste
              testid="fila-soporte"
              icono={<IconoAyuda tamano={22} />}
              nombre={t('soporte')}
              onClick={() => abrirEnlace(enlaceSoporte)}
            />
            <FilaAjuste
              testid="fila-licencias"
              icono={<IconoDocumento tamano={22} />}
              nombre={t('licencias')}
              onClick={() => setLicencias(true)}
            />
          </div>
        </div>
      </div>
    )
  }

  // Antes -hasta 2026-10-10-: las cuatro de lectura también se elegían aquí:
  //   dialogo === 'letra' ? anclaLetra : dialogo === 'tipo' ? anclaTipo : dialogo === 'ancho' ? anclaAncho
  //   : dialogo === 'colores' ? anclaColores : ...
  // Ahora sus menús los dibuja MenuLectura con sus propias anclas; aquí quedan Tema e Idioma.
  const anclaActiva =
    dialogo === 'tema' ? anclaTema
    : dialogo === 'idioma' ? anclaIdioma
    : null

  return (
    // UNA PANTALLA QUE TAPA TODO, DICHA COMO TAL -tarea 84, G2, 29-09-2026-. Para TalkBack era
    // un bloque más de la página: al abrirla seguía leyendo lo de atrás. role="dialog" con
    // aria-modal la marca como la capa de encima, y su nombre es el título -"Ajustes"-.
    <div
      className="pantalla-ajustes"
      data-testid="pantalla-ajustes"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-pantalla-ajustes"
    >
      <header className="barra-ajustes">
        <button
          type="button"
          className="btn-atras-ajustes"
          data-testid="btn-cerrar-ajustes"
          aria-label={t('volver')}
          onClick={onCerrar}
        >
          <IconoAtras tamano={22} />
        </button>
        <h1 className="titulo-ajustes" id="titulo-pantalla-ajustes">{t('tituloAjustes')}</h1>
      </header>

      <div className="cuerpo-ajustes">
        <h2 className="titulo-seccion-ajustes">{t('seccionLectura')}</h2>
        <div className="tarjeta-seccion-ajustes">
          {/* Antes -hasta 2026-10-10-: la muestra, las cuatro filas de lectura -envoltorio-fila-con-menu con
              su ancla- y las filas de Espejo y Mostrar tiempo estaban escritas aquí. Ajustes de pantallas,
              10-10-2026: son las mismas del panel de Ajustes de la toma, en FilasAjustesLectura.tsx. */}
          <MuestraLectura ajustes={ajustesLectura} />
          <FilasLectura
            ajustes={ajustesLectura}
            anclas={anclasLectura}
            dialogo={dialogo}
            setDialogo={setDialogo}
          />
          <FilasPantalla ajustes={ajustesLectura} />
        </div>

        {verApp && (
          <>
            <h2 className="titulo-seccion-ajustes">{t('seccionApariencia')}</h2>
            <div className="tarjeta-seccion-ajustes">
              <div className="envoltorio-fila-con-menu" ref={anclaTema}>
                <FilaAjuste
                  testid="fila-tema"
                  icono={<IconoTema tamano={22} />}
                  nombre={t('tema')}
                  valor={tema === 'claro' ? t('temaClaro') : t('temaOscuro')}
                  onClick={() => setDialogo(dialogo === 'tema' ? null : 'tema')}
                />
              </div>
              <div className="envoltorio-fila-con-menu" ref={anclaIdioma}>
                <FilaAjuste
                  testid="fila-idioma"
                  icono={<IconoIdioma tamano={22} />}
                  nombre={t('idiomaDeLaApp')}
                  valor={idioma === 'es' ? 'Español' : 'English'}
                  onClick={() => setDialogo(dialogo === 'idioma' ? null : 'idioma')}
                />
              </div>
            </div>

            <h2 className="titulo-seccion-ajustes">{t('seccionAcerca')}</h2>
            <div className="tarjeta-seccion-ajustes">
              <FilaAjuste
                testid="fila-acerca-de-sigo"
                icono={<IconoInfo tamano={22} />}
                nombre={t('acercaDeSigo')}
                onClick={() => setPantallaAcerca(true)}
              />
            </div>
          </>
        )}
      </div>

      {/* Ajustes de pantallas, 10-10-2026: los menús de Letra, Tipografía, Ancho y Colores -con el
          comentario de cada tamaño a su tamaño- se mudaron a MenuLectura, en FilasAjustesLectura.tsx. */}
      {dialogo && esMenuLectura(dialogo) && (
        <MenuLectura
          ajustes={ajustesLectura}
          anclas={anclasLectura}
          dialogo={dialogo}
          onCerrar={() => setDialogo(null)}
        />
      )}
      {dialogo && anclaActiva && (
        <MenuAdjuntoAjustes
          anclaRef={anclaActiva}
          onCerrar={() => setDialogo(null)}
          testid={`dialogo-${dialogo}`}
        >
          {dialogo === 'tema' && (
            <div className="lista-menu-adjunto">
              {([
                { v: 'oscuro' as const, n: t('temaOscuro') },
                { v: 'claro' as const, n: t('temaClaro') }
              ]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  className={`fila-menu-adjunto${tema === o.v ? ' elegida' : ''}`}
                  role="menuitemradio"
                  aria-label={o.n}
                  aria-checked={tema === o.v}
                  onClick={() => elegirYCerrar(() => setTema(o.v))}
                >
                  <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
                  <CheckMenu visible={tema === o.v} />
                </button>
              ))}
            </div>
          )}

          {dialogo === 'idioma' && (
            <div className="lista-menu-adjunto" data-testid="selector-idioma-app">
              {([
                { v: 'es' as IdiomaApp, n: 'Español' },
                { v: 'en' as IdiomaApp, n: 'English' }
              ]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  lang={o.v}
                  data-testid={`btn-idioma-${o.v}`}
                  className={`fila-menu-adjunto${idiomaApp() === o.v ? ' elegida' : ''}`}
                  role="menuitemradio"
                  aria-label={o.n}
                  aria-checked={idiomaApp() === o.v}
                  onClick={() => elegirYCerrar(() => fijarIdioma(o.v))}
                >
                  <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
                  <CheckMenu visible={idiomaApp() === o.v} />
                </button>
              ))}
            </div>
          )}
        </MenuAdjuntoAjustes>
      )}
    </div>
  )
}
