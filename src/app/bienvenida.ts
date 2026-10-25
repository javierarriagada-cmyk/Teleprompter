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
  const texto = [
    'Hola. Lee esto en voz alta, con o sin apuro, como prefieras.',
    '',
    'Ahora fíjate en el texto. Se está moviendo solo, al ritmo en que hablas, sin que toques nada. La línea suave bajo las palabras te muestra por dónde vas.',
    '',
    'Si te detienes a pensar, el texto te espera. Cuando vuelves a hablar, sigue contigo.',
    '',
    'Lo que escribes entre corchetes es una nota solo para ti. Se ve en la pantalla, pero no hace falta leerla en voz alta. [Como esta: respira y sonríe.]',
    '',
    'Tu guion también puede ayudarte a leer mejor. Marca en negrita lo que quieres decir con más fuerza. Pinta palabras en ámbar, en celeste o en verde para distinguir ideas o cambios de tono. Y usa el destacado amarillo para lo que no se te puede pasar. Basta con seleccionar el texto en el editor y elegir.',
    '',
    'Con Aa cambias el tamaño de la letra. La tipografía, el ancho de la columna y los colores de la pantalla están en Ajustes. Déjalo como te resulte más cómodo.',
    '',
    'Cuando quieras grabarte, toca Grabar. La cámara filma mientras lees, y el texto queda justo bajo el lente, para que tu mirada vaya a la cámara y no a la pantalla. Puedes verte a pantalla completa, detrás del texto, o en un recuadro pequeño. Graba de pie o de lado, como lo necesites.',
    '',
    // Antes: 'Si necesitas parar un momento, toca pausa. Lo que pase durante la pausa no queda en el video: al seguir, la toma continúa como si nunca te hubieras detenido.',
    'Si necesitas parar un momento, toca la pantalla y luego pausa. Lo que pase durante la pausa no queda en el video: al seguir, la toma continúa como si nunca te hubieras detenido.',
    '',
    'Y si grabas lejos del teléfono, activa el Control por gestos en el panel de la cámara. Muestra la palma para pausar o seguir y, en pausa, haz la V para terminar.',
    '',
    // SUBTITULOS -26-09-2026, Javier-: el Hola tenia que contarlos antes de la grabacion de
    // prueba. Salen del guion con los tiempos de la voz -lib/subtitulos.ts- y se guardan como se
    // ven -una sola copia en la galeria-.
    // Antes: 'Al terminar, tu video puede llevar subtítulos. Salen de tu guion, al ritmo de tu voz. Elige el estilo que más te guste y guárdalo en tu galería tal como lo ves.',
    // -tarea 97, 05-10-2026- Aa ya no cambia tipografía, ancho ni colores: eso está en Ajustes.
    // Entran la pausa con cortes, el control por gestos, los filtros y Guardar y compartir.
    // Antes: 'Al terminar, tu video puede llevar subtítulos, que salen de tu guion al ritmo de tu voz, y un filtro para darle el tono que quieras. Lo que ves es lo que se guarda: guárdalo en tu galería o compártelo directo.',
    'Al terminar, tu video puede llevar subtítulos, que salen de tu guion al ritmo de tu voz, y un filtro para darle el tono que quieras. Lo que ves es lo que se guarda: guárdalo en tu galería o compártelo directo. Los subtítulos y el filtro se eligen antes de guardar.',
    '',
    'Te acompaña para darte la comodidad y la tranquilidad que necesitas. Queremos que toda tu concentración esté donde debe estar. No tienes que memorizar. No tienes que apurarte para alcanzar el texto. Puedes transmitir la emoción que quieras, en el momento que quieras.',
    '',
    'Sirve para grabar un video, dar una clase o preparar una entrevista.',
    '',
    // Antes: 'Cuando termines, borra esto y escribe tu propio guion, o pega uno que ya tengas.',
    'Cuando termines, toca + en tus guiones para escribir el tuyo o pegar uno que ya tengas.',
    '',
    // CORREO -26-09-2026-: el del dominio, que Namecheap reenvia al Gmail de Javier. Hasta el
    // 24-09 era el ficticio hola@ejemplo.com que el pidio mientras tanto.
    'Y si algo te gusta, te molesta o se te ocurre cómo mejorarlo, cuéntanos. Tus comentarios son muy valiosos para nosotros. Escríbenos a hola@sigoteleprompter.com. Que te vaya muy bien.'
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    // Si alguien retoca el texto y una de estas palabras deja de estar, su tramo se cae en vez
    // de pintar desde el caracter -1 -tramosSobre, arriba-.
    // Los cinco primeros caen sobre la palabra que nombra su formato. Los demas -26-09-2026,
    // Javier: "ponle colores"- muestran el guion pintado como se usaria de verdad, para la
    // grabacion de prueba. Van ordenados por posicion y sin pisarse.
    tramos: tramosSobre(texto, [
      ['negrita', { negrita: true }],
      ['ámbar', { color: 'ambar' }],
      ['celeste', { color: 'celeste' }],
      ['verde', { color: 'salvia' }],
      ['destacado amarillo', { destacado: true }],
      ['sin que toques nada', { negrita: true }],
      ['el texto te espera', { color: 'celeste' }],
      ['para que tu mirada vaya a la cámara', { color: 'ambar' }],
      // Antes: ['tal como lo ves', { color: 'salvia' }],
      ['no queda en el video', { negrita: true }],
      ['Control por gestos', { color: 'ambar' }],
      ['Lo que ves es lo que se guarda', { color: 'salvia' }],
      ['No tienes que memorizar.', { negrita: true }],
      ['en el momento que quieras', { destacado: true }],
      ['hola@sigoteleprompter.com', { color: 'celeste' }]
    ])
  }
}

