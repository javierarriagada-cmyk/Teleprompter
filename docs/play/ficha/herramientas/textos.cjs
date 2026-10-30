// HISTORIA hasta el 25-10-2026. Fuente canónica de teléfono/textos: contenidos.json y armar_ficha.py.
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
//   -tarea 104, 06-10-2026- Ya no: el español también es on-demand -android/model-es/build.gradle- y
//   la voz del idioma de la app se baja sola, en silencio, la primera vez que se abre Sigo
//   -src/lib/vozAPedido.ts-. Ahora se dice eso. Antes decía: "En español, desde que lo instalas; en
//   inglés, después de descargar una vez la voz desde Google Play." / "English needs a one-time
//   download of the speech model from Google Play; Spanish works right after install."
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
// LA LÍNEA DE GESTOS, PRECISADA -Javier, 05-10-2026-: dice que es con la cámara frontal y que la V
// termina en pausa -src/lib/pausaToma.ts:74 y :95; grabando, la V no hace nada-. Antes:
// "- Control por gestos: lejos del teléfono, muestra la palma para pausar o seguir, y la V para
// terminar." y "- Gesture control: when you are away from the phone, show your palm to pause or
// resume, and a V sign to finish."
// Antes, en GRABA TU VIDEO: "- Cámara frontal o trasera, en 1080p, 720p o 480p. En vertical o de lado."
// y en A TU MANERA: "- Tamaño de letra, tipografía, ancho del texto y colores de lectura." -y en
// inglés "Portrait or landscape." y "Font size, typeface, text width and reading colors."-.
//
// PORTUGUÉS DE BRASIL -orden portugues-ficha de Javier, 2026-10-24-. Se suma pt-BR, que arma
// ../textos-pt-BR.txt con el mismo formato. Lo manda docs/portugues.txt de la rama portugues-app:
// portugués de Brasil con «você» -P2-, escrito y no traducido -P5-, y el glosario de su sección 4
// -roteiro, gravar, take, legendas Amarelo/Vermelho/Formal, Configurações, celular-. Los nombres de
// los filtros y de Velocidade fixa son los de src/textos/pt.ts de esa rama -Quente, Frio, Vívido,
// Suave, P&B-. Dice lo mismo que es-419 y en-US, punto por punto, con el mismo orden de secciones.
// «Teleprompter» en vez de «apuntador»: en Brasil se dice así, y «ponto eletrônico» es el audífono.
// Las rayas van separadas por espacios, como se escriben en Brasil.
// La línea de los idiomas nace ya con los tres -español, inglés y portugués-: una ficha en portugués
// que dijera «em espanhol e inglês» sería falsa. es-419 y en-US se ponen al día en el commit siguiente.
// OJO: lo que dice del app en portugués es cierto en la rama portugues-app; esta ficha no se sube
// hasta que esa rama esté en main y la lea el papá de Javier -ANTES-DE-SUBIR.txt, punto 10-.
module.exports = {
  es: {
    archivo: 'textos-es-419.txt',
    idioma: 'Español (Latinoamérica) — es-419',
    nombre: 'Sigo — Teleprompter de voz',
    nombreNota: 'El que ya está en Play Console. Se queda igual -Javier, 29-09-2026-.',
    breve: 'Teleprompter que sigue tu voz: el texto avanza mientras lees en voz alta.',
    breveNota: 'La A, elegida por Javier, sin "sin internet": eso ahora va al final de la completa.',
    // -15-10-2026, ficha 0.9.1- Con Velocidad fija -tarea 106, src/lib/velocidadFija.ts- sí hay una
    // velocidad que elegir, así que se saca el "no hay velocidades" y A TU MANERA lo cuenta al final.
    // Antes, en LO QUE CAMBIA CUANDO EL TEXTO TE SIGUE: "- Si te detienes, el texto se detiene. No hay velocidades que ajustar."
    // Antes, A TU MANERA terminaba en "- Tema claro u oscuro. La app está en español y en inglés, y sigue tu voz en los dos idiomas."
    // -2026-10-24, portugues-ficha- Con el portugués son tres idiomas: la app -rama portugues-app- y la
    // voz -portugues-voz, IdiomaVoz 'pt'-. La línea de «La voz de tu idioma se descarga sola» sigue valiendo.
    // Antes, en A TU MANERA: "- Tema claro u oscuro. La app está en español y en inglés, y sigue tu voz en los dos idiomas."
    completa: `¿Se te olvida el guion justo cuando empiezas a grabar? Con Sigo lees en voz alta y el texto avanza contigo, a tu ritmo. Si haces una pausa, te espera.

Mira a la cámara con calma. No tienes que aprenderte el texto de memoria ni repetir la toma porque perdiste el hilo.

ES PARA TI SI
- Grabas videos para redes, clases o tu trabajo, y te cuesta hablarle a la cámara.
- Se te olvida lo que sigue o pierdes el hilo a mitad de una frase.
- Repites la misma toma una y otra vez.
- Ensayas una presentación, un discurso o una lectura, y necesitas un apuntador que no se adelante ni se quede atrás.

LO QUE CAMBIA CUANDO EL TEXTO TE SIGUE
- Hablas a tu ritmo. Sigo escucha tu voz y marca con una línea lo que estás leyendo.
- Si te detienes, el texto se detiene.
- Eliges si lees arriba, cerca de la cámara, o al medio de la pantalla.

GRABA TU VIDEO AHÍ MISMO
- Tu imagen va detrás del texto, en un recuadro que mueves donde quieras, u oculta mientras grabas.
- Cámara frontal o trasera, en 1080p, 720p o 480p. En vertical o de lado, en teléfono o tableta.
- Pausa cuando quieras: lo que pasa en la pausa no queda en el video.
- Control por gestos con la cámara frontal: lejos del teléfono, muestra la palma para pausar o seguir y, en pausa, la V para terminar.
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
- Tema claro u oscuro. La app está en español, inglés y portugués, y sigue tu voz en los tres idiomas.
- ¿Prefieres no usar la voz? Con Velocidad fija el texto sube solo, al ritmo que eliges.

CONFIANZA Y PRIVACIDAD
- Sin cuenta ni registro.
- Tu voz se reconoce en el teléfono. El audio no se manda a ningún servidor.
- Los gestos se reconocen en el teléfono y ninguna imagen sale de él. Sigo no envía estadísticas de uso.
- Tus guiones y tus videos se quedan en tu teléfono, hasta que tú los compartes.
- Tus guiones y ajustes entran en la copia de seguridad de Android: si reinstalas Sigo con la copia de seguridad de Google activada, vuelven. Los videos no entran en esa copia.
- También puedes usarlo sin conexión. La voz de tu idioma se descarga sola la primera vez que abres Sigo; después funciona sin internet.

Escribe tu guion, toca Leer o Grabar, y habla. Sigo te sigue.`
  },
  en: {
    archivo: 'textos-en-US.txt',
    idioma: 'English (United States) — en-US',
    nombre: 'Sigo — Voice Teleprompter',
    nombreNota: 'El que fija docs/tarea86.txt. Se queda igual -Javier, 29-09-2026-.',
    breve: 'A teleprompter that follows your voice: the script moves as you read aloud.',
    breveNota: 'La A, elegida por Javier, sin cambios: nunca dijo "offline".',
    // -15-10-2026, ficha 0.9.1- Lo mismo que en es-419, por Velocidad fija -Fixed speed-.
    // Antes, en WHAT CHANGES WHEN THE SCRIPT FOLLOWS YOU: "- Stop, and the text stops. No scroll speed to set."
    // Antes, YOUR WAY terminaba en "- Light or dark theme. The app is in English and Spanish, and follows your voice in both."
    // -2026-10-24, portugues-ficha- Lo mismo que en es-419: ahora son tres idiomas.
    // Antes, en YOUR WAY: "- Light or dark theme. The app is in English and Spanish, and follows your voice in both."
    completa: `Forget your lines the moment you hit record? With Sigo you read aloud and the script moves with you, at your pace. Pause, and it waits.

Look at the camera and relax. No memorizing, and no redoing a take because you lost your place.

IT IS FOR YOU IF
- You record videos for social media, classes or work, and talking to the camera feels hard.
- You forget what comes next or lose your place mid-sentence.
- You end up redoing the same take again and again.
- You rehearse a talk, a speech or a reading, and need a prompter that never runs ahead or falls behind.

WHAT CHANGES WHEN THE SCRIPT FOLLOWS YOU
- You speak at your own pace. Sigo listens and underlines the line you are reading.
- Stop, and the text stops.
- Read at the top, close to the camera, or in the middle of the screen.

RECORD YOUR VIDEO RIGHT THERE
- Your camera image goes behind the text, in a small frame you can drag anywhere, or stays hidden while you record.
- Front or back camera, in 1080p, 720p or 480p. Portrait or landscape, on a phone or a tablet.
- Pause whenever you want: nothing that happens during the pause ends up in the video.
- Gesture control with the front camera: away from the phone, show your palm to pause or resume and, while paused, a V sign to finish.
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
- Light or dark theme. The app is in English, Spanish and Portuguese, and follows your voice in all three.
- Prefer not to use your voice? With Fixed speed the script scrolls on its own, at the pace you choose.

TRUST AND PRIVACY
- No account, no sign-up.
- Your voice is recognized on your phone. The audio is not sent to any server.
- Gestures are recognized on your phone, and no image leaves it. Sigo does not send usage statistics.
- Your scripts and videos stay on your phone until you share them.
- Your scripts and settings are included in Android backup: if you reinstall Sigo with Google backup turned on, they come back. Videos are not part of that backup.
- You can also use it offline. The voice for your language downloads on its own the first time you open Sigo; after that it works without internet.

Write your script, tap Read or Record, and start talking. Sigo follows.`
  },
  pt: {
    archivo: 'textos-pt-BR.txt',
    idioma: 'Português (Brasil) — pt-BR',
    nombre: 'Sigo — Teleprompter de voz',
    nombreNota: 'El mismo de es-419: «de voz» se dice igual en portugués. Se queda igual -Javier, 29-09-2026-.',
    breve: 'Teleprompter que segue sua voz: o texto anda enquanto você lê em voz alta.',
    breveNota: 'La A de es-419, escrita en portugués: sin «sem internet», que va al final de la completa.',
    completa: `Esquece o roteiro bem na hora de começar a gravar? Com o Sigo você lê em voz alta e o texto anda junto com você, no seu ritmo. Se você faz uma pausa, ele espera.

Olhe para a câmera com calma. Você não precisa decorar o texto nem refazer o take porque se perdeu.

É PARA VOCÊ SE
- Você grava vídeos para redes sociais, aulas ou trabalho, e acha difícil falar para a câmera.
- Você esquece o que vem depois ou se perde no meio de uma frase.
- Você refaz o mesmo take várias e várias vezes.
- Você ensaia uma apresentação, um discurso ou uma leitura, e precisa de um teleprompter que não corra na frente nem fique para trás.

O QUE MUDA QUANDO O TEXTO SEGUE VOCÊ
- Você fala no seu ritmo. O Sigo escuta sua voz e marca com uma linha o que você está lendo.
- Se você para, o texto para.
- Você escolhe ler em cima, perto da câmera, ou no meio da tela.

GRAVE SEU VÍDEO ALI MESMO
- Sua imagem fica atrás do texto, em uma janela pequena que você move para onde quiser, ou oculta enquanto você grava.
- Câmera frontal ou traseira, em 1080p, 720p ou 480p. Na vertical ou na horizontal, no celular ou no tablet.
- Pause quando quiser: o que acontece durante a pausa não fica no vídeo.
- Controle por gestos com a câmera frontal: longe do celular, mostre a palma da mão para pausar ou continuar e, em pausa, faça o V para terminar.
- Legendas em três estilos: Amarelo, Vermelho e Formal. Elas saem do seu roteiro e do tempo da sua voz, e ficam dentro do vídeo quando você salva.
- Seis filtros — Natural, Quente, Frio, Vívido, Suave e P&B — que você escolhe vendo o seu vídeo. O que você vê é o que fica salvo.
- Salve seu vídeo na galeria ou compartilhe.

SEU ROTEIRO, CLARO À PRIMEIRA VISTA
- Negrito, três cores e destaque para ver de longe o que importa.
- Anotações entre [colchetes] ou (parênteses) que não são lidas em voz alta nem aparecem nas legendas.
- Cole seu texto ou abra um arquivo .txt, .md ou .docx.
- Todos os seus roteiros em um só lugar, com a duração estimada de cada um.

DO SEU JEITO
- Tamanho do texto, fonte, largura do texto e cinco combinações de cores de leitura.
- Modo espelho, para usar com um vidro de teleprompter.
- Tema claro ou escuro. O app está em português, espanhol e inglês, e segue sua voz nos três idiomas.
- Prefere não usar a voz? Com a Velocidade fixa o texto sobe sozinho, na velocidade que você escolher.

CONFIANÇA E PRIVACIDADE
- Sem conta e sem cadastro.
- Sua voz é reconhecida no celular. O áudio não é enviado a nenhum servidor.
- Os gestos são reconhecidos no celular e nenhuma imagem sai dele. O Sigo não envia estatísticas de uso.
- Seus roteiros e seus vídeos ficam no seu celular, até você compartilhar.
- Seus roteiros e configurações entram no backup do Android: se você reinstalar o Sigo com o backup do Google ativado, eles voltam. Os vídeos não entram nesse backup.
- Você também pode usar sem conexão. A voz do seu idioma é baixada sozinha na primeira vez que você abre o Sigo; depois funciona sem internet.

Escreva seu roteiro, toque em Ler ou Gravar, e fale. O Sigo segue você.`
  }
}
