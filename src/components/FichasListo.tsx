import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FondoToma } from '../App'
import { AnclajeZona } from './banda'
import {
  IconoEngranaje, IconoVoltear, IconoImagenDetras, IconoImagenRecuadro,
  IconoImagenOculta, IconoFranja, IconoSol, IconoSubtitulos, IconoChevron
} from './IconosApp'
import { ESTILOS_SUBTITULO, EstiloSubtitulo, estiloSubtituloGuardado, guardarEstiloSubtitulo } from '../lib/subtitulos'
import type { ClaveTexto } from '../textos'
import { PASOS_LETRA } from './estiloLectura'
import { aplicarBrillo, leerBrilloSistema, restaurarBrillo, BRILLO_MINIMO } from '../lib/brillo'
import { t, useTextos } from '../textos'
import { Interruptor } from './Interruptor'
// -tarea 106- De lado, la ficha del modo de lectura va primera en el riel.
import { FichaModoLectura } from './ControlesVelocidad'
import { movimientoApagado, MS_CHICO, CURVA_RESORTE } from './movimiento'
import type { EstadoModeloGestos } from '../lib/gestos'

// La aparición de la segunda fila -tarea 93, 05-10-2026-: un resorte de unos 240 ms.
const MS_SEGUNDA_FILA = 240

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
//
// LA FLECHA Y LA SEGUNDA FILA -tarea 93, 05-10-2026-. Solo en Grabar -conCamara-: la fila de hoy
// queda con Aa, Cámara, Posición, Brillo y una flecha al final. La flecha abre una segunda fila con
// Calidad, Subtítulos y Ajustes -Ajustes es la misma FichaMas, con su mismo manejador, que en Grabar
// ya no va en ningún otro lugar-. De pie la segunda fila aparece encima de la primera -abajo está
// Empezar-; de lado -teléfono y tableta- es una segunda columna al costado del riel. Leer no cambia.

// EL DOCK DE LISTO -ajustes de pantallas, 10-10-2026, boceto 5-. Solo en Grabar y con el teléfono
// de pie: las fichas van en la fila de arriba del dock de vidrio -DockListo.tsx-, en dos grupos con su
// rótulo -TEXTO: letra y anclaje; CÁMARA: cámara y brillo- y un filete fino entre grupos; al final,
// Ajustes solo con el engranaje, que abre el panel de Ajustes de la toma en el mismo dock -no la
// pantalla de Ajustes-. La flecha y la segunda fila se quitan a propósito ahí: Calidad y Subtítulos
// pasan al panel. En horizontal y en tableta, por ahora, solo cambia el orden de las fichas: letra,
// anclaje, cámara, brillo.

