import { useEffect, useRef, useState } from 'react'
import { MotorDeAvance } from '../lib/avance'
import { t, useTextos } from '../textos'
import { PALABRAS_POR_MINUTO, segundosDeLectura } from '../datos/modelo'
// -proxima-version, 2026-11-08- IconoMicrofono, para el disco del micrófono. Antes: import { IconoVelocimetro } from './IconosApp'
import { IconoVelocimetro, IconoMicrofono } from './IconosApp'
import { objetivoNivel, suavizarNivel, suscribirNivelVoz } from '../lib/nivelVoz'
import { modoTextoPastillaLimite } from '../lib/avisoLimite'

export interface BarraDeTiempoProps {
  motorAvance: MotorDeAvance | null
  totalTokens: number
  // UNA SOLA ESTIMACIÓN -ajustes de pantallas, segunda vuelta, 10-10-2026-: las palabras del guion como
  // las cuenta el editor -contarPalabras-. El total sale de segundosDeLectura, la misma cuenta del
  // editor y del dock. Sin este dato -quien monta la barra sola- se usan los tokens, como antes.
  palabrasGuion?: number
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
  // -tarea 104, lámina a- La voz bajándose en LISTO -fracción 0..1, o null-: la pastilla dice
  // "Preparando la voz…" con su barra y el porcentaje en lugar del tiempo. No es un error y no tapa nada.
  preparandoVoz?: number | null
  // -orden 2, puntos 3 y 4- Sin Sigo+: en Grabar el total es el límite; en Lectura con voz, tras el
  // aviso de 1 min el total pasa a ser el límite. Antes: también el paso a Velocidad fija forzada ('fija').
  // 27-10-2026: vía fija retirada. 2026-10-27: la frase del aviso ya no va en la pastilla.
  limiteTotalSeg?: number | null
  // Antes: 'aviso' → avisoQuedaMinutoVoz; 'queda' → textoQuedaConVoz; también 'fija'.
  // 2026-10-27: la pastilla solo muestra el tiempo; fase solo sirve para que App pase el límite.
  faseLimiteVoz?: 'aviso' | 'queda' | null
  // Antes: segundos para textoQuedaConVoz. 2026-10-27: ya no se usa en el texto de la pastilla.
  segundosQuedanVoz?: number | null
  // -proxima-version, 2026-11-08- EL DISCO DEL MICRÓFONO: true mientras Sigo escucha de verdad -con la voz y
  // el micrófono abierto-. Lo decide App con lo que ya existe: isRecording de useASR, fija y estadoToma.
  escuchando?: boolean
  // Con «Mostrar tiempo» apagado: solo el micrófono, en una pastilla redonda.
  soloMicrofono?: boolean
}

// -proxima-version, 2026-11-08- EL DISCO DEL MICRÓFONO, a la izquierda de la pastilla. Un micrófono verde en
// un disco de 22 con un halo que crece con el VOLUMEN -lib/nivelVoz.ts-, nunca con lo reconocido. Sin textos
// ni estados, y nunca cambia de color: el rojo en Sigo es «grabando». No se toca: sin área de 48. El nivel
// va a la variable --nivel-voz con una ref, en un cuadro de animación: sin setState por evento, React no se
// vuelve a dibujar con cada trozo de audio. Los colores y medidas, en .microfono-disco -styles.css, T209-.
function DiscoMicrofono() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let ultimoRms = 0
    let ultimoEventoMs: number | null = null
    let nivel = 0
    let antes = performance.now()
    const desuscribir = suscribirNivelVoz((rms, tMs) => {
      ultimoRms = rms
      ultimoEventoMs = tMs
    })
    let cuadro = 0
    const paso = () => {
      const ahora = performance.now()
      nivel = suavizarNivel(nivel, objetivoNivel(ultimoRms, ultimoEventoMs, ahora), ahora - antes)
      antes = ahora
      ref.current?.style.setProperty('--nivel-voz', nivel.toFixed(3))
      cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => {
      cancelAnimationFrame(cuadro)
      desuscribir()
    }
  }, [])
  return (
    <span ref={ref} className="microfono-disco" data-testid="disco-microfono" aria-hidden="true">
      <span className="microfono-halo" />
      <IconoMicrofono tamano={14} />
    </span>
  )
}

