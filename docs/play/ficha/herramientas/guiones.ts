// LOS GUIONES DE EJEMPLO DE LAS CAPTURAS -tarea 86, 29-09-2026-.
//
// Textos reales y neutros, como los que escribiría alguien que graba para su canal o sus clases:
// nada de "lorem ipsum" ni de guiones de prueba, y ningún dato personal. Van en los dos idiomas
// porque la ficha va en los dos. El guion principal usa los formatos del editor -negrita, los tres
// colores, el destacado y una nota entre corchetes- porque la captura 5 los muestra.
//
// Las marcas de abajo son solo de este archivo, para escribir los formatos a mano sin contar
// letras: se convierten en los tramos del modelo -src/datos/modelo.ts, TramoFormato-.
//   **negrita**   {a:ámbar}   {c:celeste}   {v:verde}   ==destacado==
import type { Bloque, Guion, TramoFormato } from '../../../../src/datos/modelo'

function bloque(id: string, marcado: string): Bloque {
  const tramos: TramoFormato[] = []
  let texto = ''
  const re = /\*\*(.+?)\*\*|\{([acv]):(.+?)\}|==(.+?)==/g
  let ultimo = 0
  for (const m of marcado.matchAll(re)) {
    texto += marcado.slice(ultimo, m.index)
    const contenido = m[1] ?? m[3] ?? m[4]
    const desde = texto.length
    texto += contenido
    const hasta = texto.length
    if (m[1]) tramos.push({ desde, hasta, negrita: true })
    else if (m[2]) tramos.push({ desde, hasta, color: m[2] === 'a' ? 'ambar' : m[2] === 'c' ? 'celeste' : 'salvia' })
    else tramos.push({ desde, hasta, destacado: true })
    ultimo = (m.index ?? 0) + m[0].length
  }
  texto += marcado.slice(ultimo)
  return { id, nombre: '', texto, tramos }
}

const HORA = 3600 * 1000
const DIA = 24 * HORA

type Ejemplo = { titulo: string; texto: string; haceMs: number }

const ES: Ejemplo[] = [
  {
    titulo: 'Pan casero en una hora',
    haceMs: 2 * HORA,
    texto: [
      'Hola, qué bueno verte por aquí. Hoy vamos a hacer **pan casero en menos de una hora**, con cuatro ingredientes que seguro ya tienes en la cocina.',
      '[Mostrar los ingredientes sobre la mesa]',
      'Necesitas {a:harina}, {c:agua tibia}, {v:levadura} y una pizca de sal. ==El secreto está en el agua:== tiene que estar tibia, nunca caliente.',
      'Mezcla todo en un bol y amasa diez minutos, hasta que la masa quede suave y se despegue de las manos. Si se pega, agrega un poco más de harina.',
      'Deja reposar la masa tapada mientras se calienta el horno. En media hora vas a ver cómo crece.',
      'Hornea veinte minutos a fuego medio. Cuando la corteza suene hueca al golpearla, está lista.'
    ].join('\n\n')
  },
  { titulo: 'Presentación del proyecto final', haceMs: 1 * DIA, texto: [
    'Buenos días a todos. En los próximos diez minutos les voy a presentar el proyecto que desarrollamos este semestre: qué problema resuelve, cómo lo hicimos y qué aprendimos en el camino.',
    'Todo partió de una pregunta simple: ¿por qué cuesta tanto encontrar un horario que le sirva a todo el equipo? Hicimos una encuesta a sesenta estudiantes y la respuesta fue clara.',
    'Con esos datos diseñamos una herramienta sencilla, la probamos con tres grupos y la ajustamos semana a semana. Hoy les muestro el resultado y lo que haríamos distinto.'
  ].join('\n\n') },
  { titulo: 'Bienvenida al curso de fotografía', haceMs: 3 * DIA, texto: [
    'Te doy la bienvenida al curso. En esta primera clase vamos a entender la luz: de dónde viene, cómo cambia durante el día y por qué es lo más importante de una buena foto.',
    'No necesitas una cámara cara. Con el teléfono que tienes en el bolsillo alcanza para todo lo que vamos a practicar.',
    'Al final de cada clase te dejo un ejercicio corto. Hazlo con calma, mira tus fotos al día siguiente y anota qué cambiarías.'
  ].join('\n\n') },
  { titulo: 'Tres ideas para hablar en público', haceMs: 6 * DIA, texto: [
    'Hablar frente a otros se aprende. Hoy te comparto tres ideas simples que puedes usar desde tu próxima presentación.',
    'La primera: prepara muy bien el inicio. Los primeros treinta segundos marcan el tono de todo lo demás.',
    'La segunda: habla más lento de lo que crees. Lo que para ti es lento, para quien escucha es claro. Y la tercera: mira a una persona a la vez, como si conversaras con ella.'
  ].join('\n\n') },
  { titulo: 'Entrevista: preguntas para la invitada', haceMs: 9 * DIA, texto: [
    'Gracias por acompañarnos. Para empezar, cuéntanos cómo llegaste a dedicarte a la cerámica y qué te enamoró del oficio.',
    '¿Cómo es un día normal en tu taller? ¿Qué parte del proceso disfrutas más y cuál te cuesta todavía?',
    'Para terminar, ¿qué le dirías a alguien que quiere empezar y no sabe por dónde?'
  ].join('\n\n') }
]

