import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FondoToma } from '../App'
import { AnclajeZona } from './banda'
import {
  IconoEngranaje, IconoVoltear, IconoImagenDetras, IconoImagenRecuadro,
  IconoImagenOculta, IconoFranja, IconoSol, IconoSubtitulos
} from './IconosApp'
import { ESTILOS_SUBTITULO, EstiloSubtitulo, estiloSubtituloGuardado, guardarEstiloSubtitulo } from '../lib/subtitulos'
import type { ClaveTexto } from '../textos'
import { PASOS_LETRA } from './estiloLectura'
import { aplicarBrillo, leerBrilloSistema, restaurarBrillo, BRILLO_MINIMO } from '../lib/brillo'
import { t, useTextos } from '../textos'

// LAS FICHAS DE LISTO -tarea 77, 28-09-2026-.
//
// Reemplazan el cajon panel-ajustes-toma y el engranaje de la esquina. Cada
// ficha dice su valor; tocarla abre un panel solo con sus opciones, pegado a
// ella. Un panel a la vez. Voltear es una ACCION: no abre panel. Mas abre la
// pantalla de Ajustes -el callback, sin vibrar aca: T207, la vibracion sigue
// en App-.
//
// Los testid de las opciones -btn-fondo-*, btn-calidad-*, btn-anclaje-*,
// barra-brillo, valor-letra-panel, aviso-camara-encendida,
// linea-minutos-disponibles, btn-voltear-camara- se conservan: las pruebas
// migran el camino, no las puertas de cada ajuste.

export type PanelFicha = 'letra' | 'camara' | 'anclaje' | 'brillo' | 'calidad' | 'subtitulos' | null

// Los nombres de los estilos, en el idioma de la app -las claves de SubtitulosVisor.tsx-.
const CLAVE_SUBTITULO: Record<EstiloSubtitulo, ClaveTexto> = {
  no: 'subtitulosNo', amarillo: 'subtitulosAmarillo', rojo: 'subtitulosRojo', formal: 'subtitulosFormal'
}

function etiquetaCamara(fondo: FondoToma): string {
  if (fondo === 'recuadro') return t('fichaCamaraRecuadro')
  if (fondo === 'oculta') return t('fichaCamaraOculta')
  return t('fichaCamaraDetras')
}

function etiquetaAnclaje(z: AnclajeZona): string {
  return z === 'medio' ? t('fichaAlMedio') : t('fichaArriba')
}

function etiquetaBrillo(brillo: number | null): string {
  if (brillo === null) return t('brilloAuto')
  return `${Math.round(brillo * 100)} %`
}

