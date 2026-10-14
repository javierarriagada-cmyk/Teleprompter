import React from 'react'
import { Guion, ResumenGrabacion } from '../datos/modelo'
import { movimientoApagado, MS_DEDO, MS_CHICO, CURVA_SALE, CURVA_RESORTE } from './movimiento'
import { IconoEmpezar } from './IconosApp'
import BandaTomas from './BandaTomas'
import { t } from '../textos'

// EL ANCHO MÁXIMO DE LEER Y DE GRABAR en la barra de abajo. Era 160 escrito en los dos botones;
// desde la tarea 76 -28-09-2026- lo usa también la banda de tomas, que va encima con el ancho
// de los dos juntos: su primera miniatura empieza donde empieza Leer. Un solo número.
const ANCHO_BOTON_BARRA = 160

interface BarraLeerGrabarProps {
  guion: Guion
  fontSize?: number
  barraLeerVisible: boolean
  bandaVisible: boolean
  btnLeerRef: React.RefObject<HTMLButtonElement>
  onEntrarLectura: (rect?: DOMRect) => void
  onEntrarGrabar?: (rect?: DOMRect) => void
  tomas?: ResumenGrabacion[]
  onAbrirToma?: (g: ResumenGrabacion) => void
}

export function BarraLeerGrabar({
  guion,
  fontSize,
  barraLeerVisible,
  bandaVisible,
  btnLeerRef,
  onEntrarLectura,
  onEntrarGrabar,
  tomas = [],
  onAbrirToma
}: BarraLeerGrabarProps) {
  return (
    /* Botón de Leer en voz alta Fijo Abajo - Solo cuando hay palabras */
    /* -28-09-2026, tarea 76: el contenedor lleva ahora, encima de Leer y Grabar, la banda
        de tomas del guion -BandaTomas.tsx-. Todo lo que sube y baja con barraLeerVisible
        está en este contenedor, y el transform sigue siendo UNO, acá -ver el comentario del
        23-09 en el botón Leer-.
        La banda es la primera línea de este mismo flex -flexWrap y flex-basis 100%-, no una
        caja nueva alrededor de los botones: Leer y Grabar siguen siendo hijos directos de
        este contenedor, con su bottom seguro y su translateY -T224, tarea48.test.tsx-.
        Su ancho máximo es el de los dos botones juntos y va centrada como ellos: la primera
        miniatura empieza donde empieza Leer, a cualquier ancho -ANCHO_BOTON_BARRA-.
        Escondida, la barra baja 120 px más lo que mide la banda con su aire: con 120 solos
        quedaba media banda a la vista. Sin banda, los 120 de siempre. */
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        // Entre la banda y los botones, var(--aire-3); entre Leer y Grabar, var(--aire-2)
        // como siempre.
        gap: 'var(--aire-3) var(--aire-2)',
        padding: '0 var(--aire-4)',
        pointerEvents: 'none',
        zIndex: 100,
        transform: barraLeerVisible
          ? 'translateY(0)'
          : bandaVisible
          ? 'translateY(calc(120px + var(--alto-banda-tomas) + var(--aire-3)))'
          : 'translateY(120px)',
        transition: movimientoApagado()
          ? 'none'
          : barraLeerVisible
          ? `transform ${MS_CHICO}ms ${CURVA_RESORTE}`
          : `transform ${MS_DEDO}ms ${CURVA_SALE}`
      }}
    >
      {bandaVisible && onAbrirToma && (
        <div style={{ flex: '0 0 100%', maxWidth: `calc(${2 * ANCHO_BOTON_BARRA}px + var(--aire-2))` }}>
          <BandaTomas tomas={tomas} onAbrirToma={onAbrirToma} />
        </div>
      )}
      <button
        ref={btnLeerRef}
        className="btn-deformable btn-leer-barra"
        onClick={() => {
          const rect = btnLeerRef.current?.getBoundingClientRect()
          onEntrarLectura(rect)
        }}
        data-testid="btn-leer-guion-fijo"
        style={{
          pointerEvents: 'auto',
          // Por encima del fondo de la banda de tomas -.banda-tomas::before, styles.css-:
          // mientras la banda entra -opacidad- es una capa propia, y sin esto su fondo se
          // pintaría encima de los botones hasta terminar de entrar. Tarea 76.
          zIndex: 1,
          flex: 1,
          maxWidth: ANCHO_BOTON_BARRA,
          padding: 'var(--aire-3) var(--aire-4)',
          fontSize: 'var(--texto-titulo)',
          fontWeight: 600,
          // Tanda 2, 15-10-2026: el fondo y la letra van en .btn-leer-barra -styles.css-, los de Leer de
          // la portada. Antes: backgroundColor: 'var(--color-acento)', color: 'var(--color-texto-acento)',
          borderRadius: 'var(--redondeo-pildora)',
          cursor: 'pointer',
          // Sin borde: un contorno gris alrededor de un relleno crema no separa
          // nada sobre el fondo oscuro, solo ensucia el canto. El relleno YA es
          // el limite. Grabar si lleva borde, porque ahi el borde es el boton.
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--aire-2)'
          // NO VA transform NI transition ACA. El translateY de entrada y salida
          // de la barra lo hace el contenedor de la linea 1194, y estaba repetido
          // en los dos: la barra escondida se corria 240px en vez de 120. Ademas
          // un transform en linea le gana al scaleY(0.94) de btn-deformable y
          // deja el boton sin apretado. Se saco el 23 de septiembre de 2026.
        }}
      >
        <IconoEmpezar tamano={16} />
        <span>{t('leer')}</span>
      </button>
      <button
        className="btn-deformable btn-grabar"
        onClick={() => {
          const rect = btnLeerRef.current?.getBoundingClientRect()
          onEntrarGrabar?.(rect)
        }}
        data-testid="btn-grabar-guion-fijo"
        style={{
          pointerEvents: 'auto',
          // Por encima del fondo de la banda de tomas -.banda-tomas::before, styles.css-:
          // mientras la banda entra -opacidad- es una capa propia, y sin esto su fondo se
          // pintaría encima de los botones hasta terminar de entrar. Tarea 76.
          zIndex: 1,
          flex: 1,
          maxWidth: ANCHO_BOTON_BARRA,
          padding: 'var(--aire-3) var(--aire-4)',
          fontSize: 'var(--texto-titulo)',
          fontWeight: 600,
          borderRadius: 'var(--redondeo-pildora)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--aire-2)'
        }}
      >
        {/* El punto de grabar era el caracter "●", que hereda el color del texto
            y queda gris: el mismo gris del triangulo de Leer. Dos puertas que
            hacen cosas distintas se veian iguales. Es un div y no un caracter
            porque asi toma var(--color-grabando), el mismo rojo de la barra de
            tiempo y del punto tally del lienzo. Es el UNICO rojo de la pantalla.
            24-09-2026: el boton entero tambien lleva ese rojo, tenue -.btn-grabar,
            styles.css-. Sigue siendo un solo rojo, ahora en el boton que graba. */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 'var(--redondeo-pildora)',
            backgroundColor: 'var(--color-grabando)',
            flexShrink: 0
          }}
        />
        <span>{t('grabar')}</span>
      </button>
    </div>
  )
}
