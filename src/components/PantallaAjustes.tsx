import React, { useState } from 'react'
import { IconoAtras, IconoChevron } from './IconosApp'
import { Interruptor } from './Interruptor'
import { familiaLectura, colorLetraEfectiva, columnaLectura, INTERLINEADO_LECTURA } from './estiloLectura'
import { PAREJAS_COLOR } from '../datos/modelo'
import { ESTILOS_SUBTITULO, EstiloSubtitulo, estiloSubtituloGuardado, guardarEstiloSubtitulo } from '../lib/subtitulos'
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
  | 'tipo'
  | 'ancho'
  | 'colores'
  | 'calidad'
  | 'subtitulos'
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

function nombreEstiloSub(estilo: EstiloSubtitulo): string {
  if (estilo === 'amarillo') return t('subtitulosAmarillo')
  if (estilo === 'rojo') return t('subtitulosRojo')
  if (estilo === 'formal') return t('subtitulosFormal')
  return t('subtitulosNo')
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
  extra
}: {
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
  fontSize,
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
  calidadVideo,
  setCalidadVideo,
  calidadesSoportadas,
  minutosDisponibles,
  conCamara,
  tema,
  setTema
}: {
  onCerrar: () => void
  fontSize: number
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
  calidadVideo: string
  setCalidadVideo: (q: string) => void
  calidadesSoportadas: string[]
  minutosDisponibles: number | null
  conCamara: boolean
  tema: 'claro' | 'oscuro'
  setTema: (t: 'claro' | 'oscuro') => void
}) {
  const idioma = useTextos()
  const [dialogo, setDialogo] = useState<DialogoAjustes>(null)
  const [estiloSub, setEstiloSub] = useState<EstiloSubtitulo>(estiloSubtituloGuardado)

  const letra = colorLetraEfectiva(colorFondo, colorLetra)
  const col = columnaLectura(columnaAngosta)
  const mostrarVideo = conCamara && calidadesSoportadas.length > 0
  const calidades = calidadesSoportadas.length > 0 ? calidadesSoportadas : ['1080p', '720p', '480p']

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
    <div className="pantalla-ajustes" data-testid="pantalla-ajustes">
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
        <h1 className="titulo-ajustes">{t('tituloAjustes')}</h1>
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
          testid="fila-tipo-letra"
          nombre={t('tipografia')}
          valor={tipoFuente === 'serif' ? t('tipoSerif') : t('tipoSans')}
          onClick={() => setDialogo('tipo')}
        />
        <FilaAjuste
          testid="fila-ancho-texto"
          nombre={t('anchoTexto')}
          valor={nombreAncho(columnaAngosta, marginPercent)}
          onClick={() => setDialogo('ancho')}
        />
        <FilaAjuste
          testid="fila-colores"
          nombre={t('coloresLectura')}
          valor={nombrePareja(colorFondo, colorLetra)}
          onClick={() => setDialogo('colores')}
        />
        <FilaAjuste
          testid="fila-espejo"
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

        {mostrarVideo && (
          <>
            <h2 className="titulo-seccion-ajustes">{t('seccionVideo')}</h2>
            <FilaAjuste
              testid="fila-calidad"
              nombre={t('calidadVideo')}
              valor={calidadVideo}
              explicacion={
                typeof minutosDisponibles === 'number'
                  ? (minutosDisponibles >= 2
                    ? t('minutosDisponibles', { n: Math.floor(minutosDisponibles) })
                    : t('menosDeDosMinutos'))
                  : undefined
              }
              onClick={() => setDialogo('calidad')}
            />
            <FilaAjuste
              testid="fila-subtitulos"
              nombre={t('subtitulos')}
              valor={nombreEstiloSub(estiloSub)}
              onClick={() => setDialogo('subtitulos')}
            />
          </>
        )}
        {!mostrarVideo && (
          <>
            <h2 className="titulo-seccion-ajustes">{t('seccionVideo')}</h2>
            <FilaAjuste
              testid="fila-subtitulos"
              nombre={t('subtitulos')}
              valor={nombreEstiloSub(estiloSub)}
              onClick={() => setDialogo('subtitulos')}
            />
          </>
        )}

        <h2 className="titulo-seccion-ajustes">{t('seccionApariencia')}</h2>
        <FilaAjuste
          testid="fila-tema"
          nombre={t('tema')}
          valor={tema === 'claro' ? t('temaClaro') : t('temaOscuro')}
          onClick={() => setDialogo('tema')}
        />
        <FilaAjuste
          testid="fila-idioma"
          nombre={t('idiomaDeLaApp')}
          valor={idioma === 'es' ? 'Español' : 'English'}
          onClick={() => setDialogo('idioma')}
        />

        <h2 className="titulo-seccion-ajustes">{t('seccionAcerca')}</h2>
        <div className="fila-ajuste" data-testid="fila-version">
          <div className="fila-ajuste-nombre">{t('version')}</div>
          <span className="fila-ajuste-valor">0.2.0</span>
        </div>
        <FilaAjuste
          testid="fila-privacidad"
          nombre={t('privacidad')}
          onClick={() => abrirEnlace(enlacePrivacidad)}
        />
        <FilaAjuste
          testid="fila-soporte"
          nombre={t('soporte')}
          onClick={() => abrirEnlace(enlaceSoporte)}
        />
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
              {dialogo === 'tipo' && t('tipografia')}
              {dialogo === 'ancho' && t('anchoTexto')}
              {dialogo === 'colores' && t('coloresLectura')}
              {dialogo === 'calidad' && t('calidadVideo')}
              {dialogo === 'subtitulos' && t('subtitulos')}
              {dialogo === 'tema' && t('tema')}
              {dialogo === 'idioma' && t('idiomaDeLaApp')}
            </h2>

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

            {dialogo === 'calidad' && (
              <div className="lista-dialogo">
                {calidades.map((q) => (
                  <button
                    key={q}
                    type="button"
                    data-testid={`btn-calidad-${q}`}
                    className={`fila-dialogo${calidadVideo === q ? ' elegida' : ''}`}
                    aria-pressed={calidadVideo === q}
                    onClick={() => elegirYCerrar(() => setCalidadVideo(q))}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {dialogo === 'subtitulos' && (
              <div className="lista-dialogo">
                {ESTILOS_SUBTITULO.map((e) => (
                  <button
                    key={e.valor}
                    type="button"
                    className={`fila-dialogo${estiloSub === e.valor ? ' elegida' : ''}`}
                    aria-pressed={estiloSub === e.valor}
                    onClick={() => elegirYCerrar(() => {
                      setEstiloSub(e.valor)
                      guardarEstiloSubtitulo(e.valor)
                    })}
                  >
                    {nombreEstiloSub(e.valor)}
                  </button>
                ))}
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
