// Salio de App.tsx el 29-09-2026, tarea 81: el guion "Hola" que viene puesto la primera vez,
// en espanol y en ingles. Funciones puras, no dependen del estado de App. App.tsx las vuelve
// a exportar porque las pruebas -bienvenida.test.ts, detectarIdioma.test.ts- las importan de ahi.
import { Bloque, TramoFormato } from '../datos/modelo'
import { IdiomaApp } from '../lib/idioma'

// EL GUION "HOLA": el que ya viene puesto la primera vez. Los tramos se calculan buscando
// las palabras en el texto, asi el texto se puede retocar sin contar caracteres a mano.
//
// EN LOS DOS IDIOMAS -tarea 75, 27-09-2026-: se crea en el idioma de la app. El ingles es el de
// docs/ingles.txt, seccion 5, LETRA POR LETRA -lo escribio Claude y lo revisa la traductora de
// Javier-; si se retoca, se retoca alla primero. Mismos formatos que el espanol, sobre las
// palabras que los nombran.
export function tituloDeBienvenida(idioma: IdiomaApp): string {
  // -portugues-app, punto 4, 2026-10-22- Antes: return idioma === 'es' ? 'Hola' : 'Hi'
  return idioma === 'es' ? 'Hola' : idioma === 'pt' ? 'Olá' : 'Hi'
}

export function bloqueDeBienvenida(idioma: IdiomaApp): Bloque {
  // -portugues-app, punto 4, 2026-10-22- Antes: return idioma === 'es' ? bienvenidaEspanol() : bienvenidaIngles()
  return idioma === 'es' ? bienvenidaEspanol() : idioma === 'pt' ? bienvenidaPortugues() : bienvenidaIngles()
}

function tramosSobre(texto: string, marcas: Array<[string, Omit<TramoFormato, 'desde' | 'hasta'>]>): TramoFormato[] {
  const tramo = (frase: string, formato: Omit<TramoFormato, 'desde' | 'hasta'>): TramoFormato => {
    const desde = texto.indexOf(frase)
    return { desde, hasta: desde + frase.length, ...formato }
  }
  // Si alguien retoca el texto y una de estas palabras deja de estar, su tramo se cae en vez
  // de pintar desde el caracter -1.
  return marcas.map(([frase, formato]) => tramo(frase, formato)).filter((t) => t.desde >= 0).sort((a, b) => a.desde - b.desde)
}

function bienvenidaEspanol(): Bloque {
  // -bienvenida-nueva, 2026-10-29- Texto aprobado por Javier. Antes (hasta 2026-10-29):
  // 'Hola. Lee esto en voz alta, con o sin apuro, como prefieras.' … '(correo) Que te vaya muy bien.'
  // con tramos sobre ámbar/celeste/verde nombrados y frases de grabación de prueba viejas.
  const texto = [
    'Hola. Lee esto en voz alta, con calma, como si se lo contaras a alguien.',
    '',
    'Fíjate en el texto: avanza al ritmo en que hablas. No tienes que memorizar ni apurarte para alcanzarlo.',
    '',
    'Si te detienes a pensar, el texto te espera. [Respira y sonríe.] Cuando vuelvas a hablar, seguirá contigo.',
    '',
    'Eso es Sigo: ayudarte a concentrarte en lo que quieres decir, para grabar un video, dar una clase, ensayar una presentación o preparar una entrevista.',
    '',
    'Tu guion también puede ayudarte a expresarte. Usa negrita para dar fuerza a una idea, colores para distinguir cambios de tono y el destacado amarillo para recordar algo importante. Las notas entre corchetes, como la que acabas de ver, son solo para ti: no hace falta leerlas y no aparecen en los subtítulos.',
    '',
    'Con Aa cambias el tamaño de la letra. En Ajustes puedes elegir la tipografía, el ancho del texto y los colores de lectura.',
    '',
    'Para grabarte, toca Grabar. Puedes usar la cámara frontal o trasera, en vertical o en horizontal, y colocar el texto cerca del lente para mantener la mirada hacia la cámara.',
    '',
    'Si necesitas hacer una pausa, toca la pantalla y luego pausa. Ese tiempo queda fuera del video. Con la cámara frontal también puedes activar el Control por gestos: muestra la palma para pausar o continuar y, estando en pausa, haz la V para terminar.',
    '',
    'Después puedes elegir subtítulos y un filtro antes de guardar. Los subtítulos salen de tu guion, al ritmo de tu voz. Revisa cómo queda y guarda el video en tu galería o compártelo.',
    '',
    'Si prefieres que el texto avance a un ritmo constante, elige Velocidad fija y ajusta la velocidad a tu comodidad.',
    '',
    'Puedes usar Sigo sin iniciar sesión. Si quieres respaldar tus guiones y recuperarlos en otro teléfono, entra con Google desde Ajustes.',
    '',
    'Puedes empezar gratis. Con Sigo+ lees con seguimiento de voz y grabas sin límite de tiempo, y guardas tus videos sin marca de agua.',
    '',
    'Cuando quieras, toca + en tus guiones para escribir el tuyo, pegar un texto o abrir un archivo.',
    '',
    'Y si tienes una idea o algo no funciona como esperabas, cuéntanos en hola@sigoteleprompter.com.',
    '',
    'Tú hablas. Sigo te sigue.'
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    // Si alguien retoca el texto y una de estas palabras deja de estar, su tramo se cae en vez
    // de pintar desde el caracter -1 -tramosSobre, arriba-.
    // -bienvenida-nueva, 2026-10-29- El texto ya no nombra ámbar/celeste/verde uno a uno:
    // negrita sobre la palabra que la nombra; colores y destacado sobre frases relevantes;
    // el correo en celeste. Antes: tramos sobre 'ámbar','celeste','verde','sin que toques nada',
    // 'para que tu mirada vaya a la cámara','no queda en el video','Lo que ves es lo que se guarda',
    // 'No tienes que memorizar.','en el momento que quieras', etc.
    tramos: tramosSobre(texto, [
      ['al ritmo en que hablas', { color: 'ambar' }],
      ['el texto te espera', { color: 'celeste' }],
      ['negrita', { negrita: true }],
      ['colores', { color: 'salvia' }],
      ['destacado amarillo', { destacado: true }],
      ['Control por gestos', { color: 'ambar' }],
      ['Ese tiempo queda fuera del video', { negrita: true }],
      ['al ritmo de tu voz', { color: 'celeste' }],
      ['sin límite de tiempo', { color: 'salvia' }],
      ['sin marca de agua', { destacado: true }],
      ['hola@sigoteleprompter.com', { color: 'celeste' }],
      ['Sigo te sigue', { negrita: true }]
    ])
  }
}