// El Hola en ingles. Es de docs/ingles.txt, seccion 5, letra por letra -tambien los
// apostrofos rectos: son los que escribe el teclado del telefono-. Los formatos son los que
// esa seccion lista, con el mismo mecanismo. El correo es el ingles -D6-.
function bienvenidaIngles(): Bloque {
  const texto = [
    'Hi. Read this out loud, as slowly or as quickly as you like.',
    '',
    "Now look at the text. It's moving on its own, at the pace you speak, without you touching anything. The soft line under the words shows you where you are.",
    '',
    'If you stop to think, the text waits for you. When you start talking again, it picks up right where you left off.',
    '',
    "Anything you write in square brackets is a note just for you. It shows on the screen, but you don't need to read it out loud. [Like this one: breathe, and smile.]",
    '',
    "Your script can also help you read better. Use bold for what you want to say with more force. Color words in amber, light blue or green to set apart ideas or shifts in tone. And use the yellow highlight for what you can't afford to miss. Just select the text in the editor and pick one.",
    '',
    'Aa changes the text size. The typeface, the column width and the screen colors are in Settings. Set it up however feels most comfortable.',
    '',
    'When you want to record yourself, tap Record. The camera films while you read, and the text sits right under the lens, so your eyes go to the camera and not to the screen. You can see yourself full screen, behind the text, or in a small window. Record in portrait or landscape, whichever you need.',
    '',
    // Antes: "If you need to stop for a moment, tap pause. Whatever happens during the pause stays out of the video: when you resume, the take carries on as if you never stopped.",
    "If you need to stop for a moment, tap the screen and then pause. Whatever happens during the pause stays out of the video: when you resume, the take carries on as if you never stopped.",
    '',
    "And if you're recording away from the phone, turn on Gesture control in the camera panel. Show your palm to pause or resume and, while paused, make a V sign to finish.",
    '',
    // Antes: "When you're done, your video can have captions. They come from your script, in time with your voice. Pick the style you like best and save it to your gallery just as you see it.",
    // Antes: "When you're done, your video can have captions, which come from your script in time with your voice, and a filter to give it the look you want. What you see is what gets saved: save it to your gallery or share it right away.",
    "When you're done, your video can have captions, which come from your script in time with your voice, and a filter to give it the look you want. What you see is what gets saved: save it to your gallery or share it right away. Captions and the filter are chosen before you save.",
    '',
    "Sigo is here to give you the comfort and the calm you need. We want all your focus to be where it belongs. You don't have to memorize anything. You don't have to rush to keep up with the text. You can bring whatever emotion you want, whenever you want.",
    '',
    'It works for recording a video, teaching a class or getting ready for an interview.',
    '',
    // Antes: "When you're done, delete this and write your own script, or paste one you already have.",
    "When you're done, tap + in your scripts to write your own or paste one you already have.",
    '',
    "And if there's something you like, something that bugs you, or an idea to make it better, let us know. Your feedback means a lot to us. Write to hello@sigoteleprompter.com. All the best."
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    tramos: tramosSobre(texto, [
      ['bold', { negrita: true }],
      ['amber', { color: 'ambar' }],
      ['light blue', { color: 'celeste' }],
      ['green', { color: 'salvia' }],
      ['yellow highlight', { destacado: true }],
      ['without you touching anything', { negrita: true }],
      ['the text waits for you', { color: 'celeste' }],
      ['so your eyes go to the camera', { color: 'ambar' }],
      // Antes: ['just as you see it', { color: 'salvia' }],
      ['stays out of the video', { negrita: true }],
      ['Gesture control', { color: 'ambar' }],
      ['What you see is what gets saved', { color: 'salvia' }],
      ["You don't have to memorize anything.", { negrita: true }],
      ['whenever you want', { destacado: true }],
      ['hello@sigoteleprompter.com', { color: 'celeste' }]
    ])
  }
}

