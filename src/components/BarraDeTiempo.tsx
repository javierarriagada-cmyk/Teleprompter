import React, { useEffect, useState } from 'react'
import { MotorDeAvance } from '../lib/avance'

export interface BarraDeTiempoProps {
  motorAvance: MotorDeAvance | null
  totalTokens: number
  tInicioLecturaMs: number | null
  // En LISTO, antes de empezar: la barra se dibuja quieta con la duracion
  // estimada del guion. Ver el comentario de la vista previa, abajo.
  vistaPrevia?: boolean
}

// El mismo ritmo que usa el editor para decir "1 min", y el que usa esta
// barra mientras el motor todavia no midio el del que lee.
const PALABRAS_POR_MINUTO_ESTIMADAS = 150

function formatearTiempo(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  const mm = mins.toString().padStart(2, '0')
  const ss = secs.toString().padStart(2, '0')
  return `${mm}:${ss}`
}

// DONDE VIVE Y COMO SE VE. Tarea 72, 23-09-2026.
// Hasta la 72 esta barra se montaba DESPUES del lienzo, adentro de un
// contenedor fijo de 100dvh con overflow hidden, y el lienzo ya ocupaba
// los 100dvh: quedaba debajo del borde de la pantalla y nunca se vio.
// Ahora App la monta ADENTRO del lienzo y ella se ubica sola, arriba al
// centro, entre la esquina de volver y la del engranaje o la pausa. Es
// una pastilla con el mismo tratamiento translucido que los controles
// flotantes -tarea 70, seccion 11- porque se dibuja encima del video o
// del texto, y sin fondo no se leeria sobre una pared clara.
// El relleno de la barra es blanco y no rojo: el rojo se gana grabando, y
// esta barra tambien sale en Leer.
function Pastilla({
  texto,
  progresoPct,
  etiqueta,
  testid,
  conTestidsDeProgreso
}: {
  texto: string
  progresoPct: number
  etiqueta: string
  testid?: string
  conTestidsDeProgreso: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(12px + env(safe-area-inset-top, 0px))',
        left: 0,
        right: 0,
        zIndex: 12,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <div
        data-testid={testid}
        aria-label={etiqueta}
        style={{
          minWidth: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '6px 14px 8px',
          borderRadius: 'var(--redondeo-pildora)',
              backgroundColor: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: '#fff',
          fontSize: 'var(--texto-meta)',
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        <div>{texto}</div>
        <div
          data-testid={conTestidsDeProgreso ? 'barra-progreso-pista' : undefined}
          style={{
            width: '100%',
            height: 2,
            borderRadius: 'var(--redondeo-pildora)',
                backgroundColor: 'rgba(255,255,255,0.25)',
            overflow: 'hidden'
          }}
        >
          <div
            data-testid={conTestidsDeProgreso ? 'barra-progreso' : undefined}
            style={{
              width: `${progresoPct}%`,
              height: '100%',
                  backgroundColor: 'rgba(255,255,255,0.9)',
              transition: 'width 0.25s linear'
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function BarraDeTiempo({
  motorAvance,
  totalTokens,
  tInicioLecturaMs,
  vistaPrevia = false
}: BarraDeTiempoProps) {
  const [ahora, setAhora] = useState<number>(() => performance.now())

  useEffect(() => {
    if (!tInicioLecturaMs || totalTokens === 0 || !motorAvance) return

    const interval = setInterval(() => {
      setAhora(performance.now())
    }, 250)

    return () => clearInterval(interval)
  }, [tInicioLecturaMs, totalTokens, motorAvance])

  if (!tInicioLecturaMs || totalTokens === 0 || !motorAvance) {
    // "MOSTRAR TIEMPO" TIENE QUE VERSE AL TOCARLO. Tarea 72.
    // Antes de empezar no hay reloj, y la barra devolvia null: en el estado
    // listo el interruptor no cambiaba nada en pantalla. Regla de producto:
    // todo control muestra su efecto donde se toca. En vista previa se
    // dibuja quieta, 00:00 y la duracion estimada.
    // Lleva OTRA etiqueta y OTRO testid a proposito: no es el reloj de la
    // lectura. T83 cuida que ese reloj arranque con la lectura y no con el
    // boton, y el reloj sigue sin aparecer hasta que la lectura empieza.
    if (vistaPrevia && totalTokens > 0) {
      const totalSeg = totalTokens / (PALABRAS_POR_MINUTO_ESTIMADAS / 60)
      return (
        <Pastilla
          texto={`${formatearTiempo(0)} / ${formatearTiempo(totalSeg)}`}
          progresoPct={0}
          etiqueta="duración estimada del guion"
          testid="barra-tiempo-previa"
          conTestidsDeProgreso={false}
        />
      )
    }
    return null
  }

  const estado = motorAvance.estadoEn(ahora)

  const transcurridoSeg = (ahora - tInicioLecturaMs) / 1000
  const palabrasQueFaltan = Math.max(0, totalTokens - estado.posicion)
  const ppm = estado.ppmEstimadas > 0 ? estado.ppmEstimadas : PALABRAS_POR_MINUTO_ESTIMADAS
  const segundosQueFaltan = palabrasQueFaltan / (ppm / 60)
  const totalEstimadoSeg = transcurridoSeg + segundosQueFaltan

  const progresoPct = Math.min(100, Math.max(0, (estado.posicion / totalTokens) * 100))

  return (
    <Pastilla
      texto={`${formatearTiempo(transcurridoSeg)} / ${formatearTiempo(totalEstimadoSeg)}`}
      progresoPct={progresoPct}
      etiqueta="tiempo transcurrido y total estimado"
      conTestidsDeProgreso={true}
    />
  )
}