// El Hola en ingles. Es de docs/ingles.txt, seccion 5, letra por letra -tambien los
// apostrofos rectos: son los que escribe el teclado del telefono-. Los formatos son los que
// esa seccion lista, con el mismo mecanismo. El correo es el ingles -D6-.
function bienvenidaIngles(): Bloque {
  // -bienvenida-nueva, 2026-10-29- Propuesta EN para revisión lingüística. Antes (hasta 2026-10-29):
  // 'Hi. Read this out loud, as slowly or as quickly as you like.' … 'All the best.'
  const texto = [
    'Hi. Read this out loud, at your own pace, as if you were telling someone a story.',
    '',
    "Watch the text: it moves at the pace you speak. You don't have to memorize anything or rush to keep up.",
    '',
    'If you stop to think, the text waits for you. [Breathe and smile.] When you start speaking again, it follows along.',
    '',
    "That's what Sigo is for: helping you focus on what you want to say, whether you're recording a video, teaching a class, rehearsing a presentation or preparing for an interview.",
    '',
    "Your script can help you express yourself, too. Use bold to give an idea more weight, colors to mark a change in tone and the yellow highlight to remember something important. Notes in square brackets, like the one you just saw, are just for you: you don't need to read them out loud, and they won't appear in the captions.",
    '',
    'Aa changes the text size. In Settings, you can choose the typeface, text width and reading colors.',
    '',
    'To record yourself, tap Record. You can use the front or rear camera, in portrait or landscape, and position the text near the lens to keep your eyes toward the camera.',
    '',
    'If you need a break, tap the screen and then pause. That time stays out of the video. With the front camera, you can also turn on Gesture control: show your palm to pause or resume and, while paused, make a V sign to finish.',
    '',
    'After recording, you can choose captions and a filter before saving. The captions come from your script, in time with your voice. Check how it looks, then save the video to your gallery or share it.',
    '',
    'If you prefer the text to move at a steady pace, choose Fixed speed and adjust it to suit you.',
    '',
    "You can use Sigo without signing in. If you'd like to back up your scripts and recover them on another phone, sign in with Google in Settings.",
    '',
    'You can start for free. With Sigo+, you can read with voice tracking and record without a time limit, and save your videos without a watermark.',
    '',
    "Whenever you're ready, tap + in your scripts to write your own, paste some text or open a file.",
    '',
    "And if you have an idea or something doesn't work as you expected, let us know at hello@sigoteleprompter.com.",
    '',
    'You speak. Sigo follows.'
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    // -bienvenida-nueva, 2026-10-29- Misma lógica que el español: bold sobre la palabra; colores
    // y destacado sobre frases. Antes: amber/light blue/green nombrados y extras de grabación vieja.
    tramos: tramosSobre(texto, [
      ['at the pace you speak', { color: 'ambar' }],
      ['the text waits for you', { color: 'celeste' }],
      ['bold', { negrita: true }],
      ['colors', { color: 'salvia' }],
      ['yellow highlight', { destacado: true }],
      ['Gesture control', { color: 'ambar' }],
      ['That time stays out of the video', { negrita: true }],
      ['in time with your voice', { color: 'celeste' }],
      ['without a time limit', { color: 'salvia' }],
      ['without a watermark', { destacado: true }],
      ['hello@sigoteleprompter.com', { color: 'celeste' }],
      ['Sigo follows', { negrita: true }]
    ])
  }
}

