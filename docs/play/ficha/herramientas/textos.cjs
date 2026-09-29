// LOS TEXTOS DE LA FICHA -tarea 86-. De aquí salen ../textos-es-419.txt y ../textos-en-US.txt
// -node armar-textos.cjs-, con los conteos hechos por la máquina y no a mano: Play cuenta
// caracteres -answer/9859152: nombre 30, breve 80, completa 4000- y un conteo a ojo se equivoca.
//
// Todo lo que se dice está en la app hoy; la evidencia archivo:línea está en ../evidencia.md.
// Lo que NO se dice, a propósito:
// - Que los guiones se respaldan en la copia de Android: no está comprobado -ver evidencia.md-.
// - "Sin internet" en inglés sin explicarlo: el modelo inglés se baja de Play una vez
//   -android/model-en/build.gradle, on-demand-. Se dice tal cual.
// - Nada de "el mejor", "gratis", "nuevo", "n.º 1", emojis, MAYÚSCULAS de énfasis, "…" ni "--":
//   la política de Metadatos -answer/9898842- y la guía de la descripción breve -answer/9866151-.
// Las palabras que la gente busca -teleprompter, apuntador, leer en voz alta, grabar video- van
// una o dos veces cada una, donde caen solas: repetirlas es relleno y Play lo castiga.
module.exports = {
  es: {
    archivo: 'textos-es-419.txt',
    idioma: 'Español (Latinoamérica) — es-419',
    nombre: 'Sigo — Teleprompter de voz',
    nombreNota: 'Es el que ya está en Play Console. docs/tarea86.txt dice no cambiarlo: queda este.',
    nombresAlternativos: [
      ['Sigo: teleprompter y apuntador', 'Suma "apuntador", la palabra en español para lo mismo. No se midió cuánto se busca cada una.'],
      ['Sigo — Apuntador de voz', 'Más corto; pierde "teleprompter", la palabra más conocida para esto.'],
      ['Sigo — Teleprompter para video', 'Apunta a quien graba; deja fuera la voz, que es lo que distingue a Sigo.']
    ],
    breves: [
      ['Teleprompter que sigue tu voz: el texto avanza mientras lees, sin internet.', 'La recomendada. Dice qué es, qué hace distinto y lo de sin internet.'],
      ['Un apuntador que escucha: el guion avanza al ritmo de tu voz, sin internet.', 'Más cálida. Abre con "apuntador" y deja "teleprompter" para el nombre.'],
      ['Lees en voz alta y el texto te sigue, sin internet. Y grabas tu video con él.', 'Suma grabar video; es la más larga y la menos directa.']
    ],
    completa: `Lee en voz alta y el texto avanza solo, a tu ritmo. Sigo es un teleprompter que escucha tu voz: si haces una pausa, espera; cuando sigues, sigue contigo. Y todo ocurre en tu teléfono, sin internet.

LEE MIRANDO A LA CÁMARA
- Sigo reconoce lo que dices y marca con una línea lo que estás leyendo.
- Si te detienes, el texto se detiene. No hay que ajustar velocidades.
- Elige si lees arriba o al medio de la pantalla.

GRABA TU VIDEO CON EL GUION A LA VISTA
- Tu imagen va detrás del texto, en un recuadro que mueves donde quieras, u oculta mientras grabas.
- Cámara frontal o trasera, en 1080p, 720p o 480p.
- En vertical o de lado.
- Subtítulos en tres estilos: Amarillo, Rojo y Formal. Salen de tu guion y del tiempo de tu voz, y quedan dentro del video al guardarlo.
- Guarda tus videos en la galería o compártelos.

UN EDITOR PENSADO PARA LEER
- Negrita, tres colores y destacado, para ver de lejos lo importante.
- Acotaciones entre [corchetes] o (paréntesis): notas para ti que no se leen en voz alta ni salen en los subtítulos.
- Pega tu texto o abre un archivo .txt, .md o .docx.
- Todos tus guiones en un lugar, con su duración estimada.

A TU MANERA
- Tamaño de letra, tipografía, ancho del texto y colores de lectura.
- Modo espejo, para usar con un vidrio de teleprompter.
- Tema claro u oscuro.
- La app está en español y en inglés, y sigue tu voz en los dos idiomas.

PARA QUIÉN ES
Para quien graba videos para redes, clases o su trabajo y quiere mirar a la cámara sin aprenderse el texto. Para quien ensaya una presentación, un discurso o una lectura y necesita un apuntador que no se adelante ni se quede atrás.

TU PRIVACIDAD
- Tu voz se reconoce en el teléfono. El audio no se manda a ningún servidor.
- No hay cuentas ni registro.
- Tus guiones y tus videos se quedan en tu teléfono, hasta que tú los compartes.
- El español funciona sin internet desde que instalas Sigo. Para seguir tu voz en inglés, el modelo se descarga una vez desde Google Play; después también funciona sin internet.

Escribe tu guion, dale a Leer o a Grabar, y habla. Sigo te sigue.`
  },
  en: {
    archivo: 'textos-en-US.txt',
    idioma: 'English (United States) — en-US',
    nombre: 'Sigo — Voice Teleprompter',
    nombreNota: 'El que fija docs/tarea86.txt.',
    nombresAlternativos: [
      ['Sigo — Teleprompter for Video', 'Apunta a quien graba; deja fuera la voz, que es lo que distingue a Sigo.'],
      ['Sigo — Read-Aloud Teleprompter', 'Pone "read aloud" en el nombre. No se midió cuánto se busca.'],
      ['Sigo — Teleprompter by Voice', 'La misma idea del principal, en otro orden; suena menos natural.']
    ],
    breves: [
      ['A teleprompter that follows your voice: the script moves as you read aloud.', 'La recomendada. Dice qué es y qué la hace distinta.'],
      ['Read aloud and the script keeps up with your voice, right on your phone.', 'Más cálida, abre con la acción. Deja "teleprompter" para el nombre.'],
      ['Voice teleprompter: the text follows you as you speak, and you can record.', 'Suma grabar; es la menos directa de las tres.']
    ],
    completa: `Read aloud and the script moves on its own, at your pace. Sigo is a teleprompter that listens: pause and it waits; keep going and it keeps up. Speech recognition runs on your phone, not on a server.

READ WHILE LOOKING AT THE CAMERA
- Sigo recognizes what you say and underlines the line you are reading.
- Stop, and the text stops. No scroll speed to set.
- Choose whether you read at the top or in the middle of the screen.

RECORD VIDEO WITH YOUR SCRIPT IN VIEW
- Your camera image goes behind the text, in a small frame you can drag anywhere, or stays hidden while you record.
- Front or back camera, in 1080p, 720p or 480p.
- Portrait or landscape.
- Captions in three styles: Yellow, Red and Formal. They come from your script and the timing of your voice, and are burned into the video when you save it.
- Save your videos to the gallery or share them.

AN EDITOR MADE FOR READING
- Bold, three colors and highlight, so what matters stands out at a glance.
- Stage directions in [brackets] or (parentheses): notes for you that are not read aloud and do not appear in captions.
- Paste your text or open a .txt, .md or .docx file.
- All your scripts in one place, with their estimated length.

YOUR WAY
- Font size, typeface, text width and reading colors.
- Mirror mode, for use with teleprompter glass.
- Light or dark theme.
- The app is in English and Spanish, and follows your voice in both languages.

WHO IT IS FOR
For anyone who records videos for social media, classes or work and wants to look at the camera without memorizing the script. For anyone rehearsing a talk, a speech or a reading who needs a prompter that never runs ahead or falls behind.

YOUR PRIVACY
- Your voice is recognized on your phone. The audio is not sent to any server.
- No accounts, no sign-up.
- Your scripts and videos stay on your phone until you share them.
- To follow your voice in English, Sigo downloads the English speech model once from Google Play. After that it works without internet. Spanish works offline right after install.

Write your script, tap Read or Record, and start talking. Sigo follows.`
  }
}