// El mismo ritmo que usa el editor para decir "1 min", y el que usa esta
// barra mientras el motor todavia no midio el del que lee.
// -ajustes de pantallas, segunda vuelta- El ritmo vive en modelo.ts -PALABRAS_POR_MINUTO-, junto a la
// única cuenta -segundosDeLectura-. Antes: const PALABRAS_POR_MINUTO_ESTIMADAS = 150

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
  encimaDeLaFila = false,
  porcentaje,
  conIconoFija = false,
  escuchando = false,
  soloMicrofono = false
}: {
  // -proxima-version, 2026-11-08- El disco del micrófono a la izquierda; o solo él, sin el tiempo.
  escuchando?: boolean
  soloMicrofono?: boolean
  // -tarea 104- Con porcentaje, el número va a la derecha de la barra -segundo renglón-.
  porcentaje?: string
  texto: string
  progresoPct: number
  etiqueta: string
  testid?: string
  conTestidsDeProgreso: boolean
  enRiel?: boolean
  encimaDeLaFila?: boolean
  // -orden 2, punto 3- Ícono de velocímetro + «Velocidad fija» al llegar al límite con la voz.
  conIconoFija?: boolean
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
      {/* -proxima-version, 2026-11-08- El disco del micrófono. Con «Mostrar tiempo» apagado queda solo, en
          una pastilla redonda -.pastilla-microfono-sola-. */}
      {escuchando && soloMicrofono && (
        <div className="pastilla-tiempo pastilla-microfono-sola" data-testid="pastilla-microfono-sola">
          <DiscoMicrofono />
        </div>
      )}
      {escuchando && !soloMicrofono && <DiscoMicrofono />}
      {!soloMicrofono && (
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
        <div style={porcentaje ? { letterSpacing: 0, whiteSpace: 'normal' } : conIconoFija ? { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 } : undefined}>
          {conIconoFija && <IconoVelocimetro tamano={16} />}
          <span>{texto}</span>
        </div>
        <div style={porcentaje ? { display: 'flex', alignItems: 'center', gap: 8 } : { display: 'contents' }}>
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
        {porcentaje && <span style={{ letterSpacing: 0 }}>{porcentaje}</span>}
        </div>
      </div>
      )}
    </div>
  )
}

