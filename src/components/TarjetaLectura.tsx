import React from 'react'
import { IconoEmpezar, IconoReloj } from './IconosApp'
import { ResumenGuion, duracionDeLectura } from '../datos/modelo'
import { estiloComprimirPorAviso, useMantenerApretado } from './mantenerApretado'
import { t, useTextos, tituloOInicio } from '../textos'

interface TarjetaLecturaProps {
  guionResumen?: ResumenGuion
  onAbrir?: () => void
  onLeer: (rect?: DOMRect) => void
  onGrabar?: (rect?: DOMRect) => void
  onCrearNuevo: () => void
}

export default function TarjetaLectura({
  guionResumen,
  onAbrir,
  onLeer,
  onGrabar,
  onCrearNuevo
}: TarjetaLecturaProps) {
  useTextos()
  const cardRef = React.useRef<HTMLDivElement>(null)
  // LA TARJETA ES UNA SUPERFICIE DE LA PORTADA, NO UNA MUESTRA DE LA LECTURA -27-09-2026-.
  // Hasta hoy tomaba la pareja de colores de lectura: con la negra, un rectangulo negro puro
  // sobre el suelo casi negro, que se leia como un hueco. Javier, comparando con una
  // auditoria: la otra version "se ve mejor esteticamente" por la proporcion y el contraste
  // entre gris y negro. Ahora sube del suelo con --bg-panel, en los dos temas. Los colores de
  // lectura se ven donde se eligen -cajon Aa- y al leer.
  const parejaColor = { fondo: 'var(--bg-panel)', letra: 'var(--color-texto)' }
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
  // Mismo formato que la fila del guion: duracionDeLectura, modelo.ts.
  const timecode = duracionDeLectura(palabras)
  const tituloText = hayGuion
    ? tituloOInicio(guionResumen?.titulo, guionResumen?.inicio)
    // "Sin guiones todavía" no entra a 44 px y se cortaba en "Sin guiones to...".
    // El titulo de la portada es de una sola linea a proposito; entonces el texto se
    // ajusta al sitio que hay, no al reves. En ingles, "No scripts", por lo mismo.
    : t('sinGuiones')

  return (
    <div
      ref={cardRef}
      data-testid="tarjeta-lectura-portada"
      role={hayGuion ? 'button' : undefined}
      tabIndex={hayGuion ? 0 : undefined}
      aria-label={hayGuion ? t('abrirEnEditor') : undefined}
      onClick={() => {
        if (hayGuion && onAbrir) {
          onAbrir()
        }
      }}
      onKeyDown={(e) => {
        if (hayGuion && onAbrir && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onAbrir()
        }
      }}
      className="tarjeta-lectura-borde-iluminado tarjeta-elevada"
      // -portada con luz, 15-10-2026- El fondo va en .portada .tarjeta-lectura-borde-iluminado -styles.css-:
      // es un degradado con el canto en dos fondos. Antes: backgroundColor: parejaColor.fondo,
      style={{
        borderRadius: 'var(--redondeo-grande)',
        // Mas aire adentro -27-09-2026-, junto con la superficie gris: la tarjeta crece y la
        // portada deja de quedar apretada arriba.
        // 28-09-2026: 20 en todos los lados, no 32 arriba y abajo. Javier, comparando con una propuesta
        // profesional: "nuestros cajones con mucho aire hacen que se vea menos profesional".
        padding: 'var(--aire-4)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: parejaColor.letra,
        cursor: hayGuion ? 'pointer' : 'default'
      }}
    >
      {/* EL RINCON DE ARRIBA A LA DERECHA NO ES NUESTRO, ES DEL SISTEMA.
          Ahi Android pone su reloj y el icono del clima. El timecode estaba
          exactamente debajo: dos lecturas chicas y grises en la misma esquina,
          que se leen como una sola cosa. Javier, el 21 de septiembre de 2026:
          "arriba queda un simbolo de un sol con la hora juntos".
          No era falta de aire -la portada ya descuenta el area segura- sino
          dos relojes en el mismo rincon. Y el nuestro no es una hora del dia:
          es cuanto dura el guion, asi que su lugar es al lado del titulo.
          24-09-2026: el espacio de 24 px que quedaba arriba se fue. La tarjeta ya
          no toca el rincon del sistema -arriba esta la barra con la marca y el
          engranaje- y el engranaje ya no vive en la tarjeta. */}

      {/* SIN TEXTO FANTASMA. 24-09-2026.
          Desde la Tarea 48 la tarjeta llevaba una miniatura de la lectura: cinco
          renglones del guion a 18 px, cortados por un velo arriba y otro abajo,
          casi todos atenuados. No se alcanzaban a leer, competian con el titulo
          de 44 px y ensuciaban la pantalla que tiene que decir lo mas simple:
          este es tu guion, leelo o grabalo. El dueno: "siento que nos desordena
          un poco la pantalla". Se fue el texto Y el hueco de 140 px que ocupaba:
          dejar el hueco vacio es espacio muerto. La animacion de la tarjeta que
          crece hasta la lectura no dependia del texto: sale del rectangulo.
          La zona queda solo para el estado vacio, con la marca. */}
      {!hayGuion && (
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
        {
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
        }
      </div>
      )}

      {/* Zona Inferior: Título de 44px y Botón de Acción */}
      <div style={{ zIndex: 5, display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
        {hayGuion && (
          <span
            data-testid="time-code-tarjeta"
            // -portada con luz, 15-10-2026- la letra es --dato-texto, en .portada .duracion-tarjeta.
            // Antes: style={{ color: parejaColor.letra }}
            className="duracion-tarjeta"
          >
            <IconoReloj tamano={14} />
            {timecode}
          </span>
        )}
        <h2
          data-testid="titulo-tarjeta-lectura"
          // DOS RENGLONES Y LA LETRA DE LOS TITULOS -28-09-2026-. En el moto g86 decia "Hay una
          // idea a...": un renglon a 44 px corta un guion sin titulo a tres palabras. Y era la
          // unica letra sin remates de la portada -la marca, Guiones, Videos y cada fila van en
          // Source Serif 4-, en un 800 que ni se carga -main.tsx trae 400 y 600-: el mismo guion
          // se veia con dos letras. Ahora la serif en 600, como .texto-titulo.
          className="titulo-tarjeta"
          style={{
            margin: 0,
            lineHeight: 1.1,
            color: hayGuion ? parejaColor.letra : 'var(--color-apagado)',
            userSelect: 'none'
          }}
          title={tituloText}
        >
          {tituloText}
        </h2>

        {hayGuion ? (
          /* El triangulo era el caracter "▶" y ahora es IconoEmpezar, el mismo SVG
             que usa el boton Leer del editor. Son los DOS botones de empezar a
             leer de la aplicacion y se veian distintos: el caracter no tiene ni el
             mismo peso ni la misma alineacion vertical que el dibujo.
             El punto de Grabar era el caracter "●" y ahora es un div de 10x10 con
             var(--color-grabando), igual que en el editor. La clase
             btn-grabar-tarjeta-rojo NO lo pintaba: esa clase solo actua en :active
             y pinta el boton entero mientras se aprieta. En reposo el punto era
             gris. El :active se queda como esta, es otra cosa.
             El borde se saca por la misma razon que en el Leer del editor: crema
             con contorno gris sobre fondo oscuro ensucia el canto y no separa
             nada. Grabar, al lado, si lo conserva, porque ahi el borde ES el boton.
             NO SACAR el estiloComprimirPorAviso de mas abajo aunque ponga un
             transform en linea: ese es el aviso del mantener-apretado.
             Todo esto se hizo el 23 de septiembre de 2026, en la Tarea 71. */
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
              // -portada con luz, 15-10-2026- fondo y letra en .btn-leer-tarjeta -styles.css-.
              // Antes: className="btn-deformable", backgroundColor: 'var(--color-acento)', color: 'var(--color-texto-acento)',
              className="btn-deformable btn-leer-tarjeta"
              style={{
                flex: 1,
                padding: 'var(--aire-3) var(--aire-4)',
                border: 'none',
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
              <IconoEmpezar tamano={16} />
              <span>{t('leer')}</span>
            </button>
            <button
              type="button"
              data-testid="btn-grabar-tarjeta"
              className="btn-deformable btn-grabar btn-grabar-tarjeta-rojo"
              onClick={(e) => {
                e.stopPropagation()
                const rect = cardRef.current?.getBoundingClientRect()
                if (onGrabar) onGrabar(rect)
              }}
              style={{
                flex: 1,
                padding: 'var(--aire-3) var(--aire-4)',
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
            {t('escribePrimerGuion')}
          </button>
        )}
      </div>
    </div>
  )
}
