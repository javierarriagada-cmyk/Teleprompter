import React from 'react'
import { hapticaSeleccion } from '../haptica'
import { TONOS, TonoFiltro, matrizDeTono, valoresFeColorMatrix, idFiltroSvg, filtroCss } from '../lib/filtros'
import { t, useTextos } from '../textos'
import { IconoFiltro } from './IconosApp'
import { srcDeRuta } from './TiraGrabaciones'
import { extraerMiniatura } from '../lib/archivosNativos'
import { destinoDelCuadro, elegirCuadro, msDelCuadro } from '../lib/miniaturaFiltro'

// EL FILTRO DE LA TOMA, EN EL VISOR -tarea 96, 05-10-2026, plan 3, fase 1-. Solo en una toma que no
// está guardada: la guardada se ve desde la galería ya filtrada y el visor no le pone nada encima.
//
// LA IMAGEN MODELO, aprobada por Javier: los filtros del editor de otra aplicación de fotos -el nombre
// vive fuera del repositorio, docs/lo-que-hay-que-saber.txt-. Un control "Filtro"
// con el mismo aspecto que el de Subtítulos -SubtitulosVisor.tsx- dice el filtro elegido; al tocarlo
// sale una TIRA HORIZONTAL DE MINIATURAS del cuadro actual de la toma, cada una ya con su filtro y el
// nombre debajo; la elegida, con un borde claro. Tocar una cambia el video al tiro, reproduciendo o
// detenido, y la tira queda abierta para comparar: se cierra con el mismo control.
// LO QUE YA SE RECHAZÓ Y NO VUELVE: cuadros con "Aa" o con letras dentro, listas de botones de solo
// texto, desplegables de texto.
//
// LAS MINIATURAS -segunda vuelta, 05-10-2026-: el cuadro lo pide extraerMiniatura, en currentTime,
// y se muestra seis veces con filter: url(#...) y la misma matriz. La ruta pasa por srcDeRuta.
// Mientras llega, el marco usa el fondo de la tira. Si el nativo falla, queda el poster.
// Antes: al abrir la tira se dibuja UNA vez el cuadro actual del <video> -recortado al centro-
// en seis canvas, y cada canvas lleva su filter: url(#...) con la MISMA matriz que el video y que el
// archivo -FiltrosSvg, abajo-. No se leen píxeles -no hay getImageData ni toDataURL-: un canvas
// "manchado" por otro origen igual se puede mostrar. Sin cuadro todavía -el video sin cargar-, la
// miniatura de la toma -poster-; sin ninguna de las dos, el fondo oscuro de la tira.
// En el WebView de Android ese canvas salía negro.

// LOS FILTROS SVG del visor: uno por tono, salvo Natural, que va sin filtro. color-interpolation-filters
// = sRGB: la matriz opera sobre los valores con gamma, como Media3 con WORKING_COLOR_SPACE_DEFAULT
// -lib/filtros.ts, matrizParaMedia3-. Medido en el moto g86 por Claude el 05-10-2026: sobre el <video>
// del WebView se ve, detenido y reproduciendo.
export function FiltrosSvg() {
  return (
    <svg className="filtros-svg" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        {TONOS.filter((x) => x.valor !== 'natural').map((x) => (
          <filter key={x.valor} id={idFiltroSvg(x.valor)} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={valoresFeColorMatrix(matrizDeTono(x.valor))} />
          </filter>
        ))}
      </defs>
    </svg>
  )
}

export function nombreDeTono(tono: TonoFiltro): string {
  const x = TONOS.find((e) => e.valor === tono)
  return x ? t(x.clave) : tono
}

// Antes: el cuadro se leía del <video> con canvas. En el WebView salía negro.
// jsdom no tiene canvas -lib/medirTexto.ts hace lo mismo-: ahí la tira sale sin imagen.
function contexto(c: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!c) return null
  try {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null
    return c.getContext('2d')
  } catch {
    return null
  }
}

