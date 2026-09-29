// LOS TITULARES DE LAS CAPTURAS -tarea 86-. Los usan componer.cjs -el marco de cada captura- y
// lamina.cjs. Están en un solo lugar para que la lámina muestre exactamente lo que va a Play.
//
// Cuentan una historia en orden, como una campaña: hablas y el texto te sigue -1-, te grabas
// leyendo -2, 3, 4-, preparas el guion -5-, el video sale con subtítulos -6-, todos tus guiones a
// mano -7- y lo dejas a tu gusto -8-. Cada uno dice un beneficio, en 7 palabras o menos -lo pide
// docs/tarea86.txt-; comprobar.cjs las cuenta. ==así== marca la palabra que va con el destacado
// amarillo del editor -#FFE066, el mismo de COLORES_TRAMO-: es la marca de la casa, no un adorno.
// La barra | es dónde se corta el renglón, para que la frase no se parta en un mal lugar.
//
// La etiqueta de arriba nombra la función, corta. En inglés la 1 dice "en el teléfono" y no "sin
// internet": el modelo inglés se baja de Play una vez -android/model-en/build.gradle, on-demand-,
// y la etiqueta no alcanza para explicarlo; la descripción completa sí lo explica.
module.exports = {
  es: [
    { etiqueta: 'Reconoce tu voz sin internet', titular: 'Tú hablas.|El texto ==te sigue==.' },
    { etiqueta: 'La cámara detrás del texto', titular: 'Lee y grábate ==a la vez==' },
    { etiqueta: 'La cámara en un recuadro', titular: 'Mírate en un recuadro ==que mueves==' },
    { etiqueta: 'Horizontal', titular: 'Gira el teléfono: ==también de lado==' },
    { etiqueta: 'Editor de guiones', titular: 'Marca ==lo importante== de tu guion' },
    { etiqueta: 'Subtítulos en tres estilos', titular: 'Tu video, ==con subtítulos==' },
    { etiqueta: 'Tus guiones', titular: 'Todos tus guiones, ==a mano==' },
    { etiqueta: 'Ajustes de lectura', titular: 'Lee ==a tu manera==' }
  ],
  en: [
    { etiqueta: 'On-device speech recognition', titular: 'You speak.|The script ==follows==.' },
    { etiqueta: 'Camera behind the text', titular: 'Read and ==record at once==' },
    { etiqueta: 'Camera in a small frame', titular: 'See yourself in a ==movable frame==' },
    { etiqueta: 'Landscape', titular: 'Turn your phone: ==landscape works too==' },
    { etiqueta: 'Script editor', titular: 'Mark ==what matters== in your script' },
    { etiqueta: 'Captions in three styles', titular: 'Your video, ==with captions==' },
    { etiqueta: 'Your scripts', titular: 'All your scripts, ==close at hand==' },
    { etiqueta: 'Reading settings', titular: 'Read ==your way==' }
  ]
}
