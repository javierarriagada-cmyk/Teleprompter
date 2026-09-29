import React, { useEffect, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import {
  IconoAtras, IconoChevron, IconoTamanoLetra, IconoTipografia, IconoAnchoTexto, IconoPaleta, IconoEspejo,
  IconoReloj, IconoTema, IconoIdioma, IconoInfo, IconoCandado, IconoAyuda
} from './IconosApp'
import { hapticaSeleccion } from '../haptica'
import { Interruptor } from './Interruptor'
import { familiaLectura, colorLetraEfectiva, columnaLectura, INTERLINEADO_LECTURA, PASOS_LETRA } from './estiloLectura'
import { PAREJAS_COLOR } from '../datos/modelo'
import { IdiomaApp, idiomaApp, fijarIdioma } from '../lib/idioma'
import { t, useTextos } from '../textos'

// PANTALLA DE AJUSTES -tarea 77, 28-09-2026-.
//
// Capa encima de todo, no un piso de navegacion. El atras del sistema solo
// la cierra: si se abrio desde LISTO, la lectura sigue ahi con la camara
// encendida. El engranaje de la portada y la ficha Mas llegan al mismo sitio.
//
// Cada fila muestra el valor actual. Tocar abre un dialogo; elegir aplica y
// cierra, sin "Aceptar". Los interruptores viven en la fila. Las claves de
// guardado no cambian: teleprompter_ajustes y sigo_subtitulos_estilo.

export type DialogoAjustes =
  | 'letra'
  | 'tipo'
  | 'ancho'
  | 'colores'
  | 'tema'
  | 'idioma'
  | null

function nombrePareja(fondo: string, letra: string): string {
  const f = fondo.toUpperCase()
  const l = letra.toUpperCase()
  if (f === '#000000' && l === '#F5C24B') return t('parejaNegroAmbar')
  if (f === '#FFFFFF') return t('parejaBlancoNegro')
  return t('parejaNegroBlanco')
}

function nombreAncho(columnaAngosta: boolean, marginPercent: number): string {
  if (columnaAngosta) return t('angosto')
  if (marginPercent === 12) return t('medio')
  return t('ancho')
}

// Privacidad y soporte se abren en el navegador del telefono. @capacitor/app no tiene openUrl
// -eso es de otro plugin-; en Android, Capacitor manda los enlaces externos al navegador del
// sistema, asi que window.open alcanza, y en la version web abre una pestana. 28-09-2026.
function abrirEnlace(url: string) {
  window.open(url, '_blank')
}

function FilaAjuste({
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

export function PantallaAjustes({
  onCerrar,
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

  const letra = colorLetraEfectiva(colorFondo, colorLetra)
  const col = columnaLectura(columnaAngosta)
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
        <div
          className="muestra-lectura-ajustes"
          data-testid="muestra-lectura-ajustes"
          style={{
            backgroundColor: colorFondo,
            color: letra,
            fontFamily: familiaLectura(tipoFuente),
            fontSize,
            lineHeight: INTERLINEADO_LECTURA,
            maxWidth: col.maxWidth,
            textAlign: col.textAlign
          }}
        >
          {t('lineaMuestraLectura')}
        </div>

        <FilaAjuste
          testid="fila-tamano-letra"
          icono={<IconoTamanoLetra tamano={22} />}
          nombre={t('tamanoLetra')}
          valor={String(fontSize)}
          onClick={() => setDialogo('letra')}
        />
        <FilaAjuste
          testid="fila-tipo-letra"
          icono={<IconoTipografia tamano={22} />}
          nombre={t('tipografia')}
          valor={tipoFuente === 'serif' ? t('tipoSerif') : t('tipoSans')}
          onClick={() => setDialogo('tipo')}
        />
        <FilaAjuste
          testid="fila-ancho-texto"
          icono={<IconoAnchoTexto tamano={22} />}
          nombre={t('anchoTexto')}
          valor={nombreAncho(columnaAngosta, marginPercent)}
          onClick={() => setDialogo('ancho')}
        />
        <FilaAjuste
          testid="fila-colores"
          icono={<IconoPaleta tamano={22} />}
          nombre={t('coloresLectura')}
          valor={nombrePareja(colorFondo, colorLetra)}
          onClick={() => setDialogo('colores')}
        />
        <FilaAjuste
          testid="fila-espejo"
          icono={<IconoEspejo tamano={22} />}
          nombre={t('espejo')}
          explicacion={t('espejoExplicacion')}
          extra={(
            <Interruptor
              encendido={mirror}
              onCambiar={setMirror}
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
              encendido={mostrarTiempo}
              onCambiar={setMostrarTiempo}
              etiqueta={t('mostrarTiempo')}
              testid="switch-mostrar-tiempo"
            />
          )}
        />

        {verApp && (
          <>
            <h2 className="titulo-seccion-ajustes">{t('seccionApariencia')}</h2>
            <FilaAjuste
              testid="fila-tema"
              icono={<IconoTema tamano={22} />}
              nombre={t('tema')}
              valor={tema === 'claro' ? t('temaClaro') : t('temaOscuro')}
              onClick={() => setDialogo('tema')}
            />
            <FilaAjuste
              testid="fila-idioma"
              icono={<IconoIdioma tamano={22} />}
              nombre={t('idiomaDeLaApp')}
              valor={idioma === 'es' ? 'Español' : 'English'}
              onClick={() => setDialogo('idioma')}
            />

            <h2 className="titulo-seccion-ajustes">{t('seccionAcerca')}</h2>
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
          </>
        )}
      </div>

      {dialogo && (
        <div
          className="capa-dialogo-ajustes"
          data-testid="capa-dialogo-ajustes"
          onClick={() => setDialogo(null)}
        >
          <div
            className="dialogo-ajustes tarjeta-elevada"
            data-testid={`dialogo-${dialogo}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="dialogo-ajustes-titulo">
              {dialogo === 'letra' && t('tamanoLetra')}
              {dialogo === 'tipo' && t('tipografia')}
              {dialogo === 'ancho' && t('anchoTexto')}
              {dialogo === 'colores' && t('coloresLectura')}
              {dialogo === 'tema' && t('tema')}
              {dialogo === 'idioma' && t('idiomaDeLaApp')}
            </h2>

            {/* Cada tamano se muestra a su tamano: se elige mirando, no leyendo un numero. */}
            {dialogo === 'letra' && (
              <div className="lista-dialogo">
                {PASOS_LETRA.map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-testid={`opcion-letra-${n}`}
                    className={`fila-dialogo${fontSize === n ? ' elegida' : ''}`}
                    aria-pressed={fontSize === n}
                    aria-label={`${t('tamanoLetra')} ${n}`}
                    onClick={() => elegirYCerrar(() => onElegirLetra?.(n))}
                  >
                    <span style={{ fontFamily: familiaLectura(tipoFuente), fontSize: Math.min(n, 32) }}>Aa</span>
                    <span className="fila-ajuste-valor">{n}</span>
                  </button>
                ))}
              </div>
            )}

            {dialogo === 'tipo' && (
              <div className="lista-dialogo">
                {([
                  { v: 'sans' as const, n: t('tipoSans') },
                  { v: 'serif' as const, n: t('tipoSerif') }
                ]).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`fila-dialogo${tipoFuente === o.v ? ' elegida' : ''}`}
                    aria-pressed={tipoFuente === o.v}
                    onClick={() => elegirYCerrar(() => setTipoFuente(o.v))}
                  >
                    {o.n}
                  </button>
                ))}
              </div>
            )}

            {dialogo === 'ancho' && (
              <div className="lista-dialogo">
                {([
                  { n: t('ancho'), angosta: false, margen: 5, activo: !columnaAngosta && marginPercent !== 12 },
                  { n: t('medio'), angosta: false, margen: 12, activo: !columnaAngosta && marginPercent === 12 },
                  { n: t('angosto'), angosta: true, margen: 5, activo: !!columnaAngosta }
                ]).map((o) => (
                  <button
                    key={o.n}
                    type="button"
                    className={`fila-dialogo${o.activo ? ' elegida' : ''}`}
                    aria-label={o.n}
                    aria-pressed={o.activo}
                    onClick={() => elegirYCerrar(() => {
                      // La vibracion corta de elegir, como en el cajon que reemplaza -T203-.
                      hapticaSeleccion()
                      setColumnaAngosta(o.angosta)
                      setMarginPercent(o.margen)
                    })}
                  >
                    {o.n}
                  </button>
                ))}
              </div>
            )}

            {dialogo === 'colores' && (
              <div className="lista-dialogo">
                {PAREJAS_COLOR.map((p) => {
                  const activa = colorFondo.toUpperCase() === p.fondo.toUpperCase() && colorLetra.toUpperCase() === p.letra.toUpperCase()
                  return (
                    <button
                      key={`${p.fondo}-${p.letra}`}
                      type="button"
                      className={`fila-dialogo${activa ? ' elegida' : ''}`}
                      aria-label={nombrePareja(p.fondo, p.letra)}
                      aria-pressed={activa}
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
                      <span>{nombrePareja(p.fondo, p.letra)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {dialogo === 'tema' && (
              <div className="lista-dialogo">
                {([
                  { v: 'oscuro' as const, n: t('temaOscuro') },
                  { v: 'claro' as const, n: t('temaClaro') }
                ]).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`fila-dialogo${tema === o.v ? ' elegida' : ''}`}
                    aria-label={o.n}
                    aria-pressed={tema === o.v}
                    onClick={() => elegirYCerrar(() => setTema(o.v))}
                  >
                    {o.n}
                  </button>
                ))}
              </div>
            )}

            {dialogo === 'idioma' && (
              <div className="lista-dialogo" data-testid="selector-idioma-app">
                {([
                  { v: 'es' as IdiomaApp, n: 'Español' },
                  { v: 'en' as IdiomaApp, n: 'English' }
                ]).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    lang={o.v}
                    data-testid={`btn-idioma-${o.v}`}
                    className={`fila-dialogo${idiomaApp() === o.v ? ' elegida' : ''}`}
                    aria-label={o.n}
                    aria-pressed={idiomaApp() === o.v}
                    onClick={() => elegirYCerrar(() => fijarIdioma(o.v))}
                  >
                    {o.n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
