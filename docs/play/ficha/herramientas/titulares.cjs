// LOS TITULARES DE LAS CAPTURAS -tarea 86-. Los usan componer.cjs -el marco de cada captura- y
// lamina.cjs. Están en un solo lugar para que la lámina muestre exactamente lo que va a Play.
// Van por el nombre de la escena -escenas.cjs-, no por su número: el orden lo dice escenas.cjs, y
// mover una captura no le cambia el titular.
//
// Cuentan una historia en orden, desde la persona y lo que le cuesta -revisión de Javier,
// 29-09-2026-. Cada uno dice un beneficio, en 7 palabras o menos -lo pide docs/tarea86.txt-;
// comprobar.cjs las cuenta. ==así== marca la palabra que va con el destacado amarillo del editor
// -#FFE066, el mismo de COLORES_TRAMO-: es la marca de la casa, no un adorno. La barra | es dónde
// se corta el renglón, para que la frase no se parta en un mal lugar.
//
// La etiqueta de arriba nombra la función, corta. Ya no dice "sin internet": Javier pidió que el
// uso sin conexión no sea el titular -la completa lo cuenta al final, con el detalle del inglés-.
//
// PUESTA AL DÍA DEL 05-10-2026: las escenas que pidió Javier -escenas.cjs-. Los titulares de leer,
// el editor, grabar con la cámara detrás, los subtítulos y de lado son los de antes, aprobados el
// 29-09. Nuevos: la pausa y los filtros, que cuentan lo mismo que la descripción completa -lo pausado
// no queda en el video; el filtro se elige mirando la toma-. La historia de antes, en ocho: «hablas
// y el texto te sigue -1-; miras a la cámara sin memorizar -2-; te ves sin perder el hilo -3-;
// también de lado -4-; ves lo importante de un vistazo -5-; el video sale con subtítulos -6-; tus
// guiones a mano -7-; y lo dejas a tu gusto -8-». Salieron con sus escenas:
//   recuadro     'La cámara en un recuadro' · 'Mírate ==sin perder el hilo==' /
//                'Camera in a small frame' · 'See yourself ==without losing your place=='
//   portada      'Tus guiones' · 'Todos tus guiones, ==a mano==' /
//                'Your scripts' · 'All your scripts, ==close at hand=='
//   ajustes      'Ajustes de lectura' · 'Letra y colores, ==a tu manera==' /
//                'Reading settings' · 'Text and colors, ==your way=='
module.exports = {
  es: {
    '01-leer': { etiqueta: 'Teleprompter de voz', titular: 'Tú hablas.|El texto ==te sigue==.' },
    '02-editor': { etiqueta: 'Editor de guiones', titular: 'Lo importante, ==a la vista==' },
    '03-grabar-detras': { etiqueta: 'La cámara detrás del texto', titular: 'Mira a la cámara, ==sin memorizar==' },
    '04-pausa': { etiqueta: 'Pausa', titular: 'Las pausas|==no quedan en tu video==' },
    '05-subtitulos': { etiqueta: 'Subtítulos en tres estilos', titular: 'Tu video sale ==con subtítulos==' },
    '06-filtros': { etiqueta: 'Seis filtros', titular: 'Elige el filtro|==mirando tu video==' },
    '07-de-lado': { etiqueta: 'Horizontal', titular: '¿Grabas de lado? ==También funciona==.' },
    // -Javier, 05-10-2026- La 08, de un renglón. La etiqueta es la de antes del recuadro. Javier pidió
    // «Tu imagen en un recuadro» / «Your image in a small frame», pero con la letra de 80 miden 1001 y
    // 1060 px y el titular tiene 936: salían en dos renglones con la franja partida. Eligió estos, que
    // caben: 852 y 838 px.
    '08-recuadro': { etiqueta: 'La cámara en un recuadro', titular: 'Mírate ==en un recuadro==' }
  },
  en: {
    '01-leer': { etiqueta: 'Voice teleprompter', titular: 'You speak.|The script ==follows==.' },
    '02-editor': { etiqueta: 'Script editor', titular: 'What matters, ==easy to spot==' },
    '03-grabar-detras': { etiqueta: 'Camera behind the text', titular: 'Look at the camera, ==no memorizing==' },
    '04-pausa': { etiqueta: 'Pause', titular: 'Pauses|==stay out of your video==' },
    '05-subtitulos': { etiqueta: 'Captions in three styles', titular: 'Your video comes ==with captions==' },
    '06-filtros': { etiqueta: 'Six filters', titular: 'Pick a filter|==while you watch==' },
    '07-de-lado': { etiqueta: 'Landscape', titular: 'Recording sideways? ==That works too==.' },
    '08-recuadro': { etiqueta: 'Camera in a small frame', titular: 'Your image ==in a frame==' }
  }
}