export default function BarraDeTiempo({
  motorAvance,
  totalTokens,
  palabrasGuion,
  tInicioLecturaMs,
  vistaPrevia = false,
  enRiel = false,
  encimaDeLaFila = false,
  enPausa = false,
  msPausadoAhora,
  preparandoVoz = null,
  limiteTotalSeg = null,
  faseLimiteVoz = null,
  escuchando = false,
  soloMicrofono = false
  // Antes 2026-10-27: también segundosQuedanVoz = null (textoQuedaConVoz en la pastilla).
}: BarraDeTiempoProps) {
  useTextos()
  // -ajustes de pantallas, segunda vuelta- Las palabras de la única estimación; los tokens si no llegan.
  const palabras = palabrasGuion ?? totalTokens
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

  // -proxima-version, 2026-11-08- «Mostrar tiempo» apagado: solo el micrófono, mientras escucha. Va después de los
  // ganchos para no cambiar su orden.
  if (soloMicrofono) {
    return escuchando ? (
      <Pastilla texto="" progresoPct={0} etiqueta="" conTestidsDeProgreso={false} enRiel={enRiel}
        encimaDeLaFila={encimaDeLaFila} escuchando soloMicrofono />
    ) : null
  }
  if (!tInicioLecturaMs || totalTokens === 0 || !motorAvance) {
    // "MOSTRAR TIEMPO" TIENE QUE VERSE AL TOCARLO. Tarea 72.
    // Antes de empezar no hay reloj, y la barra devolvia null: en el estado
    // listo el interruptor no cambiaba nada en pantalla. Regla de producto:
    // todo control muestra su efecto donde se toca. En vista previa se
    // dibuja quieta, 00:00 y la duracion estimada.
    // Lleva OTRA etiqueta y OTRO testid a proposito: no es el reloj de la
    // lectura. T83 cuida que ese reloj arranque con la lectura y no con el
    // boton, y el reloj sigue sin aparecer hasta que la lectura empieza.
    // -tarea 104, lámina a- Mientras baja la voz del guion -la que se pidió sola al abrir la app, o la
    // de Empezar-, la pastilla dice eso en lugar del tiempo. Al terminar vuelve el tiempo.
    if (vistaPrevia && preparandoVoz !== null) {
      const n = Math.round(preparandoVoz * 100)
      return (
        <Pastilla
          texto={t('preparandoVoz')}
          porcentaje={`${n} %`}
          progresoPct={n}
          etiqueta={`${t('preparandoVoz')} ${n} %`}
          testid="pastilla-preparando-voz"
          conTestidsDeProgreso={false}
          enRiel={enRiel}
          encimaDeLaFila={encimaDeLaFila}
        />
      )
    }
    if (vistaPrevia && totalTokens > 0) {
      // REDONDEADO COMO EN EL EDITOR -28-09-2026-: formatearTiempo corta los decimales, y el
      // editor -duracionDeLectura- redondea. 214 palabras eran 1:26 en el editor y 01:25 aca.
      // -ajustes de pantallas, segunda vuelta- La misma cuenta del editor y del dock. Antes:
      // const totalSeg = Math.round(totalTokens / (PALABRAS_POR_MINUTO_ESTIMADAS / 60))
      const totalSeg = segundosDeLectura(palabras)
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
    // -motor sin pastilla, 13-10-2026- LA PASTILLA SOLO MIRA. estadoEn avanza el motor, y con la
    // hora vieja de este refresco lo hacia integrar dos veces el mismo tramo: mostrar u ocultar la
    // pastilla cambiaba donde iba el texto. El motor lo avanza solo el cuadro de TeleprompterView.
    // Antes: estado = motorAvance.estadoEn(ahora)
    estado = motorAvance.leerEstado()
    if (!enPausa) estadoAntesDePausaRef.current = estado
  }

  // 2026-10-05: sin lo pausado -con la pausa abierta, ahora y lo pausado crecen juntos y el número
  // queda quieto-. Antes: const transcurridoSeg = (ahora - tInicioLecturaMs) / 1000
  // 2026-10-05, segundo ajuste: la hora se toma al dibujar y no del último refresco de 250 ms. Con la
  // hora vieja la pastilla se congelaba hasta 250 ms antes de la pausa y al seguir se adelantaba de golpe.
  // Ahora, en pausa, la hora y lo pausado crecen juntos y el número queda en el ms en que se pausó; al
  // seguir continúa desde ahí. El refresco -ahora- solo hace que se vuelva a dibujar. Antes:
  //   const transcurridoSeg = Math.max(0, ahora - tInicioLecturaMs - pausadoMs) / 1000
  const pausadoMs = msPausadoAhora ? msPausadoAhora() : 0
  const horaDeDibujo = Math.max(ahora, performance.now())
  const transcurridoSeg = Math.max(0, horaDeDibujo - tInicioLecturaMs - pausadoMs) / 1000
  // -ajustes de pantallas, segunda vuelta- Lo que falta, en palabras del editor: la fracción del guion
  // que queda por leer -por tokens- aplicada a las palabras de contarPalabras, y los segundos con
  // segundosDeLectura. Al arrancar -posición 0, ritmo de 150- el total es el del editor y el dock;
  // cuando el motor mide el ritmo del que lee, la misma cuenta corre con ese ritmo. Antes:
  //   const palabrasQueFaltan = Math.max(0, totalTokens - estado.posicion)
  //   const ppm = estado.ppmEstimadas > 0 ? estado.ppmEstimadas : PALABRAS_POR_MINUTO_ESTIMADAS
  //   const segundosQueFaltan = palabrasQueFaltan / (ppm / 60)
  const fraccionQueFalta = Math.max(0, totalTokens - estado.posicion) / totalTokens
  const palabrasQueFaltan = palabras * fraccionQueFalta
  const ppm = estado.ppmEstimadas > 0 ? estado.ppmEstimadas : PALABRAS_POR_MINUTO
  const segundosQueFaltan = segundosDeLectura(palabrasQueFaltan, ppm)
  const totalEstimadoSeg = transcurridoSeg + segundosQueFaltan

  const progresoPct = Math.min(100, Math.max(0, (estado.posicion / totalTokens) * 100))

  // -orden 2, puntos 3 y 4- Pastilla con límite de grabación o total estimado.
  // Antes: también Velocidad fija forzada (faseLimiteVoz === 'fija'). 27-10-2026: vía retirada.
  // Antes: texto={`${formatearTiempo(transcurridoSeg)} / ${formatearTiempo(totalEstimadoSeg)}`}
  // Antes 2026-10-27: if (faseLimiteVoz === 'aviso') texto = t('avisoQuedaMinutoVoz')
  //   else if (faseLimiteVoz === 'queda') texto = t('textoQuedaConVoz', { t: formatearTiempo(queda) })
  // Ahora: la frase sale en AvisoBreve; la pastilla solo el tiempo (modoTextoPastillaLimite → 'tiempo').
  let texto: string
  let conIconoFija = false
  // Antes: if (faseLimiteVoz === 'fija') { texto = t('modoVelocidadFija'); conIconoFija = true }
  // Antes 2026-10-27: ramas fraseAviso / quedaConVoz según faseLimiteVoz y segundosQuedanVoz.
  // modoTextoPastillaLimite(fase) es siempre 'tiempo': no hay frase en la pastilla.
  if (modoTextoPastillaLimite(faseLimiteVoz) !== 'tiempo') {
    // Reservado por si volviera una frase; hoy no corre.
    texto = ''
  } else if (limiteTotalSeg != null) {
    texto = `${formatearTiempo(transcurridoSeg)} / ${formatearTiempo(limiteTotalSeg)}`
  } else {
    texto = `${formatearTiempo(transcurridoSeg)} / ${formatearTiempo(totalEstimadoSeg)}`
  }

  return (
    <Pastilla
      texto={texto}
      progresoPct={progresoPct}
      etiqueta={t('tiempoTranscurrido')}
      conTestidsDeProgreso={true}
      enRiel={enRiel}
      encimaDeLaFila={encimaDeLaFila}
      conIconoFija={conIconoFija}
      escuchando={escuchando}
    />
  )
}