// PORTUGUÉS DE BRASIL -portugues-ficha, 2026-10-25-. Los mismos cinco guiones, escritos en portugués de
// Brasil con «você» -docs/portugues.txt-, no traducidos palabra por palabra. El del pan lleva los mismos
// formatos en el mismo lugar: «água morna» en celeste, como «agua tibia» y «warm water».
const PT: Ejemplo[] = [
  {
    titulo: 'Pão caseiro em uma hora',
    haceMs: 2 * HORA,
    texto: [
      'Olá, que bom ver você por aqui. Hoje vamos fazer **pão caseiro em menos de uma hora**, com quatro ingredientes que você provavelmente já tem na cozinha.',
      '[Mostrar os ingredientes na mesa]',
      'Você vai precisar de {a:farinha}, {c:água morna}, {v:fermento} e uma pitada de sal. ==O segredo está na água:== ela tem que estar morna, nunca quente.',
      'Misture tudo numa tigela e sove por dez minutos, até a massa ficar lisa e parar de grudar nas mãos. Se grudar, coloque mais um pouco de farinha.',
      'Deixe a massa descansar coberta enquanto o forno esquenta. Em meia hora você vai ver como ela cresce.',
      'Asse por vinte minutos em forno médio. Quando a casca fizer um som oco ao bater nela, está pronto.'
    ].join('\n\n')
  },
  { titulo: 'Apresentação do projeto final', haceMs: 1 * DIA, texto: [
    'Bom dia a todos. Nos próximos dez minutos, vou apresentar o projeto que desenvolvemos neste semestre: que problema ele resolve, como fizemos e o que aprendemos no caminho.',
    'Tudo começou com uma pergunta simples: por que é tão difícil achar um horário que sirva para a equipe inteira? Fizemos uma pesquisa com sessenta estudantes e a resposta foi clara.',
    'Com esses dados, criamos uma ferramenta simples, testamos com três grupos e fomos ajustando semana a semana. Hoje mostro o resultado e o que faríamos diferente.'
  ].join('\n\n') },
  { titulo: 'Boas-vindas ao curso de fotografia', haceMs: 3 * DIA, texto: [
    'Seja bem-vindo ao curso. Nesta primeira aula, vamos entender a luz: de onde ela vem, como muda ao longo do dia e por que ela é o mais importante numa boa foto.',
    'Você não precisa de uma câmera cara. O celular que está no seu bolso dá conta de tudo o que vamos praticar.',
    'No fim de cada aula, deixo um exercício curto. Faça com calma, olhe suas fotos no dia seguinte e anote o que você mudaria.'
  ].join('\n\n') },
  { titulo: 'Três ideias para falar em público', haceMs: 6 * DIA, texto: [
    'Falar na frente dos outros é algo que se aprende. Hoje vou compartilhar três ideias simples que você pode usar já na sua próxima apresentação.',
    'A primeira: prepare muito bem o começo. Os primeiros trinta segundos dão o tom de todo o resto.',
    'A segunda: fale mais devagar do que você acha que precisa. O que parece lento para você soa claro para quem escuta. E a terceira: olhe para uma pessoa de cada vez, como se estivesse conversando só com ela.'
  ].join('\n\n') },
  { titulo: 'Entrevista: perguntas para a convidada', haceMs: 9 * DIA, texto: [
    'Obrigado por estar com a gente. Para começar, conte como você chegou à cerâmica e o que fez você se apaixonar pelo ofício.',
    'Como é um dia normal no seu ateliê? Que parte do processo você mais curte e qual ainda é difícil?',
    'Para terminar, o que você diria para alguém que quer começar e não sabe por onde?'
  ].join('\n\n') }
]

