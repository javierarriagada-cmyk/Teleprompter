import React from 'react'

/** Engranaje de trazo fino. Sin relleno; ocho dientes en línea, no el cog de librería.
 *
 * 23-09-2026, revision de la 70: los ocho dientes eran rayitas sueltas alrededor de
 * un circulo, y eso se leia como un SOL -Javier lo llamaba "el menu del sol" en la
 * portada, y lo dijo mirando la toma: "el engranaje, es un sol"-. Ahora es una
 * rueda dentada de verdad: un solo contorno cerrado con ocho dientes trapeciales y el
 * agujero al centro. Sigue siendo de trazo y sigue sin ser el cog de libreria: los
 * dientes son rectos, no los petalos redondeados del icono de siempre. */
export function IconoEngranaje({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M10.23 4.61L10.44 2.12L13.56 2.12L13.77 4.61A7.6 7.6 0 0 1 15.97 5.52L17.88 3.91L20.09 6.12L18.48 8.03A7.6 7.6 0 0 1 19.39 10.23L21.88 10.44L21.88 13.56L19.39 13.77A7.6 7.6 0 0 1 18.48 15.97L20.09 17.88L17.88 20.09L15.97 18.48A7.6 7.6 0 0 1 13.77 19.39L13.56 21.88L10.44 21.88L10.23 19.39A7.6 7.6 0 0 1 8.03 18.48L6.12 20.09L3.91 17.88L5.52 15.97A7.6 7.6 0 0 1 4.61 13.77L2.12 13.56L2.12 10.44L4.61 10.23A7.6 7.6 0 0 1 5.52 8.03L3.91 6.12L6.12 3.91L8.03 5.52A7.6 7.6 0 0 1 10.23 4.61Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Triangulo de play, relleno solido: a diferencia de los otros tres,
 * este no es de trazo -un triangulo solo con contorno no se lee a 22px. */
export function IconoEmpezar({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

// No es un engranaje. El engranaje queda para las preferencias de la
// aplicacion (portada). Este abre la ESCENA de ESTA toma: donde lees,
// espejo, tiempo y brillo. Cuatro esquinas de encuadre y la linea de
// la franja donde cae el renglon vivo.
// 23-09-2026, Tarea 70: en la toma esto se dio vuelta. La foto que
// Javier aprobo muestra un engranaje de verdad arriba a la derecha, y
// eso es lo que quedo. IconoEscena sigue aqui por si se vuelve atras.
export function IconoEscena({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 8V4h4" />
      <path d="M16 4h4v4" />
      <path d="M20 16v4h-4" />
      <path d="M8 20H4v-4" />
      <path d="M6 10h12" />
    </svg>
  )
}

/** Flecha de volver hacia la izquierda de trazo fino. */
export function IconoAtras({
  tamano = 20,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

/** Dos barras verticales redondeadas para la pausa en lectura. */
export function IconoPausa({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  )
}

/** Cuadrado relleno con esquinas redondeadas para detener la toma. */
export function IconoParar({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

/** Tacho de basura de trazo para descartar la toma desde la pausa. */
export function IconoTacho({
  tamano = 22,
  ...props
}: { tamano?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  )
}

// LOS ICONOS DEL CAJON DE LA TOMA. 24-09-2026.
// El cajon del engranaje sigue el estandar del cajon Aa del editor: cada
// control se dibuja en vez de nombrarse. Todos son de trazo, 24x24, y usan
// el mismo marco de telefono -rect 6,2 de 12x20- cuando hablan de la
// pantalla, asi se leen como una familia.
type PropsIcono = { tamano?: number } & React.SVGProps<SVGSVGElement>

function Trazo({ tamano = 22, children, ...props }: PropsIcono & { children: React.ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Una cruz: crear un guion. Dibujada con el trazo de la casa y no con el caracter "+", que
 *  cambia de grosor y de altura con cada tipografia -28-09-2026, junto al titulo Guiones-. */
export function IconoMas(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Trazo>
  )
}

/** Dos flechas en circulo: dar vuelta la camara. */
export function IconoVoltear(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M4.5 11a7.5 7.5 0 0 1 13.2-4.3L20 9" />
      <path d="M20 4.5V9h-4.5" />
      <path d="M19.5 13a7.5 7.5 0 0 1-13.2 4.3L4 15" />
      <path d="M4 19.5V15h4.5" />
    </Trazo>
  )
}

/** La imagen de la camara detras de todo el texto: la persona llena el telefono. */
export function IconoImagenDetras(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M7.5 19.5c.9-2.6 2.6-3.9 4.5-3.9s3.6 1.3 4.5 3.9" />
    </Trazo>
  )
}

/** La imagen en un recuadro chico, en una esquina. */
export function IconoImagenRecuadro(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <rect x="11.5" y="5" width="4" height="5.5" rx="1" fill="currentColor" stroke="none" />
      <path d="M8.5 14h7M8.5 17h5" opacity="0.55" />
    </Trazo>
  )
}

/** La imagen oculta: el ojo tachado. La camara sigue grabando. */
export function IconoImagenOculta(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M4 4l16 16" />
    </Trazo>
  )
}

/** La franja de lectura arriba o al medio de la pantalla. */
export function IconoFranja({ posicion, ...props }: PropsIcono & { posicion: 'arriba' | 'medio' }) {
  const y = posicion === 'arriba' ? 5.5 : 10.5
  return (
    <Trazo {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <rect x="8.2" y={y} width="7.6" height="3" rx="1" fill="currentColor" stroke="none" />
    </Trazo>
  )
}

/** Espejo: un triangulo y su reflejo a los dos lados de un eje. */
export function IconoEspejo(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M12 3v18" strokeDasharray="2 2.2" />
      <path d="M9 7L4 17h5Z" />
      <path d="M15 7l5 10h-5Z" fill="currentColor" />
    </Trazo>
  )
}

/** Reloj: mostrar el tiempo de la toma. */
export function IconoReloj(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Trazo>
  )
}

/** Sol: los extremos de la barra de brillo. Rayos cortos y separados del
 * centro, para que no se confunda con el engranaje -ese error ya paso-. */
export function IconoSol(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Trazo>
  )
}


/** Chevron hacia abajo: "Ver todos" en la portada -tarea 76, 28-09-2026-. Al desplegar la
 * lista gira 180 grados en su lugar -BibliotecaView.tsx-, así que se dibuja una sola vez,
 * apuntando a lo que va a aparecer. */
export function IconoChevron(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M6 9l6 6 6-6" />
    </Trazo>
  )
}

// LOS SIMBOLOS UNIVERSALES -28-09-2026-. Javier: "existen algunos simbolos y formas que son de
// un uso internacional... no los estamos utilizando". Se dibujan con la convencion de Android,
// que es donde vive Sigo: compartir son los tres nodos -el cuadrado con flecha es de iPhone- y
// guardar es la flecha a la bandeja -el disquete es "guardar documento", no "bajar el video al
// telefono"-. Compartir, Borrar, Repetir y Cerrar van solos; Guardar, Archivar y Subtitulos con
// su palabra chica debajo o al lado. Decision de Javier sobre un dibujo.

/** Flecha hacia abajo a una bandeja: guardar la toma en la galeria. */
export function IconoGuardar(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 19.5h14" />
    </Trazo>
  )
}

/** Tres nodos unidos: compartir, como en Android. */
export function IconoCompartir(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.7l7.4-4.4" />
      <path d="M8.3 13.3l7.4 4.4" />
    </Trazo>
  )
}