// -portugues-app, punto 4, 2026-10-22- El Hola en portugues de Brasil. Es de docs/portugues.txt, seccion 5,
// letra por letra: lo escribio Grok y lo revisa el papa de Javier; si se retoca, se retoca alla primero.
// Mismos formatos que el espanol y el ingles, sobre las palabras que los nombran, y los mismos extra de la
// grabacion de prueba. El correo es hola@ -P4 de docs/portugues.txt-.
function bienvenidaPortugues(): Bloque {
  const texto = [
    'Olá. Leia isto em voz alta, devagar ou depressa, como você preferir.',
    '',
    'Agora repare no texto. Ele está andando sozinho, no ritmo da sua fala, sem você tocar em nada. A linha suave embaixo das palavras mostra onde você está.',
    '',
    'Se você parar para pensar, o texto espera por você. Quando você volta a falar, ele continua junto.',
    '',
    'O que você escreve entre colchetes é uma anotação só para você. Ela aparece na tela, mas não precisa ser lida em voz alta. [Como esta: respire e sorria.]',
    '',
    'Seu roteiro também pode ajudar você a ler melhor. Use negrito no que você quer dizer com mais força. Pinte palavras de âmbar, azul-claro ou verde para separar ideias ou mudanças de tom. E use o destaque amarelo no que não pode passar batido. É só selecionar o texto no editor e escolher.',
    '',
    'Com Aa você muda o tamanho do texto. A fonte, a largura da coluna e as cores da tela ficam em Configurações. Deixe do jeito mais confortável para você.',
    '',
    'Quando quiser se gravar, toque em Gravar. A câmera filma enquanto você lê, e o texto fica logo abaixo da lente, para que seu olhar vá para a câmera e não para a tela. Você pode se ver em tela cheia, atrás do texto ou em uma janela pequena. Grave na vertical ou na horizontal, como precisar.',
    '',
    'Se precisar parar um pouco, toque na tela e depois em pausar. O que acontece durante a pausa não fica no vídeo: ao continuar, o take segue como se você nunca tivesse parado.',
    '',
    'E se você grava longe do celular, ative o Controle por gestos no painel da câmera. Mostre a palma da mão para pausar ou continuar e, em pausa, faça o V para terminar.',
    '',
    'Ao terminar, seu vídeo pode ter legendas, que saem do seu roteiro no ritmo da sua voz, e um filtro para dar o tom que você quiser. O que você vê é o que fica salvo: salve na galeria ou compartilhe direto. As legendas e o filtro são escolhidos antes de salvar.',
    '',
    'O Sigo está aqui para dar a você o conforto e a tranquilidade de que precisa. Queremos que toda a sua concentração esteja onde deve estar. Você não precisa decorar nada. Não precisa correr para acompanhar o texto. Pode transmitir a emoção que quiser, na hora que quiser.',
    '',
    'Serve para gravar um vídeo, dar uma aula ou se preparar para uma entrevista.',
    '',
    'Quando terminar, toque em + nos seus roteiros para escrever o seu ou colar um que você já tenha.',
    '',
    'E se tem algo de que você gosta, algo que incomoda ou uma ideia para melhorar, conte para a gente. Seus comentários são muito valiosos para nós. Escreva para hola@sigoteleprompter.com. Tudo de bom!'
  ].join('\n')
  return {
    id: 'b-bienvenida-1',
    nombre: '',
    texto,
    tramos: tramosSobre(texto, [
      ['negrito', { negrita: true }],
      ['âmbar', { color: 'ambar' }],
      ['azul-claro', { color: 'celeste' }],
      ['verde', { color: 'salvia' }],
      ['destaque amarelo', { destacado: true }],
      ['sem você tocar em nada', { negrita: true }],
      ['o texto espera por você', { color: 'celeste' }],
      ['para que seu olhar vá para a câmera', { color: 'ambar' }],
      ['não fica no vídeo', { negrita: true }],
      ['Controle por gestos', { color: 'ambar' }],
      ['O que você vê é o que fica salvo', { color: 'salvia' }],
      ['Você não precisa decorar nada.', { negrita: true }],
      ['na hora que quiser', { destacado: true }],
      ['hola@sigoteleprompter.com', { color: 'celeste' }]
    ])
  }
}