const EN: Ejemplo[] = [
  {
    titulo: 'Homemade bread in one hour',
    haceMs: 2 * HORA,
    texto: [
      'Hi, great to have you here. Today we are making **homemade bread in under an hour**, with four ingredients you probably already have in your kitchen.',
      '[Show the ingredients on the table]',
      'You need {a:flour}, {c:warm water}, {v:yeast} and a pinch of salt. ==The secret is the water:== it has to be warm, never hot.',
      'Mix everything in a bowl and knead for ten minutes, until the dough is smooth and no longer sticks to your hands. If it sticks, add a little more flour.',
      'Let the dough rest, covered, while the oven heats up. In half an hour you will see it rise.',
      'Bake for twenty minutes at medium heat. When the crust sounds hollow as you tap it, it is ready.'
    ].join('\n\n')
  },
  { titulo: 'Final project presentation', haceMs: 1 * DIA, texto: [
    'Good morning, everyone. In the next ten minutes I will walk you through the project we built this semester: the problem it solves, how we built it and what we learned along the way.',
    'It all started with a simple question: why is it so hard to find a time that works for the whole team? We surveyed sixty students and the answer was clear.',
    'With that data we designed a simple tool, tested it with three groups and improved it week after week. Today I will show you the result and what we would do differently.'
  ].join('\n\n') },
  { titulo: 'Welcome to the photography course', haceMs: 3 * DIA, texto: [
    'Welcome to the course. In this first lesson we will talk about light: where it comes from, how it changes during the day and why it matters more than anything else in a good photo.',
    'You do not need an expensive camera. The phone in your pocket is enough for everything we are going to practice.',
    'At the end of each lesson I will leave you a short exercise. Take your time, look at your photos the next day and write down what you would change.'
  ].join('\n\n') },
  { titulo: 'Three ideas for public speaking', haceMs: 6 * DIA, texto: [
    'Speaking in front of people is a skill you can learn. Today I will share three simple ideas you can use in your next presentation.',
    'First: prepare your opening really well. The first thirty seconds set the tone for everything else.',
    'Second: speak slower than you think. What feels slow to you sounds clear to your audience. And third: look at one person at a time, as if you were talking just to them.'
  ].join('\n\n') },
  { titulo: 'Interview: questions for our guest', haceMs: 9 * DIA, texto: [
    'Thank you for joining us. To start, tell us how you came to work with ceramics and what made you fall in love with the craft.',
    'What does a normal day in your studio look like? Which part of the process do you enjoy the most, and which one is still hard?',
    'To finish, what would you say to someone who wants to start and does not know where to begin?'
  ].join('\n\n') }
]

// -portugues-ficha, 2026-10-25- Con pt, sus guiones de PT. Antes:
//   export function guionesDeEjemplo(idioma: 'es' | 'en', ahora: number): Guion[] {
//     return (idioma === 'es' ? ES : EN).map((e, i) => ({
export function guionesDeEjemplo(idioma: 'es' | 'en' | 'pt', ahora: number): Guion[] {
  return { es: ES, en: EN, pt: PT }[idioma].map((e, i) => ({
    id: `ejemplo-${idioma}-${i + 1}`,
    titulo: e.titulo,
    idioma,
    idiomaElegido: true,
    creado: ahora - e.haceMs - HORA,
    modificado: ahora - e.haceMs,
    archivado: false,
    bloques: [bloque(`bloque-${idioma}-${i + 1}`, e.texto)]
  }))
}