/** Una sola flecha en circulo, hacia atras: repetir la toma. No las dos flechas de
 *  IconoVoltear -dar vuelta la camara-, que ademas se leen como "recargar". */
export function IconoRepetir(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Trazo>
  )
}

/** Una X: cerrar. */
export function IconoCerrar(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Trazo>
  )
}

/** Una caja con su tapa: archivar un guion. */
export function IconoArchivar(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <rect x="2.5" y="3.5" width="19" height="5" rx="1" />
      <path d="M4.5 8.5V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5" />
      <path d="M10 12.5h4" />
    </Trazo>
  )
}

/** CC en un recuadro: subtitulos. Las dos C son arcos, no letras: una letra cambia con la
 *  tipografia -ver IconoMas-. */
export function IconoSubtitulos(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M10.2 10.2a2.3 2.3 0 1 0 0 3.6" />
      <path d="M17.2 10.2a2.3 2.3 0 1 0 0 3.6" />
    </Trazo>
  )
}

// LOS ICONOS DE LAS FILAS DE AJUSTES -28-09-2026-. El dibujo aprobado llevaba un icono a la izquierda
// de cada fila; la pantalla salio sin ellos y Javier lo noto: "con dibujito... mejor espaciado".
// Mismo trazo que el resto -Trazo, 1.6-.