// -portugues-app, punto 4, 2026-10-22- El Hola en portugues de Brasil. Es de docs/portugues.txt, seccion 5,
// letra por letra: lo escribio Grok y lo revisa el papa de Javier; si se retoca, se retoca alla primero.
// Mismos formatos que el espanol y el ingles, sobre las palabras que los nombran, y los mismos extra de la
// grabacion de prueba. El correo es hola@ -P4 de docs/portugues.txt-.
function bienvenidaPortugues(): Bloque {
  // -bienvenida-nueva, 2026-10-29- Propuesta pt-BR para revisión lingüística. Antes (hasta 2026-10-29):
  // 'Olá. Leia isto em voz alta, devagar ou depressa…' … 'Tudo de bom!'
  const texto = [
    'Olá. Leia isto em voz alta, com calma, como se estivesse contando algo para alguém.',
    '',
    'Repare no texto: ele avança no ritmo da sua fala. Você não precisa decorar nada nem correr para acompanhá-lo.',
    '',
    'Se parar para pensar, o texto espera por você. [Respire e sorria.] Quando voltar a falar, ele continua junto.',
    '',
    'É para isso que o Sigo existe: ajudar você a se concentrar no que quer dizer, seja para gravar um vídeo, dar uma aula, ensaiar uma apresentação ou se preparar para uma entrevista.',
    '',
    'Seu roteiro também pode ajudar você a se expressar. Use negrito para dar força a uma ideia, cores para marcar mudanças de tom e o destaque amarelo para lembrar algo importante. As anotações entre colchetes, como a que você acabou de ver, são só para você: não precisa lê-las em voz alta, e elas não aparecem nas legendas.',
    '',
    'Com Aa você muda o tamanho do texto. Em Configurações, pode escolher a fonte, a largura do texto e as cores de leitura.',
    '',
    'Para se gravar, toque em Gravar. Você pode usar a câmera frontal ou traseira, na vertical ou na horizontal, e posicionar o texto perto da lente para manter o olhar voltado para a câmera.',
    '',
    'Se precisar fazer uma pausa, toque na tela e depois em pausar. Esse tempo fica fora do vídeo. Com a câmera frontal, você também pode ativar o Controle por gestos: mostre a palma da mão para pausar ou continuar e, estando em pausa, faça o V para terminar.',
    '',
    'Depois, você pode escolher legendas e um filtro antes de salvar. As legendas saem do seu roteiro, no ritmo da sua voz. Confira como ficou e salve o vídeo na galeria ou compartilhe.',
    '',
    'Se preferir que o texto avance em um ritmo constante, escolha Velocidade fixa e ajuste a velocidade como ficar mais confortável.',
    '',
    'Você pode usar o Sigo sem fazer login. Se quiser fazer uma cópia de segurança dos seus roteiros e recuperá-los em outro celular, entre com o Google em Configurações.',
    '',
    "Você pode começar de graça. Com o Sigo+, você lê com acompanhamento de voz e grava sem limite de tempo, e salva seus vídeos sem marca d'água.",
    '',
    'Quando quiser, toque em + nos seus roteiros para escrever o seu, colar um texto ou abrir um arquivo.',
    '',
    'E se tiver uma ideia ou algo não funcionar como você esperava, conte para a gente em hola@sigoteleprompter.com.',
    '',
    'Você fala. O Sigo acompanha.'
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    // -bienvenida-nueva, 2026-10-29- Misma lógica. Antes: âmbar/azul-claro/verde nombrados y
    // extras 'sem você tocar em nada', 'não fica no vídeo', 'O que você vê…', etc.
    tramos: tramosSobre(texto, [
      ['no ritmo da sua fala', { color: 'ambar' }],
      ['o texto espera por você', { color: 'celeste' }],
      ['negrito', { negrita: true }],
      ['cores', { color: 'salvia' }],
      ['destaque amarelo', { destacado: true }],
      ['Controle por gestos', { color: 'ambar' }],
      ['Esse tempo fica fora do vídeo', { negrita: true }],
      ['no ritmo da sua voz', { color: 'celeste' }],
      ['sem limite de tempo', { color: 'salvia' }],
      ["sem marca d'água", { destacado: true }],
      ['hola@sigoteleprompter.com', { color: 'celeste' }],
      ['O Sigo acompanha', { negrita: true }]
    ])
  }
}
