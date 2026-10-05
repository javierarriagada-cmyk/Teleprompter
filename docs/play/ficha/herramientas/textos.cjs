// LOS TEXTOS DE LA FICHA -tarea 86-. De aquí salen ../textos-es-419.txt y ../textos-en-US.txt
// -node armar-textos.cjs-, con los conteos hechos por la máquina y no a mano: Play cuenta
// caracteres -answer/9859152: nombre 30, breve 80, completa 4000- y un conteo a ojo se equivoca.
//
// ELEGIDO POR JAVIER -29-09-2026, revisión del PR #60-: el nombre queda igual y la breve es la A
// en los dos idiomas. En es-419 la A se ajustó para que "sin internet" no fuera el titular: es una
// posibilidad de uso, no lo que define a Sigo, y va al final de la completa.
//
// CÓMO ESTÁ ESCRITA. Primero la persona y su problema -olvidar el guion, perder el hilo, repetir
// tomas, lo difícil que es hablarle a la cámara-, después el beneficio y recién al final la
// función. Tú, frases cortas, sin modismos -es-419 neutro-. Las primeras líneas son las que Play
// muestra antes de "Más información": ahí va el gancho. Al final, la confianza: sin cuenta, la
// voz en el teléfono, la copia de seguridad.
//
// Todo lo que se dice está en la app hoy; la evidencia archivo:línea está en ../evidencia.md.
// - La copia de seguridad: se dice solo lo que se probó -guiones y ajustes vuelven al reinstalar,
//   con la copia de Google activada- y que los videos no entran.
// - Sin conexión: el español desde la instalación; el inglés después de bajar la voz una vez de
//   Play -android/model-en/build.gradle, on-demand-.
// - Nada de "el mejor", "gratis", "nuevo", "n.º 1", emojis, MAYÚSCULAS de énfasis, "…" ni "--":
//   la política de Metadatos -answer/9898842- y la guía de la descripción breve -answer/9866151-.
//   Los títulos de sección en mayúsculas no son énfasis: ordenan un texto plano, sin formato.
// Las palabras que la gente busca -teleprompter, apuntador, leer en voz alta, grabar video- van
// una o dos veces cada una, donde caen solas: repetirlas es relleno y Play lo castiga.
//
// PUESTA AL DÍA DEL 05-10-2026 -Javier-: se sumaron exactamente estas líneas y lo demás quedó igual.
// En GRABA TU VIDEO: "en teléfono o tableta" -la tableta de la tarea 83, T1-; la pausa -F10, lo
// pausado no queda en el archivo, src/lib/pausaToma.ts y src/lib/tramos.ts-; el control por gestos
// -F11, la palma pausa y sigue, en pausa la V termina, src/lib/gestos.ts-; los seis filtros -tarea 96,
// src/lib/filtros.ts, TONOS: la misma matriz en el visor y en el archivo-. En A TU MANERA, las cinco
// parejas de colores -PAREJAS_COLOR de src/datos/modelo.ts-. En CONFIANZA, los gestos se reconocen en
// el teléfono -MediaPipe con el modelo en assets, GestosPlugin.java- y Sigo no envía estadísticas -el
// backend cct de datatransport fuera del manifiesto, F11-. Evidencia en ../evidencia.md.
// En inglés, la misma idea, con los nombres que la app usa en inglés -Warm, Cool, Vivid, Soft, B&W,
// src/textos/en.ts-. Las rayas del inglés van pegadas, a la manera de Estados Unidos.
// Antes, en GRABA TU VIDEO: "- Cámara frontal o trasera, en 1080p, 720p o 480p. En vertical o de lado."
// y en A TU MANERA: "- Tamaño de letra, tipografía, ancho del texto y colores de lectura." -y en
// inglés "Portrait or landscape." y "Font size, typeface, text width and reading colors."-.
module.exports = {
  es: {
    archivo: 'textos-es-419.txt',
    idioma: 'Español (Latinoamérica) — es-419',
    nombre: 'Sigo — Teleprompter de voz',
    nombreNota: 'El que ya está en Play Console. Se queda igual -Javier, 29-09-2026-.',
    breve: 'Teleprompter que sigue tu voz: el texto avanza mientras lees en voz alta.',
    breveNota: 'La A, elegida por Javier, sin "sin internet": eso ahora va al final de la completa.',
    completa: `¿Se te olvida el guion justo cuando empiezas a grabar? Con Sigo lees en voz alta y el texto avanza contigo, a tu ritmo. Si haces una pausa, te espera.

Mira a la cámara con calma. No tienes que aprenderte el texto de memoria ni repetir la toma porque perdiste el hilo.

ES PARA TI SI
- Grabas videos para redes, clases o tu trabajo, y te cuesta hablarle a la cámara.
- Se te olvida lo que sigue o pierdes el hilo a mitad de una frase.
- Repites la misma toma una y otra vez.
- Ensayas una presentación, un discurso o una lectura, y necesitas un apuntador que no se adelante ni se quede atrás.

LO QUE CAMBIA CUANDO EL TEXTO TE SIGUE
- Hablas a tu ritmo. Sigo escucha tu voz y marca con una línea lo que estás leyendo.
- Si te detienes, el texto se detiene. No hay velocidades que ajustar.
- Eliges si lees arriba, cerca de la cámara, o al medio de la pantalla.

GRABA TU VIDEO AHÍ MISMO
- Tu imagen va detrás del texto, en un recuadro que mueves donde quieras, u oculta mientras grabas.
- Cámara frontal o trasera, en 1080p, 720p o 480p. En vertical o de lado, en teléfono o tableta.
- Pausa cuando quieras: lo que pasa en la pausa no queda en el video.
- Control por gestos: lejos del teléfono, muestra la palma para pausar o seguir, y la V para terminar.
- Subtítulos en tres estilos: Amarillo, Rojo y Formal. Salen de tu guion y del tiempo de tu voz, y quedan dentro del video al guardarlo.
- Seis filtros —Natural, Cálido, Frío, Vivo, Suave y B/N— que eliges mirando tu video. Lo que ves es lo que se guarda.
- Guarda tu video en la galería o compártelo.

TU GUION, CLARO DE UN VISTAZO
- Negrita, tres colores y destacado para ver de lejos lo importante.
- Notas entre [corchetes] o (paréntesis) que no se leen en voz alta ni salen en los subtítulos.
- Pega tu texto o abre un archivo .txt, .md o .docx.
- Todos tus guiones en un lugar, con su duración estimada.

A TU MANERA
- Tamaño de letra, tipografía, ancho del texto y cinco combinaciones de colores de lectura.
- Modo espejo, para usar con un vidrio de teleprompter.
- Tema claro u oscuro. La app está en español y en inglés, y sigue tu voz en los dos idiomas.

CONFIANZA Y PRIVACIDAD
- Sin cuenta ni registro.
- Tu voz se reconoce en el teléfono. El audio no se manda a ningún servidor.
- Los gestos se reconocen en el teléfono y ninguna imagen sale de él. Sigo no envía estadísticas de uso.
- Tus guiones y tus videos se quedan en tu teléfono, hasta que tú los compartes.
- Tus guiones y ajustes entran en la copia de seguridad de Android: si reinstalas Sigo con la copia de seguridad de Google activada, vuelven. Los videos no entran en esa copia.
- También puedes usarlo sin conexión. En español, desde que lo instalas; en inglés, después de descargar una vez la voz desde Google Play.

Escribe tu guion, toca Leer o Grabar, y habla. Sigo te sigue.`
  },
  en: {
    archivo: 'textos-en-US.txt',
    idioma: 'English (United States) — en-US',
    nombre: 'Sigo — Voice Teleprompter',
    nombreNota: 'El que fija docs/tarea86.txt. Se queda igual -Javier, 29-09-2026-.',
    breve: 'A teleprompter that follows your voice: the script moves as you read aloud.',
    breveNota: 'La A, elegida por Javier, sin cambios: nunca dijo "offline".',
    completa: `Forget your lines the moment you hit record? With Sigo you read aloud and the script moves with you, at your pace. Pause, and it waits.

Look at the camera and relax. No memorizing, and no redoing a take because you lost your place.

IT IS FOR YOU IF
- You record videos for social media, classes or work, and talking to the camera feels hard.
- You forget what comes next or lose your place mid-sentence.
- You end up redoing the same take again and again.
- You rehearse a talk, a speech or a reading, and need a prompter that never runs ahead or falls behind.

WHAT CHANGES WHEN THE SCRIPT FOLLOWS YOU
- You speak at your own pace. Sigo listens and underlines the line you are reading.
- Stop, and the text stops. No scroll speed to set.
- Read at the top, close to the camera, or in the middle of the screen.

RECORD YOUR VIDEO RIGHT THERE
- Your camera image goes behind the text, in a small frame you can drag anywhere, or stays hidden while you record.
- Front or back camera, in 1080p, 720p or 480p. Portrait or landscape, on a phone or a tablet.
- Pause whenever you want: nothing that happens during the pause ends up in the video.
- Gesture control: when you are away from the phone, show your palm to pause or resume, and a V sign to finish.
- Captions in three styles: Yellow, Red and Formal. They come from your script and the timing of your voice, and are burned into the video when you save it.
- Six filters—Natural, Warm, Cool, Vivid, Soft and B&W—that you choose while watching your video. What you see is what gets saved.
- Save your video to the gallery or share it.

YOUR SCRIPT, CLEAR AT A GLANCE
- Bold, three colors and highlight, so what matters stands out.
- Notes in [brackets] or (parentheses) that are not read aloud and do not appear in captions.
- Paste your text or open a .txt, .md or .docx file.
- All your scripts in one place, with their estimated length.

YOUR WAY
- Font size, typeface, text width and five reading color combinations.
- Mirror mode, for use with teleprompter glass.
- Light or dark theme. The app is in English and Spanish, and follows your voice in both.

TRUST AND PRIVACY
- No account, no sign-up.
- Your voice is recognized on your phone. The audio is not sent to any server.
- Gestures are recognized on your phone, and no image leaves it. Sigo does not send usage statistics.
- Your scripts and videos stay on your phone until you share them.
- Your scripts and settings are included in Android backup: if you reinstall Sigo with Google backup turned on, they come back. Videos are not part of that backup.
- You can also use it offline. English needs a one-time download of the speech model from Google Play; Spanish works right after install.

Write your script, tap Read or Record, and start talking. Sigo follows.`
  }
}