/** Una A grande y una chica: el tamano de letra. */
export function IconoTamanoLetra(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M3 19l5.5-14 5.5 14M5 14h7" />
      <path d="M15 19l3-8 3 8M16.2 16h3.6" />
    </Trazo>
  )
}

/** Una T con remates: la tipografia. */
export function IconoTipografia(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M5 7V5h14v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </Trazo>
  )
}

/** Dos margenes y renglones entre ellos: el ancho del texto. */
export function IconoAnchoTexto(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M3 4v16M21 4v16" />
      <path d="M7.5 9h9M7.5 12h9M7.5 15h6" />
    </Trazo>
  )
}

/** Una paleta: los colores de lectura. */
export function IconoPaleta(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5H17a4 4 0 0 0 4-4c0-4.5-4-8.2-9-8.2z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </Trazo>
  )
}

/** Una luna: el tema. */
export function IconoTema(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Trazo>
  )
}

/** Un globo: el idioma de la app. */
export function IconoIdioma(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </Trazo>
  )
}

/** Una i en un circulo: la version. */
export function IconoInfo(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8v.2" />
    </Trazo>
  )
}

/** Un candado: la privacidad. */
export function IconoCandado(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Trazo>
  )
}

/** Un signo de pregunta en un circulo: el soporte. */
export function IconoAyuda(props: PropsIcono) {
  return (
    <Trazo {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6" />
      <path d="M12 17v.2" />
    </Trazo>
  )
}

/** SIN VIDEOS -tarea 76, 28-09-2026-. Un visor de cámara: cuatro esquinas en L en el rojo de
 * grabar y, adentro, una filmadora de líneas con el triángulo de reproducir. Javier lo eligió
 * de la imagen de una auditoría; está hecho con las piezas de este archivo.
 *
 * Mide 96 x 72 y el viewBox es del mismo tamaño A PROPÓSITO: con un viewBox de 24 escalado a 96,
 * el trazo de 1.6 saldría cuatro veces más grueso que el de los demás iconos. Así, 1.6 es 1.6.
 *
 * El rojo es var(--color-grabando) -el único rojo de la pantalla- y va en style y no en el
 * atributo stroke: un var() en un atributo de presentación no lo lee cualquier WebView. Lo
 * demás toma currentColor, que TiraGrabaciones pinta con --color-apagado. */
export function IconoSinVideos(props: React.SVGProps<SVGSVGElement>) {
  const rojo: React.CSSProperties = { stroke: 'var(--color-grabando)' }
  return (
    <svg
      width={96}
      height={72}
      viewBox="0 0 96 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* El visor: cuatro L con la esquina redondeada. */}
      <path d="M4 18V8a4 4 0 0 1 4-4h10" style={rojo} />
      <path d="M78 4h10a4 4 0 0 1 4 4v10" style={rojo} />
      <path d="M92 54v10a4 4 0 0 1-4 4H78" style={rojo} />
      <path d="M18 68H8a4 4 0 0 1-4-4V54" style={rojo} />
      {/* La filmadora, centrada en el visor: el cuerpo y el lente trapecio a la derecha. */}
      <rect x="26" y="24" width="32" height="24" rx="5" />
      <path d="M58 32l12-6v20l-12-6" />
      {/* Reproducir, relleno y con las puntas suavizadas por el mismo trazo redondeado. */}
      <path d="M39 30.5l7.5 5.5-7.5 5.5z" style={{ ...rojo, fill: 'var(--color-grabando)' }} />
    </svg>
  )
}