// Dibuja la fuente recortada al centro, con la forma del canvas -cover-.
function dibujar(c: HTMLCanvasElement, fuente: CanvasImageSource, fw: number, fh: number) {
  const ctx = contexto(c)
  if (!ctx || !fw || !fh) return
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  const w = Math.max(1, Math.round((c.clientWidth || 54) * dpr))
  const h = Math.max(1, Math.round((c.clientHeight || 68) * dpr))
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  const escala = Math.max(w / fw, h / fh)
  const sw = w / escala
  const sh = h / escala
  try {
    ctx.drawImage(fuente, (fw - sw) / 2, (fh - sh) / 2, sw, sh, 0, 0, w, h)
  } catch {
    // sin cuadro, la miniatura queda con el fondo de la tira
  }
}

export function SelectorFiltro({
  tono,
  onCambiar,
  video,
  ruta,
  poster,
  abierto,
  onAbrir,
  desactivado
}: {
  tono: TonoFiltro
  onCambiar: (t: TonoFiltro) => void
  // El <video> del visor: solo para saber currentTime. El cuadro no se lee de acá.
  video: HTMLVideoElement | null
  // La toma, para pedir el cuadro al nativo. El destino es el mismo archivo cada vez.
  ruta?: string
  // La miniatura que la toma ya tiene, si el nativo falla.
  poster?: string
  abierto: boolean
  onAbrir: (abierto: boolean) => void
  desactivado?: boolean
}) {
  useTextos()
  const [cuadro, setCuadro] = React.useState('')
  const tiraRef = React.useRef<HTMLDivElement | null>(null)

  // Cada vez que se abre: un cuadro, en la posición actual. Seis imágenes, la misma.
  React.useEffect(() => {
    if (!abierto) return
    let vigente = true
    setCuadro('')
    const activa = tiraRef.current?.querySelector('button[aria-pressed="true"]') as HTMLElement | null
    try { activa?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }) } catch { /* sin desplazar no pasa nada */ }
    const pedir = async () => {
      let nativa = ''
      if (ruta) {
        try {
          const sacada = await extraerMiniatura(ruta, destinoDelCuadro(ruta), msDelCuadro(video?.currentTime || 0))
          nativa = sacada
        } catch {
          nativa = ''
        }
      }
      if (!vigente) return
      const elegida = elegirCuadro(nativa, poster)
      setCuadro(elegida ? srcDeRuta(elegida) + (nativa ? `?t=${Date.now()}` : '') : '')
    }
    void pedir()
    return () => { vigente = false }
  }, [abierto, ruta, video, poster])

  const nombre = nombreDeTono(tono)
  return (
    <div className="selector-subtitulos selector-filtro">
      {/* Los filtros SVG viven aquí: el selector está siempre que el video lleva filtro -toma sin
          guardar-, de pie y de lado. Fuera de flujo -position absolute-: no ocupa lugar. */}
      <FiltrosSvg />
      {/* El mismo control que Subtítulos -clases boton-subtitulos-, con los tres círculos del filtro. */}
      <button
        type="button"
        data-testid="btn-filtro"
        aria-expanded={abierto}
        disabled={desactivado}
        className={`btn-deformable boton-subtitulos boton-filtro${tono !== 'natural' ? ' con-filtro' : ''}`}
        onClick={() => onAbrir(!abierto)}
      >
        <IconoFiltro tamano={20} />
        <span className="boton-subtitulos-nombre">{t('filtro')}</span>
        <span className="boton-subtitulos-valor" data-rotulo="filtro">{nombre}</span>
        <svg className="boton-subtitulos-flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {abierto && (
        <div className="tira-filtros" role="group" aria-label={t('filtro')} data-testid="tira-filtros" ref={tiraRef}>
          {TONOS.map((x) => (
            <button
              key={x.valor}
              type="button"
              data-testid={`filtro-${x.valor}`}
              aria-pressed={tono === x.valor}
              aria-label={t(x.clave)}
              className={`miniatura-filtro${tono === x.valor ? ' activa' : ''}`}
              disabled={desactivado}
              onClick={() => {
                if (tono === x.valor) return
                hapticaSeleccion()
                onCambiar(x.valor)
              }}
            >
              <span className="miniatura-filtro-marco">
                {cuadro && (
                  <img
                    src={cuadro}
                    alt=""
                    className="miniatura-filtro-imagen"
                    aria-hidden="true"
                    style={{ filter: filtroCss(x.valor) }}
                  />
                )}
              </span>
              <span className="miniatura-filtro-nombre">{t(x.clave)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