export function FichasListo({
  fontSize,
  onLetraMenos,
  onLetraMas,
  onElegirLetra,
  conCamara,
  fondoToma,
  setFondoToma,
  onVoltear,
  anclajeZona,
  setAnclajeZona,
  brillo,
  setBrillo,
  calidadVideo,
  setCalidadVideo,
  calidadesSoportadas,
  minutosDisponibles,
  panelAbierto,
  setPanelAbierto,
  onAbrirAjustes,
  horizontal = false
}: {
  fontSize: number
  onLetraMenos?: () => void
  onLetraMas?: () => void
  onElegirLetra?: (n: number) => void
  conCamara: boolean
  fondoToma: FondoToma
  setFondoToma?: (f: FondoToma) => void
  onVoltear?: () => void
  anclajeZona: AnclajeZona
  setAnclajeZona?: (a: AnclajeZona) => void
  brillo: number | null
  setBrillo: (v: number | null) => void
  calidadVideo: string
  setCalidadVideo?: (q: string) => void
  calidadesSoportadas: string[]
  minutosDisponibles: number | null
  panelAbierto: PanelFicha
  setPanelAbierto: (p: PanelFicha) => void
  onAbrirAjustes?: () => void
  // TELÉFONO DE LADO -tarea 82, 29-09-2026-: las fichas van en columna en el riel izquierdo, Más
  // sale del carril -la dibuja TeleprompterView arriba del riel derecho, con FichaMas- y el panel
  // se abre a la derecha del riel, a la altura de su ficha.
  horizontal?: boolean
}) {
  useTextos()
  const carrilRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  // El top del panel en horizontal, en px de la fila -que en horizontal cubre el riel entero-.
  const [topPanelH, setTopPanelH] = useState<number | null>(null)

  // EL PANEL A LA ALTURA DE SU FICHA, SIN SALIRSE DE LA PANTALLA -tarea 82-. Se mide después de
  // dibujar: el alto del panel depende de sus opciones -Brillo es una barra, Cámara son tres filas
  // y voltear-. Si desde el top de la ficha no cabe, se corre hacia arriba hasta que el borde de
  // abajo quede a 8 del alto útil. El alto máximo y el scroll interno los pone la hoja de estilos.
  useLayoutEffect(() => {
    if (!horizontal || !panelAbierto) {
      setTopPanelH(null)
      return
    }
    const carril = carrilRef.current
    const panel = panelRef.current
    const fila = carril?.parentElement
    if (!carril || !panel || !fila) return
    const ficha = carril.querySelector('[aria-expanded="true"]') as HTMLElement | null
    if (!ficha) return
    const rFila = fila.getBoundingClientRect()
    const cs = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(fila) : null
    const n = (v: string | undefined) => (v && Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0)
    const arriba = n(cs?.paddingTop)
    const abajo = rFila.height - n(cs?.paddingBottom)
    const deseado = ficha.getBoundingClientRect().top - rFila.top
    const alto = panel.offsetHeight
    const top = Math.max(arriba + 8, Math.min(deseado, abajo - 8 - alto))
    setTopPanelH(top)
  }, [horizontal, panelAbierto])
  const [brilloSistema, setBrilloSistema] = useState<number | null>(null)

  useEffect(() => {
    if (panelAbierto !== 'brillo' || brillo !== null) return
    let vivo = true
    leerBrilloSistema().then((v) => { if (vivo) setBrilloSistema(v) })
    return () => { vivo = false }
  }, [panelAbierto, brillo])

  function toggle(panel: PanelFicha) {
    setPanelAbierto(panelAbierto === panel ? null : panel)
  }

  const calidades = calidadesSoportadas.length > 0 ? calidadesSoportadas : ['1080p', '720p', '480p']
  const mostrarCalidad = conCamara && calidadesSoportadas.length > 0
  // LOS SUBTITULOS, ANTES DE GRABAR -28-09-2026-. Javier: la seccion Video salio de Ajustes; los
  // subtitulos van en su ficha de Grabar. Es la MISMA clave que el reproductor -sigo_subtitulos_estilo-:
  // lo que se elige aca es con lo que abre la toma, y ahi se puede cambiar mirando el video.
  const [estiloSub, setEstiloSub] = useState<EstiloSubtitulo>(estiloSubtituloGuardado)
  const valorBrillo = brillo ?? brilloSistema ?? 0.5
  const idxLetra = PASOS_LETRA.indexOf(fontSize)
  const puedeMenos = idxLetra > 0 || (idxLetra < 0 && PASOS_LETRA.some((p) => p < fontSize))
  const puedeMas = (idxLetra >= 0 && idxLetra < PASOS_LETRA.length - 1) || (idxLetra < 0 && PASOS_LETRA.some((p) => p > fontSize))

  return (
    // El toque en una ficha o en su panel no sube al lienzo: el lienzo cierra el panel abierto al
    // tocar el texto, y con el toque subiendo, tocar "Arriba" con la letra abierta cerraba todo en
    // vez de abrir su panel -lo encontro T77b, 28-09-2026-.
    <div className="fila-fichas-listo" data-testid="fila-fichas-listo" onClick={(e) => e.stopPropagation()}>
      {panelAbierto && (
        <div
          ref={panelRef}
          className="panel-ficha tarjeta-elevada"
          // 29-09-2026, tarea 82: en horizontal el top sale de la ficha -ver arriba-; en vertical
          // no hay estilo en línea y manda styles-ajustes.css, como hasta hoy.
          style={horizontal && topPanelH !== null ? { top: topPanelH } : undefined}
          data-testid={`panel-ficha-${panelAbierto}`}
          data-panel-ajustes-toma=""
          onClick={(e) => e.stopPropagation()}
        >
          {panelAbierto === 'letra' && (
            <>
              <div className="panel-ficha-cabeza">
                <span>{t('tamanoLetra')}</span>
                <span data-testid="valor-letra-panel">{fontSize}</span>
              </div>
              <div className="fila-deslizador-letra">
                <button
                  type="button"
                  className="btn-paso-letra"
                  aria-label={t('letraMenos')}
                  disabled={!puedeMenos}
                  onClick={() => onLetraMenos?.()}
                >
                  −
                </button>
                <input
                  type="range"
                  className="barra-pasos"
                  min={0}
                  max={PASOS_LETRA.length - 1}
                  step={1}
                  value={idxLetra >= 0 ? idxLetra : PASOS_LETRA.reduce((i, p, n) => Math.abs(p - fontSize) < Math.abs(PASOS_LETRA[i] - fontSize) ? n : i, 0)}
                  aria-label={t('tamanoLetra')}
                  onChange={(e) => {
                    const n = PASOS_LETRA[Number(e.target.value)]
                    if (n !== undefined) onElegirLetra?.(n)
                  }}
                  // El relleno de la pista hasta el paso elegido -styles-ajustes.css, --relleno-.
                  style={{ ['--relleno' as string]: `${((idxLetra >= 0 ? idxLetra : 0) / (PASOS_LETRA.length - 1)) * 100}%` }}
                />
                <button
                  type="button"
                  className="btn-paso-letra"
                  aria-label={t('letraMas')}
                  disabled={!puedeMas}
                  onClick={() => onLetraMas?.()}
                >
                  +
                </button>
              </div>
            </>
          )}

          {panelAbierto === 'camara' && (
            <>
              <div className="panel-ficha-cabeza">
                <span>{t('imagenCamara')}</span>
                <span>{etiquetaCamara(fondoToma)}</span>
              </div>
              <div className="segmentado" role="group" aria-label={t('imagenCamara')}>
                {([
                  { val: 'detras' as const, label: t('imagenDetras'), Icono: IconoImagenDetras },
                  { val: 'recuadro' as const, label: t('imagenRecuadro'), Icono: IconoImagenRecuadro },
                  { val: 'oculta' as const, label: t('imagenOculta'), Icono: IconoImagenOculta }
                ]).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    data-testid={`btn-fondo-${opt.val}`}
                    aria-label={opt.label}
                    aria-pressed={fondoToma === opt.val}
                    className={`segmentado-opcion${fondoToma === opt.val ? ' activa' : ''}`}
                    onClick={() => setFondoToma?.(opt.val)}
                  >
                    <opt.Icono tamano={18} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              {fondoToma === 'oculta' && (
                <div data-testid="aviso-camara-encendida" className="aviso-ficha">
                  {t('camaraSigueEncendida')}
                </div>
              )}
              {/* VOLTEAR, ADENTRO DEL PANEL DE LA CAMARA -28-09-2026-. Era una ficha suelta; Javier:
                  "deberia estar incluido en el submenu de la camara... al ladito o abajo". Todo lo de
                  la camara en un solo lugar. Sigue siendo una accion, no una eleccion. */}
              <div className="segmentado">
                <button
                  type="button"
                  data-testid="btn-voltear-camara"
                  aria-label={t('voltearCamara')}
                  className="segmentado-opcion"
                  onClick={() => onVoltear?.()}
                >
                  <IconoVoltear tamano={18} />
                  <span>{t('voltearCamara')}</span>
                </button>
              </div>
            </>
          )}

          {panelAbierto === 'subtitulos' && (
            <>
              <div className="panel-ficha-cabeza">
                <span>{t('subtitulos')}</span>
                <span>{t(CLAVE_SUBTITULO[estiloSub])}</span>
              </div>
              <div className="segmentado" role="group" aria-label={t('subtitulos')}>
                {ESTILOS_SUBTITULO.map((e) => (
                  <button
                    key={e.valor}
                    type="button"
                    data-testid={`btn-subtitulo-${e.valor}`}
                    aria-pressed={estiloSub === e.valor}
                    className={`segmentado-opcion${estiloSub === e.valor ? ' activa' : ''}`}
                    onClick={() => {
                      setEstiloSub(e.valor)
                      guardarEstiloSubtitulo(e.valor)
                    }}
                  >
                    <span>{t(CLAVE_SUBTITULO[e.valor])}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {panelAbierto === 'anclaje' && (
            <>
              <div className="panel-ficha-cabeza">
                <span>{t('dondeLees')}</span>
                <span>{etiquetaAnclaje(anclajeZona)}</span>
              </div>
              <div className="segmentado" role="group" aria-label={t('dondeLees')}>
                {([
                  { val: 'arriba' as const, label: t('fichaArriba'), aria: t('leerArriba') },
                  { val: 'medio' as const, label: t('fichaAlMedio'), aria: t('leerAlMedio') }
                ]).map((z) => (
                  <button
                    key={z.val}
                    type="button"
                    data-testid={`btn-anclaje-${z.val}`}
                    aria-label={z.aria}
                    aria-pressed={anclajeZona === z.val}
                    className={`segmentado-opcion${anclajeZona === z.val ? ' activa' : ''}`}
                    onClick={() => setAnclajeZona?.(z.val)}
                  >
                    <IconoFranja posicion={z.val} tamano={18} />
                    <span>{z.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {panelAbierto === 'brillo' && (
            <>
              <div className="panel-ficha-cabeza">
                <span>{t('brillo')}</span>
                <span>{etiquetaBrillo(brillo)}</span>
              </div>
              <div className="brillo-ficha" role="group" aria-label={t('brillo')}>
                <IconoSol tamano={16} />
                <input
                  type="range"
                  data-testid="barra-brillo"
                  className="barra-brillo"
                  aria-label={t('brillo')}
                  min={Math.round(BRILLO_MINIMO * 100)}
                  max={100}
                  step={1}
                  value={Math.round(valorBrillo * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    setBrillo(v)
                    aplicarBrillo(v)
                  }}
                  style={{ ['--relleno' as string]: `${((valorBrillo - BRILLO_MINIMO) / (1 - BRILLO_MINIMO)) * 100}%` }}
                />
                <IconoSol tamano={26} />
              </div>
              <button
                type="button"
                className="boton-texto-ficha"
                data-testid="btn-brillo-auto"
                onClick={() => {
                  setBrillo(null)
                  restaurarBrillo()
                }}
              >
                {t('brilloAutomatico')}
              </button>
            </>
          )}

          {panelAbierto === 'calidad' && (
            <>
              <div className="panel-ficha-cabeza">
                <span>{t('calidadVideo')}</span>
                <span>{calidadVideo}</span>
              </div>
              <div className="segmentado" role="group" aria-label={t('calidadVideo')}>
                {calidades.map((q) => (
                  <button
                    key={q}
                    type="button"
                    data-testid={`btn-calidad-${q}`}
                    aria-pressed={calidadVideo === q}
                    className={`segmentado-opcion${calidadVideo === q ? ' activa' : ''}`}
                    onClick={() => setCalidadVideo?.(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
              {typeof minutosDisponibles === 'number' && (
                <div
                  data-testid="linea-minutos-disponibles"
                  className={`aviso-ficha${minutosDisponibles < 2 ? ' aviso-ficha-urgente' : ''}`}
                >
                  {minutosDisponibles >= 2
                    ? t('minutosDisponibles', { n: Math.floor(minutosDisponibles) })
                    : t('menosDeDosMinutos')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="carril-fichas" ref={carrilRef}>
        <button
          type="button"
          className={`ficha-listo${panelAbierto === 'letra' ? ' abierta' : ''}`}
          data-testid="ficha-letra"
          aria-label={`${t('tamanoLetra')}, ${fontSize}`}
          aria-expanded={panelAbierto === 'letra'}
          onClick={() => toggle('letra')}
        >
          <span>Aa {fontSize}</span>
        </button>

        {conCamara && (
          <button
            type="button"
            className={`ficha-listo${panelAbierto === 'camara' ? ' abierta' : ''}`}
            data-testid="ficha-camara"
            aria-label={`${t('imagenCamara')}, ${etiquetaCamara(fondoToma)}`}
            aria-expanded={panelAbierto === 'camara'}
            onClick={() => toggle('camara')}
          >
            {fondoToma === 'recuadro' ? <IconoImagenRecuadro tamano={16} /> : fondoToma === 'oculta' ? <IconoImagenOculta tamano={16} /> : <IconoImagenDetras tamano={16} />}
            <span>{etiquetaCamara(fondoToma)}</span>
          </button>
        )}

        <button
          type="button"
          className={`ficha-listo${panelAbierto === 'anclaje' ? ' abierta' : ''}`}
          data-testid="ficha-anclaje"
          aria-label={`${t('dondeLees')}, ${etiquetaAnclaje(anclajeZona)}`}
          aria-expanded={panelAbierto === 'anclaje'}
          onClick={() => toggle('anclaje')}
        >
          <IconoFranja posicion={anclajeZona === 'medio' ? 'medio' : 'arriba'} tamano={16} />
          <span>{etiquetaAnclaje(anclajeZona)}</span>
        </button>

        <button
          type="button"
          className={`ficha-listo${panelAbierto === 'brillo' ? ' abierta' : ''}`}
          data-testid="ficha-brillo"
          aria-label={`${t('brillo')}, ${etiquetaBrillo(brillo)}`}
          aria-expanded={panelAbierto === 'brillo'}
          onClick={() => toggle('brillo')}
        >
          <IconoSol tamano={16} />
          <span>{etiquetaBrillo(brillo)}</span>
        </button>

        {mostrarCalidad && (
          <button
            type="button"
            className={`ficha-listo${panelAbierto === 'calidad' ? ' abierta' : ''}`}
            data-testid="ficha-calidad"
            aria-label={`${t('calidadVideo')}, ${calidadVideo}`}
            aria-expanded={panelAbierto === 'calidad'}
            onClick={() => toggle('calidad')}
          >
            <span>{calidadVideo}</span>
          </button>
        )}

        {conCamara && (
          <button
            type="button"
            className={`ficha-listo${panelAbierto === 'subtitulos' ? ' abierta' : ''}`}
            data-testid="ficha-subtitulos"
            aria-label={`${t('subtitulos')}, ${t(CLAVE_SUBTITULO[estiloSub])}`}
            aria-expanded={panelAbierto === 'subtitulos'}
            onClick={() => toggle('subtitulos')}
          >
            <IconoSubtitulos tamano={16} />
            <span>{t(CLAVE_SUBTITULO[estiloSub])}</span>
          </button>
        )}

        {/* 29-09-2026, tarea 82: en horizontal Más no va en el carril -una sola ficha-mas en
            pantalla-; la dibuja TeleprompterView arriba del riel derecho. */}
        {!horizontal && <FichaMas setPanelAbierto={setPanelAbierto} onAbrirAjustes={onAbrirAjustes} />}
      </div>
    </div>
  )
}

// LA FICHA MÁS, APARTE -tarea 82, 29-09-2026-. Era el último botón del carril. En el teléfono de
// lado va arriba del riel derecho, en Leer Y en Grabar -decisión de Javier: el mismo lugar en los
// dos modos-, y por eso es un componente: el mismo botón, con su testid, en uno u otro lugar.
export function FichaMas({
  setPanelAbierto,
  onAbrirAjustes
}: {
  setPanelAbierto: (p: PanelFicha) => void
  onAbrirAjustes?: () => void
}) {
  useTextos()
  return (
    <button
      type="button"
      className="ficha-listo"
      data-testid="ficha-mas"
      data-alias-engranaje="btn-engranaje-toma"
      aria-label={t('fichaMas')}
      onClick={(e) => {
        // En el riel derecho no hay fila que corte el toque: sin esto subiría al lienzo.
        e.stopPropagation()
        setPanelAbierto(null)
        onAbrirAjustes?.()
      }}
    >
      <IconoEngranaje tamano={16} />
      <span>{t('fichaMas')}</span>
    </button>
  )
}
