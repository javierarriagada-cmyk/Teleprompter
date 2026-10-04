import React from 'react'
import { hapticaSeleccion } from '../haptica'
import { ESTILOS_SUBTITULO, EstiloSubtitulo, Subtitulo, subtituloEn } from '../lib/subtitulos'
import { t, useTextos, ClaveTexto } from '../textos'
import { IconoSubtitulos } from './IconosApp'
import { MARGEN_ABAJO_NORMAL } from '../lib/posicionSubtitulos'

// LOS SUBTITULOS EN EL VISOR DE LA TOMA -24-09-2026-.
//
// Se eligen aca y no en los ajustes de lectura porque no cambian nada de leer:
// son una decision sobre el video terminado, y aca se ve su efecto sobre la
// propia toma. Javier eligio el lugar y la forma: UN boton que se despliega
// en el visor -"ya tenemos unos ajustes llenos de Aa"-, cuatro opciones, y se
// cierra solo al elegir. Ver teleprom/00-arquitectura/
// subtitulos-lo-que-ensena-filostudio.txt, punto 2d.

// El rectangulo donde de verdad se ve la imagen dentro del <video>: el video
// se ajusta sin recortar -object-fit contain- y deja franjas si la proporcion
// no coincide. El subtitulo se mide contra la imagen, no contra el elemento,
// para que tenga el mismo tamano relativo que tendra quemado en el archivo.
function rectDeLaImagen(v: HTMLVideoElement): { x: number; y: number; w: number; h: number } | null {
  const ew = v.clientWidth
  const eh = v.clientHeight
  const vw = v.videoWidth
  const vh = v.videoHeight
  if (!ew || !eh || !vw || !vh) return null
  const escala = Math.min(ew / vw, eh / vh)
  const w = vw * escala
  const h = vh * escala
  return { x: (ew - w) / 2, y: (eh - h) / 2, w, h }
}