// Calidad aparece con la cámara y si la cámara dijo sus calidades: la misma condición en la segunda
// fila y en el panel de Ajustes de la toma.
export function hayCalidad(conCamara: boolean, calidadesSoportadas: string[]): boolean {
  return conCamara && calidadesSoportadas.length > 0
}

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
  horizontal = false,
  grandes = false,
  anchas = false,
  masAparte = false,
  gestosAlGrabar = false,
  setGestosAlGrabar,
  motivoSinGestos = null,
  modeloGestos = null,
  pidiendoGestos = false,
  avisoVoz = null,
  enDock = false,
  onAbrirAjustesToma
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
  // LA TABLETA -tarea 83, 30-09-2026-. grandes: las fichas de la hoja de tableta -44 de alto, letra
  // 15, radio 10-, con la clase grande del boceto. anchas: además a lo ancho del riel -tableta de
  // lado, la clase ancha-. masAparte: Más no va en el carril porque TeleprompterView la dibuja en
  // la barra de arriba -tableta vertical-. Los tamaños están en styles-tableta.css.
  grandes?: boolean
  anchas?: boolean
  masAparte?: boolean
  // CONTROL POR GESTOS -tarea 88, 04-10-2026, docs/tarea88.txt, 6.5-. El valor elegido y, si hoy no se
  // puede, por qué: 'soloFrontal' con la trasera, 'noDisponible' si el equipo no puede. Con motivo la
  // fila se ve deshabilitada y apagada, pero el valor elegido no se toca.
  gestosAlGrabar?: boolean
  setGestosAlGrabar?: (v: boolean) => void
  motivoSinGestos?: 'soloFrontal' | 'noDisponible' | null
  // -tarea 104, lámina c- El modelo de gestos a pedido: bajando -con su avance-, sin internet, rechazado
  // en el diálogo de Play o con error. pidiendoGestos: se encendió el interruptor y se está esperando el
  // modelo; mientras tanto el interruptor se ve encendido. Sin el modelo, gestosAlGrabar no se enciende.
  modeloGestos?: EstadoModeloGestos | null
  pidiendoGestos?: boolean
  // -tarea 104, lámina b- El aviso de la voz que falta, abajo, donde se abren los paneles de las
  // fichas. Lo arma App: solo al intentar leer sin la voz en el teléfono y sin internet -o si se dijo
  // que no al diálogo de Play-. Si se abre una ficha, su panel ocupa ese lugar.
  avisoVoz?: { texto: string; onReintentar: () => void } | null
  // -ajustes de pantallas, 10-10-2026- La fila de arriba del dock de LISTO: grupos con rótulo y Ajustes
  // solo con el engranaje, que llama a onAbrirAjustesToma -el panel en el mismo dock-.
  enDock?: boolean
  onAbrirAjustesToma?: () => void
}) {
  useTextos()
  // Las clases de tamaño que se suman a .ficha-listo -tarea 83-.
  const tam = `${grandes ? ' grande' : ''}${anchas ? ' ancha' : ''}`
  const carrilRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  // El top del panel en horizontal, en px de la fila -que en horizontal cubre el riel entero-.
  const [topPanelH, setTopPanelH] = useState<number | null>(null)
  // LA SEGUNDA FILA -tarea 93, 05-10-2026-: solo en Grabar. Cerrada al entrar a Listo; vive en este
  // componente, así que al arrastrar el recuadro -que lo desmonta- vuelve cerrada.
  // Antes -hasta 2026-10-10-: const conFlecha = conCamara
  // Ajustes de pantallas: en el dock -Grabar, teléfono de pie- la flecha y la segunda fila se quitan.
  const conFlecha = conCamara && !enDock
  const [segundaAbierta, setSegundaAbierta] = useState(false)
  const idSegunda = useId()

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
    // Antes -hasta 2026-10-05-: const ficha = carril.querySelector('[aria-expanded="true"]') as HTMLElement | null
    // Tarea 93, 05-10-2026: la flecha también dice aria-expanded y la ficha abierta puede estar en la
    // segunda fila; se busca la ficha con su panel abierto -clase abierta- en toda la fila.
    const ficha = fila.querySelector('.ficha-listo.abierta') as HTMLElement | null
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

  // Tarea 93: abrir o cerrar la segunda fila cierra el panel abierto -si era el de Calidad o
  // Subtítulos, su ficha se escondería y el panel quedaría colgando-.
  function alternarSegunda() {
    setPanelAbierto(null)
    setSegundaAbierta(!segundaAbierta)
  }

  const calidades = calidadesSoportadas.length > 0 ? calidadesSoportadas : ['1080p', '720p', '480p']
  // Antes -hasta 2026-10-10-: const mostrarCalidad = conCamara && calidadesSoportadas.length > 0
  const mostrarCalidad = hayCalidad(conCamara, calidadesSoportadas)
  // LOS SUBTITULOS, ANTES DE GRABAR -28-09-2026-. Javier: la seccion Video salio de Ajustes; los
  // subtitulos van en su ficha de Grabar. Es la MISMA clave que el reproductor -sigo_subtitulos_estilo-:
  // lo que se elige aca es con lo que abre la toma, y ahi se puede cambiar mirando el video.
  // -tomas-largas, 15-10-2026- OJO: el visor YA NO abre la toma con esta clave -cada toma parte en «No»,
  // decisión de Javier-. Aquí sigue siendo una preferencia que se muestra y se escribe, pero hoy no llega a
  // ninguna toma: queda a decisión de Javier quitarla o darle otro sentido.
  const [estiloSub, setEstiloSub] = useState<EstiloSubtitulo>(estiloSubtituloGuardado)
  const valorBrillo = brillo ?? brilloSistema ?? 0.5
  const idxLetra = PASOS_LETRA.indexOf(fontSize)
  const puedeMenos = idxLetra > 0 || (idxLetra < 0 && PASOS_LETRA.some((p) => p < fontSize))
  const puedeMas = (idxLetra >= 0 && idxLetra < PASOS_LETRA.length - 1) || (idxLetra < 0 && PASOS_LETRA.some((p) => p > fontSize))

  // LAS CUATRO FICHAS DE SIEMPRE -ajustes de pantallas, 10-10-2026-: armadas una vez y puestas en el
  // carril de hoy o en los grupos del dock. El marcado es el de antes, sin cambios.
  const fichaLetra = (
    <button
      type="button"
      className={`ficha-listo${tam}${panelAbierto === 'letra' ? ' abierta' : ''}`}
      data-testid="ficha-letra"
      aria-label={`${t('tamanoLetra')}, ${fontSize}`}
      aria-expanded={panelAbierto === 'letra'}
      onClick={() => toggle('letra')}
    >
      <span>Aa {fontSize}</span>
    </button>
  )
  const fichaAnclaje = (
    <button
      type="button"
      className={`ficha-listo${tam}${panelAbierto === 'anclaje' ? ' abierta' : ''}`}
      data-testid="ficha-anclaje"
      aria-label={`${t('dondeLees')}, ${etiquetaAnclaje(anclajeZona)}`}
      aria-expanded={panelAbierto === 'anclaje'}
      onClick={() => toggle('anclaje')}
    >
      <IconoFranja posicion={anclajeZona === 'medio' ? 'medio' : 'arriba'} tamano={16} />
      <span>{etiquetaAnclaje(anclajeZona)}</span>
    </button>
  )
  const fichaCamara = conCamara ? (
    <button
      type="button"
      className={`ficha-listo${tam}${panelAbierto === 'camara' ? ' abierta' : ''}`}
      data-testid="ficha-camara"
      aria-label={`${t('imagenCamara')}, ${etiquetaCamara(fondoToma)}`}
      aria-expanded={panelAbierto === 'camara'}
      onClick={() => toggle('camara')}
    >
      {fondoToma === 'recuadro' ? <IconoImagenRecuadro tamano={16} /> : fondoToma === 'oculta' ? <IconoImagenOculta tamano={16} /> : <IconoImagenDetras tamano={16} />}
      <span>{etiquetaCamara(fondoToma)}</span>
    </button>
  ) : null
  const fichaBrillo = (
    <button
      type="button"
      className={`ficha-listo${tam}${panelAbierto === 'brillo' ? ' abierta' : ''}`}
      data-testid="ficha-brillo"
      aria-label={`${t('brillo')}, ${etiquetaBrillo(brillo)}`}
      aria-expanded={panelAbierto === 'brillo'}
      onClick={() => toggle('brillo')}
    >
      <IconoSol tamano={16} />
      <span>{etiquetaBrillo(brillo)}</span>
    </button>
  )

  return (
    // El toque en una ficha o en su panel no sube al lienzo: el lienzo cierra el panel abierto al
    // tocar el texto, y con el toque subiendo, tocar "Arriba" con la letra abierta cerraba todo en
    // vez de abrir su panel -lo encontro T77b, 28-09-2026-.
    // Antes -hasta 2026-10-05-: <div className="fila-fichas-listo" data-testid="fila-fichas-listo" onClick={(e) => e.stopPropagation()}>
    // Tarea 93: con la segunda fila abierta la fila suma segunda-abierta -el panel se corre para no taparla-.
    <div
      className={`fila-fichas-listo${conFlecha && segundaAbierta ? ' segunda-abierta' : ''}`}
      data-testid="fila-fichas-listo"
      onClick={(e) => e.stopPropagation()}
    >
      {/* -tarea 104, lámina b- En el color normal del texto, no en rojo: el rojo queda para grabar y
          borrar -Javier-. No tapa la flecha, el renglón, las fichas ni Empezar. */}
      {!panelAbierto && avisoVoz && (
        <div className="panel-ficha tarjeta-elevada aviso-voz-listo" data-testid="aviso-voz-sin-conexion" role="status">
          <div className="aviso-voz-listo-texto">{avisoVoz.texto}</div>
          <div className="segmentado">
            <button
              type="button"
              className="segmentado-opcion"
              data-testid="btn-reintentar-voz"
              onClick={() => avisoVoz.onReintentar()}
            >
              <span>{t('reintentar')}</span>
            </button>
          </div>
        </div>
      )}
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
              {/* CONTROL POR GESTOS -tarea 88-, debajo de Voltear: todo lo de la cámara en un solo
                  lugar -Javier, 28-09-. El MISMO Interruptor de Ajustes. Con la trasera o un equipo
                  que no puede, el motivo va en lugar de la explicación. */}
              {conCamara && (
                <div
                  data-testid="fila-gestos"
                  data-motivo={motivoSinGestos || 'ninguno'}
                  className={`fila-gestos${motivoSinGestos ? ' deshabilitada' : ''}`}
                >
                  <div className="fila-gestos-texto">
                    <div className="fila-gestos-nombre">{t('controlPorGestos')}</div>
                    {/* -tarea 104, lámina c- Mientras baja el modelo, el avance con una barra fina; sin
                        internet -o si se dijo que no a Play-, el aviso en la misma fila, en el color normal.
                        Al terminar vuelve la explicación de siempre. */}
                    {!motivoSinGestos && modeloGestos && modeloGestos.estado === 'bajando' ? (
                      <div className="fila-gestos-explicacion" data-testid="gestos-preparando">
                        {t('preparandoGestos', { n: Math.round(modeloGestos.progreso * 100) })}
                        <div className="fila-gestos-pista">
                          <div className="fila-gestos-relleno" style={{ width: `${Math.round(modeloGestos.progreso * 100)}%` }} />
                        </div>
                      </div>
                    ) : !motivoSinGestos && modeloGestos && (modeloGestos.estado === 'sin-conexion' || modeloGestos.estado === 'rechazada') ? (
                      <div className="fila-gestos-explicacion" data-testid="gestos-sin-conexion" role="status">
                        {modeloGestos.estado === 'sin-conexion' ? t('gestosSinConexion') : t('gestosRechazados')}
                      </div>
                    ) : (
                    <div className="fila-gestos-explicacion">
                      {motivoSinGestos === 'soloFrontal'
                        ? t('gestosSoloFrontal')
                        : motivoSinGestos === 'noDisponible' || (modeloGestos && modeloGestos.estado === 'error')
                        ? t('gestosNoDisponible')
                        : t('controlPorGestosExplicacion')}
                    </div>
                    )}
                  </div>
                  {/* -tarea 104- Encendido también mientras se espera el modelo -pidiendoGestos-. Antes:
                      encendido={!motivoSinGestos && gestosAlGrabar} */}
                  <Interruptor
                    encendido={!motivoSinGestos && (gestosAlGrabar || pidiendoGestos)}
                    onCambiar={(v) => setGestosAlGrabar?.(v)}
                    etiqueta={t('controlPorGestos')}
                    testid="switch-gestos"
                    deshabilitado={!!motivoSinGestos}
                  />
                </div>
              )}
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

      {/* Antes -hasta 2026-10-10-: el carril llevaba las fichas escritas aquí, en el orden letra, cámara,
          anclaje, brillo. Ajustes de pantallas, 10-10-2026: el orden es letra, anclaje, cámara, brillo
          -TEXTO y CÁMARA del boceto 5- en todos los diseños; las fichas son las mismas, armadas arriba
          -fichaLetra, fichaAnclaje, fichaCamara, fichaBrillo-. En el dock van en grupos con su rótulo. */}
      {enDock ? (
        <div className="carril-fichas carril-dock" ref={carrilRef}>
          <div className="grupo-fichas" role="group" aria-label={t('rotuloGrupoTexto')}>
            <span className="rotulo-grupo-fichas" aria-hidden="true">{t('rotuloGrupoTexto')}</span>
            <div className="grupo-fichas-fila">
              {fichaLetra}
              {fichaAnclaje}
            </div>
          </div>
          <span className="filete-grupos-fichas" aria-hidden="true" />
          {conCamara && (
            <>
              <div className="grupo-fichas" role="group" aria-label={t('rotuloGrupoCamara')}>
                <span className="rotulo-grupo-fichas" aria-hidden="true">{t('rotuloGrupoCamara')}</span>
                <div className="grupo-fichas-fila">
                  {fichaCamara}
                  {fichaBrillo}
                </div>
              </div>
              <span className="filete-grupos-fichas" aria-hidden="true" />
            </>
          )}
          {/* -cuarta vuelta, 10-10-2026- En Leer el dock lleva PANTALLA con el brillo -sin cámara no hay
              imagen-, y después el engranaje, que reemplaza a la ficha Más. */}
          {!conCamara && (
            <>
              <div className="grupo-fichas" role="group" aria-label={t('seccionPantalla')}>
                <span className="rotulo-grupo-fichas" aria-hidden="true">{t('seccionPantalla')}</span>
                <div className="grupo-fichas-fila">
                  {fichaBrillo}
                </div>
              </div>
              <span className="filete-grupos-fichas" aria-hidden="true" />
            </>
          )}
          {/* Ajustes, solo el engranaje -el ícono de Sigo para Ajustes-. Abre el panel en el mismo dock. */}
          <button
            type="button"
            className="ficha-listo ficha-ajustes-dock"
            data-testid="btn-ajustes-toma"
            aria-label={t('tituloAjustes')}
            onClick={(e) => {
              e.stopPropagation()
              setPanelAbierto(null)
              onAbrirAjustesToma?.()
            }}
          >
            <IconoEngranaje tamano={16} />
          </button>
        </div>
      ) : (
      <div className="carril-fichas" ref={carrilRef}>
        {/* -tarea 106, lamina 4- De lado: la ficha del modo, compacta, primera en el riel, antes de Aa.
            Tambien en Grabar -decision de Javier, 14-10-2026-, y con el tamano de las demas -tam-.
            Antes: {!conCamara && <FichaModoLectura variante="compacta" />} */}
        <FichaModoLectura variante="compacta" tam={tam} />
        {fichaLetra}
        {fichaAnclaje}
        {fichaCamara}
        {fichaBrillo}

        {/* Antes -hasta 2026-10-05-: Calidad y Subtítulos iban aquí, en la primera fila. La tarea 93
            las pasa a la segunda fila -mismo marcado, ahora en fichaCalidad y fichaSubtitulos-:
            {mostrarCalidad && (
              <button type="button" className={`ficha-listo${tam}${panelAbierto === 'calidad' ? ' abierta' : ''}`}
                data-testid="ficha-calidad" aria-label={`${t('calidadVideo')}, ${calidadVideo}`}
                aria-expanded={panelAbierto === 'calidad'} onClick={() => toggle('calidad')}>
                <span>{calidadVideo}</span>
              </button>
            )}
            {conCamara && (
              <button type="button" className={`ficha-listo${tam}${panelAbierto === 'subtitulos' ? ' abierta' : ''}`}
                data-testid="ficha-subtitulos" aria-label={`${t('subtitulos')}, ${t(CLAVE_SUBTITULO[estiloSub])}`}
                aria-expanded={panelAbierto === 'subtitulos'} onClick={() => toggle('subtitulos')}>
                <IconoSubtitulos tamano={16} />
                <span>{t(CLAVE_SUBTITULO[estiloSub])}</span>
              </button>
            )} */}

        {/* 29-09-2026, tarea 82: en horizontal Más no va en el carril -una sola ficha-mas en
            pantalla-; la dibuja TeleprompterView arriba del riel derecho. */}
        {/* 30-09-2026, tarea 83: en la tableta vertical tampoco -va en la barra de arriba-. */}
        {/* Antes -hasta 2026-10-05-: {!horizontal && !masAparte && <FichaMas setPanelAbierto={setPanelAbierto} onAbrirAjustes={onAbrirAjustes} grande={grandes} />} */}
        {/* 05-10-2026, tarea 93: en Grabar Más tampoco va acá -Ajustes, en la segunda fila, la reemplaza-. */}
        {!horizontal && !masAparte && !conFlecha && <FichaMas setPanelAbierto={setPanelAbierto} onAbrirAjustes={onAbrirAjustes} grande={grandes} />}

        {/* LA FLECHA -tarea 93, 05-10-2026-. Un solo chevron que gira 180° al abrir: ˅ cerrada, ˄
            abierta. Para TalkBack dice «Más opciones» o «Menos opciones», con aria-expanded. */}
        {conFlecha && (
          <button
            type="button"
            className={`ficha-listo ficha-flecha${tam}`}
            data-testid="ficha-flecha"
            aria-label={segundaAbierta ? t('menosOpciones') : t('masOpciones')}
            aria-expanded={segundaAbierta}
            aria-controls={idSegunda}
            onClick={alternarSegunda}
          >
            {/* El giro va en el dibujo, en línea, como el «Ver todos» de BibliotecaView -MS_CHICO,
                CURVA_RESORTE-, y sin movimiento si el sistema lo pide. */}
            <IconoChevron
              tamano={16}
              className="flecha-ficha"
              style={{
                transform: segundaAbierta ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: movimientoApagado() ? 'none' : `transform ${MS_CHICO}ms ${CURVA_RESORTE}`
              }}
            />
          </button>
        )}
      </div>
      )}

      {/* LA SEGUNDA FILA -tarea 93-. Calidad -si la cámara dice sus calidades-, Subtítulos y Ajustes.
          De pie se dibuja encima de la primera; de lado, como columna al costado del riel. */}
      {conFlecha && segundaAbierta && (
        <div
          className={`carril-fichas segunda-fila-fichas${horizontal ? ' al-costado' : ''}`}
          data-testid="segunda-fila-fichas"
          id={idSegunda}
          // La aparición: resorte de 240 ms -opacidad y un leve desplazamiento, keyframes en
          // styles-ajustes.css-; con movimientoApagado() aparece de una.
          style={movimientoApagado()
            ? { animation: 'none' }
            : { animation: `${horizontal ? 'aparece-segunda-columna' : 'aparece-segunda-fila'} ${MS_SEGUNDA_FILA}ms ${CURVA_RESORTE} both` }}
        >
          {mostrarCalidad && (
            <button
              type="button"
              className={`ficha-listo${tam}${panelAbierto === 'calidad' ? ' abierta' : ''}`}
              data-testid="ficha-calidad"
              aria-label={`${t('calidadVideo')}, ${calidadVideo}`}
              aria-expanded={panelAbierto === 'calidad'}
              onClick={() => toggle('calidad')}
            >
              <span>{calidadVideo}</span>
            </button>
          )}
          <button
            type="button"
            className={`ficha-listo${tam}${panelAbierto === 'subtitulos' ? ' abierta' : ''}`}
            data-testid="ficha-subtitulos"
            aria-label={`${t('subtitulos')}, ${t(CLAVE_SUBTITULO[estiloSub])}`}
            aria-expanded={panelAbierto === 'subtitulos'}
            onClick={() => toggle('subtitulos')}
          >
            <IconoSubtitulos tamano={16} />
            <span>{t(CLAVE_SUBTITULO[estiloSub])}</span>
          </button>
          <FichaMas setPanelAbierto={setPanelAbierto} onAbrirAjustes={onAbrirAjustes} grande={grandes} ancha={anchas} comoAjustes />
        </div>
      )}
    </div>
  )
}

