import { useEffect, useRef, useState } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { t, useTextos } from '../textos'

export interface BarraDeTiempoProps {
  motorAvance: MotorDeAvance | null
  totalTokens: number
  tInicioLecturaMs: number | null
  // EN PAUSA LA PASTILLA SE CONGELA -2026-10-05, tarea 83, correcciones-. enPausa es la máquina de la
  // tarea 88 -lib/pausaToma.ts- y msPausadoAhora lo que lleva pausado la toma, con la pausa abierta
  // incluida -App.msPausadoAhora-. El transcurrido es el de la toma sin pausas, el mismo del archivo.
  enPausa?: boolean
  msPausadoAhora?: () => number
  // En LISTO, antes de empezar: la barra se dibuja quieta con la duracion
  // estimada del guion. Ver el comentario de la vista previa, abajo.
  vistaPrevia?: boolean
  // TELÉFONO DE LADO -tarea 82, 29-09-2026-: la pastilla va abajo del riel derecho y su lugar lo
  // pone entero styles-horizontal.css. El bottom en línea, medido desde el círculo de la pantalla
  // vertical, ahí no corresponde y un estilo en línea le ganaría a la hoja.
  enRiel?: boolean
  // -tarea 83, parte B, 04-10-2026- TELÉFONO DE PIE, LEYENDO: la pastilla va centrada justo encima de la
  // fila de la toma -pausa, Parar y tacho-. A la derecha de Parar, donde estaba, la pisaba el tacho en
  // pausa. En LISTO sigue donde estaba.
  encimaDeLaFila?: boolean
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
// Ahora App la monta ADENTRO del lienzo y ella se ubica sola, ABAJO A LA
// DERECHA, a la altura del circulo de empezar o parar. Primero fue arriba al
// centro, y en el telefono rozaba el renglon vivo cuando se lee arriba. El
// dueno, 23-09-2026: "esa barra de tiempo siempre debe ir abajo a la derecha".
// Abajo a la derecha no la tapa nada y no tapa nada: el circulo va al centro
// y el que lee casi nunca lee abajo. Es
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
  conTestidsDeProgreso,
  enRiel = false,
  encimaDeLaFila = false
}: {
  texto: string
  progresoPct: number
  etiqueta: string
  testid?: string
  conTestidsDeProgreso: boolean
  enRiel?: boolean
  encimaDeLaFila?: boolean
}) {
  return (
    <div
      // El lado izquierdo lo pone .pastilla-tiempo-lugar -styles.css-: termina en el
      // circulo, para no pisarlo en telefonos angostos -27-09-2026-.
      // -tarea 83, parte B- encima-de-la-fila la centra -styles.css-. Antes: className="pastilla-tiempo-lugar".
      className={`pastilla-tiempo-lugar${encimaDeLaFila ? ' encima-de-la-fila' : ''}`}
      style={{
        position: 'absolute',
        // El circulo de abajo mide 72 y esta a 24 del borde: su centro queda a
        // 60. La pastilla mide unos 44, asi que a 38 del borde su centro calza
        // con el del circulo.
        // Desde el 27-09-2026 el circulo se mide con --circulo-desde-abajo
        // -styles.css-: la pastilla va 14 px mas arriba que el borde del circulo,
        // (72 - 44) / 2, y asi los centros siguen calzando si el circulo se mueve.
        // -tarea 83, parte B- Encima de la fila: el borde de arriba de Parar -72- más --aire-3 -12-. Antes,
        // sin ese caso: bottom: enRiel ? undefined : 'calc(var(--circulo-desde-abajo) + 14px + …)'.
        bottom: enRiel
          ? undefined
          : encimaDeLaFila
            ? 'calc(var(--circulo-desde-abajo) + 72px + var(--aire-3) + env(safe-area-inset-bottom, 0px))'
            : 'calc(var(--circulo-desde-abajo) + 14px + env(safe-area-inset-bottom, 0px))',
        // 29-09-2026, tarea 82: en el riel -teléfono de lado- el bottom lo pone styles-horizontal.css.
        // right -16 px mas el area segura- tambien vive en .pastilla-tiempo-lugar: en
        // pantallas angostas baja a 12 -27-09-2026-.
        zIndex: 12,
        display: 'flex',
        pointerEvents: 'none'
      }}
    >
      <div
        data-testid={testid}
        aria-label={etiqueta}
        // Los colores -fondo translucido, borde y letra- estan en la clase
        // pastilla-tiempo de styles.css y no aca: T209 no deja escribir colores a
        // mano en este archivo, y son los mismos de los controles flotantes.
        className="pastilla-tiempo"
        // El ancho minimo, el relleno y la letra estan en .pastilla-tiempo -styles.css-:
        // se achican en pantallas angostas -27-09-2026-. Eran 120, '6px 14px 8px' y
        // --texto-meta.
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRadius: 'var(--redondeo-pildora)',
          // letterSpacing 0.04em: en .pastilla-tiempo, que lo quita en pantallas angostas.
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        <div>{texto}</div>
        <div
          data-testid={conTestidsDeProgreso ? 'barra-progreso-pista' : undefined}
          className="pastilla-tiempo-pista"
          style={{
            width: '100%',
            height: 2,
            borderRadius: 'var(--redondeo-pildora)',
            overflow: 'hidden'
          }}
        >
          <div
            data-testid={conTestidsDeProgreso ? 'barra-progreso' : undefined}
            className="pastilla-tiempo-relleno"
            style={{
              width: `${progresoPct}%`,
              height: '100%',
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
  vistaPrevia = false,
  enRiel = false,
  encimaDeLaFila = false,
  enPausa = false,
  msPausadoAhora
}: BarraDeTiempoProps) {
  useTextos()
  const [ahora, setAhora] = useState<number>(() => performance.now())
  // El último estado del motor antes de la pausa: en pausa el estimado sale de aquí y no se mueve.
  const estadoAntesDePausaRef = useRef<ReturnType<MotorDeAvance['estadoEn']> | null>(null)

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
      // REDONDEADO COMO EN EL EDITOR -28-09-2026-: formatearTiempo corta los decimales, y el
      // editor -duracionDeLectura- redondea. 214 palabras eran 1:26 en el editor y 01:25 aca.
      const totalSeg = Math.round(totalTokens / (PALABRAS_POR_MINUTO_ESTIMADAS / 60))
      return (
        <Pastilla
          texto={`${formatearTiempo(0)} / ${formatearTiempo(totalSeg)}`}
          progresoPct={0}
          etiqueta={t('duracionEstimada')}
          testid="barra-tiempo-previa"
          conTestidsDeProgreso={false}
          enRiel={enRiel}
          encimaDeLaFila={encimaDeLaFila}
        />
      )
    }
    return null
  }

  // 2026-10-05: en pausa, el estado congelado. Antes: const estado = motorAvance.estadoEn(ahora)
  let estado: ReturnType<MotorDeAvance['estadoEn']>
  if (enPausa && estadoAntesDePausaRef.current) {
    estado = estadoAntesDePausaRef.current
  } else {
    estado = motorAvance.estadoEn(ahora)
    if (!enPausa) estadoAntesDePausaRef.current = estado
  }

  // 2026-10-05: sin lo pausado -con la pausa abierta, ahora y lo pausado crecen juntos y el número
  // queda quieto-. Antes: const transcurridoSeg = (ahora - tInicioLecturaMs) / 1000
  const pausadoMs = msPausadoAhora ? msPausadoAhora() : 0
  const transcurridoSeg = Math.max(0, ahora - tInicioLecturaMs - pausadoMs) / 1000
  const palabrasQueFaltan = Math.max(0, totalTokens - estado.posicion)
  const ppm = estado.ppmEstimadas > 0 ? estado.ppmEstimadas : PALABRAS_POR_MINUTO_ESTIMADAS
  const segundosQueFaltan = palabrasQueFaltan / (ppm / 60)
  const totalEstimadoSeg = transcurridoSeg + segundosQueFaltan

  const progresoPct = Math.min(100, Math.max(0, (estado.posicion / totalTokens) * 100))

  return (
    <Pastilla
      texto={`${formatearTiempo(transcurridoSeg)} / ${formatearTiempo(totalEstimadoSeg)}`}
      progresoPct={progresoPct}
      etiqueta={t('tiempoTranscurrido')}
      conTestidsDeProgreso={true}
      enRiel={enRiel}
      encimaDeLaFila={encimaDeLaFila}
    />
  )
}
