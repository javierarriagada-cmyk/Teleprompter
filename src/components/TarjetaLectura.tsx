import React from 'react'
import { ResumenGuion, PAREJAS_COLOR } from '../datos/modelo'
import { movimientoApagado } from './movimiento'
import { estiloComprimirPorAviso, useMantenerApretado } from './mantenerApretado'

interface TarjetaLecturaProps {
  guionResumen?: ResumenGuion
  textoCompleto?: string
  esInicial?: boolean
  onLeer: (rect?: DOMRect) => void
  onGrabar?: (rect?: DOMRect) => void
  onCrearNuevo: () => void
  onDiagTouchStart?: () => void
  onDiagTouchEnd?: () => void
  onDiagClick?: () => void
  tipoFuente?: 'sans' | 'serif'
  colorFondo?: string
  colorLetra?: string
}

function formatearDuracion(palabras: number): string {
  const totalSegundos = Math.round((palabras / 150) * 60)
  const mins = Math.floor(totalSegundos / 60)
  const segs = totalSegundos % 60
  const mStr = String(mins).padStart(2, '0')
  const sStr = String(segs).padStart(2, '0')
  return `${mStr}:${sStr}`
}

export default function TarjetaLectura({
  guionResumen,
  textoCompleto,
  esInicial = false,
  onLeer,
  onGrabar,
  onCrearNuevo,
  onDiagTouchStart,
  onDiagTouchEnd,
  onDiagClick,
  tipoFuente = 'sans',
  colorFondo = PAREJAS_COLOR[0].fondo,
  colorLetra = PAREJAS_COLOR[0].letra
}: TarjetaLecturaProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const parejaColor = { fondo: colorFondo, letra: colorLetra }
  const hayGuion = Boolean(guionResumen)

  // DOS PUERTAS VISIBLES, igual que al pie del editor. Mantener apretado
  // sobre ▶ Leer sigue siendo el atajo a grabar, no la unica forma de llegar.
  // El evento se queda en el boton: si sube a la tarjeta o a una fila,
  // Javier mantiene para grabar y se le abre el menu de borrar.
  const gestoLeer = useMantenerApretado({
    onMantener: () => {
      const rect = cardRef.current?.getBoundingClientRect()
      if (onGrabar) onGrabar(rect)
    }
  })

  const palabras = guionResumen?.palabras || 0
  const timecode = formatearDuracion(palabras)
  const tituloText = hayGuion
    ? guionResumen?.titulo && guionResumen.titulo.trim()
      ? guionResumen.titulo
      : 'Sin título'
    // "Sin guiones todavía" no entra a 44 px y se cortaba en "Sin guiones to...".
    // El titulo de la portada es de una sola linea a proposito; entonces el texto se
    // ajusta al sitio que hay, no al reves.
    : 'Sin guiones'

  const lineasTexto = textoCompleto
    ? textoCompleto.split('\n').filter((l) => l.trim().length > 0)
    : []

  const animacionTextoStyle: React.CSSProperties =
    esInicial && !movimientoApagado() && hayGuion
      ? {
          animation: 'avanceTextoTarjeta 6s linear forwards'
        }
      : hayGuion && !movimientoApagado()
      ? {
          transform: 'translateY(-30px)'
        }
      : {}

  const fuentefamily = tipoFuente === 'serif' ? '"Source Serif 4", serif' : '"Source Sans 3", sans-serif'

  return (
    <div
      ref={cardRef}
      data-testid="tarjeta-lectura-portada"
      className="tarjeta-lectura-borde-iluminado"
      style={{
        backgroundColor: parejaColor.fondo,
        borderRadius: 'var(--redondeo-grande)',
        padding: 'var(--aire-4)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 340,
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: parejaColor.letra
      }}
    >
      {/* EL RINCON DE ARRIBA A LA DERECHA NO ES NUESTRO, ES DEL SISTEMA.
          Ahi Android pone su reloj y el icono del clima. El timecode estaba
          exactamente debajo: dos lecturas chicas y grises en la misma esquina,
          que se leen como una sola cosa. Javier, el 21 de septiembre de 2026:
          "arriba queda un simbolo de un sol con la hora juntos".
          No era falta de aire -la portada ya descuenta el area segura- sino
          dos relojes en el mismo rincon. Y el nuestro no es una hora del dia:
          es cuanto dura el guion, asi que su lugar es al lado del titulo. */}
      <div style={{ height: 24, zIndex: 5 }} />

      {/* Zona Central: Simulación de Pantalla de Lectura */}
      <div
        style={{
          position: 'relative',
          height: 140,
          margin: 'var(--aire-2) 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Velo Superior e Inferior */}
        <div className="tarjeta-lectura-velo-superior" />
        <div className="tarjeta-lectura-velo-inferior" />

        {/* Bloque de Texto de Lectura */}
        {hayGuion ? (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0 var(--aire-2)',
              fontSize: 18,
              lineHeight: 1.4,
              fontFamily: fuentefamily,
              color: parejaColor.letra,
              ...animacionTextoStyle
            }}
          >
            {lineasTexto.slice(0, 8).map((linea, idx) => (
              <div key={idx} style={{ marginBottom: 4, opacity: idx >= 1 && idx <= 2 ? 1 : 0.45 }}>
                {linea}
              </div>
            ))}
          </div>
        ) : (
          /* ESTADO VACIO: LA MARCA, QUIETA. Parte 5.2 de la tarea 50.
           *
           * Reemplaza al cursor parpadeante que puso la tarea 48. El cursor decia
           * "escribi aca", que es lo que dice cualquier bloc de notas; la marca dice
           * de quien es la aplicacion. Y es la regla que la tarea 48 dejo escrita:
           * UNA SOLA CLASE DE OBJETO EN LA PORTADA, llena o vacia. El estado vacio no
           * trae un mundo nuevo -un icono, una ilustracion, una familia distinta-
           * justo en el momento de menos informacion.
           *
           * Son los mismos cinco renglones del icono y del arranque, con la misma
           * jerarquia: los dos del medio son la ventana. Quietos y al 40%: es una
           * marca de agua, no un adorno que late. El punto rojo NO va: el punto es el
           * tally, y aca no se esta grabando nada. */
          <div
            data-testid="marca-tarjeta-vacia"
            aria-hidden="true"
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0 var(--aire-2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-1)',
              height: '100%',
              opacity: 0.4
            }}
          >
            {[96, 74, 96, 62, 86].map((ancho, idx) => (
              <span
                key={idx}
                style={{
                  display: 'block',
                  width: ancho,
                  height: 6,
                  borderRadius: 'var(--redondeo-pildora)',
                  alignSelf: 'flex-start',
                  backgroundColor: parejaColor.letra,
                  opacity: idx === 1 || idx === 2 ? 1 : 0.55
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Zona Inferior: Título de 44px y Botón de Acción */}
      <div style={{ zIndex: 5, display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
        {hayGuion && (
          <span
            data-testid="time-code-tarjeta"
            style={{
              fontFamily: 'monospace',
              fontSize: 'var(--texto-meta)',
              opacity: 0.7,
              letterSpacing: '0.05em',
              color: parejaColor.letra
            }}
          >
            {timecode}
          </span>
        )}
        <h2
          data-testid="titulo-tarjeta-lectura"
          onTouchStart={onDiagTouchStart}
          onTouchEnd={onDiagTouchEnd}
          onMouseDown={onDiagTouchStart}
          onMouseUp={onDiagTouchEnd}
          onClick={onDiagClick}
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.1,
            color: hayGuion ? parejaColor.letra : 'var(--color-apagado)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          title={tituloText}
        >
          {tituloText}
        </h2>

        {hayGuion ? (
          <div style={{ display: 'flex', gap: 'var(--aire-2)', width: '100%' }}>
          <button
            type="button"
            data-testid="btn-leer-tarjeta"
            {...gestoLeer.props}
            onClick={(e) => {
              e.stopPropagation()
              if (gestoLeer.fueLongPressRef.current) return
              const rect = cardRef.current?.getBoundingClientRect()
              onLeer(rect)
            }}
            className="btn-deformable"
            style={{
              flex: 1,
              padding: 'var(--aire-3) var(--aire-4)',
              backgroundColor: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              border: '1px solid var(--color-borde)',
              borderRadius: 'var(--redondeo-pildora)',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-2)',
              ...estiloComprimirPorAviso(gestoLeer.avisado)
            }}
          >
            ▶ Leer
          </button>
          <button
            type="button"
            data-testid="btn-grabar-tarjeta"
            className="btn-deformable btn-grabar-tarjeta-rojo"
            onClick={(e) => {
              e.stopPropagation()
              const rect = cardRef.current?.getBoundingClientRect()
              if (onGrabar) onGrabar(rect)
            }}
            style={{
              flex: 1,
              padding: 'var(--aire-3) var(--aire-4)',
              backgroundColor: 'var(--bg-superficie)',
              color: 'var(--color-texto)',
              border: '1px solid var(--color-borde)',
              borderRadius: 'var(--redondeo-pildora)',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--aire-2)'
            }}
          >
            ● Grabar
          </button>
          </div>
        ) : (
          <button
            onClick={onCrearNuevo}
            className="btn-deformable"
            style={{
              width: '100%',
              padding: 'var(--aire-3) var(--aire-4)',
              backgroundColor: 'var(--color-acento)',
              color: 'var(--color-texto-acento)',
              border: 'none',
              fontSize: 'var(--texto-titulo)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Escribe tu primer guion
          </button>
        )}
      </div>
    </div>
  )
}
