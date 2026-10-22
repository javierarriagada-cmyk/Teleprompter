import { useEffect, useRef, useState } from 'react'
import { movimientoApagado } from './movimiento'
import { MarcaSigo } from './MarcaSigo'
import { MARCA_CAJA, MARCA_LEMA_TRAZO, MARCA_LEMA_CAJA } from './trazoMarca'

// LA ENTRADA: LA MARCA VIAJA A SU LUGAR. 24-09-2026.
//
// Hasta aca la entrada era un espejo del splash de los cinco renglones: se
// quedaba la marca, se escribia "SIGO" debajo, y el conjunto subia un poco y
// se apagaba. Con la marca nueva -"Sig" y la bola roja, trazoMarca.ts- el dueno
// pidio lo que faltaba: la letra "achicandose y terminando donde ahora la
// tienes chiquitita arriba en la portada".
//
// Asi que la entrada es un solo movimiento. El splash nativo termina con la
// marca en la mitad de la pantalla; esta capa la recibe en el mismo sitio y al
// mismo tamano -es el mismo trazo-, la sostiene un momento, y la lleva hasta la
// barra de la portada achicandola en el camino. Mientras viaja, el fondo se
// apaga y la portada aparece subiendo 10 px. Al llegar, la marca de la barra
// -que estuvo escondida- toma su lugar: son el mismo dibujo en el mismo rectangulo.
//
// El camino es una curva y no una recta: X e Y viajan con curvas distintas
// -X arranca rapido, Y despues-, y eso dibuja un arco.

// COPIA EXACTA DE values-night/colors.xml (marca_trazo_apagado, marca_trazo, marca_punto).
// Se mantienen en constantes declaradas aquí porque representan la marca nativa de Android,
// independientemente del tema activo del WebView.
export const COLOR_MARCA_TRAZO_APAGADO = '#8A837C'
export const COLOR_MARCA_TRAZO = '#E7E1DE'
export const COLOR_MARCA_PUNTO = '#E11D2E'
export const COLOR_MARCA_FONDO = '#151312'
// -mejoras-claridad, 21-10-2026- TELEPROMPTER, algo más claro -marca_lema en colors.xml- y un 10 % más
// grande, creciendo desde el medio de su borde de abajo, igual que en marca_arranque.xml: el relevo sigue
// sin salto. Antes, TELEPROMPTER iba en COLOR_MARCA_TRAZO_APAGADO y a escala 1.
export const COLOR_MARCA_LEMA = '#B3ABA4'
export const ESCALA_LEMA = 1.1

// El splash nativo dibuja un lienzo de 432 en una caja de 288 dp, centrada en la
// pantalla. La marca esta centrada en ese lienzo, asi que aca va centrada y a
// esta escala para caer exactamente encima.
export const FACTOR_ESPEJO = 288 / 432
export const ALTO_MARCA_ENTRADA = MARCA_CAJA.alto * FACTOR_ESPEJO

// Tiempos, en ms
export const MS_MARCA_QUIETA = 400   // la marca se sostiene: tiene que poder leerse
export const MS_VIAJE_MARCA = 750    // de la mitad de la pantalla a la barra
export const MS_FONDO_SE_APAGA = 500 // el fondo se va mientras la marca viaja
export const MS_LEMA_SE_APAGA = 250  // TELEPROMPTER se apaga en su sitio al empezar el viaje
export const MS_TOPE_ENTRADA = 2400  // pase lo que pase, a los 2.4 s no queda nada encima

// Las clases que la entrada le pone a <html> mientras dura. styles.css las usa
// para esconder la marca de la barra -hasta que llegue la que viaja- y para
// tener la portada abajo y transparente -hasta que empiece el viaje-.
export const CLASE_ENTRADA_EN_CURSO = 'entrada-en-curso'
export const CLASE_MARCA_VIAJANDO = 'marca-viajando'

interface EntradaProps {
  onFinish?: () => void
  // En el telefono, el splash nativo ya mostro la marca: esta capa la recibe
  // encendida. En el navegador no hubo splash, y la marca aparece.
  desdeSplashNativo?: boolean
  // En el teléfono la capa se monta quieta y tapa la portada; la animación de
  // salida empieza recién cuando llega el aviso del plugin Arranque (o el tope).
  // Antes: (no existía; la línea de tiempo arrancaba al montar)
  puedeAnimar?: boolean
}

