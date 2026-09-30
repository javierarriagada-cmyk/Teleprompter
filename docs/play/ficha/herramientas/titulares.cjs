// LOS TITULARES DE LAS CAPTURAS -tarea 86-. Los usan componer.cjs -el marco de cada captura- y
// lamina.cjs. Están en un solo lugar para que la lámina muestre exactamente lo que va a Play.
//
// Cuentan una historia en orden, desde la persona y lo que le cuesta -revisión de Javier,
// 29-09-2026-: hablas y el texto te sigue -1-; miras a la cámara sin memorizar -2-; te ves sin
// perder el hilo -3-; también de lado -4-; ves lo importante de un vistazo -5-; el video sale con
// subtítulos -6-; tus guiones a mano -7-; y lo dejas a tu gusto -8-. Cada uno dice un beneficio,
// en 7 palabras o menos -lo pide docs/tarea86.txt-; comprobar.cjs las cuenta. ==así== marca la palabra que va con el destacado
// amarillo del editor -#FFE066, el mismo de COLORES_TRAMO-: es la marca de la casa, no un adorno.
// La barra | es dónde se corta el renglón, para que la frase no se parta en un mal lugar.
//
// La etiqueta de arriba nombra la función, corta. Ya no dice "sin internet": Javier pidió que el
// uso sin conexión no sea el titular -la completa lo cuenta al final, con el detalle del inglés-.
module.exports = {
  es: [
    { etiqueta: 'Teleprompter de voz', titular: 'Tú hablas.|El texto ==te sigue==.' },
    { etiqueta: 'La cámara detrás del texto', titular: 'Mira a la cámara, ==sin memorizar==' },
    { etiqueta: 'La cámara en un recuadro', titular: 'Mírate ==sin perder el hilo==' },
    { etiqueta: 'Horizontal', titular: '¿Grabas de lado? ==También funciona==.' },
    { etiqueta: 'Editor de guiones', titular: 'Lo importante, ==a la vista==' },
    { etiqueta: 'Subtítulos en tres estilos', titular: 'Tu video sale ==con subtítulos==' },
    { etiqueta: 'Tus guiones', titular: 'Todos tus guiones, ==a mano==' },
    { etiqueta: 'Ajustes de lectura', titular: 'Letra y colores, ==a tu manera==' }
  ],
  en: [
    { etiqueta: 'Voice teleprompter', titular: 'You speak.|The script ==follows==.' },
    { etiqueta: 'Camera behind the text', titular: 'Look at the camera, ==no memorizing==' },
    { etiqueta: 'Camera in a small frame', titular: 'See yourself ==without losing your place==' },
    { etiqueta: 'Landscape', titular: 'Recording sideways? ==That works too==.' },
    { etiqueta: 'Script editor', titular: 'What matters, ==easy to spot==' },
    { etiqueta: 'Captions in three styles', titular: 'Your video comes ==with captions==' },
    { etiqueta: 'Your scripts', titular: 'All your scripts, ==close at hand==' },
    { etiqueta: 'Reading settings', titular: 'Text and colors, ==your way==' }
  ]
}