// LA FICHA MÁS, APARTE -tarea 82, 29-09-2026-. Era el último botón del carril. En el teléfono de
// lado va arriba del riel derecho, en Leer Y en Grabar -decisión de Javier: el mismo lugar en los
// dos modos-, y por eso es un componente: el mismo botón, con su testid, en uno u otro lugar.
// AJUSTES, EN LA SEGUNDA FILA DE GRABAR -tarea 93, 05-10-2026-: el mismo componente con comoAjustes.
// Mismo manejador -cierra el panel y abre la pantalla de Ajustes-; cambian la palabra y el testid
// -ficha-ajustes-. ancha: la clase de la tableta de lado, como el resto de las fichas del riel.
export function FichaMas({
  setPanelAbierto,
  onAbrirAjustes,
  grande = false,
  ancha = false,
  comoAjustes = false
}: {
  setPanelAbierto: (p: PanelFicha) => void
  onAbrirAjustes?: () => void
  // La ficha grande de la tableta -tarea 83, 30-09-2026-.
  grande?: boolean
  ancha?: boolean
  comoAjustes?: boolean
}) {
  useTextos()
  const palabra = comoAjustes ? t('tituloAjustes') : t('fichaMas')
  return (
    <button
      type="button"
      // Antes -hasta 2026-10-05-: className={`ficha-listo${grande ? ' grande' : ''}`}
      className={`ficha-listo${grande ? ' grande' : ''}${ancha ? ' ancha' : ''}`}
      // Antes -hasta 2026-10-05-: data-testid="ficha-mas"
      data-testid={comoAjustes ? 'ficha-ajustes' : 'ficha-mas'}
      data-alias-engranaje="btn-engranaje-toma"
      // Antes -hasta 2026-10-05-: aria-label={t('fichaMas')}
      aria-label={palabra}
      onClick={(e) => {
        // En el riel derecho no hay fila que corte el toque: sin esto subiría al lienzo.
        e.stopPropagation()
        setPanelAbierto(null)
        onAbrirAjustes?.()
      }}
    >
      <IconoEngranaje tamano={16} />
      {/* Antes -hasta 2026-10-05-: <span>{t('fichaMas')}</span> */}
      <span>{palabra}</span>
    </button>
  )
}