export function CapaSubtitulos({
  video,
  subtitulos,
  estilo,
  margenAbajo = MARGEN_ABAJO_NORMAL
}: {
  video: HTMLVideoElement | null
  subtitulos: Subtitulo[]
  estilo: EstiloSubtitulo
  // -tarea 87, parte D, 04-10-2026- A qué altura va el subtítulo, como fracción del alto de la
  // imagen desde abajo: 0,125 en "Normal" -lo de siempre- y 0,35 en "Para redes"
  // -lib/posicionSubtitulos.ts-. Sin la prop, como antes.
  margenAbajo?: number
}) {
  const [ms, setMs] = React.useState(0)
  const [rect, setRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)

  React.useEffect(() => {
    if (!video) return
    const medir = () => setRect(rectDeLaImagen(video))
    medir()
    video.addEventListener('loadedmetadata', medir)
    let obs: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      obs = new ResizeObserver(medir)
      obs.observe(video)
    }
    return () => {
      video.removeEventListener('loadedmetadata', medir)
      obs?.disconnect()
    }
  }, [video])

  // El karaoke necesita la hora del video mas seguido que timeupdate -unas
  // cuatro veces por segundo-: mientras reproduce, se lee en cada cuadro.
  React.useEffect(() => {
    if (!video || estilo === 'no') return
    let id = 0
    const leer = () => setMs(video.currentTime * 1000)
    const bucle = () => {
      leer()
      if (!video.paused && !video.ended) id = requestAnimationFrame(bucle)
    }
    const alReproducir = () => { cancelAnimationFrame(id); id = requestAnimationFrame(bucle) }
    video.addEventListener('play', alReproducir)
    video.addEventListener('seeked', leer)
    video.addEventListener('timeupdate', leer)
    leer()
    if (!video.paused) alReproducir()
    return () => {
      cancelAnimationFrame(id)
      video.removeEventListener('play', alReproducir)
      video.removeEventListener('seeked', leer)
      video.removeEventListener('timeupdate', leer)
    }
  }, [video, estilo])

  if (estilo === 'no' || !rect) return null
  const s = subtituloEn(subtitulos, ms)
  if (!s) return null

  return (
    <div
      className="capa-subtitulos"
      data-testid="capa-subtitulos"
      data-estilo={estilo}
      aria-hidden="true"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        // La letra es una proporcion del alto de la imagen, igual que tendra
        // quemada: 1/32 del alto, la del prototipo que Javier aprobo -40 sobre
        // 1280-.
        fontSize: rect.h / 32
      }}
    >
      {/* -tarea 87, parte D- El margen sale de la prop. Antes: marginBottom: rect.h * 0.125. */}
      <div className="subtitulo" style={{ marginBottom: rect.h * margenAbajo }}>
        {s.renglones.map((r, i) => (
          <div key={i} className="subtitulo-renglon">
            {r.map((w, j) => {
              const estado = ms >= w.hastaMs ? 'dicha' : ms >= w.desdeMs ? 'diciendose' : 'por-decir'
              return (
                <React.Fragment key={j}>
                  {j > 0 ? ' ' : ''}
                  <span className="subtitulo-palabra" data-estado={estado}>{w.texto}</span>
                </React.Fragment>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// La muestra de cada opcion: su "Aa" dibujado como se vera el subtitulo, como
// las parejas del cajon Aa. Se reconoce sin leer el nombre.
function Muestra({ estilo }: { estilo: EstiloSubtitulo }) {
  return (
    <span className="muestra-subtitulo" data-estilo={estilo}>
      <span data-estado="dicha">A</span><span data-estado={estilo === 'no' ? 'dicha' : 'por-decir'}>a</span>
    </span>
  )
}

// Los nombres de los estilos, por idioma. ESTILOS_SUBTITULO -lib/subtitulos.ts- sigue siendo
// la lista de estilos y el orden; su campo nombre es el espanol de siempre y no se toca desde
// aca -subtitulos.ts lo trabaja Claude en el telefono-. Lo que se muestra sale de t().
const CLAVE_ESTILO: Record<EstiloSubtitulo, ClaveTexto> = {
  no: 'subtitulosNo',
  amarillo: 'subtitulosAmarillo',
  rojo: 'subtitulosRojo',
  formal: 'subtitulosFormal'
}
function nombreDeEstilo(estilo: EstiloSubtitulo): string {
  const clave = CLAVE_ESTILO[estilo]
  return clave ? t(clave) : estilo
}

// -tarea 87, A4, 04-10-2026- Cuatro props opcionales; sin ellas queda EXACTAMENTE como antes:
//   extra: lo que va dentro del panel, debajo de los cuatro estilos -SelectorPosicion-;
//   resumen: lo que se suma a lo elegido en la píldora -«Amarillo · Para redes»-;
//   abierto y onAbrir: el visor sabe si el panel está abierto -esconde el nombre de la toma para
//   que el video gane alto- y lo maneja él;
//   desactivado: mientras se guarda, la ficha no se abre -respuesta de Claude del 04-10-.
export function SelectorSubtitulos({
  estilo,
  onCambiar,
  extra,
  resumen,
  abierto: abiertoDeAfuera,
  onAbrir,
  desactivado
}: {
  estilo: EstiloSubtitulo
  onCambiar: (e: EstiloSubtitulo) => void
  extra?: React.ReactNode
  resumen?: string
  abierto?: boolean
  onAbrir?: (abierto: boolean) => void
  desactivado?: boolean
}) {
  useTextos()
  const [abiertoPropio, setAbiertoPropio] = React.useState(false)
  const abierto = abiertoDeAfuera ?? abiertoPropio
  const setAbierto = (a: boolean | ((previo: boolean) => boolean)) => {
    const nuevo = typeof a === 'function' ? a(abierto) : a
    setAbiertoPropio(nuevo)
    onAbrir?.(nuevo)
  }
  const nombre = nombreDeEstilo(estilo) + (resumen ? ` · ${resumen}` : '')
  return (
    <div className="selector-subtitulos">
      <button
        type="button"
        data-testid="btn-subtitulos"
        aria-expanded={abierto}
        disabled={desactivado}
        className={`btn-deformable boton-subtitulos${estilo !== 'no' ? ' con-subtitulos' : ''}`}
        onClick={() => setAbierto((a) => !a)}
      >
        {/* El CC delante de la palabra -28-09-2026-: el simbolo que todo el mundo reconoce. */}
        <IconoSubtitulos tamano={20} />
        <span className="boton-subtitulos-nombre">{t('subtitulos')}</span>
        <span className="boton-subtitulos-valor">{nombre}</span>
        <svg className="boton-subtitulos-flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {abierto && (
        <div className="opciones-subtitulos" role="group" aria-label={t('subtitulos')} data-testid="opciones-subtitulos">
          {ESTILOS_SUBTITULO.map((e) => (
            <button
              key={e.valor}
              type="button"
              aria-pressed={estilo === e.valor}
              aria-label={nombreDeEstilo(e.valor)}
              title={nombreDeEstilo(e.valor)}
              className={`btn-deformable opcion-subtitulos${estilo === e.valor ? ' activa' : ''}`}
              onClick={() => {
                hapticaSeleccion()
                onCambiar(e.valor)
                setAbierto(false)
              }}
            >
              <Muestra estilo={e.valor} />
              <span className="opcion-subtitulos-nombre">{nombreDeEstilo(e.valor)}</span>
            </button>
          ))}
        </div>
      )}
      {abierto && extra}
    </div>
  )
}