type Viaje = { dx: number; dy: number; escala: number; color: string } | null

export function Entrada({ onFinish, desdeSplashNativo = false, puedeAnimar = true }: EntradaProps) {
  const [desmontado, setDesmontado] = useState<boolean>(false)
  const [viajando, setViajando] = useState<boolean>(false)
  const [viaje, setViaje] = useState<Viaje>(null)
  const refMarca = useRef<HTMLDivElement | null>(null)

  // LA LINEA DE TIEMPO ARRANCA UNA SOLA VEZ, Y ESTO NO ES UNA PRECAUCION.
  //
  // Javier miro el arranque en su telefono el 20 de septiembre de 2026: "primero
  // aparece algo de la biblioteca, despues el nombre una milesima, luego
  // biblioteca, palabra... horrendo".
  //
  // La causa estaba aca. El efecto dependia de [onFinish], y App le pasa una
  // funcion escrita en linea -onFinish={() => setMostrarEntrada(false)}-, que es
  // NUEVA en cada redibujo. App se redibuja varias veces durante el arranque
  // -cargado, la biblioteca, los ajustes, el tema-, y en cada uno el efecto se
  // limpiaba y volvia a empezar: los temporizadores se reiniciaban y la entrada
  // nunca llegaba a correr entera. Eso es el parpadeo.
  //
  // Dos candados: onFinish vive en un ref -asi su identidad deja de importar- y
  // arrancoRef impide que la linea de tiempo empiece dos veces.
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const arrancoRef = useRef<boolean>(false)

  useEffect(() => {
    // Antes:
    //   if (arrancoRef.current) return
    //   arrancoRef.current = true
    if (!puedeAnimar) return
    if (arrancoRef.current) return
    arrancoRef.current = true

    const raiz = document.documentElement
    const quitarClases = () => {
      raiz.classList.remove(CLASE_ENTRADA_EN_CURSO)
      raiz.classList.remove(CLASE_MARCA_VIAJANDO)
    }
    let terminado = false
    const terminar = () => {
      if (terminado) return
      terminado = true
      quitarClases()
      setDesmontado(true)
      if (onFinishRef.current) onFinishRef.current()
    }

    if (movimientoApagado()) {
      terminar()
      return
    }

    raiz.classList.add(CLASE_ENTRADA_EN_CURSO)
    raiz.classList.add(CLASE_MARCA_VIAJANDO)

    let timerFin: ReturnType<typeof setTimeout> | null = null

    // Empieza el viaje: se mide de donde sale y a donde llega.
    const timerViaje = setTimeout(() => {
      const destino = document.querySelector('[data-marca-portada]') as HTMLElement | null
      const origen = refMarca.current
      const rd = destino?.getBoundingClientRect()
      const ro = origen?.getBoundingClientRect()
      if (rd && ro && ro.height > 0 && rd.height > 0) {
        // Tambien el color: en el tema claro la marca de la barra es oscura, y la
        // que viaja llega oscura en vez de cambiar de golpe al relevo.
        setViaje({ dx: rd.left - ro.left, dy: rd.top - ro.top, escala: rd.height / ro.height, color: getComputedStyle(destino!).color })
      }
      // Sin barra a donde llegar -otra pantalla abierta, o jsdom que no mide-
      // la marca se apaga en su sitio junto con el fondo.
      setViajando(true)
      raiz.classList.remove(CLASE_ENTRADA_EN_CURSO)
      timerFin = setTimeout(terminar, MS_VIAJE_MARCA)
    }, MS_MARCA_QUIETA)

    const timerTope = setTimeout(terminar, MS_TOPE_ENTRADA)

    return () => {
      clearTimeout(timerViaje)
      clearTimeout(timerTope)
      if (timerFin) clearTimeout(timerFin)
      quitarClases()
    }
    // Sin dependencias: la entrada corre una sola vez, no una por redibujo de App.
    // Antes: }, [])
  }, [puedeAnimar])

  if (movimientoApagado() || desmontado) {
    return null
  }

  // El arco: X con una curva que arranca rapido, Y y la escala con una que
  // arranca lento. Van en dos cajas, una adentro de la otra, porque cada una
  // lleva su propia curva.
  const curvaX = 'cubic-bezier(.3, 0, .2, 1)'
  const curvaY = 'cubic-bezier(.6, 0, .3, 1)'

  return (
    <div
      data-testid="capa-entrada-espejo"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        // Antes: pointerEvents: 'none',
        // Mientras tapa la portada, los toques no llegan a ella.
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* El fondo va aparte de la marca: se apaga mientras ella viaja. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLOR_MARCA_FONDO,
          opacity: viajando ? 0 : 1,
          transition: viajando ? `opacity ${MS_FONDO_SE_APAGA}ms ease-out` : 'none'
        }}
      />
      <div
        ref={refMarca}
        data-testid="marca-entrada"
        style={{
          position: 'relative',
          color: viaje ? viaje.color : COLOR_MARCA_TRAZO,
          lineHeight: 0,
          transform: viaje ? `translateX(${viaje.dx}px)` : 'none',
          transition: viaje ? `transform ${MS_VIAJE_MARCA}ms ${curvaX}, color ${MS_VIAJE_MARCA}ms ease` : 'none',
          opacity: viajando && !viaje ? 0 : 1,
          animation: desdeSplashNativo ? 'none' : 'marcaEntradaAparece 300ms ease-out'
        }}
      >
        <div
          style={{
            transformOrigin: '0 0',
            transform: viaje ? `translateY(${viaje.dy}px) scale(${viaje.escala})` : 'none',
            transition: viaje ? `transform ${MS_VIAJE_MARCA}ms ${curvaY}` : 'none'
          }}
        >
          <MarcaSigo alto={ALTO_MARCA_ENTRADA} colorPunto={COLOR_MARCA_PUNTO} />
        </div>
      </div>
      {/* EL LEMA SE QUEDA. "TELEPROMPTER" esta bajo la marca como la dejo el
          splash -mismo trazo, mismo sitio- y cuando la marca sale de viaje se
          apaga donde esta. El dueno: "esa palabra despues no acompana a Sigo". */}
      <svg
        data-testid="lema-entrada"
        aria-hidden="true"
        width={MARCA_LEMA_CAJA.ancho * FACTOR_ESPEJO}
        height={MARCA_LEMA_CAJA.alto * FACTOR_ESPEJO}
        viewBox={`${MARCA_LEMA_CAJA.x} ${MARCA_LEMA_CAJA.y} ${MARCA_LEMA_CAJA.ancho} ${MARCA_LEMA_CAJA.alto}`}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          // Relativo al centro de la pantalla, que es el 216,216 del lienzo.
          // -mejoras-claridad, 21-10-2026- Más la escala del lema, desde el medio de su borde de abajo.
          // Antes: transform: `translate(${(MARCA_LEMA_CAJA.x - 216) * FACTOR_ESPEJO}px, ${(MARCA_LEMA_CAJA.y - 216) * FACTOR_ESPEJO}px)`,
          transform: `translate(${(MARCA_LEMA_CAJA.x - 216) * FACTOR_ESPEJO}px, ${(MARCA_LEMA_CAJA.y - 216) * FACTOR_ESPEJO}px) scale(${ESCALA_LEMA})`,
          transformOrigin: '50% 100%',
          opacity: viajando ? 0 : 1,
          transition: viajando ? `opacity ${MS_LEMA_SE_APAGA}ms ease-out` : 'none',
          // Solo opacidad: el transform de arriba es su posicion.
          animation: desdeSplashNativo ? 'none' : 'lemaEntradaAparece 300ms ease-out'
        }}
      >
        {/* -mejoras-claridad, 21-10-2026- Antes: <path d={MARCA_LEMA_TRAZO} fill={COLOR_MARCA_TRAZO_APAGADO} /> */}
        <path d={MARCA_LEMA_TRAZO} fill={COLOR_MARCA_LEMA} />
      </svg>
    </div>
  )
}
